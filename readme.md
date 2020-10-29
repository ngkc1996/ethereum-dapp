# Decentralised Domain Registrar

## Summary
This project fulfills the requirements for NTU's CZ4153 Blockchain Technology.

The aim is to build a “xxx.ntu” domain name registrar service on Ethereum testnet, using “commit-and-reveal” bidding process and a simple (minimally styled) front end website to interact with the blockchain. Supports listing of registered domains, query the actual address behind a domain and bid for an unregistered domain etc.

![application screen shot](assets/images/Screenshot%202020-10-30%20003207.png)

## Contracts
Contracts are located in the [contracts](contracts) folder.
- [BlindAuction.sol](contracts/BlindAuction.sol)
    - Deployed by DomainRegistry on ```startAuction()``` call
    - Handles all blind auction logic
- [DomainRegistry.sol](contracts/DomainRegistry.sol)
    - Handles deployment of auctions and emission of events
- [Migrations.sol](contracts/Migrations.sol)
    - Used by Truffle for initial deployment of contracts
    
## Frontend
Simple web interface bundled by webpack.
- [src](frontend/src): web page source files
- [dist](frontend/dist): build files produced by webpack - for production

## Development Prerequisites
The following should be installed prior to development
 - [NodeJS](https://nodejs.org/en/): Runtime environment for JS applications
 - [Truffle Ganache](https://www.trufflesuite.com/ganache): For blockchain visualisation and local deployment
 - [Truffle](https://www.trufflesuite.com/truffle): For contract compilation, testing and migration
 - [Metamask Browser Extension](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en): For interaction with the blockchain

## Development and Building
### Setup
To begin development, simply set up a local blockchain with Ganache and run
a development server with webpack.
1. Open Ganache and use the included [truffle.config.js](truffle-config.js) file to set up your workspace.
2. Deploy local development blockchain:
   ```
   npm install         //install truffle packages
   truffle migrate     //compile contracts and 'migrate' contracts to blockchain
   ```
    The DomainRegistry contract should now be deployed on Ganache.
3. Set up frontend:
   ```
   cd frontend
   npm install          //install webpack + web3 dependencies
   npm run build        //build frontend
   npm run dev          //run development server for UI
   ```
   You should now be able to access the application at ```localhost:8080```
4. Connect Metamask to Ganache and Web page
   1. Login to Metamask via the Metamask extension
   2. In Metamask, connect to network as given by RPC server address of Ganache
   3. In Ganache, *Accounts* > choose any account > *key icon* > copy private key
   4. In Metamask, *account icon* > *Import Account* > paste in your private key
   5. In Metamask, connect account to site
5. The app is now ready for use in a development setting.

### Redeployment
When trying to redeploy contracts,
```
//in root directory
truffle migrate --reset     //forces re-migration of contracts and clears currenty deployed contracts from the network

//in frontend directory
npm run server              //rebuilds frontend (to fix nonce out of sync issue)
```

## Testing
Run ```truffle test``` in the root directory to run included tests. Tests are found in the [test folder](test).