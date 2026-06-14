// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ChamaGroup
/// @notice A transparent savings group (chama / kikoba). Members contribute funds to a
///         shared pool recorded as an immutable on-chain ledger. Payouts from the pool
///         release only when an m-of-n threshold of members approves (default 3 of 5).
/// @dev Approvals auto-execute the payout the instant the threshold is reached, so the
///      threshold-th approval is the release moment.
contract ChamaGroup is ReentrancyGuard {
    /// @notice Human-readable group name (for example "Kikoba cha Wajasiriamali").
    string public name;

    /// @notice Number of approvals required to release a payout (n).
    uint256 public immutable threshold;

    /// @notice Total number of members (m).
    uint256 public immutable memberCount;

    mapping(address => bool) public isMember;
    mapping(address => string) public memberLabel;
    mapping(address => uint256) public totalContributed;
    address[] private memberList;

    struct Contribution {
        uint256 index;
        address contributor;
        uint256 amount;
        uint256 timestamp;
    }

    Contribution[] private ledger;

    struct Proposal {
        uint256 id;
        address proposer;
        address recipient;
        uint256 amount;
        string reason;
        uint256 approvalCount;
        bool executed;
        uint256 createdAt;
    }

    Proposal[] private proposals;

    /// @notice proposalId => member => whether that member has approved.
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    event ContributionMade(
        uint256 indexed index,
        address indexed contributor,
        uint256 amount,
        uint256 timestamp
    );
    event PayoutProposed(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed recipient,
        uint256 amount,
        string reason
    );
    event PayoutApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 approvalCount
    );
    event PayoutExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount
    );

    modifier onlyMember() {
        require(isMember[msg.sender], "ChamaGroup: not a member");
        _;
    }

    /// @param _name Group name.
    /// @param _members Fixed member set, set once at creation.
    /// @param _labels Human-readable label per member, parallel to `_members`.
    /// @param _threshold Approvals required to release a payout (n of `_members.length`).
    constructor(
        string memory _name,
        address[] memory _members,
        string[] memory _labels,
        uint256 _threshold
    ) {
        require(_members.length == _labels.length, "ChamaGroup: members/labels length mismatch");
        require(_members.length > 0, "ChamaGroup: no members");
        require(_threshold > 0 && _threshold <= _members.length, "ChamaGroup: invalid threshold");

        name = _name;
        threshold = _threshold;
        memberCount = _members.length;

        for (uint256 i = 0; i < _members.length; i++) {
            address account = _members[i];
            require(account != address(0), "ChamaGroup: zero member");
            require(!isMember[account], "ChamaGroup: duplicate member");

            isMember[account] = true;
            memberLabel[account] = _labels[i];
            memberList.push(account);
        }
    }

    // ----------------------------------------------------------------------------------
    // Contributions (the transparent ledger)
    // ----------------------------------------------------------------------------------

    /// @notice Contribute AVAX to the shared pool. Appends an immutable ledger entry.
    /// @dev Restricted to members: a chama is a closed circle and per-member totals must
    ///      stay meaningful. Plain transfers are rejected (no receive/fallback) so the
    ///      pooled balance always equals the sum of recorded contributions.
    function contribute() external payable onlyMember {
        require(msg.value > 0, "ChamaGroup: zero contribution");

        uint256 index = ledger.length;
        ledger.push(
            Contribution({
                index: index,
                contributor: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp
            })
        );
        totalContributed[msg.sender] += msg.value;

        emit ContributionMade(index, msg.sender, msg.value, block.timestamp);
    }

    // ----------------------------------------------------------------------------------
    // Payouts (m-of-n escrow)
    // ----------------------------------------------------------------------------------

    /// @notice Propose releasing `amount` from the pool to `recipient`. Members only.
    /// @dev Proposing does not count as an approval; the proposer approves explicitly,
    ///      keeping the approval count an honest tally of distinct member signatures.
    function proposePayout(address recipient, uint256 amount, string calldata reason)
        external
        onlyMember
        returns (uint256 proposalId)
    {
        require(recipient != address(0), "ChamaGroup: zero recipient");
        require(amount > 0, "ChamaGroup: zero amount");
        require(amount <= address(this).balance, "ChamaGroup: amount exceeds pool");

        proposalId = proposals.length;
        proposals.push(
            Proposal({
                id: proposalId,
                proposer: msg.sender,
                recipient: recipient,
                amount: amount,
                reason: reason,
                approvalCount: 0,
                executed: false,
                createdAt: block.timestamp
            })
        );

        emit PayoutProposed(proposalId, msg.sender, recipient, amount, reason);
    }

    /// @notice Record the caller's approval for a proposal. Releases funds automatically
    ///         once approvals reach the threshold. Members only, one approval per member.
    function approvePayout(uint256 proposalId) external onlyMember nonReentrant {
        Proposal storage p = _proposal(proposalId);
        require(!p.executed, "ChamaGroup: already executed");
        require(!hasApproved[proposalId][msg.sender], "ChamaGroup: already approved");

        hasApproved[proposalId][msg.sender] = true;
        p.approvalCount += 1;
        emit PayoutApproved(proposalId, msg.sender, p.approvalCount);

        if (p.approvalCount >= threshold) {
            _execute(p);
        }
    }

    /// @dev Checks-effects-interactions: mark executed before transferring. Combined with
    ///      the nonReentrant guard on `approvePayout`, this blocks reentrancy and double spend.
    function _execute(Proposal storage p) private {
        require(p.amount <= address(this).balance, "ChamaGroup: insufficient pool");

        p.executed = true;

        (bool ok, ) = p.recipient.call{value: p.amount}("");
        require(ok, "ChamaGroup: transfer failed");

        emit PayoutExecuted(p.id, p.recipient, p.amount);
    }

    // ----------------------------------------------------------------------------------
    // Views
    // ----------------------------------------------------------------------------------

    /// @notice Dashboard header in one call: name, threshold (n), member count (m), pool balance.
    function groupInfo()
        external
        view
        returns (string memory groupName, uint256 n, uint256 m, uint256 pooledBalance)
    {
        return (name, threshold, memberCount, address(this).balance);
    }

    /// @notice Current pooled balance held in escrow.
    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice The full ordered contribution ledger.
    function getLedger() external view returns (Contribution[] memory) {
        return ledger;
    }

    function ledgerLength() external view returns (uint256) {
        return ledger.length;
    }

    /// @notice Members with their labels and running contribution totals, in registration order.
    function getMembers()
        external
        view
        returns (address[] memory accounts, string[] memory labels, uint256[] memory totals)
    {
        uint256 len = memberList.length;
        accounts = new address[](len);
        labels = new string[](len);
        totals = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            address account = memberList[i];
            accounts[i] = account;
            labels[i] = memberLabel[account];
            totals[i] = totalContributed[account];
        }
    }

    /// @notice All payout proposals with their current approval count and executed status.
    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _proposal(proposalId);
    }

    /// @notice Addresses of members who have approved a given proposal (for "who has signed").
    function getApprovers(uint256 proposalId) external view returns (address[] memory approvers) {
        _proposal(proposalId);

        uint256 len = memberList.length;
        uint256 count;
        for (uint256 i = 0; i < len; i++) {
            if (hasApproved[proposalId][memberList[i]]) count++;
        }

        approvers = new address[](count);
        uint256 j;
        for (uint256 i = 0; i < len; i++) {
            address account = memberList[i];
            if (hasApproved[proposalId][account]) {
                approvers[j] = account;
                j++;
            }
        }
    }

    function _proposal(uint256 proposalId) private view returns (Proposal storage) {
        require(proposalId < proposals.length, "ChamaGroup: bad proposalId");
        return proposals[proposalId];
    }
}
