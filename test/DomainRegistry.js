//import Web3 from "web3";
//const web3 = require("web3");
const { ethers } = require("ethers");
//let namehash = require('eth-ens-namehash');
const DomainRegistry = artifacts.require("DomainRegistry");
const BlindAuction = artifacts.require("BlindAuction");
const helper = require('../utils/utils.js');

contract("DomainRegistry", async (accounts) => {
  
  it("should be able to deploy a registry", async() => {
    let registry = await DomainRegistry.deployed();
    let owner = await registry.owner();
    assert.equal(owner, accounts[0]);
  });
  

  it("should be able let users bid in the auction instance, and process the hashing for the blindedbid as expected", async() => {
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    // acct1 starts the auction instance for xxx.ntu
    await registry.startAuction(node, {from: accounts[1]});
    // check which block it is
    let block_curr = await web3.eth.getBlockNumber();
    console.log("Auction started at block ", block_curr);
    

    // get the address of the auctionInstance
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    //acct1 puts a bid
    let hashed = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [4, false, web3.utils.padRight(web3.utils.asciiToHex("1234"), 64)]);
    //const hashed = web3.utils.soliditySha3(parseInt(4), false, web3.utils.padRight(web3.utils.asciiToHex(0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC)), 32);
    
    await auctionInstance.bid(hashed, {from: accounts[1], value: web3.utils.toWei('4', 'wei')});
    //let data = await auctionInstance.checkHash([4], [false], ["0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"], {from: accounts[1]});
    let data = await auctionInstance.checkHash([4], [false], [web3.utils.padRight(web3.utils.asciiToHex("1234"), 64)], {from: accounts[1]});
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
    let error;
    try {
      await auctionInstance.reveal([4], [false], [web3.utils.padRight(web3.utils.asciiToHex("1234"), 64)], {from: accounts[1]});
    } catch (e) {
      error = e;
    }
    assert.equal(!!error, true);
    // assert.equal(await auctionInstance.checkHighestBid(), 4);
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

  it("should be able to claim reward", async() => {
    // this test must be run after "it should be able to send a bid - has the relevant txs"
    let registry = await DomainRegistry.deployed();
    let node = "xxx.ntu";
    let address = await registry.viewAuctionAddress(node);
    let auctionInstance = await BlindAuction.at(address);
    
    //console.log("Highest bid for the auction is ", await auctionInstance.checkHighestBid());

    await auctionInstance.claimWinnerReward({from: accounts[1]});
    //assert.equal(accounts[1], await registry.viewRecordOwner(node));
    let registered = await registry.viewRegistration(node);
    //console.log();
    assert.equal(true, registered);

    // let balance = await web3.eth.getBalance(address);
    // console.log(balance);

    // let balance2 = await web3.eth.getBalance(await registry.viewThisAddress());
    // assert.equal(balance2, 4);
  });


  

  

});