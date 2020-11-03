truffle init

truffle compile
truffle migrate
truffle test


Explanation of testcases:
All unit tests were conducted in DomainRegistry.js.
For testcases involving an Auction (the majority of them are), a BlindAuction was instantiated by DomainRegistry.

The following explains the events that take place in the testcases, and why some events fail.

DEPLOYING...........................

"it should be able to deploy a registry"
- DomainRegistry is deployed
- Check if owner of DomainRegistry is accounts[0] (by default)

BIDDING STAGE.......................

"it should be able to accept real and fake bids during Bidding Stage"
- DomainRegistry instantiates a BlindAuction contract for domain "xxx.ntu"
- For all bids, the secret is set to "secret" for simplicity
- Bids are written as (value, fake flag, secret, deposit)
- For fake flag, "true" means the bid is fake
- The following bids are made successfully:
	- accounts[1]: (4, false, secret, 4), (10, true, secret, 8)
	- accounts[2]: (5, false, secret, 5)
	- accounts[3]: (20, false, secret, 20)

"it should not be able to reveal bids during Bidding Stage"
- accounts[1] tries to reveal his bids (using the right function call and arguments), but fails since the BlindAuction is still in the Bidding Stage

REVEAL STAGE.......................

"it should be not be able to bid during Reveal Stage"
- accounts[1] tries to bid (1, false, secret) but fails since BlindAuction is already in Reveal Stage (no further bidding allowed)

"it should be able to reveal during Reveal Stage"
- accounts[1] tries to reveal only 1 of his bids (he bidded twice previously), i.e. the (4, false, secret, 4) bid. Fails since you have to reveal ALL your bids at once, in order.
- accounts[1] reveals both his bids successfully, i.e. (4, false, secret, 4), (10, true, secret, 8)
- accounts[2] reveals his bid successfully, i.e. (5, false, secret, 5)
- accounts[2] then tries to reveal his (5, false, secret, 5) bid again, but fails since you cannot reveal the same bid twice

"it should not be able to claim during Claim Stage"
- accounts[2], which has highest bid of 5, tries to claim the domain, but fails since you cannot claim while in Reveal Stage

CLAIM STAGE.......................

"it should be not be able to bid during Claim Stage"
- accounts[1] tries to bid (1, false, secret, 1) but fails since BlindAuction is already in Reveal Stage (no further bidding allowed)

"it should not be able to reveal during Claim Stage"
- accounts[3] tries to reveal his (20, false, secret, 20) bid but fails since BlindAuction is already in Claim Stage (no further revealing is allowed)

"it should not be able to claim if not highest bid during Claim Stage"
- accounts[2] successfully claims the domain since he had the highest bid which was revealed i.e. 5.

AFTER CLAIMING A DOMAIN..........

"it should be able to send Ether to an account through resolving a domain"
- accounts[1] successfully sends accounts[2] 1e+18 Wei through the domain "xxx.ntu" (which is registered to accounts[2]).