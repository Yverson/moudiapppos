import { useState } from 'react';
import SettingsLayout from '../layouts/SettingsLayout';
import { getActiveRestaurant } from '../services/restaurant-config';
import { TauriClearService } from '../services/tauri-clear.service';

interface TableOption {
  name: string;
  label: string;
  description: string;
}

const DB_NAME = 'moudi-pos-web';

const LOCAL_TABLE_OPTIONS: TableOption[] = [
  { name: 'categories', label: 'Catégories', description: 'Catégories de menu' },
  { name: 'menu_items', label: 'Articles', description: 'Articles du menu' },
  { name: 'customers', label: 'Clients', description: 'Base clients' },
  { name: 'livreurs', label: 'Livreurs', description: 'Liste des livreurs' },
  { name: 'staff', label: 'Personnel', description: 'Membres du personnel' },
  { name: 'orders', label: 'Commandes', description: 'Historique des commandes' },
  { name: 'sync_queue', label: 'File de sync', description: 'File d\'attente de synchronisation' },
  { name: 'cash_sessions', label: 'Sessions', description: 'Sessions de caisse' },
  { name: 'payments', label: 'Paiements', description: 'Historique des paiements' },
  { name: 'cash_movements', label: 'Mouvements', description: 'Mouvements de caisse' },
  { name: 'payment_methods', label: 'Moyens Paiement', description: 'Cartes/paiements enregistrés' },
  { name: 'sync_status', label: 'Sync Status', description: 'État de synchronisation' },
];

const CLOUD_TABLE_OPTIONS: TableOption[] = [
  { name: 'CategoriesMenu', label: 'Catégories', description: 'Catégories de menu' },
  { name: 'Plats', label: 'Plats', description: 'Articles/plats du menu' },
  { name: 'Commandes', label: 'Commandes', description: 'Historique des commandes' },
  { name: 'ArticlesCommande', label: 'Articles Commande', description: 'Lignes de commande' },
  { name: 'HistoriqueStatutsCommande', label: 'Historique Statuts', description: 'Historique des changements de statut' },
  { name: 'Sessions', label: 'Sessions', description: 'Sessions de caisse' },
  { name: 'CashMovements', label: 'Mouvements', description: 'Mouvements de caisse' },
  { name: 'Livraisons', label: 'Livraisons', description: 'Livraisons en cours' },
  { name: 'Paniers', label: 'Paniers', description: 'Paniers actifs' },
  { name: 'ArticlesPanier', label: 'Articles Panier', description: 'Articles dans les paniers' },
  { name: 'Staff', label: 'Personnel', description: 'Membres du personnel' },
  { name: 'Avis', label: 'Avis', description: 'Avis clients' },
  { name: 'Favoris', label: 'Favoris', description: 'Favoris clients' },
];

