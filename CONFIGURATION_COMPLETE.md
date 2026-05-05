# Résumé - Configuration du Restaurant dans @apppos

## ✅ Configuration complète

Votre application est maintenant entièrement configurée avec le restaurant MOUDI!

### Configuration actuelle (.env.local)

```env
# API Configuration
VITE_API_URL=https://glad-oriented-camel.ngrok-free.app
VITE_APP_NAME=MOUDI'S Marcory

# Authentication
VITE_AUTH_TOKEN=votre_token_jwt_ici

# Restaurant Configuration
VITE_RESTAURANT_ID=8EA22386-7DA0-466D-BE54-E087A9325291
VITE_RESTAURANT_NAME=MOUDI'S Marcory
VITE_RESTAURANT_EMAIL=marcory@moudis.com
VITE_RESTAURANT_PHONE=+225 07 11 11 11 11
VITE_RESTAURANT_ADDRESS=Marcory, Abidjan

# Synchronization
VITE_AUTO_SYNC_ON_STARTUP=true
VITE_AUTO_SYNC_INTERVAL=24
```

## 🎯 Modifications apportées

### 1. Fichier `.env.local`

- ✅ Configuration du RESTAURANT_ID
- ✅ Configuration du RESTAURANT_NAME
- ✅ Configuration des informations du restaurant
- ✅ Paramètres de synchronisation
- ✅ Configuration du VITE_AUTH_TOKEN (nouveau!)

### 2. Service de synchronisation (`sync.service.ts`)

- ✅ Lecture du `VITE_RESTAURANT_ID` au constructeur
- ✅ Lecture du `VITE_RESTAURANT_NAME` au constructeur
- ✅ Lecture du `VITE_AUTH_TOKEN` au constructeur (nouveau!)
- ✅ Méthode `getRestaurantName()` pour récupérer le nom
- ✅ Méthode `setRestaurantName()` pour définir le nom
- ✅ Méthode `getAuthToken()` pour récupérer le token (nouveau!)
- ✅ Méthode `setAuthToken()` pour définir le token (nouveau!)
- ✅ Méthode `clearAuthToken()` pour supprimer le token (nouveau!)
- ✅ Logging automatique de la configuration

### 3. Fichier `.env.example`

- ✅ Création d'un modèle d'exemples pour la configuration
- ✅ Documentation de chaque paramètre
- ✅ Section Authentication avec VITE_AUTH_TOKEN (nouveau!)

### 4. Documentation

- ✅ Création de `RESTAURANT_CONFIGURATION.md`
- ✅ Guide complet de configuration
- ✅ Exemples et troubleshooting
- ✅ Nouvelle: `TOKEN_CONFIGURATION.md` pour la gestion du token

## 🚀 Démarrage rapide

### 1. Vérifier la configuration

```bash
# Afficher le contenu de .env.local
cat .env.local

# Ou dans la console du navigateur
localStorage.getItem('restaurantId')
localStorage.getItem('restaurantName')
```

### 2. Redémarrer l'application

```bash
# Arrêter l'application (Ctrl+C)
# Redémarrer
npm run dev
```

### 3. Vérifier dans les logs

La console du navigateur affichera:

```
[SyncService] Restaurant configuré: MOUDI'S Marcory
```

### 4. Aller à Settings > Synchronisation

- Cliquer sur "Synchroniser depuis l'API"
- Les catégories et menus du restaurant seront importés
- Affichage des statistiques de synchronisation

### 5. Configurer le Token d'authentification

Pour que la synchronisation fonctionne, vous devez avoir un token JWT valide:

**Option A: Via la variable d'environnement (Recommandée)**

```bash
# 1. Obtenir un token valide depuis le backend MOUDI
curl -X POST https://glad-oriented-camel.ngrok-free.app/api/proprietaires/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@restaurant.com", "password": "password"}'

# 2. Ajouter le token à .env.local
VITE_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. Redémarrer l'application
npm run dev

# 4. La console affichera:
# [SyncService] Token d'authentification chargé depuis les variables d'environnement
```

**Option B: Via localStorage après login**

