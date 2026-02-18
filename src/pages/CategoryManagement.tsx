import { useState } from 'react';
import { useCategory } from '../context/CategoryContext';
import { Category } from '../services/category.service';

export default function CategoryManagement() {
  const { categories, loading, error, createCategory, updateCategory, deleteCategory, reorderCategories } = useCategory();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#FF6B6B',
    icon: 'restaurant',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await createCategory(formData);
      }
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: '#FF6B6B', icon: 'restaurant' });
    } catch (err) {
      console.error('Failed to save category:', err);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      try {
        await deleteCategory(id);
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    }
  };

  const icons = ['restaurant', 'dinner_dining', 'cake', 'local_cafe', 'breakfast_dining', 'lunch_dining', 'tapas', 'pizza'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#101922] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#101922] text-white">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Catégories</h1>
            <p className="text-slate-400 text-sm md:text-base">Gérez les catégories de votre menu.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 h-10 rounded-lg bg-[#2b8cee] hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nouvelle Catégorie</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`relative overflow-hidden rounded-xl p-6 bg-[#1b2631] border border-[#233648] shadow-sm group hover:border-blue-500/30 transition-colors`}
              style={{ borderTopColor: category.color, borderTopWidth: '4px' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center bg-category-icon"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <span className="material-symbols-outlined text-2xl text-category-icon" aria-label={`Icône ${category.icon}`}>
                      {category.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{category.name}</h3>
                    <p className="text-sm text-slate-400">{category.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-2 rounded-lg bg-[#233648] hover:bg-[#30363b] text-slate-400 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 rounded-lg bg-[#233648] hover:bg-red-600/20 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  category.active ? 'bg-green-900/30 text-green-300' : 'bg-gray-900/30 text-gray-400'
                }`}>
                  {category.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-slate-500">Ordre: {category.order}</span>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1b2631] rounded-xl p-6 w-full max-w-md border border-[#233648]">
              <h2 className="text-xl font-bold mb-4">
                {editingCategory ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Nom de la catégorie"
                    title="Nom de la catégorie"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Description de la catégorie"
                    title="Description de la catégorie"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Couleur</label>
                  <div className="flex gap-2">
                    {['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCF7F', '#A78BFA', '#F472B6'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-lg border-2 ${
                          formData.color === color ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title={`Couleur ${color}`}
                        aria-label={`Couleur ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Icône</label>
                  <div className="grid grid-cols-4 gap-2">
                    {icons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-2 rounded-lg border ${
                          formData.icon === icon ? 'border-blue-500 bg-blue-500/20' : 'border-[#30363b] bg-[#233648]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    {editingCategory ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCategory(null);
                      setFormData({ name: '', description: '', color: '#FF6B6B', icon: 'restaurant' });
                    }}
                    className="flex-1 bg-[#233648] hover:bg-[#30363b] text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
