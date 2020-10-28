// SPDX-License-Identifier: GPL-3.0
// pragma solidity ^0.5.16;
pragma solidity ^0.6.0;
// to implement functions that return string[]
pragma experimental ABIEncoderV2;
import './BlindAuction.sol';

// "node" generally refers to domain name

contract DomainRegistry {

    struct Record {
        address owner;
        address auctionAddress;
        uint auctionStartBlock;
        bool registered;
        bool hasAuctionBefore;
    }

    //static variables
    uint durationOfAuction = 50; //if after 50 blocks there is no claimant, the auction is voided
    address public owner;
    string[] registeredDomains; // nodes that are registered
    string[] currentAuctions; //stores nodes that have active auctions


    // add list of current auctions

    //mappings
    mapping(string=>Record) records;
    // storing strings
    //mapping()

    //events
    // should this event also give the string form of the domain?
    event NewAuctionStarted(string node, address auctionAddress);
    event NewDomainClaimed(string node, address newOwner, uint highestBid);
    event RecordsUpdate();

    // modifiers
    modifier validAuctionContract(string memory node) {
        //the auction contract for that node sent the msg
        require(records[node].auctionAddress == msg.sender);
        // the auction has not "ended" yet, still valid period for claiming domain
        require(records[node].auctionStartBlock + durationOfAuction > block.number);
        _;
    }

    modifier onlyUnregisteredDomain(string memory node) {
        require(records[node].registered == false,
                "The domain is already registered.");
        _;
    }

    modifier noOngoingAuction(string memory node) {
        //the last auction (if any) has ended, and a reasonable amount of time has been given to claim domain
        if (records[node].hasAuctionBefore == true) {
            require(records[node].auctionStartBlock + durationOfAuction < block.number);
        }
        _;
    }

    //constructor
    constructor() public {
        owner = msg.sender;
    }

    // check if domain is registered already
    function checkIfRegistered(string memory node) 
        public
        view
        returns (bool) 
    {
        if(records[node].owner == address(0)) {
            return false;
        } else {
            return true;
        }
    }

    function registerOwner(string memory node, address newOwner, uint highestBid)
        public
        payable
        validAuctionContract(node)
    {
        records[node].owner = newOwner;
        records[node].registered = true;
        registeredDomains.push(node);
        // update currentAuctions
        for (uint i=0; i<currentAuctions.length; i++) {
            if (keccak256(abi.encodePacked(currentAuctions[i])) == keccak256(abi.encodePacked(node))) {
                if (currentAuctions.length == 1) {
                    delete currentAuctions[i];
                    break;
                } else {
                    currentAuctions[i] = currentAuctions[currentAuctions.length-2];
                    delete currentAuctions[currentAuctions.length-1];
                    break;
                }
                
            }
        }

        emit NewDomainClaimed(node, newOwner, highestBid);
    }

    function startAuction(string memory node)
        public
        onlyUnregisteredDomain(node)
        noOngoingAuction(node)
        returns (address auctionAddress)
    {
        records[node].auctionAddress = address(new BlindAuction(node));
        records[node].auctionStartBlock = block.number;
        records[node].hasAuctionBefore = true;
        currentAuctions.push(node);
        emit NewAuctionStarted(node, records[node].auctionAddress);

        return records[node].auctionAddress;
    }

    //------------------------------------------------------------------------------
    //website functions
    //I think these functions are very inefficient, maybe can redo

    // get current auction addresses and their nodes
    // also checks if the auctions in the list have expired.
    function getCurrentAuctions() public returns (string[] memory, address[] memory, uint[] memory) {
        string[] memory nodes = new string[](currentAuctions.length);
        address[] memory auctionAddresses = new address[](currentAuctions.length);
        uint[] memory auctionStartBlocks = new uint[](currentAuctions.length);

        uint i = 0;
        uint j = 0;
        for (i=0; i<currentAuctions.length; i++) {
            if (records[currentAuctions[i]].auctionStartBlock + durationOfAuction > block.number) {
                nodes[j] = currentAuctions[i];
                auctionAddresses[j] = records[currentAuctions[i]].auctionAddress;
                auctionStartBlocks[j] = records[currentAuctions[i]].auctionStartBlock;
                j++;
            }
        }

        delete currentAuctions;
        for (i=0; i<j; i++) {
            currentAuctions.push(nodes[i]);
        }

        return (nodes, auctionAddresses, auctionStartBlocks);
    }

    // gets registered domains and their owner addresses
    function getRegisteredDomains() public view returns (string[] memory, address[] memory) {
        string[] memory nodes;
        address[] memory ownerAddresses;

        for (uint i=0; i<registeredDomains.length; i++) {
            nodes[i] = registeredDomains[i];
            ownerAddresses[i] = records[registeredDomains[i]].owner;
        }
        return (nodes, ownerAddresses);
    }


// ----------------------------------------------------------------------------------
// debug helper functions

    function viewAuctionAddress(string memory node) public view returns (address)
    {
        return records[node].auctionAddress;
    }

    function viewThisAddress() public view returns (address)
    {
        return address(this);
    }

    function viewRecordOwner(string memory node) public view returns (address)
    {
        return records[node].owner;
    }

    function viewRegistration(string memory node) public view returns (bool)
    {
        return records[node].registered;
    }


}