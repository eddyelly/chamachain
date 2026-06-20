// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MazaoTrace
/// @notice Cashew produce traceability with marketplace escrow. A batch moves
///         Registered -> Funded -> InTransit -> Delivered, with the buyer's payment held in
///         escrow and released to the farmer only on confirmed delivery. Cancel (before pickup)
///         refunds the buyer.
contract MazaoTrace is Ownable, ReentrancyGuard {
    enum Status {
        Registered,
        Funded,
        InTransit,
        Delivered,
        Cancelled
    }

    struct Batch {
        uint256 id;
        address farmer;
        string crop;
        uint256 quantityKg;
        uint256 price;
        address buyer;
        address transporter;
        Status status;
        uint64 registeredAt;
        uint64 fundedAt;
        uint64 pickedUpAt;
        uint64 deliveredAt;
    }

    mapping(uint256 => Batch) private _batches;
    mapping(address => bool) public isTransporter;
    mapping(address => string) public transporterName;
    uint256 public nextId = 1;

    event TransporterAdded(address indexed transporter, string name);
    event BatchRegistered(
        uint256 indexed id,
        address indexed farmer,
        string crop,
        uint256 quantityKg,
        uint256 price
    );
    event BatchPurchased(uint256 indexed id, address indexed buyer, uint256 price);
    event BatchPickedUp(uint256 indexed id, address indexed transporter);
    event BatchDelivered(uint256 indexed id, address indexed farmer, uint256 price);
    event BatchCancelled(uint256 indexed id, address indexed buyer, uint256 price);

    modifier onlyTransporter() {
        require(isTransporter[msg.sender], "MazaoTrace: not a transporter");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function addTransporter(address transporter, string calldata name) external onlyOwner {
        require(transporter != address(0), "MazaoTrace: zero transporter");
        isTransporter[transporter] = true;
        transporterName[transporter] = name;
        emit TransporterAdded(transporter, name);
    }

    function registerBatch(string calldata crop, uint256 quantityKg, uint256 price)
        external
        returns (uint256 id)
    {
        require(bytes(crop).length > 0, "MazaoTrace: empty crop");
        require(quantityKg > 0, "MazaoTrace: zero quantity");
        require(price > 0, "MazaoTrace: zero price");

        id = nextId++;
        Batch storage b = _batches[id];
        b.id = id;
        b.farmer = msg.sender;
        b.crop = crop;
        b.quantityKg = quantityKg;
        b.price = price;
        b.status = Status.Registered;
        b.registeredAt = uint64(block.timestamp);

        emit BatchRegistered(id, msg.sender, crop, quantityKg, price);
    }

    function purchase(uint256 id) external payable {
        Batch storage b = _get(id);
        require(b.status == Status.Registered, "MazaoTrace: not available");
        require(msg.sender != b.farmer, "MazaoTrace: farmer cannot buy");
        require(msg.value == b.price, "MazaoTrace: wrong payment");

        b.buyer = msg.sender;
        b.status = Status.Funded;
        b.fundedAt = uint64(block.timestamp);

        emit BatchPurchased(id, msg.sender, b.price);
    }

    function confirmPickup(uint256 id) external onlyTransporter {
        Batch storage b = _get(id);
        require(b.status == Status.Funded, "MazaoTrace: not funded");

        b.transporter = msg.sender;
        b.status = Status.InTransit;
        b.pickedUpAt = uint64(block.timestamp);

        emit BatchPickedUp(id, msg.sender);
    }

    function confirmDelivery(uint256 id) external nonReentrant {
        Batch storage b = _get(id);
        require(b.status == Status.InTransit, "MazaoTrace: not in transit");
        require(msg.sender == b.buyer, "MazaoTrace: not the buyer");

        b.status = Status.Delivered;
        b.deliveredAt = uint64(block.timestamp);

        (bool ok, ) = b.farmer.call{value: b.price}("");
        require(ok, "MazaoTrace: payout failed");

        emit BatchDelivered(id, b.farmer, b.price);
    }

    function cancel(uint256 id) external nonReentrant {
        Batch storage b = _get(id);
        require(b.status == Status.Funded, "MazaoTrace: not cancellable");
        require(msg.sender == b.buyer || msg.sender == b.farmer, "MazaoTrace: not authorized");

        b.status = Status.Cancelled;

        (bool ok, ) = b.buyer.call{value: b.price}("");
        require(ok, "MazaoTrace: refund failed");

        emit BatchCancelled(id, b.buyer, b.price);
    }

    function getBatches() external view returns (Batch[] memory list) {
        uint256 count = nextId - 1;
        list = new Batch[](count);
        for (uint256 i = 0; i < count; i++) {
            list[i] = _batches[i + 1];
        }
    }

    function getBatch(uint256 id) external view returns (Batch memory) {
        return _get(id);
    }

    function batchCount() external view returns (uint256) {
        return nextId - 1;
    }

    function _get(uint256 id) private view returns (Batch storage b) {
        b = _batches[id];
        require(b.id != 0, "MazaoTrace: no such batch");
    }
}
