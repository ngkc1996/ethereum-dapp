import Web3 from "web3";
import domainRegistryArtifact from "../../build/contracts/DomainRegistry.json";
import blindAuctionArtifact from "../../build/contracts/BlindAuction.json";
const { ethers } = require("ethers");

const PROTOCOL = "http://";
const HOST = "127.0.0.1";
const PORT = "7545";
const URL = `${PROTOCOL}${HOST}:${PORT}`;

class App {
  constructor(web3) {
    this._web3 = web3;
    this._account = null;
    this._domainRegistry = null;
    this._listeners = {};
  }

  //returns address of auction
  async startAuction(domain) {
    return this._domainRegistry
      .methods
      .startAuction(domain)
      .send({
        from: this._account,
        value: 0,
      });
  }

  //address can be used to identify which domain names belong to user
  async getRegisteredDomains() {
    const registered = await this._domainRegistry.methods.getRegisteredDomains().call();
    const domains = registered[0];
    const addresses = registered[1];
    return domains.map((_, i) => ({
      domain: domains[i],
      address: addresses[i],
    }));
  }

  //returns accounts: array of {address: string, balance: number}
  async getAccount() {
    const eth = this._web3.eth;
    const accounts = await eth.getAccounts();
    const balance = (await eth.getBalance(accounts[0]))/1000000000000000000;
    return { address: accounts[0], balance };
  }

  //sends bid
  async bid(domain, bid) {
    const {value, isFake, secret} = bid;
    if (!secret) throw new Error("no secret");
    let hash = ethers.utils.solidityKeccak256(['uint', 'bool', 'bytes32'], [parseInt(value), isFake, this._web3.utils.padRight(this._web3.utils.asciiToHex(secret), 64)]);
    const blindAuction = await this._getBlindAuctionFor(domain);
    return await blindAuction
      .methods
      .bid(hash)
      .send({
        from: this._account,
        value: bid.value,
      });
  }

  //sends a reveal call to reveal your bids (incentive to be the winner + get deposits back)
  //can only occur during reveal stage
  //returns keccak hashes of succeeded bids
  async reveal(domain, bids) {
    const values = [];
    const isFakes = [];
    const secrets = [];
    bids.forEach(({value, isFake, secret}) => {
      values.push(parseInt(value));
      isFakes.push(isFake);
      secrets.push(this._web3.utils.asciiToHex(secret));
    });
    const blindAuction = await this._getBlindAuctionFor(domain);
    return blindAuction
      .methods
      .reveal(values, isFakes, secrets)
      .send({
        from: this._account,
        value: 0,
      });
  }

  //withdraw bid deposit from auction, if any (if you were the highest bidder before)
  //can occur any time
  //returns somethingWithdrawn: boolean
  async withdraw(domain) {
    const blindAuction = await this._getBlindAuctionFor(domain);
    await blindAuction
      .methods
      .withdraw()
      .send({
        from: this._account,
        value: 0,
      });
  }

  //claim the domain
  async claim(domain) {
    const blindAuction = await this._getBlindAuctionFor(domain);
    await blindAuction
      .methods
      .claimWinnerReward()
      .send({
        from: this._account,
        value: 0,
      });
  }

  async sendEther(domain, valueInWei) {
    const address = await this.resolveDomain(domain);
    this._web3.eth.sendTransaction({
      from: this._account,
      to: address,
      value: valueInWei,
    });
  }

  setAccount(address) {
    this._account = address;
  }

  connectDomainRegistry(address) {
    this._domainRegistry = this._getContract(domainRegistryArtifact, address);
  }

  //for direct communication
  async getAuctionStage(address) {
    const auction = this._getContract(blindAuctionArtifact, address);
    return auction.methods.getStage().call();
  }

  async queryDomain(domain) {
    const address = await this.resolveDomain(domain);
    if (address === "0x0000000000000000000000000000000000000000") {
      return "unclaimed";
    }
    const blindAuction = this._getContract(blindAuctionArtifact, address);
    try {
      const stage = await blindAuction.methods.getStage().call();
      return stage
    } catch (e) {
      return "claimed";
    }
  }

  //returns address of domain
  async resolveDomain(domain) {
    return this._domainRegistry.methods.resolveDomain(domain).call();
  }

  async init() {
    this._account = (await this.getAccount()).address;    //by default set account[0] as the main acc

    const netId = await this._web3.eth.net.getId();       //connect to domainRegistry
    const network = domainRegistryArtifact.networks[netId];
    this.connectDomainRegistry(network.address);

    this._web3.eth.handleRevert = true;                   //enable revert errors

    //subscribe to Domain Registry events
    this._domainRegistry.events.allEvents({}, (err, obj) => {
      const listeners = this._listeners[obj.event];
      if (err || listeners === undefined) return;
      listeners.forEach(l => l(obj.returnValues));
      console.log({ e: obj.event, ...obj.returnValues });
    });
  }

  subscribe(event, callback) {
    if (this._listeners[event] === undefined) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  _getContract(artifact, address) {
    return new this._web3.eth.Contract(artifact.abi, address);
  }

  async _getBlindAuctionFor(domain) {
    const address = await this.resolveDomain(domain);
    return this._getContract(blindAuctionArtifact, address);
  }
}

function Bid(valueInWei, isFake, secret) {
  this.value = valueInWei;
  this.isFake = isFake;
  this.secret = secret;
}

async function getApi() {
  let web3;

  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    window.ethereum.enable()
  } else {
    console.warn(`No web3 detected, falling back on ${URL}.`);
    web3 = new Web3(new Web3.providers.HttpProvider(URL))
  }

  const app = new App(web3);
  await app.init();
  return app;
}

export {
  getApi,
  Bid,
}