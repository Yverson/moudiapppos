# Guide d'intégration API MOUDI - @apppos

## Vue d'ensemble

@apppos utilise maintenant l'**API MOUDI réelle** pour synchroniser les données des catégories et des menus depuis le backend vers la base de données SQLite locale.

## Architecture de synchronisation

```
                    MOUDI Backend API
                    ├── Categories
                    ├── Menu Items
                    └── Customers (non implémenté)
                           ↓
                    API Services
                           ↓
                    Sync Service
                           ↓
                    SQLite Database
                           ↓
                    React Components
```

## Endpoints API utilisés

### 1. Catégories

**Endpoint**: `GET /api/restaurants/{restaurantId}/categories`

```typescript
// Récupère les catégories du restaurant
const response = await syncService.fetchCategoriesFromAPI(restaurantId);
// Retourne: Category[]
```

**Format de réponse API MOUDI**:

```json
{
  "success": true,
  "data": [
    {
      "id": "cat_1",
      "nom": "Pizzas",
      "description": "Nos délicieuses pizzas",
      "ordreTri": 1,
      "actif": true
    }
  ]
}
```

**Mapping vers SQLite**:

- `nom` → `name`
- `description` → `description`
- `ordreTri` → `order`
- `actif` → `active`
- Défaut: color = `#FF6B6B`, icon = `restaurant`

### 2. Menu Items (Produits)

**Endpoint**: `GET /api/restaurants/{restaurantId}`

Récupère les détails du restaurant incluant le menu complet sous `categoriesMenu`.

```typescript
// Récupère le menu du restaurant
const response = await syncService.fetchMenuItemsFromAPI(restaurantId);
// Extrait les plats de chaque catégorie
// Retourne: MenuItem[]
```

**Format de réponse API MOUDI**:

```json
{
  "success": true,
  "data": {
    "id": "rest_1",
    "nom": "Pizzeria Luigi",
    "categoriesMenu": [
      {
        "id": "cat_1",
        "nom": "Pizzas",
        "plats": [
          {
            "id": "plat_1",
            "nom": "Margherita",
            "description": "Tomate, mozzarella, basilic",
            "prix": 12.99,
            "imageUrl": "https://...",
            "estDisponible": true,
            "tempsPreparation": 15,
            "allergenes": ["gluten", "lactose"],
            "variations": [
              {
                "id": "var_1",
                "nom": "Taille",
                "estObligatoire": true,
                "options": [
                  {
                    "id": "opt_1",
                    "nom": "Petit",
                    "modificateurPrix": 0.0
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Mapping vers SQLite**:

- `nom` → `name`
- `description` → `description`
- `prix` → `price`
- `prixCout` → `cost_price`
- `imageUrl` → `image_url`
- `estDisponible` → `available`
- `tempsPreparation` → `preparation_time`
- `allergenes` → `allergens` (JSON)
- `variations` → `variants` (JSON)

### 3. Clients (Customers)

**Status**: ❌ **Non implémenté**

Les clients dans MOUDI sont gérés au niveau global du système, pas par restaurant.

Pour implémenter la synchronisation des clients:

- Utiliser `GET /api/clients` (tous les clients du système)
- Ou implémenter une synchronisation sélective par ville/région

## Configuration

### 1. Configurer le restaurantId

Le service de synchronisation necessite un `restaurantId` pour fonctionner.

**Méthode 1: Via le service directement**

```typescript
import syncService from "@/services/sync.service";

// Au démarrage de l'application (après login)
syncService.setRestaurantId("rest_1");
```

**Méthode 2: Via localStorage**

```typescript
// Après authentification du propriétaire
localStorage.setItem("restaurantId", "rest_1");

// syncService récupérera automatiquement depuis localStorage
```

**Méthode 3: Via le DatabaseProvider**

```typescript
// Dans App.tsx
<DatabaseProvider restaurantId={proprietaireRestaurantId}>
  {/* Application */}
</DatabaseProvider>

// Puis dans SyncSettings ou ailleurs
syncService.setRestaurantId(restaurantId);
```

### 2. Configuration d'authentification

L'API MOUDI requiert un token JWT Bearer:

```typescript
// Le token est automatiquement ajouté via le header Authorization
localStorage.setItem("authToken", "jwt_token_from_login");

