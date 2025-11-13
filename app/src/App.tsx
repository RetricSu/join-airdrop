import React, { useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import CreateJoinAirdrop from "./components/CreateJoinAirdrop";
import MintToAirdrop from "./components/MintToAirdrop";
import { ccc } from "@ckb-ccc/connector-react";

function App() {
  const { wallet } = ccc.useCcc();
  const signer = ccc.useSigner();
  const [activeTab, setActiveTab] = useState<"user" | "owner">("user");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Join Airdrop</h1>
            <ConnectWallet />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {wallet && signer ? (
          <div>
            <div className="mb-8">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab("user")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "user"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Join Airdrop
                </button>
                <button
                  onClick={() => setActiveTab("owner")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "owner"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Mint UDT (Owner)
                </button>
              </nav>
            </div>

            {activeTab === "user" && <CreateJoinAirdrop />}
            {activeTab === "owner" && <MintToAirdrop />}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Welcome to Join Airdrop
            </h2>
            <p className="text-gray-600 mb-8">
              Connect your wallet to browse and participate in airdrops on CKB.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
