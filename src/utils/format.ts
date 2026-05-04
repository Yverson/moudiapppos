/**
 * Utilitaires de formatage
 */

/**
 * Formate un montant sans symbole monétaire
 * Exemple: 1000 -> "1 000"
 * Exemple: 1234.56 -> "1 234.56"
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Formate un montant pour l'export CSV (sans espace)
 * Exemple: 1000 -> "1000.00"
 */
export function formatAmountForExport(amount: number): string {
  return amount.toFixed(2);
}
