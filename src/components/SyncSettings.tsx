import { useState, useEffect } from 'react';
import syncService, { SyncResult, SyncOptions } from '../services/sync.service';
import bidirectionalSyncService from '../services/bidirectional-sync.service';
import { useActiveRestaurant } from '../services/restaurant-config';

export default function SyncSettings() {
  const activeRestaurant = useActiveRestaurant();
  const [syncStatus, setSyncStatus] = useState<any>({});
  const [localCount, setLocalCount] = useState({ categories: 0, menuItems: 0, customers: 0, livreurs: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    categories: true,
    menuItems: true,
    customers: true,
    livreurs: true,
    overwrite: false,
  });

  useEffect(() => {
    syncService.setRestaurantId(activeRestaurant.id);
    bidirectionalSyncService.setRestaurantId(activeRestaurant.id);
    loadSyncData();
  }, [activeRestaurant.id]);

  const loadSyncData = async () => {
    try {
      const [status, count] = await Promise.all([
        syncService.getSyncStatus(),
        syncService.getLocalDataCount(),
      ]);
      setSyncStatus(status);
      setLocalCount(count);
    } catch (error) {
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const result = await syncService.syncAll(syncOptions);
      setSyncResult(result);
      
      // Reload data after sync
      await loadSyncData();
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de synchronisation',
        details: { categories: { synced: 0, errors: [] }, menuItems: { synced: 0, errors: [] }, customers: { synced: 0, errors: [] }, livreurs: { synced: 0, errors: [] }, orders: { synced: 0, errors: [] } },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <div className="space-y-6">
      {/* Sync Status */}
      <div className="bg-[#1b2631] rounded-xl p-6 border border-[#233648]">
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#2b8cee]">sync</span>
          Statut de Synchronisation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#233648] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Catégories</span>
              <span className="text-emerald-400 text-sm font-medium">{localCount.categories}</span>
            </div>
            <div className="text-xs text-slate-500">
              Dernière sync: {formatDate(syncStatus.categories)}
            </div>
          </div>
          
          <div className="bg-[#233648] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Articles</span>
              <span className="text-emerald-400 text-sm font-medium">{localCount.menuItems}</span>
            </div>
            <div className="text-xs text-slate-500">
              Dernière sync: {formatDate(syncStatus.menu_items)}
            </div>
          </div>
          
          <div className="bg-[#233648] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Clients</span>
              <span className="text-emerald-400 text-sm font-medium">{localCount.customers}</span>
            </div>
            <div className="text-xs text-slate-500">
              Dernière sync: {formatDate(syncStatus.customers)}
            </div>
          </div>

          <div className="bg-[#233648] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Livreurs</span>
              <span className="text-emerald-400 text-sm font-medium">{localCount.livreurs}</span>
            </div>
            <div className="text-xs text-slate-500">
              Dernière sync: {formatDate(syncStatus.livreurs)}
            </div>
          </div>
        </div>
        
        <div className="mt-4 bg-[#233648] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Personnel</span>
            <span className="text-emerald-400 text-sm font-medium">Synchronisation auto</span>
          </div>
          <div className="text-xs text-slate-500">
            Le personnel se synchronise automatiquement depuis l'API lors du chargement de la page /roles
          </div>
        </div>
      </div>

      {/* Sync Options */}
      <div className="bg-[#1b2631] rounded-xl p-6 border border-[#233648]">
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#2b8cee]">settings</span>
          Options de Synchronisation
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Synchroniser les catégories</label>
              <p className="text-slate-400 text-sm">Importer les catégories depuis l'API</p>
            </div>
            <input
              type="checkbox"
              title="Synchroniser les catégories"
              checked={syncOptions.categories}
              onChange={(e) => setSyncOptions({ ...syncOptions, categories: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Synchroniser les articles</label>
              <p className="text-slate-400 text-sm">Importer les articles du menu depuis l'API</p>
            </div>
            <input
              type="checkbox"
              title="Synchroniser les articles"
              checked={syncOptions.menuItems}
              onChange={(e) => setSyncOptions({ ...syncOptions, menuItems: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Synchroniser les clients</label>
              <p className="text-slate-400 text-sm">Importer les clients depuis l'API</p>
            </div>
            <input
              type="checkbox"
              title="Synchroniser les clients"
              checked={syncOptions.customers}
              onChange={(e) => setSyncOptions({ ...syncOptions, customers: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Synchroniser les livreurs</label>
              <p className="text-slate-400 text-sm">Importer les livreurs depuis l'API</p>
            </div>
            <input
              type="checkbox"
              title="Synchroniser les livreurs"
              checked={syncOptions.livreurs}
              onChange={(e) => setSyncOptions({ ...syncOptions, livreurs: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-[#233648]">
            <div>
              <label className="text-white font-medium">Écraser les données locales</label>
              <p className="text-slate-400 text-sm">Remplacer toutes les données locales par celles de l'API</p>
            </div>
            <input
              type="checkbox"
              title="Écraser les données locales"
              checked={syncOptions.overwrite}
              onChange={(e) => setSyncOptions({ ...syncOptions, overwrite: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Sync Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isSyncing
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          {isSyncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Synchronisation en cours...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">sync</span>
              <span>Synchroniser depuis l'API</span>
            </>
          )}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className={`rounded-xl p-6 border ${
          syncResult.success 
            ? 'bg-emerald-900/20 border-emerald-600/50' 
            : 'bg-red-900/20 border-red-600/50'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`material-symbols-outlined text-xl ${
              syncResult.success ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {syncResult.success ? 'check_circle' : 'error'}
            </span>
            <h4 className={`font-bold ${
              syncResult.success ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {syncResult.message}
            </h4>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Catégories synchronisées:</span>
              <span className="text-white font-medium">{syncResult.details.categories.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Articles synchronisés:</span>
              <span className="text-white font-medium">{syncResult.details.menuItems.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Clients synchronisés:</span>
              <span className="text-white font-medium">{syncResult.details.customers.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Livreurs synchronisés:</span>
              <span className="text-white font-medium">{syncResult.details.livreurs.synced}</span>
            </div>
          </div>
          
          {/* Errors */}
          {syncResult.details.categories.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#233648]">
              <p className="text-red-400 text-sm font-medium mb-2">Erreurs catégories:</p>
              <ul className="text-red-300 text-xs space-y-1">
                {syncResult.details.categories.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {syncResult.details.menuItems.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#233648]">
              <p className="text-red-400 text-sm font-medium mb-2">Erreurs articles:</p>
              <ul className="text-red-300 text-xs space-y-1">
                {syncResult.details.menuItems.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {syncResult.details.customers.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#233648]">
              <p className="text-red-400 text-sm font-medium mb-2">Erreurs clients:</p>
              <ul className="text-red-300 text-xs space-y-1">
                {syncResult.details.customers.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {syncResult.details.livreurs.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#233648]">
              <p className="text-red-400 text-sm font-medium mb-2">Erreurs livreurs:</p>
              <ul className="text-red-300 text-xs space-y-1">
                {syncResult.details.livreurs.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-[#233648]">
            <p className="text-slate-500 text-xs">
              Synchronisation terminée le: {formatDate(syncResult.timestamp)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
