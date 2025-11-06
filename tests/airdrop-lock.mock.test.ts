import { hexFrom, Transaction, hashTypeToBytes } from "@ckb-ccc/core";
import { readFileSync } from "fs";
import {
  Resource,
  Verifier,
  DEFAULT_SCRIPT_ALWAYS_SUCCESS,
  DEFAULT_SCRIPT_CKB_JS_VM,
} from "ckb-testtool";

describe("airdrop-lock contract", () => {
  test("should execute successfully for normal unlock (airdrop)", async () => {
    const resource = Resource.default();
    const tx = Transaction.default();

    const mainScript = resource.deployCell(
      hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)),
      tx,
      false,
    );
    const alwaysSuccessScript = resource.deployCell(
      hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)),
      tx,
      false,
    );
    const contractScript = resource.deployCell(
      hexFrom(readFileSync("dist/airdrop-lock.bc")),
      tx,
      false,
    );

    // Create UDT type script (use always success for mock)
    const udtTypeScript = alwaysSuccessScript;

    // Create original lock script (receiver's lock)
    const originalLockScript = alwaysSuccessScript;

    // Since value (lock period) - set to a small value for testing
    const sinceValue = 1000n;

    // Args: UDT type hash (20 bytes) + original lock hash (20 bytes) + since (8 bytes)
    const udtTypeHash = udtTypeScript.codeHash.slice(0, 42); // first 20 bytes + 0x
    const originalLockHash = originalLockScript.hash().slice(0, 42); // first 20 bytes + 0x
    const sinceHex = sinceValue.toString(16).padStart(16, "0"); // 8 bytes hex

    mainScript.args = hexFrom(
      "0x0000" +
        contractScript.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
        udtTypeHash.slice(2) +
        originalLockHash.slice(2) +
        sinceHex,
    );

    // Create dropper's lock script (different from original)
    const dropperLockScript = resource.deployCell(
      hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)),
      tx,
      false,
    );

    // 2 input cells: airdrop cell + UDT cell from dropper
    const airdropInputCell = resource.mockCell(
      mainScript,
      undefined, // no type
      "0x00000000000000000000000000000000", // initial UDT amount 0
    );
    tx.inputs.push(Resource.createCellInput(airdropInputCell));

    const udtInputCell = resource.mockCell(
      dropperLockScript,
      udtTypeScript,
      "0xE8030000000000000000000000000000", // UDT amount 1000
    );
    tx.inputs.push(Resource.createCellInput(udtInputCell));

    // 2 output cells: updated airdrop cell with increased UDT + UDT cell back to dropper
    tx.outputs.push(Resource.createCellOutput(mainScript, udtTypeScript));
    tx.outputsData.push(hexFrom("0xE8030000000000000000000000000000")); // UDT amount 1000

    tx.outputs.push(
      Resource.createCellOutput(dropperLockScript, udtTypeScript),
    );
    tx.outputsData.push(hexFrom("0x00000000000000000000000000000000")); // UDT amount 0 (all transferred)

    const verifier = Verifier.from(resource, tx);
    // if you are using the native ckb-debugger, you can delete the following line.
    verifier.setWasmDebuggerEnabled(true);
    await verifier.verifySuccess(true);
  });

  test("should execute successfully for refund", async () => {
    const resource = Resource.default();
    const tx = Transaction.default();

    const mainScript = resource.deployCell(
      hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)),
      tx,
      false,
    );
    const alwaysSuccessScript = resource.deployCell(
      hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)),
      tx,
      false,
    );
    const contractScript = resource.deployCell(
      hexFrom(readFileSync("dist/airdrop-lock.bc")),
      tx,
      false,
    );

    // Create UDT type script (use always success for mock)
    const udtTypeScript = alwaysSuccessScript;

    // Create original lock script (receiver's lock)
    const originalLockScript = alwaysSuccessScript;

    // Since value (lock period) - set to 0 for immediate refund
    const sinceValue = 0n;

    // Args: UDT type hash (20 bytes) + original lock hash (20 bytes) + since (8 bytes)
    const udtTypeHash = udtTypeScript.codeHash.slice(0, 42); // first 20 bytes + 0x
    const originalLockHash = originalLockScript.hash().slice(0, 42); // first 20 bytes + 0x
    const sinceHex = sinceValue.toString(16).padStart(16, "0"); // 8 bytes hex

    mainScript.args = hexFrom(
      "0x0000" +
        contractScript.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
        udtTypeHash.slice(2) +
        originalLockHash.slice(2) +
        sinceHex,
    );

    // 1 input cell: airdrop cell with some UDT amount
    const airdropInputCell = resource.mockCell(
      mainScript,
      udtTypeScript,
      "0xE8030000000000000000000000000000", // UDT amount 1000
    );
    const input = Resource.createCellInput(airdropInputCell);
    input.since = 0n; // Set since to 0 (expired)
    tx.inputs.push(input);

    // 1 output cell: UDT goes back to original lock
    tx.outputs.push(
      Resource.createCellOutput(originalLockScript, udtTypeScript),
    );
    tx.outputsData.push(hexFrom("0xE8030000000000000000000000000000")); // UDT amount 1000

    const verifier = Verifier.from(resource, tx);
    // if you are using the native ckb-debugger, you can delete the following line.
    verifier.setWasmDebuggerEnabled(true);
    await verifier.verifySuccess(true);
  });
});
