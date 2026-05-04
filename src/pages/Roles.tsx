import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import staffService, { StaffMemberWithPermissions, StaffRole, DEFAULT_PERMISSIONS, StaffPermissions } from '../services/staff.service';
import { useActiveRestaurant } from '../services/restaurant-config';

export default function Roles() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMemberWithPermissions[]>([]);
  const [selectedUser, setSelectedUser] = useState<StaffMemberWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { id: restaurantId } = useActiveRestaurant();

  useEffect(() => {
    loadStaff();
  }, [restaurantId]);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      console.log('[Roles] Chargement du staff pour restaurantId:', restaurantId);
      const data = await staffService.getAllStaff(restaurantId);
      console.log('[Roles] Staff récupéré:', data.length, 'membres');
      console.log('[Roles] Données:', data);
      setStaff(data);
      if (data.length > 0 && !selectedUser) {
        setSelectedUser(data[0]);
      } else if (data.length === 0) {
        console.warn('[Roles] Aucun membre du staff trouvé');
      }
    } catch (err) {
      console.error('[Roles] Erreur lors du chargement du staff:', err);
      setError('Impossible de charger les utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    role: StaffRole;
  }) => {
    try {
      const newMember = await staffService.createStaff(restaurantId, data);
      setStaff([...staff, newMember]);
      setSelectedUser(newMember);
      setShowAddModal(false);
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  const handleUpdateRole = async (role: StaffRole) => {
    if (!selectedUser) return;
    try {
      const updated = await staffService.updateStaff(selectedUser.id, { role });
      setStaff(staff.map(s => s.id === updated.id ? updated : s));
      setSelectedUser(updated);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du rôle:', err);
    }
  };

  const handleUpdatePermission = async (permissionKey: keyof StaffPermissions, value: boolean) => {
    if (!selectedUser) return;
    try {
      const updated = await staffService.updateStaff(selectedUser.id, {
        permissions: { ...selectedUser.permissions, [permissionKey]: value },
      });
      setStaff(staff.map(s => s.id === updated.id ? updated : s));
      setSelectedUser(updated);
    } catch (err) {
      console.error('Erreur lors de la mise à jour des permissions:', err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver cet utilisateur ?')) return;
    try {
      await staffService.deleteStaff(id);
      await loadStaff();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#0f151b] flex-col">
      <div className="flex flex-1 overflow-hidden">
      <aside className="w-full max-w-[400px] flex flex-col border-r border-[#233648] bg-[#111a22]">
        <div className="p-4 border-b border-[#233648]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold">Personnel</h1>
              <p className="text-sm text-slate-400">Gérer les accès et les rôles</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 rounded-lg h-9 px-3 bg-[#2b8cee] hover:bg-blue-600 transition-colors text-white text-sm font-medium"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {staff.filter(s => s.is_active).map(member => (
            <div
              key={member.id}
              onClick={() => setSelectedUser(member)}
              className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                selectedUser?.id === member.id
                  ? 'bg-[#2b8cee]/10 border border-[#2b8cee]/30'
                  : 'hover:bg-[#1a2632] border border-transparent hover:border-[#233648]'
              }`}
            >
              <div className="relative">
                <div className="bg-slate-600 rounded-full h-12 w-12 flex items-center justify-center text-white font-bold">
                  {member.first_name[0]}{member.last_name[0]}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-[#111a22] rounded-full ${
                  member.is_online ? 'bg-green-500' : 'bg-slate-500'
                }`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className={`text-sm font-semibold truncate ${selectedUser?.id === member.id ? 'text-white' : 'text-slate-200'}`}>
                    {member.first_name} {member.last_name}
                  </p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    member.role === 'ADMIN' ? 'bg-[#2b8cee] text-white' :
                    member.role === 'CASHIER' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-[#233648] text-slate-300'
                  }`}>
                    {member.role}
                  </span>
                </div>
                <p className="text-slate-500 text-xs truncate">{member.username}</p>
                {member.last_login && <p className="text-slate-500 text-[10px] mt-0.5">Dernière connexion: {new Date(member.last_login).toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        {!selectedUser ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">Sélectionnez un utilisateur</p>
          </div>
        ) : (
        <>
        <div className="px-8 py-6 border-b border-[#233648] bg-[#111a22]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="bg-slate-600 rounded-full h-20 w-20 ring-4 ring-[#1a2632] flex items-center justify-center text-white text-2xl font-bold">
                  {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold">{selectedUser.first_name} {selectedUser.last_name}</h2>
                  {selectedUser.is_online && (
                    <>
                      <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-xs font-medium text-green-500">Session active</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-slate-400 text-sm mb-3">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">badge</span>
                    {selectedUser.username}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-lg">mail</span>
                    {selectedUser.email}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-300">Rôle:</label>
                  <select
                    title="Rôle utilisateur"
                    value={selectedUser.role}
                    onChange={(e) => handleUpdateRole(e.target.value as StaffRole)}
                    className="bg-[#1a2632] border border-[#233648] text-white text-sm rounded-md focus:ring-[#2b8cee] focus:border-[#2b8cee] p-1.5 px-3 min-w-[140px]"
                  >
                    <option value="ADMIN">Administrateur</option>
                    <option value="MANAGER">Responsable</option>
                    <option value="CASHIER">Caissier</option>
                    <option value="WAITER">Serveur</option>
                    <option value="KITCHEN">Cuisine</option>
                  </select>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="ml-auto px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md text-sm transition-colors"
                  >
                    Désactiver
                  </button>
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
                  <h3 className="font-semibold">Opérations caisse</h3>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <PermissionItem 
                  label="Traiter les remboursements" 
                  description="Autoriser l'utilisateur à émettre des remboursements" 
                  checked={selectedUser.permissions.processRefunds}
                  onChange={(v) => handleUpdatePermission('processRefunds', v)}
                />
                <PermissionItem 
                  label="Appliquer des remises" 
                  description="Appliquer manuellement des remises personnalisées" 
                  checked={selectedUser.permissions.applyDiscounts}
                  onChange={(v) => handleUpdatePermission('applyDiscounts', v)}
                />
                <PermissionItem 
                  label="Annuler des commandes" 
                  description="Annuler les commandes après envoi en cuisine" 
                  checked={selectedUser.permissions.voidOrders}
                  onChange={(v) => handleUpdatePermission('voidOrders', v)}
                />
              </div>
            </div>

            <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#233648] bg-[#233648]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2b8cee]">inventory_2</span>
                  <h3 className="font-semibold">Gestion du stock</h3>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <PermissionItem 
                  label="Gérer les niveaux de stock" 
                  description="Mettre à jour la quantité disponible" 
                  checked={selectedUser.permissions.manageStockLevels}
                  onChange={(v) => handleUpdatePermission('manageStockLevels', v)}
                />
                <PermissionItem 
                  label="Créer des bons d'achat" 
                  description="Générer de nouveaux bons d'achat" 
                  checked={selectedUser.permissions.createPurchaseOrders}
                  onChange={(v) => handleUpdatePermission('createPurchaseOrders', v)}
                />
                <PermissionItem 
                  label="Transférer le stock" 
                  description="Déplacer le stock entre emplacements" 
                  checked={selectedUser.permissions.transferStock}
                  onChange={(v) => handleUpdatePermission('transferStock', v)}
                />
              </div>
            </div>

            <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#233648] bg-[#233648]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2b8cee]">bar_chart</span>
                  <h3 className="font-semibold">Rapports et analyses</h3>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <PermissionItem 
                  label="Voir les rapports de ventes" 
                  description="Accéder aux données de revenus" 
                  checked={selectedUser.permissions.viewSalesReports}
                  onChange={(v) => handleUpdatePermission('viewSalesReports', v)}
                />
                <PermissionItem 
                  label="Voir les journaux du personnel" 
                  description="Consulter les pistes d'audit" 
                  checked={selectedUser.permissions.viewStaffLogs}
                  onChange={(v) => handleUpdatePermission('viewStaffLogs', v)}
                />
              </div>
            </div>

            <div className="bg-[#1a2632] border border-[#233648] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#233648] bg-[#233648]/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2b8cee]">settings</span>
                  <h3 className="font-semibold">Paramètres système</h3>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <PermissionItem 
                  label="Gérer les utilisateurs" 
                  description="Créer et modifier les comptes du personnel" 
                  checked={selectedUser.permissions.manageUsers}
                  onChange={(v) => handleUpdatePermission('manageUsers', v)}
                />
                <PermissionItem 
                  label="Modifier les articles du menu" 
                  description="Changer les prix et les descriptions" 
                  checked={selectedUser.permissions.editMenuItems}
                  onChange={(v) => handleUpdatePermission('editMenuItems', v)}
                />
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </section>
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddUser}
        />
      )}
    </div>
  );
}

function PermissionItem({ label, description, checked, onChange }: { 
  label: string; 
  description: string; 
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-[#233648]/30 rounded-lg transition-colors">
      <div>
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        <p className="text-slate-500 text-xs">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          title={label}
          type="checkbox" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer" 
        />
        <div className="w-9 h-5 bg-[#111a22] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2b8cee] peer-checked:after:bg-white"></div>
      </label>
    </div>
  );
}

function AddUserModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (data: { firstName: string; lastName: string; email: string; username: string; role: StaffRole }) => void;
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    role: 'WAITER' as StaffRole,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.username) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a2632] border border-[#233648] rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Ajouter un utilisateur</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Prénom</label>
            <input
              type="text"
              title="Prénom"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full bg-[#0f151b] border border-[#233648] text-white rounded-md p-2 focus:ring-[#2b8cee] focus:border-[#2b8cee]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nom</label>
            <input
              type="text"
              title="Nom"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full bg-[#0f151b] border border-[#233648] text-white rounded-md p-2 focus:ring-[#2b8cee] focus:border-[#2b8cee]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              title="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#0f151b] border border-[#233648] text-white rounded-md p-2 focus:ring-[#2b8cee] focus:border-[#2b8cee]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nom d'utilisateur</label>
            <input
              type="text"
              title="Nom d'utilisateur"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full bg-[#0f151b] border border-[#233648] text-white rounded-md p-2 focus:ring-[#2b8cee] focus:border-[#2b8cee]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Rôle</label>
            <select
              title="Rôle"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
              className="w-full bg-[#0f151b] border border-[#233648] text-white rounded-md p-2 focus:ring-[#2b8cee] focus:border-[#2b8cee]"
            >
              <option value="ADMIN">Administrateur</option>
              <option value="MANAGER">Responsable</option>
              <option value="CASHIER">Caissier</option>
              <option value="WAITER">Serveur</option>
              <option value="KITCHEN">Cuisine</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#233648] hover:bg-[#2a3f52] text-white rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#2b8cee] hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
