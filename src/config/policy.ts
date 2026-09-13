/** Policy configuration, derived from environment config only. */
import type { AppConfig } from './env';
import { appConfig } from './env';

export const POLICY_VERSION = 'policy-1.0.0';

export interface PolicyConfig {
  readonly chainId: number;
  readonly allowedRecipients: readonly string[];
  readonly allowedMethods: readonly string[];
  readonly maxTransferWei: bigint;
  readonly version: string;
}

export function policyFromAppConfig(config: AppConfig): PolicyConfig {
  return {
    chainId: config.chainId,
    allowedRecipients: config.allowedRecipients,
    allowedMethods: config.allowedMethods,
    maxTransferWei: config.maxTransferWei,
    version: POLICY_VERSION,
  };
}

export const activePolicy: PolicyConfig = policyFromAppConfig(appConfig);
