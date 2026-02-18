# 🚀 Guide de Démarrage - Login API MOUDI

## Quick Start

### 1. Configuration .env.local

Assurez-vous que `.env.local` contient:

```env
VITE_API_URL=http://localhost:5084
VITE_AUTH_TOKEN=  # Laissez vide, sera défini après login

VITE_RESTAURANT_ID=  # Optional, sera défini après login
VITE_RESTAURANT_NAME=  # Optional, sera défini après login
```

### 2. Démarrer l'application

```bash
cd @apppos
npm install  # Si nécessaire
npm run dev
```

L'app devrait ouvrir sur: `http://localhost:3062`

### 3. Accéder à la page de login

```
http://localhost:3062/login
```

Vous devrez voir:

![Login Page]

- **Logo RestoPOS** en haut
- **Champ Email** (exemple@restaurant.com)
- **Champ Mot de passe** (avec toggle show/hide)
- **Bouton Se connecter**
- **Message informatif** sur la synchronisation
- **Affichage de l'API URL** pour debug

### 4. Se connecter

Utilisez vos identifiants MOUDI propriétaire:

```
Email: proprietaire@restaurant.com
Mot de passe: password123
```

### 5. Ce qui se passe automatiquement

Après connexion réussie:

```
✅ Token JWT configuré dans syncService
✅ Restaurant ID chargé depuis le profil
✅ Restaurant Name chargé depuis le profil
✅ Redirection vers le POS Terminal (/pos)
```

### 6. Vérifier dans la console (F12)

Vous devez voir:

```
[AuthService] Token d'authentification obtenu et configuré
[AuthService] Restaurant configuré: Le Bon Manger (rest_789)
[AuthContext] Connexion réussie: proprietaire@restaurant.com
[SyncService] Token d'authentification chargé depuis les variables d'environnement
[SyncService] Restaurant configuré: Le Bon Manger
```

### 7. Tester la synchronisation

Une fois logué:

1. Allez à **Paramètres** (Settings)
2. Cliquez l'onglet **Synchronisation**
3. Cliquez le bouton **Synchroniser depuis l'API**

Les catégories et menus doivent se synchroniser sans erreur 401!

## Contenu des Fichiers Modifiés

### 📄 src/services/auth.service.ts (NEW)

**Responsabilités:**

- Appeler `/api/auth/login` avec credentials
- Extraire le token JWT
- Extraire les infos du restaurant
- Configurer syncService automatiquement

**Code clé:**

```typescript
async login(credentials: LoginCredentials): Promise<User | null> {
  const response = await this.api.post<AuthResponse>('/api/auth/login', {
    email: credentials.email,
    password: credentials.password,
  });

  if (response.data.success) {
    const { token, proprietaire } = response.data.data;

    // Configure token
    localStorage.setItem('authToken', token);
    syncService.setAuthToken(token);

    // Configure restaurant
    syncService.setRestaurantId(proprietaire.restaurantId);
    syncService.setRestaurantName(proprietaire.restaurantName);

    return userData;
  }
  return null;
}
```

### 📄 src/context/AuthContext.tsx (UPDATED)

**Avant:**

- Username + static password check (admin/admin)

**Après:**

- Email + API call via authService
- Gestion des erreurs détaillée
- Retourne { success, error? }
- État isLoading
- Import authService

### 📄 src/pages/Login.tsx (UPDATED)

**Améliorations:**

- Email input au lieu de username
- Show/hide password toggle
- Validation des champs
- Messages d'erreur détaillés
- Affichage de VITE_API_URL
- Loading state avec animation
- Meilleure UX/UI

## Architecture Complète du Login

```
Browser
│
├─ Login.tsx
│  ├─ Email input
│  ├─ Password input
│  ├─ Submit → handleSubmit()
│  │
│  └─ useAuth() → AuthContext
│     │
│     ├─ login(email, password)
│     │  │
│     │  └─ authService.login() → async
│     │     │
│     │     ├─ POST /api/auth/login (MOUDI Backend)
│     │     │  ├─ Validate credentials
│     │     │  └─ Return { token, user, proprietaire }
│     │     │
│     │     ├─ Store token in localStorage
│     │     ├─ syncService.setAuthToken(token)
│     │     ├─ syncService.setRestaurantId(restaurant_id)
│     │     └─ return user object
│     │
│     └─ setUser() → localStorage
│
└─ Protected Routes
   └─ MainLayout
      ├─ POSTerminal
      ├─ Finance
      ├─ Settings
      │  └─ SyncSettings (ready with token!)
      └─ etc.
```

## Gestion des Erreurs

### Erreur 1: Réseau non disponible

```
Message: "Impossible de se connecter au serveur. Vérifiez VITE_API_URL."

Solution:
1. Vérifier .env.local VITE_API_URL
2. Vérifier que le backend MOUDI est en cours d'exécution
3. Vérifier la connexion Internet
```

### Erreur 2: Email/Password incorrect

```
Message: "Email ou mot de passe incorrect"

Solution:
1. Vérifier les credentials (email exact)
2. S'assurer que c'est un compte propriétaire
3. Réinitialiser le mot de passe si oublié
```

### Erreur 3: Token expiré pendant la session

