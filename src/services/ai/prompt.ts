/** Builds the read-only context handed to a model. */
import type { AiExplainInput } from './types';

export const AI_SYSTEM_PROMPT = [
  'You explain Arbitrum Sepolia testnet treasury transactions for a human reviewer.',
  'A deterministic policy engine has already decided the risk verdict. That verdict is final,',
  'is enforced in code, and is not yours to change. You are given it as read-only context.',
  'Reply with a single JSON object and nothing else, using exactly these fields:',
  '{"summary": string, "rationale": string, "citedFactIds": string[], "recommendation":',
  '"APPROVE_FOR_REVIEW" | "REQUIRE_REVIEW" | "BLOCK", "caveats": string[]}.',
  'Every citedFactIds entry must be one of the observed fact ids supplied below.',
  'Do not give financial advice, do not speculate about token prices, and do not claim a',
  'transaction succeeded unless a receipt fact says so.',
].join(' ');

export function buildUserPrompt(input: AiExplainInput): string {
  const facts = input.facts.map((fact) => `- ${fact.id} | ${fact.label}: ${fact.value}`).join('\n');
  const checks = input.assessment.checks
    .map((check) => `- ${check.rule}: ${check.status}. ${check.detail}`)
    .join('\n');

  return [
    `Deterministic verdict (READ-ONLY, already enforced): ${input.assessment.verdict}`,
    `Policy version: ${input.assessment.policyVersion}`,
    '',
    'Observed facts (cite these ids):',
    facts,
    '',
    'Policy checks:',
    checks,
    '',
    `Event provenance: ${input.event.provenance}`,
    `Decoded summary: ${input.event.decodedSummary}`,
    '',
    'Explain, for a human approver, what this transaction does and why the verdict makes sense.',
  ].join('\n');
}
