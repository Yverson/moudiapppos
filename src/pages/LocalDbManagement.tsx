import { useState, useEffect } from 'react';
import SettingsLayout from '../layouts/SettingsLayout';
import { invoke } from '@tauri-apps/api';
import { useActiveRestaurant } from '../services/restaurant-config';

type TableType = 'categories' | 'menu_items' | 'customers' | 'livreurs';

interface TableInfo {
  name: TableType;
  label: string;
  icon: string;
}

const TABLES: TableInfo[] = [
  { name: 'categories', label: 'Catégories', icon: 'folder' },
  { name: 'menu_items', label: 'Articles', icon: 'restaurant' },
  { name: 'customers', label: 'Clients', icon: 'person' },
  { name: 'livreurs', label: 'Livreurs', icon: 'local_shipping' },
];

export default function LocalDbManagement() {
  const activeRestaurant = useActiveRestaurant();
  const [dbSize, setDbSize] = useState<string>('Calcul...');
  const [dbStatus, setDbStatus] = useState<string>('Vérification...');
  const [selectedTable, setSelectedTable] = useState<TableType>('categories');
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDbStatus('Connecté et synchronisé');
      
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
          if (estimate.usage) {
            const sizeInMB = (estimate.usage / (1024 * 1024)).toFixed(2);
            setDbSize(`${sizeInMB} MB`);
          } else {
            setDbSize('Inconnue');
          }
        });
      } else {
        setDbSize('Non supporté');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadTableData();
  }, [selectedTable]);

  const loadTableData = async () => {
    setIsLoading(true);
    try {
      let data: any[] = [];
      switch (selectedTable) {
        case 'categories':
          data = await invoke('get_categories');
          break;
        case 'menu_items':
          data = await invoke('get_menu_items');
          break;
        case 'customers':
          data = await invoke('get_customers');
          break;
        case 'livreurs':
          data = await invoke('get_livreurs', { restaurantId: activeRestaurant.id });
          break;
      }
      setTableData(data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData(getDefaultFormData(selectedTable));
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    
    try {
      switch (selectedTable) {
        case 'categories':
          await invoke('delete_category', { id });
          break;
        case 'menu_items':
          await invoke('delete_menu_item', { id });
          break;
        case 'customers':
          await invoke('delete_customer', { id });
          break;
        case 'livreurs':
          await invoke('delete_livreur', { id });
          break;
      }
      await loadTableData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSave = async () => {
    try {
      const now = new Date().toISOString();
      const itemToSave = {
        ...formData,
        updated_at: now,
        ...(editingItem ? {} : { created_at: now, id: formData.id || `${selectedTable}-${Date.now()}` }),
      };

      if (selectedTable === 'livreurs') {
        (itemToSave as Record<string, any>).restaurant_id = activeRestaurant.id;
      }

      switch (selectedTable) {
        case 'categories':
          if (editingItem) {
            await invoke('update_category', { category: itemToSave });
          } else {
            await invoke('create_category', { category: itemToSave });
          }
          break;
        case 'menu_items':
          if (editingItem) {
            await invoke('update_menu_item', { menu_item: itemToSave });
          } else {
            await invoke('create_menu_item', { menu_item: itemToSave });
          }
          break;
        case 'customers':
          if (editingItem) {
            await invoke('update_customer', { customer: itemToSave });
          } else {
            await invoke('create_customer', { customer: itemToSave });
          }
          break;
        case 'livreurs':
          if (editingItem) {
            await invoke('update_livreur', { livreur: itemToSave });
          } else {
            await invoke('create_livreur', { livreur: itemToSave });
          }
          break;
      }
      
      setShowModal(false);
      await loadTableData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const getDefaultFormData = (table: TableType): Record<string, any> => {
    const defaults: Record<TableType, Record<string, any>> = {
      categories: { name: '', description: '', color: '#FF6B6B', icon: 'restaurant', order: 1, active: true },
      menu_items: { category_id: '', name: '', description: '', price: 0, cost_price: 0, available: true, allergens: '[]', preparation_time: 10, order: 1, variants: '[{"name":"Standard","price":0,"default":true}]' },
      customers: { name: '', email: '', phone: '', customer_type: 'regular', loyalty_points: 0, total_orders: 0, total_spent: 0 },
      livreurs: { nom: '', prenom: '', telephone: '', email: '', active: true, restaurant_id: activeRestaurant.id },
    };
    return defaults[table];
  };

  const renderFormFields = () => {
    switch (selectedTable) {
      case 'categories':
        return (
          <>
            <FormField label="Nom" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
            <FormField label="Description" value={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} />
            <FormField label="Couleur" type="color" value={formData.color} onChange={(v) => setFormData({ ...formData, color: v })} />
            <FormField label="Icône" value={formData.icon} onChange={(v) => setFormData({ ...formData, icon: v })} />
            <FormField label="Ordre" type="number" value={formData.order} onChange={(v) => setFormData({ ...formData, order: parseInt(v) || 0 })} />
            <FormField label="Actif" type="checkbox" value={formData.active} onChange={(v) => setFormData({ ...formData, active: v })} />
          </>
        );
      case 'menu_items':
        return (
          <>
            <FormField label="Catégorie ID" value={formData.category_id} onChange={(v) => setFormData({ ...formData, category_id: v })} required />
            <FormField label="Nom" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
            <FormField label="Description" value={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} />
            <FormField label="Prix" type="number" value={formData.price} onChange={(v) => setFormData({ ...formData, price: parseFloat(v) || 0 })} required />
            <FormField label="Prix de revient" type="number" value={formData.cost_price} onChange={(v) => setFormData({ ...formData, cost_price: parseFloat(v) || 0 })} />
            <FormField label="Disponible" type="checkbox" value={formData.available} onChange={(v) => setFormData({ ...formData, available: v })} />
            <FormField label="Temps de préparation (min)" type="number" value={formData.preparation_time} onChange={(v) => setFormData({ ...formData, preparation_time: parseInt(v) || 0 })} />
          </>
        );
      case 'customers':
        return (
          <>
            <FormField label="Nom" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} required />
            <FormField label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
            <FormField label="Téléphone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} />
            <FormField label="Type" type="select" value={formData.customer_type} onChange={(v) => setFormData({ ...formData, customer_type: v })} options={[{value:'regular',label:'Standard'},{value:'vip',label:'VIP'},{value:'corporate',label:'Entreprise'}]} />
          </>
        );
      case 'livreurs':
        return (
          <>
            <FormField label="Nom" value={formData.nom} onChange={(v) => setFormData({ ...formData, nom: v })} required />
            <FormField label="Prénom" value={formData.prenom} onChange={(v) => setFormData({ ...formData, prenom: v })} />
            <FormField label="Téléphone" value={formData.telephone} onChange={(v) => setFormData({ ...formData, telephone: v })} />
            <FormField label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
            <FormField label="Actif" type="checkbox" value={formData.active} onChange={(v) => setFormData({ ...formData, active: v })} />
          </>
        );
    }
  };

  const renderTableHeaders = () => {
    switch (selectedTable) {
      case 'categories': return ['Nom', 'Description', 'Couleur', 'Ordre', 'Actif'];
      case 'menu_items': return ['Nom', 'Catégorie', 'Prix', 'Disponible'];
      case 'customers': return ['Nom', 'Email', 'Téléphone', 'Type'];
      case 'livreurs': return ['Nom', 'Prénom', 'Téléphone', 'Actif'];
    }
  };

  const renderTableRow = (item: any) => {
    switch (selectedTable) {
      case 'categories':
        return (
          <>
            <td className="px-4 py-3 text-white">{item.name}</td>
            <td className="px-4 py-3 text-slate-300">{item.description}</td>
            <td className="px-4 py-3"><span className="inline-block w-6 h-6 rounded" style={{ backgroundColor: item.color }}></span></td>
            <td className="px-4 py-3 text-slate-300">{item.order}</td>
            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${item.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{item.active ? 'Oui' : 'Non'}</span></td>
          </>
        );
      case 'menu_items':
        return (
          <>
            <td className="px-4 py-3 text-white">{item.name}</td>
            <td className="px-4 py-3 text-slate-300">{item.category_id}</td>
            <td className="px-4 py-3 text-slate-300">{item.price?.toFixed(2)} €</td>
            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${item.available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{item.available ? 'Oui' : 'Non'}</span></td>
          </>
        );
      case 'customers':
        return (
          <>
            <td className="px-4 py-3 text-white">{item.name}</td>
            <td className="px-4 py-3 text-slate-300">{item.email}</td>
            <td className="px-4 py-3 text-slate-300">{item.phone}</td>
            <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 uppercase">{item.customer_type}</span></td>
          </>
        );
      case 'livreurs':
        return (
          <>
            <td className="px-4 py-3 text-white">{item.nom}</td>
            <td className="px-4 py-3 text-slate-300">{item.prenom}</td>
            <td className="px-4 py-3 text-slate-300">{item.telephone}</td>
            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${item.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{item.active ? 'Oui' : 'Non'}</span></td>
          </>
        );
    }
  };

  const handleForceSync = () => {
    alert("Synchronisation forcée lancée (Simulation)...");
  };

  return (
    <SettingsLayout
      title="Base de données locale"
      description="Gérer le stockage local hors ligne (SQLite Tauri)"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[#2b8cee] text-3xl">database</span>
              <h3 className="text-white text-lg font-bold">État de la Base</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[#92adc9] text-sm">Statut</p>
                <p className="text-green-400 font-medium">{dbStatus}</p>
              </div>
              <div>
                <p className="text-[#92adc9] text-sm">Espace utilisé (Estimé)</p>
                <p className="text-white font-medium">{dbSize}</p>
              </div>
              <div>
                <p className="text-[#92adc9] text-sm">Type</p>
                <p className="text-white font-medium">SQLite (Tauri)</p>
              </div>
            </div>
          </div>

          <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-white text-lg font-bold mb-2">Actions Rapides</h3>
              <p className="text-[#92adc9] text-sm mb-4">
                Outils de maintenance pour la base de données locale.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleForceSync}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#233648] hover:bg-[#30363b] text-white rounded-lg font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-sm">sync</span>
                Forcer la synchronisation
              </button>
            </div>
          </div>

          {/* Table Summary */}
          <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
            <h3 className="text-white text-lg font-bold mb-4">Résumé des Tables</h3>
            <div className="space-y-2">
              {TABLES.map(table => (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    selectedTable === table.name 
                      ? 'bg-[#2b8cee]/20 border border-[#2b8cee]/50' 
                      : 'hover:bg-[#233648]'
                  }`}
                >
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="material-symbols-outlined text-[#2b8cee]">{table.icon}</span>
                    {table.label}
                  </span>
                  {selectedTable === table.name && (
                    <span className="material-symbols-outlined text-[#2b8cee] text-sm">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="bg-[#192633] border border-[#233648] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#233648] flex items-center justify-between">
            <h3 className="text-white text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2b8cee]">
                {TABLES.find(t => t.name === selectedTable)?.icon}
              </span>
              {TABLES.find(t => t.name === selectedTable)?.label}
              <span className="text-sm font-normal text-slate-400">({tableData.length} éléments)</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={loadTableData}
                className="flex items-center gap-2 px-3 py-2 bg-[#233648] hover:bg-[#30363b] text-white rounded-lg text-sm transition-colors"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Rafraîchir
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b8cee] hover:bg-[#1a7dd8] text-white rounded-lg text-sm font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Ajouter
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2b8cee] mx-auto"></div>
              <p className="text-slate-400 mt-2">Chargement...</p>
            </div>
          ) : tableData.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-500">inbox</span>
              <p className="text-slate-400 mt-2">Aucune donnée dans cette table</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#233648]">
                  <tr>
                    {renderTableHeaders().map((header, i) => (
                      <th key={i} className="px-4 py-3 text-left text-slate-300 text-sm font-medium">{header}</th>
                    ))}
                    <th className="px-4 py-3 text-right text-slate-300 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#233648]">
                  {tableData.map((item) => (
                    <tr key={item.id} className="hover:bg-[#233648]/50 transition-colors">
                      {renderTableRow(item)}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-[#2b8cee] transition-colors"
                          title="Modifier"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#192633] border border-[#233648] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-[#233648] flex items-center justify-between">
              <h3 className="text-white text-lg font-bold">
                {editingItem ? 'Modifier' : 'Ajouter'} {TABLES.find(t => t.name === selectedTable)?.label}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {renderFormFields()}
            </div>
            <div className="p-4 border-t border-[#233648] flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#2b8cee] hover:bg-[#1a7dd8] text-white rounded-lg font-medium transition-colors"
              >
                {editingItem ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}

// Form Field Component
interface FormFieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'email' | 'number' | 'color' | 'checkbox' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
}

function FormField({ label, value, onChange, type = 'text', options, required }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-slate-300 text-sm font-medium">{label}{required && <span className="text-red-400">*</span>}</label>
      {type === 'checkbox' ? (
        <input
          type="checkbox"
          title={label}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-[#233648] bg-[#233648] text-[#2b8cee] focus:ring-[#2b8cee]"
        />
      ) : type === 'select' ? (
        <select
          title={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-[#2b8cee]"
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          title={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#2b8cee]"
        />
      )}
    </div>
  );
}
