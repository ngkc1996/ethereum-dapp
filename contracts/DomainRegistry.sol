// SPDX-License-Identifier: GPL-3.0
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
    uint durationOfAuction = 6; //if after 50 blocks there is no claimant, the auction is voided
    address public owner;
    string[] registeredDomains; // nodes that are registered
    string[] currentAuctions; //stores nodes that have active auctions


    // add list of current auctions

    //mappings
    mapping(string=>Record) records;

    //events
    event NewAuctionStarted(string node, address auctionAddress);
    event NewDomainClaimed(string node, address newOwner, uint highestBid);

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
        uint i = 0;
        for (i=0; i<currentAuctions.length; i++) {
            if (keccak256(abi.encodePacked(currentAuctions[i])) == keccak256(abi.encodePacked(node))) {
                if (currentAuctions.length == 1) {
                    delete currentAuctions[i];
                    break;
                } else {
                    currentAuctions[i] = currentAuctions[currentAuctions.length-1];
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

    //update the current auctions
    function updateCurrentAuctions() public {
        string[] memory keep = new string[](currentAuctions.length);

        uint i;
        uint j = 0;
        for (i = 0; i < currentAuctions.length; i++) {
            if (records[currentAuctions[i]].auctionStartBlock + durationOfAuction > block.number) {
                keep[j] = currentAuctions[i];
                j++;
            }
        }

        delete currentAuctions;
        for (i = 0; i < j; i++) {
            currentAuctions.push(keep[i]);
        }
    }

    // get current auction addresses and their nodes
    // also checks if the auctions in the list have expired.
    function getCurrentAuctions() public view returns (string[] memory, address[] memory) {
        string[] memory nodes = new string[](currentAuctions.length);
        address[] memory auctionAddresses = new address[](currentAuctions.length);

        for (uint i = 0; i < currentAuctions.length; i++) {
            nodes[i] = currentAuctions[i];
            auctionAddresses[i] = records[currentAuctions[i]].auctionAddress;
        }

        return (nodes, auctionAddresses);
    }

    // gets registered domains and their owner addresses
    //TODO: currently broken, refer to getCurrentAuctions for reference
    function getRegisteredDomains() public view returns (string[] memory, address[] memory) {
        string[] memory nodes = new string[](registeredDomains.length);
        address[] memory ownerAddresses = new address[](registeredDomains.length);

        for (uint i=0; i<registeredDomains.length; i++) {
            nodes[i] = registeredDomains[i];
            ownerAddresses[i] = records[registeredDomains[i]].owner;
        }
        return (nodes, ownerAddresses);
    }

    //if registered, resolved to owner address, if auctioning, resolve to auction address
    //empty domain returns address(0)
    function resolveDomain(string memory domain) public view returns (address) {
        if (records[domain].registered) {
            return records[domain].owner;
        } else {
            return records[domain].auctionAddress;
        }
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

    event PotentialWinnerFound(address winner, uint highestBid);
    function emitPotentialWinner(address winner, uint value) public {
        emit PotentialWinnerFound(winner, value);
    }


}