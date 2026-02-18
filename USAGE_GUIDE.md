# Guide d'utilisation - Synchronisation MOUDI API dans @apppos

## 🚀 Démarrage rapide

### 1. Configuration initiale

```bash
# 1. Vérifier que le backend MOUDI est en cours d'exécution
# URL: http://localhost:5000

# 2. Définir les variables d'environnement
# Fichier: @apppos/.env.local
VITE_API_URL=http://localhost:5000

# 3. S'assurer que vous êtes authentifié
# Lancer l'application et se connecter avec un compte propriétaire
```

### 2. Configurer le RestaurantId

```typescript
// Option A: Dans le code après login
import syncService from "@/services/sync.service";

// Récupérer restaurantId depuis la réponse de login
const { proprietaire } = await loginAPI(credentials);
syncService.setRestaurantId(proprietaire.restaurantId);

// Option B: Automatiquement depuis localStorage
localStorage.setItem("restaurantId", "rest_1");
```

### 3. Accéder à la page de synchronisation

```
Settings (page principale)
  ↓
Onglet "Synchronisation" (Sync Settings)
  ↓
Bouton "Synchroniser depuis l'API"
```

## 📊 Utilisation en détail

### Vue d'ensemble de Sync Settings

**Section 1: Statut de Synchronisation**

- Affiche le nombre de catégories, articles et clients locaux
- Affiche la date de la dernière synchronisation pour chaque

**Section 2: Options de Synchronisation**

```
✅ Synchroniser les catégories          (actif par défaut)
   Importer les catégories depuis l'API

✅ Synchroniser les articles           (actif par défaut)
   Importer les articles du menu depuis l'API

❌ Synchroniser les clients            (désactivé - non disponible)
   Les clients sont gérés globalement dans MOUDI

❌ Écraser les données locales         (désactivé par défaut)
   ⚠️ Activer seulement si vous êtes sûr!
```

**Section 3: Bouton de Synchronisation**

```
[🔄 Synchroniser depuis l'API]

Pendant la synchronisation:
- État: "Synchronisation en cours..."
- Bouton désactivé (grisé)

Après la synchronisation:
- Affiche un résumé (succès ou erreurs)
- Nombre d'éléments synchronisés par catégorie
- Liste des erreurs s'il y a eu des problèmes
```

## 🔄 Scénarios d'utilisation

### Scénario 1: Première synchronisation

```
1. Aller dans Settings > Synchronisation
2. Vérifier que:
   - ✅ "Synchroniser les catégories" est coché
   - ✅ "Synchroniser les articles" est coché
   - ❌ "Écraser les données locales" est décochéé
3. Cliquer sur [Synchroniser depuis l'API]
4. Attendre la fin de la synchronisation
5. Résultat:
   ✅ 12 catégories synchronisées
   ✅ 45 articles synchronisés
   ⚠️ 0 clients synchronisés (non disponible)
```

### Scénario 2: Mettre à jour uniquement les articles

```
1. Aller dans Settings > Synchronisation
2. Décocher "Synchroniser les catégories"
3. Cocher "Synchroniser les articles"
4. Cliquer sur [Synchroniser depuis l'API]
5. Résultat:
   ℹ️ 0 catégories synchronisées (pas de sync)
   ✅ 45 articles synchronisés
```

### Scénario 3: Remplacement complet (⚠️ Danger!)

```
⚠️ ATTENTION: Cela supprimera TOUTES les données locales!

1. Cocher "Écraser les données locales"
2. Cliquer sur [Synchroniser depuis l'API]
3. CONFIRMATION AFFICHÉE:
   "⚠️ Vous êtes sur le point de remplacer TOUTES les données locales.
    Êtes-vous sûr? Cette action ne peut pas être annulée."
4. Confirmer seulement si vous êtes certain
```

### Scénario 4: Erreur d'authentification

```
Symptôme: "Authentification échouée (401)"
Solution:
1. Votre token a expiré
2. Aller sur la page de login
3. Se reconnecter
4. Essayer la synchronisation à nouveau
```

### Scénario 5: RestaurantId non configuré

```
Symptôme: "Restaurant ID non configuré. Impossible de synchroniser."
Solution:
1. Vérifier que vous êtes connecté comme propriétaire
2. Vérifier que localStorage.restaurantId est défini
3. Contacter l'administrateur si problème persiste
```

## 📈 Statistiques et monitoring

### Affichage des statistiques

Après chaque synchronisation, affichage:

```
Statut: ✅ Synchronisation réussie

Détails:
  Catégories synchronisées:     12
  Articles synchronisés:        45
  Clients synchronisés:          0

Dernière synchronisation: 18/02/2025 à 15:42:30
```

### Vérifier le statut de synchronisation

```typescript
// Via le service
import syncService from "@/services/sync.service";

// Récupérer les statuts
const status = await syncService.getSyncStatus();
console.log(status);
// {
//   categories: "2025-02-18T14:30:00Z",
//   menu_items: "2025-02-18T14:30:00Z",
//   customers: null  (non synced)
// }
```

### Compter les données locales

```typescript
const count = await syncService.getLocalDataCount();
console.log(`${count.categories} catégories, ${count.menuItems} articles`);
```

## 🐛 Troubleshooting

### Problème: La synchronisation échoue

**Étape 1: Vérifier la connexion au backend**

```typescript
// Ouvrir la console du navigateur (F12)
// Aller dans l'onglet "Network"
// Cliquer sur "Synchroniser depuis l'API"
// Vérifier les requêtes HTTP:
//   GET /api/restaurants/{id}/categories
//   GET /api/restaurants/{id}

// Si erreur 0 ou timeout: backend non accessible
```

