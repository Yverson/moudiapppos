# AppPOS - Project

## Stack Technique
- **Frontend** : React 18 + TypeScript + Vite
- **Desktop** : Tauri 1.x (Rust + SQLite via sqlx)
- **Web** : Navigateur (IndexedDB via `idb`)
- **Styling** : TailwindCSS
- **State** : React Context API

## Architecture DB

### Détection de plateforme
`src/services/platform.ts` — détecte `window.__TAURI__` pour savoir si on est en desktop ou web.

### Couche d'abstraction
- **Desktop (Tauri)** → `invoke()` → backend Rust → SQLite
- **Web (navigateur)** → `web_*()` → `idb` → IndexedDB

### Fichiers clés
| Fichier | Rôle |
|---|---|
| `src/services/platform.ts` | `isDesktop()` + `invokeOrFallback()` |
| `src/services/db-web.ts` | Implémentation IndexedDB complète |
| `src/services/sqlite.service.ts` | Catégories, menus, clients, sync |
| `src/services/offline-order.service.ts` | Commandes offline + sync queue |
| `src/services/livreur.service.ts` | CRUD livreurs |
| `src/components/PaymentModal.tsx` | Paiement |
| `src-tauri/src/database.rs` | Backend Rust SQLite |
| `src-tauri/src/main.rs` | Point d'entrée Tauri |

## Dépendances
- `idb ^8.0.0` — IndexedDB Promise API (web)
- `@tauri-apps/api ^1.6.0` — Tauri bridge (desktop)

## Variables d'environnement
Voir `.env.example` pour la liste complète.

---

## Historique des Sessions

### Session #1 — 2026-02-21 23:44 UTC
**Titre** : Adaptateur DB Web/Desktop  
**Objectif** : Utiliser IndexedDB en mode web et SQLite en mode desktop (Tauri)

**Fichiers créés** :
- `src/services/platform.ts` — détection plateforme + helper `invokeOrFallback`
- `src/services/db-web.ts` — implémentation IndexedDB complète (catégories, menus, clients, livreurs, commandes, paiements, sessions caisse, sync queue)

**Fichiers modifiés** :
- `package.json` — ajout dépendance `idb ^8.0.0`
- `src/services/sqlite.service.ts` — remplacement `invoke()` par `invokeOrFallback()`
- `src/services/offline-order.service.ts` — remplacement `invoke()` par `invokeOrFallback()`
- `src/services/livreur.service.ts` — remplacement `invoke()` par `invokeOrFallback()`
- `src/components/PaymentModal.tsx` — remplacement `invoke()` par `invokeOrFallback()`

**Action requise** : Lancer `npm install idb` dans le dossier `apppos`

**Statut** : ✅ Complété (en attente de `npm install idb`)

---

### Session #2 — 2026-02-22 00:17 UTC
**Titre** : Sync Bidirectionnel Offline/Online  
**Objectif** : Synchronisation bidirectionnelle avec l'API cloud pour catégories, menu, clients, livreurs. Gestion offline avec file d'attente persistante. Badge LOCAL pour commandes desktop non synchronisées.

**Fichiers créés** :
- `src/services/bidirectional-sync.service.ts` — Service central : détection connectivité, push mutations vers API, enqueue si offline, flush automatique au retour d'internet
- `src/hooks/useOnlineStatus.ts` — Hook React pour état connectivité + compteur de mutations en attente
- `src/components/OnlineStatusBanner.tsx` — Composant bandeau discret online/offline réutilisable

**Fichiers modifiés** :
- `src/services/db-web.ts` — Export de `getDb` pour usage externe
- `src/services/category.service.ts` — Push mutation bidirectionnelle après create/update/delete + correction type `Partial<Category>`
- `src/services/menu.service.ts` — Push mutation bidirectionnelle après create/update/delete
- `src/services/customer.service.ts` — Push mutation bidirectionnelle après create/update/delete
- `src/services/livreur.service.ts` — Push mutation bidirectionnelle après create/update/delete
- `src/pages/CategoryManagement.tsx` — Ajout `OnlineStatusBanner`
- `src/pages/MenuManagement.tsx` — Ajout `OnlineStatusBanner`
- `src/pages/CustomerManagement.tsx` — Ajout `OnlineStatusBanner`
- `src/pages/LivreurManagement.tsx` — Ajout `OnlineStatusBanner`
- `src/App.tsx` — Initialisation restaurant ID dans bidirectionalSync + flush queue au démarrage si online
- `src/pages/POSTerminal.tsx` — Badge `LOCAL` (jaune) sur commandes avec `sync_status: 'pending'` ou `'error'`

