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
    const udtTypeHash = ccc.Script.from(udtTypeScript).hash().slice(0, 42); // first 20 bytes + 0x
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
    const udtTypeHash = ccc.Script.from(udtTypeScript).hash().slice(0, 42); // first 20 bytes + 0x
    const originalLockHash = signerLock.hash().slice(0, 42); // first 20 bytes + 0x
    const sinceValue = 2n; // wait 2 blocks for relative since test
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

    // Second transaction: Refund the UDT (relative since >= sinceValue)
    // Use relative mode with 2 blocks wait to properly test time lock
    const blocksToWait = 2n;
    const sinceRefund = (1n << 63n) | blocksToWait;
    console.log("Waiting for blocks to be mined...");
    await signer.client.waitTransaction(
      txHash1Refund,
      +blocksToWait.toString(),
    );

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
    console.log(`Refund transaction sent: ${txHash2Refund}`);

    // Wait for the refund transaction to be confirmed
    await signer.client.waitTransaction(txHash2Refund);
    console.log(`Refund successful: ${txHash2Refund}`);

    // Test second scenario: absolute since with sinceValue = 0
    const sinceValue2 = 0n; // no lock for absolute mode test
    const sinceHex2 = sinceValue2.toString(16).padStart(16, "0");

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        "0x0000" +
          contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
          udtTypeHash.slice(2) +
          originalLockHash.slice(2) +
          sinceHex2,
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
    console.log(`Refund transaction sent: ${txHash2}`);

    // Wait for the refund transaction to be confirmed
    await signer.client.waitTransaction(txHash2);
    console.log(`Refund successful: ${txHash2}`);
  }, 60000); // Increase timeout to 60 seconds to account for block waiting

  test("should mint UDT directly to airdrop cell", async () => {
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
    const udtTypeHash = ccc.Script.from(udtTypeScript).hash().slice(0, 42); // first 20 bytes + 0x
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

    // First transaction: Create an empty airdrop cell
    const tx1 = ccc.Transaction.from({
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: mainScript,
        },
      ],
      outputsData: [hexFrom("0x")], // empty data
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx1.completeInputsByCapacity(signer);
    await tx1.completeFeeBy(signer, 1000);
    const txHash1 = await signer.sendTransaction(tx1);
    console.log(`Empty airdrop cell created: ${txHash1}`);

    // Second transaction: Mint UDT directly to the airdrop cell
    const tx2 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash1,
            index: 0,
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: mainScript, // keep the same airdrop lock
          type: udtTypeScript, // add UDT type
        },
      ],
      outputsData: [hexFrom("0xE8030000000000000000000000000000")], // 1000 UDT minted
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.sudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx2.completeInputsByCapacity(signer);
    await tx2.completeFeeBy(signer, 1000);
    const txHash2 = await signer.sendTransaction(tx2);
    console.log(`UDT minted directly to airdrop cell: ${txHash2}`);

    // Wait for the transaction to be confirmed
    await signer.client.waitTransaction(txHash2);
    console.log(`Direct UDT mint successful: ${txHash2}`);
  }, 60000); // Increase timeout to 60 seconds for multiple transactions
});