```typescript
// Dans le composant de login ou Settings
import syncService from '@/services/sync.service';

// Après obtenir le token depuis l'API
const loginToken = response.data.token;
syncService.setAuthToken(loginToken);

// Les prochains appels API utiliseront ce token
```

## 📊 Hiérarchie de configuration

Le RestaurantId est chargé dans cet ordre:

```
1. Via syncService.setRestaurantId() (direct)
   ↓ (si pas défini)
2. stocké dans localStorage (restaurantId)
   ↓ (si pas défini)
3. VITE_RESTAURANT_ID (.env.local)
   ↓ (si pas défini)
4. ❌ ERREUR: "Restaurant ID non configuré"
```

Le Token d'authentification est chargé dans cet ordre:

```
1. VITE_AUTH_TOKEN (.env.local) - Recommandé pour développement
   ↓ (si vide)
2. Via syncService.setAuthToken() - Après login
   ↓ (si pas défini)
3. localStorage.authToken - Defini dynamiquement
   ↓ (si non disponible)
4. ❌ ERREUR: "401 Unauthorized" sur les appels API
```

## 🔄 Flux d'intégration

```
┌─────────────────────────┐
│   Application démarre    │
└────────────┬────────────┘
             ↓
┌─────────────────────────────────────┐
│  SyncService.constructor()           │
│  ├─ Lit VITE_RESTAURANT_ID           │
│  ├─ Lit VITE_RESTAURANT_NAME         │
│  ├─ Lit VITE_AUTH_TOKEN              │ (nouveau!)
│  └─ Log: Configuration chargée       │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  (Après login ou au démarrage)      │
│  peut aussi appeler:                 │
│  ├─ syncService.setRestaurantId()   │
│  ├─ syncService.setRestaurantName() │
│  ├─ syncService.setAuthToken()      │ (nouveau!)
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  Utilisateur clique sur "Sync"      │
│  await syncService.syncAll()         │
│                                      │
│  Récupère depuis MOUDI API:          │
│  + Token Bearer automatique          │
│  GET /api/restaurants/{id}/categories
│  GET /api/restaurants/{id}           │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  Données sauvegardées dans SQLite   │
│  et affichées dans l'interface       │
└─────────────────────────────────────┘
```

## 📝 Utilisation dans les autres services

### CategoryService

```typescript
import syncService from "@/services/sync.service";

// Récupère automatiquement les catégories du restaurant
const categories = await categoryService.getCategories();
```

### MenuService

```typescript
// Récupère les articles du restaurant
const menuItems = await menuService.getMenuItems();

// Peut filtrer par catégorie
const pizzas = await menuService.getMenuItems("cat-pizzas");
```

### SyncSettings Component

```typescript
// Affiche le nom du restaurant
const restaurantName = syncService.getRestaurantName();

// Affiche l'ID du restaurant
const restaurantId = syncService.getRestaurantId();

// Lance la synchronisation
const result = await syncService.syncAll();
```

### Gestion du Token d'authentification

```typescript
// Obtenir le token courant
import syncService from '@/services/sync.service';

const currentToken = syncService.getAuthToken();

// Définir un nouveau token après login
const loginResponse = await fetch('/api/proprietaires/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = await loginResponse.json();
syncService.setAuthToken(token);

// Supprimer le token (logout)
syncService.clearAuthToken();
```

## 🔐 Variables d'environnement sensibles

⚠️ **Important**: Ne jamais committer `.env.local`

```bash
# .gitignore
.env.local
.env.*.local
*.env.local
```

## 📚 Fichiers de documentation

Consultez ces fichiers pour plus d'informations:

1. **`.env.example`** - Modèle de configuration avec tous les paramètres
2. **`RESTAURANT_CONFIGURATION.md`** - Guide complet de configuration du restaurant
3. **`TOKEN_CONFIGURATION.md`** - Guide complet de configuration du token JWT (nouveau!)
4. **`API_INTEGRATION_GUIDE.md`** - Documentation technique de l'API
5. **`USAGE_GUIDE.md`** - Guide d'utilisation pratique
6. **`IMPLEMENTATION_SUMMARY.md`** - Résumé des modifications

## 🎓 Exemples de code

### Utiliser le nom du restaurant dans l'UI

