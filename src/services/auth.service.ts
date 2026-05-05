import axios, { AxiosInstance } from "axios";
import syncService from "./sync.service";
import { getActiveRestaurantId, setActiveRestaurant } from "./restaurant-config";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string;
      nom: string;
      prenom: string;
      role: string;
    } | null;
    proprietaire?: {
      id: string;
      email: string;
      nom: string;
      prenom: string;
      phone?: string;
      avatarUrl?: string;
      role?: string;
      restaurantId?: string;
      restaurantName?: string;
    };
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  restaurantId?: string;
  restaurantName?: string;
}

class AuthService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth token to requests if available
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Login with proprietaire credentials
   */
  async login(credentials: LoginCredentials): Promise<User | null> {
    try {
      const response = await this.api.post<AuthResponse>("/api/proprietaires/login", {
        Email: credentials.email,
        Password: credentials.password,
      });

      if (response.data.success) {
        const { accessToken, proprietaire, user } = response.data.data;

        // Store token
        localStorage.setItem("authToken", accessToken);
        syncService.setAuthToken(accessToken);

        // Configure restaurant info from the runtime selection first.
        const restaurantId = proprietaire?.restaurantId || getActiveRestaurantId();
        const restaurantName =
          proprietaire?.restaurantName ||
          localStorage.getItem("restaurantName") ||
          `${proprietaire?.prenom} ${proprietaire?.nom}` ||
          "Restaurant";

        if (restaurantId) {
          syncService.setRestaurantId(restaurantId);
          syncService.setRestaurantName(restaurantName);
          setActiveRestaurant({ id: restaurantId, name: restaurantName });
        } else {
          // VITE_RESTAURANT_ID non configure
        }

        // Return user object
        // API returns proprietaire data, not a separate user object
        if (!proprietaire) {
          return null;
        }

        return {
          id: proprietaire.id || user?.id || "unknown",
          email: proprietaire.email || user?.email || "",
          firstName: proprietaire.prenom || user?.prenom || "",
          lastName: proprietaire.nom || user?.nom || "",
          role: proprietaire.role || user?.role || "proprietaire",
          restaurantId: proprietaire.restaurantId,
          restaurantName: proprietaire.restaurantName,
        };
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout and clean up
   */
  logout(): void {
    localStorage.removeItem("authToken");
    localStorage.removeItem("restaurantId");
    localStorage.removeItem("restaurantName");
    syncService.clearAuthToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem("authToken");
  }

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return localStorage.getItem("authToken");
  }

  /**
   * Verify token is still valid
   */
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await this.api.get("/api/auth/verify");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh token if expired
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await this.api.post<AuthResponse>("/api/auth/refresh");

      if (response.data.success) {
        const { accessToken } = response.data.data;
        localStorage.setItem("authToken", accessToken);
        syncService.setAuthToken(accessToken);

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current API base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

export default new AuthService();