**Architecture sync** :
- CRUD local → `bidirectionalSync.pushMutation()` → si online : push API immédiat, si offline : `sync_queue` IndexedDB/SQLite
- Retour internet → `window.online` event → `flushQueue()` automatique
- Commandes : sens unique desktop → cloud (badge LOCAL visible jusqu'à sync)

**Statut** : ✅ Complété

---

### Session #3 — 2026-02-22 00:28 UTC
**Titre** : Création des endpoints API backend pour la sync bidirectionnelle  
**Objectif** : Créer les endpoints manquants dans le backend ASP.NET Core pour recevoir les mutations de l'AppPOS (405 Method Not Allowed sur POST /livreurs).

**Fichiers créés (backend)** :
- `MoudiApi/Controllers/RestaurantSyncController.cs` — Nouveaux endpoints de mutation sous `/api/restaurants/{restaurantId}/` :
  - `POST /livreurs` — créer livreur
  - `PUT /livreurs/{id}` — modifier livreur
  - `DELETE /livreurs/{id}` — désactiver livreur (soft delete)
  - `POST /plats` — créer plat
  - `PUT /plats/{id}` — modifier plat
  - `DELETE /plats/{id}` — désactiver plat
  - `PUT /categories/{id}` — modifier catégorie
  - `DELETE /categories/{id}` — désactiver catégorie
  - `POST /clients` — créer client
  - `PUT /clients/{id}` — modifier client
  - `DELETE /clients/{id}` — désactiver client

**Fichiers modifiés (apppos)** :
- `src/services/bidirectional-sync.service.ts` — Normalisation des payloads (champs anglais → français) pour correspondre aux DTOs backend

**Notes architecture** :
- `POST /categories` reste dans `MenusController` (pas de conflit de routes)
- Les livreurs sont des comptes indépendants (pas de FK RestaurantId) — association via table `Livraisons`
- Soft delete utilisé partout (Statut=inactif, EstActive=false, EstActif=false)
- `BCrypt.Net-Next` déjà présent dans le projet pour le hashage des mots de passe temporaires

**Statut** : ✅ Complété

---

### Session #4 — 2026-02-24 20:55 UTC
**Titre** : Implémentation page Finance avec DB et synchronisation  
**Objectif** : Implémenter la page `/finance` avec données réelles de la base de données (sessions de caisse, paiements, mouvements) et synchronisation bidirectionnelle.

**Fichiers créés** :
- `src/services/finance.service.ts` — Service de gestion financière (sessions de caisse, mouvements de caisse, résumé financier)
  - `getOpenCashSession()` — récupérer session de caisse ouverte
  - `openCashSession()` — ouvrir nouvelle session
  - `closeCashSession()` — fermer session
  - `addCashMovement()` — ajouter mouvement de caisse (entrée/sortie) avec sync bidirectionnelle
  - `getCashMovements()` — récupérer mouvements d'une session
  - `getCashDrawerSummary()` — résumé complet (soldes, transactions, totaux)

**Fichiers modifiés** :
- `src/services/db-web.ts` — Ajout interface `CashMovement` + store IndexedDB `cash_movements` + fonctions web :
  - `web_add_cash_movement()`
  - `web_get_cash_movements()`
  - `web_get_cash_session_by_id()`
  - `web_get_session_payments()`
- `src-tauri/src/database.rs` — Ajout struct `CashMovement` + méthodes DB :
  - `add_cash_movement()`
  - `get_cash_movements()`
  - `get_cash_session_by_id()`
  - `get_session_payments()`
- `src-tauri/src/main.rs` — Enregistrement commandes Tauri pour cash_movements
- `src/pages/Finance.tsx` — Refonte complète pour utiliser données réelles :
  - Intégration `finance.service.ts`
  - Affichage session de caisse active
  - Liste transactions (paiements + mouvements)
  - Modal ajout transaction manuelle (entrée/sortie)
  - Export CSV
  - Bandeau statut online/offline
- `src/services/bidirectional-sync.service.ts` — Ajout support `cash_movement` :
  - Type `EntityType` étendu avec `'cash_movement'`
  - Méthode `executeCashMovementMutation()` pour sync vers API

**Architecture finance** :
- **Session de caisse** : ouverture/fermeture avec solde initial/final
- **Paiements** : liés aux commandes + session de caisse
- **Mouvements** : entrées/sorties manuelles (fournitures, maintenance, etc.)
- **Transactions** : agrégation paiements + mouvements pour affichage unifié
- **Synchronisation** : mouvements de caisse synchronisés vers API cloud (online) ou en queue (offline)

**Endpoints API attendus (backend)** :
- `POST /api/restaurants/{restaurantId}/cash-movements` — créer mouvement
- `PUT /api/restaurants/{restaurantId}/cash-movements/{id}` — modifier mouvement
- `DELETE /api/restaurants/{restaurantId}/cash-movements/{id}` — supprimer mouvement

**Statut** : ✅ Complété

---

### Session #5 — 2026-02-24 20:56 UTC
**Titre** : Gestion des utilisateurs locaux (Staff) avec permissions et synchronisation  
**Objectif** : Implémenter la page `/roles` avec création d'utilisateurs staff, gestion des rôles et permissions granulaires, synchronisation bidirectionnelle avec le backend.

**Fichiers créés (apppos)** :
- `src/services/staff.service.ts` — Service CRUD pour les utilisateurs staff :
  - `getAllStaff()` — récupérer tous les membres du staff
  - `getStaffById()` — récupérer un membre par ID
  - `createStaff()` — créer nouveau membre avec permissions par défaut selon rôle
  - `updateStaff()` — mettre à jour membre (rôle, permissions, infos)
  - `deleteStaff()` — désactiver membre (soft delete)
  - `updateOnlineStatus()` — mettre à jour statut en ligne
  - Permissions granulaires : processRefunds, applyDiscounts, voidOrders, manageStockLevels, createPurchaseOrders, transferStock, viewSalesReports, viewStaffLogs, manageUsers, editMenuItems
  - Rôles : ADMIN, MANAGER, CASHIER, WAITER, KITCHEN avec permissions par défaut
- `src-tauri/migrations/20260224000000_add_staff.sql` — Migration SQLite pour table staff (Tauri)

**Fichiers modifiés (apppos)** :
- `src/services/db-web.ts` — Ajout support staff :
  - Interface `StaffMember` (id, restaurant_id, first_name, last_name, email, username, role, permissions, is_active, is_online, last_login)
  - Store IndexedDB `staff` avec index (restaurant_id, is_active, role, username)
  - Fonctions : `web_get_all_staff()`, `web_get_staff_by_id()`, `web_create_staff()`, `web_update_staff()`, `web_delete_staff()`
- `src/services/bidirectional-sync.service.ts` — Support synchronisation staff :
  - Type `EntityType` étendu avec `'staff'`
  - Méthode `executeStaffMutation()` pour sync vers API
- `src/pages/Roles.tsx` — Refonte complète de la page :
  - Liste des utilisateurs staff avec statut online/offline
  - Modal de création d'utilisateur (prénom, nom, email, username, rôle)
  - Sélection de rôle avec mise à jour automatique des permissions
  - Gestion granulaire des permissions par catégorie (POS Operations, Inventory Control, Reports & Analytics, System Settings)
  - Désactivation d'utilisateur
  - Bandeau statut online/offline
  - Intégration complète avec `staff.service.ts`

**Fichiers créés (backend)** :
- `backend/MoudiApi/Models/Staff.cs` — Modèle Staff (Id, RestaurantId, Prenom, Nom, Email, Username, Role, Permissions, EstActif)
- `backend/MoudiApi/DTOs/Staff/StaffDto.cs` — DTOs (CreateStaffDto, UpdateStaffDto, StaffResponseDto)
- `backend/DATABASE/Migration_Staff.sql` — Script SQL Server pour table Staff avec FK vers Restaurants

**Fichiers modifiés (backend)** :
- `backend/MoudiApi/Data/MoudiDbContext.cs` — Ajout `DbSet<Staff> Staff`
- `backend/MoudiApi/Controllers/RestaurantSyncController.cs` — Nouveaux endpoints :
  - `POST /api/restaurants/{restaurantId}/staff` — créer membre staff
  - `PUT /api/restaurants/{restaurantId}/staff/{id}` — modifier membre staff
  - `DELETE /api/restaurants/{restaurantId}/staff/{id}` — désactiver membre staff (soft delete)
  - `GET /api/restaurants/{restaurantId}/staff` — récupérer tous les membres staff
  - Validation username unique
  - DTOs : `CreateStaffSyncDto`, `UpdateStaffSyncDto`

**Architecture staff** :
- **Rôles prédéfinis** : ADMIN (tous droits), MANAGER (gestion complète sauf utilisateurs), CASHIER (opérations POS), WAITER (service), KITCHEN (cuisine)
- **Permissions JSON** : stockées en JSON dans la DB, parsées côté client pour affichage/modification
- **Synchronisation** : création/modification/suppression synchronisées vers API cloud (online) ou en queue (offline)
- **Soft delete** : désactivation via `EstActif=false` / `is_active=false`
- **Username unique** : validation côté backend pour éviter les doublons

**Tables de base de données** :
- **IndexedDB (web)** : `staff` avec index sur restaurant_id, is_active, role, username
- **SQLite (Tauri)** : `staff` avec index identiques
- **SQL Server (backend)** : `Staff` avec FK vers `Restaurants`, index sur RestaurantId, Username (unique), EstActif, Role

**Statut** : ✅ Complété

---

### Session #6 — 2026-02-25 03:24 UTC
**Titre** : Finalisation de la fenêtre de paiement avec création de commande payée en attente de livraison  
**Objectif** : Implémenter le flux complet de paiement (cash, carte, mobile money, split) pour créer une commande avec statut 'pending_delivery' après paiement réussi.

**Fichiers modifiés** :
- `src/services/db-web.ts` — Modification de `web_complete_order_payment()` :
  - Changement du statut de commande de `'pending_local'` vers `'pending_delivery'` après paiement
  - Gestion correcte du `payment_method` pour les paiements split ('split') ou simple (méthode unique)
  - Conservation du `payment_status` à `'paid'`
- `src-tauri/src/database.rs` — Modification de `complete_order_payment()` :
  - Mise à jour SQL pour changer `status = 'pending_delivery'` en plus de `payment_status = 'paid'`
  - Synchronisation avec la logique web pour cohérence desktop/web
- `src/pages/POSTerminal.tsx` — Amélioration de l'affichage des commandes :
  - Ajout hook `useOrders('pending_delivery')` pour récupérer les commandes payées
  - Nouvelle section visuelle "✓ Payées" avec badge vert "PAYÉ" pour les commandes `pending_delivery`
  - Séparation claire entre commandes en attente de paiement et commandes payées en attente de livraison
  - Fonction `refreshAllOrders()` pour rafraîchir les deux listes simultanément
  - Callback `onPaymentSuccess` amélioré pour réinitialiser le formulaire et rafraîchir les listes

**Flux de paiement implémenté** :
1. **Création de commande** : Statut initial `'pending_local'`, `payment_status: 'pending'`
2. **Ouverture PaymentModal** : Sélection méthode (Cash/Card/Mobile/Split)
3. **Paiement réussi** : 
   - Création des enregistrements `Payment` dans la table `payments`
   - Mise à jour commande : `status: 'pending_delivery'`, `payment_status: 'paid'`
   - Fermeture modal et réinitialisation du formulaire
4. **Affichage** : Commande apparaît dans la section "✓ Payées" avec badge vert

**Méthodes de paiement supportées** :
- **Cash** : Calcul automatique de la monnaie rendue (tendered - total)
- **Credit Card** : Montant exact (Visa, Mastercard, Amex via Stripe)
- **Mobile Money** : Montant exact (Orange Money, MTN, Airtel)
- **Split Payment** : Combinaison de plusieurs méthodes, total doit couvrir le montant dû

**Statuts de commande** :
- `'pending_local'` : Commande créée, en attente de paiement
- `'pending_delivery'` : Commande payée, en attente de livraison/service
- `'delivered'` : Commande livrée/servie (à implémenter)

**Interface utilisateur** :
- Badge **LOCAL** (jaune) : Commande non synchronisée avec le cloud
- Badge **PAYÉ** (vert) : Commande payée en attente de livraison
- Séparation visuelle claire avec bordure verte pour les commandes payées

**Statut** : ✅ Complété

---

### Session #7 — 2026-02-25 03:54 UTC
**Titre** : Système de gestion des commandes avec Kanban et Historique + Harmonisation des endpoints backend  
**Objectif** : Créer deux pages complètes (Kanban pour commandes actives et Historique pour commandes terminées) avec distinction local/online et harmonisation des endpoints avec AppClient/AppLivreur.

**Fichiers créés** :
- `src/services/orders.service.ts` — Service unifié pour gestion commandes local + online
- `src/hooks/useOrders.ts` — Hook React avec auto-refresh (30s) et hooks spécialisés
- `src/components/orders/OrderCard.tsx` — Carte de commande avec badges (LOCAL/ONLINE/FAILED)
- `src/components/orders/SortableOrderCard.tsx` — Wrapper pour drag & drop
- `src/components/orders/KanbanColumn.tsx` — Colonne du Kanban avec drop zone
- `src/components/orders/OrderDetailsModal.tsx` — Modal détaillé avec actions
- `src/components/orders/OrdersTable.tsx` — Tableau des commandes pour historique
- `src/components/orders/OrdersStats.tsx` — 4 cartes de statistiques
- `src/components/orders/OrdersFilters.tsx` — Filtres avancés (date, type, statut)
- `src/pages/OrdersKanban.tsx` — Page Kanban avec 5 colonnes
- `src/pages/OrdersHistory.tsx` — Page Historique avec stats et export CSV

**Fichiers modifiés** :
- `src/App.tsx` — Ajout routes `/orders` et `/orders/history`
- `src/layouts/MainLayout.tsx` — Ajout liens navigation "Commandes" et "Historique"
- `src/services/db-web.ts` — Ajout champ `livreur_id` à l'interface Order
- `src/services/orders.service.ts` — Harmonisation avec endpoints backend existants
- `backend/MoudiApi/Controllers/ProprietaireController.cs` — Ajout endpoint `PATCH /api/proprietaire/orders/{id}/livreur`

**Harmonisation des endpoints backend** :
- Mapping des statuts AppPOS ↔ Backend (pending_local ↔ pending, pending_delivery ↔ confirmed, etc.)
- Utilisation de `PATCH /api/proprietaire/orders/{id}/status` au lieu de PUT avec restaurantId
- Utilisation de `PATCH /api/proprietaire/orders/{id}/livreur` pour assignation livreur
- Cohérence avec AppClient et AppLivreur pour gestion unifiée des commandes

**Fonctionnalités Kanban** :
- Drag & drop entre colonnes pour changer le statut
- Filtres (all/local/online) + recherche textuelle
- Auto-refresh 30s pour commandes online
- Badges visuels : LOCAL (jaune), ONLINE (bleu), FAILED (rouge)
- Assignation de livreur depuis le modal détails

**Fonctionnalités Historique** :
- Filtres avancés (période, type, statut, recherche)
- Statistiques (total, CA, panier moyen, répartition local/online)
- Pagination 20 par page
- Export CSV

**Règles de synchronisation** :
- **Commandes ONLINE** : Modifications directes vers API, marque FAILED si pas d'internet
- **Commandes LOCAL** : Sync PUSH uniquement, pas de pull depuis API, queue de sync

**Dépendances installées** :
- `@dnd-kit/core` + `@dnd-kit/sortable`, `date-fns`, `recharts`

**Statut** : ✅ Complété

---

### Session #8 — 2026-02-25 06:21 UTC
**Titre** : Réorganisation de la navigation - Déplacement des liens vers le sidebar Paramètres  
**Objectif** : Déplacer les liens Catégories, Menu, Clients, Livreurs et Paiements du menu principal vers le sidebar des Paramètres pour libérer de l'espace dans le menu en haut.

**Fichiers modifiés** :
- `src/layouts/MainLayout.tsx` — Retrait des liens Catégories, Menu, Clients, Livreurs et Paiements du menu principal
  - Menu principal allégé : conserve uniquement Caisse, Commandes, Historique, Finance, Paramètres, Stats et Roles
- `src/pages/Settings.tsx` — Ajout des 5 liens dans le sidebar avec navigation fonctionnelle
  - Import de `NavLink` depuis react-router-dom
  - Ajout d'un séparateur visuel avant les nouveaux liens
  - Liens avec icônes Material Symbols : category, restaurant_menu, group, delivery_dining, payments
  - Gestion de l'état actif avec highlight visuel

**Architecture de navigation** :
- **Menu principal (header)** : Pages principales (Caisse, Commandes, Historique, Finance, Stats, Roles, Paramètres)
- **Sidebar Paramètres** : Configuration et gestion des données (General, Sync, Printers, Scanner + Catégories, Menu, Clients, Livreurs, Paiements)

**Bénéfices** :
- Menu principal moins encombré et plus lisible
- Regroupement logique des pages de gestion dans Paramètres
- Navigation cohérente avec le design existant

**Statut** : ✅ Complété

---

### Session #8 (suite) — 2026-02-25 06:23 UTC
**Titre** : Ajout du sidebar Paramètres sur toutes les pages de gestion  
**Objectif** : Rendre le sidebar des Paramètres visible sur les pages Catégories, Menu, Clients, Livreurs et Paiements pour une navigation cohérente.

**Fichiers créés** :
- `src/layouts/SettingsLayout.tsx` — Composant layout réutilisable avec sidebar de navigation
  - Props : title, description, showSaveButton, onSave, children
  - Sidebar avec navigation vers toutes les pages de gestion
  - Header avec titre et description dynamiques
  - Zone de contenu scrollable

**Fichiers modifiés** :
- `src/pages/Settings.tsx` — Refactorisation pour utiliser SettingsLayout
  - Suppression du code dupliqué du sidebar
  - Utilisation du composant SettingsLayout
- `src/pages/CategoryManagement.tsx` — Ajout du SettingsLayout
  - Wrapper avec titre "Catégories" et description
  - Retrait du titre h1 redondant
- `src/pages/MenuManagement.tsx` — Ajout du SettingsLayout
  - Wrapper avec titre "Menu" et description
  - Retrait du titre h1 redondant
- `src/pages/CustomerManagement.tsx` — Ajout du SettingsLayout
  - Wrapper avec titre "Clients" et description
  - Retrait du titre h1 redondant
- `src/pages/LivreurManagement.tsx` — Ajout du SettingsLayout
  - Wrapper avec titre "Livreurs" et description
  - Retrait du titre h1 redondant
- `src/pages/PaymentMethods.tsx` — Ajout du SettingsLayout
  - Wrapper avec titre "Moyens de paiement" et description
  - Retrait du titre h1 redondant

**Architecture du SettingsLayout** :
- **Sidebar gauche (w-64)** : Navigation fixe avec tous les liens de gestion
  - Section General : Settings, Sync, Printers, Scanner
  - Séparateur visuel
  - Section Gestion : Catégories, Menu, Clients, Livreurs, Paiements
  - Highlight automatique de la page active avec NavLink
- **Zone principale** : Header + contenu scrollable
  - Header avec titre et description dynamiques
  - Bouton Save optionnel (utilisé sur Settings)
  - Zone de contenu avec padding et scroll

**Bénéfices** :
- Navigation cohérente sur toutes les pages de gestion
- Sidebar toujours visible pour accès rapide
- Réduction de la duplication de code
- UX améliorée avec navigation contextuelle
- Design unifié sur toutes les pages de paramètres

**Statut** : ✅ Complété

---

### Session #9 — 2026-02-25 18:04 UTC
**Titre** : Finalisation de la page Stats avec données locales et online  
**Objectif** : Implémenter la page Stats avec calcul des statistiques locales (IndexedDB/SQLite) et récupération des stats online depuis l'API, avec mode de visualisation combiné/local/online.

**Fichiers créés** :
- `src/services/stats.service.ts` — Service de statistiques complet
  - `getLocalStats()` — Calcul des stats locales (commandes, paiements, produits)
  - `getOnlineStats()` — Récupération des stats depuis l'API
  - `getCombinedStats()` — Fusion des stats locales + online
  - Calcul des top produits, ventes par heure, méthodes de paiement
  - Support des périodes : day, week, month

**Fichiers modifiés (apppos)** :
- `src/pages/Stats.tsx` — Refonte complète avec données réelles
  - Intégration `stats.service.ts`
  - Sélecteur de période (jour/semaine/mois)
  - Mode de visualisation : Combiné / Local / Online
  - Cartes de statistiques : Revenus totaux, Commandes totales, Panier moyen
  - Performance des ventes par période
  - Top 5 produits avec revenus et quantités vendues
  - Distribution des ventes par heure (graphique)
  - Répartition des méthodes de paiement
  - Export CSV des statistiques
  - Bandeau statut online/offline
  - Format monétaire : XOF (Franc CFA)
- `src/App.tsx` — Initialisation du `statsService` avec `restaurantId`

**Fichiers modifiés (backend)** :
- `backend/MoudiApi/Controllers/RestaurantSyncController.cs` — Ajout endpoint statistiques
  - `GET /api/restaurants/{restaurantId}/stats` avec paramètre `period`
  - Calcul des statistiques globales (revenus, commandes, panier moyen)
  - Ventes par période (today, week, month)
  - Top 5 produits par revenus
  - Distribution des ventes par heure
  - Répartition des méthodes de paiement
  - Filtrage par sessions de caisse ouvertes
  - Inclusion des commandes payées uniquement

**Architecture des statistiques** :
- **Local** : Calcul depuis IndexedDB (web) ou SQLite (Tauri)
  - Commandes locales avec `payment_status: 'paid'`
  - Analyse des items pour top produits
  - Groupement par heure pour distribution
  - Statistiques des paiements par méthode
- **Online** : Récupération depuis API backend
  - Endpoint `/api/restaurants/{restaurantId}/stats`
  - Authentification JWT requise
  - Données synchronisées du cloud
- **Combiné** : Fusion intelligente local + online
  - Agrégation des revenus et commandes
  - Fusion des top produits (tri par revenus)
  - Combinaison des ventes par heure
  - Répartition globale des paiements

**Fonctionnalités de la page Stats** :
- **Vue d'ensemble** : 3 cartes principales avec indicateurs de changement
- **Performance des ventes** : Breakdown par Today/Week/Month
- **Top produits** : 5 meilleurs produits avec quantités et revenus
- **Ventes par heure** : Graphique en barres avec tooltip
- **Méthodes de paiement** : Répartition en pourcentage
- **Export CSV** : Export des données de ventes
- **Mode de visualisation** : Boutons pour basculer entre Combiné/Local/Online
- **Sélecteur de période** : Dropdown pour changer la période d'analyse

**Données affichées** :
- Revenus totaux (XOF)
- Nombre de commandes
- Panier moyen (XOF)
- Croissance vs période précédente (si disponible)
- Top 5 produits avec trend up/down
- Distribution horaire des ventes (8h-22h)
- Répartition des paiements par méthode

**Statut** : ✅ Complété

---

### Session #10 — 2026-02-25 19:55 UTC
**Titre** : Ajout du scroll vertical dans les pages /orders et /stats  
**Objectif** : Permettre le scroll vertical pour voir tout le contenu en bas des pages Kanban et Stats.

**Fichiers modifiés** :
- `src/pages/OrdersKanban.tsx` — Modification de la classe CSS pour le scroll :
  - Changement de `overflow-x-auto overflow-y-hidden` vers `overflow-auto` pour permettre le scroll vertical
- `src/pages/Stats.tsx` — Amélioration du scroll :
  - Ajout de `pb-20` (padding-bottom de 5rem) pour s'assurer que tout le contenu est visible en bas

**Améliorations apportées** :
- **Page Orders** : Le kanban board peut maintenant défiler verticalement pour voir toutes les colonnes et commandes
- **Page Stats** : Le contenu des statistiques a un padding en bas pour éviter que le contenu soit caché par le bas de l'écran

**Problème identifié et corrigé** :
- Le `MainLayout` avait `overflow-hidden` qui bloquait tout scroll sur toutes les pages
- Changement vers `overflow-auto` pour permettre le scroll vertical global

**Statut** : ✅ Complété
