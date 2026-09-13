import { config as loadEnv } from 'dotenv';
import { subtask, type HardhatUserConfig } from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from 'hardhat/builtin-tasks/task-names';
import '@nomicfoundation/hardhat-toolbox';

loadEnv();

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
const SOLC_VERSION = '0.8.26';

/**
 * Compile with the `solc` package from npm instead of downloading a binary
 * from binaries.soliditylang.org. This keeps `npm test` working in sandboxed
 * or offline CI, and pins the compiler to the version in package.json.
 * Hardhat's own download path still applies for any other version.
 */
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args: { solcVersion: string }, _hre, runSuper) => {
  if (args.solcVersion !== SOLC_VERSION) return runSuper(args);
  try {
    return {
      compilerPath: require.resolve('solc/soljson.js'),
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: args.solcVersion,
    };
  } catch {
    return runSuper(args);
  }
});
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();

/**
 * Only two networks exist here: the in-process Hardhat network for unit tests
 * and Arbitrum Sepolia. There is deliberately no mainnet or Arbitrum One
 * entry — there is nothing to point a deploy at.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: SOLC_VERSION,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Arbitrum Nitro tracks the Ethereum EVM closely, but `paris` keeps the
      // bytecode free of opcodes that newer forks introduced.
      evmVersion: 'paris',
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc',
      chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY ?? '',
    },
  },
  gasReporter: {
    enabled: false,
  },
};

export default config;
