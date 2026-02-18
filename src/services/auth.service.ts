import axios, { AxiosInstance } from "axios";
import syncService from "./sync.service";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      nom: string;
      prenom: string;
      role: string;
    };
    proprietaire?: {
      id: string;
      restaurantId: string;
      restaurantName?: string;
      email: string;
      nom: string;
      prenom: string;
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
        const { token, proprietaire, user } = response.data.data;

        // Store token
        localStorage.setItem("authToken", token);
        syncService.setAuthToken(token);

        console.log(
          "[AuthService] Token d'authentification obtenu et configuré",
        );

        // Configure restaurant info if available
        if (proprietaire) {
          const restaurantId = proprietaire.restaurantId;
          const restaurantName =
            proprietaire.restaurantName ||
            `${proprietaire.prenom} ${proprietaire.nom}`;

          syncService.setRestaurantId(restaurantId);
          syncService.setRestaurantName(restaurantName);

          localStorage.setItem("restaurantId", restaurantId);
          localStorage.setItem("restaurantName", restaurantName);

          console.log(
            `[AuthService] Restaurant configuré: ${restaurantName} (${restaurantId})`,
          );
        }

        // Return user object
        return {
          id: user.id,
          email: user.email,
          firstName: user.prenom || proprietaire?.prenom || "",
          lastName: user.nom || proprietaire?.nom || "",
          role: user.role || proprietaire?.role || "proprietaire",
          restaurantId: proprietaire?.restaurantId,
          restaurantName: proprietaire?.restaurantName,
        };
      }

      return null;
    } catch (error) {
      console.error("[AuthService] Erreur de connexion:", error);
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

    console.log("[AuthService] Déconnexion réussie");
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
      console.warn("[AuthService] Token verification failed:", error);
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
        const { token } = response.data.data;
        localStorage.setItem("authToken", token);
        syncService.setAuthToken(token);

        console.log("[AuthService] Token rafraîchi avec succès");
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        "[AuthService] Erreur de rafraîchissement du token:",
        error,
      );
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
