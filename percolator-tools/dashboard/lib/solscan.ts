/**
 * Solscan explorer URLs for accounts and transactions.
 */

export type SolscanCluster = 'mainnet' | 'devnet';

export function solscanAccountUrl(address: string, cluster: SolscanCluster = 'mainnet'): string {
  const base = 'https://solscan.io/account/' + encodeURIComponent(address);
  return cluster === 'devnet' ? base + '?cluster=devnet' : base;
}

export function solscanTxUrl(signature: string, cluster: SolscanCluster = 'mainnet'): string {
  const base = 'https://solscan.io/tx/' + encodeURIComponent(signature);
  return cluster === 'devnet' ? base + '?cluster=devnet' : base;
}

/** Truncate base58 address for display: first 4 + … + last 4 */
export function truncateAddress(address: string, head = 4, tail = 4): string {
  if (!address || address.length <= head + tail) return address;
  return address.slice(0, head) + '…' + address.slice(-tail);
}