// syncService ajoute automatiquement:
// Authorization: Bearer {token}
```

### 3. Variables d'environnement

```env
# .env.local
VITE_API_URL=http://localhost:5000
# ou en production:
VITE_API_URL=https://api.moudi.com
```

## Utilisation

### Synchroniser toutes les données

```typescript
import syncService from "@/services/sync.service";

// Dans le composant Settings/SyncSettings
const handleSync = async () => {
  const result = await syncService.syncAll({
    categories: true, // Synchroniser les catégories
    menuItems: true, // Synchroniser les menu items
    customers: false, // Clients non disponibles
    overwrite: false, // Fusionner avec les données existantes
  });

  if (result.success) {
    console.log("Synchronisation réussie");
    console.log(`Catégories: ${result.details.categories.synced}`);
    console.log(`Menu items: ${result.details.menuItems.synced}`);
  } else {
    console.error("Erreurs:", result.details.categories.errors);
  }
};
```

### Synchroniser sélectivement

```typescript
// Uniquement les catégories
const result = await syncService.syncAll({
  categories: true,
  menuItems: false,
  customers: false,
});

// Uniquement les menu items
const result = await syncService.syncAll({
  categories: false,
  menuItems: true,
  customers: false,
});
```

### Mode remplacement (overwrite)

```typescript
// Remplacer toutes les données locales par les données API
const result = await syncService.syncAll({
  categories: true,
  menuItems: true,
  overwrite: true, // ⚠️ Cela supprimera les données locales
});
```

### Vérifier le statut de synchronisation

```typescript
// Récupérer la date de la dernière synchronisation
const status = await syncService.getSyncStatus();
console.log(status);
// Output:
// {
//   categories: "2025-02-18T10:30:00Z",
//   menu_items: "2025-02-18T10:25:00Z",
//   customers: null
// }
```

### Vérifier si une synchronisation est nécessaire

```typescript
const { needs, reason } = await syncService.needsSync();
if (needs) {
  console.log("Synchronisation nécessaire:", reason);
  // Trigger auto-sync
}
```

### Compter les données locales

```typescript
const count = await syncService.getLocalDataCount();
console.log(count);
// Output:
// {
//   categories: 12,
//   menuItems: 45,
//   customers: 156
// }
```

## Gestion des erreurs

La synchronisation est robuste et gère les erreurs de manière granulaire:

```typescript
const result = await syncService.syncAll();

// Vérifier les résultats par catégorie
if (result.details.categories.errors.length > 0) {
  console.error("Erreurs catégories:", result.details.categories.errors);
}

if (result.details.menuItems.errors.length > 0) {
  console.error("Erreurs menu items:", result.details.menuItems.errors);
}

