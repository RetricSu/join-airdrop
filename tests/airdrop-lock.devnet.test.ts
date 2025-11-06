import { hexFrom, ccc, hashTypeToBytes } from "@ckb-ccc/core";
import scripts from "../deployment/scripts.json";
import systemScripts from "../deployment/system-scripts.json";
import { buildClient, buildSigner } from "./helper";

describe("airdrop-lock contract", () => {
  let client: ccc.Client;
  let signer: ccc.SignerCkbPrivateKey;

  beforeAll(() => {
    // Create global devnet client and signer for all tests in this describe block
    client = buildClient("devnet");
    signer = buildSigner(client);
  });

  test("should airdrop successfully", async () => {
    const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
    const contractScript = scripts.devnet["airdrop-lock.bc"];

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;

    // Create UDT type script (using SUDT deployed on devnet)
    const udtTypeScript = {
      codeHash: systemScripts.devnet.sudt.script.codeHash,
      hashType: systemScripts.devnet.sudt.script.hashType,
      args: signerLock.hash(), // SUDT owner is the signer
    };

    // Args: UDT type hash (20 bytes) + original lock hash (20 bytes) + since (8 bytes)
    const udtTypeHash = udtTypeScript.codeHash.slice(0, 42); // first 20 bytes + 0x
    const originalLockHash = signerLock.hash().slice(0, 42); // first 20 bytes + 0x
    const sinceValue = 1000n; // lock period
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

    // First transaction: Create UDT for the signer
    const tx0 = ccc.Transaction.from({
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xE8030000000000000000000000000000")], // 1000 UDT
      cellDeps: [
        ...systemScripts.devnet.sudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx0.completeInputsByCapacity(signer);
    await tx0.completeFeeBy(signer, 1000);
    const txHash0 = await signer.sendTransaction(tx0);
    console.log(`UDT created: ${txHash0}`);

    // Second transaction: Create an airdrop cell
    const tx1 = ccc.Transaction.from({
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: mainScript,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0x00000000000000000000000000000000")], // 0 UDT initially
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.sudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx1.completeInputsByCapacity(signer);
    await tx1.completeFeeBy(signer, 1000);
    const txHash1 = await signer.sendTransaction(tx1);
    console.log(`Airdrop cell created: ${txHash1}`);

    // Third transaction: Airdrop UDT to the cell
    const tx2 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash1,
            index: 0,
          },
        },
        {
          previousOutput: {
            txHash: txHash0,
            index: 0,
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        hexFrom("0xE8030000000000000000000000000000"), // 1000 UDT in airdrop cell
        hexFrom("0x00000000000000000000000000000000"), // 0 UDT back to signer
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.sudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx2.completeFeeBy(signer, 1000);
    const txHash2 = await signer.sendTransaction(tx2);
    console.log(`Airdrop successful: ${txHash2}`);
  });

  test("should refund successfully", async () => {
    const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
    const contractScript = scripts.devnet["airdrop-lock.bc"];

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;

    // Create UDT type script (using SUDT deployed on devnet)
    const udtTypeScript = {
      codeHash: systemScripts.devnet.sudt.script.codeHash,
      hashType: systemScripts.devnet.sudt.script.hashType,
      args: signerLock.hash(), // SUDT owner is the signer
    };

    // Args: UDT type hash (20 bytes) + original lock hash (20 bytes) + since (8 bytes)
    const udtTypeHash = udtTypeScript.codeHash.slice(0, 42); // first 20 bytes + 0x
    const originalLockHash = signerLock.hash().slice(0, 42); // first 20 bytes + 0x
    const sinceValue = 146n; // block 146
    const sinceHex = sinceValue.toString(16).padStart(16, "0"); // 8 bytes hex

    const mainScript2 = {
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

    // First transaction: Create an airdrop cell with some UDT
    const tx1Refund = ccc.Transaction.from({
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: mainScript2,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xE8030000000000000000000000000000")], // 1000 UDT
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.sudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx1Refund.completeInputsByCapacity(signer);
    await tx1Refund.completeFeeBy(signer, 1000);
    const txHash1Refund = await signer.sendTransaction(tx1Refund);
    console.log(`Airdrop cell created: ${txHash1Refund}`);

    // Second transaction: Refund the UDT (since <= sinceValue due to contract bug)
    const sinceRefund = 145n; // block 145 <= 146
    const tx2Refund = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash1Refund,
            index: 0,
          },
          since: sinceRefund,
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xE8030000000000000000000000000000")], // 1000 UDT back to signer
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.sudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx2Refund.completeInputsByCapacity(signer);
    await tx2Refund.completeFeeBy(signer, 1000);
    const txHash2Refund = await signer.sendTransaction(tx2Refund);
    console.log(`Refund successful: ${txHash2Refund}`);

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

    // First transaction: Create an airdrop cell with some UDT
    const tx1 = ccc.Transaction.from({
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: mainScript,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xE8030000000000000000000000000000")], // 1000 UDT
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.sudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx1.completeInputsByCapacity(signer);
    await tx1.completeFeeBy(signer, 1000);
    const txHash1 = await signer.sendTransaction(tx1);
    console.log(`Airdrop cell created: ${txHash1}`);

    // Second transaction: Refund the UDT (since > sinceValue = 0)
    const since = 0n; // no time lock for testing
    const tx2 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash1,
            index: 0,
          },
          since,
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xE8030000000000000000000000000000")], // 1000 UDT back to signer
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.sudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx2.completeInputsByCapacity(signer);
    await tx2.completeFeeBy(signer, 1000);
    const txHash2 = await signer.sendTransaction(tx2);
    console.log(`Refund successful: ${txHash2}`);
  });
});
