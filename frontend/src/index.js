import Web3 from "web3";
import domainRegistryArtifact from "../../build/contracts/DomainRegistry.json";
import blindAuctionArtifact from "../../build/contracts/BlindAuction.json";
import namehash from "eth-ens-namehash";

const PROTOCOL = "http://"
const HOST = "127.0.0.1"
const PORT = "7545"
const URL = `${PROTOCOL}${HOST}:${PORT}`

class App {
  constructor(web3) {
    this._web3 = web3;
    this._account = null;
    this._domains = [];
    this._auctions = {};
    this._domainRegistry = null;
  }

  async startAuction(domain) {
    this._auctions[domain] = await this._domainRegistry.methods.startAuction(namehash(domain)).call()
  }

  async getRegisteredDomains() {
    const domains = await this._domainRegistry.methods.getRegisteredDomains().call();
    console.log(domains);
  }

  getCurrentAuctions() {
  }

  sendEther(domain) {
  }

  bid(domain, value, isFake) {
  }

  reveal(domain) {
  }

  withdraw(domain) {
  }

  claim(domain) {
  }

  /**
   * Gets all accounts associated with web3
   * @returns {Promise<{address: string, balance: *}[]>}
   */
  async getAccounts() {
    const eth = this._web3.eth
    const accounts = await eth.getAccounts();
    const balances = Promise.all(accounts.map(eth.getBalance))
    return accounts.map((acc, index) => ({ address: acc, balance: balances[index]}))
  }

  setAccount(address) {
    this._account = address;
  }

  async setDomainRegistryAddress(address) {
    this._domainRegistry = await this._getContract(domainRegistryArtifact, address);
  }

  async init(web3) {
    this.account = (await this.getAccounts())[0].address;   //by default set account[0] as the main acc
    const netId = await this._web3.eth.net.getId();
    const network = domainRegistryArtifact.networks[netId]
    this.setDomainRegistryAddress(network.address)
  }

  async _getContract(artifact, address) {
    return new this._web3.eth.Contract(artifact.abi, address);
  }
}

async function getAppWebBrowser() {
  let web3;

  if (window.ethereum) {
    web3 = new Web3(window.ethereum)
    window.ethereum.enable()
  } else {
    console.warn(`No web3 detected, falling back on ${URL}.`);
    web3 = new Web3(new Web3.providers.HttpProvider(URL))
  }

  const app = new App(web3);
  await app.init();
  return app
}