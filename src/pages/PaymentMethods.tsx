import React, { useState } from 'react';
import { usePaymentMethods } from '../context/PaymentMethodContext';
import PaymentMethodCard from '../components/PaymentMethodCard';
import SettingsLayout from '../layouts/SettingsLayout';

const PaymentMethods: React.FC = () => {
  const {
    paymentMethods,
    loading,
    error,
    createPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    syncFromCloud,
  } = usePaymentMethods();

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'card',
    last_4_digits: '',
    brand: '',
    expiry_month: '',
    expiry_year: '',
    is_default: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPaymentMethod({
        type: formData.type,
        last_4_digits: formData.last_4_digits,
        brand: formData.brand,
        expiry_month: formData.expiry_month ? parseInt(formData.expiry_month) : undefined,
        expiry_year: formData.expiry_year ? parseInt(formData.expiry_year) : undefined,
        is_default: formData.is_default,
      });
      setShowAddModal(false);
      setFormData({
        type: 'card',
        last_4_digits: '',
        brand: '',
        expiry_month: '',
        expiry_year: '',
        is_default: false,
      });
    } catch (err) {
      console.error('Erreur lors de la création:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce moyen de paiement ?')) {
      try {
        await deletePaymentMethod(id);
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
    } catch (err) {
      console.error('Erreur lors de la définition par défaut:', err);
    }
  };

  return (
    <SettingsLayout
      title="Moyens de paiement"
      description="Gérez vos méthodes de paiement."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-end">
          <div className="flex gap-2">
            <button
              onClick={() => syncFromCloud()}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              🔄 Synchroniser
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement...</div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl mb-2">Aucun moyen de paiement</p>
            <p className="text-sm">Ajoutez votre premier moyen de paiement</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {paymentMethods.map((pm) => (
              <PaymentMethodCard
                key={pm.id}
                paymentMethod={pm}
                onSetDefault={handleSetDefault}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-4">Ajouter un moyen de paiement</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Type</label>
                  <select
                    title="Type de moyen de paiement"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="card">Carte bancaire</option>
                    <option value="paypal">PayPal</option>
                    <option value="apple_pay">Apple Pay</option>
                    <option value="google_pay">Google Pay</option>
                  </select>
                </div>

                {formData.type === 'card' && (
                  <>
                    <div>
                      <label className="block text-gray-300 mb-2">Marque</label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Visa, Mastercard, etc."
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 mb-2">4 derniers chiffres</label>
                      <input
                        type="text"
                        value={formData.last_4_digits}
                        onChange={(e) => setFormData({ ...formData, last_4_digits: e.target.value })}
                        placeholder="4242"
                        maxLength={4}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 mb-2">Mois d'expiration</label>
                        <input
                          type="number"
                          value={formData.expiry_month}
                          onChange={(e) => setFormData({ ...formData, expiry_month: e.target.value })}
                          placeholder="12"
                          min="1"
                          max="12"
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">Année d'expiration</label>
                        <input
                          type="number"
                          value={formData.expiry_year}
                          onChange={(e) => setFormData({ ...formData, expiry_year: e.target.value })}
                          placeholder="2025"
                          min={new Date().getFullYear()}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_default" className="text-gray-300">
                    Définir comme moyen de paiement par défaut
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
};

export default PaymentMethods;
