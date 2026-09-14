/**
 * Deterministic transaction fixtures.
 *
 * Between them these events reach every deterministic verdict: LOW_RISK,
 * REVIEW_REQUIRED (unknown recipient), REVIEW_REQUIRED (method not allowed),
 * BLOCKED (over limit), BLOCKED (wrong chain) and INSUFFICIENT_DATA.
 *
 * Every row carries provenance DEMO_FIXTURE and the UI labels it as such.
 */
import type { TransactionEvent } from '../types';
import { SUPPORTED_CHAIN_ID } from '../config/network';
import {
  DEMO_ALLOWED_RECIPIENTS,
  DEMO_DRAIN_RECIPIENT,
  DEMO_TREASURY_ADDRESS,
  DEMO_UNKNOWN_RECIPIENT,
} from './demo.accounts';
import { DEMO_BLOCK_NUMBER, demoHash, demoTime } from './demo.seed';

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export const DEMO_EVENTS: readonly TransactionEvent[] = [
  {
    id: 'demo-evt-001',
    chainId: SUPPORTED_CHAIN_ID,
    hash: demoHash('demo-evt-001'),
    timestamp: demoTime(-12 * MINUTE),
    from: DEMO_TREASURY_ADDRESS,
    to: DEMO_ALLOWED_RECIPIENTS[0],
    valueWei: 12_000_000_000_000_000n, // 0.012 ETH
    method: 'transferNative',
    decodedSummary: 'Send 0.012 ETH from the treasury to the allowlisted grants payout wallet.',
    direction: 'OUT',
    blockNumber: DEMO_BLOCK_NUMBER - 14n,
    provenance: 'DEMO_FIXTURE',
  },
  {
    id: 'demo-evt-002',
    chainId: SUPPORTED_CHAIN_ID,
    hash: demoHash('demo-evt-002'),
    timestamp: demoTime(-48 * MINUTE),
    from: DEMO_TREASURY_ADDRESS,
    to: DEMO_UNKNOWN_RECIPIENT,
    valueWei: 20_000_000_000_000_000n, // 0.02 ETH
    method: 'transferNative',
    decodedSummary: 'Send 0.02 ETH to an address that is not on the recipient allowlist.',
    direction: 'OUT',
    blockNumber: DEMO_BLOCK_NUMBER - 92n,
    provenance: 'DEMO_FIXTURE',
  },
  {
    id: 'demo-evt-003',
    chainId: SUPPORTED_CHAIN_ID,
    hash: demoHash('demo-evt-003'),
    timestamp: demoTime(-2 * HOUR),
    from: DEMO_TREASURY_ADDRESS,
    to: DEMO_DRAIN_RECIPIENT,
    valueWei: 400_000_000_000_000_000n, // 0.4 ETH, over the 0.05 limit
    method: 'transferNative',
    decodedSummary: 'Attempt to move 0.4 ETH out of the treasury in a single transfer.',
    direction: 'OUT',
    blockNumber: DEMO_BLOCK_NUMBER - 310n,
    provenance: 'DEMO_FIXTURE',
  },
  {
    id: 'demo-evt-004',
    chainId: SUPPORTED_CHAIN_ID,
    hash: demoHash('demo-evt-004'),
    timestamp: demoTime(-3 * HOUR),
    from: DEMO_TREASURY_ADDRESS,
    to: DEMO_ALLOWED_RECIPIENTS[1],
    valueWei: 4_000_000_000_000_000n, // 0.004 ETH
    method: 'approvePayout',
    decodedSummary: 'Approve a 0.004 ETH infrastructure reimbursement to an allowlisted wallet.',
    direction: 'OUT',
    blockNumber: DEMO_BLOCK_NUMBER - 445n,
    provenance: 'DEMO_FIXTURE',
  },
  {
    id: 'demo-evt-005',
    chainId: SUPPORTED_CHAIN_ID,
    hash: demoHash('demo-evt-005'),
    timestamp: demoTime(-5 * HOUR),
    from: DEMO_TREASURY_ADDRESS,
    to: DEMO_ALLOWED_RECIPIENTS[2],
    valueWei: 10_000_000_000_000_000n, // 0.01 ETH
    method: 'sweepAll',
    decodedSummary: 'Call sweepAll on the treasury, which is not on the method allowlist.',
    direction: 'OUT',
    blockNumber: DEMO_BLOCK_NUMBER - 780n,
    provenance: 'DEMO_FIXTURE',
  },
  {
    id: 'demo-evt-006',
    chainId: SUPPORTED_CHAIN_ID,
    hash: null,
    timestamp: demoTime(-6 * HOUR),
    from: DEMO_TREASURY_ADDRESS,
    to: null,
    valueWei: null,
    method: null,
    decodedSummary: 'Log entry with no recipient, value or method. The decoder could not read it.',
    direction: 'UNKNOWN',
    blockNumber: DEMO_BLOCK_NUMBER - 910n,
    provenance: 'DEMO_FIXTURE',
  },
  {
    id: 'demo-evt-007',
    // Not a usable target: this fixture exists only to prove that the app
    // refuses to act on anything that is not Arbitrum Sepolia (421614).
    chainId: 1,
    hash: demoHash('demo-evt-007'),
    timestamp: demoTime(-8 * HOUR),
    from: DEMO_TREASURY_ADDRESS,
    to: DEMO_ALLOWED_RECIPIENTS[0],
    valueWei: 5_000_000_000_000_000n, // 0.005 ETH
    method: 'transferNative',
    decodedSummary: 'Transfer observed on a foreign chain id, outside the supported network.',
    direction: 'OUT',
    blockNumber: null,
    provenance: 'DEMO_FIXTURE',
  },
  {
    id: 'demo-evt-008',
    chainId: SUPPORTED_CHAIN_ID,
    hash: demoHash('demo-evt-008'),
    timestamp: demoTime(-11 * HOUR),
    from: DEMO_ALLOWED_RECIPIENTS[2],
    to: DEMO_TREASURY_ADDRESS,
    valueWei: 30_000_000_000_000_000n, // 0.03 ETH
    method: 'transferNative',
    decodedSummary: 'Testnet top-up of 0.03 ETH into the treasury from the prize escrow wallet.',
    direction: 'IN',
    blockNumber: DEMO_BLOCK_NUMBER - 1320n,
    provenance: 'DEMO_FIXTURE',
  },
];

export const DEMO_TREASURY_BALANCE_WEI = 186_420_000_000_000_000n; // 0.18642 ETH
