/**
 * Mock engine state and accounts for dashboard demo.
 * Replace with real account fetches when a wrapper is deployed.
 */

export interface EngineState {
  vault: string;
  insuranceBalance: string;
  cTot: string;
  pnlPosTot: string;
  totalOpenInterest: string;
  currentSlot: number;
  lastCrankSlot: number;
  fundingRateBpsPerSlot: number;
  lifetimeLiquidations: number;
  numUsedAccounts: number;
}

export interface PositionRow {
  accountId: string;
  kind: 'user' | 'lp';
  /** Display label (e.g. truncated) */
  owner: string;
  /** Full base58 address for Solscan link; when set, owner is shown as link */
  ownerAddress?: string;
  token: string;
  capital: string;
  pnl: string;
  positionSize: string;
  entryPrice: string;
}

export interface LiquidationRow {
  slot: number;
  accountId: string;
  side: string;
  token: string;
  size: string;
  pnl: string;
}

export const mockEngineState: EngineState = {
  vault: '2_450_000.00',
  insuranceBalance: '125_000.00',
  cTot: '2_100_000.00',
  pnlPosTot: '85_000.00',
  totalOpenInterest: '1_250_000.00',
  currentSlot: 284_521_000,
  lastCrankSlot: 284_520_940,
  fundingRateBpsPerSlot: 1,
  lifetimeLiquidations: 12,
  numUsedAccounts: 47,
};

export const mockPositions: PositionRow[] = [
  { accountId: '101', kind: 'user', owner: '7xKX…9f2a', ownerAddress: '7xKXtYrqR3Nzr3EJc5YfE5nJmH9f2aKpQwR1sT2uV3wX4y', token: 'PERC', capital: '50_000', pnl: '2_400', positionSize: '10_000', entryPrice: '1.02' },
  { accountId: '102', kind: 'user', owner: '3mNp…1bQc', ownerAddress: '3mNpLqRsTuVwXyZ1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1bQc', token: 'PERC', capital: '120_000', pnl: '-1_200', positionSize: '-25_000', entryPrice: '0.98' },
  { accountId: '103', kind: 'lp', owner: '9sLp…4xYz', ownerAddress: '9sLpMqNrOsPtQuRvSwTxUyVwXxYyZz1a2b3c4d5e6f4xYz', token: 'PERC', capital: '500_000', pnl: '15_000', positionSize: '-80_000', entryPrice: '1.01' },
  { accountId: '104', kind: 'user', owner: '2jRk…7hMn', ownerAddress: '2jRkKsLtMuNvOwPxQyRzSaTbUcVdWeXfYgZh1i2j3k4l7hMn', token: 'PERC', capital: '30_000', pnl: '800', positionSize: '5_000', entryPrice: '1.00' },
  { accountId: '105', kind: 'user', owner: '5vTc…3kWp', ownerAddress: '5vTcWuXvYwZx1a2b3c4d5e6f7g8h9i0jKkLlMmNnOoPp3kWp', token: 'PERC', capital: '0', pnl: '-4_500', positionSize: '0', entryPrice: '1.00' },
];

export const mockLiquidations: LiquidationRow[] = [
  { slot: 284_520_100, accountId: '88', side: 'long', token: 'PERC', size: '15_000', pnl: '-2_100' },
  { slot: 284_519_800, accountId: '42', side: 'short', token: 'PERC', size: '8_000', pnl: '1_400' },
  { slot: 284_519_200, accountId: '91', side: 'long', token: 'PERC', size: '22_000', pnl: '-3_800' },
];
