// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.0;
import './DomainRegistry.sol';

contract BlindAuction {
    
    //static variables
    address payable public owner;
    string public node;

    uint public biddingEnd;
    uint public revealEnd;
    uint public claimEnd;
    uint public biddingDuration = 3; //blocks
    uint public revealDuration = 2; //blocks
    uint public claimDuration = 2; //blocks
    
    //state
    address payable public highestBidder;
    uint public highestBid;
    bool public domainClaimed;
    
    //events
    event WinnerClaimed(address winner, uint highestBid);

    //modifiers
    modifier onlyBefore(uint _block) { require(block.number <= _block); _; }
    modifier onlyAfter(uint _block) { require(block.number > _block); _; }

    struct Bid {
        bytes32 blindedBid; //hash(value, fake, secret)
        uint deposit;
    }

    //mappings
    mapping (address => Bid[]) public bids;

    constructor(string memory _node) public {
        owner = msg.sender;
        node = _node;
        biddingEnd = block.number + biddingDuration;
        revealEnd = biddingEnd + revealDuration;
        claimEnd = revealEnd + claimDuration;
    }

    function bid(bytes32 _blindedBid) 
        public
        payable
        onlyBefore(biddingEnd)
    {
        bids[msg.sender].push(Bid({
            blindedBid: _blindedBid,
            deposit: msg.value
        }));
    }

    // Reveal blinded bids
    // Refund all except if the bid is currently the highest (potential winner)
    // The submitted values, fakes, secrets must be in the order of the bids
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

        uint refund = 0;
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
            if (!fake && bidToCheck.deposit >= value) {
                if (checkIfHighestBid(msg.sender, value))
                    // if the bid is the current highest, then do not refund it.
                    refund -= value;
            }
            
        }
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
