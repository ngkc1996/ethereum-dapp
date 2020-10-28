
const { ethers } = require("ethers");
//let namehash = require('eth-ens-namehash');
const DomainRegistry = artifacts.require("DomainRegistry");
const BlindAuction = artifacts.require("BlindAuction");
const helper = require('../utils/utils.js');
const { strict } = require("assert");

contract("DomainRegistry", async (accounts) => {
  
  it("should be able to deploy a registry", async() => {
    let registry = await DomainRegistry.deployed();
    let owner = await registry.owner();
    assert.equal(owner, accounts[0]);
  });
  
  // it("should be able to start an auction", async() => {
  //   let registry = await DomainRegistry.deployed();
  //   let hashedaddress = await namehash.hash("xxx.ntu");
  //   await registry.startAuction(hashedaddress);
  //   let address = await registry.viewAuctionAddress(hashedaddress);
    
  //   let auctionInstance = await BlindAuction.at(address);
  //   let owner = await auctionInstance.owner();
  //   assert.equal(owner, await registry.viewThisAddress());
  // });

  it("should be able let users bid in the auction instance, and process the hashing for the blindedbid as expected", async() => {
    // mirrors "should be able to send a bid, and process the hashing for the blindedbid as expected"
    // test for BlindAuction.
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    // acct1 starts the auction instance for xxx.ntu
    await registry.startAuction(node, {from: accounts[1]});
    // check which block it is
    let block_curr = await web3.eth.getBlockNumber();
    console.log("Auction started at block ", block_curr);
    
    //console.log("And a second one");
    //await registry.startAuction(node, {from: accounts[1]});

    // trying getCurrentAuctions()
    console.log(await registry.getCurrentAuctions());

    // get the address of the auctionInstance
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    //acct1 puts a bid
    let hashed = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [4, false, "0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"]);
    await auctionInstance.bid(hashed, {from: accounts[1], value: web3.utils.toWei('4', 'wei')});
    let data = await auctionInstance.checkHash([4], [false], ["0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"], {from: accounts[1]});
    assert.equal(true, data);
  });

  it("should advance 10 blocks", async() => {
    let block_initial = await web3.eth.getBlockNumber();
    for (i = 0; i < 10; i++) {
      await helper.advanceBlock();
    }
    let block_final = await web3.eth.getBlockNumber();
    console.log("It is now block ", block_final);
    assert.equal(block_initial + 10, block_final);
  });

  it("should be able to reveal and process refunds properly", async() => {
    // this test must be run after "it should be able to send a bid - has the relevant txs"
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    // lower bid reveals first
    await auctionInstance.reveal([4], [false], ["0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"], {from: accounts[1]});
    assert.equal(await auctionInstance.checkHighestBid(), 4);
  });

  it("should advance 10 blocks", async() => {
    let block_initial = await web3.eth.getBlockNumber();
    for (i = 0; i < 10; i++) {
      await helper.advanceBlock();
    }
    let block_final = await web3.eth.getBlockNumber();
    console.log("It is now block ", block_final);
    assert.equal(block_initial + 10, block_final);
  });

  it("should be able to reveal and process refunds properly", async() => {
    // this test must be run after "it should be able to send a bid - has the relevant txs"
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    
    //console.log("Highest bid for the auction is ", await auctionInstance.checkHighestBid());

    await auctionInstance.claimWinnerReward({from: accounts[1]});
    //assert.equal(accounts[1], await registry.viewRecordOwner(node));
    console.log(await registry.viewRegistration(node));

    let balance = await web3.eth.getBalance(address);
    console.log(balance);

    let balance2 = await web3.eth.getBalance(await registry.viewThisAddress());
    assert.equal(balance2, 4);
  });


  

  

});