import React from 'react';
import { useDatabaseConnection } from '../hooks/useDatabase';

export default function DatabaseStatus() {
  const { isConnected, error, refresh } = useDatabaseConnection();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 bg-green-900/20 border border-green-600/50 rounded-lg px-3 py-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-green-400 text-sm font-medium">Base de données connectée</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-red-900/20 border border-red-600/50 rounded-lg px-3 py-2">
      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
      <div className="flex flex-col">
        <span className="text-red-400 text-sm font-medium">Base de données déconnectée</span>
        {error && <span className="text-red-300 text-xs">{error}</span>}
      </div>
      <button
        onClick={refresh}
        className="text-red-400 hover:text-red-300 text-xs font-medium underline"
        title="Réessayer la connexion"
      >
        Réessayer
      </button>
    </div>
  );
}
