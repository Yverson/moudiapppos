# Guide du Login API Dynamique - @apppos

## Vue d'ensemble

La page de login de @apppos a été entièrement refonte pour se connecter à l'**API MOUDI réelle** en tant que propriétaire. Après login réussi, les informations suivantes sont automatiquement configurées:

1. **Token JWT Bearer** - Stocké dans localStorage et syncService
2. **Restaurant ID** - Récupéré depuis le profil du propriétaire
3. **Restaurant Name** - Nommé depuis le profil du propriétaire
4. **Synchronisation automatique** - Prête à synchroniser les catégories et menus

## Architecture du Login

```
┌────────────────────────────────────────┐
│         Page Login (Login.tsx)          │
│  - Email/Password Input                │
│  - Show/Hide Password Toggle           │
│  - Error Messages Détaillés            │
└────────────┬─────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│    AuthContext (AuthContext.tsx)       │
│  - Call login() avec credentials       │
│  - Gestion des erreurs                 │
│  - Persistence localStorage            │
└────────────┬─────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│   AuthService (auth.service.ts)        │
│  - POST /api/proprietaires/login       │
│  - Extract token + user + restaurant   │
│  - Configure syncService               │
└────────────┬─────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│    MOUDI Backend API                   │
│  - Validate credentials                │
│  - Return JWT + Proprietaire info      │
└────────────────────────────────────────┘
```

## Flux d'authentification Complet

### 1. Utilisateur remplit le formulaire

```
Email:       proprietaire@restaurant.com
Mot de passe: password123
```

### 2. Envoi à l'API MOUDI

```bash
POST /api/proprietaires/login
Content-Type: application/json

{
  "Email": "proprietaire@restaurant.com",
  "Password": "password123"
}
```

### 3. Réponse de l'API MOUDI

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "proprietaire@restaurant.com",
      "nom": "Dupont",
      "prenom": "Jean",
      "role": "proprietaire"
    },
    "proprietaire": {
      "id": "prop_456",
      "restaurantId": "rest_789",
      "restaurantName": "Le Bon Manger",
      "email": "proprietaire@restaurant.com",
      "nom": "Dupont",
      "prenom": "Jean"
    }
  }
}
```

### 4. Configuration Automatique

Le token et les informations du restaurant sont configurés automatiquement:

```typescript
// Token stocké 2 endroits
localStorage.setItem("authToken", token);
syncService.setAuthToken(token);

// Restaurant configuré
syncService.setRestaurantId("rest_789");
syncService.setRestaurantName("Le Bon Manger");

// Stocké aussi dans localStorage
localStorage.setItem("restaurantId", "rest_789");
localStorage.setItem("restaurantName", "Le Bon Manger");
```

### 5. Navigation automatique

Après login réussi → Navigate to `/pos` (POS Terminal)

## Fichiers Modifiés/Créés

### 1. **auth.service.ts** (NEW - 200+ lignes)

Service principal pour l'authentification API MOUDI.

**Méthodes principales:**

```typescript
// Login avec credentials
async login(credentials: LoginCredentials): Promise<User | null>

// Logout et cleanup
logout(): void

// Vérifier authentification
isAuthenticated(): boolean

// Obtenir le token
getToken(): string | null

// Vérifier token valide
async verifyToken(): Promise<boolean>

// Rafraîchir le token
async refreshToken(): Promise<boolean>
```

**Exemple d'utilisation:**

```typescript
import authService from "@/services/auth.service";

// Login
const user = await authService.login({
  email: "proprietaire@restaurant.com",
  password: "password123",
});

if (user) {
  console.log("✅ Connecté:", user.firstName, user.lastName);
  console.log("🏪 Restaurant:", user.restaurantName);
}

// Logout
authService.logout();
```

### 2. **AuthContext.tsx** (UPDATED)

Contexte React pour gérer l'état d'authentification.

**Interface mise à jour:**

```typescript
interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Nouvelle interface User:**

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  restaurantId?: string;
  restaurantName?: string;
}
```

**Gestion des erreurs détaillée:**

```typescript
if (error.response?.status === 401) {
  errorMessage = "Email ou mot de passe incorrect";
} else if (error.code === "ECONNREFUSED") {
  errorMessage =
    "Impossible de se connecter au serveur. Vérifiez VITE_API_URL.";
} else if (error.message === "Network Error") {
  errorMessage = "Erreur réseau. Vérifiez votre connexion Internet.";
}
```

### 3. **Login.tsx** (UPDATED)

Page de connexion améliorée avec:

- ✅ Champ Email au lieu de Username
- ✅ Toggle Show/Hide Password
- ✅ Gestion des erreurs détaillées
- ✅ Loading state avec animation
- ✅ Messages informatifs
- ✅ Affichage de VITE_API_URL pour debug
- ✅ Validation des champs

**Nouvelles fonctionnalités:**

```tsx
// Show/Hide Password Toggle
const [showPassword, setShowPassword] = useState(false);

