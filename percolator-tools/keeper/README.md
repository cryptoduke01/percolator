# Percolator Keeper

Calls `keeper_crank` on a Percolator **wrapper** program so that funding accrues, liquidations run, and dust is GC'd.

## Setup

1. Build the SDK first: `cd ../sdk && npm install && npm run build`
2. Install and build keeper: `npm install && npm run build`

## Env

| Variable | Description |
|----------|-------------|
| `RPC_URL` | Solana RPC (default: devnet) |
| `WRAPPER_PROGRAM_ID` | Your wrapper program's public key |
| `CALLER_KEYPAIR_PATH` | Path to keypair file (payer + signer) |

## Run

```bash
export WRAPPER_PROGRAM_ID=YourWrapperProgramId
export RPC_URL=https://api.mainnet-beta.solana.com  # or devnet
npm run keeper
```

**Note:** The instruction's **account list** (engine state, clock, oracle, etc.) is defined by your wrapper. This script builds the **data** only. You must add the correct `keys` to the `TransactionInstruction` in `src/index.ts` to match your wrapper's `keeper_crank` handler before it will succeed on-chain.
