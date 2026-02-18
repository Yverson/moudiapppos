import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      navigate("/pos");
    } else {
      setError(result.error || "Erreur de connexion");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#101922] to-[#0d1419] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-[#1a2632] border border-[#233648] rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#2b8cee] to-blue-600 flex items-center justify-center shadow-lg shadow-[#2b8cee]/20 mb-4">
              <span className="material-symbols-outlined text-white text-4xl">
                point_of_sale
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">RestoPOS</h1>
            <p className="text-slate-400 text-sm mt-2">
              Système de Gestion des Restaurants
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                📧 Email
              </label>
              <input
                id="email"
                type="email"
                title="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-slate-500 focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="exemple@restaurant.com"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                🔒 Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  title="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-slate-500 focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 pr-10 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Entrez votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 disabled:opacity-50"
                  title={showPassword ? "Masquer" : "Afficher"}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5">
                  error
                </span>
                <div>
                  <p className="font-medium">Erreur de connexion</p>
                  <p className="text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-gradient-to-r from-[#2b8cee] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  Connexion en cours...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">
                    login
                  </span>
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Info Message */}
          <div className="mt-6 p-4 bg-[#0f1621] border border-[#1e3a5f] rounded-lg text-slate-400 text-xs space-y-2">
            <p className="text-slate-300 font-medium">ℹ️ Informations</p>
            <ul className="space-y-1 text-slate-400">
              <li>• Connectez-vous avec vos identifiants MOUDI</li>
              <li>• Le token JWT sera configuré automatiquement</li>
              <li>• Le restaurant sera chargé depuis votre profil</li>
              <li>• Assurez-vous que VITE_API_URL est correct</li>
            </ul>
          </div>

          {/* API Status Debug */}
          <div className="mt-4 p-3 bg-slate-900/30 rounded-lg text-xs text-slate-500 border border-slate-700/30">
            <p>
              API: {import.meta.env.VITE_API_URL || "http://localhost:5000"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
