# paperkite

A layered paper landscape, drawn by a smart contract.

There is no image file anywhere in this project. No IPFS pin, no server, no CDN link that quietly dies in three years. You hand the contract a number and it returns an SVG that it wrote itself, on chain, character by character.

Same number in, same world out, forever.

## What it draws

Cut paper hills stacked front to back, each one casting a soft shadow on the layer behind it. A sun or a moon with a glow around it. Pine trees along a ridge. Sometimes a cottage with a lit window, sometimes a lake catching the light, sometimes a kite on a string.

Six paper stocks, called dawn, dusk, night, harvest, mist and ember.

## The hard part

Solidity has no decimals and no floating point. Every curve, every shadow offset, every colour stop had to be rebuilt in whole numbers so the chain could do the same arithmetic a browser does.

So there are two renderers here. One in JavaScript, one in Solidity. They have to agree on every single byte or the build fails.

```
seeds tested: 467  identical: 467  mismatched: 0
runtime size 18371 bytes (EIP-170 limit 24576)
```

That check runs on every push. It caught a real bug on the first run, a single missing character in a bird wing that only showed up on some seeds.

## Try it

```
npm install
npm test          # parity check, then the full NFT behaviour suite against a local EVM
npm run gallery   # writes docs/index.html from actual contract output
```

The gallery page is not a preview or a mockup. Every scene on it came out of the EVM.

## The NFT layer

`PaperkiteNFT.sol` is a small hand-written ERC-721 (no external framework) plus ERC-2981 royalties. Minting calls the renderer contract live and uses the token id as the seed, so token #7 is always exactly the world you see at seed 7 in the gallery. Payment on mint goes straight to the owner's wallet in the same transaction — nothing sits in the contract waiting to be withdrawn.

`test/nft.js` runs this against a real local EVM with funded test accounts: wrong payment reverts, correct payment moves the exact price to the payout address, `tokenURI` is decoded and checked byte for byte against the renderer's own output, sold-out reverts once `maxSupply` is hit, only the owner can change price, royalty math is checked, and transfers work.

Deploying is the one step that has to happen from your own wallet, since it means signing with a key nobody but you should hold. See `docs/DEPLOY.md` for the phone-only walkthrough, and `tools/decode-tokenuri.html` for a no-server way to check what a deployed token actually returns.

## Layout

```
contracts/Paperkite.sol      the renderer that lives on chain
contracts/Base64.sol         base64 encoder used by tokenURI
contracts/ERC721Min.sol      minimal hand-written ERC-721
contracts/PaperkiteNFT.sol   the mintable collection
src/engine.js                the reference renderer, same algorithm in JS
test/parity.js               compiles the renderer, runs it in a local EVM, compares byte for byte
test/nft.js                  mints, pays, transfers, and checks tokenURI against a real EVM
scripts/gallery.js           builds the gallery from contract output
docs/DEPLOY.md                phone-only deployment walkthrough
tools/decode-tokenuri.html   paste a tokenURI, see the decoded JSON and image
```

## Licence

MIT. Take it apart, use the integer geometry, draw your own worlds.
