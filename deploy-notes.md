# Goerli
yarn hardhat setup --network goerli --owner 0x5bD000ae659d81251426be803b18757fcCdd9dAF
yarn hardhat verifyEtherscan --network goerli --guard 0xBc5621C5C0216192c114a42D1c9B6B2d62ad4d99 --owner 0x5bD000ae659d81251426be803b18757fcCdd9dAF
yarn hardhat transferOwnership --network goerli --guard 0xBc5621C5C0216192c114a42D1c9B6B2d62ad4d99 --newowner 0xe923036B9a8F217fFe4E93d27647bE665C5c5ddc

# Mainnet
yarn hardhat setup --network mainnet --owner 0x5bD000ae659d81251426be803b18757fcCdd9dAF