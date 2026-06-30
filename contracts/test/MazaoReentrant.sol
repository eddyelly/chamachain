// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MazaoTrace} from "../MazaoTrace.sol";

/// @notice Test-only farmer that attempts to reenter on receiving a delivery payout.
contract MazaoReentrant {
    MazaoTrace public mazao;
    uint256 public targetId;
    bool public reentered;

    function setMazao(MazaoTrace _mazao) external {
        mazao = _mazao;
    }

    function setTarget(uint256 id) external {
        targetId = id;
    }

    function register(string calldata crop, uint256 quantityKg, uint256 price)
        external
        returns (uint256)
    {
        return mazao.registerBatch(crop, quantityKg, price);
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            // The reentrancy guard should reject this; swallow the revert so the legitimate
            // payout still completes, then assert in the test that no double spend occurred.
            try mazao.confirmDelivery(targetId) {
                // Reaching here would mean the guard failed.
            } catch {
                // Expected path.
            }
        }
    }
}
