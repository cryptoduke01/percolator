/**
 * Minimal decoder for Percolator RiskEngine state (repr(C) layout).
 * Offsets match src/percolator.rs: vault, insurance_fund, params, then slot/c_tot/pnl_pos_tot/total_open_interest.
 */

const VAULT_OFFSET = 0;
const INSURANCE_BALANCE_OFFSET = 16;
const INSURANCE_FEE_REVENUE_OFFSET = 32;
const RISK_PARAMS_SIZE = 192; // warmup + margins + fees + liquidation params
const CURRENT_SLOT_OFFSET = 192 + 0;
const FUNDING_INDEX_OFFSET = 192 + 8;
const LAST_FUNDING_SLOT_OFFSET = 192 + 8 + 16;
const FUNDING_RATE_OFFSET = 192 + 8 + 16 + 8;
const LAST_CRANK_SLOT_OFFSET = 192 + 8 + 16 + 8 + 8;
const TOTAL_OI_OFFSET = 192 + 8 + 16 + 8 + 8 + 8 + 8; // skip max_crank_staleness
const C_TOT_OFFSET = TOTAL_OI_OFFSET + 16;
const PNL_POS_TOT_OFFSET = C_TOT_OFFSET + 16;
// After pnl_pos_tot: liq_cursor(2) + gc_cursor(2) + sweep slots(8+8) + crank_cursor(2) + sweep_start_idx(2) = 24
const LIFETIME_LIQUIDATIONS_OFFSET = PNL_POS_TOT_OFFSET + 16 + 24;
// After lifetime_liquidations(8) + lifetime_force_realize(8) + LP aggregates(16*4=64) + used[64](512)
const NUM_USED_ACCOUNTS_OFFSET = LIFETIME_LIQUIDATIONS_OFFSET + 8 + 8 + 64 + 512;

function readU64(data: Uint8Array, offset: number): number {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return Number(view.getBigUint64(0, true));
}

function readI64(data: Uint8Array, offset: number): number {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return Number(view.getBigInt64(0, true));
}

function readU128(data: Uint8Array, offset: number): bigint {
  const view = new DataView(data.buffer, data.byteOffset + offset, 16);
  const lo = view.getBigUint64(0, true);
  const hi = view.getBigUint64(8, true);
  return lo + (hi << BigInt(64));
}

function readU16(data: Uint8Array, offset: number): number {
  const view = new DataView(data.buffer, data.byteOffset + offset, 2);
  return view.getUint16(0, true);
}

export interface DecodedEngineState {
  vault: bigint;
  insuranceBalance: bigint;
  insuranceFeeRevenue: bigint;
  currentSlot: number;
  lastFundingSlot: number;
  fundingRateBpsPerSlot: number;
  lastCrankSlot: number;
  totalOpenInterest: bigint;
  cTot: bigint;
  pnlPosTot: bigint;
  /** Present when account has at least 328 bytes */
  lifetimeLiquidations?: number;
  /** Present when account has at least 914 bytes */
  numUsedAccounts?: number;
}

export function decodeEngineState(data: Uint8Array): DecodedEngineState | null {
  const minLen = PNL_POS_TOT_OFFSET + 16;
  if (data.length < minLen) return null;
  const out: DecodedEngineState = {
    vault: readU128(data, VAULT_OFFSET),
    insuranceBalance: readU128(data, INSURANCE_BALANCE_OFFSET),
    insuranceFeeRevenue: readU128(data, INSURANCE_FEE_REVENUE_OFFSET),
    currentSlot: readU64(data, CURRENT_SLOT_OFFSET),
    lastFundingSlot: readU64(data, LAST_FUNDING_SLOT_OFFSET),
    fundingRateBpsPerSlot: readI64(data, FUNDING_RATE_OFFSET),
    lastCrankSlot: readU64(data, LAST_CRANK_SLOT_OFFSET),
    totalOpenInterest: readU128(data, TOTAL_OI_OFFSET),
    cTot: readU128(data, C_TOT_OFFSET),
    pnlPosTot: readU128(data, PNL_POS_TOT_OFFSET),
  };
  if (data.length >= LIFETIME_LIQUIDATIONS_OFFSET + 8) {
    out.lifetimeLiquidations = readU64(data, LIFETIME_LIQUIDATIONS_OFFSET);
  }
  if (data.length >= NUM_USED_ACCOUNTS_OFFSET + 2) {
    out.numUsedAccounts = readU16(data, NUM_USED_ACCOUNTS_OFFSET);
  }
  return out;
}

export function formatBigint(n: bigint): string {
  if (n >= BigInt(1e15)) return (Number(n) / 1e9).toFixed(0) + 'B';
  if (n >= BigInt(1e12)) return (Number(n) / 1e6).toFixed(2) + 'M';
  if (n >= BigInt(1e9)) return (Number(n) / 1e3).toFixed(2) + 'K';
  return n.toString();
}