```
Message: "Token expiré, veuillez vous reconnecter"

Solution:
1. Retourner à la page de login
2. Se reconnecter pour obtenir un nouveau token
3. Implémenter refresh token (future)
```

## Workflow Complet

### De l'état non-authentifié vers authentifié

```
1. Utilisateur accède http://localhost:3062
   → Redirect to /login (via ProtectedRoute)

2. Utilisateur sur Login page
   - Voit le formulaire
   - Rempli email + password

3. Utilisateur clique "Se connecter"
   - handleSubmit() appelé
   - Validation: email et password non vides?
   - Appel AuthContext.login(email, password)

4. AuthContext appelle authService.login()
   - isLoading = true
   - POST /api/auth/login
   - Attendre la réponse

5. Réponse reçue
   - Si {success: true}:
     ✅ setUser() → localStorage
     ✅ navigate('/pos')
   - Si {success: false}:
     ❌ setError(message)
     ❌ Rester sur login

6. Une fois logué, l'app a:
   ✅ Token JWT (pour tous les appels API)
   ✅ Restaurant ID (pour synchronisation)
   ✅ Restaurant Name (pour l'UI)
```

## Variables Stockées Après Login

### localStorage

```javascript
// Utilisateur
localStorage.getItem("apppos_user");
// {
//   "id": "user_123",
//   "email": "proprietaire@restaurant.com",
//   "firstName": "Jean",
//   "lastName": "Dupont",
//   "role": "proprietaire",
//   "restaurantId": "rest_789",
//   "restaurantName": "Le Bon Manger"
// }

// Token
localStorage.getItem("authToken");
// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Restaurant
localStorage.getItem("restaurantId");
// "rest_789"

localStorage.getItem("restaurantName");
// "Le Bon Manger"
```

### syncService (memory + localStorage)

```javascript
syncService.getAuthToken();
// "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

syncService.getRestaurantId();
// "rest_789"

syncService.getRestaurantName();
// "Le Bon Manger"
```

## Après le Login: Prochaines Étapes

### 1. Synchroniser les données

```
Settings → Synchronisation → [Synchroniser depuis l'API]
```

### 2. Voir les catégories

```
Catégories → [Voir les catégories importées]
```

### 3. Voir les articles du menu

```
Menu → [Voir les articles du menu]
```

### 4. Utiliser le POS

```
Caisse (Home) → [Utiliser le terminal POS]
```

## Détection des Problèmes

### Le login ne marche pas?

**Checklist:**

- [ ] Vérifier VITE_API_URL dans .env.local
- [ ] Backend MOUDI est-il en cours d'exécution?
- [ ] Email et password sont-ils corrects?
- [ ] Le compte est-il un compte propriétaire?
- [ ] Ouvrir F12 Console pour voir les erreurs
- [ ] Vérifier Network tab pour les appels API

### Le token n'est pas configuré?

**Checklist:**

- [ ] Vérifier localStorage.getItem('authToken') dans console
- [ ] Vérifier syncService.getAuthToken()
- [ ] Les messages de log lors du login sont-ils affichés?
- [ ] Le login retourne bien success: true?

### La synchronisation échoue après login?

**Checklist:**

- [ ] Vérifier que le token est présent
- [ ] Vérifier que restaurantId est défini
- [ ] Vérifier l'onglet Network pour les erreurs 401
- [ ] Si 401: token a peut-être expiré, se reconnecter

## Mode Debug

Pour la développement, activez les logs:

### Console Logs

```javascript
// Voir tous les logs
localStorage.getItem("apppos_user");
localStorage.getItem("authToken");
localStorage.getItem("restaurantId");
syncService.getAuthToken();
syncService.getRestaurantId();
```

### Network Tab (F12 Network)

```
POST /api/proprietaires/login
  Status: 200
  Response: { success: true, data: {...} }
```

## Fichiers de Documentation

Pour plus de détails, consultez:

1. **LOGIN_API_GUIDE.md** (ce fichier)
   - Architecture du login
   - Gestion des erreurs
   - Exemples de code

2. **TOKEN_CONFIGURATION.md**
   - Gestion du token JWT
   - Hiérarchie de chargement
   - Sécurité

3. **API_INTEGRATION_GUIDE.md**
   - Endpoints API MOUDI
   - Synchronisation des données

4. **CONFIGURATION_COMPLETE.md**
   - Configuration du restaurant
   - Flux d'intégration global

## Résumé des Changements

| Fichier                        | Statut     | Description                       |
| ------------------------------ | ---------- | --------------------------------- |
| `src/services/auth.service.ts` | ✨ NEW     | Service d'authentification API    |
| `src/context/AuthContext.tsx`  | ✏️ UPDATED | Support API + gestion erreurs     |
| `src/pages/Login.tsx`          | ✏️ UPDATED | Améliorations UX/UI + email field |
| `LOGIN_API_GUIDE.md`           | ✨ NEW     | Documentation complète du login   |

## Prochaines Étapes

- [ ] Tester le login avec vos credentials MOUDI
- [ ] Vérifier la synchronisation
- [ ] Implémenter refresh token (optionnel)
- [ ] Ajouter 2FA (optionnel)
- [ ] Ajouter tests unitaires

---

**Tout est prêt pour tester le login API MOUDI!** 🎉

Pour toute question, consultez les fichiers de documentation ou les logs de la console.
