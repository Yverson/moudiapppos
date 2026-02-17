export default function Stats() {
  const salesData = [
    { period: 'Today', revenue: 2450, orders: 45, avgOrder: 54.44, growth: '+12%' },
    { period: 'This Week', revenue: 15680, orders: 287, avgOrder: 54.63, growth: '+8%' },
    { period: 'This Month', revenue: 68920, orders: 1243, avgOrder: 55.44, growth: '+15%' },
  ];

  const topProducts = [
    { name: 'Cheeseburger', sold: 156, revenue: 2886, trend: 'up' },
    { name: 'Steak Frites', sold: 98, revenue: 2744, trend: 'up' },
    { name: 'Cola Zero', sold: 234, revenue: 819, trend: 'down' },
    { name: 'Grilled Salmon', sold: 67, revenue: 1608, trend: 'up' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background-dark text-white">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Statistics & Reports</h1>
            <p className="text-slate-400 text-sm md:text-base">Track performance and analyze trends</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-[#233648] bg-surface-dark text-slate-300 text-sm font-semibold hover:bg-surface-hover transition-all">
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              <span>Last 30 Days</span>
            </button>
            <button className="flex items-center gap-2 px-5 h-10 rounded-lg bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm font-bold">
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="relative overflow-hidden rounded-xl p-6 bg-surface-dark border border-[#233648] shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Revenue</p>
                <h3 className="text-3xl font-bold text-white tabular-nums mt-2">$68,920</h3>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10">
                <span className="material-symbols-outlined text-2xl text-emerald-400">trending_up</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-semibold">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              <span>15% vs last month</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-surface-dark border border-[#233648] shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Orders</p>
                <h3 className="text-3xl font-bold text-white tabular-nums mt-2">1,243</h3>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10">
                <span className="material-symbols-outlined text-2xl text-blue-400">receipt_long</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-blue-400 text-sm font-semibold">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              <span>8% vs last month</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-6 bg-surface-dark border border-[#233648] shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Avg Order Value</p>
                <h3 className="text-3xl font-bold text-white tabular-nums mt-2">$55.44</h3>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10">
                <span className="material-symbols-outlined text-2xl text-amber-400">payments</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-400 text-sm font-semibold">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              <span>3% vs last month</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#233648]">
              <h3 className="text-white text-lg font-bold">Sales Performance</h3>
              <p className="text-slate-400 text-sm mt-1">Revenue breakdown by period</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {salesData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[#111a22] border border-[#233648]">
                    <div>
                      <p className="text-white font-semibold">{item.period}</p>
                      <p className="text-slate-400 text-sm">{item.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">${item.revenue.toLocaleString()}</p>
                      <p className="text-emerald-400 text-sm font-semibold">{item.growth}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#233648] bg-surface-dark shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#233648]">
              <h3 className="text-white text-lg font-bold">Top Products</h3>
              <p className="text-slate-400 text-sm mt-1">Best sellers this month</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[#111a22] border border-[#233648]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{product.name}</p>
                        <p className="text-slate-400 text-sm">{product.sold} sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">${product.revenue.toLocaleString()}</p>
                      <div className="flex items-center justify-end gap-1">
                        <span className={`material-symbols-outlined text-sm ${
                          product.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {product.trend === 'up' ? 'trending_up' : 'trending_down'}
                        </span>
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
            <h3 className="text-white text-lg font-bold">Hourly Sales Distribution</h3>
            <p className="text-slate-400 text-sm mt-1">Peak hours analysis</p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between gap-2">
              {[12, 18, 25, 42, 68, 85, 92, 78, 65, 48, 32, 20].map((height, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-primary to-blue-400 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs text-slate-400">{idx + 8}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
