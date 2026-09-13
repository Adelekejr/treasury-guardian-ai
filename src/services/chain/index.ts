/** Chain adapter factory. One switch decides live vs. demo for the whole app. */
import type { AppConfig } from '../../config/env';
import { createDemoChainAdapter } from './demoAdapter';
import { createViemChainAdapter } from './viemAdapter';
import type { ChainAdapter } from './types';

export function createChainAdapter(config: AppConfig): ChainAdapter {
  return config.demoMode ? createDemoChainAdapter(config) : createViemChainAdapter(config);
}

export { createDemoChainAdapter } from './demoAdapter';
export { createViemChainAdapter } from './viemAdapter';
export { ChainUnavailableError } from './types';
export type { ChainAdapter, ReceiptSummary } from './types';
