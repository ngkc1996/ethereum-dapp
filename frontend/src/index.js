const app = require("./app");

const auctionStage = {
  BID: "bidding",
  REVEAL: "revealing",
  CLAIM: "claiming",
  CLAIMED: "claimed",
  UNCLAIMED: "unclaimed",
};

//document elements
let domainQueriesDiv, newAuctionDiv, domainsListingDiv, moreBodyDiv, accountInfoDiv;

let api;

//states
let domainsMap = {};
let registeredDomainsMap = {}
let account = null;
let selectedAuction = {};
const auctionsStarted = new Set();

window.addEventListener("load", load);

async function load() {
  //get elements
  domainQueriesDiv = document.getElementById("domain__queries");
  newAuctionDiv = document.getElementById("new_auction");
  domainsListingDiv = document.getElementById("domain__listing");
  moreBodyDiv = document.getElementById("more__body");
  accountInfoDiv = document.getElementById("account__info");

  //get api
  api = await app.getApi();

  //load buttons
  document.getElementById("domain_query__button").onclick = queryDomain;
  document.getElementById("new_auction__button").onclick = startNewAuction;
  document.getElementById("transaction__send").onclick = sendEther;
  document.getElementById("registered__refresh").onclick = fetchRegisteredDomains;
  document.getElementById("account__refresh").onclick = renderAccount;

  //renders + state changes
  await renderAccount();
  await fetchRegisteredDomains();
  renderDomainQueries();

  //set event subscriptions (rely on asynchronous returns)
  api.subscribe("NewDomainClaimed", ({ newOwner, node }) => {
    if (newOwner === account.address) {
      alert(`domain "${node}" successfully claimed`)
    }
    registeredDomainsMap[node] = {
      domain: node,
      address: newOwner,
    };
    renderDomainListing();
    if (domainsMap[node]) {
      domainsMap[node] = {
        domain: node,
        address: newOwner,
        stage: auctionStage.CLAIMED
      }
      renderDomainQueries()
    }
  });
  api.subscribe("NewAuctionStarted", ({ node, auctionAddress }) => {
    if (auctionsStarted.has(node)) {
      domainsMap[node] = {
        domain: node,
        address: auctionAddress,
        stage: auctionStage.BID
      }
      renderDomainQueries();
    }
  });
}

//Separate domain stage and address calls for ui state update and rendering
async function queryDomain() {
  const domain = document.getElementById("domain_query__input").value;
  const [stage, address] = await Promise.all([api.queryDomain(domain), api.resolveDomain(domain)]);
  domainsMap[domain] = { domain, address, stage };
  if (stage === auctionStage.CLAIMED) registeredDomainsMap[domain] = { domain, address };
  renderDomainQueries();
  renderDomainListing();
}

async function fetchRegisteredDomains() {
  const registered = await api.getRegisteredDomains();
  registered.forEach(register => registeredDomainsMap[register.domain] = register);
  renderDomainListing();
}

async function startNewAuction() {
  const domain = document.getElementById("new_auction__domain").value;

  //checks for valid auction to be started
  if (domainsMap[domain] && domainsMap[domain].stage !== auctionStage.UNCLAIMED) {  //domain is already queried to no longer be unclaimed (prevent repeat query)
    alert("domain no longer available for auction");
    return;
  } else if (domain === "") {
    alert("domain cannot be empty string");
    return;
  } else if (!isValidDomain(domain)) {
    alert("invalid domain name, must end with '.ntu' and prefix must be alphanumeric")
  } else {                                                                          //domain state unknown, query
    const stage = await api.queryDomain(domain);
    if (stage !== auctionStage.UNCLAIMED) {
      alert("domain no longer available for auction");
      const address = await api.resolveDomain(domain);
      domainsMap[domain] = { domain, address, stage };
      renderDomainQueries();
      return;
    }
  }

  try {
    await api.startAuction(domain);
    auctionsStarted.add(domain);
    alert(`auction for "${domain}" started`);
  } catch (e) {
    alert("cannot start auction")
  }
}

async function sendEther() {
  const domain = document.getElementById("transaction__domain").value;
  const valueInWei = document.getElementById("transaction__amount").value;

  if (domainsMap[domain]) {
    if (domainsMap[domain].stage !== auctionStage.CLAIMED)  //domain is already queried to no longer be unclaimed (prevent repeat query)
    alert("domain not registered, cannot send ether");
    return;
  } else if (parseInt(valueInWei) <= 0) {
    alert("ether must be > 0");
    return;
  } else {                                                   //domain state unknown, query
    const stage = await api.queryDomain(domain);
    if (stage !== auctionStage.CLAIMED) {
      alert("domain not registered, cannot send ether");
      const address = await api.resolveDomain(domain);
      domainsMap[domain] = {domain, address, stage};
      renderDomainQueries();
      return;
    }
  }

  try {
    await api.sendEther(domain, valueInWei);
  } catch (e) {
    alert(`could not transfer to ${domain}`);
  }
}

