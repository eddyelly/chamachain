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

    struct Certificate {
        uint256 id;
        address student;
        address issuer;
        string course;
        string fileName;
        bytes32 fileHash;
        uint64 issuedAt;
        bool revoked;
    }

    mapping(uint256 => Certificate) private _certificates;
    mapping(address => uint256[]) private _studentTokens;
    mapping(bytes32 => uint256) public tokenIdByHash;
    uint256 public nextId = 1;

    event IssuerAdded(address indexed issuer, string name);
    event CertificateIssued(
        uint256 indexed id,
        address indexed student,
        address indexed issuer,
        string course,
        bytes32 fileHash
    );

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

    function issueCertificate(
        address student,
        string calldata course,
        string calldata fileName,
        bytes32 fileHash
    ) external onlyIssuer returns (uint256 id) {
        require(student != address(0), "SkillPass: zero student");
        require(fileHash != bytes32(0), "SkillPass: zero hash");
        require(tokenIdByHash[fileHash] == 0, "SkillPass: file already certified");

        id = nextId++;
        _certificates[id] = Certificate({
            id: id,
            student: student,
            issuer: msg.sender,
            course: course,
            fileName: fileName,
            fileHash: fileHash,
            issuedAt: uint64(block.timestamp),
            revoked: false
        });
        _studentTokens[student].push(id);
        tokenIdByHash[fileHash] = id;

        _safeMint(student, id);
        emit CertificateIssued(id, student, msg.sender, course, fileHash);
    }

    function getCertificate(uint256 id) external view returns (Certificate memory) {
        require(_certificates[id].id != 0, "SkillPass: no such certificate");
        return _certificates[id];
    }

    /// @dev Soulbound: minting (from == zero) is allowed, every transfer reverts.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = super._update(to, tokenId, auth);
        require(from == address(0), "SkillPass: soulbound, non-transferable");
        return from;
    }
}
