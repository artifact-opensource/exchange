/**
 * Artifact Virtual — on-chain registry (Base Mainnet, Chain ID 8453)
 * Single source of truth mirrored from ledger/dapp + treasury address.book.
 */

export const BASE_CHAIN_ID = 8453;

export const BASESCAN = {
  auToken: '0x0c5A9a970b9C9b77A1DDb1cd62F279cE6cDA2f08',
  agToken: '0x1D31719389Bd8b17277Ba367c26b830aE34D3674',
  staking: '0x8F638B6C2EBD61A638561B6993930CF25D53ACB9',
} as const;

export type ContractKey = keyof typeof BASESCAN;

export const basescanUrl = (keyOrAddress: string) =>
  /^0x[0-9a-fA-F]{40}$/.test(keyOrAddress)
    ? `https://basescan.org/address/${keyOrAddress}`
    : `https://basescan.org/address/${BASESCAN[keyOrAddress as ContractKey]}`;

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;
