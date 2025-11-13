import React, { useState, useEffect } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import {
  findJoinAirdropCells,
  getListedUDTTypeHash,
} from "../utils/airdropUtils";
import { Cell } from "@ckb-ccc/core";

interface AirdropCellData {
  cell: Cell;
  udtAmount: bigint;
  sinceValue: bigint;
  originalLockHash: string;
}

const AirdropList: React.FC = () => {
  const signer = ccc.useSigner();
  const [airdropCells, setAirdropCells] = useState<AirdropCellData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseAirdropCell = (cell: Cell): AirdropCellData => {
    // Parse the args: 0x0000 + contractCodeHash (32) + hashType (1) + udtTypeHash (32) + originalLockHash (20) + since (8)
    const args = cell.cellOutput.lock.args;
    const sinceHex = args.slice(-16); // Last 8 bytes (16 hex chars) = since value
    const originalLockHash = "0x" + args.slice(-36, -16); // 20 bytes before since

    // Parse UDT amount from cell data if it exists
    const udtAmount =
      cell.outputData.length >= 16
        ? BigInt(
            "0x" + Buffer.from(cell.outputData.slice(0, 16)).toString("hex"),
          )
        : 0n;

    const sinceValue = BigInt("0x" + sinceHex);

    return {
      cell,
      udtAmount,
      sinceValue,
      originalLockHash,
    };
  };

  useEffect(() => {
    const loadAirdropCells = async () => {
      if (!signer) return;

      try {
        setLoading(true);
        const udtTypeHash = getListedUDTTypeHash();
        const cells: Cell[] = await findJoinAirdropCells(
          signer.client,
          udtTypeHash,
        );
        const parsedCells = cells.map(parseAirdropCell);
        setAirdropCells(parsedCells);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load airdrop cells",
        );
      } finally {
        setLoading(false);
      }
    };

    loadAirdropCells();
  }, [signer]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading airdrops...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Available Airdrops
        </h2>
        <p className="text-gray-600 mt-1">
          Join existing airdrop campaigns by adding your tokens.
        </p>
      </div>

      {airdropCells.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No airdrops found
          </h3>
          <p className="text-gray-600">
            Be the first to create an airdrop campaign!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {airdropCells.map((airdropCell, index) => (
            <div
              key={`${airdropCell.cell.outPoint.txHash}-${airdropCell.cell.outPoint.index}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Airdrop #{index + 1}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">UDT Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {airdropCell.udtAmount.toString()} tokens
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Lock Period</p>
                  <p className="text-sm text-gray-900">
                    {airdropCell.sinceValue.toString()} blocks
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Cell ID</p>
                  <p className="text-xs font-mono text-gray-500 truncate">
                    {airdropCell.cell.outPoint.txHash.slice(0, 10)}...
                    {airdropCell.cell.outPoint.txHash.slice(-8)}
                  </p>
                </div>
              </div>

              <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                Join Airdrop
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AirdropList;
