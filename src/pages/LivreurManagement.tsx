import { useState, useEffect, useCallback } from 'react';
import livreurService, { Livreur } from '../services/livreur.service';
import syncService from '../services/sync.service';
import SettingsLayout from '../layouts/SettingsLayout';
import { useActiveRestaurant } from '../services/restaurant-config';

export default function LivreurManagement() {
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLivreur, setEditingLivreur] = useState<Livreur | null>(null);
  const { id: restaurantId } = useActiveRestaurant();

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    active: true,
  });

  const loadLivreurs = useCallback(async () => {
    setLoading(true);
    try {
      // Auto-sync depuis l'API
      await syncService.syncAll({ categories: false, menuItems: false, customers: false, livreurs: true });
      
      const data = await livreurService.getLivreurs(restaurantId, false);
      setLivreurs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadLivreurs();
  }, [loadLivreurs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLivreur) {
        await livreurService.updateLivreur({
          ...editingLivreur,
          ...formData,
        });
      } else {
        await livreurService.createLivreur(
          livreurService.createLivreurObject({
            restaurantId,
            nom: formData.nom,
            prenom: formData.prenom,
            telephone: formData.telephone || undefined,
            email: formData.email || undefined,
          })
        );
      }
      setShowModal(false);
      setEditingLivreur(null);
      setFormData({ nom: '', prenom: '', telephone: '', email: '', active: true });
      loadLivreurs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    }
  };

  const handleEdit = (livreur: Livreur) => {
    setEditingLivreur(livreur);
    setFormData({
      nom: livreur.nom,
      prenom: livreur.prenom,
      telephone: livreur.telephone || '',
      email: livreur.email || '',
      active: livreur.active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce livreur ?')) return;
    try {
      await livreurService.deleteLivreur(id);
      loadLivreurs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  const handleToggleActive = async (livreur: Livreur) => {
    try {
      await livreurService.updateLivreur({
        ...livreur,
        active: !livreur.active,
      });
      loadLivreurs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    }
  };

  return (
    <SettingsLayout
      title="Livreurs"
      description="Gérez vos livreurs et leur disponibilité."
    >
      <div className="space-y-6">

        <div className="flex justify-end">
          <button
          onClick={() => {
            setEditingLivreur(null);
            setFormData({ nom: '', prenom: '', telephone: '', email: '', active: true });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
          <span className="material-symbols-outlined">add</span>
          Nouveau Livreur
        </button>
      </div>

      {error && (
        <div className="bg-red-600/20 border border-red-600/40 rounded-lg p-4 text-red-200">
          {error}
        </div>
      )}

      <div className="bg-[#1b2631] rounded-xl border border-[#233648] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#233648]">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-[#a4adb6] uppercase">Nom</th>
              <th className="px-4 py-3 text-xs font-bold text-[#a4adb6] uppercase">Prénom</th>
              <th className="px-4 py-3 text-xs font-bold text-[#a4adb6] uppercase">Téléphone</th>
              <th className="px-4 py-3 text-xs font-bold text-[#a4adb6] uppercase">Email</th>
              <th className="px-4 py-3 text-xs font-bold text-[#a4adb6] uppercase">Statut</th>
              <th className="px-4 py-3 text-xs font-bold text-[#a4adb6] uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#233648]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#a4adb6]">
                  Chargement...
                </td>
              </tr>
            ) : livreurs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#a4adb6]">
                  Aucun livreur enregistré
                </td>
              </tr>
            ) : (
              livreurs.map((livreur) => (
                <tr key={livreur.id} className="hover:bg-[#233648]/50">
                  <td className="px-4 py-3 text-white font-medium">{livreur.nom}</td>
                  <td className="px-4 py-3 text-white">{livreur.prenom}</td>
                  <td className="px-4 py-3 text-[#a4adb6]">{livreur.telephone || '—'}</td>
                  <td className="px-4 py-3 text-[#a4adb6]">{livreur.email || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(livreur)}
                      title={livreur.active ? 'Actif' : 'Inactif'}
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        livreur.active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {livreur.active ? 'ACTIF' : 'INACTIF'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(livreur)}
                        title="Modifier"
                        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(livreur.id)}
                        title="Supprimer"
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1b2631] rounded-xl border border-[#233648] p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingLivreur ? 'Modifier Livreur' : 'Nouveau Livreur'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#a4adb6] mb-1">Nom *</label>
                <input
                  type="text"
                  title="Nom du livreur"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#233648] border border-[#30363b] text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-[#a4adb6] mb-1">Prénom *</label>
                <input
                  type="text"
                  title="Prénom du livreur"
                  required
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#233648] border border-[#30363b] text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-[#a4adb6] mb-1">Téléphone</label>
                <input
                  type="tel"
                  title="Téléphone du livreur"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#233648] border border-[#30363b] text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-[#a4adb6] mb-1">Email</label>
                <input
                  type="email"
                  title="Email du livreur"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#233648] border border-[#30363b] text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  title="Livreur actif"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="active" className="text-sm text-white">Actif</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#30363b] text-white hover:bg-[#3a4249] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  {editingLivreur ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </SettingsLayout>
  );
}
