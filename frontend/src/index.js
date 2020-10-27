import Web3 from "web3";
import domainRegistryArtifact from "../../build/contracts/DomainRegistry.json";
import blindAuctionArtifact from "../../build/contracts/BlindAuction.json";
import namehash from "eth-ens-namehash";

const PROTOCOL = "http://";
const HOST = "127.0.0.1";
const PORT = "7545";
const URL = `${PROTOCOL}${HOST}:${PORT}`;

//current implementation uses a single secret, though there could be multiple
class App {
  constructor(web3) {
    this._web3 = web3;
    this._account = null;
    this._domainRegistry = null;
    this._secret = null;
  }

  //returns address of auction
  async startAuction(domain) {
    return this._domainRegistry.methods.startAuction(namehash(domain)).call()
  }

  //returns registered domain names
  async getRegisteredDomains() {
    return this._domainRegistry.methods.getRegisteredDomains().call();
  }

  //returns auctioning domain names
  async getCurrentAuctions() {
    return this._domainRegistry.methods.getCurrentAuctions().call();
  }

  //returns accounts: array of {address: string, balance: number}
  async getAccounts() {
    const eth = this._web3.eth;
    const accounts = await eth.getAccounts();
    const balances = Promise.all(accounts.map(eth.getBalance));
    return accounts.map((acc, index) => ({address: acc, balance: balances[index]}));
  }

  //sends bid
  async bid(domain, bid) {
    const {value, isFake} = bid;
    if (this._secret === null) throw new Error("no secret");
    const hash = this._web3.utils.soliditySha3(value, isFake, domain);
    const blindAuction = await this._getBlindAuctionFor(domain);
    await blindAuction
      .methods
      .bid(hash)
      .send({
        from: this._account,
        value: bid.value,
      });
  }

  //sends a reveal call
  async reveal(domain, bids) {
    const values = [];
    const isFakes = [];
    const secrets = new Array(bids.length).fill(this._secret);
    bids.forEach(({value, isFake}) => {
      values.push(value);
      isFakes.push(isFake);
    });
    const blindAuction = await this._getBlindAuctionFor(domain);
    await blindAuction
      .methods
      .reveal(values, isFakes, secrets)
      .send({
        from: this._account,
        value: 0,
      });
  }

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
    const address = await this._getAddressFor(domain);
    this._web3.eth.sendTransaction({
      from: this._account,
      to: address,
      value: valueInWei,
    });
  }

  setSecret(secret) {
    this._secret = secret;
  }

  getSecret() {
    return this._secret;
  }

  setAccount(address) {
    this._account = address;
  }

  async connectDomainRegistry(address) {
    this._domainRegistry = await this._getContract(domainRegistryArtifact, address);
  }

  async init(web3) {
    this._account = (await this.getAccounts())[0].address;    //by default set account[0] as the main acc
    const netId = await this._web3.eth.net.getId();
    const network = domainRegistryArtifact.networks[netId];
    await this.connectDomainRegistry(network.address);
  }

  async _getContract(artifact, address) {
    return new this._web3.eth.Contract(artifact.abi, address);
  }

  //returns address of domain
  async _getAddressFor(domain) {
    //to be implemented on contract side
  }

  async _getBlindAuctionFor(domain) {
    const address = await this._getAddressFor(domain);
    return this._getContract(blindAuctionArtifact, address);
  }
}

function Bid(valueInWei, isFake) {
  this.value = valueInWei;
  this.isFake = isFake;
}

async function getApp() {
  let web3;

  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    window.ethereum.enable()
  } else {
    console.warn(`No web3 detected, falling back on ${URL}.`);
    web3 = new Web3(new Web3.providers.HttpProvider(URL))
  }

  const app = new App(web3);
  await app.init(web3);
  return app
}

export {
  getApp,
  Bid,
}