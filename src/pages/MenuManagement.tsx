import { useState } from 'react';
import { useMenu } from '../context/MenuContext';
import { useCategory } from '../context/CategoryContext';
import { MenuItem } from '../services/menu.service';

export default function MenuManagement() {
  const { menuItems, loading, error, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability } = useMenu();
  const { categories } = useCategory();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    price: 0,
    cost_price: 0,
    image_url: '',
    available: true,
    allergens: [] as string[],
    preparation_time: 10,
  });

  const allergenOptions = ['gluten', 'lactose', 'nuts', 'soy', 'fish', 'shellfish', 'eggs', 'sesame'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, formData);
      } else {
        await createMenuItem(formData);
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        category_id: '',
        name: '',
        description: '',
        price: 0,
        cost_price: 0,
        image_url: '',
        available: true,
        allergens: [],
        preparation_time: 10,
      });
    } catch (err) {
      console.error('Failed to save menu item:', err);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      price: item.price,
      cost_price: item.cost_price,
      image_url: item.image_url || '',
      available: item.available,
      allergens: item.allergens,
      preparation_time: item.preparation_time,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      try {
        await deleteMenuItem(id);
      } catch (err) {
        console.error('Failed to delete menu item:', err);
      }
    }
  };

  const handleToggleAvailability = async (id: string) => {
    try {
      await toggleMenuItemAvailability(id);
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  const handleAllergenToggle = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const filteredItems = selectedCategory 
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Inconnue';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#666';
  };

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
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Menu</h1>
            <p className="text-slate-400 text-sm md:text-base">Gérez les articles de votre menu.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 h-10 rounded-lg bg-[#2b8cee] hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nouvel Article</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === '' 
                ? 'bg-blue-600 text-white' 
                : 'bg-[#233648] text-slate-400 hover:bg-[#30363b]'
            }`}
          >
            Toutes les catégories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category.id 
                  ? 'text-white' 
                  : 'bg-[#233648] text-slate-400 hover:bg-[#30363b]'
              }`}
              style={{ 
                backgroundColor: selectedCategory === category.id ? category.color : undefined 
              }}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-xl bg-[#1b2631] border border-[#233648] shadow-sm group hover:border-blue-500/30 transition-colors"
              style={{ borderTopColor: getCategoryColor(item.category_id), borderTopWidth: '4px' }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold">{item.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.available 
                          ? 'bg-green-900/30 text-green-300' 
                          : 'bg-gray-900/30 text-gray-400'
                      }`}>
                        {item.available ? 'Disponible' : 'Indisponible'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{item.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{getCategoryName(item.category_id)}</span>
                      <span>•</span>
                      <span>{item.preparation_time} min</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{item.price.toFixed(2)} €</p>
                    {item.cost_price > 0 && (
                      <p className="text-xs text-slate-500">Coût: {item.cost_price.toFixed(2)} €</p>
                    )}
                  </div>
                </div>

                {item.allergens.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-900/30 text-amber-300"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleAvailability(item.id)}
                    className="flex-1 p-2 rounded-lg bg-[#233648] hover:bg-[#30363b] text-slate-400 hover:text-white transition-colors"
                    title={item.available ? 'Rendre indisponible' : 'Rendre disponible'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {item.available ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 p-2 rounded-lg bg-[#233648] hover:bg-[#30363b] text-slate-400 hover:text-white transition-colors"
                    title="Modifier"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 p-2 rounded-lg bg-[#233648] hover:bg-red-600/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1b2631] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#233648]">
              <h2 className="text-xl font-bold mb-4">
                {editingItem ? 'Modifier l\'Article' : 'Nouvel Article'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Catégorie</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nom</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Nom de l'article"
                      title="Nom de l'article"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Description de l'article"
                    title="Description de l'article"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Prix de vente (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Coût (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Temps de préparation (min)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.preparation_time}
                      onChange={(e) => setFormData({ ...formData, preparation_time: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">URL de l'image</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Allergènes</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {allergenOptions.map((allergen) => (
                      <label key={allergen} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.allergens.includes(allergen)}
                          onChange={() => handleAllergenToggle(allergen)}
                          className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">{allergen}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="available"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
                  />
                  <label htmlFor="available" className="text-sm font-medium cursor-pointer">
                    Disponible à la vente
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    {editingItem ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingItem(null);
                      setFormData({
                        category_id: '',
                        name: '',
                        description: '',
                        price: 0,
                        cost_price: 0,
                        image_url: '',
                        available: true,
                        allergens: [],
                        preparation_time: 10,
                      });
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
