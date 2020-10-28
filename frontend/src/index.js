const app = require("./app");

let auctionsListingDiv, newAuctionDiv, moreDiv, transactionDiv, accountInfoDiv;
let api;

let auctionsState = [];

window.addEventListener("load", load);

async function load() {
  //get elements
  auctionsListingDiv = document.getElementById("auctions__listing");
  newAuctionDiv = document.getElementById("new_auction");
  moreDiv = document.getElementById("more");
  transactionDiv = document.getElementById("transaction");
  accountInfoDiv = document.getElementById("account__info");

  //get api
  api = await app.getApi();

  document.getElementById("auctions__refresh").onclick = renderAuctionsListing;
  document.getElementById("new_auction__button").onclick = startNewAuction;

  //renders
  await renderAuctionsListing();
  await renderAccount();
}

//button functions
async function startNewAuction() {
  const domain = document.getElementById("new_auction__domain").value;

  //check if domain is being auctioned
  if (auctionsState.map(({ domain }) => domain).includes(domain)) {
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
}

//render functions
async function renderAuctionsListing() {
  try {
    const auctions = await api.getCurrentAuctions();
    auctionsState = auctions;

    auctionsListingDiv.innerHTML = "";

    const f = fragment();
    auctions.forEach(({ domain, startBlock }) => {
      const d = element("div");
      d.appendChild(divWithText(domain));
      d.appendChild(divWithText(startBlock));
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

    accountInfoDiv.innerHTML = "";

    accountInfoDiv.appendChild(divWithText(address));
    accountInfoDiv.appendChild(divWithText(balance));
  } catch (e) {
    alert(e);
  }
}

function renderTransaction() {

}

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