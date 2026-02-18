# Résumé d'implémentation - Liaison des données à l'API MOUDI

## Travail réalisé

### Phase 1: Liaison SQLite (✅ Complétée)

Les services TypeScript (CategoryService, MenuService, CustomerService) ont été modifiés pour: - ✅ Utiliser **SQLiteService** au lieu de `localStorage`

- ✅ Persister les données dans **SQLite** (appdata.db)
- ✅ Charger automatiquement les données par défaut si la BD est vide
- ✅ Supporter les opérations CRUD vers SQLite via Tauri

**Fichiers modifiés**:

- `src/services/category.service.ts`
- `src/services/menu.service.ts`
- `src/services/customer.service.ts`

### Phase 2: Intégration API MOUDI (✅ Complétée)

Le service de synchronisation (`sync.service.ts`) a été entièrement refondu pour:

#### 1. Utiliser les vraies API du backend MOUDI

```
Avant (fictif):
  GET /api/categories
  GET /api/menu-items
  GET /api/customers

Après (API MOUDI réelle):
  GET /api/restaurants/{id}/categories
  GET /api/restaurants/{id}  (pour le menu via categoriesMenu)
  ❌ Clients non synchronisés (gérés globalement)
```

#### 2. Gestion d'authentification

- ✅ JWT Bearer Token automatique via localStorage.authToken
- ✅ Gestion des erreurs 401 (token expiré)
- ✅ Interception automatique des requêtes API

#### 3. Gestion du RestaurantId

- ✅ Méthodes `setRestaurantId()` et `getRestaurantId()`
- ✅ Fallback: Récupération depuis `localStorage.restaurantId`
- ✅ Validation obligatoire avant synchronisation

#### 4. Alignement des structures de données

- ✅ Conversion API MOUDI → Format SQLite local
- ✅ Support des différentes noms de champs (nom/name, prix/price, etc.)
- ✅ Gestion robuste des JSON (allergens, variations)

#### 5. Gestion d'erreurs granulaire

- ✅ Erreurs par catégorie (catégories, items, clients)
- ✅ Synchronisation partielle possible
- ✅ Messages d'erreur explicites et utiles

**Fichier modifié**:

- `src/services/sync.service.ts` (refonte complète)

**Fichier créé**:

- `API_INTEGRATION_GUIDE.md` (documentation complète)

## Architecture actuelle

```
┌─────────────────────────────────────────────────────┐
│         MOUDI Backend API Server                    │
│  (Base URL: http://localhost:5000)                  │
│                                                      │
│  GET /api/restaurants/{id}/categories               │
│  GET /api/restaurants/{id}  (menu via structure)    │
└─────────────────────────────────────────────────────┘
                        ↓ (JWT Bearer Token)
┌─────────────────────────────────────────────────────┐
│         @apppos React Application                   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  SyncSettings Component (UI)                 │   │
│  │  - Bouton de synchronisation                 │   │
│  │  - Options de synchronisation                │   │
│  │  - Affichage des résultats                   │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐   │
│  │  SyncService                                 │   │
│  │  - Orchestration de la synchronisation       │   │
│  │  - Gestion de RestaurantId                   │   │
│  │  - Conversion API → SQLite                   │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐   │
│  │  CategoryService / MenuService               │   │
│  │  - Opérations CRUD locales                   │   │
│  │  - Utilisation de SQLiteService              │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐   │
│  │  SQLiteService (Tauri)                       │   │
│  │  - Invocation de commandes Rust              │   │
│  │  - Gestion de la connexion SQLite            │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐   │
│  │  Rust/Tauri Backend                          │   │
│  │  - Persistence SQLite (appdata.db)           │   │
│  │  - Gestion des transactions                  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────────────────┐
        │   SQLite Database         │
        │   appdata.db              │
        │ ├─ categories             │
        │ ├─ menu_items             │
        │ ├─ customers              │
        │ └─ sync_status            │
        └───────────────────────────┘
```

## Endpoints API MOUDI utilisés

### 1. Catégories

```
GET /api/restaurants/{restaurantId}/categories
Content-Type: application/json
Authorization: Bearer {token}

Réponse:
{
  "success": true,
  "data": [
    {
      "id": "cat_1",
      "nom": "Pizzas",
      "description": "...",
      "ordreTri": 1,
      "actif": true,
      "dateCreation": "2025-02-18T10:00:00Z",
      "dateModification": "2025-02-18T10:00:00Z"
    }
  ]
}
```

### 2. Menu Items (via structure restaurant)

```
GET /api/restaurants/{restaurantId}
Content-Type: application/json
Authorization: Bearer {token}

Réponse:
{
  "success": true,
  "data": {
    "id": "rest_1",
    "nom": "Restaurant Name",
    "categoriesMenu": [
      {
        "id": "cat_1",
        "nom": "Pizzas",
        "plats": [
          {
            "id": "plat_1",
            "nom": "Margherita",
            "prix": 12.99,
            "tempsPreparation": 15,
            "allergenes": ["gluten"],
            "variations": [...]
          }
        ]
      }
    ]
  }
}
```

## Configuration requise

### 1. Variable d'environnement

```env
# .env.local (ou .env.production)
VITE_API_URL=http://localhost:5000
```

