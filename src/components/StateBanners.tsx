/**
 * The banners that make every required state legible on any screen:
 * Demo Mode, wallet disconnected, wrong network, RPC outage, contract outage.
 */
import { ARBITRUM_SEPOLIA } from '../config/network';
import { useApp } from '../state/useApp';
import { Notice } from './Notice';

export function StateBanners(): React.JSX.Element | null {
  const {
    demoActive,
    demoReason,
    network,
    wallet,
    contractAvailable,
    contractReason,
    chainError,
    switchNetwork,
    connect,
  } = useApp();

  const banners: React.JSX.Element[] = [];

  if (demoActive) {
    banners.push(
      <Notice key="demo" tone="warning" title="Demo Mode is active — every figure on screen is a fixture.">
        {demoReason} No RPC call is made, no transaction is broadcast, and no funds can move.
      </Notice>,
    );
  }

  if (network?.state === 'WRONG_NETWORK') {
    banners.push(
      <Notice
        key="wrong-network"
        tone="danger"
        title={`Wrong network — this app only operates on ${ARBITRUM_SEPOLIA.name}.`}
        action={
          <button type="button" className="btn btn--sm btn--primary" onClick={() => void switchNetwork()}>
            Switch to {ARBITRUM_SEPOLIA.name}
          </button>
        }
      >
        {network.message} Chain {ARBITRUM_SEPOLIA.id} is the only supported target; nothing can be
        prepared or approved from another chain.
      </Notice>,
    );
  }

  if (!wallet.address && network?.state !== 'WRONG_NETWORK') {
    banners.push(
      <Notice
        key="wallet"
        tone="info"
        title="Wallet not connected — monitoring only."
        action={
          wallet.available ? (
            <button type="button" className="btn btn--sm" onClick={() => void connect()}>
              Connect wallet
            </button>
          ) : undefined
        }
      >
        {wallet.available
          ? 'Connect a wallet to prepare or approve a testnet action. Reading does not need one.'
          : 'No browser wallet was detected. You can still read everything on this screen.'}
        {wallet.error ? ` ${wallet.error}` : ''}
      </Notice>,
    );
  }

  if (network?.state === 'RPC_UNREACHABLE') {
    banners.push(
      <Notice key="rpc" tone="danger" title="The RPC endpoint is unreachable.">
        {network.message} {chainError ?? ''}
      </Notice>,
    );
  }

  if (!contractAvailable) {
    banners.push(
      <Notice key="contract" tone="warning" title="Guardian contract unavailable.">
        {contractReason ?? 'No contract address is configured.'} Monitoring and analysis still work;
        approval cannot be submitted on chain.
      </Notice>,
    );
  }

  if (banners.length === 0) return null;
  return <div className="stack">{banners}</div>;
}
