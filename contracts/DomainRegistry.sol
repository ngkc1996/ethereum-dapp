// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.5.16;
import './BlindAuction.sol';

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
    bytes32[] registeredDomains;
    bytes32[] currentAuctions; 


    // add list of current auctions

    //mappings
    mapping(bytes32=>Record) records;

    //events
    // should this event also give the string form of the domain?
    event NewAuctionStarted(bytes32 node, address auctionAddress);
    event NewDomainClaimed(bytes32 node, address newOwner, uint highestBid);
    event RecordsUpdate();

    // modifiers
    modifier validAuctionContract(bytes32 node) {
        //the auction contract for that node sent the msg
        require(records[node].auctionAddress == msg.sender);
        // the auction has not "ended" yet, still valid period for claiming domain
        require(records[node].auctionStartBlock + durationOfAuction > block.number);
        _;
    }

    modifier onlyUnregisteredDomain(bytes32 node) {
        require(records[node].registered == false);
        _;
    }

    modifier noOngoingAuction(bytes32 node) {
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
    function checkIfRegistered(bytes32 node) 
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

    function registerOwner(bytes32 node, address newOwner, uint highestBid)
        public
        payable
        validAuctionContract(node)
    {
        records[node].owner = newOwner;
        records[node].registered = true;
        registeredDomains.push(node);
        // update currentAuctions
        for (uint i=0; i<currentAuctions.length; i++) {
            if (currentAuctions[i] == node) {
                currentAuctions[i] = currentAuctions[currentAuctions.length-2];
                delete currentAuctions[currentAuctions.length-1];
                break;
            }
        }

        emit NewDomainClaimed(node, newOwner, highestBid);
    }

    function startAuction(bytes32 node)
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
    function getCurrentAuctions() public returns (bytes32[] memory, address[] memory) {
        bytes32[] memory nodes;
        address[] memory auctionAddresses;

        for (uint i=0; i<currentAuctions.length; i++) {
            if (records[currentAuctions[i]].auctionStartBlock + durationOfAuction > block.number) {
                currentAuctions[i] = currentAuctions[currentAuctions.length-2];
                delete currentAuctions[currentAuctions.length-1];
                break;
            }
            nodes[i] = (currentAuctions[i]);
            auctionAddresses[i] = (records[currentAuctions[i]].auctionAddress);
        }

        return (nodes, auctionAddresses);
    }

    // gets registered domains and their owner addresses
    function getRegisteredDomains() public view returns (bytes32[] memory, address[] memory) {
        bytes32[] memory nodes;
        address[] memory ownerAddresses;

        for (uint i=0; i<registeredDomains.length; i++) {
            nodes[i] = registeredDomains[i];
            ownerAddresses[i] = records[registeredDomains[i]].owner;
        }
        return (nodes, ownerAddresses);
    }


// ----------------------------------------------------------------------------------
// debug helper functions

    function viewAuctionAddress(bytes32 node) public view returns (address)
    {
        return records[node].auctionAddress;
    }

    function viewThisAddress() public view returns (address)
    {
        return address(this);
    }

    function viewRecordOwner(bytes32 node) public view returns (address)
    {
        return records[node].owner;
    }

    function viewRegistration(bytes32 node) public view returns (bool)
    {
        return records[node].registered;
    }


}