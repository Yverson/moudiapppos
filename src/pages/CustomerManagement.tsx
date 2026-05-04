import { useState } from 'react';
import { useCustomer } from '../context/CustomerContext';
import { Customer } from '../services/customer.service';
import SettingsLayout from '../layouts/SettingsLayout';
import { formatAmount } from '../utils/format';

export default function CustomerManagement() {
  const { customers, loading, error, createCustomer, updateCustomer, deleteCustomer, searchCustomers } = useCustomer();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postal_code: '',
      country: 'France',
    },
    type: 'regular' as 'regular' | 'vip' | 'corporate',
    preferences: {
      dietary: [] as string[],
      allergies: [] as string[],
      favorite_items: [] as string[],
    },
    notes: '',
  });

  const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'kosher'];
  const allergyOptions = ['nuts', 'gluten', 'lactose', 'shellfish', 'eggs', 'soy', 'fish'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
      } else {
        await createCustomer(formData);
      }
      setShowForm(false);
      setEditingCustomer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          postal_code: '',
          country: 'France',
        },
        type: 'regular',
        preferences: {
          dietary: [],
          allergies: [],
          favorite_items: [],
        },
        notes: '',
      });
    } catch (err) {
      console.error('Failed to save customer:', err);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || {
        street: '',
        city: '',
        postal_code: '',
        country: 'France',
      },
      type: customer.type,
      preferences: customer.preferences || {
        dietary: [],
        allergies: [],
        favorite_items: [],
      },
      notes: customer.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        console.error('Failed to delete customer:', err);
      }
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await searchCustomers(query);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search failed:', err);
      }
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  const handleDietaryToggle = (option: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        dietary: prev.preferences.dietary.includes(option)
          ? prev.preferences.dietary.filter(d => d !== option)
          : [...prev.preferences.dietary, option]
      }
    }));
  };

  const handleAllergyToggle = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        allergies: prev.preferences.allergies.includes(allergy)
          ? prev.preferences.allergies.filter(a => a !== allergy)
          : [...prev.preferences.allergies, allergy]
      }
    }));
  };

  const displayCustomers = showSearchResults ? searchResults : customers;

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'vip': return 'bg-purple-900/30 text-purple-300';
      case 'corporate': return 'bg-blue-900/30 text-blue-300';
      default: return 'bg-green-900/30 text-green-300';
    }
  };

  if (loading) {
    return (
      <SettingsLayout
        title="Clients"
        description="Gérez vos clients et leurs préférences."
      >
        <div className="flex items-center justify-center h-64 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Chargement...</p>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      title="Clients"
      description="Gérez vos clients et leurs préférences."
    >
      <div className="max-w-[1400px] mx-auto space-y-8">

        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 h-10 rounded-lg bg-[#2b8cee] hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>Nouveau Client</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full pl-10 pr-4 py-3 bg-[#233648] border border-[#30363b] rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Customer Grid */}
        {displayCustomers.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">group</span>
            <p className="text-lg font-medium">
              {showSearchResults ? 'Aucun résultat pour cette recherche' : 'Aucun client enregistré'}
            </p>
            {!showSearchResults && (
              <p className="text-sm mt-1">Créez votre premier client en cliquant sur "Nouveau Client".</p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCustomers.map((customer) => (
            <div
              key={customer.id}
              className="relative overflow-hidden rounded-xl p-6 bg-[#1b2631] border border-[#233648] shadow-sm group hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold">{customer.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCustomerTypeColor(customer.type)}`}>
                      {customer.type === 'vip' ? 'VIP' : customer.type === 'corporate' ? 'Entreprise' : 'Normal'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-400">
                    <p>{customer.email}</p>
                    <p>{customer.phone}</p>
                    {customer.address && (
                      <p>{customer.address.city}, {customer.address.postal_code}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-2 rounded-lg bg-[#233648] hover:bg-[#30363b] text-slate-400 hover:text-white transition-colors"
                    title="Modifier"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-2 rounded-lg bg-[#233648] hover:bg-red-600/20 text-slate-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Points fidélité:</span>
                  <span className="font-medium text-amber-400">{customer.loyalty_points}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Commandes:</span>
                  <span className="font-medium">{customer.total_orders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total dépensé:</span>
                  <span className="font-medium text-emerald-400">{formatAmount(customer.total_spent)}</span>
                </div>
              </div>

              {customer.notes && (
                <div className="mt-4 pt-4 border-t border-[#233648]">
                  <p className="text-xs text-slate-400 italic">{customer.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1b2631] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#233648]">
              <h2 className="text-xl font-bold mb-4">
                {editingCustomer ? 'Modifier le Client' : 'Nouveau Client'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Nom du client"
                      title="Nom du client"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="email@example.com"
                      title="Email du client"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="+33612345678"
                      title="Téléphone du client"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Type de client</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'regular' | 'vip' | 'corporate' })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      title="Type de client"
                    >
                      <option value="regular">Normal</option>
                      <option value="vip">VIP</option>
                      <option value="corporate">Entreprise</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Adresse</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        address: { ...formData.address, street: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Rue"
                    />
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        address: { ...formData.address, city: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Ville"
                    />
                    <input
                      type="text"
                      value={formData.address.postal_code}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        address: { ...formData.address, postal_code: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Code postal"
                    />
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        address: { ...formData.address, country: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Pays"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Préférences alimentaires</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {dietaryOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.preferences.dietary.includes(option)}
                          onChange={() => handleDietaryToggle(option)}
                          className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Allergies</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {allergyOptions.map((allergy) => (
                      <label key={allergy} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.preferences.allergies.includes(allergy)}
                          onChange={() => handleAllergyToggle(allergy)}
                          className="w-4 h-4 text-blue-600 bg-[#233648] border-[#30363b] rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">{allergy}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#233648] border border-[#30363b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Notes sur le client..."
                    title="Notes sur le client"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    {editingCustomer ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCustomer(null);
                      setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        address: {
                          street: '',
                          city: '',
                          postal_code: '',
                          country: 'France',
                        },
                        type: 'regular',
                        preferences: {
                          dietary: [],
                          allergies: [],
                          favorite_items: [],
                        },
                        notes: '',
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
    </SettingsLayout>
  );
}