<input type={showPassword ? 'text' : 'password'} />
<button onClick={() => setShowPassword(!showPassword)}>
  {showPassword ? 'visibility' : 'visibility_off'}
</button>

// Validation
if (!email || !password) {
  setError('Veuillez remplir tous les champs');
  return;
}

// Gestion de réponse d'authentification
const result = await login(email, password);
if (result.success) {
  navigate('/pos');
} else {
  setError(result.error);
}
```

## Flux d'utilisation

### Scénario 1: Login Réussi

```
1. Utilisateur accès http://localhost:3062/login
2. Remplit email + password
3. Clique "Se connecter"
4. AuthContext → AuthService → API MOUDI
5. ✅ Token + Restaurant récupérés
6. Redirection vers /pos
7. Le POS Terminal est prêt avec:
   - 🔐 Token configuré pour les appels API
   - 🏪 Restaurant ID/Name configurés pour la syncing
```

### Scénario 2: Email/Password Incorrect

```
1. Utilisateur remplit credentials incorrects
2. Clique "Se connecter"
3. ❌ API retourne 401 Unauthorized
4. Message affiché: "Email ou mot de passe incorrect"
5. Reste sur la page de login
```

### Scénario 3: Serveur Non Accessible

```
1. VITE_API_URL incorrect (ex: http://localhost:9999)
2. ❌ ECONNREFUSED error
3. Message: "Impossible de se connecter au serveur. Vérifiez VITE_API_URL."
4. Utilisateur peut vérifier .env.local
```

### Scénario 4: Erreur Réseau

```
1. Pas d'accès Internet
2. ❌ Network Error
3. Message: "Erreur réseau. Vérifiez votre connexion Internet."
```

## Configuration

### Prérequis

```env
# .env.local
VITE_API_URL=https://glad-oriented-camel.ngrok-free.app

# Ou en production:
VITE_API_URL=https://api.moudi.com
```

### Endpoint Backend Requis

```bash
POST /api/proprietaires/login
Content-Type: application/json

Request:
{
  "Email": "proprietaire@restaurant.com",
  "Password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": { ... },
    "proprietaire": {
      "restaurantId": "rest_id",
      "restaurantName": "RestaurantName"
    }
  }
}
```

## Intégration avec SyncService

Après login réussi, le token et restaurant sont automatiquement configurés:

```typescript
// Dans auth.service.ts, la méthode login():

// 1. Token configuré
localStorage.setItem("authToken", token);
syncService.setAuthToken(token);

// 2. Restaurant configuré
syncService.setRestaurantId(restaurantId);
syncService.setRestaurantName(restaurantName);

// 3. Tous les appels API utilisent automatiquement le token:
// Authorization: Bearer {token}
```

## Gestion des Erreurs

### Erreurs Supportées

| Code          | Cause                  | Message                                                       |
| ------------- | ---------------------- | ------------------------------------------------------------- |
| 401           | Credentials invalides  | Email ou mot de passe incorrect                               |
| 404           | Utilisateur non trouvé | Utilisateur non trouvé                                        |
| ECONNREFUSED  | Backend non accessible | Impossible de se connecter au serveur. Vérifiez VITE_API_URL. |
| Network Error | Pas d'Internet         | Erreur réseau. Vérifiez votre connexion Internet.             |
| Custom        | API retourne message   | Message de l'API affiché                                      |

### Affichage des Erreurs

```tsx
{
  error && (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
      <p className="font-medium">Erreur de connexion</p>
      <p className="text-xs mt-1">{error}</p>
    </div>
  );
}
```

## Sécurité

### Bonnes Pratiques Implémentées

```typescript
// ✅ Token stocké dans localStorage
localStorage.setItem('authToken', token);

// ✅ Token envoyé dans Authorization header
Authorization: Bearer {token}

