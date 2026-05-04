import { useState, useEffect } from 'react';
import SettingsLayout from '../layouts/SettingsLayout';
import { invoke } from '@tauri-apps/api';
import { useActiveRestaurant } from '../services/restaurant-config';
import { createLocalSession, closeLocalSession } from '../services/local-session.service';

interface Session {
  id: string;
  restaurant_id: string;
  type: string;
  date_ouverture: string;
  date_fermeture?: string | null;
  est_ouverte: boolean;
  ca_total: number;
  nombre_commandes: number;
  notes?: string;
  date_creation: string;
  date_modification?: string;
}

type RawSession = Partial<Session> & {
  Id?: string;
  RestaurantId?: string;
  Type?: string;
  DateOuverture?: string;
  DateFermeture?: string | null;
  EstOuverte?: boolean;
  CaTotal?: number;
  NombreCommandes?: number;
  Notes?: string | null;
  DateCreation?: string;
  DateModification?: string | null;
};

interface SessionProduct {
  nom_plat: string;
  quantite: number;
  prix_unitaire_moyen: number;
  montant_total: number;
}

interface SessionWithProducts {
  session: Session;
  products: SessionProduct[];
  total_ventes: number;
  total_articles: number;
}

function formatMontantFCFA(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(montant);
}

function formatSessionDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeSession(raw: RawSession): Session {
  return {
    id: raw.id ?? raw.Id ?? '',
    restaurant_id: raw.restaurant_id ?? raw.RestaurantId ?? '',
    type: raw.type ?? raw.Type ?? 'X',
    date_ouverture: raw.date_ouverture ?? raw.DateOuverture ?? '',
    date_fermeture: raw.date_fermeture ?? raw.DateFermeture ?? null,
    est_ouverte: raw.est_ouverte ?? raw.EstOuverte ?? false,
    ca_total: Number(raw.ca_total ?? raw.CaTotal ?? 0),
    nombre_commandes: Number(raw.nombre_commandes ?? raw.NombreCommandes ?? 0),
    notes: raw.notes ?? raw.Notes ?? undefined,
    date_creation: raw.date_creation ?? raw.DateCreation ?? raw.date_ouverture ?? raw.DateOuverture ?? '',
    date_modification: raw.date_modification ?? raw.DateModification ?? undefined,
  };
}

