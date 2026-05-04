import { useState, useEffect } from 'react';
import SettingsLayout from '../layouts/SettingsLayout';
import { invoke } from '@tauri-apps/api';
import { useActiveRestaurant } from '../services/restaurant-config';

interface TableCount {
  name: string;
  label: string;
  count: number;
  description: string;
}

const TABLES_TO_CHECK: Omit<TableCount, 'count'>[] = [
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
  { name: 'sync_status', label: 'Sync Status', description: 'État de synchronisation' },
];

export default function CheckLocalData() {
  const [tableCounts, setTableCounts] = useState<TableCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkTableCounts();
  }, []);

  const checkTableCounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const counts: TableCount[] = [];

      for (const table of TABLES_TO_CHECK) {
        const count = await getTableCount(table.name);
        counts.push({
          ...table,
          count
        });
      }

      setTableCounts(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const getTableCount = async (tableName: string): Promise<number> => {
    try {
      // Liste des tables gérées par SQLite dans le backend
      const sqliteTables = [
        'categories', 'menu_items', 'customers', 'livreurs', 'staff', 
        'orders', 'sync_queue', 'cash_sessions', 'payments', 
        'cash_movements', 'sync_status'
      ];

      if (!sqliteTables.includes(tableName)) {
        return 0;
      }

      const count = await invoke<number>('get_table_count', { tableName });
      return count;
    } catch (error) {
      console.error(`Erreur comptage table ${tableName}:`, error);
      return 0;
    }
  };

  if (loading) {
    return (
      <SettingsLayout title="Vérification Données Locales" description="Consultez le nombre d'enregistrements dans chaque table SQLite locale">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-white">Vérification des données en cours...</div>
        </div>
      </SettingsLayout>
    );
  }

  if (error) {
    return (
      <SettingsLayout title="Vérification Données Locales" description="Consultez le nombre d'enregistrements dans chaque table SQLite locale">
        <div className="bg-red-900/20 border border-red-900/40 rounded-lg p-4 mb-6">
          <div className="text-red-300 font-medium">Erreur</div>
          <div className="text-red-100 text-sm mt-1">{error}</div>
        </div>
      </SettingsLayout>
    );
  }

  const totalRecords = tableCounts.reduce((sum, table) => sum + table.count, 0);

  return (
    <SettingsLayout title="Vérification Données Locales" description="Consultez le nombre d'enregistrements dans chaque table SQLite locale">
      <div className="mb-6">
        <div className="bg-[#233648] rounded-lg p-4 border border-[#3d4d5f]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white font-bold text-lg">Total des enregistrements</div>
            <div className="text-2xl font-bold text-amber-500">{totalRecords.toLocaleString()}</div>
          </div>
          <div className="text-[#92adc9] text-sm">
            Tables vérifiées : {tableCounts.length}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={checkTableCounts}
          className="px-4 py-2 bg-[#233648] hover:bg-[#30363b] text-white rounded-lg font-medium transition-colors"
        >
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tableCounts.map((table) => (
          <div
            key={table.name}
            className={`p-4 rounded-lg border transition-colors ${
              table.count === 0 
                ? 'bg-green-900/10 border-green-900/30' 
                : table.count > 0 && table.count < 10
                ? 'bg-amber-900/10 border-amber-900/30'
                : 'bg-red-900/10 border-red-900/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-medium">{table.label}</div>
              <div className={`text-lg font-bold ${
                table.count === 0 
                  ? 'text-green-400' 
                  : table.count > 0 && table.count < 10
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}>
                {table.count.toLocaleString()}
              </div>
            </div>
            <div className="text-[#92adc9] text-xs">{table.description}</div>
            <div className="text-[#92adc9] text-sm">
              Table: {table.name}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-[#233648]/50 rounded-lg border border-[#3d4d5f]">
        <div className="text-[#92adc9] text-sm">
          <div className="font-medium text-white mb-2">Légende des couleurs :</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <span>0 enregistrement (vide)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-400 rounded"></div>
              <span>1-9 enregistrements (peu de données)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span>10+ enregistrements (données significatives)</span>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
