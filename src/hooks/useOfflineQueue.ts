import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';

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
    if (!isOnline || queue.length === 0) return;

    const failedItems: QueueItem[] = [];

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'CREATE_ORDER':
            await apiService.createOrder(item.payload);
            break;

          case 'UPDATE_ORDER':
            await apiService.updateOrderStatus(item.payload.orderId, item.payload.status);
            break;

          case 'PROCESS_PAYMENT':
            await apiService.processPayment(item.payload);
            break;

          default:
        }
      } catch (err) {
        if (item.retries < 3) {
          failedItems.push({ ...item, retries: item.retries + 1 });
        }
      }
    }

    setQueue(failedItems);
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
