import axios, { AxiosInstance } from 'axios';

export interface RestaurantOption {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  statut?: string;
  adresse?: string;
}

const OWNER_RESTAURANTS_CACHE_KEY = 'apppos_owner_restaurants';

class RestaurantService {
  private api: AxiosInstance;
  private lastOwnerRestaurantsSource: 'api' | 'cache' = 'api';

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
      timeout: 15000,
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async getOwnerRestaurants(): Promise<RestaurantOption[]> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.lastOwnerRestaurantsSource = 'cache';
      return this.getCachedOwnerRestaurants();
    }

    try {
      const response = await this.api.get('/api/proprietaire/restaurants');
      const restaurants = this.normalizeRestaurants(response.data?.data || response.data || []);
      this.cacheOwnerRestaurants(restaurants);
      this.lastOwnerRestaurantsSource = 'api';
      return restaurants;
    } catch (error) {
      const cachedRestaurants = this.getCachedOwnerRestaurants();
      if (cachedRestaurants.length > 0) {
        this.lastOwnerRestaurantsSource = 'cache';
        return cachedRestaurants;
      }
      throw error;
    }
  }

  getLastOwnerRestaurantsSource(): 'api' | 'cache' {
    return this.lastOwnerRestaurantsSource;
  }

  getCachedOwnerRestaurants(): RestaurantOption[] {
    try {
      const stored = localStorage.getItem(OWNER_RESTAURANTS_CACHE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return this.normalizeRestaurants(parsed);
    } catch {
      return [];
    }
  }

  hasCachedOwnerRestaurants(): boolean {
    return this.getCachedOwnerRestaurants().length > 0;
  }

  private cacheOwnerRestaurants(restaurants: RestaurantOption[]) {
    localStorage.setItem(OWNER_RESTAURANTS_CACHE_KEY, JSON.stringify(restaurants));
  }

  private normalizeRestaurants(restaurants: any): RestaurantOption[] {
    if (!Array.isArray(restaurants)) {
      return [];
    }

    return restaurants
      .map((restaurant: any) => ({
        id: restaurant.id || restaurant.Id,
        nom: restaurant.nom || restaurant.Nom || restaurant.name || restaurant.Name || 'Sans nom',
        email: restaurant.email || restaurant.Email,
        telephone: restaurant.telephone || restaurant.Telephone,
        statut: restaurant.statut || restaurant.Statut,
        adresse: restaurant.adresse || restaurant.Adresse,
      }))
      .filter((restaurant) => !!restaurant.id);
  }

  async refreshOwnerRestaurantsFromApi(): Promise<RestaurantOption[]> {
    const response = await this.api.get('/api/proprietaire/restaurants');
    const restaurants = this.normalizeRestaurants(response.data?.data || response.data || []);
    this.cacheOwnerRestaurants(restaurants);
    return restaurants;
  }
}

export default new RestaurantService();
