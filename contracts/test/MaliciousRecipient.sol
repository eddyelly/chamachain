// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ChamaGroup} from "../ChamaGroup.sol";

/// @notice Test-only recipient that attempts to reenter the group on receiving a payout.
///         Used to prove the reentrancy guard holds. Not part of the production system.
contract MaliciousRecipient {
    ChamaGroup public group;
    uint256 public targetProposalId;
    bool public reentered;

    // Set after the group is deployed: the group needs this contract's address as a member,
    // and this contract needs the group's address, so the two are wired in separate steps.
    function setGroup(ChamaGroup _group) external {
        group = _group;
    }

    function setTarget(uint256 proposalId) external {
        targetProposalId = proposalId;
    }

    function proposePayout(address recipient, uint256 amount, string calldata reason)
        external
        returns (uint256)
    {
        return group.proposePayout(recipient, amount, reason);
    }

    function approve(uint256 proposalId) external {
        group.approvePayout(proposalId);
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            // The reentrancy guard should reject this. Swallow the revert so the legitimate
            // transfer still completes, then assert in the test that no double spend occurred.
            try group.approvePayout(targetProposalId) {
                // Reaching here would mean the guard failed.
            } catch {
                // Expected path: nonReentrant blocks the reentrant call.
            }
        }
    }
}
