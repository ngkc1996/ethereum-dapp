const { ethers } = require("ethers");
const DomainRegistry = artifacts.require("DomainRegistry");
const BlindAuction = artifacts.require("BlindAuction");
const helper = require('../utils/utils.js');

contract("DomainRegistry", async (accounts) => {

// ----------------------------------------------------------------------------------------
// Deploying

  it("should be able to deploy a registry", async() => {
    console.log("Deploying...");
    let registry = await DomainRegistry.deployed();
    let owner = await registry.owner();
    assert.equal(owner, accounts[0]);
  });

// ----------------------------------------------------------------------------------------
// Bidding Stage

  it("should be able to accept real and fake bids during Bidding Stage", async() => {
    console.log("Bidding Stage...");
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    // acct1 starts the auction instance for xxx.ntu
    await registry.startAuction(node, {from: accounts[1]});
    // check which block it is
    let block_curr = await web3.eth.getBlockNumber();
    console.log("Auction started at block", block_curr);
    
    // get the address of the auctionInstance
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    //acct1 makes a real bid
    // for simplicity, all bids use the same secret value
    let bytes32Secret = web3.utils.padRight(web3.utils.asciiToHex("secret"), 64);
    let hashedAcct1Bid1 = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [4, false, bytes32Secret]);
    await auctionInstance.bid(hashedAcct1Bid1, {from: accounts[1], value: web3.utils.toWei('4', 'wei')});

    //acct1 makes a fake bid. Fake flag is true, and deposit < bid value
    let hashedAcct1Bid2 = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [10, true, bytes32Secret]);
    await auctionInstance.bid(hashedAcct1Bid2, {from: accounts[1], value: web3.utils.toWei('8', 'wei')});

    //acct2 makes a real bid, higher than acct1's real bid
    let hashedAcct2Bid1 = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [5, false, bytes32Secret]);
    await auctionInstance.bid(hashedAcct2Bid1, {from: accounts[2], value: web3.utils.toWei('5', 'wei')});

    //acct3 makes a real bid
    let hashedAcct3Bid1 = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [20, false, bytes32Secret]);
    await auctionInstance.bid(hashedAcct3Bid1, {from: accounts[3], value: web3.utils.toWei('20', 'wei')});
  });

  it("should not be able to reveal bids during Bidding Stage", async() => {
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    // acct1 try to reveal bids
    let bytes32Secret = web3.utils.padRight(web3.utils.asciiToHex("secret"), 64);
    let error;
    try {
      await auctionInstance.reveal([4, 10], [false, true], [bytes32Secret, bytes32Secret], {from: accounts[1]});
    } catch (e) {
      error = e;
    }
    // expect error
    assert.equal(!!error, true);
  });

// ----------------------------------------------------------------------------------------
// Reveal Stage

  it("should be not be able to bid during Reveal Stage", async() => {
    console.log("Reveal Stage...");
    // Block advancement
    let block_initial = await web3.eth.getBlockNumber();
    for (i = 0; i < 5; i++) {
      await helper.advanceBlock();
    }
    let block_final = await web3.eth.getBlockNumber();
    console.log("It is now block", block_final);
    assert.equal(block_initial + 5, block_final);

    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    // acct1 tries to bid
    let bytes32Secret = web3.utils.padRight(web3.utils.asciiToHex("secret"), 64);
    let hashedAcct1Bid3 = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [1, false, bytes32Secret]);

    let error;
    try {
      await auctionInstance.bid(hashedAcct1Bid3, {from: accounts[1], value: web3.utils.toWei('1', 'wei')});
    } catch (e) {
      error = e;
    }
    // expect error
    assert.equal(!!error, true);
  });

  it("should be able to reveal during Reveal Stage", async() => {
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);

    let bytes32Secret = web3.utils.padRight(web3.utils.asciiToHex("secret"), 64);

    // acct1 tries to reveal only 1 out of 2 of his bids
    let error;
    try {
      await auctionInstance.reveal([4], [false], [bytes32Secret], {from: accounts[1]});
    } catch (e) {
      error = e;
    }
    // expect error
    assert.equal(!!error, true);

    // acct1 reveals both his bids
    await auctionInstance.reveal([4, 10], [false, true], [bytes32Secret, bytes32Secret], {from: accounts[1]});
    
    // acct2 reveals his bid
    await auctionInstance.reveal([5], [false], [bytes32Secret], {from: accounts[2]});

    // acct2 tries to reveal his bid again
    error = undefined;
    try {
      await auctionInstance.reveal([5], [false], [bytes32Secret], {from: accounts[2]});
    } catch (e) {
      error = e;
    }
    // expect error
    assert.equal(!!error, true);
  });

  it("should not be able to claim during Claim Stage", async() => {
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);

    let error;
    try {
      // acct2's bid of 5 was highest
      await auctionInstance.claimWinnerReward({from: accounts[2]});
    } catch (e) {
      error = e;
    }
    // expect error
    assert.equal(!!error, true);
  });

