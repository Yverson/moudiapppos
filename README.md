# RestoPOS - Point of Sale System

Application de caisse (POS) pour restaurant construite avec **Tauri + Vite + React + TypeScript**.

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** (v18+)
- **Rust** (pour Tauri) - [Installation](https://www.rust-lang.org/tools/install)
- **npm** ou **pnpm**

### Installation

```bash
cd apppos
npm install
```

### Lancement en mode développement

#### Mode Web (Vite uniquement)
```bash
npm run dev
```
Ouvre http://localhost:3062

#### Mode Desktop (Tauri)
```bash
npm run tauri:dev
```
Lance l'application desktop native

### Build de production

```bash
# Build web
npm run build

# Build desktop (génère l'exécutable)
npm run tauri:build
```

## 🔐 Authentification

**Identifiants de démo :**
- Username: `admin`
- Password: `admin`

## 📁 Structure du projet

```
apppos/
├── src/
│   ├── components/       # Composants réutilisables
│   │   └── ProtectedRoute.tsx
│   ├── context/          # Contextes React (Auth, etc.)
│   │   └── AuthContext.tsx
│   ├── layouts/          # Layouts de page
│   │   └── MainLayout.tsx
│   ├── pages/            # Pages de l'application
│   │   ├── Login.tsx
│   │   ├── POSTerminal.tsx
│   │   ├── Finance.tsx
│   │   ├── Settings.tsx
│   │   └── Roles.tsx
│   ├── App.tsx           # Routeur principal
│   ├── main.tsx          # Point d'entrée
│   └── styles.css        # Styles globaux
├── src-tauri/            # Configuration Tauri (Rust)
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── index.html
├── package.json
└── vite.config.ts
```

## 🎨 Pages disponibles

- **`/login`** - Page de connexion
- **`/pos`** - Terminal de caisse (POS)
- **`/finance`** - Gestion financière et cash flow
- **`/settings`** - Paramètres de l'établissement
- **`/roles`** - Gestion des utilisateurs et permissions

## 🛠️ Technologies utilisées

- **Tauri** - Framework desktop natif
- **Vite** - Build tool ultra-rapide
- **React 18** - UI library
- **TypeScript** - Typage statique
- **React Router** - Routing
- **Tailwind CSS** (via CDN) - Styling
- **Material Symbols** - Icônes

## 📝 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance Vite dev server (port 3062) |
| `npm run build` | Build production (web) |
| `npm run preview` | Preview du build |
| `npm run type-check` | Vérification TypeScript |
| `npm run tauri:dev` | Lance l'app desktop en dev |
| `npm run tauri:build` | Build l'app desktop |

## 🔒 Sécurité

- Les variables d'environnement sensibles doivent être dans `.env.local` (non committé)
- L'authentification utilise `localStorage` (démo uniquement, à remplacer en production)
- Les routes sont protégées via `ProtectedRoute`

## 📦 Configuration Tauri

Le fichier `src-tauri/tauri.conf.json` configure :
- Port de développement : `3062`
- Taille de fenêtre : `1200x800`
- Bundle identifier : `com.moudi.apppos`

## 🚧 Prochaines étapes

- [ ] Intégrer une vraie API backend
- [ ] Ajouter la gestion des paiements
- [ ] Implémenter l'impression de tickets
- [ ] Ajouter la synchronisation temps réel
- [ ] Tests unitaires et E2E

## 📄 Licence

Projet interne - Tous droits réservés
