import { useOfflineQueue } from '../hooks/useOfflineQueue';

export default function OfflineIndicator() {
  const { isOnline, queuedCount, syncNow } = useOfflineQueue();

  if (isOnline && queuedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-600 text-white shadow-lg animate-pulse">
          <span className="material-symbols-outlined text-[20px]">cloud_off</span>
          <div className="flex flex-col">
            <span className="font-bold text-sm">Mode Hors Ligne</span>
            <span className="text-xs opacity-90">Les actions seront synchronisées plus tard</span>
          </div>
        </div>
      ) : queuedCount > 0 ? (
        <button
          onClick={syncNow}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">sync</span>
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm">Synchroniser</span>
            <span className="text-xs opacity-90">{queuedCount} action{queuedCount > 1 ? 's' : ''} en attente</span>
          </div>
        </button>
      ) : null}
    </div>
  );
}
