// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;
import './BlindAuction.sol';

// "node" generally refers to domain name

contract DomainRegistry {

    struct Record {
        // owner of the domain name
        address owner;
        // address of the (last) auction for that domain
        address auctionAddress;
        // start block number for the (last) auction
        uint auctionStartBlock;
        // if the domain name has been registered already
        // registration is forever; has no expiry
        bool registered;
        bool hasAuctionBefore;
    }

    //static variables
    address public owner;
    string[] registeredDomains;

    //mappings
    // records corresponding to each domain name
    mapping(string=>Record) records;
    // to enable reverse resolving of owner to domain name(s)
    mapping(address=>string[]) ownerToDomain;

    //events
    event NewAuctionStarted(string node, address auctionAddress);
    event NewDomainClaimed(string node, address newOwner, uint highestBid);

    // modifiers
    modifier validAuctionContract(string memory node) {
        //the auction contract for that node sent the msg
        require(records[node].auctionAddress == msg.sender);
        _;
    }

    // checks if domain has .ntu
    modifier onlyValidDomainForm(string memory node) {
        bytes memory strBytes = bytes(node);
        // to check from the last character backwards
        // hence ".ntu" is stored as "utn." for convenience of iteration
        bytes memory validForm = bytes("utn.");
        for (uint i = 0; i < 4; i++) {
            require(strBytes[strBytes.length - 1 - i] == validForm[i]);
        }
        _;
    }

    // domain must be previously unregistered
    modifier onlyUnregisteredDomain(string memory node) {
        require(records[node].registered == false);
        _;
    }

    // there must not be any ongoing auction currently
    modifier noOngoingAuction(string memory node) {
        //the last auction (if any) has ended
        if (records[node].hasAuctionBefore == true) {
            BlindAuction auction = BlindAuction(records[node].auctionAddress);
            string memory stage = auction.getStage();
            // last auction stage must be "unclaimed"
            require(keccak256(abi.encodePacked(stage)) == keccak256(abi.encodePacked("unclaimed")));
        }
        _;
    }

    //constructor
    constructor() public {
        owner = msg.sender;
    }

    // check if needed 
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

    // function which is called by the BlindAuction contract associated with the domain name
    function registerOwner(string memory node, address newOwner, uint highestBid)
        public
        payable
        validAuctionContract(node)
    {
        records[node].owner = newOwner;
        records[node].registered = true;
        registeredDomains.push(node);
        ownerToDomain[newOwner].push(node);
        emit NewDomainClaimed(node, newOwner, highestBid);
    }

    // starts a new auction
    function startAuction(string memory node)
        public
        onlyValidDomainForm(node)
        onlyUnregisteredDomain(node)
        noOngoingAuction(node)
        returns (address auctionAddress)
    {
        records[node].auctionAddress = address(new BlindAuction(node));
        records[node].auctionStartBlock = block.number;
        records[node].hasAuctionBefore = true;
        emit NewAuctionStarted(node, records[node].auctionAddress);

        return records[node].auctionAddress;
    }

//------------------------------------------------------------------------------
//website functions

    // gets registered domains and their owner addresses
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
    function resolveDomain(string memory domain) 
        public
        view 
        returns (address) 
    {
        if (records[domain].registered) {
            return records[domain].owner;
        } else {
            return records[domain].auctionAddress;
        }
    }

    // Reversely resolve Ethereum address to their registered domains
    function getOwnedDomains(address _owner)
        public
        view
        returns (string[] memory)
    {
        string[] memory nodes = new string[](ownerToDomain[_owner].length);
        for (uint i=0; i<ownerToDomain[_owner].length; i++) {
            nodes[i] = ownerToDomain[_owner][i];
        }
        return nodes;
    }


// ----------------------------------------------------------------------------------
// debug helper functions
// only used for "truffle test" unit tests

    function viewAuctionAddress(string memory node) public view returns (address)
    {
        return records[node].auctionAddress;
    }

}