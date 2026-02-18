# 🚀 AppPOS Completion Plan

**Status:** Build passing ✅ | TypeScript strict ✅ | UI/UX ready ⏳  
**Priority:** URGENT - Desktop POS for MOUDI  
**Timeline:** Complete by 18 fév EOD

---

## 📊 Current State

### ✅ What Works
- ✅ Vite + React 18 + Tauri setup
- ✅ React Router v6 navigation
- ✅ AuthContext (demo auth with localStorage)
- ✅ ProtectedRoute wrapper
- ✅ 6 pages: Login, POSTerminal, Finance, Settings, Roles, Admin
- ✅ Tailwind CSS configured
- ✅ TypeScript strict mode
- ✅ Build passes (225 KB JS gzipped)

### ❌ What's Missing (Critical)
1. **API Integration** — No backend calls yet (hardcoded demo data)
2. **Jest Tests** — Zero test coverage
3. **Payment System** — No payment processing
4. **Receipt Printing** — Not implemented
5. **Real-time Sync** — Not connected to MOUDI backend
6. **Offline Mode** — No fallback for connectivity loss
7. **Error Handling** — Minimal error boundaries
8. **Analytics** — No transaction logging

---

## 🎯 Tasks to Complete (Priority Order)

### **BATCH A: Core API + Tests (CRITICAL)**

#### Task A1: API Service Integration (1.5h)
```typescript
// Create: src/services/api.service.ts
- axios instance with JWT auth (from localStorage or httpOnly)
- Base URL: MOUDI backend (localhost:5000 / prod)
- Endpoints needed:
  - POST /api/auth/login (for cashier/admin)
  - GET /api/restaurants/{id}/menu
  - POST /api/orders (create order from POS)
  - PATCH /api/orders/{id} (update order status)
  - GET /api/orders (list today's orders)
  - POST /api/payments (record payment)
  - GET /api/cash-drawer (get drawer balance)
```

**Deliverable:** `api.service.ts` + TypeScript client types

#### Task A2: Jest + React Testing Library (1h)
```bash
npm install --save-dev jest @testing-library/react jest-environment-jsdom @types/jest
```

- Create `jest.config.ts` (Vite + React support)
- Create `src/__tests__/Login.test.tsx` (test auth flow)
- Create `src/__tests__/POSTerminal.test.tsx` (test basic UI)
- **Target:** >70% coverage on critical paths

**Deliverable:** `jest.config.ts` + 3 passing tests

#### Task A3: Payment Modal (JSX + Logic) (1h) ✅ COMPLETED
```typescript
// Update: src/components/PaymentModal.tsx
- ✅ Cash payment with change calculation
- ✅ Card payment (Stripe integration ready)
- ✅ Mobile money (Orange Money, MTN, Airtel)
- ✅ Split payment option
- ✅ Change calculation
- ✅ Amount validation & overpayment prevention
- ✅ API integration (POST /api/payments)
- ✅ Success/error messaging
- ✅ Modal closing on success
- ✅ Receipt data handling
```

**Deliverable:** ✅ Fully functional PaymentModal.tsx (569 lines)
- PaymentMethod enum (CASH, CARD, MOBILE_MONEY, SPLIT)
- PaymentRequest interface (validated payment data)
- PaymentResponse interface (receipt data)
- Radio button selection for payment methods
- Numeric keypad for cash input
- Real-time balance calculation
- API-ready payment processing
- Message display (success/error states)
- Disabled button states during processing

### **BATCH B: Backend Integration (MEDIUM)**

#### Task B1: Order Management Flow (1.5h)
```typescript
// Create: src/context/OrderContext.tsx
- useOrder() hook
- Add item to cart
- Modify quantity
- Remove item
- Apply discount
- Calculate total + tax
- Place order → API call
```

**Deliverable:** `OrderContext.tsx` + helper functions

#### Task B2: Real-time Order Status (1h)
```typescript
// Create: src/hooks/useOrderStatus.ts
- Poll /api/orders every 5s
- Update orders in real-time
- Mark delivered/cancelled
- Notify kitchen (WebSocket ready)
```

