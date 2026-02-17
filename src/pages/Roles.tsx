import { useState } from 'react';

const USERS = [
  { id: '1', name: 'Sarah Smith', username: '@ssmith', role: 'ADMIN', status: 'online', lastLogin: '2 mins ago', active: true },
  { id: '2', name: 'John Doe', username: '@jdoe', role: 'WAITER', status: 'offline', lastLogin: '', active: false },
  { id: '3', name: 'Mike Ross', username: '@mross', role: 'CASHIER', status: 'online', lastLogin: '', active: false },
  { id: '4', name: 'Emily Chen', username: '@echen', role: 'WAITER', status: 'offline', lastLogin: '', active: false },
];

export default function Roles() {
  const [selectedUser, setSelectedUser] = useState(USERS[0]);

  return (
    <div className="flex h-full overflow-hidden bg-[#0f151b]">
      <aside className="w-full max-w-[400px] flex flex-col border-r border-[#233648] bg-[#111a22]">
        <div className="p-4 border-b border-[#233648]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold">Staff</h1>
              <p className="text-sm text-slate-400">Manage access & roles</p>
            </div>
            <button className="flex items-center justify-center gap-2 rounded-lg h-9 px-3 bg-[#2b8cee] hover:bg-blue-600 transition-colors text-white text-sm font-medium">
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Add User</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {USERS.map(user => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                selectedUser.id === user.id
                  ? 'bg-[#2b8cee]/10 border border-[#2b8cee]/30'
                  : 'hover:bg-[#1a2632] border border-transparent hover:border-[#233648]'
              }`}
            >
              <div className="relative">
                <div className="bg-slate-600 rounded-full h-12 w-12"></div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-[#111a22] rounded-full ${
                  user.status === 'online' ? 'bg-green-500' : 'bg-slate-500'
                }`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className={`text-sm font-semibold truncate ${selectedUser.id === user.id ? 'text-white' : 'text-slate-200'}`}>
                    {user.name}
                  </p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    user.role === 'ADMIN' ? 'bg-[#2b8cee] text-white' :
                    user.role === 'CASHIER' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-[#233648] text-slate-300'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-slate-500 text-xs truncate">{user.username}</p>
                {user.lastLogin && <p className="text-slate-500 text-[10px] mt-0.5">Last login: {user.lastLogin}</p>}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        <div className="px-8 py-6 border-b border-[#233648] bg-[#111a22]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="bg-slate-600 rounded-full h-20 w-20 ring-4 ring-[#1a2632]"></div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold">{selectedUser.name}</h2>
                  {selectedUser.status === 'online' && (
                    <>
                      <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-xs font-medium text-green-500">Active Session</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-slate-400 text-sm mb-3">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">badge</span>
                    Employee ID: #8832
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">mail</span>
                    {selectedUser.username.replace('@', '')}@resto.com
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-300">Role:</label>
                  <select
                    title="User Role"
                    className="bg-[#1a2632] border border-[#233648] text-white text-sm rounded-md focus:ring-[#2b8cee] focus:border-[#2b8cee] p-1.5 px-3 min-w-[140px]"
                    defaultValue={selectedUser.role}
                  >
                    <option>Administrator</option>
                    <option>Manager</option>
                    <option>Cashier</option>
                    <option>Waiter</option>
                    <option>Kitchen Staff</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-[#0f151b]">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#233648] bg-[#233648]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2b8cee]">point_of_sale</span>
                  <h3 className="font-semibold">POS Operations</h3>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <PermissionItem label="Process Refunds" description="Allow user to issue refunds" checked={true} />
                <PermissionItem label="Apply Discounts" description="Manually apply custom discounts" checked={true} />
                <PermissionItem label="Void Orders" description="Cancel orders after sent to kitchen" checked={false} />
              </div>
            </div>

            <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#233648] bg-[#233648]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2b8cee]">inventory_2</span>
                  <h3 className="font-semibold">Inventory Control</h3>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <PermissionItem label="Manage Stock Levels" description="Update quantity on hand" checked={true} />
                <PermissionItem label="Create Purchase Orders" description="Generate new POs" checked={false} />
                <PermissionItem label="Transfer Stock" description="Move inventory between locations" checked={true} />
              </div>
            </div>

            <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#233648] bg-[#233648]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2b8cee]">bar_chart</span>
                  <h3 className="font-semibold">Reports & Analytics</h3>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <PermissionItem label="View Sales Reports" description="Access revenue data" checked={true} />
                <PermissionItem label="View Staff Logs" description="See audit trails" checked={true} />
              </div>
            </div>

            <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#233648] bg-[#233648]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2b8cee]">settings</span>
                  <h3 className="font-semibold">System Settings</h3>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <PermissionItem label="Manage Users" description="Create, edit staff accounts" checked={true} />
                <PermissionItem label="Edit Menu Items" description="Change prices and descriptions" checked={false} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PermissionItem({ label, description, checked }: { label: string; description: string; checked: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-[#233648]/30 rounded-lg transition-colors">
      <div>
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        <p className="text-slate-500 text-xs">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" defaultChecked={checked} className="sr-only peer" />
        <div className="w-9 h-5 bg-[#111a22] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2b8cee] peer-checked:after:bg-white"></div>
      </label>
    </div>
  );
}
