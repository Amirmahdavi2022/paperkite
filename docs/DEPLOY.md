# Deploying from a phone

Nobody but you can do this part. Deploying means signing a transaction with your own wallet, and that has to happen on your device, with your own key. This guide walks through it on Base Sepolia, a free test network, before anything touches the real chain.

## What you need

- A wallet app with a built-in browser (MetaMask mobile or Rainbow both work).
- A little Base Sepolia test ETH, free from a faucet. Search "Base Sepolia faucet" or use the Coinbase developer faucet from inside your wallet's browser.

## Step 1 — open Remix

Inside your wallet app's browser (not your regular browser — it needs to inject the wallet), go to:

```
remix.ethereum.org
```

## Step 2 — bring in the four files

In Remix's file explorer, create a `contracts` folder and add these four files from this repo, in this order:

```
contracts/Base64.sol
contracts/ERC721Min.sol
contracts/Paperkite.sol
contracts/PaperkiteNFT.sol
```

Easiest way on a phone: open each file on GitHub, copy the raw content, paste into a new file in Remix with the same name.

## Step 3 — compile

Open the compiler tab (the second icon down). Set the compiler version to `0.8.26`. Under Advanced Configurations, turn on `viaIR`. Hit Compile PaperkiteNFT.sol — it pulls in the other three automatically.

## Step 4 — connect your wallet

Open the Deploy tab (the third icon). Under Environment, choose "Injected Provider". Your wallet will ask you to confirm the connection. Make sure the network shown is Base Sepolia — switch to it inside your wallet first if not.

## Step 5 — deploy the renderer

In the contract dropdown, pick `Paperkite`. Hit Deploy. Confirm in your wallet. Once it's mined, copy the deployed address — Remix shows it under "Deployed Contracts".

## Step 6 — deploy the NFT contract

Pick `PaperkiteNFT` from the dropdown. Fill in the constructor fields:

- `rendererAddress` — the address from step 5
- `payoutAddress` — your own wallet address, `0xc3491296a9093F09aD7f0db0B394457262150af8`
- `initialPrice` — a wei amount, e.g. `1000000000000000` for 0.001 ETH
- `maxSupply_` — how many can ever be minted, e.g. `512`

Hit Deploy, confirm in your wallet.

## Step 7 — mint one to yourself

Under "Deployed Contracts", expand PaperkiteNFT. Find `mint`, put the same value as `initialPrice` in the "VALUE" field at the top of the Deploy panel (in wei), and call it. Confirm in your wallet.

## Step 8 — check it actually worked

Copy the contract address into a Base Sepolia block explorer, open the "Read Contract" tab, call `tokenURI` with `1`. Copy what it returns and paste it into `tools/decode-tokenuri.html` from this repo — open that file straight from your phone's browser, no server needed. It should show a JSON block and the painting itself.

If that painting matches what you see in the gallery for seed 1, everything is wired correctly end to end.

## Only after that

Once you've seen it work on testnet with your own eyes, repeat steps 5 through 7 on Base mainnet instead of Base Sepolia. Real ETH, but deployment costs cents, not dollars, on Base.
