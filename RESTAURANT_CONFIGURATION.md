# Configuration du Restaurant - Guide complet

## Vue d'ensemble

La configuration du restaurant dans @apppos se fait via le fichier `.env.local`. Cela permet de:

- Configurer facilement l'ID du restaurant sans modifier le code
- Stocker les informations du restaurant (nom, email, adresse)
- Activer/désactiver la synchronisation automatique

## Configuration minimale requise

Pour que la synchronisation fonctionne, vous DEVEZ configurer:

```env
VITE_API_URL=http://localhost:5000
VITE_RESTAURANT_ID=rest_1
```

## Tous les paramètres

### API Configuration

```env
# URL du backend MOUDI
VITE_API_URL=http://localhost:5000

# Nom de l'application (affiché dans le header)
VITE_APP_NAME=RestoPOS

# Activer l'analytique (optionnel)
VITE_ENABLE_ANALYTICS=false
```

### Restaurant Configuration (OBLIGATOIRE)

```env
# ID unique du restaurant dans MOUDI
# Obtenir cet ID depuis l'admin MOUDI
# Exemple: "rest_1", "rest_paris_01", etc.
VITE_RESTAURANT_ID=rest_1

# Nom du restaurant affiché dans l'interface
VITE_RESTAURANT_NAME=Gourmet Burgers Downtown
```

### Restaurant Information (OPTIONNEL)

```env
# Email du restaurant
VITE_RESTAURANT_EMAIL=manager@gourmetburgers.com

# Téléphone du restaurant
VITE_RESTAURANT_PHONE=+1 (212) 555-0199

# Adresse du restaurant
VITE_RESTAURANT_ADDRESS=123 Main Street, New York, NY 10001
```

### Synchronization Configuration

```env
# Synchroniser automatiquement au démarrage
VITE_AUTO_SYNC_ON_STARTUP=true

# Fréquence de synchronisation en heures
# 0 = désactivé
# 24 = chaque 24h
VITE_AUTO_SYNC_INTERVAL=24
```

## Comment obtenir le RESTAURANT_ID

### 1. Via le backend MOUDI

```bash
# Lancer une requête GET pour obtenir les restaurants
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/restaurants

# Réponse:
# {
#   "success": true,
#   "data": [
#     {
#       "id": "rest_1",
#       "nom": "Gourmet Burgers Downtown",
#       ...
#     }
#   ]
# }

# Utiliser l'ID du restaurant obtenu dans .env
```

### 2. Via l'admin MOUDI

1. Aller sur http://localhost:5000/admin
2. Authentifier avec le compte admin
3. Aller dans "Restaurants"
4. Copier l'ID du restaurant dans `.env.local`

### 3. Via la structure du backend

Si le backend utilise une structure prévisible:

- IDs de test: `rest_1`, `rest_2`, `rest_3`, etc.
- IDs de production: format UUID ou slug

## Fallback et priorités

### Pour le RestaurantId

```
1. Défini directement via syncService.setRestaurantId()
2. Stocké dans localStorage (restaurantId)
3. Variable d'environnement VITE_RESTAURANT_ID
4. Non configuré → Erreur de synchronisation
```

### Pour le Restaurant Name

```
1. Défini directement via syncService.setRestaurantName()
2. Stocké dans localStorage (restaurantName)
3. Variable d'environnement VITE_RESTAURANT_NAME
4. Non spécifié → Pas d'affichage du nom
```

## Mise à jour dynamique

Vous pouvez changer le restaurant ID à l'exécution:

```typescript
import syncService from "@/services/sync.service";

// Changer le restaurant ID
syncService.setRestaurantId("rest_2");
syncService.setRestaurantName("Another Restaurant");

// Ensuite synchroniser avec le nouveau restaurant
const result = await syncService.syncAll();
```

## Exemples de configuration

### Exemple 1: Petit restaurant

```env
VITE_API_URL=http://localhost:5000
VITE_RESTAURANT_ID=rest_paris_01
VITE_RESTAURANT_NAME=Bistro Le Petit
VITE_RESTAURANT_EMAIL=contact@bistro.fr
VITE_RESTAURANT_PHONE=+33 1 23 45 67 89
VITE_AUTO_SYNC_ON_STARTUP=true
VITE_AUTO_SYNC_INTERVAL=24
```

### Exemple 2: Chaîne de restaurants

```env
VITE_API_URL=https://api.moudi.com
# Changer l'ID selon le restaurant
VITE_RESTAURANT_ID=rest_chain_paris_1
VITE_RESTAURANT_NAME=Chaîne Restaurant - Paris
VITE_AUTO_SYNC_ON_STARTUP=true
VITE_AUTO_SYNC_INTERVAL=6
```

