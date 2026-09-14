/**
 * TreasuryGuardian ABI, hand-mirrored from
 * contracts/contracts/TreasuryGuardian.sol. Every entry exists in that file.
 */
import { keccak256, toBytes } from 'viem';

export const TREASURY_GUARDIAN_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'approver_', type: 'address' },
      { name: 'recipients_', type: 'address[]' },
      { name: 'methods_', type: 'bytes4[]' },
      { name: 'maxTransferWei_', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    name: 'approver',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxTransferWei',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'proposalCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isAllowedRecipient',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isAllowedMethod',
    inputs: [{ name: '', type: 'bytes4' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowedRecipients',
    inputs: [],
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowedMethods',
    inputs: [],
    outputs: [{ type: 'bytes4[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowedRecipientCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'statusOf',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProposal',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'method', type: 'bytes4' },
          { name: 'status', type: 'uint8' },
          { name: 'proposer', type: 'address' },
          { name: 'reason', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'propose',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'method', type: 'bytes4' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reject',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'proposer', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
      { name: 'method', type: 'bytes4', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProposalApproved',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'approver', type: 'address', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProposalRejected',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'approver', type: 'address', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProposalExecuted',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
      { name: 'method', type: 'bytes4', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const;

/**
 * Method tag, computed as bytes4(keccak256(bytes(label))). The deploy script
 * derives it the same way, so labels in the UI map to the tags stored on chain.
 */
export function methodTag(label: string): `0x${string}` {
  return keccak256(toBytes(label)).slice(0, 10) as `0x${string}`;
}

export function methodLabelFromTag(tag: string, knownLabels: readonly string[]): string | null {
  const needle = tag.toLowerCase();
  return knownLabels.find((label) => methodTag(label).toLowerCase() === needle) ?? null;
}

/** Proposal status enum, mirroring the Solidity `Status` enum order. */
export const PROPOSAL_STATUS = ['None', 'Pending', 'Approved', 'Rejected', 'Executed'] as const;
export type ProposalStatusLabel = (typeof PROPOSAL_STATUS)[number];
