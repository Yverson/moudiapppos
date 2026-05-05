import { useEffect, useMemo, useState } from 'react';
import SyncSettings from '../components/SyncSettings';
import SettingsLayout from '../layouts/SettingsLayout';
import restaurantService, { RestaurantOption } from '../services/restaurant.service';
import syncService from '../services/sync.service';
import bidirectionalSyncService from '../services/bidirectional-sync.service';
import statsService from '../services/stats.service';
import { getActiveRestaurant, setActiveRestaurant, useActiveRestaurant } from '../services/restaurant-config';

export default function Settings() {
  const activeRestaurant = useActiveRestaurant();
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [restaurantsError, setRestaurantsError] = useState<string | null>(null);
  const [restaurantsSource, setRestaurantsSource] = useState<'api' | 'cache'>('api');

  useEffect(() => {
    let mounted = true;

    const loadRestaurants = async () => {
      setLoadingRestaurants(true);
      setRestaurantsError(null);

      try {
        const data = await restaurantService.getOwnerRestaurants();
        if (!mounted) return;

        setRestaurants(data);
        setRestaurantsSource(restaurantService.getLastOwnerRestaurantsSource());
        const current = getActiveRestaurant();
        const selected = data.find((restaurant) => restaurant.id === current.id);

        if (selected && !current.name) {
          setActiveRestaurant({ id: selected.id, name: selected.nom });
        }
      } catch (error) {
        if (!mounted) return;
        const cachedRestaurants = restaurantService.getCachedOwnerRestaurants();

        if (cachedRestaurants.length > 0) {
          setRestaurants(cachedRestaurants);
          setRestaurantsSource('cache');
          setRestaurantsError("Mode hors ligne: affichage de la derniere liste sauvegardee localement.");
        } else {
          setRestaurantsError(
            error instanceof Error
              ? error.message
              : "Impossible de charger les entreprises depuis le web.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingRestaurants(false);
        }
      }
    };

    loadRestaurants();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === activeRestaurant.id),
    [activeRestaurant.id, restaurants],
  );

  const handleRestaurantChange = (restaurantId: string) => {
    if (!restaurantId || restaurantId === activeRestaurant.id) return;

    const nextRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId);
    if (!nextRestaurant) return;

    const confirmed = window.confirm(
      `Changer l'entreprise active vers "${nextRestaurant.nom}" ? Les prochaines donnees et synchronisations utiliseront cet etablissement.`,
    );

    if (!confirmed) return;

    setActiveRestaurant({ id: nextRestaurant.id, name: nextRestaurant.nom });
    syncService.setRestaurantId(nextRestaurant.id);
    syncService.setRestaurantName(nextRestaurant.nom);
    bidirectionalSyncService.setRestaurantId(nextRestaurant.id);
    statsService.setRestaurantId(nextRestaurant.id);
  };

  return (
    <SettingsLayout
      title="Paramètres généraux"
      description="Gérer les informations de l'établissement, la marque et les reçus."
      showSaveButton={true}
      onSave={() => {}}
    >
      <div className="space-y-8">
        <section className="max-w-4xl mx-auto">
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#2b8cee]">business</span>
            Entreprise active
          </h3>
          <div className="bg-[#192633] border border-[#233648] rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-[#92adc9] text-sm font-medium">Entreprise / Ã©tablissement</label>
                <select
                  title="Entreprise active"
                  value={activeRestaurant.id}
                  onChange={(event) => handleRestaurantChange(event.target.value)}
                  disabled={loadingRestaurants || restaurants.length === 0}
                  className="w-full bg-[#111a22] border-[#324d67] rounded-lg text-white focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {selectedRestaurant ? null : (
                    <option value={activeRestaurant.id}>
                      {activeRestaurant.name || activeRestaurant.id}
                    </option>
                  )}
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.nom}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-11 px-4 rounded-lg bg-[#233648] hover:bg-[#30363b] text-white text-sm font-medium transition-colors"
              >
                Recharger
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-[#111a22] border border-[#233648] p-3">
                <div className="text-[#92adc9] text-xs mb-1">SÃ©lection</div>
                <div className="text-white font-medium truncate">
                  {selectedRestaurant?.nom || activeRestaurant.name || activeRestaurant.id}
                </div>
              </div>
              <div className="rounded-lg bg-[#111a22] border border-[#233648] p-3">
                <div className="text-[#92adc9] text-xs mb-1">Identifiant web</div>
                <div className="text-white font-medium truncate">{activeRestaurant.id}</div>
              </div>
              <div className="rounded-lg bg-[#111a22] border border-[#233648] p-3">
                <div className="text-[#92adc9] text-xs mb-1">Statut</div>
                <div className="text-white font-medium truncate">
                  {loadingRestaurants
                    ? 'Chargement...'
                    : restaurantsSource === 'cache'
                      ? 'Local'
                      : selectedRestaurant?.statut || 'Disponible'}
                </div>
              </div>
            </div>

            {restaurantsSource === 'cache' && !restaurantsError && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                Connexion indisponible: liste chargee depuis la sauvegarde locale.
              </div>
            )}

            {restaurantsError && (
              <div className={`mt-4 rounded-lg border p-3 text-sm ${
                restaurantsSource === 'cache'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                  : 'border-red-600/40 bg-red-600/20 text-red-200'
              }`}>
                {restaurantsError}
              </div>
            )}
          </div>
        </section>
        <section id="sync" className="max-w-4xl mx-auto">
          <SyncSettings />
        </section>

      </div>
    </SettingsLayout>
  );
}
