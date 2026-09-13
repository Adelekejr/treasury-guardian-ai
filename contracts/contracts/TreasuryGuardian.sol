// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TreasuryGuardian
 * @notice The smallest contract that demonstrates the safety boundary of
 *         Treasury Guardian AI on Arbitrum Sepolia (chain id 421614).
 *
 *         An agent (or anyone) may PROPOSE a native-ETH payout. Nothing moves
 *         until the single authorised approver explicitly APPROVES it, and
 *         execution re-checks every limit at execution time.
 *
 * Safety properties, on purpose:
 *  - no delegatecall, no arbitrary external calls, no calldata forwarding;
 *    the only value movement is a plain native transfer to an allowlisted
 *    recipient;
 *  - no owner backdoor: the approver, the recipient allowlist, the method
 *    allowlist and the transfer limit are all fixed at construction and there
 *    is no setter, no pause, no sweep and no self-destruct;
 *  - no upgradeability and no proxy;
 *  - no token approvals of any kind, so no unlimited allowance is possible;
 *  - all addresses and limits come from deploy-time configuration, never from
 *    values hardcoded in this source.
 *
 * @dev `method` is a bytes4 label tag, computed off-chain as
 *      bytes4(keccak256(bytes(label))) for a human label such as
 *      "transferNative". It records WHAT the payout is for and is checked
 *      against the method allowlist; it is never used to dispatch a call.
 */
