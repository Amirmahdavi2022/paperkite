# Deploying from a phone

Nobody but you can do this part. Deploying means signing a transaction with your own wallet, and that has to happen on your device, with your own key. This guide walks through it on Base Sepolia, a free test network, before anything touches the real chain.

## What you need

- A wallet app with a built-in browser (MetaMask mobile or Rainbow both work).
- A little Base Sepolia test ETH, free from a faucet. Search "Base Sepolia faucet" or use the Coinbase developer faucet from inside your wallet's browser.

## Step 1 — open the deploy page

Remix does not support mobile, so this repo carries its own single-page deploy tool instead: `tools/deploy.html`. Open it inside your wallet app's own in-app browser (MetaMask or Rainbow), not your regular browser — it needs to see your wallet.

You can open it straight from GitHub (raw file), or from the copy shared in chat.

## Step 2 — pick your network first

Before touching the page, open your wallet app and switch to Base Sepolia. The deploy page shows whatever network your wallet is on right at the top, once connected — check it matches before confirming anything.

## Step 3 — connect

Tap Connect wallet. Your wallet will ask you to approve the connection. Once connected, the top bar shows your address and the chain you're on.

## Step 4 — deploy the renderer

Tap Deploy Paperkite renderer, confirm in your wallet, and wait — it fills in its own address once mined.

## Step 5 — deploy the collection

The renderer address is already filled in. Your payout address is pre-filled too. Set a price (in ETH) and a max supply, then tap Deploy PaperkiteNFT and confirm.

## Step 6 — mint one to yourself

The contract address carries over automatically. Tap Mint and confirm — this sends the price as value, exactly like a real buyer would.

## Step 7 — check it actually worked

Tap Show token in the last section. It reads tokenURI straight from the contract, decodes it in your browser, and shows the actual painting. If it matches what you see in the gallery for the same seed, everything is wired correctly end to end.

## Only after that

Once you've seen it work on testnet with your own eyes, repeat steps 5 through 7 on Base mainnet instead of Base Sepolia. Real ETH, but deployment costs cents, not dollars, on Base.
