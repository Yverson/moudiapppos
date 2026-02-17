import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(username, password);
    
    if (success) {
      navigate('/pos');
    } else {
      setError('Identifiants invalides. Utilisez admin/admin pour tester.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#101922] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a2632] border border-[#233648] rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#2b8cee] to-blue-600 flex items-center justify-center shadow-lg shadow-[#2b8cee]/20 mb-4">
              <span className="material-symbols-outlined text-white text-4xl">point_of_sale</span>
            </div>
            <h1 className="text-2xl font-bold text-white">RestoPOS</h1>
            <p className="text-slate-400 text-sm mt-1">Connexion au système</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                title="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-slate-500 focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm"
                placeholder="Entrez votre nom d'utilisateur"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                title="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111a22] border border-[#324d67] rounded-lg text-white placeholder-slate-500 focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] h-11 px-4 text-sm"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2b8cee] hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <p>Démo : admin / admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
