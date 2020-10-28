const app = require("./app");

let auctionsListingDiv, newAuctionDiv, moreBodyDiv, accountInfoDiv;
let api;

let auctionsMap = {};
let registeredDomainsMap = {};
let account = null;

window.addEventListener("load", load);

async function load() {
  //get elements
  auctionsListingDiv = document.getElementById("auctions__listing");
  newAuctionDiv = document.getElementById("new_auction");
  moreBodyDiv = document.getElementById("more__body");
  accountInfoDiv = document.getElementById("account__info");

  //get api
  api = await app.getApi();

  document.getElementById("auctions__refresh").onclick = renderAuctionsListing;
  document.getElementById("new_auction__button").onclick = startNewAuction;
  document.getElementById("transaction__send").onclick = sendEther;

  //renders + state changes
  await renderAuctionsListing();
  await renderAccount();

  //perform state changes
  await getRegisteredDomains()
}

//button functions
async function startNewAuction() {
  const domain = document.getElementById("new_auction__domain").value;

  //check if domain is being auctioned
  if (auctionsMap[domain]) {
    alert("domain already being auctioned");
    return;
  } else if (domain === "") {
    alert("domain cannot be empty string");
    return;
  }

  try {
    await api.startAuction(domain);
    renderAuctionsListing();
  } catch (e) {
    alert(e)
  }
}

async function sendEther() {
  const domain = document.getElementById("transaction__domain").value;
  const valueInWei = document.getElementById("transaction__amount").value;

  if (registeredDomainsMap[domain] === undefined) {
    alert("domain not registered, cannot send ether");
    return;
  } else if (parseInt(valueInWei) <= 0) {
    alert("ether must be > 0");
    return;
  }

  try {
    await api.sendEther(domain, valueInWei);
  } catch (e) {
    alert(e)
  }
}

//render functions
async function renderAuctionsListing() {
  try {
    const auctions = await api.getCurrentAuctions();
    auctionsMap = {};

    auctionsListingDiv.innerHTML = "";

    const f = fragment();
    auctions.forEach(({ domain, startBlock, address }) => {
      auctionsMap[domain] = { domain, startBlock, address };
      const d = element("div");
      d.appendChild(divWithText(domain));
      d.appendChild(divWithText(address));
      d.appendChild(divWithText(startBlock)); //TODO: do something with start block
      f.appendChild(d);
    })
    auctionsListingDiv.appendChild(f);
  } catch (e) {
    alert(e);
  }
}

function renderMore() {

}

async function renderAccount() {
  try {
    const { address, balance } = await api.getAccount();
    account = { address, balance };

    accountInfoDiv.innerHTML = "";

    accountInfoDiv.appendChild(divWithText(address));
    accountInfoDiv.appendChild(divWithText(balance));
  } catch (e) {
    alert(e);
  }
}

function renderTransaction() {

}

//state changes
async function getRegisteredDomains() {
  const domains = await api.getRegisteredDomains();
  console.log(domains);
}


//utility
function divWithText(text) {
  const d = element("div");
  d.innerText = text;
  return d;
}

function element(element) {
  return document.createElement(element)
}

function fragment() {
  return document.createDocumentFragment();
}