function renderMore({ domain, address, stage }) {
  if (
    selectedAuction.domain === domain
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
  let t;
  switch (stage) {
    case auctionStage.BID:
      t = divWithText("Note: Be sure to remember your bid details, they are required in the reveal stage.")
      const { i, c, s, e } = bidMenu();
      b = button("Bid", async () => {
        if (i.value <= 0) {
          alert("bid must be greater than 0");
          return;
        } else if (!s) {
          alert("secret cannot be empty");
          return
        }
        try {
          await api.bid(domain, new app.Bid(i.value, c.checked, s.value));
          alert("successfully submitted bid")
        } catch (e) {
          //if there is an issue, it is likely the stage is off (therefore update stage)
          domainsMap[domain].stage = await api.getAuctionStage(domainsMap[domain].address);
          alert("cannot bid");
          renderDomainQueries();
          console.log(e);
        }
      });
      f.appendChild(e);
      f.appendChild(b);
      break;

    case auctionStage.REVEAL:
      const d = element("div");
      t = divWithText("Note: Be sure to include ALL your bids IN ORDER in a single reveal.");
      const menus = [];
      const menu = bidMenu();
      menu.e.classList.add("bid_menu");
      menus.push(menu);
      const buttonAdd = button("Add Another Bid", () => {
        const menu = bidMenu();
        menus.push(menu);
        menu.e.classList.add("bid_menu");
        d.appendChild(menu.e);
      });
      b = button("Reveal", async () => {
        const bids = menus.map(({ i, c, s }) => new app.Bid(i.value, c.checked, s.value));
        try {
          await api.reveal(domain, bids);
          alert("successfully revealed bids")
        } catch (e) {
          //if there is an issue, it is likely the stage is off (therefore update stage)
          domainsMap[domain].stage = await api.getAuctionStage(domainsMap[domain].address);
          alert("cannot reveal bids");
          renderDomainQueries();
          console.log(e);
        }
      });
      d.appendChild(menu.e);
      f.appendChild(t);
      f.appendChild(d);
      f.appendChild(buttonAdd);
      f.appendChild(b);
      break;

    case auctionStage.CLAIM:
      b = button("Try Claim", async () => {
        try {
          await api.claim(domain);
        } catch (e) {
          alert("failed to claim")
        }
      });
      f.appendChild(b);
      break;

    case auctionStage.UNCLAIMED:
      f.appendChild(divWithText("Available for auction"));
      break;

    default:
      f.appendChild(divWithText("No available actions"));
  }
  moreBodyDiv.appendChild(f);
}

function renderDomainQueries() {
  domainQueriesDiv.innerHTML = "";

  const f = fragment();
  const auctions = Object.values(domainsMap);

  if (auctions.length) {
    auctions.forEach(auction => {
      const d = element("div");
      d.appendChild(divWithText("Domain: " + auction.domain));
      d.appendChild(divWithText("Address: " + auction.address));
      d.appendChild(divWithText("Stage: " + auction.stage));
      d.onclick = () => {
        document.getElementById("domain_query__input").value = auction.domain;
        switch (auction.stage) {
          case auctionStage.CLAIMED:
            document.getElementById("transaction__domain").value = auction.domain;
            document.getElementById("transaction__amount").value = 0;
            break;
          case auctionStage.UNCLAIMED:
            document.getElementById("new_auction__domain").value = auction.domain;
            break;
        }
        renderMore(auction);
      }
      f.appendChild(d);
    });
  } else {
    domainQueriesDiv.appendChild(divWithText("No queries made"));
  }
  domainQueriesDiv.appendChild(f);

  //to update the 'more' div if there are changes
  if (selectedAuction.domain) renderMore(domainsMap[selectedAuction.domain]);
}

function renderDomainListing() {
  domainsListingDiv.innerHTML = "";

  const domains = Object.values(registeredDomainsMap);
  domains.forEach(({ domain, address }) => {
    const d = element("div");
    d.appendChild(divWithText(`Domain: ${domain}`));
    d.appendChild(divWithText(`Address: ${address}`));
    d.onclick = () => {
      document.getElementById("transaction__domain").value = domain;
      document.getElementById("transaction__amount").value = 0;
    }
    domainsListingDiv.appendChild(d);
  })
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

//utility
function divWithText(text) {
  const d = element("div");
  d.innerText = text;
  return d;
}

function bidMenu() {
  const e = element("div");
  const { i, e: ei } = labelInputPair("Amount (Wei): ", "number", 0);
  const { i: c, e: ec } = labelInputPair("Fake Bid: ", "checkbox");
  const { i: s, e: es } = labelInputPair("Secret: ", "text");
  e.appendChild(ei);
  e.appendChild(ec);
  e.appendChild(es);
  return { i, c, s, e }
}

function labelInputPair(label, inputType, defaultValue) {
  const e = element("div");
  const l = element("label");
  l.innerText = label;
  const i = element("input");
  i.type = inputType;
  if (defaultValue !== undefined) i.value = defaultValue;
  e.appendChild(l);
  e.appendChild(i);
  return { l, i, e };
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

function isValidDomain(domain) {
  return /^[a-z|A-Z|0-9|.]*[a-z|A-Z|0-9]+(.ntu)$/.test(domain);
}