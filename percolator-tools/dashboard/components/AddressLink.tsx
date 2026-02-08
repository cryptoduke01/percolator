'use client';

import { solscanAccountUrl, truncateAddress, type SolscanCluster } from '@/lib/solscan';

interface AddressLinkProps {
  address: string;
  cluster?: SolscanCluster;
  /** Override truncated display (default: first 4 + … + last 4) */
  display?: string;
  className?: string;
}

export function AddressLink({ address, cluster = 'mainnet', display, className }: AddressLinkProps) {
  const text = display ?? truncateAddress(address);
  const href = solscanAccountUrl(address, cluster);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={address}
    >
      {text}
    </a>
  );
}