**Étape 2: Vérifier l'authentification**

```typescript
// Dans la console:
localStorage.getItem("authToken");
// Doit retourner un token JWT valide
// Format: "eyJhbGciOiJIUzI1NiI..."
```

**Étape 3: Vérifier le RestaurantId**

```typescript
// Dans la console:
localStorage.getItem("restaurantId");
// Doit retourner un ID valide: "rest_1", "rest_2", etc.
```

**Étape 4: Vérifier les logs du serveur**

```bash
# Dans le terminal du backend MOUDI
# Chercher les erreurs au moment de la synchronisation
# Ex: "Restaurant rest_1 not found"
```

### Problème: Les données ne sont pas à jour

**Solution**:

1. Vérifier la date de la dernière synchronisation
2. Cliquer manuellement sur "Synchroniser depuis l'API"
3. Attendre 24h pour une synchronisation automatique

### Problème: Les catégories importées ne s'affichent pas

**Étapes**:

1. Rafraîchir la page (F5)
2. Aller dans "Gestion des Catégories"
3. Vérifier que les catégories y sont (elles viennent de la BD)
4. Si toujours absent, cliquer à nouveau sur Synchroniser

### Problème: Modification locale écrasée après sync

**Cause**: Option "Écraser les données locales" activée

**Solution**:

1. Désactiver cette option
2. Utiliser le mode fusion (par défaut)
3. Les deux versions seront conservées

## 📱 Affichage sur mobile

```
┌─────────────────────────────────┐
│ ⚙️ General Settings             │
│ 🔄 Synchronisation              │
│ 🖨️  Printers                     │
│ 📱 Barcode Scanner               │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Statut de Synchronisation       │
├─────────────────────────────────┤
│ Catégories:      12             │
│ Dernière: 18/02  15:42          │
│                                  │
│ Articles:        45              │
│ Dernière: 18/02  15:42          │
│                                  │
│ Clients:          0              │
│ Dernière: Jamais                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Options de Synchronisation      │
├─────────────────────────────────┤
│ ✅ Synchroniser les catégories  │
│ Description: Importer depuis... │
│                                  │
│ ✅ Synchroniser les articles    │
│ Description: Importer depuis... │
│                                  │
│ ❌ Synchroniser les clients     │
│ Description: Importer depuis... │
│                                  │
│ ❌ Écraser les données locales  │
│ Description: Remplacer toutes..│
└─────────────────────────────────┘

     [🔄 Synchroniser depuis l'API]
```

## ⏰ Fréquence de synchronisation recommandée

### Automatique

- **Défaut**: Vérifier chaque 24 heures
- **Si modifié**: Après chaque modification du menu

### Manuel

```
Recommandé de synchroniser:
- Au démarrage de la journée
- Après chaque modification dans le backend MOUDI
- En cas de doute sur les données
```

## 🔐 Sécurité

### Tokens d'authentification

```
- Stockés dans: localStorage (navigateur)
- Expiration: 30 jours
- Protection: HTTPS en production
- Refresh: Automatique lors de la synchronisation
```

### RestaurantId

```
- Stocké dans: localStorage
- Visibilité: Utilisateur propriétaire uniquement
- Isolation: Chaque propriétaire voit son restaurant
```

### Données sensibles

```
- Ne jamais partager le token d'authentification
- Ne jamais exposer le token dans l'URL
- Utiliser HTTPS en production
```

## 📚 Documentation supplémentaire

- **API_INTEGRATION_GUIDE.md**: Documentation technique complète
- **IMPLEMENTATION_SUMMARY.md**: Résumé des modifications
- **Backend API**: http://localhost:5000/api/docs (si disponible)

## 🎯 Checklist finale

Avant de considérer la synchronisation comme fonctionnelle:

```
✅ Backend MOUDI en cours d'exécution
✅ VITE_API_URL correctement configurée
✅ Token d'authentification valide
✅ RestaurantId configuré
✅ Synchronisation réussie sans erreurs
✅ Catégories affichées dans "Gestion des Catégories"
✅ Articles affichés dans "Gestion des Articles"
✅ Dates de synchronisation affichées
✅ Options de synchronisation fonctionnent
✅ Bouton de synchronisation activable
```

## 💡 Tips & Tricks

### 1. Synchronisation rapide

```
Appuyer longtemps sur [Synchroniser depuis l'API]
(Non implémenté actuellement, mais peut être ajouté)
```

### 2. Auto-refresh de la page après sync

```typescript
// Ajouter dans le composant SyncSettings
if (result.success) {
  setTimeout(() => window.location.reload(), 2000);
}
```

### 3. Notifications desktop

```typescript
// Si une synchronisation prend du temps
if (result.success && convertedCategories.length > 100) {
  showNotification("Synchronisation importante en cours!");
}
```

## 🚨 Erreurs courantes

| Erreur                      | Cause                  | Solution              |
| --------------------------- | ---------------------- | --------------------- |
| 401 Unauthorized            | Token expiré           | Se reconnecter        |
| 404 Not Found               | RestaurantId invalide  | Vérifier l'ID         |
| Connection timeout          | Backend non accessible | Vérifier VITE_API_URL |
| CORS error                  | Configuration réseau   | Vérifier CORS backend |
| Restaurant ID non configuré | Pas de restaurantId    | Configurer via login  |

## 📞 Support

En cas de problème:

1. Consulter la documentation (API_INTEGRATION_GUIDE.md)
2. Vérifier la console du navigateur (F12)
3. Vérifier les logs du backend
4. Contacter l'équipe de développement
