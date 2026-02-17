import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-[#16191c] text-white overflow-hidden">
      <header className="flex-none flex items-center justify-between border-b border-[#30363b] bg-[#171a1c] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="size-10 flex items-center justify-center bg-[#577798]/20 rounded-lg text-[#577798]">
            <span className="material-symbols-outlined text-3xl">point_of_sale</span>
          </div>
          <h2 className="text-2xl font-bold">RestoPOS</h2>
        </div>

        <nav className="flex items-center gap-2 bg-[#22262a] p-1.5 rounded-lg">
          <NavLink
            to="/pos"
            className={({ isActive }) =>
              isActive
                ? 'bg-[#30363b] text-white px-6 py-3 rounded-md text-base font-bold shadow-sm'
                : 'text-[#a4adb6] hover:text-white hover:bg-[#30363b] px-6 py-3 rounded-md text-base font-bold transition-colors'
            }
          >
            Caisse
          </NavLink>
          <NavLink
            to="/finance"
            className={({ isActive }) =>
              isActive
                ? 'bg-[#30363b] text-white px-6 py-3 rounded-md text-base font-bold shadow-sm'
                : 'text-[#a4adb6] hover:text-white hover:bg-[#30363b] px-6 py-3 rounded-md text-base font-bold transition-colors'
            }
          >
            Finance
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive
                ? 'bg-[#30363b] text-white px-6 py-3 rounded-md text-base font-bold shadow-sm'
                : 'text-[#a4adb6] hover:text-white hover:bg-[#30363b] px-6 py-3 rounded-md text-base font-bold transition-colors'
            }
          >
            Paramètres
          </NavLink>
          <NavLink
            to="/stats"
            className={({ isActive }) =>
              isActive
                ? 'bg-[#30363b] text-white px-6 py-3 rounded-md text-base font-bold shadow-sm'
                : 'text-[#a4adb6] hover:text-white hover:bg-[#30363b] px-6 py-3 rounded-md text-base font-bold transition-colors'
            }
          >
            Stats
          </NavLink>
          <NavLink
            to="/roles"
            className={({ isActive }) =>
              isActive
                ? 'bg-[#30363b] text-white px-6 py-3 rounded-md text-base font-bold shadow-sm'
                : 'text-[#a4adb6] hover:text-white hover:bg-[#30363b] px-6 py-3 rounded-md text-base font-bold transition-colors'
            }
          >
            Roles
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              isActive
                ? 'bg-[#30363b] text-white px-6 py-3 rounded-md text-base font-bold shadow-sm'
                : 'text-[#a4adb6] hover:text-white hover:bg-[#30363b] px-6 py-3 rounded-md text-base font-bold transition-colors'
            }
          >
            Admin
          </NavLink>
        </nav>

        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 bg-[#22262a] px-4 py-2 rounded-lg border border-[#30363b]">
            <div className="bg-green-500 size-3 rounded-full animate-pulse"></div>
            <span className="text-sm text-[#a4adb6] font-bold">Online</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center size-12 rounded-lg bg-[#30363b] hover:bg-[#444d55] text-white transition-colors"
              title="Déconnexion"
            >
              <span className="material-symbols-outlined text-2xl">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
