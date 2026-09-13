import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

/** bytes4 method tag, computed the same way the frontend computes it. */
function methodTag(label: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(label)).slice(0, 10);
}

const TRANSFER_NATIVE = methodTag('transferNative');
const APPROVE_PAYOUT = methodTag('approvePayout');
const SWEEP_ALL = methodTag('sweepAll');

const MAX_TRANSFER = ethers.parseEther('0.05');

describe('TreasuryGuardian', () => {
  async function deployFixture() {
    const [deployer, approver, allowed, otherAllowed, stranger] = await ethers.getSigners();

    const factory = await ethers.getContractFactory('TreasuryGuardian');
    const guardian = await factory.deploy(
      approver.address,
      [allowed.address, otherAllowed.address],
      [TRANSFER_NATIVE, APPROVE_PAYOUT],
      MAX_TRANSFER,
    );
    await guardian.waitForDeployment();

    // Fund the guardian with testnet ETH so execution has something to move.
    await deployer.sendTransaction({
      to: await guardian.getAddress(),
      value: ethers.parseEther('1'),
    });

    return { guardian, deployer, approver, allowed, otherAllowed, stranger };
  }

  describe('construction', () => {
    it('stores the approver, limit and allowlists from constructor arguments', async () => {
      const { guardian, approver, allowed, otherAllowed } = await loadFixture(deployFixture);

      expect(await guardian.approver()).to.equal(approver.address);
      expect(await guardian.maxTransferWei()).to.equal(MAX_TRANSFER);
      expect(await guardian.allowedRecipients()).to.deep.equal([allowed.address, otherAllowed.address]);
      expect(await guardian.allowedMethods()).to.deep.equal([TRANSFER_NATIVE, APPROVE_PAYOUT]);
      expect(await guardian.isAllowedRecipient(allowed.address)).to.equal(true);
    });

    it('refuses a zero approver, an empty allowlist and a zero limit', async () => {
      const [, approver, allowed] = await ethers.getSigners();
      const factory = await ethers.getContractFactory('TreasuryGuardian');

      await expect(
        factory.deploy(ethers.ZeroAddress, [allowed.address], [TRANSFER_NATIVE], MAX_TRANSFER),
      ).to.be.revertedWithCustomError(factory, 'ZeroAddress');

      await expect(
        factory.deploy(approver.address, [], [TRANSFER_NATIVE], MAX_TRANSFER),
      ).to.be.revertedWithCustomError(factory, 'EmptyAllowlist');

      await expect(
        factory.deploy(approver.address, [allowed.address], [TRANSFER_NATIVE], 0n),
      ).to.be.revertedWithCustomError(factory, 'ZeroLimit');
    });
  });

  describe('propose', () => {
    it('rejects a recipient that is not on the allowlist', async () => {
      const { guardian, stranger } = await loadFixture(deployFixture);

      await expect(
        guardian.propose(stranger.address, ethers.parseEther('0.001'), TRANSFER_NATIVE, 'unknown payee'),
      )
        .to.be.revertedWithCustomError(guardian, 'RecipientNotAllowed')
        .withArgs(stranger.address);
    });

    it('rejects an amount over the configured testnet limit', async () => {
      const { guardian, allowed } = await loadFixture(deployFixture);
      const overLimit = MAX_TRANSFER + 1n;

      await expect(guardian.propose(allowed.address, overLimit, TRANSFER_NATIVE, 'too much'))
        .to.be.revertedWithCustomError(guardian, 'AmountOverLimit')
        .withArgs(overLimit, MAX_TRANSFER);
    });

    it('rejects a method that is not on the allowlist', async () => {
      const { guardian, allowed } = await loadFixture(deployFixture);

      await expect(guardian.propose(allowed.address, ethers.parseEther('0.001'), SWEEP_ALL, 'sweep'))
        .to.be.revertedWithCustomError(guardian, 'MethodNotAllowed')
        .withArgs(SWEEP_ALL);
    });

    it('rejects a zero amount', async () => {
      const { guardian, allowed } = await loadFixture(deployFixture);

      await expect(
        guardian.propose(allowed.address, 0n, TRANSFER_NATIVE, 'nothing'),
      ).to.be.revertedWithCustomError(guardian, 'ZeroAmount');
    });

    it('records a valid proposal as pending and emits ProposalCreated', async () => {
      const { guardian, deployer, allowed } = await loadFixture(deployFixture);
      const value = ethers.parseEther('0.01');

      await expect(guardian.propose(allowed.address, value, TRANSFER_NATIVE, 'grant payout'))
        .to.emit(guardian, 'ProposalCreated')
        .withArgs(1n, deployer.address, allowed.address, value, TRANSFER_NATIVE, 'grant payout');

      expect(await guardian.proposalCount()).to.equal(1n);
      expect(await guardian.statusOf(1n)).to.equal(1n); // Pending

      const proposal = await guardian.getProposal(1n);
      expect(proposal.to).to.equal(allowed.address);
      expect(proposal.value).to.equal(value);
      expect(proposal.method).to.equal(TRANSFER_NATIVE);
    });
  });

  describe('approval boundary', () => {
    it('reverts when execution is attempted without approval', async () => {
      const { guardian, approver, allowed } = await loadFixture(deployFixture);
      await guardian.propose(allowed.address, ethers.parseEther('0.01'), TRANSFER_NATIVE, 'grant');

      await expect(guardian.connect(approver).execute(1n))
        .to.be.revertedWithCustomError(guardian, 'ProposalNotApproved')
        .withArgs(1n, 1n); // Pending
    });

    it('only the approver may approve, reject or execute', async () => {
      const { guardian, stranger, allowed, approver } = await loadFixture(deployFixture);
      await guardian.propose(allowed.address, ethers.parseEther('0.01'), TRANSFER_NATIVE, 'grant');

      await expect(guardian.connect(stranger).approve(1n)).to.be.revertedWithCustomError(
        guardian,
        'NotApprover',
      );
      await expect(guardian.connect(stranger).reject(1n, 'no')).to.be.revertedWithCustomError(
        guardian,
        'NotApprover',
      );

      await guardian.connect(approver).approve(1n);
      await expect(guardian.connect(stranger).execute(1n)).to.be.revertedWithCustomError(
        guardian,
        'NotApprover',
      );
    });

    it('executes an approved proposal exactly once and pays the recipient', async () => {
      const { guardian, approver, allowed } = await loadFixture(deployFixture);
      const value = ethers.parseEther('0.02');
      await guardian.propose(allowed.address, value, TRANSFER_NATIVE, 'grant payout');

      await expect(guardian.connect(approver).approve(1n))
        .to.emit(guardian, 'ProposalApproved')
        .withArgs(1n, approver.address);

      await expect(guardian.connect(approver).execute(1n)).to.changeEtherBalances(
        [guardian, allowed],
        [-value, value],
      );

      expect(await guardian.statusOf(1n)).to.equal(4n); // Executed

      await expect(guardian.connect(approver).execute(1n))
        .to.be.revertedWithCustomError(guardian, 'ProposalNotApproved')
        .withArgs(1n, 4n);
    });

    it('emits ProposalExecuted with the exact recipient, value and method', async () => {
      const { guardian, approver, allowed } = await loadFixture(deployFixture);
      const value = ethers.parseEther('0.005');
      await guardian.propose(allowed.address, value, APPROVE_PAYOUT, 'reimbursement');
      await guardian.connect(approver).approve(1n);

      await expect(guardian.connect(approver).execute(1n))
        .to.emit(guardian, 'ProposalExecuted')
        .withArgs(1n, allowed.address, value, APPROVE_PAYOUT);
    });

    it('cannot execute a rejected proposal', async () => {
      const { guardian, approver, allowed } = await loadFixture(deployFixture);
      await guardian.propose(allowed.address, ethers.parseEther('0.01'), TRANSFER_NATIVE, 'grant');

      await expect(guardian.connect(approver).reject(1n, 'recipient unverified'))
        .to.emit(guardian, 'ProposalRejected')
        .withArgs(1n, approver.address, 'recipient unverified');

      await expect(guardian.connect(approver).execute(1n))
        .to.be.revertedWithCustomError(guardian, 'ProposalNotApproved')
        .withArgs(1n, 3n); // Rejected

      await expect(guardian.connect(approver).approve(1n))
        .to.be.revertedWithCustomError(guardian, 'ProposalNotPending')
        .withArgs(1n, 3n);
    });

    it('reverts when the guardian cannot cover the approved amount', async () => {
      const [, approver, allowed] = await ethers.getSigners();
      const factory = await ethers.getContractFactory('TreasuryGuardian');
      const guardian = await factory.deploy(
        approver.address,
        [allowed.address],
        [TRANSFER_NATIVE],
        MAX_TRANSFER,
      );
      await guardian.waitForDeployment(); // deliberately unfunded

      const value = ethers.parseEther('0.01');
      await guardian.propose(allowed.address, value, TRANSFER_NATIVE, 'grant');
      await guardian.connect(approver).approve(1n);

      await expect(guardian.connect(approver).execute(1n))
        .to.be.revertedWithCustomError(guardian, 'InsufficientBalance')
        .withArgs(value, 0n);
    });

    it('reverts on an unknown proposal id', async () => {
      const { guardian, approver } = await loadFixture(deployFixture);

      await expect(guardian.connect(approver).approve(99n))
        .to.be.revertedWithCustomError(guardian, 'UnknownProposal')
        .withArgs(99n);
      await expect(guardian.connect(approver).execute(99n))
        .to.be.revertedWithCustomError(guardian, 'UnknownProposal')
        .withArgs(99n);
    });
  });

  describe('deposits', () => {
    it('accepts testnet funding and emits Deposit', async () => {
      const { guardian, deployer } = await loadFixture(deployFixture);
      const amount = ethers.parseEther('0.25');

      await expect(deployer.sendTransaction({ to: await guardian.getAddress(), value: amount }))
        .to.emit(guardian, 'Deposit')
        .withArgs(deployer.address, amount);
    });
  });

  describe('surface area', () => {
    it('exposes no owner, pause, upgrade, sweep or allowlist mutator', async () => {
      const { guardian } = await loadFixture(deployFixture);
      const names = guardian.interface.fragments
        .filter((fragment) => fragment.type === 'function')
        .map((fragment) => (fragment as { name: string }).name.toLowerCase());

      for (const forbidden of [
        'owner',
        'transferownership',
        'pause',
        'unpause',
        'upgradeto',
        'setapprover',
        'setmaxtransfer',
        'addrecipient',
        'removerecipient',
        'sweep',
        'withdraw',
        'rescue',
        'selfdestruct',
      ]) {
        expect(names, `unexpected ${forbidden}()`).to.not.include(forbidden);
      }
    });
  });
});
