# Configuration du Token d'Authentification - @apppos

## Vue d'ensemble

Le token JWT Bearer est requis pour tous les appels API vers le backend MOUDI. Cette documentation explique comment configurer et gérer le token pour la synchronisation des données.

## Hiérarchie de chargement du token

Le token est chargé dans cet ordre de priorité:

```
1. Variable d'environnement VITE_AUTH_TOKEN (.env.local)
   ↓ (si vide)
2. localStorage.authToken (défini via setAuthToken() après login)
   ↓ (si non disponible)
3. ❌ ERREUR: Les appels API échoueront (401 Unauthorized)
```

## Méthodes de configuration

### Méthode 1: Via la variable d'environnement (Recommandée pour le développement)

**Avantage**: Token configuré au démarrage
**Inconvénient**: Token en clair dans le fichier (à ne pas committer)

#### Étape 1: Obtenir un token valide

Depuis le backend MOUDI, effectuez un login:

```bash
curl -X POST https://glad-oriented-camel.ngrok-free.app/api/proprietaires/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@restaurant.com",
    "password": "password123"
  }'

# Réponse:
# {
#   "success": true,
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "user": {...}
#   }
# }
```

#### Étape 2: Ajouter le token à `.env.local`

```env
# .env.local
VITE_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0...
```

#### Étape 3: Redémarrer l'application

```bash
npm run dev
```

La console affichera:

```
[SyncService] Token d'authentification chargé depuis les variables d'environnement
```

### Méthode 2: Via localStorage après login (Dynamique)

**Avantage**: Token défini à l'exécution après authentification
**Inconvénient**: Nécessite une page de login ou un formulaire

#### Dans le code après un login réussi:

```typescript
import syncService from "@/services/sync.service";

// Après obtenir le token depuis l'API login
const loginResponse = await fetch("/api/proprietaires/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

const { data } = await loginResponse.json();
const token = data.token;

// Définir le token pour les futurs appels API
syncService.setAuthToken(token);

console.log("✅ Token défini pour les appels API");
```

### Méthode 3: Combinaison (Recommandée pour la production)

Utiliser `.env.local` avec un token de service ou un token de longue durée:

```env
# .env.local (production)
VITE_AUTH_TOKEN=service_token_with_long_expiry

# Ou vide, puis seté dynamiquement après login
VITE_AUTH_TOKEN=
```

Puis lors du login:

```typescript
syncService.setAuthToken(userToken);
```

## Utilisation dans le code

### Vérifier le token actuel

```typescript
import syncService from "@/services/sync.service";

const token = syncService.getAuthToken();
if (token) {
  console.log("✅ Token configuré");
  // Le token sera inclus dans tous les appels API
} else {
  console.warn("❌ Aucun token disponible");
}
```

### Défier un nouveau token

```typescript
import syncService from "@/services/sync.service";

// Après un login réussi
syncService.setAuthToken(newToken);

// Les prochains appels API utiliseront le nouveau token
```

### Supprimer le token (Logout)

```typescript
import syncService from "@/services/sync.service";

// Logout
syncService.clearAuthToken();

// Les appels API échoueront sans token
```

### Récupérer le token depuis l'environnement

```typescript
// Dans n'importe quel code
const envToken = import.meta.env.VITE_AUTH_TOKEN;

if (envToken) {
  console.log("Token configuré via .env.local");
}
```

## Gestion des erreurs

### Erreur 401 Unauthorized

```
Cause: Token expiré, invalide ou manquant

Solutions:
1. Vérifier que VITE_AUTH_TOKEN n'est pas vide dans .env.local
2. Si vide, vérifier que localStorage.authToken est configuré après login
3. Obtenir un nouveau token et appeler syncService.setAuthToken(newToken)
4. Relancer la synchronisation
```

### Erreur de synchronisation

```
Message: "Impossible de synchroniser les catégories.
         Vérifiez votre connexion et votre authentification."

Solutions:
1. Vérifier que le token existe: console.log(syncService.getAuthToken())
2. Vérifier que VITE_API_URL pointe sur le bon backend
3. Vérifier la validité du token (expiration, permissions)
4. Obtenir un nouveau token si le token a expiré
```

## Structure du JWT Bearer Token

Le token JWT typique contient trois parties:

```
eyJ[header].eyJ[payload].eyJ[signature]
```

### Contenu typique du payload:

```json
{
  "sub": "user_id",
  "email": "owner@restaurant.com",
  "restaurantId": "rest_1",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Points importants:

- **iat** (issued at): Heure de création
- **exp** (expiration): Heure d'expiration
- **restaurantId**: ID du restaurant associé au token
- **email**: Email du propriétaire

## Sécurité

### ⚠️ Bonnes pratiques

```bash
# ❌ NE PAS committer le token
git add .env.local  # ERREUR!

# ✅ Utiliser .gitignore
echo ".env.local" >> .gitignore
git add .gitignore