```typescript
// Dans n'importe quel composant
import syncService from '@/services/sync.service';

export function Header() {
  const restaurantName = syncService.getRestaurantName();

  return (
    <header>
      <h1>{restaurantName}</h1>
      {/* ... */}
    </header>
  );
}
```

### Synchronisation automatique

```typescript
// Dans App.tsx ou un contexte d'initialisation
import syncService from "@/services/sync.service";

useEffect(() => {
  const autoSync = async () => {
    const { needs, reason } = await syncService.needsSync();
    if (needs) {
      const result = await syncService.syncAll();
      if (result.success) {
        console.log("✅ Synchronisation automatique réussie");
      }
    }
  };

  if (import.meta.env.VITE_AUTO_SYNC_ON_STARTUP) {
    autoSync();
  }
}, []);
```

### Afficher les infos du restaurant

```typescript
// Dans Settings
import syncService from '@/services/sync.service';

export function RestaurantInfo() {
  const id = syncService.getRestaurantId();
  const name = syncService.getRestaurantName();
  const email = import.meta.env.VITE_RESTAURANT_EMAIL;
  const phone = import.meta.env.VITE_RESTAURANT_PHONE;
  const address = import.meta.env.VITE_RESTAURANT_ADDRESS;

  return (
    <div className="restaurant-info">
      <h2>{name}</h2>
      <p>ID: {id}</p>
      <p>Email: {email}</p>
      <p>Téléphone: {phone}</p>
      <p>Adresse: {address}</p>
    </div>
  );
}
```

## ✅ Checklist de vérification

Avant de considérer la configuration comme complète:

- [ ] `.env.local` contient `VITE_RESTAURANT_ID` et `VITE_RESTAURANT_NAME`
- [ ] `.env.local` contient `VITE_AUTH_TOKEN` avec un token valide (nouveau!)
- [ ] `.env.local` contient `VITE_API_URL` pointant sur le backend MOUDI
- [ ] Application redémarrée après modification de `.env.local`
- [ ] Console affiche: "[SyncService] Restaurant configuré: MOUDI'S Marcory"
- [ ] Console affiche: "[SyncService] Token d'authentification chargé..." (nouveau!)
- [ ] Synchronisation manuelle réussit sans erreur 401
- [ ] Les catégories et menus s'affichent après synchronisation
- [ ] `.env.local` n'est pas commité (dans `.gitignore`)
- [ ] Peut changer le restaurant ID à l'exécution si besoin
- [ ] Peut définir un nouveau token avec `syncService.setAuthToken()` (nouveau!)

## 🚨 Troubleshooting

### "Restaurant ID non configuré"

→ Ajouter `VITE_RESTAURANT_ID=...` dans `.env.local`

### "401 Unauthorized" ou "Token invalide"

→ Ajouter un token valide: `VITE_AUTH_TOKEN=your_jwt_token` dans `.env.local`
→ Ou utiliser login et appeler `syncService.setAuthToken(token)`
→ Vérifier que le token n'a pas expiré

### Variables d'environnement non chargées

→ Redémarrer l'application après modification de `.env.local`

### Synchronisation échoue

→ Vérifier que l'API URL est correcte et accessible
→ Vérifier que le token JWT est valide et non expiré
→ Vérifier que le RESTAURANT_ID est correct
→ Vérifier dans la console (F12) pour les messages d'erreur détaillés

## 📞 Support

Pour plus d'aide, consultez:

- `RESTAURANT_CONFIGURATION.md` - Configuration détaillée du restaurant
- `TOKEN_CONFIGURATION.md` - Configuration du token JWT (nouveau!)
- `USAGE_GUIDE.md` - Guide d'utilisation
- Console du navigateur (F12) - Logs de l'application
- Backend MOUDI - Logs du serveur

## ✨ Prochaines étapes

1. ✅ Configuration du restaurant: COMPLÉTÉE
2. → Partir en production:
   - Créer `.env.production.local`
   - Configurer l'API URL en production
   - Configurer le RESTAURANT_ID de production
3. → Ajouter authentication propriétaire
4. → Automatiser la synchronisation
5. → Ajouter synchronisation bidirectionnelle

Tout est prêt pour commencer à utiliser @apppos avec MOUDI! 🎉
