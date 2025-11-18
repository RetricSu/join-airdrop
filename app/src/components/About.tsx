import React from "react";

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        About Join Airdrop Demo
      </h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-700 mb-6">
          This is a demo application for participating in airdrops on the Nervos
          CKB blockchain. The app allows users to join existing airdrops and
          owners to mint User Defined Tokens (UDTs) for distribution.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Idea</h2>
        <div>
          <p className="text-gray-700 mb-6">
            The core logic of the airdrop contract is based on a custom lock
            script that governs how UDTs can be claimed and distributed. When a
            user joins an airdrop, a special cell is created with a lock script
            that encodes the UDT type hash, the original lock hash of the user's
            wallet, and a "since" value that enforces a time delay before the
            tokens can be claimed to the user's wallet.
          </p>
          <p className="text-gray-700 mb-6">
            The owner of the airdrop can mint specific UDTs to the airdrop cell,
            which users can then claim after the specified "since" time has
            passed. This mechanism ensures that users prepared their own cell to
            receive the UDT so the airdrop owner doesn't need to pay for it.
          </p>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Core Concepts
        </h2>
        <ul className="list-disc pl-6 text-gray-700 mb-6">
          <li>
            <strong>Airdrop:</strong> A distribution of tokens to multiple
            wallet addresses.
          </li>
          <li>
            <strong>UDT (User Defined Token):</strong> Custom tokens created on
            the CKB blockchain.
          </li>
          <li>
            <strong>CKB:</strong> The native cryptocurrency of the Nervos
            network.
          </li>
          <li>
            <strong>Wallet Connection:</strong> Connect your CKB-compatible
            wallet to interact with the blockchain.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          How to Use
        </h2>
        <ol className="list-decimal pl-6 text-gray-700 mb-6">
          <li>
            Connect your wallet using the "Connect Wallet" button in the top
            right.
          </li>
          <li>
            Choose the "Join Airdrop" tab to browse and participate in available
            airdrops.
          </li>
          <li>
            If you are an airdrop owner, use the "Mint UDT (Owner)" tab to
            create and distribute tokens.
          </li>
          <li>Follow the on-screen instructions to complete transactions.</li>
        </ol>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Features
        </h2>
        <ul className="list-disc pl-6 text-gray-700 mb-6">
          <li>Browse available airdrops</li>
          <li>Join airdrops by claiming tokens</li>
          <li>Create and mint UDTs for airdrop distribution</li>
          <li>Wallet integration with CKB-compatible wallets</li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Disclaimer
        </h2>
        <p className="text-gray-700 mb-6">
          This project is for demonstration and experimental purposes only.
          Please participate with caution. Blockchain transactions are
          irreversible. Ensure you understand the associated risks and rules.
          This demo may use test networks, but always verify contract behavior
          on the actual blockchain.
        </p>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Built with React, TypeScript, and @ckb-ccc/connector-react. Current
            network: Testnet.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