// ----------------------------------------------------------------------------------------
// Claim Stage

  it("should be not be able to bid during Claim Stage", async() => {
    console.log("Claim Stage...");
    // Block advancement
    let block_initial = await web3.eth.getBlockNumber();
    for (i = 0; i < 4; i++) {
      await helper.advanceBlock();
    }
    let block_final = await web3.eth.getBlockNumber();
    console.log("It is now block", block_final);
    assert.equal(block_initial + 4, block_final);

    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    // acct1 tries to bid
    let bytes32Secret = web3.utils.padRight(web3.utils.asciiToHex("secret"), 64);
    let hashedAcct1Bid3 = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [1, false, bytes32Secret]);

    let error;
    try {
      await auctionInstance.bid(hashedAcct1Bid3, {from: accounts[1], value: web3.utils.toWei('1', 'wei')});
    } catch (e) {
      error = e;
    }
    // expect error
    assert.equal(!!error, true);
  });

  it("should not be able to reveal during Claim Stage", async() => {
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);

    let bytes32Secret = web3.utils.padRight(web3.utils.asciiToHex("secret"), 64);

    // acct3 tries to reveal (did not reveal in Reveal Stage)
    let error;
    try {
      await auctionInstance.reveal([20], [false], [bytes32Secret], {from: accounts[3]});
    } catch (e) {
      error = e;
    }
    // expect error
    assert.equal(!!error, true);
  });

  it("should not be able to claim if not highest bid during Claim Stage", async() => {
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);

    let error;
    try {
      // acct1's highest bid was 4, which is less than acct2's bid of 5
      await auctionInstance.claimWinnerReward({from: accounts[1]});
    } catch (e) {
      error = e;
    }
    // expect error
    assert.equal(!!error, true);
  });

  it("should be able to claim a domain with highest bid during Claim Stage", async() => {
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);

    // acct2 revealed the highest bid (5)
    // "xxx.ntu" should resolve to acct2
    await auctionInstance.claimWinnerReward({from: accounts[2]});
    
    let ownerAddress = await registry.resolveDomain("xxx.ntu");
    assert.equal(ownerAddress, accounts[2]);
  });
  
// After successfully claiming a domain

  it("should be able to send Ether to an account through resolving a domain", async() => {
    console.log("After registering a domain...");
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);

    // acct1 sends acct2 ether through "xxx.ntu"
    let originalBal = await web3.eth.getBalance(accounts[2]);
    let domainAddress = await registry.resolveDomain("xxx.ntu");
    await web3.eth.sendTransaction({
      from: accounts[1],
      to: domainAddress,
      value: 1e+18
    });
    let finalBal = await web3.eth.getBalance(accounts[2]);
    // original and final balances should add differ by the value sent
    assert.equal(Number(finalBal), Number(originalBal) + Number(1e+18));
  });

});