export default function ClearData() {
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [selectedLocalTables, setSelectedLocalTables] = useState<Set<string>>(new Set());
  const [selectedCloudTables, setSelectedCloudTables] = useState<Set<string>>(new Set());
  const [clearCache, setClearCache] = useState(true);
  const [clearLocalStorage, setClearLocalStorage] = useState(false);

  const toggleLocalTable = (tableName: string) => {
    setSelectedLocalTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  const selectAllLocal = () => {
    setSelectedLocalTables(new Set(LOCAL_TABLE_OPTIONS.map(t => t.name)));
  };

  const unselectAllLocal = () => {
    setSelectedLocalTables(new Set());
  };

  const toggleCloudTable = (tableName: string) => {
    setSelectedCloudTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  const selectAllCloud = () => {
    setSelectedCloudTables(new Set(CLOUD_TABLE_OPTIONS.map(t => t.name)));
  };

  const unselectAllCloud = () => {
    setSelectedCloudTables(new Set());
  };

  const clearSelectedStores = async (): Promise<void> => {
    try {
      const activeRestaurant = getActiveRestaurant();
      
      // Vider les tables spécifiques via Tauri
      if (selectedLocalTables.size > 0) {
        for (const tableName of selectedLocalTables) {
          if (tableName === 'orders') {
            await TauriClearService.clearOrders(activeRestaurant.id);
          }
        }
      }

      // Vider sessionStorage si demandé
      if (clearCache) {
        sessionStorage.clear();
      }

      // Vider localStorage si demandé
      if (clearLocalStorage) {
        localStorage.clear();
      }

    } catch (error) {
      throw error;
    }
  };

  const handleClearLocal = async () => {
    const hasSelection = selectedLocalTables.size > 0 || clearCache || clearLocalStorage;
    if (!hasSelection) {
      alert("Veuillez sélectionner au moins une option à supprimer.");
      return;
    }

    const tableList = selectedLocalTables.size > 0 
      ? `\n\nTables: ${Array.from(selectedLocalTables).join(', ')}` 
      : '';
    const cacheInfo = clearCache ? '\n- Cache et session' : '';
    const localInfo = clearLocalStorage ? '\n- LocalStorage (connexion)' : '';

    if (window.confirm(`Êtes-vous sûr de vouloir vider les données sélectionnées ?${tableList}${cacheInfo}${localInfo}\n\nCette action est irréversible.`)) {
      setLoadingLocal(true);
      try {
        if (clearCache) {
          sessionStorage.clear();
        }

        if (clearLocalStorage) {
          localStorage.clear();
        }

        if (selectedLocalTables.size > 0) {
          await clearSelectedStores();
        }

        alert("Données effacées avec succès. L'application va recharger.");
        window.location.reload();
      } catch (error) {
        alert("Erreur lors de la suppression des données.");
      } finally {
        setLoadingLocal(false);
      }
    }
  };

  const activeRestaurant = getActiveRestaurant();

  const clearCloudTables = async (): Promise<void> => {
    const token = localStorage.getItem('authToken');
    
    if (!activeRestaurant.id || !token) {
      throw new Error('Non authentifié ou aucun restaurant sélectionné');
    }

    const apiUrl = import.meta.env.VITE_API_URL || '';
    
    const response = await fetch(`${apiUrl}/api/admin/clear-tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        RestaurantId: activeRestaurant.id,
        Tables: Array.from(selectedCloudTables),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Erreur lors de la suppression cloud');
    }
  };

  const handleClearCloud = async () => {
    if (selectedCloudTables.size === 0) {
      alert("Veuillez sélectionner au moins une table à supprimer.");
      return;
    }

    if (!activeRestaurant.id) {
      alert("Aucun restaurant actif. Veuillez sélectionner un restaurant dans les paramètres.");
      return;
    }

    const tableList = Array.from(selectedCloudTables).join(', ');
    const restaurantName = activeRestaurant.name || activeRestaurant.id;
    
    if (window.confirm(`ATTENTION: Êtes-vous ABSOLUMENT sûr de vouloir vider les données Cloud ?\n\nRestaurant: ${restaurantName}\n\nTables sélectionnées:\n${tableList}\n\nCette action est irréversible et supprimera uniquement les données de ce restaurant sur le serveur.`)) {
      const confirmText = window.prompt(`Tapez 'CONFIRMER' pour valider la suppression des données du restaurant "${restaurantName}":`);
      if (confirmText === 'CONFIRMER') {
        setLoadingCloud(true);
        try {
          await clearCloudTables();
          alert(`Les données ont été effacées pour le restaurant "${restaurantName}" : ${tableList}`);
          setSelectedCloudTables(new Set());
        } catch (error) {
          alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur lors de la suppression'}`);
        } finally {
          setLoadingCloud(false);
        }
      } else {
        alert("Suppression annulée.");
      }
    }
  };

  return (
    <SettingsLayout
      title="Vider les données"
      description="Gérer la suppression des données de l'application"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">warning</span>
            Vidage Local
          </h3>
          <p className="text-[#92adc9] text-sm mb-4">
            Sélectionnez les données à supprimer. Les données synchronisées sur le cloud ne seront pas affectées.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="clearCache"
                checked={clearCache}
                onChange={(e) => setClearCache(e.target.checked)}
                title="Vider le cache de session"
                className="w-4 h-4 rounded border-[#233648] bg-[#233648] text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="clearCache" className="text-white text-sm cursor-pointer">
                <span className="font-medium">Cache et session</span>
                <span className="text-[#92adc9] ml-2">- SessionStorage temporaire</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="clearLocalStorage"
                checked={clearLocalStorage}
                onChange={(e) => setClearLocalStorage(e.target.checked)}
                title="Vider le LocalStorage (déconnexion)"
                className="w-4 h-4 rounded border-[#233648] bg-[#233648] text-red-500 focus:ring-red-500"
              />
              <label htmlFor="clearLocalStorage" className="text-white text-sm cursor-pointer">
                <span className="font-medium text-red-400">LocalStorage</span>
                <span className="text-[#92adc9] ml-2">- Token et préférences (déconnexion)</span>
              </label>
            </div>
          </div>

          <div className="border-t border-[#233648] pt-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">Tables IndexedDB</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllLocal}
                  className="text-xs px-3 py-1 bg-[#233648] hover:bg-[#2d3d4f] text-[#92adc9] rounded transition-colors"
                >
                  Tout sélectionner
                </button>
                <button
                  type="button"
                  onClick={unselectAllLocal}
                  className="text-xs px-3 py-1 bg-[#233648] hover:bg-[#2d3d4f] text-[#92adc9] rounded transition-colors"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {LOCAL_TABLE_OPTIONS.map((table) => (
                <div
                  key={table.name}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedLocalTables.has(table.name)
                      ? 'bg-amber-500/10 border-amber-500/50'
                      : 'bg-[#233648]/50 border-[#233648] hover:border-[#3d4d5f]'
                  }`}
                  onClick={() => toggleLocalTable(table.name)}
                >
                  <input
                    type="checkbox"
                    checked={selectedLocalTables.has(table.name)}
                    onChange={() => toggleLocalTable(table.name)}
                    title={`Sélectionner ${table.label}`}
                    className="w-4 h-4 mt-0.5 rounded border-[#233648] bg-[#192633] text-amber-500 focus:ring-amber-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{table.label}</div>
                    <div className="text-[#92adc9] text-xs">{table.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleClearLocal}
            disabled={loadingLocal || (selectedLocalTables.size === 0 && !clearCache && !clearLocalStorage)}
            className="px-6 py-2 bg-[#233648] hover:bg-[#30363b] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loadingLocal ? 'Suppression en cours...' : `Vider les données (${selectedLocalTables.size} tables)`}
          </button>
        </div>

        <div className="bg-[#192633] border border-red-900/50 rounded-xl p-6 shadow-sm">
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">dangerous</span>
            Vidage Cloud
          </h3>
          
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/40 rounded-lg">
            <div className="text-red-300 text-sm font-medium mb-1">Restaurant actif :</div>
            <div className="text-white font-semibold">
              {activeRestaurant.name || activeRestaurant.id || 'Aucun restaurant sélectionné'}
            </div>
            <div className="text-red-400/70 text-xs mt-1">
              Les données seront supprimées uniquement pour ce restaurant
            </div>
          </div>

          <p className="text-[#92adc9] text-sm mb-4">
            Sélectionnez les tables à supprimer sur le serveur. Cette action est irréversible et ne concerne que le restaurant affiché ci-dessus.
          </p>

          <div className="border-t border-red-900/30 pt-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">Tables Serveur</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllCloud}
                  className="text-xs px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded transition-colors"
                >
                  Tout sélectionner
                </button>
                <button
                  type="button"
                  onClick={unselectAllCloud}
                  className="text-xs px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded transition-colors"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {CLOUD_TABLE_OPTIONS.map((table) => (
                <div
                  key={table.name}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedCloudTables.has(table.name)
                      ? 'bg-red-500/10 border-red-500/50'
                      : 'bg-[#233648]/50 border-[#233648] hover:border-red-900/50'
                  }`}
                  onClick={() => toggleCloudTable(table.name)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCloudTables.has(table.name)}
                    onChange={() => toggleCloudTable(table.name)}
                    title={`Sélectionner ${table.label}`}
                    className="w-4 h-4 mt-0.5 rounded border-[#233648] bg-[#192633] text-red-500 focus:ring-red-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{table.label}</div>
                    <div className="text-[#92adc9] text-xs">{table.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleClearCloud}
            disabled={loadingCloud || selectedCloudTables.size === 0 || !activeRestaurant.id}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loadingCloud ? 'Suppression en cours...' : `Vider Cloud (${selectedCloudTables.size} tables)`}
          </button>
          
          {!activeRestaurant.id && (
            <p className="text-red-400 text-xs mt-2">
              Aucun restaurant actif. Sélectionnez un restaurant dans les paramètres.
            </p>
          )}
        </div>
      </div>
    </SettingsLayout>
  );
}
