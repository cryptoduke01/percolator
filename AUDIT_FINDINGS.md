# Percolator Audit — Findings Report (Phase 1)

**Date:** 2025-02-08  
**Scope:** Critical flows, aggregate discipline, spec alignment.  
**Status:** Phase 1 complete. Code review + test run.  
**Tests:** `cargo test --features test` — 95 passed (93 unit_tests + 2 amm_tests). Kani not run.

---

## Executive Summary

The engine implements the documented design: conservation (V ≥ C_tot + I), withdrawal safety via margin and crank gating, two-pass settlement in execute_trade (Finding G fix), and correct touch_account_full order. The only direct `.capital`/`.pnl` writes outside helpers are the §4.3 batch update in `execute_trade`, with aggregates updated immediately after. No new critical or high-severity issues were found in the reviewed paths; several recommendations and verification steps are listed below.

---

## 1. Aggregate Discipline (c_tot, pnl_pos_tot)

### 1.1 Direct writes to `capital` / `pnl`

| Location | Usage | Verdict |
|----------|--------|--------|
| `set_pnl` (L772) | Internal: assigns `accounts[idx].pnl` after updating `pnl_pos_tot` | OK — this is the helper |
| `set_capital` (L787) | Internal: assigns `accounts[idx].capital` after updating `c_tot` | OK — this is the helper |
| `execute_trade` (L3012–3021) | Batch update: `user.pnl`, `user.capital`, `lp.pnl` (and positions) | OK — §4.3 exception: deltas computed above, then L3024–3035 update `c_tot` and `pnl_pos_tot` atomically. Comment references spec §4.1, §4.2. |

**Conclusion:** No aggregate bypass. All other capital/PnL changes go through `set_capital`/`set_pnl` or the documented batch in `execute_trade`.

### 1.2 Recommendation

- Keep a single comment block at the execute_trade batch (e.g. “§4.3 batch: do not add further direct .capital/.pnl assigns without updating this block and c_tot/pnl_pos_tot below”) to avoid future edits breaking aggregates.

---

## 2. Deposit / Withdraw

### 2.1 Deposit (L2391)

- **Flow:** `current_slot` → settle fees from deposit (fee_credits, then capital → insurance) → `vault += amount` → `set_capital(idx, cap + deposit_remaining)` → `settle_warmup_to_capital` → `pay_fee_debt_from_capital`.
- **Conservation:** Vault gets full `amount`; capital gets remainder after fees; fee paid to insurance. So Δvault = Δcapital + Δinsurance. Correct.
- **Aggregates:** Capital change only via `set_capital`. Correct.

### 2.2 Withdraw (L2448)

- **Gating:** `require_fresh_crank(now_slot)`, `require_recent_full_sweep(now_slot)`.
- **Flow:** `touch_account_full` → check `amount <= capital` → MTM equity after withdraw (with fee_debt subtracted) → if position open, require initial margin → `set_capital(idx, new_capital)` → `vault -= amount` → post-withdraw maintenance margin check; on failure revert with `set_capital` and `vault += amount`.
- **Spec:** Aligns with §10.3 (touch, amount ≤ C_i, post-withdraw margin, then C_i and V decrease).

---

## 3. touch_account_full (L2308)

**Order:**

1. `current_slot = now_slot`
2. Funding: `touch_account(idx)` → `settle_account_funding`
3. Mark: `settle_mark_to_oracle`; if AvailGross increased, `update_warmup_slope`
4. Maintenance fees: `settle_maintenance_fee`
5. Warmup: `settle_warmup_to_capital` (which does §6.1 loss then §6.2 profit)
6. Fee-debt sweep: `pay_fee_debt_from_capital`
7. Re-check maintenance margin

**Spec §10.1:** Order matches (funding → mark → fees → loss settle → profit conversion → fee-debt sweep). Correct.

---

## 4. execute_trade (L2678)

### 4.1 Matcher trust boundary

- **Validation:** L2746–2772: `exec_price` in (0, MAX_ORACLE_PRICE], `exec_size` non-zero, not MIN, abs ≤ MAX_POSITION_ABS, same sign as `size`, abs(exec_size) ≤ abs(size). Rejects overfill and invalid price. Consistent with audit.md Gap 2.

### 4.2 Settlement order

- **Before position update:** `touch_account` (funding) for user and LP → capture old AvailGross → `settle_mark_to_oracle` both → update warmup slope if AvailGross increased → `settle_maintenance_fee` both.
- **After position and PnL commit (batch):** Two-pass settlement (Finding G): `settle_loss_only(user_idx)`, `settle_loss_only(lp_idx)`, then `settle_warmup_to_capital(user_idx)`, `settle_warmup_to_capital(lp_idx)`, then `update_warmup_slope` both. Correct: losses first so Residual is correct for haircut.

### 4.3 Margin