# ✅ Ajouter au .env.example SANS la valeur
VITE_AUTH_TOKEN=  # Valeur vide, juste pour documenter
```

### Protection du token

```typescri
// ✅ Stocké dans localStorage (navigateur isolé)
localStorage.setItem('authToken', token);

// ✅ Automatiquement inclus dans les headers Authorization
// Authorization: Bearer {token}

// ❌ Ne jamais exposer le token
// - Pas dans l'URL
// - Pas dans console.log (en production)
// - Pas dans le code source
// - Pas dans les cookies non-secure
```

### Token expiré

```typescript
// Le token expire après une période définie (généralement 30 jours)
// Configuration typique dans le backend:
// jwt.exp = now + 30 days

// Quand le token expire:
// 1. Les appels API retournent 401 Unauthorized
// 2. syncService supprime le token automatiquement
// 3. L'utilisateur doit se reconnecter
// 4. Obtenir un nouveau token via login
```

## Variables d'environnement de token

### VITE_AUTH_TOKEN

| Propriété   | Valeur                                               |
| ----------- | ---------------------------------------------------- |
| Type        | String (JWT Bearer Token)                            |
| Obligatoire | Non (fallback sur localStorage)                      |
| Défaut      | Vide                                                 |
| Format      | `eyJhbGciOiJIUzI1NiI...` (sans le préfixe "Bearer ") |
| Expiration  | Définie dans le token (généralement 30 jours)        |
| Refresh     | À configurer manuellement ou via login               |

## Troubleshooting

### Le token n'est pas chargé

```typescript
// Vérifier la console au démarrage
// Chercher: "[SyncService] Token d'authentification..."

// Si absent:
// 1. VITE_AUTH_TOKEN est vide dans .env.local
// 2. localStorage.authToken n'est pas défini
// 3. Appeler syncService.setAuthToken(token) après login
```

### Le token ne fonctionne pas après le paramétrer

```bash
# Redémarrer l'application après modification de .env.local
npm run dev

# Effacer le cache et recharger (F12 > Storage > Clear All)
```

### Le token expire pendant une synchronisation

```typescript
// Le service gère automatiquement les erreurs 401
// En cas d'expiration et nouvelle tentative:

const result = await syncService.syncAll();
if (!result.success && result.message.includes("401")) {
  // Obtenir un nouveau token
  const newToken = await getNewToken();
  syncService.setAuthToken(newToken);

  // Relancer la synchronisation
  const retryResult = await syncService.syncAll();
}
```

## Cas d'utilisation

### Développement local

```env
# .env.local (développement)
VITE_API_URL=https://glad-oriented-camel.ngrok-free.app
VITE_AUTH_TOKEN=dev_token_from_backend
VITE_RESTAURANT_ID=rest_1
```

### Staging

```env
# .env.staging (staging)
VITE_API_URL=https://staging-api.moudi.com
VITE_AUTH_TOKEN=  # Vide, défini après login
VITE_RESTAURANT_ID=rest_staging
```

### Production

```env
# .env.production (production)
VITE_API_URL=https://api.moudi.com
VITE_AUTH_TOKEN=  # Vide, défini après login de l'utilisateur
VITE_RESTAURANT_ID=  # Défini pour le restaurant spécifique
```

## Intégration avec le composant de login (future)

```typescript
// SyncSettings.tsx ou page de login
import syncService from '@/services/sync.service';

export function LoginComponent() {
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/proprietaires/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const { data } = await response.json();

      if (data.token) {
        // Définir le token pour les appels API
        syncService.setAuthToken(data.token);

        // Définir le restaurant ID si disponible
        if (data.proprietaire?.restaurantId) {
          syncService.setRestaurantId(data.proprietaire.restaurantId);
        }

        // Procéder à la synchronisation
        const syncResult = await syncService.syncAll();
        console.log('✅ Synchronisation réussie après login');
      }
    } catch (error) {
      console.error('Erreur de login:', error);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const email = e.target.email.value;
      const password = e.target.password.value;
      handleLogin(email, password);
    }}>
      {/* Formulaire */}
    </form>
  );
}
```

## Révision et rotation du token

### Tous les 30 jours

1. Obtenir un nouveau token via login:

   ```bash
   curl -X POST https://glad-oriented-camel.ngrok-free.app/api/proprietaires/login \
     -d '{"email":"owner@restaurant.com","password":"password"}'
   ```

2. Mettre à jour `.env.local`:

   ```env
   VITE_AUTH_TOKEN=new_token_here
   ```

3. Redémarrer l'application:
   ```bash
   npm run dev
   ```

### Lors d'une compromission du token

Si le token est exposé:

1. Immédiatement supprimer du `.env.local`
2. Demander au backend de révoquer le token
3. Obtenir un nouveau token
4. Redémarrer l'application

## Support

Pour toute question:

1. Consulter `API_INTEGRATION_GUIDE.md` pour l'API
2. Vérifier la console (F12) pour les logs
3. Vérifier le status du backend MOUDI
4. Contacter l'équipe de développement

---

**Configuration du token complétée!** 🎉
