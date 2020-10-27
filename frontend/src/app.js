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
  }

  //returns address of auction
  async startAuction(domain) {
    return this._domainRegistry
      .methods
      .startAuction(namehash(domain))
      .send({
        from: this._account,
        value: 0,
      });
  }

  //returns registered domain: array of string => address
  //address can be used to identify which domain names belong to user
  async getRegisteredDomains() {
    return this._domainRegistry.methods.getRegisteredDomains().call();
  }

  //returns auctioning domains: array of string => auction state
  //auction state is for display next to name, as well as for ui to know what interactions to display
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

  async getAuctionState(domain) {
    const address = await this._getAddressFor(domain);
    //TODO: getAuctionState to be implemented on BlindAuction contract
  }

  //sends bid
  async bid(domain, bid) {
    const {value, isFake, secret} = bid;
    if (this._secret === null) throw new Error("no secret");
    const hash = this._web3.utils.soliditySha3(value, isFake, secret);
    const blindAuction = await this._getBlindAuctionFor(domain);
    await blindAuction
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
      values.push(value);
      isFakes.push(isFake);
      secrets.push(secret);
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
    const address = await this._getAddressFor(domain);
    this._web3.eth.sendTransaction({
      from: this._account,
      to: address,
      value: valueInWei,
    });
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
    //TODO: getAddress given domain to be implemented on DomainRegistry contract
  }

  async _getBlindAuctionFor(domain) {
    const address = await this._getAddressFor(domain);
    return this._getContract(blindAuctionArtifact, address);
  }
}

function Bid(valueInWei, isFake, secret) {
  this.value = valueInWei;
  this.isFake = isFake;
  this.secret = secret;
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
  return app;
}

export {
  getApp,
  Bid,
}