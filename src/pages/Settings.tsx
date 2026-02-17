export default function Settings() {
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
                <h1 className="text-white text-base font-bold leading-tight">Admin Panel</h1>
                <p className="text-[#92adc9] text-xs font-medium">v2.4.1</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#233648] text-white group transition-colors" href="#">
                <span className="material-symbols-outlined text-[#2b8cee]">settings</span>
                <span className="text-sm font-medium">General</span>
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group" href="#">
                <span className="material-symbols-outlined">print</span>
                <span className="text-sm font-medium">Printers</span>
              </a>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#92adc9] hover:bg-[#192633] hover:text-white transition-colors group" href="#">
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span className="text-sm font-medium">Barcode Scanner</span>
              </a>
            </nav>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 bg-[#111a22]/95 backdrop-blur-md border-b border-[#233648] px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">General Settings</h2>
            <p className="text-[#92adc9] text-sm mt-1">Manage establishment details, branding, and receipts.</p>
          </div>
          <button className="flex items-center gap-2 h-10 px-6 rounded-lg bg-[#2b8cee] hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">
            <span className="material-symbols-outlined text-[20px]">save</span>
            <span>Save Configuration</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#101922]">
          <section className="max-w-4xl mx-auto">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2b8cee]">storefront</span>
              Business Info
            </h3>
            <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[#92adc9] text-sm font-medium">Establishment Name</label>
                  <input
                    type="text"
                    title="Establishment Name"
                    className="w-full bg-[#111a22] border-[#324d67] rounded-lg text-white placeholder-slate-500 focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm"
                    defaultValue="Gourmet Burgers Downtown"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#92adc9] text-sm font-medium">Official Email</label>
                  <input
                    type="email"
                    title="Official Email"
                    className="w-full bg-[#111a22] border-[#324d67] rounded-lg text-white placeholder-slate-500 focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm"
                    defaultValue="manager@gourmetburgers.com"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#92adc9] text-sm font-medium">Phone Number</label>
                  <input
                    type="tel"
                    title="Phone Number"
                    className="w-full bg-[#111a22] border-[#324d67] rounded-lg text-white placeholder-slate-500 focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm"
                    defaultValue="+1 (212) 555-0199"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#92adc9] text-sm font-medium">Tax ID / VAT</label>
                  <input
                    type="text"
                    title="Tax ID"
                    className="w-full bg-[#111a22] border-[#324d67] rounded-lg text-white placeholder-slate-500 focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm"
                    defaultValue="US-987654321"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2b8cee]">public</span>
                Regional Settings
              </h3>
              <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[#92adc9] text-sm font-medium">Currency</label>
                    <select
                      title="Currency"
                      className="w-full bg-[#111a22] border-[#324d67] rounded-lg text-white focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm"
                    >
                      <option value="USD">USD ($) - United States Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[#92adc9] text-sm font-medium">Time Zone</label>
                    <select
                      title="Time Zone"
                      className="w-full bg-[#111a22] border-[#324d67] rounded-lg text-white focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm"
                    >
                      <option value="EST">Eastern Standard Time (UTC-5)</option>
                      <option value="PST">Pacific Standard Time (UTC-8)</option>
                      <option value="GMT">Greenwich Mean Time (UTC+0)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
