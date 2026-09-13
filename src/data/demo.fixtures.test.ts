import { describe, expect, it } from 'vitest';
import { DEMO_EVENTS } from './demo.events';
import { DEMO_MAX_TRANSFER_WEI, DEMO_POLICY_METHODS, DEMO_POLICY_RECIPIENTS } from './demo.policy';
import { DEMO_CLOCK_SECONDS, createSeededRandom, demoHash } from './demo.seed';
import { POLICY_VERSION } from '../config/policy';
import { SUPPORTED_CHAIN_ID } from '../config/network';
import { assessEvent } from '../services/policy/rules';
import type { PolicyConfig } from '../config/policy';

const DEMO_POLICY: PolicyConfig = {
  chainId: SUPPORTED_CHAIN_ID,
  allowedRecipients: DEMO_POLICY_RECIPIENTS,
  allowedMethods: DEMO_POLICY_METHODS,
  maxTransferWei: DEMO_MAX_TRANSFER_WEI,
  version: POLICY_VERSION,
};

describe('demo fixtures', () => {
  it('are deterministic', () => {
    expect(demoHash('demo-evt-001')).toEqual(demoHash('demo-evt-001'));
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('label every event as a demo fixture', () => {
    for (const event of DEMO_EVENTS) {
      expect(event.provenance).toBe('DEMO_FIXTURE');
    }
  });

  it('have stable ids and timestamps anchored to the demo clock', () => {
    const ids = DEMO_EVENTS.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const event of DEMO_EVENTS) {
      if (event.timestamp === null) continue;
      expect(event.timestamp).toBeLessThanOrEqual(DEMO_CLOCK_SECONDS);
    }
  });

  it('reach every deterministic verdict', () => {
    const verdicts = new Set(
      DEMO_EVENTS.map((event) => assessEvent(event, DEMO_POLICY, DEMO_CLOCK_SECONDS).verdict),
    );
    expect(verdicts).toEqual(new Set(['LOW_RISK', 'REVIEW_REQUIRED', 'BLOCKED', 'INSUFFICIENT_DATA']));
  });

  it('expose no non-Arbitrum-Sepolia event as anything but blocked', () => {
    for (const event of DEMO_EVENTS) {
      if (event.chainId === SUPPORTED_CHAIN_ID) continue;
      expect(assessEvent(event, DEMO_POLICY, DEMO_CLOCK_SECONDS).verdict).toBe('BLOCKED');
    }
  });
});
