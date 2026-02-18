import { createContext, useContext, useState, ReactNode } from "react";
import authService from "../services/auth.service";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  restaurantId?: string;
  restaurantName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("apppos_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [isLoading, setIsLoading] = useState(false);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const userData = await authService.login({
        email,
        password,
      });

      if (userData) {
        setUser(userData);
        localStorage.setItem("apppos_user", JSON.stringify(userData));
        console.log("[AuthContext] Connexion réussie:", userData.email);
        return { success: true };
      }

      return {
        success: false,
        error: "Email ou mot de passe incorrect",
      };
    } catch (error: any) {
      console.error("[AuthContext] Erreur de connexion:", error);

      let errorMessage = "Erreur de connexion. Veuillez réessayer.";

      if (error.response?.status === 401) {
        errorMessage = "Email ou mot de passe incorrect";
      } else if (error.response?.status === 404) {
        errorMessage = "Utilisateur non trouvé";
      } else if (error.code === "ECONNREFUSED") {
        errorMessage =
          "Impossible de se connecter au serveur. Vérifiez VITE_API_URL.";
      } else if (error.message === "Network Error") {
        errorMessage = "Erreur réseau. Vérifiez votre connexion Internet.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("apppos_user");
    authService.logout();
    console.log("[AuthContext] Déconnexion réussie");
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
