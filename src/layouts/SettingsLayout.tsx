import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface SettingsLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  showSaveButton?: boolean;
  onSave?: () => void;
}

export default function SettingsLayout({ 
  children, 
  title, 
  description, 
  showSaveButton = false,
  onSave 
}: SettingsLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-64 flex-shrink-0 flex flex-col bg-[#111a22] border-r border-[#233648]">
        <div className="p-4 flex flex-col h-full justify-between">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2b8cee] to-blue-600 flex items-center justify-center shadow-lg shadow-[#2b8cee]/20">
                <span className="material-symbols-outlined text-white text-2xl">point_of_sale</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-white text-base font-bold leading-tight">Panneau admin</h1>
                <p className="text-[#92adc9] text-xs font-medium">v2.4.1</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined text-[#2b8cee]">settings</span>
                <span className="text-sm font-medium">Général</span>
              </NavLink>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group" href="#sync">
                <span className="material-symbols-outlined">sync</span>
                <span className="text-sm font-medium">Synchronisation</span>
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group" href="#">
                <span className="material-symbols-outlined">print</span>
                <span className="text-sm font-medium">Imprimantes</span>
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group" href="#">
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span className="text-sm font-medium">Lecteur code-barres</span>
              </a>
              
              <div className="border-t border-[#233648] my-2"></div>
              
              <NavLink
                to="/categories"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined">category</span>
                <span className="text-sm font-medium">Catégories</span>
              </NavLink>
              
              <NavLink
                to="/menu"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined">restaurant_menu</span>
                <span className="text-sm font-medium">Menu</span>
              </NavLink>
              
              <NavLink
                to="/customers"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined">group</span>
                <span className="text-sm font-medium">Clients</span>
              </NavLink>
              
              <NavLink
                to="/livreurs"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined">delivery_dining</span>
                <span className="text-sm font-medium">Livreurs</span>
              </NavLink>
              
              <NavLink
                to="/payment-methods"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined">payments</span>
                <span className="text-sm font-medium">Paiements</span>
              </NavLink>

              <div className="border-t border-[#233648] my-2"></div>
              
              <NavLink
                to="/sessions"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined">history</span>
                <span className="text-sm font-medium">Sessions</span>
              </NavLink>

              <NavLink
                to="/local-db"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined">database</span>
                <span className="text-sm font-medium">DB Locale</span>
              </NavLink>

              <NavLink
                to="/check-local-data"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined">insights</span>
                <span className="text-sm font-medium">Vérifier données</span>
              </NavLink>

              <NavLink
                to="/clear-data"
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group'
                }
              >
                <span className="material-symbols-outlined text-amber-500">delete_sweep</span>
                <span className="text-sm font-medium">Vider les données</span>
              </NavLink>
            </nav>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 bg-[#111a22]/95 backdrop-blur-md border-b border-[#233648] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-[#92adc9] text-sm mt-1">{description}</p>
          </div>
          {showSaveButton && onSave && (
            <button 
              onClick={onSave}
              className="flex items-center gap-2 h-10 px-6 rounded-lg bg-[#2b8cee] hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>Enregistrer la configuration</span>
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#101922]">
          {children}
        </div>
      </main>
    </div>
  );
}