contract TreasuryGuardian {
    enum Status {
        None,
        Pending,
        Approved,
        Rejected,
        Executed
    }

    struct Proposal {
        address to;
        uint256 value;
        bytes4 method;
        Status status;
        address proposer;
        string reason;
    }

    /// @notice The only address that may approve, reject or execute.
    address public immutable approver;

    /// @notice Maximum value, in wei, of any single proposal.
    uint256 public immutable maxTransferWei;

    uint256 public proposalCount;

    mapping(address => bool) public isAllowedRecipient;
    mapping(bytes4 => bool) public isAllowedMethod;
    mapping(uint256 => Proposal) private _proposals;

    address[] private _allowedRecipients;
    bytes4[] private _allowedMethods;

    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        address indexed to,
        uint256 value,
        bytes4 method,
        string reason
    );
    event ProposalApproved(uint256 indexed id, address indexed approver);
    event ProposalRejected(uint256 indexed id, address indexed approver, string reason);
    event ProposalExecuted(uint256 indexed id, address indexed to, uint256 value, bytes4 method);
    event Deposit(address indexed from, uint256 amount);

    error ZeroAddress();
    error EmptyAllowlist();
    error ZeroLimit();
    error NotApprover();
    error RecipientNotAllowed(address to);
    error MethodNotAllowed(bytes4 method);
    error AmountOverLimit(uint256 value, uint256 limit);
    error ZeroAmount();
    error UnknownProposal(uint256 id);
    error ProposalNotPending(uint256 id, Status status);
    error ProposalNotApproved(uint256 id, Status status);
    error InsufficientBalance(uint256 needed, uint256 available);
    error TransferFailed();

    modifier onlyApprover() {
        if (msg.sender != approver) revert NotApprover();
        _;
    }

    /**
     * @param approver_ the single authorised human approver
     * @param recipients_ the recipient allowlist (non-empty)
     * @param methods_ the method-label allowlist (non-empty)
     * @param maxTransferWei_ maximum value of a single proposal, in wei
     */
    constructor(
        address approver_,
        address[] memory recipients_,
        bytes4[] memory methods_,
        uint256 maxTransferWei_
    ) {
        if (approver_ == address(0)) revert ZeroAddress();
        if (recipients_.length == 0 || methods_.length == 0) revert EmptyAllowlist();
        if (maxTransferWei_ == 0) revert ZeroLimit();

        approver = approver_;
        maxTransferWei = maxTransferWei_;

        for (uint256 i = 0; i < recipients_.length; ++i) {
            address recipient = recipients_[i];
            if (recipient == address(0)) revert ZeroAddress();
            if (!isAllowedRecipient[recipient]) {
                isAllowedRecipient[recipient] = true;
                _allowedRecipients.push(recipient);
            }
        }

        for (uint256 i = 0; i < methods_.length; ++i) {
            bytes4 method = methods_[i];
            if (!isAllowedMethod[method]) {
                isAllowedMethod[method] = true;
                _allowedMethods.push(method);
            }
        }
    }

    /// @notice Fund the guardian with testnet ETH.
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Record a payout proposal. Never moves value.
     * @dev Reverts on a recipient that is not allowlisted, a method that is not
     *      allowlisted, or an amount over the configured limit.
     */
    function propose(
        address to,
        uint256 value,
        bytes4 method,
        string calldata reason
    ) external returns (uint256 id) {
        if (!isAllowedRecipient[to]) revert RecipientNotAllowed(to);
        if (!isAllowedMethod[method]) revert MethodNotAllowed(method);
        if (value == 0) revert ZeroAmount();
        if (value > maxTransferWei) revert AmountOverLimit(value, maxTransferWei);

        id = ++proposalCount;
        _proposals[id] = Proposal({
            to: to,
            value: value,
            method: method,
            status: Status.Pending,
            proposer: msg.sender,
            reason: reason
        });

        emit ProposalCreated(id, msg.sender, to, value, method, reason);
    }

    /// @notice Explicit human approval. Required before any execution.
    function approve(uint256 id) external onlyApprover {
        Proposal storage proposal = _requirePending(id);
        proposal.status = Status.Approved;
        emit ProposalApproved(id, msg.sender);
    }

    /// @notice Explicit human rejection. Terminal.
    function reject(uint256 id, string calldata reason) external onlyApprover {
        Proposal storage proposal = _requirePending(id);
        proposal.status = Status.Rejected;
        emit ProposalRejected(id, msg.sender, reason);
    }

    /**
     * @notice Execute an approved proposal. Reverts if it was never approved.
     * @dev Limits are re-checked here so a change of state between proposal and
     *      execution cannot widen what is permitted.
     */
    function execute(uint256 id) external onlyApprover {
        Proposal storage proposal = _proposals[id];
        if (proposal.status == Status.None) revert UnknownProposal(id);
        if (proposal.status != Status.Approved) revert ProposalNotApproved(id, proposal.status);

        address to = proposal.to;
        uint256 value = proposal.value;
        bytes4 method = proposal.method;

        if (!isAllowedRecipient[to]) revert RecipientNotAllowed(to);
        if (!isAllowedMethod[method]) revert MethodNotAllowed(method);
        if (value > maxTransferWei) revert AmountOverLimit(value, maxTransferWei);
        if (value > address(this).balance) revert InsufficientBalance(value, address(this).balance);

        // Effects before interaction.
        proposal.status = Status.Executed;
        emit ProposalExecuted(id, to, value, method);

        (bool ok, ) = payable(to).call{value: value}('');
        if (!ok) revert TransferFailed();
    }

    function getProposal(uint256 id) external view returns (Proposal memory) {
        Proposal memory proposal = _proposals[id];
        if (proposal.status == Status.None) revert UnknownProposal(id);
        return proposal;
    }

    function statusOf(uint256 id) external view returns (Status) {
        return _proposals[id].status;
    }

    function allowedRecipients() external view returns (address[] memory) {
        return _allowedRecipients;
    }

    function allowedMethods() external view returns (bytes4[] memory) {
        return _allowedMethods;
    }

    function allowedRecipientCount() external view returns (uint256) {
        return _allowedRecipients.length;
    }

    function _requirePending(uint256 id) private view returns (Proposal storage proposal) {
        proposal = _proposals[id];
        if (proposal.status == Status.None) revert UnknownProposal(id);
        if (proposal.status != Status.Pending) revert ProposalNotPending(id, proposal.status);
    }
}
