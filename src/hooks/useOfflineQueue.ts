import { useState, useEffect, useCallback } from 'react';

export interface QueueItem {
  id: string;
  action: 'CREATE_ORDER' | 'UPDATE_ORDER' | 'PROCESS_PAYMENT';
  payload: any;
  timestamp: number;
  retries: number;
}

export interface UseOfflineQueueReturn {
  isOnline: boolean;
  queuedCount: number;
  queue: QueueItem[];
  addToQueue: (action: string, payload: any) => void;
  syncNow: () => Promise<void>;
  clearQueue: () => void;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('offlineQueue');
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load offline queue:', err);
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
  }, [queue]);

  const addToQueue = useCallback((action: string, payload: any) => {
    const item: QueueItem = {
      id: `${action}-${Date.now()}`,
      action: action as any,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    setQueue((prev) => [...prev, item]);
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) return;

    for (const item of queue) {
      try {
        // TODO: Process each queue item based on action type
        // Call appropriate API endpoints
        console.log('Syncing queued item:', item);
      } catch (err) {
        console.error('Failed to sync item:', item, err);
      }
    }
    setQueue([]);
  }, [queue, isOnline]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    isOnline,
    queuedCount: queue.length,
    queue,
    addToQueue,
    syncNow,
    clearQueue,
  };
}
