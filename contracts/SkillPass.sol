// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

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
    event CertificateRevoked(uint256 indexed id);

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

    function revoke(uint256 id) external {
        Certificate storage c = _certificates[id];
        require(c.id != 0, "SkillPass: no such certificate");
        require(msg.sender == c.issuer || msg.sender == owner(), "SkillPass: not authorized");
        require(!c.revoked, "SkillPass: already revoked");
        c.revoked = true;
        emit CertificateRevoked(id);
    }

    function certificatesOf(address student) external view returns (Certificate[] memory list) {
        uint256[] storage ids = _studentTokens[student];
        list = new Certificate[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = _certificates[ids[i]];
        }
    }

    function isValid(uint256 id) external view returns (bool) {
        Certificate storage c = _certificates[id];
        return c.id != 0 && !c.revoked;
    }

    function verifyByHash(bytes32 fileHash) external view returns (uint256) {
        return tokenIdByHash[fileHash];
    }

    function totalCertificates() external view returns (uint256) {
        return nextId - 1;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        Certificate memory c = _certificates[id];
        require(c.id != 0, "SkillPass: no such certificate");
        string memory status = c.revoked ? "Revoked" : "Valid";
        string memory json = string(
            abi.encodePacked(
                '{"name":"',
                c.course,
                '","description":"SkillPass credential issued by ',
                issuerName[c.issuer],
                '","attributes":[{"trait_type":"Issuer","value":"',
                issuerName[c.issuer],
                '"},{"trait_type":"Status","value":"',
                status,
                '"}]}'
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

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
