/**
 * Helper pour appeler les commandes Tauri (SQLite desktop).
 * Plus de fallback web -- on utilise exclusivement SQLite via Tauri.
 */

export const isDesktop = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export async function tauriInvoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/tauri');
  return await invoke<T>(cmd, args);
}