**Deliverable:** `useOrderStatus.ts` hook

#### Task B3: Cash Drawer Reconciliation (1h)
```typescript
// Update: src/pages/Finance.tsx
- Show opening balance
- List all transactions (orders + payments)
- Show closing balance
- Export daily report
```

**Deliverable:** Updated Finance page + CSV export

### **BATCH C: Polish + Testing (MEDIUM)**

#### Task C1: Error Boundaries + Fallbacks (45min)
```typescript
// Create: src/components/ErrorBoundary.tsx
- Catch render errors
- Show user-friendly message
- Log to backend (Sentry optional)
```

**Deliverable:** `ErrorBoundary.tsx`

#### Task C2: Offline Mode (1h)
```typescript
// Create: src/hooks/useOfflineQueue.ts
- Queue orders when offline
- Sync when back online
- Show offline indicator
```

**Deliverable:** `useOfflineQueue.ts` + UI indicator

#### Task C3: E2E Test (30min)
```bash
npm install --save-dev @testing-library/user-event vitest
```

- Test login → order → payment flow
- Test offline → online sync

**Deliverable:** `POSFlow.test.tsx` (integration test)

### **BATCH D: Tauri + Desktop Build (OPTIONAL)**

#### Task D1: Tauri Desktop Config (30min)
- Update `src-tauri/tauri.conf.json`
- Set proper app ID, icons, title
- Configure menu bar (File, Edit, Help)

#### Task D2: Build Desktop Binary (15min)
```bash
npm run tauri:build
```

---

## 📋 Detailed Execution Plan

### Phase 1: API + Tests (3 hours)
1. **A1:** API Service → `api.service.ts`
2. **A2:** Jest setup → tests passing
3. **A3:** Payment Modal → JSX ready

**Deliverable:** 3 ready-to-merge PRs

### Phase 2: Integration (3.5 hours)
4. **B1:** OrderContext → cart logic
5. **B2:** Real-time sync → useOrderStatus
6. **B3:** Finance page → cash reconciliation

**Deliverable:** Fully functional POS (no offline yet)

### Phase 3: Polish (2.5 hours)
7. **C1:** Error boundaries
8. **C2:** Offline queue
9. **C3:** E2E tests
10. **D1-2:** Desktop build (optional)

**Deliverable:** Production-ready POS

---

## 💰 Cost Estimate

| Phase | Tasks | Model | Cost |
|-------|-------|-------|------|
| A (API+Tests) | A1, A2, A3 | Sonnet 4.6 | €4.50 |
| B (Integration) | B1, B2, B3 | Sonnet 4.6 | €4.50 |
| C (Polish) | C1, C2, C3 | Sonnet 4.6 | €3.00 |
| D (Desktop) | D1, D2 | Haiku | €0.30 |
| **TOTAL** | 10 tasks | Mixed | **€12.30** |

**Budget remaining:** ~€9-10 from Phase 2 total

---

## 🎯 Success Criteria

✅ **Phase 1 Complete:**
- API service integrated
- Jest >70% coverage
- Payment modal functional

✅ **Phase 2 Complete:**
- Can place order → backend
- Real-time order tracking
- Finance page shows transactions

✅ **Phase 3 Complete:**
- Offline mode working
- Error handling complete
- E2E test passing
- No console errors

✅ **Phase 4 (Optional):**
- Desktop app builds
- Signed binary ready for distribution

---

## 🔄 Next Step

Ready to spawn **Pixel** to execute **Phase 1 (API + Tests + Payment)**?

```bash
sessions_spawn(
  agentId="pixel",
  task="Complete apppos Phase 1: API Service, Jest Setup, Payment Modal",
  model="sonnet",
  thinking="enabled"
)
```

**ETA:** 3 hours → **Fully functional POS by ~14:37**

---

**Created:** 18 fév 2026 11:37 UTC+1  
**Owner:** Matrix 🌿  
**Priority:** 🚨 CRITICAL
