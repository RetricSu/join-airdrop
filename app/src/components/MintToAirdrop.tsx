import React, { useState, useEffect } from 'react';
import { ccc } from "@ckb-ccc/connector-react";
import { findJoinAirdropCells, mintUDTToJoinCell, getListedUDTTypeHash, getDefaultUDTTypeHashFromLock } from '../utils/airdropUtils';

const MintToAirdrop: React.FC = () => {
  const signer = ccc.useSigner();
  const [airdropCells, setAirdropCells] = useState<any[]>([]);
  const [loadingCells, setLoadingCells] = useState(true);
  const [selectedCell, setSelectedCell] = useState<any | null>(null);
  const [mintAmount, setMintAmount] = useState<string>('1000');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signerUdtTypeHash, setSignerUdtTypeHash] = useState<string | null>(null);

  const udtTypeHash = getListedUDTTypeHash();

  useEffect(() => {
    const loadAirdropCells = async () => {
      if (!signer) return;

      try {
        setLoadingCells(true);
        const cells = await findJoinAirdropCells(signer.client, udtTypeHash);
        setAirdropCells(cells);
      } catch (err) {
        console.error('Error loading cells:', err);
      } finally {
        setLoadingCells(false);
      }
    };

    loadAirdropCells();
  }, [signer, udtTypeHash]);

  useEffect(() => {
    const loadSignerUdtTypeHash = async () => {
      if (!signer) return;
      const signerAddressObj = await signer.getRecommendedAddressObj();
      const signerLock = signerAddressObj.script;
      const udtTypeHash = getDefaultUDTTypeHashFromLock(signerLock);
      setSignerUdtTypeHash(udtTypeHash);
    };

    loadSignerUdtTypeHash();
  }, [signer]);

  const handleMintUDT = async () => {
    if (!signer || !selectedCell) return;

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const amount = BigInt(mintAmount);

      if (amount <= 0n) {
        throw new Error('Mint amount must be greater than 0');
      }

      const mintTxHash = await mintUDTToJoinCell(selectedCell, signer, amount);
      setTxHash(mintTxHash);

      // Refresh the cell list
      const cells = await findJoinAirdropCells(signer.client, udtTypeHash);
      setAirdropCells(cells);

      // Reset form
      setMintAmount('1000');
      setSelectedCell(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint UDT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mint UDT Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Mint UDT to Join Airdrop Cell</h2>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className='text-sm'>
              <strong>Your UDT Type Hash:</strong> {signerUdtTypeHash}</p>
            <p className="text-sm text-blue-800">
              <strong>Target UDT Type Hash:</strong> {udtTypeHash}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              You can only mint UDT to cells that use this target UDT type hash. The two UDT type hashes above must be the same to proceed.
            </p>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Airdrop Cell
            </label>
            {loadingCells ? (
              <div className="flex items-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">Loading cells...</span>
              </div>
            ) : airdropCells.length === 0 ? (
              <p className="text-gray-600 py-2">No airdrop cells available</p>
            ) : (
              <div className="space-y-2">
                {airdropCells.map((cell, index) => (
                  <div
                    key={`${cell.outPoint.txHash}-${cell.outPoint.index}`}
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      selectedCell?.outPoint.txHash === cell.outPoint.txHash &&
                      selectedCell?.outPoint.index === cell.outPoint.index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedCell(cell)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Airdrop Cell #{index + 1}</p>
                        <p className="text-sm text-gray-600 font-mono">
                          {cell.outPoint.txHash.slice(0, 16)}...{cell.outPoint.txHash.slice(-8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Capacity</p>
                        <p className="font-semibold">{ccc.fixedPointToString(cell.cellOutput.capacity)} CKB</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCell && (
            <div>
              <label htmlFor="mintAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Mint Amount
              </label>
              <input
                type="number"
                id="mintAmount"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1000"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Amount of UDT tokens to mint to the selected cell</p>
            </div>
          )}

          <button
            onClick={handleMintUDT}
            disabled={loading || !signer || !selectedCell}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Minting...
              </div>
            ) : (
              'Mint UDT to Cell'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {txHash && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-green-800 text-sm font-medium">UDT minted successfully!</p>
            <p className="text-green-700 text-xs mt-1 font-mono break-all">{txHash}</p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">Important Notes:</h3>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• Only the UDT owner can mint tokens to airdrop cells</li>
          <li>• Minted tokens will be locked in the airdrop cell according to the cell's lock script</li>
          <li>• Users can only join airdrop cells that have been funded with UDT tokens</li>
          <li>• Make sure you have sufficient CKB to pay for transaction fees</li>
        </ul>
      </div>
    </div>
  );
};

export default MintToAirdrop;
