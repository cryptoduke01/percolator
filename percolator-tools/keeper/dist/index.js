"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
// Inline crank data builder so keeper works without installing SDK.
// For full types/builders use @percolator/sdk.
function buildKeeperCrankData(args) {
    const KEEPER_CRANK = 0x03;
    const b = Buffer.alloc(1 + 8 * 4 + 1);
    let o = 0;
    b[o++] = KEEPER_CRANK;
    b.writeBigUInt64LE(BigInt(args.callerIndex), o);
    o += 8;
    b.writeBigUInt64LE(BigInt(args.nowSlot), o);
    o += 8;
    b.writeBigUInt64LE(BigInt(args.oraclePrice), o);
    o += 8;
    b.writeBigInt64LE(BigInt(args.fundingRateBpsPerSlot), o);
    o += 8;
    b[o] = args.allowPanic ? 1 : 0;
    return b;
}
const fs = __importStar(require("fs"));
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const WRAPPER_PROGRAM_ID = process.env.WRAPPER_PROGRAM_ID;
const CALLER_KEYPAIR_PATH = process.env.CALLER_KEYPAIR_PATH;
if (!WRAPPER_PROGRAM_ID) {
    console.error('Set WRAPPER_PROGRAM_ID to your Percolator wrapper program ID.');
    process.exit(1);
}
async function main() {
    const connection = new web3_js_1.Connection(RPC_URL);
    const programId = new web3_js_1.PublicKey(WRAPPER_PROGRAM_ID);
    // In a real wrapper, you'd read current_slot and oracle_price from chain (oracle + clock).
    // Here we use placeholder values so the script runs; replace with actual fetch.
    const slot = await connection.getSlot();
    const oraclePrice = 1000000; // 1.0 with 6 decimals — replace with oracle read
    const fundingRateBpsPerSlot = 0;
    const callerIndex = 0; // index of the keeper's account in the engine (or 0 if no account)
    const data = buildKeeperCrankData({
        callerIndex,
        nowSlot: slot,
        oraclePrice,
        fundingRateBpsPerSlot,
        allowPanic: false,
    });
    const ix = new web3_js_1.TransactionInstruction({
        keys: [], // wrapper defines accounts: engine state, clock, oracle, signer, etc.
        programId,
        data: Buffer.from(data),
    });
    let payer;
    if (CALLER_KEYPAIR_PATH && fs.existsSync(CALLER_KEYPAIR_PATH)) {
        const secret = JSON.parse(fs.readFileSync(CALLER_KEYPAIR_PATH, 'utf-8'));
        payer = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secret));
    }
    else {
        console.warn('No CALLER_KEYPAIR_PATH; using a new keypair (will fail on devnet without airdrop).');
        payer = web3_js_1.Keypair.generate();
    }
    const tx = new web3_js_1.Transaction().add(ix);
    const sig = await (0, web3_js_1.sendAndConfirmTransaction)(connection, tx, [payer], {
        commitment: 'confirmed',
        skipPreflight: false,
    });
    console.log('Keeper crank sent:', sig);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
