// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
import './DomainRegistry.sol';

contract BlindAuction {
    
    //static variables
    address payable public owner;
    string public node;

    // stages of the auction
    uint public biddingEnd;
    uint public revealEnd;
    uint public claimEnd;
    // durations of each stage
    uint public biddingDuration = 10; //blocks
    uint public revealDuration = 10; //blocks
    uint public claimDuration = 10; //blocks
    
    //state
    address payable public highestBidder;
    uint public highestBid;
    bool public domainClaimed;
    
    //events
    event WinnerClaimed(address winner, uint highestBid);

    //modifiers
    // must occur before or on that block
    modifier onlyBefore(uint _block) { require(block.number <= _block); _; }
    // must occur after that block
    modifier onlyAfter(uint _block) { require(block.number > _block); _; }

    struct Bid {
        // blindedBid is the hashed value of (value, fake, secret)
        // each Bid is characterised by:
        // value: value of the bid
        // fake: a flag to denote if the bid is fake or real. false == real, true == fake
        bytes32 blindedBid;
        // deposit: the amount of Wei that the user deposited for the bid. For a real bid to count, deposit >= value
        uint deposit;
    }

    //mappings
    // mapping of user addresses to Bid[]
    // each address can have multiple bids
    mapping (address => Bid[]) public bids;

    constructor(string memory _node) public {
        // owner is the DomainRegistry contract
        owner = msg.sender;
        // node refers to the domain name being auctioned
        node = _node;
        // define the block numbers for the various stages referencing the current block number
        biddingEnd = block.number + biddingDuration;
        revealEnd = biddingEnd + revealDuration;
        claimEnd = revealEnd + claimDuration;
    }

    // make a bid
    function bid(bytes32 _blindedBid) 
        public
        payable
        // only can be done in Bidding Stage
        onlyBefore(biddingEnd)
    {
        // BlindAuction does not know the details of each bid except the blindedBid (hashed) and deposit
        // it is impossible for anyone to know the current bids at this point
        // deposit values do not provide credible information about bidding situation as bids can be fake or invalid
        bids[msg.sender].push(Bid({
            blindedBid: _blindedBid,
            deposit: msg.value
        }));
    }

    // Reveal blinded bids
    // Refund all except if the bid is currently the highest (potential winner)
    // A user must reveal all his bids together, and the submitted values, fakes, secrets must be in the order 
    // of the bidding

    function reveal (
        uint[] memory _values,
        bool[] memory _fake,
        bytes32[] memory _secret
    )
        public
        onlyAfter(biddingEnd)
        onlyBefore(revealEnd)
    {
        uint length = bids[msg.sender].length;
        require(_values.length == length);
        require(_fake.length == length);
        require(_secret.length == length);

        // keep track of how much to refund
        // only valid bids which are currently the highest will not result in a refund
        uint refund = 0;
        // store all bids for the user in a temporary list and delete the original list
        // this is to prevnt reentry attacks
        Bid[] memory tempBids = bids[msg.sender];
        delete bids[msg.sender];

        // iterate through all the bids
        for (uint i = 0; i < length; i++) {
            Bid memory bidToCheck = tempBids[i];
            (uint value, bool fake, bytes32 secret) =
                    (_values[i], _fake[i], _secret[i]);
            if (bidToCheck.blindedBid != keccak256(abi.encodePacked(value, fake, secret))) {
                // The proof does not match the blindedbid, do not refund deposit.
                continue;
            }
            refund += bidToCheck.deposit;
            // bid must be real and deposit more than bidded value
            if (!fake && bidToCheck.deposit >= value) {
                if (checkIfHighestBid(msg.sender, value)) {
                    // if the bid is the current highest, then do not refund it.
                    refund -= value;
                }
            }
            
        }
        // process the refunds
        msg.sender.transfer(refund);
    }

    /// End the auction and send the highest bid to the registry.
    function claimWinnerReward()
        public
        onlyAfter(revealEnd)
        onlyBefore(claimEnd)
    {
        // winner himself must claim
        require(msg.sender == highestBidder);
        // once claimed, cannot reclaim
        require(domainClaimed == false);
        domainClaimed = true;
        // 'owner' refers to the DomainRegistry that created this auction
        DomainRegistry registry = DomainRegistry(owner);
        registry.registerOwner.value(highestBid)(node, msg.sender, highestBid);
    }

    function getStage() public view returns (string memory) {
        //it is one less to inform what the next stage is
        if (block.number < biddingEnd ) {
            return "bidding";
        } else if (block.number < revealEnd ) {
            return "revealing";
        } else if (block.number < claimEnd && !domainClaimed){
            return "claiming";
        } else if (domainClaimed) {
            return "claimed";
        } else {
            return "unclaimed";
        }
    }

    // This is an "internal" function which means that it
    // can only be called from the contract itself (or from
    // derived contracts).
    function checkIfHighestBid(address payable bidder, uint value) internal
            returns (bool success)
    {
        if (value <= highestBid) {
            return false;   
        }
        // if there is a previous highestBidder
        if (highestBidder != address(0)) {
            // Refund the previously highest bidder.
            address payable previousHighestBidder = highestBidder;
            uint previousHighestBid = highestBid;

            highestBid = value;
            highestBidder = bidder;

            previousHighestBidder.transfer(previousHighestBid);
        } else {
            // If there was no previous highestBidder/Bid
            highestBid = value;
            highestBidder = bidder;
        }

        return true;
    }

}
