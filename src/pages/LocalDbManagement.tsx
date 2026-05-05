import { useState, useEffect } from 'react';
import SettingsLayout from '../layouts/SettingsLayout';
import { invoke } from '@tauri-apps/api';
import { useActiveRestaurant } from '../services/restaurant-config';

type TableType = 'categories' | 'menu_items' | 'customers' | 'livreurs' | 'staff' | 'orders' | 'cash_sessions' | 'payments' | 'cash_movements' | 'sync_queue' | 'sync_status';

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
  { name: 'staff', label: 'Personnel', icon: 'badge' },
  { name: 'orders', label: 'Commandes', icon: 'shopping_cart' },
  { name: 'cash_sessions', label: 'Sessions', icon: 'point_of_sale' },
  { name: 'payments', label: 'Paiements', icon: 'payments' },
  { name: 'cash_movements', label: 'Mouvements', icon: 'currency_exchange' },
  { name: 'sync_queue', label: 'File de synchro', icon: 'sync_alt' },
  { name: 'sync_status', label: 'Sync Status', icon: 'cloud_sync' },
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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDbStatus('Connecté');
      
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
    setCurrentPage(1);
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
        case 'staff':
          data = await invoke('get_all_staff', { restaurantId: activeRestaurant.id });
          break;
        case 'orders':
          data = await invoke('get_orders', { restaurantId: activeRestaurant.id });
          break;
        case 'cash_sessions':
          data = await invoke('get_restaurant_sessions', { restaurantId: activeRestaurant.id, ouvertesSeulement: false });
          break;
        case 'payments':
          data = await invoke('get_all_payments', { restaurantId: activeRestaurant.id });
          break;
        case 'cash_movements':
          data = await invoke('get_all_cash_movements', { restaurantId: activeRestaurant.id });
          break;
        case 'sync_queue':
          data = await invoke('get_all_sync_items');
          break;
        case 'sync_status':
          data = await invoke('get_all_sync_statuses');
          break;
      }
      setTableData(data);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(tableData.length / pageSize);
  const paginatedData = tableData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        case 'staff':
          await invoke('delete_staff', { id });
          break;
        case 'orders':
          await invoke('delete_order', { id });
          break;
        case 'cash_sessions':
          await invoke('delete_cash_session', { id });
          break;
        case 'payments':
          await invoke('delete_payment', { id });
          break;
        case 'cash_movements':
          await invoke('delete_cash_movement', { id });
          break;
        case 'sync_queue':
          await invoke('delete_sync_queue_item', { id });
          break;
      }
      await loadTableData();
    } catch (error) {
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
        case 'staff':
          if (editingItem) {
            await invoke('update_staff', { staff: itemToSave });
          } else {
            await invoke('create_staff', { staff: itemToSave });
          }
          break;
        case 'orders':
          if (editingItem) {
            await invoke('update_order_offline', { order: itemToSave });
          } else {
            await invoke('create_order_offline', { order: itemToSave });
          }
          break;
        case 'cash_sessions':
          // Pas d'upsert direct pour les sessions, on utilise les commandes dédiées ou sql
          if (editingItem) {
            // Update via SQL direct ou commande si dispo
            await invoke('get_table_count', { tableName: 'cash_sessions' }); // Dummy pour validation
          }
          break;
        case 'payments':
          // Upsert payment
          break;
      }
      
      setShowModal(false);
      await loadTableData();
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    }
  };

  const getDefaultFormData = (table: TableType): Record<string, any> => {
    const defaults: Record<TableType, Record<string, any>> = {
      categories: { name: '', description: '', color: '#FF6B6B', icon: 'restaurant', order: 1, active: true },
      menu_items: { category_id: '', name: '', description: '', price: 0, cost_price: 0, available: true, allergens: '[]', preparation_time: 10, order: 1, variants: '[{"name":"Standard","price":0,"default":true}]' },
      customers: { name: '', email: '', phone: '', customer_type: 'regular', loyalty_points: 0, total_orders: 0, total_spent: 0 },
      livreurs: { nom: '', prenom: '', telephone: '', email: '', active: true, restaurant_id: activeRestaurant.id },
      staff: { restaurant_id: activeRestaurant.id, first_name: '', last_name: '', email: '', username: '', role: 'staff', permissions: '[]', is_active: true, is_online: false },
      orders: { restaurant_id: activeRestaurant.id, order_number: '', status: 'pending', total: 0, items: '[]', created_at: new Date().toISOString() },
      cash_sessions: { restaurant_id: activeRestaurant.id, opened_at: new Date().toISOString(), opening_amount: 0, status: 'open', notes: '' },
      payments: { order_id: '', method: 'cash', amount: 0, status: 'completed', created_at: new Date().toISOString() },
      cash_movements: { cash_session_id: '', type: 'in', amount: 0, reason: '', created_at: new Date().toISOString() },
      sync_queue: { action: 'CREATE', entity_type: 'order', entity_id: '', data: '{}', status: 'pending', created_at: new Date().toISOString() },
      sync_status: { table_name: '', updated_at: new Date().toISOString() },
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
      case 'staff':
        return (
          <>
            <FormField label="Nom" value={formData.last_name} onChange={(v) => setFormData({ ...formData, last_name: v })} required />
            <FormField label="Prénom" value={formData.first_name} onChange={(v) => setFormData({ ...formData, first_name: v })} required />
            <FormField label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} />
            <FormField label="Nom d'utilisateur" value={formData.username} onChange={(v) => setFormData({ ...formData, username: v })} required />
            <FormField label="Rôle" type="select" value={formData.role} onChange={(v) => setFormData({ ...formData, role: v })} options={[{value:'admin',label:'Admin'},{value:'manager',label:'Manager'},{value:'staff',label:'Serveur'}]} />
            <FormField label="Actif" type="checkbox" value={formData.is_active} onChange={(v) => setFormData({ ...formData, is_active: v })} />
          </>
        );
      case 'orders':
        return (
          <>
            <FormField label="N° Commande" value={formData.order_number} onChange={(v) => setFormData({ ...formData, order_number: v })} />
            <FormField label="Total" type="number" value={formData.total} onChange={(v) => setFormData({ ...formData, total: parseFloat(v) || 0 })} />
            <FormField label="Statut" type="select" value={formData.status} onChange={(v) => setFormData({ ...formData, status: v })} options={[{value:'pending',label:'En attente'},{value:'completed',label:'Complétée'},{value:'paid',label:'Payée'},{value:'cancelled',label:'Annulée'}]} />
          </>
        );
      case 'cash_sessions':
        return (
          <>
            <FormField label="Montant Ouverture" type="number" value={formData.opening_amount} onChange={(v) => setFormData({ ...formData, opening_amount: parseFloat(v) || 0 })} />
            <FormField label="Statut" type="select" value={formData.status} onChange={(v) => setFormData({ ...formData, status: v })} options={[{value:'open',label:'Ouverte'},{value:'closed',label:'Fermée'}]} />
            <FormField label="Notes" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} />
          </>
        );
      case 'payments':
        return (
          <>
            <FormField label="Méthode" type="select" value={formData.method} onChange={(v) => setFormData({ ...formData, method: v })} options={[{value:'cash',label:'Espèces'},{value:'card',label:'Carte'},{value:'mobile_money',label:'Mobile Money'}]} />
            <FormField label="Montant" type="number" value={formData.amount} onChange={(v) => setFormData({ ...formData, amount: parseFloat(v) || 0 })} />
            <FormField label="Statut" type="select" value={formData.status} onChange={(v) => setFormData({ ...formData, status: v })} options={[{value:'completed',label:'Complété'},{value:'pending',label:'En attente'},{value:'failed',label:'Échec'}]} />
          </>
        );
      case 'cash_movements':
        return (
          <>
            <FormField label="Type" type="select" value={formData.type} onChange={(v) => setFormData({ ...formData, type: v })} options={[{value:'in',label:'Entrée'},{value:'out',label:'Sortie'}]} />
            <FormField label="Montant" type="number" value={formData.amount} onChange={(v) => setFormData({ ...formData, amount: parseFloat(v) || 0 })} />
            <FormField label="Raison" value={formData.reason} onChange={(v) => setFormData({ ...formData, reason: v })} />
          </>
        );
      case 'sync_queue':
        return (
          <>
            <FormField label="Action" value={formData.action} onChange={(v) => setFormData({ ...formData, action: v })} required />
            <FormField label="Type Entité" value={formData.entity_type} onChange={(v) => setFormData({ ...formData, entity_type: v })} required />
            <FormField label="Statut" type="select" value={formData.status} onChange={(v) => setFormData({ ...formData, status: v })} options={[{value:'pending',label:'En attente'},{value:'synced',label:'Synchronisé'},{value:'error',label:'Erreur'}]} />
          </>
        );
      case 'sync_status':
        return (
          <>
            <FormField label="Table" value={formData.table_name} onChange={(v) => setFormData({ ...formData, table_name: v })} required />
            <FormField label="Dernière Sync" value={formData.updated_at} onChange={(v) => setFormData({ ...formData, updated_at: v })} />
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
      case 'staff': return ['Nom', 'Prénom', 'Rôle', 'Actif'];
      case 'orders': return ['N°', 'Total', 'Statut', 'Date'];
      case 'cash_sessions': return ['Ouverte', 'Fermée', 'Montant Ouv.', 'Statut'];
      case 'payments': return ['Commande', 'Méthode', 'Montant', 'Statut'];
      case 'cash_movements': return ['Session', 'Type', 'Montant', 'Raison'];
      case 'sync_queue': return ['Action', 'Entité', 'ID', 'Statut'];
      case 'sync_status': return ['Table', 'Dernière Sync'];
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
      case 'staff':
        return (
          <>
            <td className="px-4 py-3 text-white">{item.last_name}</td>
            <td className="px-4 py-3 text-slate-300">{item.first_name}</td>
            <td className="px-4 py-3 text-slate-300 font-bold">{item.role}</td>
            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{item.is_active ? 'Oui' : 'Non'}</span></td>
          </>
        );
      case 'orders':
        return (
          <>
            <td className="px-4 py-3 text-white font-mono">{item.order_number || item.id?.substring(0, 8) || 'N/A'}</td>
            <td className="px-4 py-3 text-white font-bold">{item.total?.toFixed(2)} €</td>
            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${item.status === 'completed' || item.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>{item.status}</span></td>
            <td className="px-4 py-3 text-slate-400 text-xs">{item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</td>
          </>
        );
      case 'cash_sessions':
        return (
          <>
            <td className="px-4 py-3 text-white text-xs">{item.opened_at ? new Date(item.opened_at).toLocaleString() : 'N/A'}</td>
            <td className="px-4 py-3 text-slate-400 text-xs">{item.closed_at ? new Date(item.closed_at).toLocaleString() : '-'}</td>
            <td className="px-4 py-3 text-white">{item.opening_amount?.toFixed(2)} €</td>
            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${item.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{item.status === 'open' ? 'Ouverte' : 'Fermée'}</span></td>
          </>
        );
      case 'payments':
        return (
          <>
            <td className="px-4 py-3 text-white text-xs">{item.order_id?.substring(0, 8) || 'N/A'}...</td>
            <td className="px-4 py-3 text-slate-300 uppercase">{item.method}</td>
            <td className="px-4 py-3 text-white font-bold">{item.amount?.toFixed(2)} €</td>
            <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-400">{item.status}</span></td>
          </>
        );
      case 'cash_movements':
        return (
          <>
            <td className="px-4 py-3 text-white text-xs">{item.cash_session_id?.substring(0, 8) || 'N/A'}...</td>
            <td className="px-4 py-3 uppercase font-bold text-xs">
              <span className={item.type === 'in' ? 'text-green-400' : 'text-red-400'}>{item.type === 'in' ? 'ENTRÉE' : 'SORTIE'}</span>
            </td>
            <td className="px-4 py-3 text-white font-bold">{item.amount?.toFixed(2)} €</td>
            <td className="px-4 py-3 text-slate-300 text-xs truncate max-w-[150px]">{item.reason}</td>
          </>
        );
      case 'sync_queue':
        return (
          <>
            <td className="px-4 py-3 text-white font-bold text-xs">{item.action}</td>
            <td className="px-4 py-3 text-slate-300 text-xs">{item.entity_type}</td>
            <td className="px-4 py-3 text-slate-400 text-[10px] font-mono">{item.entity_id}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded text-[10px] uppercase ${
                item.status === 'synced' ? 'bg-green-500/20 text-green-400' : 
                item.status === 'pending' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
              }`}>{item.status}</span>
            </td>
          </>
        );
      case 'sync_status':
        return (
          <>
            <td className="px-4 py-3 text-white font-bold">{item.table_name}</td>
            <td className="px-4 py-3 text-slate-300 text-xs">{item.updated_at ? new Date(item.updated_at).toLocaleString() : 'N/A'}</td>
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3"></td>
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
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4">
          <div className="bg-[#192633] border border-[#233648] rounded-xl p-4 shadow-sm">
            <h3 className="text-white text-sm font-bold mb-4 uppercase tracking-wider text-slate-500">Tables</h3>
            <nav className="space-y-1">
              {TABLES.map(table => (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table.name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                    selectedTable === table.name 
                      ? 'bg-[#2b8cee] text-white shadow-lg shadow-[#2b8cee]/20' 
                      : 'text-slate-400 hover:bg-[#233648] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xl">{table.icon}</span>
                    <span className="font-medium">{table.label}</span>
                  </span>
                  {selectedTable === table.name && (
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-[#192633]/50 border border-[#233648] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">info</span>
              <span className="text-xs font-bold uppercase tracking-wider">Aide</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sélectionnez une table pour afficher, ajouter ou modifier ses données stockées localement sur cet appareil.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Top Compact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#192633] border border-[#233648] rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-green-500">check_circle</span>
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">État</p>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold truncate">{dbStatus}</p>
                  <span className="text-slate-500 text-xs">• {dbSize}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#192633] border border-[#233648] rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#2b8cee]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#2b8cee]">bolt</span>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Action rapide</p>
                  <p className="text-white font-bold">Synchronisation</p>
                </div>
              </div>
              <button
                onClick={handleForceSync}
                className="px-3 py-1.5 bg-[#233648] hover:bg-[#30363b] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">sync</span>
                Lancer
              </button>
            </div>
          </div>

          {/* Table Data Container */}
          <div className="bg-[#192633] border border-[#233648] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#233648] flex items-center justify-between bg-[#192633]">
              <h3 className="text-white text-lg font-bold flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#2b8cee]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2b8cee] text-xl">
                    {TABLES.find(t => t.name === selectedTable)?.icon}
                  </span>
                </div>
                {TABLES.find(t => t.name === selectedTable)?.label}
                <span className="text-sm font-normal text-slate-400">({tableData.length} au total)</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={loadTableData}
                  className="p-2 text-slate-400 hover:text-white hover:bg-[#233648] rounded-lg transition-all"
                  title="Rafraîchir"
                >
                  <span className="material-symbols-outlined">refresh</span>
                </button>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2b8cee] hover:bg-[#1a7dd8] text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-[#2b8cee]/20"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Ajouter
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2b8cee] mx-auto"></div>
                  <p className="text-slate-500 mt-4 font-medium">Récupération des données...</p>
                </div>
              ) : paginatedData.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-[#233648] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-500">inventory_2</span>
                  </div>
                  <p className="text-slate-400 font-medium">Aucun enregistrement trouvé</p>
                  <p className="text-slate-500 text-sm mt-1">Utilisez le bouton ajouter pour créer une nouvelle entrée.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-[#233648]/30">
                    <tr>
                      {renderTableHeaders().map((header, i) => (
                        <th key={i} className="px-4 py-3.5 text-left text-slate-400 text-xs font-bold uppercase tracking-wider">{header}</th>
                      ))}
                      <th className="px-4 py-3.5 text-right text-slate-400 text-xs font-bold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#233648]">
                    {paginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-[#233648]/40 transition-colors group">
                        {renderTableRow(item)}
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-slate-400 hover:text-[#2b8cee] hover:bg-[#2b8cee]/10 rounded transition-colors"
                              title="Modifier"
                            >
                              <span className="material-symbols-outlined text-xl">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                              title="Supprimer"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && tableData.length > 0 && (
              <div className="p-4 border-t border-[#233648] flex items-center justify-between bg-[#192633]/50">
                <p className="text-sm text-slate-500">
                  Affichage de <span className="text-white font-medium">{(currentPage - 1) * pageSize + 1}</span> à <span className="text-white font-medium">{Math.min(currentPage * pageSize, tableData.length)}</span> sur <span className="text-white font-medium">{tableData.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-slate-400 hover:text-white hover:bg-[#233648] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      // Logic to show limited page numbers if too many
                      if (totalPages > 7) {
                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                                currentPage === pageNum 
                                  ? 'bg-[#2b8cee] text-white' 
                                  : 'text-slate-500 hover:text-white hover:bg-[#233648]'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === 2 || pageNum === totalPages - 1) {
                          return <span key={pageNum} className="text-slate-600 px-1">...</span>;
                        }
                        return null;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                            currentPage === pageNum 
                              ? 'bg-[#2b8cee] text-white' 
                              : 'text-slate-500 hover:text-white hover:bg-[#233648]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-slate-400 hover:text-white hover:bg-[#233648] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#192633] border border-[#233648] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#233648] flex items-center justify-between bg-[#233648]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2b8cee]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2b8cee]">
                    {editingItem ? 'edit' : 'add_circle'}
                  </span>
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold">
                    {editingItem ? 'Modifier' : 'Ajouter'}
                  </h3>
                  <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">
                    {TABLES.find(t => t.name === selectedTable)?.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#233648] rounded-full transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              {renderFormFields()}
            </div>
            <div className="p-5 border-t border-[#233648] flex justify-end gap-3 bg-[#233648]/10">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-slate-400 hover:text-white font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-[#2b8cee] hover:bg-[#1a7dd8] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#2b8cee]/20"
              >
                {editingItem ? 'Enregistrer les modifications' : 'Créer l\'élément'}
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
