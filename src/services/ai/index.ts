/** AI adapter factory. Mock by default, remote only when fully configured. */
import { appConfig } from '../../config/env';
import { createMockAiAdapter } from './mockAdapter';
import { createRemoteAiAdapter } from './remoteAdapter';
import type { AiAdapter } from './types';

export interface AiAdapterSelection {
  readonly adapter: AiAdapter;
  /** Explains, in the UI, why this adapter is in use. */
  readonly reason: string;
}

export function selectAiAdapter(apiKey: string | null): AiAdapterSelection {
  if (appConfig.demoMode) {
    return {
      adapter: createMockAiAdapter(),
      reason: 'Demo Mode is active. Explanations come from the offline mock adapter.',
    };
  }
  if (!appConfig.aiEndpoint) {
    return {
      adapter: createMockAiAdapter(),
      reason: 'No AI endpoint is configured, so the offline mock adapter is in use.',
    };
  }
  if (!apiKey) {
    return {
      adapter: createMockAiAdapter(),
      reason: 'No session API key has been entered, so the offline mock adapter is in use.',
    };
  }
  return {
    adapter: createRemoteAiAdapter({
      endpoint: appConfig.aiEndpoint,
      model: appConfig.aiModel,
      apiKey,
    }),
    reason: 'Using the configured remote provider with a session-only key.',
  };
}

export { createMockAiAdapter } from './mockAdapter';
export { createRemoteAiAdapter } from './remoteAdapter';
export { applyAiOutput, aiUnavailable, aiConflictsWithPolicy } from './guard';
export { validateAiExplanation, parseModelJson } from './schema';
export type { AiAdapter, AiExplainInput } from './types';
