export default function Admin() {
  const systemInfo = [
    { label: 'System Version', value: 'v2.4.1', status: 'success' },
    { label: 'Database Status', value: 'Connected', status: 'success' },
    { label: 'Last Backup', value: '2 hours ago', status: 'success' },
    { label: 'Storage Used', value: '45.2 GB / 100 GB', status: 'warning' },
  ];

  const recentActivity = [
    { user: 'Admin', action: 'Updated menu prices', time: '5 mins ago', type: 'update' },
    { user: 'Manager', action: 'Added new user: John Doe', time: '1 hour ago', type: 'create' },
    { user: 'System', action: 'Automatic backup completed', time: '2 hours ago', type: 'system' },
    { user: 'Admin', action: 'Modified printer settings', time: '3 hours ago', type: 'update' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background-dark text-white">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">System Administration</h1>
            <p className="text-slate-400 text-sm md:text-base">Manage system settings and configurations</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 h-10 rounded-lg bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm font-bold">
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span>System Settings</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemInfo.map((info, idx) => (
            <div key={idx} className="rounded-xl p-5 bg-surface-dark border border-[#233648] shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <p className="text-slate-400 text-sm font-medium">{info.label}</p>
                <div className={`w-2 h-2 rounded-full ${
                  info.status === 'success' ? 'bg-emerald-400' : 'bg-amber-400'
                } animate-pulse`}></div>
              </div>
              <p className="text-white text-lg font-bold">{info.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#233648] flex items-center justify-between">
              <div>
                <h3 className="text-white text-lg font-bold">Quick Actions</h3>
                <p className="text-slate-400 text-sm mt-1">Common administrative tasks</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[#111a22] border border-[#233648] hover:border-primary hover:bg-[#1a2632] transition-all group">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <span className="material-symbols-outlined text-3xl text-blue-400">backup</span>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Backup Now</p>
                  <p className="text-slate-400 text-xs mt-1">Create manual backup</p>
                </div>
              </button>

              <button className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[#111a22] border border-[#233648] hover:border-primary hover:bg-[#1a2632] transition-all group">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <span className="material-symbols-outlined text-3xl text-emerald-400">sync</span>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Sync Data</p>
                  <p className="text-slate-400 text-xs mt-1">Synchronize database</p>
                </div>
              </button>

              <button className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[#111a22] border border-[#233648] hover:border-primary hover:bg-[#1a2632] transition-all group">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                  <span className="material-symbols-outlined text-3xl text-amber-400">cleaning_services</span>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Clear Cache</p>
                  <p className="text-slate-400 text-xs mt-1">Free up space</p>
                </div>
              </button>

              <button className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[#111a22] border border-[#233648] hover:border-primary hover:bg-[#1a2632] transition-all group">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                  <span className="material-symbols-outlined text-3xl text-red-400">restart_alt</span>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Restart System</p>
                  <p className="text-slate-400 text-xs mt-1">Reboot services</p>
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#233648]">
              <h3 className="text-white text-lg font-bold">Recent Activity</h3>
              <p className="text-slate-400 text-sm mt-1">System and user actions</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-[#111a22] border border-[#233648]">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
                      activity.type === 'create' ? 'bg-emerald-500/10 text-emerald-400' :
                      activity.type === 'update' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      <span className="material-symbols-outlined text-xl">
                        {activity.type === 'create' ? 'add_circle' :
                         activity.type === 'update' ? 'edit' : 'settings'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-xs">{activity.user}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 text-xs">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#233648]">
            <h3 className="text-white text-lg font-bold">System Modules</h3>
            <p className="text-slate-400 text-sm mt-1">Manage installed modules and plugins</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Payment Gateway', status: 'active', version: 'v1.2.3' },
                { name: 'Inventory Management', status: 'active', version: 'v2.0.1' },
                { name: 'Kitchen Display', status: 'active', version: 'v1.5.0' },
                { name: 'Loyalty Program', status: 'inactive', version: 'v1.0.0' },
                { name: 'Analytics Dashboard', status: 'active', version: 'v3.1.2' },
                { name: 'Email Notifications', status: 'active', version: 'v1.4.0' },
              ].map((module, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[#111a22] border border-[#233648]">
                  <div>
                    <p className="text-white font-semibold text-sm">{module.name}</p>
                    <p className="text-slate-400 text-xs mt-1">{module.version}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    module.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {module.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
