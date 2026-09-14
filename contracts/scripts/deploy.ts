/**
 * Deploys TreasuryGuardian to Arbitrum Sepolia (chain id 421614).
 *
 * There is no mainnet path. The script refuses to run against any other chain
 * id, and every constructor argument comes from contracts/.env.
 */
import { ethers, network } from 'hardhat';

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614n;

function methodTag(label: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(label)).slice(0, 10);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in contracts/.env`);
  return value;
}

async function main(): Promise<void> {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (chainId !== ARBITRUM_SEPOLIA_CHAIN_ID && network.name !== 'hardhat' && network.name !== 'localhost') {
    throw new Error(
      `Refusing to deploy on chain ${chainId}. TreasuryGuardian deploys to ` +
        `Arbitrum Sepolia (${ARBITRUM_SEPOLIA_CHAIN_ID}) only.`,
    );
  }

  const approver = requireEnv('GUARDIAN_APPROVER');
  const recipients = requireEnv('GUARDIAN_ALLOWED_RECIPIENTS')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const methodLabels = (process.env.GUARDIAN_ALLOWED_METHODS ?? 'transferNative,approvePayout')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const maxTransferEth = process.env.GUARDIAN_MAX_TRANSFER_ETH?.trim() ?? '0.05';

  if (!ethers.isAddress(approver)) throw new Error(`GUARDIAN_APPROVER is not an address: ${approver}`);
  for (const recipient of recipients) {
    if (!ethers.isAddress(recipient)) throw new Error(`Allowlist entry is not an address: ${recipient}`);
  }
  if (recipients.length === 0) throw new Error('GUARDIAN_ALLOWED_RECIPIENTS is empty');

  const methods = methodLabels.map(methodTag);
  const maxTransferWei = ethers.parseEther(maxTransferEth);

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No signer available. Set DEPLOYER_PRIVATE_KEY in contracts/.env');

  console.log('Network         :', network.name, `(chain ${chainId})`);
  console.log('Deployer        :', deployer.address);
  console.log('Approver        :', approver);
  console.log('Recipients      :', recipients.join(', '));
  console.log('Methods         :', methodLabels.map((label, i) => `${label}=${methods[i]}`).join(', '));
  console.log('Max transfer    :', `${maxTransferEth} ETH`);

  const factory = await ethers.getContractFactory('TreasuryGuardian');
  const guardian = await factory.deploy(approver, recipients, methods, maxTransferWei);
  await guardian.waitForDeployment();

  const address = await guardian.getAddress();
  const deployTx = guardian.deploymentTransaction();

  console.log('\nTreasuryGuardian deployed');
  console.log('Address         :', address);
  console.log('Deploy tx       :', deployTx?.hash ?? 'unknown');
  console.log('Explorer        :', `https://sepolia.arbiscan.io/address/${address}`);
  console.log('\nSet these in the frontend .env:');
  console.log(`VITE_GUARDIAN_ADDRESS=${address}`);
  console.log(`VITE_TREASURY_ADDRESS=${address}`);
  console.log(`VITE_ALLOWED_RECIPIENTS=${recipients.join(',')}`);
  console.log(`VITE_ALLOWED_METHODS=${methodLabels.join(',')}`);
  console.log(`VITE_MAX_TRANSFER_ETH=${maxTransferEth}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
