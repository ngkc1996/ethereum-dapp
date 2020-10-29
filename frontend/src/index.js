const app = require("./app");

const auctionStage = {
  BID: "bid",
  REVEAL: "reveal",
  END: "end"
}

let auctionsListingDiv, newAuctionDiv, moreBodyDiv, accountInfoDiv;
let api;

let auctionsMap = {};
let registeredDomainsMap = {};
let account = null;
let selectedAuction = {};

window.addEventListener("load", load);

async function load() {
  //get elements
  auctionsListingDiv = document.getElementById("auctions__listing");
  newAuctionDiv = document.getElementById("new_auction");
  moreBodyDiv = document.getElementById("more__body");
  accountInfoDiv = document.getElementById("account__info");

  //get api
  api = await app.getApi();

  document.getElementById("auctions__refresh").onclick = fetchAuctionsListing;
  document.getElementById("new_auction__button").onclick = startNewAuction;
  document.getElementById("transaction__send").onclick = sendEther;

  //renders + state changes
  await fetchAuctionsListing();
  await renderAccount();

  //perform state changes
  await getRegisteredDomains()

  //set event subscriptions
  api.subscribe("NewAuctionStarted", ({ auctionAddress, node }) => {
    auctionsMap[node] = {
      domain: node,
      address: auctionAddress,
      stage: auctionStage.BID,
    }
    renderAuctionsListing();
  });
  api.subscribe("NewDomainClaimed", ({ newOwner, node }) => {
    registeredDomainsMap[node] = {
      domain: node,
      address: newOwner,
    }
  })
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
  } catch (e) {
    alert("cannot start auction")
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
function renderMore({ domain, address, stage }) {
  if (
    selectedAuction.address === address
    && selectedAuction.stage === stage
  ) return;
  selectedAuction = { domain, address, stage };

  moreBodyDiv.innerHTML = "";

  const f = fragment();
  const h3 = element("h3");
  const h4 = element("h4");
  h3.innerText = `${domain}\n${address}`;
  h4.innerText = "Stage: " + stage;
  f.appendChild(h3);
  f.appendChild(h4);
  let b;
  switch (stage) {
    case auctionStage.BID: case auctionStage.REVEAL:
      const li = label("Amount (wei): ");
      const i = input("number");
      i.value = 0;
      const lc = label("Fake Bid: ");
      const c = input("checkbox");
      const ls = label("Secret: ");
      const s = input("text");
      b = button({
        [auctionStage.BID]: "Bid",
        [auctionStage.REVEAL]: "Reveal",
        }[stage],
        async () => {
        if (i.value <= 0) {
          alert("bid must be greater than 0");
          return;
        } else if (!s) {
          alert("secret cannot be empty");
          return
        }
        try {
          const bid = new app.Bid(
            i.value,
            c.checked,
            s.value,
          )
          if (auctionStage.BID === stage) {
            await api.bid(domain, bid);
          } else if (auctionStage.REVEAL === stage) {
            await api.reveal(domain, [bid]);
          }
        } catch (e) {
          //if there is an issue, it is likely the stage is off (therefore update stage)
          const newStage = await api.getAuctionStage(auctionsMap[domain].address)
          alert(`cannot ${stage}`);
          auctionsMap[domain].stage = newStage;
          renderAuctionsListing();
        }
      });
      const di = element("div");
      const dc = element("div");
      const ds = element("div");
      di.appendChild(li);
      di.appendChild(i);
      dc.appendChild(lc);
      dc.appendChild(c);
      ds.appendChild(ls);
      ds.appendChild(s);
      f.appendChild(di);
      f.appendChild(dc);
      f.appendChild(ds);
      f.appendChild(b);
      break;
    case auctionStage.END:
      b = button("Try Claim", async () => {
        try {
          await api.claim(domain);
        } catch (e) {
          alert("failed to claim")
        }
      })
      f.appendChild(b);
      break;
    default:
  }
  moreBodyDiv.appendChild(f);
}

function renderAuctionsListing() {
  auctionsListingDiv.innerHTML = "";

  const f = fragment();
  const auctions = Object.values(auctionsMap)

  if (auctions.length) {
    auctions.forEach(auction => {
      const d = element("div");
      d.appendChild(divWithText("Domain: " + auction.domain));
      d.appendChild(divWithText("Address: " + auction.address));
      d.appendChild(divWithText("Stage: " + auction.stage));
      d.onclick = () => renderMore(auction);
      f.appendChild(d);
    });
  } else {
    auctionsListingDiv.appendChild(divWithText("No auctions currently"))
  }
  auctionsListingDiv.appendChild(f);

  if (selectedAuction.domain) renderMore(auctionsMap[selectedAuction.domain]);
}

async function renderRegisteredDomains() {
  //TODO: implement renderRegisteredDomains
}

async function renderAccount() {
  try {
    const { address, balance } = await api.getAccount();
    account = { address, balance };

    accountInfoDiv.innerHTML = "";

    accountInfoDiv.appendChild(divWithText("Address: " + address));
    accountInfoDiv.appendChild(divWithText("Balance: " + balance + " ETH"));
  } catch (e) {
    alert(e);
  }
}

//state changes
async function getRegisteredDomains() {
  const domains = await api.getRegisteredDomains();
  console.log(domains);
}

async function fetchAuctionsListing() {
  try {
    const auctions = await api.getCurrentAuctions();
    auctionsMap = {};
    auctions.forEach(auction => auctionsMap[auction.domain] = auction);
    renderAuctionsListing();
  } catch (e) {
    alert("cannot fetch auctions");
    console.log(e);
  }
}

//utility
function divWithText(text) {
  const d = element("div");
  d.innerText = text;
  return d;
}

function label(text) {
  const l = element("label");
  l.innerText = text;
  return l;
}

function input(type) {
  const i = element("input")
  i.type = type;
  return i;
}

function button(text, callback = () => {}) {
  const b = element("button");
  b.innerText = text;
  b.onclick = callback;
  return b;
}

function element(element) {
  return document.createElement(element)
}

function fragment() {
  return document.createDocumentFragment();
}