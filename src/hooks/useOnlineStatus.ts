import { useState, useEffect } from 'react';
import bidirectionalSync, { PendingTableInfo } from '../services/bidirectional-sync.service';

export interface OnlineStatus {
  isOnline: boolean;
  pendingCount: number;
  pendingTables: PendingTableInfo[];
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(bidirectionalSync.isOnline);
  const [pendingCount, setPendingCount] = useState<number>(bidirectionalSync.pendingCount);
  const [pendingTables, setPendingTables] = useState<PendingTableInfo[]>(bidirectionalSync.pendingTables);

  useEffect(() => {
    const unsubscribe = bidirectionalSync.subscribe((online, pending, tables) => {
      setIsOnline(online);
      setPendingCount(pending);
      setPendingTables(tables);
    });

    return unsubscribe;
  }, []);

  return { isOnline, pendingCount, pendingTables };
}
