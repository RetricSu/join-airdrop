import {
  ccc,
  hexFrom,
  hashTypeToBytes,
  Cell,
  Hex,
  HashType,
} from "@ckb-ccc/connector-react";
import scripts from "../deployment/scripts.json";
import systemScripts from "../deployment/system-scripts.json";

export const findJoinAirdropCells = async (
  client: ccc.Client,
  udtTypeHash: string,
): Promise<Cell[]> => {
  const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
  const contractScript = scripts.devnet["airdrop-lock.bc"];

  const mainScript = {
    codeHash: ckbJsVmScript.script.codeHash,
    hashType: ckbJsVmScript.script.hashType,
    args: hexFrom(
      "0x0000" +
        contractScript.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
        udtTypeHash.slice(2, 42),
    ),
  };

  const iterator = client.findCells({
    script: mainScript,
    scriptType: "lock",
    scriptSearchMode: "prefix",
  });

  const cells: Cell[] = [];

  for await (const cell of iterator) {
    cells.push(cell);
  }
  return cells;
};

export const createJoinAirdropCell = async (
  signer: ccc.Signer,
  udtTypeHash: string,
  sinceValue: bigint,
): Promise<string> => {
  const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
  const contractScript = scripts.devnet["airdrop-lock.bc"];

  const signerAddressObj = await signer.getRecommendedAddressObj();
  const signerLock = signerAddressObj.script;

  // Args: UDT type hash (20 bytes) + original lock hash (20 bytes) + since (8 bytes)
  const originalLockHash = signerLock.hash().slice(0, 42); // first 20 bytes + 0x
  const sinceHex = sinceValue.toString(16).padStart(16, "0"); // 8 bytes hex

  const mainScript = {
    codeHash: ckbJsVmScript.script.codeHash,
    hashType: ckbJsVmScript.script.hashType,
    args: hexFrom(
      "0x0000" +
        contractScript.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
        udtTypeHash.slice(2) +
        originalLockHash.slice(2) +
        sinceHex,
    ),
  };

  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock: mainScript,
      },
    ],
  });

  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 1000);
  const txHash = await signer.sendTransaction(tx);
  return txHash;
};

export const mintUDTToJoinCell = async (
  joinCell: ccc.Cell,
  udtSigner: ccc.Signer,
  amount: bigint,
): Promise<string> => {
  const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
  const contractScript = scripts.devnet["airdrop-lock.bc"];

  const udtTypeScript = {
    codeHash: systemScripts.devnet.sudt.script.codeHash,
    hashType: systemScripts.devnet.sudt.script.hashType,
    args: (await udtSigner.getRecommendedAddressObj()).script.hash(), // UDT owner
  };

  const tx = ccc.Transaction.from({
    inputs: [
      {
        previousOutput: joinCell.outPoint,
      },
    ],
    outputs: [
      {
        lock: joinCell.cellOutput.lock,
        type: udtTypeScript,
      },
    ],
    outputsData: [ccc.numToBytes(amount, 16)], // UDT amount
    cellDeps: [
      ...ckbJsVmScript.script.cellDeps.map((c: any) => c.cellDep),
      ...contractScript.cellDeps.map((c: any) => c.cellDep),
      ...systemScripts.devnet.sudt.script.cellDeps.map((c: any) => c.cellDep),
    ],
  });

  await tx.completeInputsByCapacity(udtSigner);
  await tx.completeFeeBy(udtSigner, 1000); // todo: we should let the join-cell pay the fee
  const txHash = await udtSigner.sendTransaction(tx);
  return txHash;
};

export function getListedUDTTypeHash(): Hex {
  // TODO: Update this to your actual listed airdrop UDT type hash
  // This should be the type hash of the UDT token used for the airdrop
  // You can get this from getDefaultUDTTypeHashFromLock
  return "0x8f3bb8911855c4496a9e4723c9098d2734012ea6ed7ab291bdada6a9282b96ce";
}

export function getDefaultUDTTypeHashFromLock(lock: ccc.Script): Hex {
  const script: ccc.ScriptLike = {
    codeHash: systemScripts.devnet.sudt.script.codeHash,
    hashType: systemScripts.devnet.sudt.script.hashType,
    args: lock.hash(), // Extract UDT type hash from args
  };

  return ccc.Script.from(script).hash();
}