export default function Sessions() {
  const activeRestaurant = useActiveRestaurant();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionWithProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<{
    sessionType: 'X' | 'Z';
    openingBalance: number;
    notes: string;
  }>({
    sessionType: 'X',
    openingBalance: 0,
    notes: '',
  });

  // Charger les sessions au montage
  useEffect(() => {
    loadSessions();
  }, [activeRestaurant.id]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await invoke<RawSession[]>('get_restaurant_sessions', { 
        restaurantId: activeRestaurant.id,
        ouvertesSeulement: false 
      });
      // Trier par date d'ouverture dÃ©croissante
      const sessions = data.map(normalizeSession);
      sessions.sort((a, b) => new Date(b.date_ouverture).getTime() - new Date(a.date_ouverture).getTime());
      setSessions(sessions);
    } catch (err) {
      setError('Erreur lors du chargement des sessions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (sessionId: string) => {
    try {
      setLoading(true);
      const data = await invoke<SessionWithProducts>('get_session_products', { sessionId });
      if (data) {
        setSelectedSession({
          ...data,
          session: normalizeSession(data.session as RawSession),
          total_ventes: Number(data.total_ventes || 0),
          total_articles: Number(data.total_articles || 0),
        });
        setShowReport(true);
      }
    } catch (err) {
      setError('Erreur lors du chargement du rapport');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    if (!window.confirm('Voulez-vous vraiment clÃ´turer cette session ?')) {
      return;
    }
    try {
      setLoading(true);
      await closeLocalSession(sessionId, { closingBalance: 0, autoOpenNew: false });
      await loadSessions();
      if (selectedSession?.session.id === sessionId) {
        setShowReport(false);
        setSelectedSession(null);
      }
    } catch (err) {
      setError('Erreur lors de la clÃ´ture de la session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      setLoading(true);
      
      // VÃ©rifier d'abord si une session est dÃ©jÃ  ouverte
      const existingRaw = await invoke<RawSession | null>('get_open_cash_session', { 
        restaurantId: activeRestaurant.id 
      });
      const existingSession = existingRaw ? normalizeSession(existingRaw) : null;
      
      if (existingSession) {
        // Une session est dÃ©jÃ  ouverte, afficher une alerte informative
        const message = `Une session de caisse est dÃ©jÃ  ouverte depuis le ${formatSessionDate(existingSession.date_ouverture)}.\n\nVoulez-vous :\n\n1. Voir la session existante\n2. ClÃ´turer la session existante et en crÃ©er une nouvelle\n3. Annuler`;
        
        const choice = window.prompt(message + '\n\nEntrez votre choix (1, 2, ou 3) :');
        
        if (choice === '1') {
          // Voir la session existante
          await handleViewReport(existingSession.id);
          setShowCreateModal(false);
          return;
        } else if (choice === '2') {
          // ClÃ´turer la session existante et en crÃ©er une nouvelle
          if (!window.confirm('ÃŠtes-vous sÃ»r de vouloir clÃ´turer la session existante ?')) {
            return;
          }
          
          await closeLocalSession(existingSession.id, {
            closingBalance: 0,
            notes: 'Fermeture automatique avant création nouvelle session',
            autoOpenNew: false,
          });
          
          // Continuer avec la crÃ©ation de la nouvelle session
        } else {
          // Annuler
          return;
        }
      }
      
      await createLocalSession({
        sessionType: createForm.sessionType,
        openingBalance: createForm.openingBalance,
        notes: createForm.notes || undefined,
      }, activeRestaurant.id);
      
      setShowCreateModal(false);
      setCreateForm({ sessionType: 'X', openingBalance: 0, notes: '' });
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la crÃ©ation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Session en cours (premiÃ¨re ouverte)
  const currentSession = sessions.find(s => s.est_ouverte);

  return (
    <SettingsLayout
      title="Sessions de caisse"
      description="GÃ©rer les sessions X et Z avec dÃ©tails des produits vendus"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Session en cours */}
        <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2b8cee]">point_of_sale</span>
            Session en cours
          </h3>

          {currentSession ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#111a22] p-4 rounded-lg border border-[#233648]">
                  <p className="text-[#92adc9] text-sm mb-1">Type</p>
                  <p className="text-white font-medium text-lg">
                    Rapport {currentSession.type}
                  </p>
                </div>
                <div className="bg-[#111a22] p-4 rounded-lg border border-[#233648]">
                  <p className="text-[#92adc9] text-sm mb-1">Date d'ouverture</p>
                  <p className="text-white font-medium">
                    {formatSessionDate(currentSession.date_ouverture)}
                  </p>
                </div>
                <div className="bg-[#111a22] p-4 rounded-lg border border-[#233648]">
                  <p className="text-[#92adc9] text-sm mb-1">Commandes</p>
                  <p className="text-white font-medium text-lg">
                    {currentSession.nombre_commandes}
                  </p>
                </div>
                <div className="bg-[#111a22] p-4 rounded-lg border border-[#233648]">
                  <p className="text-[#92adc9] text-sm mb-1">CA Total</p>
                  <p className="font-medium text-lg text-green-400">
                    {formatMontantFCFA(currentSession.ca_total)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#233648]">
                <button
                  onClick={() => handleViewReport(currentSession.id)}
                  className="px-4 py-2 bg-[#2b8cee] hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">receipt_long</span>
                  Voir dÃ©tails produits
                </button>
                <button
                  onClick={() => handleCloseSession(currentSession.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  ClÃ´turer
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-[#92adc9] mb-2">lock_clock</span>
              <p className="text-[#92adc9] mb-4">Aucune session en cours</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-[#2b8cee] hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Ouvrir une session
              </button>
            </div>
          )}
        </div>

        {/* Rapport dÃ©taillÃ© (X ou Z) */}
        {showReport && selectedSession && (
          <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2b8cee]">summarize</span>
                Rapport {selectedSession.session.type}
              </h3>
              <button
                onClick={() => setShowReport(false)}
                className="text-[#92adc9] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Informations gÃ©nÃ©rales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#111a22] p-3 rounded-lg border border-[#233648]">
                <p className="text-[#92adc9] text-xs mb-1">Ouverture</p>
                <p className="text-white font-medium text-sm">
                  {formatSessionDate(selectedSession.session.date_ouverture)}
                </p>
              </div>
              <div className="bg-[#111a22] p-3 rounded-lg border border-[#233648]">
                <p className="text-[#92adc9] text-xs mb-1">Fermeture</p>
                <p className="text-white font-medium text-sm">
                  {selectedSession.session.date_fermeture ? formatSessionDate(selectedSession.session.date_fermeture) : 'En cours'}
                </p>
              </div>
              <div className="bg-[#111a22] p-3 rounded-lg border border-[#233648]">
                <p className="text-[#92adc9] text-xs mb-1">Commandes</p>
                <p className="text-white font-medium text-sm">
                  {selectedSession.session.nombre_commandes}
                </p>
              </div>
              <div className="bg-[#111a22] p-3 rounded-lg border border-[#233648]">
                <p className="text-[#92adc9] text-xs mb-1">Chiffre d'affaires</p>
                <p className="text-green-400 font-medium text-lg">
                  {formatMontantFCFA(selectedSession.session.ca_total)}
                </p>
              </div>
            </div>

            {/* Tableau des produits vendus */}
            <div className="bg-[#111a22] rounded-lg border border-[#233648] overflow-hidden">
              <div className="px-4 py-3 bg-[#192633] border-b border-[#233648]">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#92adc9]">shopping_basket</span>
                  DÃ©tail par produit vendu
                </h4>
              </div>

              {selectedSession.products.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#192633] text-[#92adc9] text-xs">
                        <th className="px-4 py-3 text-left font-medium">Produit</th>
                        <th className="px-4 py-3 text-center font-medium">QuantitÃ©</th>
                        <th className="px-4 py-3 text-right font-medium">Prix unitaire moyen</th>
                        <th className="px-4 py-3 text-right font-medium">Montant total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#233648]">
                      {selectedSession.products.map((produit: SessionProduct, index: number) => (
                        <tr key={index} className="hover:bg-[#192633]/50">
                          <td className="px-4 py-3 text-white font-medium">
                            {produit.nom_plat}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-[#2b8cee]/20 text-[#2b8cee] rounded text-sm font-medium">
                              {produit.quantite}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-[#92adc9]">
                            {formatMontantFCFA(produit.prix_unitaire_moyen)}
                          </td>
                          <td className="px-4 py-3 text-right text-white font-medium">
                            {formatMontantFCFA(produit.montant_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#192633] border-t border-[#233648]">
                      <tr>
                        <td className="px-4 py-3 text-white font-bold">TOTAL</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-bold">
                            {selectedSession.products.reduce((sum: number, p: SessionProduct) => sum + p.quantite, 0)}
                          </span>
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold">
                          {formatMontantFCFA(selectedSession.total_ventes)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-3xl text-[#92adc9] mb-2">inbox</span>
                  <p className="text-[#92adc9]">Aucun produit vendu dans cette session</p>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedSession.session.notes && (
              <div className="mt-4 p-3 bg-[#111a22] rounded-lg border border-[#233648]">
                <p className="text-[#92adc9] text-xs mb-1">Notes</p>
                <p className="text-white text-sm">{selectedSession.session.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Historique des sessions */}
        <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#92adc9]">history</span>
            Historique des sessions
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-3xl text-[#92adc9] animate-spin">refresh</span>
              <p className="text-[#92adc9] mt-2">Chargement...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-3xl text-[#92adc9] mb-2">folder_open</span>
              <p className="text-[#92adc9]">Aucune session trouvÃ©e</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#111a22] text-[#92adc9] text-xs border-b border-[#233648]">
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Date ouverture</th>
                    <th className="px-4 py-3 text-left font-medium">Date fermeture</th>
                    <th className="px-4 py-3 text-center font-medium">Commandes</th>
                    <th className="px-4 py-3 text-right font-medium">CA Total</th>
                    <th className="px-4 py-3 text-center font-medium">Statut</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#233648]">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-[#111a22]/50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          session.type === 'Z'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          Rapport {session.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white text-sm">
                        {formatSessionDate(session.date_ouverture)}
                      </td>
                      <td className="px-4 py-3 text-[#92adc9] text-sm">
                        {session.date_fermeture
                          ? formatSessionDate(session.date_fermeture)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-white">
                        {session.nombre_commandes}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {formatMontantFCFA(session.ca_total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          session.est_ouverte
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {session.est_ouverte ? 'Ouverte' : 'FermÃ©e'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewReport(session.id)}
                            className="p-1.5 bg-[#2b8cee]/20 hover:bg-[#2b8cee]/30 text-[#2b8cee] rounded transition-colors"
                            title="Voir le rapport dÃ©taillÃ©"
                          >
                            <span className="material-symbols-outlined text-sm">receipt_long</span>
                          </button>
                          {session.est_ouverte && (
                            <button
                              onClick={() => handleCloseSession(session.id)}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                              title="ClÃ´turer la session"
                            >
                              <span className="material-symbols-outlined text-sm">lock</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de crÃ©ation de session */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-white text-lg font-bold mb-4">Nouvelle session</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[#92adc9] text-sm mb-2">Type de rapport</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCreateForm({ ...createForm, sessionType: 'X' })}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        createForm.sessionType === 'X'
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#111a22] text-[#92adc9] hover:bg-[#233648]'
                      }`}
                    >
                      Rapport X
                    </button>
                    <button
                      onClick={() => setCreateForm({ ...createForm, sessionType: 'Z' })}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        createForm.sessionType === 'Z'
                          ? 'bg-purple-500 text-white'
                          : 'bg-[#111a22] text-[#92adc9] hover:bg-[#233648]'
                      }`}
                    >
                      Rapport Z
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#92adc9] text-sm mb-2">Fond de caisse initial</label>
                  <input
                    type="number"
                    value={createForm.openingBalance}
                    onChange={(e) => setCreateForm({ ...createForm, openingBalance: Number(e.target.value) })}
                    className="w-full bg-[#111a22] border border-[#233648] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#2b8cee]"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-[#92adc9] text-sm mb-2">Notes (optionnel)</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="w-full bg-[#111a22] border border-[#233648] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#2b8cee]"
                    rows={3}
                    placeholder="Notes sur la session..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-[#233648] hover:bg-[#344959] text-white rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#2b8cee] hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'CrÃ©ation...' : 'Ouvrir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-400">error</span>
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
