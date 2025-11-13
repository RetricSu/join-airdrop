import React, { useState, useEffect } from 'react';
import { ccc } from "@ckb-ccc/connector-react";
import { createJoinAirdropCell, findJoinAirdropCells, getListedUDTTypeHash } from '../utils/airdropUtils';

const CreateJoinAirdrop: React.FC = () => {
  const signer = ccc.useSigner();
  const [lockBlocks, setLockBlocks] = useState<string>('1000');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingCells, setExistingCells] = useState<any[]>([]);
  const [loadingCells, setLoadingCells] = useState(true);

  const udtTypeHash = getListedUDTTypeHash();

  useEffect(() => {
    const loadExistingCells = async () => {
      if (!signer) return;

      try {
        setLoadingCells(true);
        const cells = await findJoinAirdropCells(signer.client, udtTypeHash);
        setExistingCells(cells);
      } catch (err) {
        console.error('Error loading cells:', err);
      } finally {
        setLoadingCells(false);
      }
    };

    loadExistingCells();
  }, [signer, udtTypeHash]);

  const handleCreateAirdrop = async () => {
    if (!signer) return;

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const sinceValue = BigInt(lockBlocks);

      if (sinceValue <= 0n) {
        throw new Error('Lock period must be greater than 0 blocks');
      }

      const airdropTxHash = await createJoinAirdropCell(signer, udtTypeHash, sinceValue);
      setTxHash(airdropTxHash);

      // Refresh the cell list
      const cells = await findJoinAirdropCells(signer.client, udtTypeHash);
      setExistingCells(cells);

      // Reset form
      setLockBlocks('1000');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create airdrop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Create New Airdrop Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Join Airdrop Cell</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="lockBlocks" className="block text-sm font-medium text-gray-700 mb-1">
              Lock Period (blocks)
            </label>
            <input
              type="number"
              id="lockBlocks"
              value={lockBlocks}
              onChange={(e) => setLockBlocks(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1000"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">Number of blocks before you can refund</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>UDT Type Hash:</strong> {udtTypeHash}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              This airdrop uses the listed UDT token
            </p>
          </div>

          <button
            onClick={handleCreateAirdrop}
            disabled={loading || !signer}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </div>
            ) : (
              'Create Join Airdrop Cell'
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
            <p className="text-green-800 text-sm font-medium">Airdrop cell created successfully!</p>
            <p className="text-green-700 text-xs mt-1 font-mono break-all">{txHash}</p>
          </div>
        )}
      </div>

      {/* Existing Airdrop Cells Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Existing Join Airdrop Cells</h2>

        {loadingCells ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading cells...</span>
          </div>
        ) : existingCells.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No airdrop cells found</h3>
            <p className="text-gray-600">Create the first join airdrop cell above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {existingCells.map((cell, index) => (
              <div key={`${cell.outPoint.txHash}-${cell.outPoint.index}`} className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Airdrop Cell #{index + 1}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Capacity</p>
                    <p className="font-semibold">{ccc.fixedPointToString(cell.cellOutput.capacity)} CKB</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cell ID</p>
                    <p className="font-mono text-xs truncate">
                      {cell.outPoint.txHash.slice(0, 10)}...{cell.outPoint.txHash.slice(-8)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">This cell is ready to receive UDT tokens from the owner</p>
                  <a target='__blank' href={`https://testnet.explorer.nervos.org/transaction/${cell.outPoint.txHash}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateJoinAirdrop;
