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
npm test          # compiles the contract, runs it in a local EVM, diffs against the reference
npm run gallery   # writes docs/index.html from actual contract output
```

The gallery page is not a preview or a mockup. Every scene on it came out of the EVM.

## Layout

```
contracts/Paperkite.sol   the renderer that lives on chain
src/engine.js             the reference renderer, same algorithm in JS
test/parity.js            compiles, executes, compares byte for byte
scripts/gallery.js        builds the gallery from contract output
```

## Licence

MIT. Take it apart, use the integer geometry, draw your own worlds.
