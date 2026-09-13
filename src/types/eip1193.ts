/** Minimal EIP-1193 surface. No wallet SDK is bundled. */
export interface Eip1193RequestArgs {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface Eip1193Provider {
  request(args: Eip1193RequestArgs): Promise<unknown>;
  on?(event: string, listener: (...args: never[]) => void): void;
  removeListener?(event: string, listener: (...args: never[]) => void): void;
  readonly isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