### 2. Token d'authentification

```typescript
// Après login avec un propriétaire
localStorage.setItem("authToken", "jwt_token_from_api");
```

### 3. Restaurant ID

```typescript
// Après login ou au démarrage
import syncService from "@/services/sync.service";
syncService.setRestaurantId("restaurant_id_from_api");

// Ou pour tous les appels API
localStorage.setItem("restaurantId", "restaurant_id_from_api");
```

## Utilisation dans l'application

### Exemple complet dans Settings

```typescript
// Dans SyncSettings.tsx
import syncService from '../services/sync.service';

export default function SyncSettings() {
  const handleSync = async () => {
    // Ensure restaurantId is set
    if (!syncService.getRestaurantId()) {
      alert('Veuillez configurer le Restaurant ID');
      return;
    }

    // Synchronize
    const result = await syncService.syncAll({
      categories: true,
      menuItems: true,
      customers: false,  // Non disponible
      overwrite: false   // Fusionner les données
    });

    if (result.success) {
      // Afficher le succès
      console.log('Synchronisation réussie!');
    } else {
      // Afficher les erreurs
      console.error('Erreurs:', result.details);
    }
  };

  return (
    <button onClick={handleSync}>
      Synchroniser depuis l'API MOUDI
    </button>
  );
}
```

## Points clés d'implémentation

### 1. Conversion des noms de champs

| Champ API MOUDI    | Champ SQLite       | Conversion                                  |
| ------------------ | ------------------ | ------------------------------------------- |
| `nom`              | `name`             | Automatique dans `convertCategoryFromAPI()` |
| `prix`             | `price`            | `parseFloat()`                              |
| `tempsPreparation` | `preparation_time` | Mappage direct                              |
| `allergenes`       | `allergens`        | `JSON.stringify()`                          |
| `variations`       | `variants`         | Transformation complexe                     |

### 2. Gestion des erreurs

```typescript
// Les erreurs sont collectées par catégorie
result.details.categories.errors; // Erreurs catégories
result.details.menuItems.errors; // Erreurs menu
result.details.customers.errors; // Clients non disponibles

// L'app peut continuer même avec des erreurs partielles
if (result.details.categories.errors.length === 0) {
  // Les catégories sont OK
}
```

### 3. Synchronisation automatique

```typescript
// Vérifier si sync est nécessaire (+ de 24h)
const { needs, reason } = await syncService.needsSync();
if (needs) {
  // Déclencher une synchronisation automatique
}
```

## Prochaines étapes recommandées

### 1. Authentification complète

- [ ] Intégrer le login propriétaire depuis l'API MOUDI
- [ ] Gérer le refresh token
- [ ] Ajouter une page de login dédiée

### 2. Synchronisation des clients

- [ ] Analyser comment récupérer les clients (globalement ou par restaurant)
- [ ] Implémenter si applicable

### 3. Synchronisation bidirectionnelle

- [ ] Implémenter l'envoi de catégories/items vers l'API
- [ ] Gérer les conflits (données locales vs API)
- [ ] Implémenter un système de versioning

### 4. Optimisations

- [ ] Pagination des résultats API
- [ ] Cache des données
- [ ] Synchronisation incrémentale (delta)
- [ ] Compression des transferts

### 5. Monitoring

- [ ] Logs de synchronisation
- [ ] Métriques de performance
- [ ] Alertes en cas d'erreur

## Vérification fonctionnelle

### Checklist de test

- [ ] Variables d'environnement correctement configurées
- [ ] Token d'authentification valide
- [ ] RestaurantId correctement configuré
- [ ] Cliquer sur "Synchroniser depuis l'API"
- [ ] Vérifier que les catégories sont importées
- [ ] Vérifier que les menu items sont importés
- [ ] Vérifier les timestamps de synchronisation
- [ ] Tester la gestion des erreurs
- [ ] Vérifier les données dans SyncSettings

## Fichiers clés modifiés/créés

```
@apppos/
├── src/
│   ├── services/
│   │   ├── category.service.ts          ✅ Modifié
│   │   ├── menu.service.ts              ✅ Modifié
│   │   ├── customer.service.ts          ✅ Modifié
│   │   └── sync.service.ts              ✅ Refonte complète
│   ├── components/
│   │   └── SyncSettings.tsx             (Pas de changement nécessaire)
│   └── pages/
│       └── Settings.tsx                 (Pas de changement nécessaire)
├── API_INTEGRATION_GUIDE.md             ✅ Créé (documentation)
└── .env.local                           ⚠️ À configurer
```

## Informations de contact

Pour toute question ou problème avec l'intégration API MOUDI:

1. Consulter `API_INTEGRATION_GUIDE.md`
2. Vérifier les logs de la console du navigateur
3. Vérifier l'onglet "Network" pour les appels API
4. Vérifier que le backend MOUDI est accessible

## Conclusion

L'application @apppos est maintenant complètement intégrée avec l'API MOUDI réelle pour la synchronisation des données. Les catégories et menus peuvent être importés depuis le backend central, tandis que les données sont stockées localement dans SQLite pour un fonctionnement hors ligne.

Les clients restent à synchroniser globalement (pas de synchronisation par restaurant dans l'API MOUDI actuelle).
