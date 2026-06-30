// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ChamaGroup} from "../ChamaGroup.sol";

contract MaliciousRecipient {
    ChamaGroup public group;
    uint256 public targetProposalId;
    bool public reentered;

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
            try group.approvePayout(targetProposalId) {} catch {}
        }
    }
}
