// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SkillPass
/// @notice Soulbound credential NFTs. Institutions (issuers) mint non-transferable
///         certificates to a student's wallet. The wallet becomes a public skill passport.
contract SkillPass is ERC721, Ownable {
    mapping(address => bool) public isIssuer;
    mapping(address => string) public issuerName;

    event IssuerAdded(address indexed issuer, string name);

    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "SkillPass: not an issuer");
        _;
    }

    constructor(string memory name_, string memory symbol_, string memory firstIssuerName)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {
        isIssuer[msg.sender] = true;
        issuerName[msg.sender] = firstIssuerName;
        emit IssuerAdded(msg.sender, firstIssuerName);
    }

    function addIssuer(address issuer, string calldata name) external onlyOwner {
        require(issuer != address(0), "SkillPass: zero issuer");
        isIssuer[issuer] = true;
        issuerName[issuer] = name;
        emit IssuerAdded(issuer, name);
    }
}