// ✅ Token supprimé au logout
localStorage.removeItem('authToken');

// ✅ Password field masqué par défaut
type={showPassword ? 'text' : 'password'}

// ✅ Timeout sur les requêtes API
timeout: 30000

// ✅ Interception des erreurs 401
if (error.response?.status === 401) {
  this.logout();  // Auto-logout si token expiré
}
```

### À Faire en Production

- [ ] Utiliser HTTPS seulement (`https://api.moudi.com`)
- [ ] Implémenter refresh token mechanism
- [ ] Ajouter CSRF protection
- [ ] Implémenter rate limiting sur le login
- [ ] Ajouter 2FA (optionnel)
- [ ] Logger les tentatives de connexion échouées

## Flux de Déconnexion

```typescript
const logout = () => {
  setUser(null);
  localStorage.removeItem("apppos_user");
  authService.logout(); // Aussi supprime authToken
  // Navigation vers /login est automatique via ProtectedRoute
};
```

## Debug et Troubleshooting

### 1. Vérifier le Token

```typescript
// Dans la console du navigateur (F12)
localStorage.getItem("authToken");
// Doit retourner un JWT token commençant par "eyJ..."
```

### 2. Vérifier la Configuration du Restaurant

```typescript
// Dans la console
localStorage.getItem("restaurantId");
localStorage.getItem("restaurantName");

// Ou via syncService
import syncService from "@/services/sync.service";
console.log("Restaurant ID:", syncService.getRestaurantId());
console.log("Restaurant Name:", syncService.getRestaurantName());
```

### 3. Vérifier l'API URL

```typescript
// Dans la console
import.meta.env.VITE_API_URL;
// Doit afficher: https://glad-oriented-camel.ngrok-free.app (ou votre URL en production)
```

### 4. Consulter les Logs

Ouvrir F12 > Console pour voir:

```
[AuthService] Token d'authentification obtenu et configuré
[AuthService] Restaurant configuré: Le Bon Manger (rest_789)
[AuthContext] Connexion réussie: proprietaire@restaurant.com
```

## Prochaines Étapes

### Phase 1: Production-Ready

- [ ] Implémenter Refresh Token
- [ ] Ajouter 2FA support
- [ ] Améliorer gestion des erreurs API
- [ ] Ajouter tests unitaires

### Phase 2: User Experience

- [ ] Ajouter "Remember Me" option
- [ ] Implémenter password reset
- [ ] Ajouter signup flow
- [ ] Ajouter social login (optionnel)

### Phase 3: Advanced

- [ ] Implémenter token auto-refresh
- [ ] Ajouter logout global (tous les onglets)
- [ ] Ajouter session activity monitoring
- [ ] Implémenter SSO (Single Sign-On)

## Exemples de Code

### Exemple 1: Utiliser le contexte Auth dans un composant

```typescript
import { useAuth } from '@/context/AuthContext';

export function UserProfile() {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>Bonjour {user?.firstName} {user?.lastName}</p>
      <p>Restaurant: {user?.restaurantName}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Exemple 2: Vérifier l'authentification

```typescript
export function Settings() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Chargement...</div>;

  if (!isAuthenticated) {
    return <div>Vous n'êtes pas authentifié</div>;
  }

  return <div>Contenu sécurisé</div>;
}
```

### Exemple 3: Refresh token après expiration

```typescript
import authService from "@/services/auth.service";

// Quelque part dans un effet ou middleware
useEffect(() => {
  const interval = setInterval(
    async () => {
      const isValid = await authService.verifyToken();
      if (!isValid) {
        const refreshed = await authService.refreshToken();
        if (!refreshed) {
          // Token non valide et refresh échoué → logout
          logout();
        }
      }
    },
    5 * 60 * 1000,
  ); // Vérifier tous les 5 minutes

  return () => clearInterval(interval);
}, []);
```

## Résumé

La page de login a été complètement refactor e pour:

✅ **Authentification réelle** - Connexion à l'API MOUDI
✅ **Token JWT** - Automatiquement configuré dans syncService
✅ **Restaurant Info** - Récupéré depuis le profil du propriétaire
✅ **Gestion des erreurs** - Détaillée et explicite
✅ **UX Améliorée** - Show/hide password, messages d'erreur clairs
✅ **Sécurité** - Token Bearer, ECONNREFUSED handling, auto-logout

Tout est prêt pour utiliser @apppos avec l'API MOUDI réelle! 🎉
