# 🍕 MOUDI POS Offline-First + Sync Architecture Request

**Date:** 17 fév 2026 20:25 UTC+1  
**Requestor:** Mathieu (Product Owner)  
**Architect Assigned:** Forge 🔧  

---

## 🎯 Executive Summary

Extend MOUDI to support **offline-first POS terminals** in restaurants without internet. Desktop app (apppos/Tauri) saves orders locally, syncs when internet available. Same database + auth as web apps.

---

## 📋 Current State Analysis

### Existing Architecture
```
┌─ Backend (ASP.NET Core 9)
│  ├─ 28 SQL Server tables
│  ├─ JWT auth + role-based access
│  └─ ~98 REST endpoints
│
├─ Web Apps (Next.js 14)
│  ├─ appclient (customer)
│  ├─ applivreur (driver)
│  ├─ appproprietaire (owner)
│  └─ [4th app]
│
└─ Desktop App (Vite + React + Tauri)
   ├─ Screen designs done (via Stitch)
   ├─ React 18 components ready
   ├─ Needs: offline DB + sync layer
   └─ Needs: command queue + API sync
```

### Current Database
- **Engine:** SQL Server (cloud)
- **Scope:** Web apps only (always online)
- **Tables:** Users, Restaurants, Orders, Items, Deliveries, etc.

---

## 🔴 New Requirement: Offline POS with Sync

### Scenario
```
Restaurant "Burger King" has POS terminal (apppos) offline:
│
├─ 14:30 Internet goes down
├─ 14:35 Customer orders 3 burgers via terminal
├─ 14:36 Order saved locally (SQLite)
│  └─ Status: "pending_local" (not synced)
│
├─ 14:45 Internet comes back
├─ 14:46 App detects connection
├─ 14:47 Auto-sync queued orders to backend
├─ 14:48 Backend confirms "Order #1234 created"
├─ 14:49 Order appears on driver app (applivreur)
│
└─ Result: Seamless experience, no manual retry
```

### Business Requirements

1. **Offline Capability**
   - Take orders without internet
   - Save to local database (SQLite on Tauri)
   - No data loss

2. **Synchronization**
   - Auto-sync when online
   - Conflict resolution (what if order changed on server?)
   - Retry failed syncs with backoff
   - Queue management (FIFO, priority?)

3. **Same Database**
   - Use exact same schema as backend
   - Local copy = subset of production
   - Avoid duplicate data models

4. **Same Authentication**
   - JWT tokens (valid for web + desktop)
   - Restaurant staff uses same login
   - Permission enforcement local + server

5. **Real-time Updates**
   - When online: orders from other sources appear
   - Command page shows live updates from API
   - Bidirectional sync (both directions)

6. **Offline Features**
   - Browse menu (cached)
   - Create orders
   - View recent orders
   - Simple reports
   - NO delivery tracking (requires API)

---

## 🏗️ Architectural Questions to Answer

1. **Local Database**
   - SQLite vs IndexedDB vs other?
   - Schema: full copy or subset?
   - Size limits?

2. **Sync Strategy**
   - Pull (fetch changes from server)?
   - Push (upload local changes)?
   - Bidirectional (both)?
   - Frequency?

3. **Conflict Resolution**
   - Order created locally + online (same order ID)?
   - Menu changed on server (prices/items)?
   - User deleted restaurant assignment?
   - Last-write-wins? Version vectors?

4. **API Design**
   - New sync endpoints? (`/api/sync/orders`, `/api/sync/download`?)
   - Batch uploads?
   - Delta queries (only changed since last sync)?

5. **Command Queue**
   - Queue order creations locally
   - Retry failed syncs (backoff strategy)
   - Dead letter queue for permanent failures?

6. **Real-time Commands**
   - Page that receives live order updates
   - WebSocket + fallback to polling?
   - Reconnect logic?

7. **Performance**
   - Sync 1000 orders takes how long?
   - Bandwidth-aware (compress data)?
   - Incremental sync vs full?

8. **Security**
   - Token expiry during sync?
   - Signature validation for synced data?
   - Encrypt local SQLite?

---

## 📦 Deliverables Needed from Forge

### 1. Architecture Document (ADR)
- Database strategy (local + cloud)
- Sync protocol (pull/push/bi-directional)
- Conflict resolution rules
- Security considerations

### 2. API Design
- New/modified endpoints for sync
- Request/response schemas
- Error handling

### 3. Implementation Plan
- Phases (MVP → full-featured)
- Timeline estimates
- Team effort (backend + frontend)

### 4. Data Model
- Local database schema (SQLite)
- Sync state tracking (which records synced?)
- Conflict markers (version, timestamp, etc.)

### 5. Offline/Sync Pseudocode
- Queue management
- Sync algorithm
- Conflict resolution logic
- Retry strategy

### 6. Testing Strategy
- Unit tests (queue, mappers)
- Integration tests (API sync)
- Offline scenario tests

### 7. Deployment Plan
- Database migration (if needed)
- New API endpoints rollout
- Desktop app update process
- Rollback procedure

---

## ⏱️ Constraints & Assumptions

**Constraints:**
- Use existing database structure (28 tables)
- Same JWT auth system
- No new cloud infra (stay on current Dokploy setup)
- Tauri for desktop (no Electron)

**Assumptions:**
- Restaurants have intermittent internet (not always offline)
- Sync window: 5-30 min (not days)
- 100-500 orders/day per restaurant
- 1-3 POS terminals per restaurant
- Menu changes infrequent (1-2x/day)

---

## 💬 Key Questions for Architect (Forge)

1. Should we use SQLite (via Tauri) or IndexedDB (JS)?
2. Full schema replication or just Orders + related?
3. Optimistic updates (assume success) or wait for confirmation?
4. Version vectors or simpler conflict strategy?
5. One-way sync (download) or bi-directional?
6. Where to store sync state (order version, last sync timestamp)?
7. How to handle menu changes during offline period?
8. Real-time updates: WebSocket, polling, or hybrid?

---

## 📅 Timeline (Estimated)

- **Phase 1 (MVP):** Local save + basic sync (2-3 weeks)
- **Phase 2:** Conflict resolution + retry logic (1-2 weeks)
- **Phase 3:** Real-time updates + websocket (1-2 weeks)
- **Phase 4:** Advanced features (offline reports, etc.) (1 week)

---

## 📞 Next Steps

1. Forge analyzes this request
2. Forge proposes architecture (ADR + diagrams)
3. Team reviews + approves
4. Implement Phase 1 (MVP)
5. Test in beta restaurant
6. Rollout to other restaurants

---

**Waiting for:** Forge's architectural proposal  
**Status:** 🟡 In Progress (Forge analyzing...)  
**Owner:** Matrix 🌿