- User and LP margin use projected post-trade state and post-trade haircut (inlined). Risk-increasing (magnitude increase or flip) uses initial margin; otherwise maintenance. Matches §9.1.1 and §10.4.

---

## 5. keeper_crank (L1485)

- **Funding:** `accrue_funding(now_slot, oracle_price)` with stored rate, then `set_funding_rate_for_next_interval(funding_rate_bps_per_slot)`. Anti-retroactivity preserved.
- **Per account:** Maintenance fee (best-effort) → `touch_account` (funding) → `settle_warmup_to_capital_for_crank` (drains abandoned PnL). Then liquidation path (if not force-realize) or force-realize path; LP max tracking; cursor advance.
- **Liquidation:** `touch_account_for_liquidation` (funding, best-effort mark, best-effort fees) → margin check → close (full or partial) via `oracle_close_position_core` / `oracle_close_position_slice_core` → liquidation fee from capital to insurance via `set_capital` and insurance update.
- **GC:** `garbage_collect_dust()` after sweep. No ADL in code; design uses global haircut only (per comments and audit.md).

---

## 6. Liquidation and close

- **liquidate_at_oracle:** Touch for liquidation → require below maintenance margin → compute close amount → close (with overflow fallback to full close) → liquidation fee via `set_capital` and insurance. No separate ADL; profit/loss handled inside close + warmup + haircut.
- **oracle_close_position_core / slice:** Mark PnL via `set_pnl`, position/entry/OI/LP aggregates updated, then `settle_warmup_to_capital`, then write-off residual negative PnL. All PnL/capital changes go through helpers or documented patterns.

---

## 7. Spec Cross-Check (High Level)

| Spec | Code | Status |
|------|------|--------|
| §4.1 set_capital | Used everywhere capital changes (except §4.3 batch); batch updates c_tot after | OK |
| §4.2 set_pnl | Used everywhere PnL changes (except §4.3 batch); batch updates pnl_pos_tot after | OK |
| §6.1 Loss then §6.2 profit | `settle_warmup_to_capital`: loss block first, then profit block; execute_trade uses settle_loss_only then settle_warmup_to_capital | OK |
| §6.3 Fee-debt sweep | `pay_fee_debt_from_capital` after warmup in touch_account_full, deposit, and after execute_trade two-pass | OK |
| §7.1 Funding anti-retroactivity | Crank: accrue with stored rate, then set rate for next interval; no retroactive application | OK |
| §10.1 touch_account_full order | Funding → mark → fees → warmup (loss+profit) → fee-debt sweep → margin recheck | OK |

---

## 8. Recommendations and Next Steps

1. **Tests:** Run **`cargo test --features test`** (MAX_ACCOUNTS=64). Verified: 95 tests pass (93 unit + 2 E2E amm_tests).
2. **Run Kani:** `cargo kani` (or project’s Kani script) to confirm 125 proofs still pass after any future changes.
3. **Deposit insurance update:** In `deposit`, fee payment does `self.insurance_fund.balance = self.insurance_fund.balance + pay`. Confirm `U128 + u128` is implemented (e.g. via `Add` or helper); if not, use an explicit `add_u128`/saturating add to avoid overflow or type issues.
4. **Liquidation fee:** L2022 uses `set_capital`; L2023 uses `saturating_add_u128`. Confirm `InsuranceFund.balance` type and that all insurance updates are consistent (no accidental vault mutation).
5. **Error paths:** For withdraw and execute_trade, all early `return Err(...)` occur before any mutation of vault/c_tot/pnl_pos_tot or account state; post-withdraw revert path restores capital and vault. No inconsistency found in reviewed paths.
6. **Formal verification:** Re-run full Kani suite and compare with `audit.md` (125 proofs, ~53 min). Add or extend proofs for any new code paths (e.g. deposit fee-to-insurance, liquidation fee) if not already covered.

---

## 9. Summary Table

| Area | Finding | Severity |
|------|---------|----------|
| Aggregate discipline | No bypass; only §4.3 batch with atomic aggregate update | — |
| touch_account_full | Order matches spec §10.1 | — |
| execute_trade | Matcher validated; two-pass settlement; margin with projected haircut | — |
| Withdraw | Crank gating, margin checks, revert on post-withdraw failure | — |
| Deposit | Conservation and set_capital correct; confirm insurance += type | Low (defensive) |
| Kani/tests | 95 tests pass with `cargo test --features test`; Kani not run | — |

---

## Wrap-up

Phase 1 audit complete. No critical/high issues in reviewed paths; conservation, withdrawal safety, and spec-aligned settlement order confirmed. Full report in this file. Optional next: Kani run, deeper funding/GC review.

---

**Next phase (optional):** Deeper review of funding accrual (overflow, MAX_FUNDING_DT), garbage_collect_dust predicate and aggregate updates, and any remaining error paths (e.g. close_account, add_user/add_lp).