### Exemple 3: Développement

```env
VITE_API_URL=http://localhost:5000
VITE_RESTAURANT_ID=rest_dev
VITE_RESTAURANT_NAME=Dev Restaurant
VITE_AUTO_SYNC_ON_STARTUP=false
VITE_AUTO_SYNC_INTERVAL=0
```

## Vérifier la configuration

### Via la console du navigateur

```typescript
import syncService from "@/services/sync.service";

// Afficher le restaurant ID
console.log("Restaurant ID:", syncService.getRestaurantId());

// Afficher le nom
console.log("Restaurant Name:", syncService.getRestaurantName());

// Afficher les variables d'environnement
console.log("API URL:", import.meta.env.VITE_API_URL);
console.log("Restaurant ID (env):", import.meta.env.VITE_RESTAURANT_ID);
```

### Via le composant Settings

La page Settings affiche:

- Le statut de synchronisation
- Les informations du restaurant (si configurées)
- Le nombre d'éléments synchronisés

## Troubleshooting

### "Restaurant ID non configuré"

**Cause**: `VITE_RESTAURANT_ID` n'est pas défini

**Solution**:

1. Ajouter `VITE_RESTAURANT_ID=rest_1` dans `.env.local`
2. Redémarrer l'application
3. Vérifier dans la console du navigateur

### "Restaurant not found (404)"

**Cause**: L'ID du restaurant n'existe pas dans MOUDI

**Solution**:

1. Vérifier l'ID auprès de l'admin MOUDI
2. Utiliser le bon ID dans `.env.local`

### "Authentification échouée (401)"

**Cause**: Le token est expiré ou l'authentification a échoué

**Solution**:

1. Se reconnecter dans l'application
2. Vérifier que le token est valide
3. Essayer la synchronisation à nouveau

## Sécurité

### Points importants

- ✅ Ne jamais committer `.env.local` (ajouter à .gitignore)
- ✅ Le token JWT ne doit jamais être dans `.env`
- ✅ Les IDs de restaurant peuvent être publics
- ❌ Ne pas stocker d'informations sensibles en variables d'environnement

### Bonnes pratiques

```bash
# .gitignore
.env.local
.env.production.local

# Utiliser une copie de .env.example
cp .env.example .env.local
```

## Automatisation

### Script de configuration (optionnel)

```bash
#!/bin/bash
# setup-restaurant.sh

echo "Configuration du restaurant @apppos"
echo "=================================="
echo

read -p "ID du restaurant (ex: rest_1): " RESTAURANT_ID
read -p "Nom du restaurant: " RESTAURANT_NAME
read -p "Email: " RESTAURANT_EMAIL
echo

# Créer/mettre à jour .env.local
cat > .env.local << EOF
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=RestoPOS
VITE_RESTAURANT_ID=$RESTAURANT_ID
VITE_RESTAURANT_NAME=$RESTAURANT_NAME
VITE_RESTAURANT_EMAIL=$RESTAURANT_EMAIL
VITE_AUTO_SYNC_ON_STARTUP=true
VITE_AUTO_SYNC_INTERVAL=24
EOF

echo "✅ Configuration complète!"
echo "Restaurant: $RESTAURANT_NAME ($RESTAURANT_ID)"
```

## Variables d'environnement disponibles

| Variable                  | Type    | Obligatoire | Par défaut            | Description             |
| ------------------------- | ------- | ----------- | --------------------- | ----------------------- |
| VITE_API_URL              | String  | Oui         | http://localhost:5000 | URL du backend          |
| VITE_RESTAURANT_ID        | String  | **Oui**     | -                     | ID unique du restaurant |
| VITE_RESTAURANT_NAME      | String  | Non         | -                     | Nom du restaurant       |
| VITE_RESTAURANT_EMAIL     | String  | Non         | -                     | Email du restaurant     |
| VITE_RESTAURANT_PHONE     | String  | Non         | -                     | Téléphone du restaurant |
| VITE_RESTAURANT_ADDRESS   | String  | Non         | -                     | Adresse du restaurant   |
| VITE_AUTO_SYNC_ON_STARTUP | Boolean | Non         | true                  | Sync au démarrage       |
| VITE_AUTO_SYNC_INTERVAL   | Number  | Non         | 24                    | Frequency (heures)      |
| VITE_APP_NAME             | String  | Non         | RestoPOS              | Nom de l'app            |
| VITE_ENABLE_ANALYTICS     | Boolean | Non         | false                 | Analytique              |

## Support

Pour toute question:

1. Consulter `.env.example` pour les exemples
2. Vérifier les logs de la console (F12)
3. Tester avec les paramètres de test
4. Contacter l'équipe de développement
