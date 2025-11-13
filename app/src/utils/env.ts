export type NetworkType = "devnet" | "testnet" | "mainnet";

// Get network from environment variable, default to "testnet" if not set
export const getNetwork = (): NetworkType => {
  const network = process.env.NEXT_PUBLIC_CKB_NETWORK;

  if (network === "devnet" || network === "testnet" || network === "mainnet") {
    return network;
  }

  // Default to testnet if not specified or invalid
  return "testnet";
};

// Validate network type
export const isValidNetwork = (network: string): network is NetworkType => {
  return network === "devnet" || network === "testnet" || network === "mainnet";
};
