# Percolator Audit — Kickoff Summary

**Repo:** `percolator` (Toly / aeyakovenko)  
**Status:** Educational, NOT production ready, NOT audited.  
**Scope:** Formally verified risk engine for perpetual DEXs on Solana.

---

## 1. What Percolator Does

Percolator is a **risk engine only** — it does **not** move tokens. A separate wrapper program does SPL transfers and calls into the engine.

- **Accounting:** Tracks vault, insurance fund, per-account capital, PnL, positions, funding, warmup, and fee credits.
- **Risk:** Enforces margin (maintenance + initial), liquidations (oracle-close only), loss settlement, profit conversion (warmup + haircut), and fee-debt sweep.
- **Execution:** Wrapper calls `deposit`, `withdraw`, `execute_trade` (with a pluggable `MatchingEngine`), and permissionless `keeper_crank`.
- **Design:** Single-slab, O(1) aggregates (`c_tot`, `pnl_pos_tot`), cursor-based crank, no global ADL scans; junior profits backed by `Residual = V - C_tot - I` and converted via a global haircut ratio `h`.

So: **Percolator = balance-sheet + margin + liquidations + warmup + haircut + crank.** Token in/out is the wrapper’s job.

---

## 2. Main Security Invariant

**Primary (conservation):**

```text
V >= C_tot + I
```

- `V` = vault balance  
- `C_tot` = sum of all account capital  
- `I` = insurance fund balance  

So: **No user can ever withdraw more value than actually exists on the exchange balance sheet.** Withdrawals only reduce `C_i` (and thus `C_tot`); the engine only allows that when `amount <= C_i` and post-withdraw margin holds. Positive PnL becomes withdrawable only after warmup and haircut conversion into capital; the haircut ensures total convertible value never exceeds `Residual`.

**Extended (in code):** `check_conservation(oracle_price)` also enforces that vault is at least (capital + settled PnL + mark PnL + insurance) minus a bounded rounding slack (`<= MAX_ROUNDING_SLACK`).

---

## 3. Files in `/src`

| File | Purpose |
|------|--------|
| `src/percolator.rs` | Core engine: `RiskEngine`, `Account`, `RiskParams`, `InsuranceFund`, deposit/withdraw/execute_trade/keeper_crank, margin, haircut, liquidation, warmup, funding, aggregates, invariants. ~3.3k LOC. |
| `src/i128.rs` | BPF-safe 128-bit types: `I128`, `U128`. Kani build uses transparent newtypes; non-Kani uses `[u64; 2]` for 8-byte alignment on SBF. |

**No other files under `src/`.** Tests live in `tests/` (e.g. `unit_tests.rs`, `kani.rs`, `fuzzing.rs`, `amm_tests.rs`).

---

## 4. Initial Thoughts on Potential Security Risks

- **Aggregate consistency:** `c_tot` and `pnl_pos_tot` must be updated on every capital/PnL change via `set_capital`/`set_pnl`. Any path that mutates `capital` or `pnl` without these helpers can break conservation or haircut math. **Audit:** Grep for direct `account.capital =` / `account.pnl =` and batch-update comments per spec §4.3.

- **Withdrawal and crank gating:** Withdraw and risk-increasing trades require a recent crank (staleness check). Bypassing or mis-implementing this could allow value extraction on stale state. **Audit:** Trace `require_fresh_crank`, `last_crank_slot`, `max_crank_staleness_slots` and all call sites of `withdraw` and `execute_trade`.

- **Matcher trust boundary:** `execute_trade` takes a `MatchingEngine` that returns (exec_price, exec_size). Overfill or bad price (e.g. zero, or > `MAX_ORACLE_PRICE`) can break zero-sum and margin. **Audit:** Confirm all matcher outputs are validated (size, price bounds) before applying PnL and position deltas; re-check Kani “rejects invalid matcher” proofs.

- **Haircut and loss ordering:** Profit conversion must use a **pre-conversion** haircut ratio; loss settlement must run before profit conversion so `Residual` is correct (see audit.md “Finding G — Stale Haircut After Trade”). **Audit:** In `execute_trade` and `touch_account_full`, verify order: loss settle → then profit conversion with current `h` → then fee-debt sweep.

- **Fee debt and margin:** Fee debt (`max(0, -fee_credits)`) must reduce margin equity and be swept from principal when capital is added. **Audit:** Ensure `effective_equity` (or equivalent) subtracts fee debt and that deposit / conversion paths call the fee-debt sweep.

- **Funding anti-retroactivity:** Funding for an interval must use the rate stored at the start of the interval, not a rate recomputed after state changes. **Audit:** Check `accrue_funding_to`, `last_funding_slot`, `funding_rate_bps_per_slot_last` and that crank/trade only update the rate for the *next* interval.

- **Liquidation and ADL:** Liquidations close at oracle; profit from a liquidated account is funded via ADL (excluding that account). **Audit:** Confirm no path lets a liquidated winner fund their own profit; check `apply_adl_excluding` and overflow/atomicity (audit.md documents a past ADL overflow bug).

- **Overflow / panic:** Engine uses saturating and checked math in many places; release profile has `overflow-checks = true`. **Audit:** Find any remaining `+`/`-`/`*`/`/` on 128-bit or key 64-bit values that could overflow or panic; prefer checked/saturating or documented safe bounds.

- **Kani coverage vs. code:** 125 Kani proofs exist and are documented in `audit.md`. **Audit:** Map proofs to code paths (deposit, withdraw, execute_trade, crank, liquidation, ADL, warmup, fee debt); note any critical paths or error branches with no or weak proof coverage.

- **Wrapper contract:** Engine assumes wrapper does token moves only after a successful `withdraw` and that deposit only runs after tokens are in the vault. **Audit:** Document these assumptions clearly; a wrapper bug (e.g. double payout or wrong amount) can still break safety.

---

## Next Steps

1. **Deep-dive `percolator.rs`** by flow: deposit → withdraw, execute_trade (with matcher), touch_account_full (settle order), keeper_crank (liquidation, force-realize, GC).
2. **Trace all `set_capital` / `set_pnl`** call sites and confirm no direct field writes that bypass aggregates.
3. **Enumerate error paths** for withdraw, execute_trade, and crank; ensure no path leaves aggregates or vault/c_tot/I inconsistent.
4. **Cross-check spec.md** (v7) against code for §4 (aggregates), §6 (loss/profit/fee-debt), §7 (funding), §9 (margin/liquidation), §10 (ops order).
5. **Run tests and Kani** locally; add targeted tests or proofs for any new risk hypotheses.
