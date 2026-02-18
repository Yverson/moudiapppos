import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { DatabaseProvider } from './context/DatabaseContext';
import { CategoryProvider } from './context/CategoryContext';
import { MenuProvider } from './context/MenuContext';
import { CustomerProvider } from './context/CustomerContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import POSTerminal from './pages/POSTerminal';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import Roles from './pages/Roles';
import Stats from './pages/Stats';
import Admin from './pages/Admin';
import CategoryManagement from './pages/CategoryManagement';
import MenuManagement from './pages/MenuManagement';
import CustomerManagement from './pages/CustomerManagement';

export default function App() {
  // ID du restaurant par défaut - à récupérer depuis l'auth ou config
  const restaurantId = 'restaurant-default-1';

  return (
    <AuthProvider>
      <OrderProvider>
        <DatabaseProvider restaurantId={restaurantId}>
          <CategoryProvider>
            <MenuProvider>
              <CustomerProvider>
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
                      <Route path="finance" element={<Finance />} />
                      <Route path="stats" element={<Stats />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="roles" element={<Roles />} />
                      <Route path="admin" element={<Admin />} />
                      <Route path="categories" element={<CategoryManagement />} />
                      <Route path="menu" element={<MenuManagement />} />
                      <Route path="customers" element={<CustomerManagement />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/pos" replace />} />
                  </Routes>
                </BrowserRouter>
              </CustomerProvider>
            </MenuProvider>
          </CategoryProvider>
        </DatabaseProvider>
      </OrderProvider>
    </AuthProvider>
  );
}
