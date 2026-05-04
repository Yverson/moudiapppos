/**
 * Détection de la plateforme (Desktop Tauri vs Web navigateur)
 * et helper pour router les appels DB vers le bon backend.
 */

/**
 * Retourne true si l'app tourne dans Tauri (desktop).
 * Tauri injecte window.__TAURI__ au démarrage.
 */
export const isDesktop = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * Appelle invoke() de Tauri si on est en desktop,
 * sinon exécute la fonction webFallback().
 *
 * @param cmd        - Nom de la commande Tauri (ex: 'get_categories')
 * @param args       - Arguments passés à invoke()
 * @param webFallback - Fonction async à exécuter en mode web
 */
export async function invokeOrFallback<T>(
  cmd: string,
  args: Record<string, unknown>,
  webFallback: () => Promise<T>
): Promise<T> {
  if (isDesktop()) {
    const { invoke } = await import('@tauri-apps/api/tauri');
    return invoke<T>(cmd, args);
  }
  return webFallback();
}
