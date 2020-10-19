// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.5.16;

contract BlindAuction {
    
    //static variables
    address public owner;
    uint public biddingEnd;
    uint public revealEnd;
    uint public biddingDuration = 10; //blocks
    uint public revealDuration = 10; //blocks
    bool public ended;
    
    

    //state
    address public highestBidder;
    uint public highestBid;
    
    //events
    event WinnerClaimed(address winner, uint highestBid);
    // for debugging
    event PotentialWinnerFound(address winner, uint highestBid);

    //modifiers
    modifier onlyBefore(uint _block) { require(block.number < _block); _; }
    modifier onlyAfter(uint _block) { require(block.number > _block); _; }


    struct Bid {
        bytes32 blindedBid; //hash(value, fake, secret)
        uint deposit;
    }

    mapping (address => Bid[]) public bids;
    mapping (address => uint) pendingReturns;
    mapping (address => uint) refunded;

    constructor(
        
    ) public {
        owner = msg.sender;
        biddingEnd = block.number + biddingDuration;
        revealEnd = biddingEnd + revealDuration;
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
        //returns (uint)
    {
        uint length = bids[msg.sender].length;
        require(_values.length == length);
        require(_fake.length == length);
        require(_secret.length == length);

        uint refund = 0;
        
        // iterate through all the bids
        for (uint i = 0; i < length; i++) {
            Bid storage bidToCheck = bids[msg.sender][i];
            (uint value, bool fake, bytes32 secret) =
                    (_values[i], _fake[i], _secret[i]);
            if (bidToCheck.blindedBid != keccak256(abi.encodePacked(value, fake, secret))) {
                // Bid was not actually revealed.
                // Do not refund deposit.
                // Check the next bid
                continue;
            }
            refund += bidToCheck.deposit;
            if (!fake && bidToCheck.deposit >= value) {
                if (checkIfHighestBid(msg.sender, value))
                    refund -= value;
            }
            // Make it impossible for the sender to re-claim
            // the same deposit.
            bidToCheck.blindedBid = bytes32(0);
        }
        msg.sender.transfer(refund);
        refunded[msg.sender] += refund;

        //return refund;
        
    }

    // Withdraw a bid that is the winning bid, 
    // bit was once the highest bid during the reveal stage
    // Qn: should this be just added on to the end of checkIfHighestBid fn?
    function withdraw() public  {
        uint amount = pendingReturns[msg.sender];
        if (amount > 0) {
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `transfer` returns
            pendingReturns[msg.sender] = 0;
            msg.sender.transfer(amount);
        }
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    function claimWinnerReward()
        public
        onlyAfter(revealEnd)
    {
        //require(!ended);
        emit WinnerClaimed(highestBidder, highestBid);
        //ended = true;
        //beneficiary.transfer(highestBid);

        // register winner address as owner
    }

    // This is an "internal" function which means that it
    // can only be called from the contract itself (or from
    // derived contracts).
    function checkIfHighestBid(address bidder, uint value) internal
            returns (bool success)
    {
        if (value <= highestBid) {
            return false;
        }
        if (highestBidder != address(0)) {
            // Refund the previously highest bidder.
            pendingReturns[highestBidder] += highestBid;
        }
        highestBid = value;
        highestBidder = bidder;
        emit PotentialWinnerFound(highestBidder, highestBid);
        return true;
    }

    function checkBidAmount() view public returns (uint)
    {
        if (bids[msg.sender].length > 0) {
            return bids[msg.sender][0].deposit;
        }
        // random number
        return 69420;
    }

    function checkRefunded() view public returns (uint)
    {
        return refunded[msg.sender];
    }

    function checkHash(
        uint[] memory _values,
        bool[] memory _fake,
        bytes32[] memory _secret
    ) view public returns (uint)
    {
        if (bids[msg.sender].length > 0) {
            if (bids[msg.sender][0].blindedBid != keccak256(abi.encodePacked(_values[0], _fake[0], _secret[0]))) {
                return 0;
            }
            return 1;
        }
        return 69420;
        
    }


}



