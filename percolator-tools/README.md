# Percolator Tools

SDK, Keeper, and Dashboard for [Percolator](https://github.com/aeyakovenko/percolator) — Toly's risk engine for perpetual DEXs on Solana.

| Package | Description |
|--------|-------------|
| **[sdk](./sdk)** | TypeScript types + instruction builders for wrappers (deposit, withdraw, trade, crank). |
| **[keeper](./keeper)** | Script to call `keeper_crank` on a Percolator wrapper (run locally or as a bot). |
| **[dashboard](./dashboard)** | Analytics UI: vault, OI, funding, positions, liquidations (mock data + ready for live program). |

## Quick start

```bash
# SDK (for building wrappers / frontends)
cd sdk && npm install && npm run build

# Keeper (run crank for a deployment)
cd keeper && npm install && npm start

# Dashboard (dev)
cd dashboard && npm install && npm run dev
```

## Deploy

- **Dashboard:** See [DEPLOY.md](./DEPLOY.md) for Vercel, static export, or Node.
- **SDK:** Optional — publish with `cd sdk && npm run build && npm publish --access public`. The dashboard does not depend on the SDK.

## Audit

Phase 1 security review: [AUDIT_FINDINGS.md](../percolator/AUDIT_FINDINGS.md) in the main percolator repo.
