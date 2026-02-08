# Percolator Dashboard

Analytics UI for Percolator-based perpetual DEXs: vault, insurance, open interest, funding, positions, liquidations.

## Run (mock data)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page shows **mock data** so you can ship and demo before a live wrapper exists.

## Live data

When you have a deployed wrapper:

1. Add a "Program ID" input and pass it to your RPC.
2. Fetch the engine state account (layout matches Percolator's `RiskEngine` + account slab).
3. Replace `mockEngineState`, `mockPositions`, `mockLiquidations` in `lib/mockData.ts` with decoded account data (or add a `lib/fetchEngine.ts` that reads from chain).
