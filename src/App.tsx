import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import bidirectionalSync from './services/bidirectional-sync.service';
import statsService from './services/stats.service';
import syncService from './services/sync.service';
import { OrderProvider } from './context/OrderContext';
import { DatabaseProvider } from './context/DatabaseContext';
import { CategoryProvider } from './context/CategoryContext';
import { MenuProvider } from './context/MenuContext';
import { CustomerProvider } from './context/CustomerContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import POSTerminal from './pages/POSTerminal';
import Settings from './pages/Settings';
import Roles from './pages/Roles';
import Stats from './pages/Stats';
import CategoryManagement from './pages/CategoryManagement';
import MenuManagement from './pages/MenuManagement';
import CustomerManagement from './pages/CustomerManagement';
import LivreurManagement from './pages/LivreurManagement';
import PaymentMethods from './pages/PaymentMethods';
import OrdersKanban from './pages/OrdersKanban';
import OrdersHistory from './pages/OrdersHistory';
import { PaymentMethodProvider } from './context/PaymentMethodContext';
import { useActiveRestaurant } from './services/restaurant-config';
import Sessions from './pages/Sessions';
import ClearData from './pages/ClearData';
import LocalDbManagement from './pages/LocalDbManagement';
import CheckLocalData from './pages/CheckLocalData';

export default function App() {
  const { id: restaurantId } = useActiveRestaurant();

  useEffect(() => {
    bidirectionalSync.setRestaurantId(restaurantId);
    statsService.setRestaurantId(restaurantId);
    syncService.setRestaurantId(restaurantId);
    
    // Synchronisation automatique au démarrage
    const performInitialSync = async () => {
      if (bidirectionalSync.isOnline) {
        bidirectionalSync.flushQueue();
        
        // Synchroniser les commandes locales vers le cloud
        try {
          await syncService.syncAll({ orders: true });
        } catch (error) {
          // Ignoré
        }
      }
    };
    
    performInitialSync();
  }, [restaurantId]);

  const userId = localStorage.getItem('userId') || 'demo-user';

  return (
    <AuthProvider>
      <OrderProvider>
        <DatabaseProvider restaurantId={restaurantId}>
          <CategoryProvider>
            <MenuProvider>
              <CustomerProvider>
                <PaymentMethodProvider userId={userId}>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <MainLayout />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Navigate to="/pos" replace />} />
                        <Route path="pos" element={<POSTerminal />} />
                        <Route path="orders" element={<OrdersKanban />} />
                        <Route path="orders/history" element={<OrdersHistory />} />
                        <Route path="stats" element={<Stats />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="roles" element={<Roles />} />
                        <Route path="categories" element={<CategoryManagement />} />
                        <Route path="menu" element={<MenuManagement />} />
                        <Route path="customers" element={<CustomerManagement />} />
                        <Route path="livreurs" element={<LivreurManagement />} />
                        <Route path="payment-methods" element={<PaymentMethods />} />
                        <Route path="sessions" element={<Sessions />} />
                        <Route path="clear-data" element={<ClearData />} />
                        <Route path="local-db" element={<LocalDbManagement />} />
                        <Route path="check-local-data" element={<CheckLocalData />} />
                      </Route>
                      <Route path="*" element={<Navigate to="/pos" replace />} />
                    </Routes>
                  </BrowserRouter>
                </PaymentMethodProvider>
              </CustomerProvider>
            </MenuProvider>
          </CategoryProvider>
        </DatabaseProvider>
      </OrderProvider>
    </AuthProvider>
  );
}
