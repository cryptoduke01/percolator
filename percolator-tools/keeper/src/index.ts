/// <reference types="node" />
/**
 * Percolator Keeper — calls keeper_crank on a wrapper program.
 *
 * Set env:
 *   RPC_URL          - Solana RPC
 *   WRAPPER_PROGRAM_ID - wrapper program public key
 *   ENGINE_STATE_PDA  - (optional) engine state account for reading slot
 *   CALLER_KEYPAIR_PATH - (optional) path to keypair for payer/signer
 *
 * Run: npm run keeper
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

// Inline crank data builder so keeper works without installing SDK.
// For full types/builders use @percolatortool/sdk.
function buildKeeperCrankData(args: {
  callerIndex: number;
  nowSlot: number;
  oraclePrice: number;
  fundingRateBpsPerSlot: number;
  allowPanic: boolean;
}): Buffer {
  const KEEPER_CRANK = 0x03;
  const b = Buffer.alloc(1 + 8 * 4 + 1);
  let o = 0;
  b[o++] = KEEPER_CRANK;
  b.writeBigUInt64LE(BigInt(args.callerIndex), o); o += 8;
  b.writeBigUInt64LE(BigInt(args.nowSlot), o); o += 8;
  b.writeBigUInt64LE(BigInt(args.oraclePrice), o); o += 8;
  b.writeBigInt64LE(BigInt(args.fundingRateBpsPerSlot), o); o += 8;
  b[o] = args.allowPanic ? 1 : 0;
  return b;
}
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const WRAPPER_PROGRAM_ID = process.env.WRAPPER_PROGRAM_ID;
const CALLER_KEYPAIR_PATH = process.env.CALLER_KEYPAIR_PATH;

if (!WRAPPER_PROGRAM_ID) {
  console.error('Set WRAPPER_PROGRAM_ID to your Percolator wrapper program ID.');
  process.exit(1);
}

async function main() {
  const connection = new Connection(RPC_URL);
  const programId = new PublicKey(WRAPPER_PROGRAM_ID!);

  // In a real wrapper, you'd read current_slot and oracle_price from chain (oracle + clock).
  // Here we use placeholder values so the script runs; replace with actual fetch.
  const slot = await connection.getSlot();
  const oraclePrice = 1_000_000; // 1.0 with 6 decimals — replace with oracle read
  const fundingRateBpsPerSlot = 0;
  const callerIndex = 0; // index of the keeper's account in the engine (or 0 if no account)

  const data = buildKeeperCrankData({
    callerIndex,
    nowSlot: slot,
    oraclePrice,
    fundingRateBpsPerSlot,
    allowPanic: false,
  });

  const ix = new TransactionInstruction({
    keys: [], // wrapper defines accounts: engine state, clock, oracle, signer, etc.
    programId,
    data: Buffer.from(data),
  });

  let payer: Keypair;
  if (CALLER_KEYPAIR_PATH && fs.existsSync(CALLER_KEYPAIR_PATH)) {
    const secret = JSON.parse(fs.readFileSync(CALLER_KEYPAIR_PATH, 'utf-8'));
    payer = Keypair.fromSecretKey(Uint8Array.from(secret));
  } else {
    console.warn('No CALLER_KEYPAIR_PATH; using a new keypair (will fail on devnet without airdrop).');
    payer = Keypair.generate();
  }

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: 'confirmed',
    skipPreflight: false,
  });
  console.log('Keeper crank sent:', sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