// La synchronisation partielle est possible
// Ex: Les catégories peuvent réussir même si les menu items échouent
```

**Erreurs courantes**:

1. **Restaurant ID manquant**

   ```
   "Restaurant ID non configuré. Impossible de synchroniser."
   ```

   → Assurez-vous de configurer le restaurantId après login

2. **Authentification échouée**

   ```
   "Impossible de synchroniser les catégories.
    Vérifiez votre connexion et votre authentification."
   ```

   → Vérifiez que le token JWT est valide et non expiré

3. **Restaurant introuvable**
   ```
   "404: Restaurant not found"
   ```
   → Vérifiez l'ID du restaurant

## Mapping des champs

### Categories

| API MOUDI          | SQLite        | Type     | Note                       |
| ------------------ | ------------- | -------- | -------------------------- |
| `id`               | `id`          | String   | Identifiant unique         |
| `nom`              | `name`        | String   | Nom de la catégorie        |
| `description`      | `description` | String   | Description                |
| `ordreTri`         | `order`       | Number   | Ordre d'affichage          |
| `actif`            | `active`      | Boolean  | Catégorie active           |
| -                  | `color`       | String   | Couleur (défaut: #FF6B6B)  |
| -                  | `icon`        | String   | Icône (défaut: restaurant) |
| `dateCreation`     | `created_at`  | DateTime | Date de création           |
| `dateModification` | `updated_at`  | DateTime | Date de modification       |

### Menu Items

| API MOUDI          | SQLite             | Type    | Note               |
| ------------------ | ------------------ | ------- | ------------------ |
| `id`               | `id`               | String  | Identifiant unique |
| `nom`              | `name`             | String  | Nom du plat        |
| `description`      | `description`      | String  | Description        |
| `prix`             | `price`            | Float   | Prix de vente      |
| `prixCout`         | `cost_price`       | Float   | Coût de revient    |
| `imageUrl`         | `image_url`        | String  | URL de l'image     |
| `estDisponible`    | `available`        | Boolean | Disponibilité      |
| `tempsPreparation` | `preparation_time` | Number  | Temps en minutes   |
| `allergenes`       | `allergens`        | JSON    | Array de chaînes   |
| `variations`       | `variants`         | JSON    | Array d'objets     |

## Points importants

### 1. Authentification obligatoire

- L'API MOUDI nécessite un JWT Bearer token
- Le token doit être stocké dans `localStorage.authToken`
- Le token expire après 30 jours
- Implémenter un refresh token si nécessaire

### 2. RestaurantId obligatoire

- Tous les appels API nécessitent un `restaurantId` valide
- Le restaurantId doit être configuré via `syncService.setRestaurantId(id)`
- Ou stocké dans `localStorage.restaurantId`

### 3. Gestion des clients

- **Les clients ne peuvent pas être synchronisés par restaurant**
- Les clients dans MOUDI sont des utilisateurs globaux du système
- Solution future: Implémenter un endpoint pour les clients "préférés" d'un restaurant

### 4. Format des données JSON

Certains champs API MOUDI sont des JSON stockés comme String (allergens, variations):

- Automatiquement sérialisés lors de la synchronisation
- Automatiquement parsés lors de l'utilisation
- Géré par les méthodes `parseAllergens()`, `parseVariants()`, etc.

### 5. Synchronisation partielle

- Les erreurs dans une catégorie n'affectent pas les autres
- Les catégories réussies seront sauvegardées même si le menu échoue
- Vérifier `result.success` pour le statut global
- Vérifier `result.details.*.errors` pour les erreurs spécifiques

## Schéma API MOUDI complet

Voir le fichier `MOUDI_API_DOCUMENTATION.md` pour la documentation complète des endpoints:

- Authentification
- Restaurants
- Catégories
- Menu Items
- Commandes
- Livreurs
- Et plus...

## Développement

### Ajouter un nouvel endpoint de synchronisation

```typescript
// Dans sync.service.ts

private async fetchXxxFromAPI(restaurantId: string): Promise<any[]> {
  try {
    const response = await this.api.get(
      `/api/restaurants/${restaurantId}/xxx`
    );
    return response.data?.data || response.data || [];
  } catch (error) {
    throw new Error('Impossible de récupérer les XXX de l\'API');
  }
}

private convertXxxFromAPI(apiXxx: any): Xxx {
  return {
    // Mapping des champs
  };
}
```

### Tester la synchronisation

```bash
# Dans le composant Settings
1. Configurer VITE_API_URL pour pointer sur le backend MOUDI
2. Se connecter avec un compte propriétaire valide
3. Vérifier que restaurantId est configuré
4. Cliquer sur "Synchroniser depuis l'API"
5. Vérifier le statut de synchronisation
```

## Troubleshooting

### La synchronisation ne fonctionne pas

1. Vérifier que `VITE_API_URL` est correct
2. Vérifier que le token d'authentification est valide
3. Vérifier que `restaurantId` est configuré
4. Vérifier dans la console pour les messages d'erreur

### Les données ne sont pas à jour

1. Vérifier la date de la dernière synchronisation
2. Cliquer manuellement sur "Synchroniser depuis l'API"
3. Attendre 24 heures pour une synchronisation automatique

### Erreur 401 Unauthorized

- Le token a expiré
- Vous devez vous reconnecter
- Implémenter un refresh token

### Erreur 404 Restaurant not found

- L'ID du restaurant est incorrect
- Vérifier le restaurantId stocké
- Vérifier que le restaurant existe dans MOUDI
