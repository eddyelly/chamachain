// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MazaoTrace} from "../MazaoTrace.sol";

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
            try mazao.confirmDelivery(targetId) {} catch {}
        }
    }
}
