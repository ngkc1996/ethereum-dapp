// testing basic functionality of BlindAuction

const { ethers } = require("ethers");
const BlindAuction = artifacts.require("BlindAuction");
const helper = require('../utils/utils.js');

contract("BlindAuction", async (accounts) => {
  
  

  it("should be able to initiate an auction", async() => {
    let auction = await BlindAuction.deployed();
    let owner = await auction.owner();
    assert.equal(owner, accounts[0]);
  });

  // it("should be able to send a bid, and process the hashing for the blindedbid as expected", async() => {
  //   let auction = await BlindAuction.deployed();
  //   let hashed = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [1, false, "0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"]);
  //   //console.log(hashed);
  //   await auction.bid(hashed, {from: accounts[1], value: web3.utils.toWei('1', 'wei')});
  //   let data = await auction.checkHash([1], [false], ["0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"], {from: accounts[1]});
  //   assert.equal(true, data);
  //   // deposit value is assumed to be processed correctly
  // });

  it("should be able to send a bid", async() => {
    let auction = await BlindAuction.deployed();
    let hashed = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [4, false, "0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"]);
    await auction.bid(hashed, {from: accounts[1], value: web3.utils.toWei('4', 'wei')});
    let hashed2 = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [3, false, "0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"]);
    await auction.bid(hashed2, {from: accounts[2], value: web3.utils.toWei('3', 'wei')});
  });

  it("should advance 10 blocks", async() => {
    let block_initial = await web3.eth.getBlockNumber();
    for (i = 0; i < 10; i++) {
      await helper.advanceBlock();
    }
    let block_final = await web3.eth.getBlockNumber();
    //console.log(block_final);
    assert.equal(block_initial + 10, block_final);
  });

  it("should be able to reveal and process refunds properly", async() => {
    // this test must be run after "it should be able to send a bid - has the relevant txs"
    let auction = await BlindAuction.deployed();
    // lower bid reveals first
    await auction.reveal([3], [false], ["0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"], {from: accounts[2]});
    await auction.reveal([4], [false], ["0x111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCCC"], {from: accounts[1]});
    
    let data = await auction.checkPendingReturns({from: accounts[2]});
    //console.log(data.toString());
    //acct2 should have pendingReturns == 3
    assert.equal(data, 3);
    //acct1 should have pendingReturns == 0
    let data2 = await auction.checkPendingReturns({from: accounts[1]});
    assert.equal(data2, 0);
  });

  
  
  
  
  
  
  
  // // accounts are the list of account created by the Truffle (i.e. 10 key pair)
  // // by default, the first account will deploy the contract
  // it("should make deployer the owner", async () => {
  //   let bank = await Bank.deployed(); // get the deployed Bank contract
  //   let owner = await bank.owner(); // call the getter on public state variable, https://solidity.readthedocs.io/en/v0.7.1/contracts.html#getter-functions
  //   assert.equal(owner, accounts[0]); // compare the expected owner with the actual owner
  // });

  // it("can deposit correctly", async () => {
  //   let bank = await Bank.deployed();
  //   // sending 3 Ether to deposit() function from accounts[4],
  //   // Note that deposit() function in the contract doesn't have any input parameter,
  //   // but in test, we are allowed to pass one optional special object specifying ethers to send to this
  //   // contract while we are making this function call.
  //   // Another similar example here: https://www.trufflesuite.com/docs/truffle/getting-started/interacting-with-your-contracts#making-a-transaction
  //   let result = await bank.deposit({
  //     from: accounts[4],
  //     value: web3.utils.toWei("3"), // all amount are expressed in wei, this is 3 Ether in wei
  //   });

  //   // get deposited balance
  //   let deposited = await bank.balance({ from: accounts[4] });
  //   assert.equal(deposited.toString(), web3.utils.toWei("3"));
  // });

  // it("can withdraw less than despoited", async () => {
  //   let bank = await Bank.deployed();
  //   await bank.deposit({
  //     from: accounts[0],
  //     value: web3.utils.toWei("3"),
  //   });
  //   await bank.withdraw(web3.utils.toWei("2.9"), { from: accounts[0] });

  //   let deposited = await bank.balance({ from: accounts[0] });
  //   assert.equal(deposited.toString(), web3.utils.toWei("0.1"));
  // });
});