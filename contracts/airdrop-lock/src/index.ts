import * as bindings from "@ckb-js-std/bindings";
import { HighLevel, log, bytesEq } from "@ckb-js-std/core";
import { getUDTAmountFromData } from "./util";

function main(): number {
  log.setLevel(log.LogLevel.Debug);


  // NAME
  //     airdrop-lock - validation logic for airdrop lock contract
  //
  // DESCRIPTION
  //     Validates transactions for airdropping UDTs with lock periods.
  //
  // ARGS STRUCTURE
  //     [0..20]   : first 20 bytes of the type script hash of the UDT being airdropped
  //     [20..40]  : first 20 bytes of the original lock script hash
  //     [40..48]  : since value for lock period (u64 little-endian)
  //
  // UNLOCKING LOGIC
  //     If there is at least one extra UDT cell in the inputs:
  //         1. Check the first extra UDT cell's lock script hash matches the dropper's lock script hash.
  //         2. Output cell must have at least one cell with the UDT and airdrop-lock, and the UDT amount must increase.
  //     If there is no extra UDT cell in the inputs:
  //         1. Check the since field to ensure the lock period has passed.
  //         2. Check the output cell lock hash matches the original lock hash.

  const script = HighLevel.loadScript();
  const argsInHex = bindings.hex.encode(script.args.slice(35)); // ckb-js-vm has leading 35 bytes args

  log.debug(`Script args: ${argsInHex}`);
  const udtTypeScriptHash = argsInHex.slice(0, 40);
  const originalLockHash = argsInHex.slice(40, 80);
  const sinceValueHex = argsInHex.slice(80, 96);
  const sinceValue = BigInt("0x" + sinceValueHex);

  log.debug(`Udt Type Script Hash: ${udtTypeScriptHash}`);
  log.debug(`Original Lock Hash: ${originalLockHash}`);
  log.debug(`Since Value: ${sinceValue}`);

  let isFirstDrop = false;
  let receiverUdtAmountInput = BigInt(0);
  let airdropCellIndexInInputs = -1;
  let isRefund = true;

  for (let i = 0; ; i++) {
    try {
      const cell = HighLevel.loadCell(i, bindings.SOURCE_INPUT);
      if (bytesEq(cell.lock.hash(), script.hash())) {
        airdropCellIndexInInputs = i;
        const cellData = HighLevel.loadCellData(i, bindings.SOURCE_INPUT);
        if (cellData.byteLength === 16) {
          receiverUdtAmountInput = getUDTAmountFromData(cellData);
        }
        if (cell.type === null) {
          isFirstDrop = true;
        }
        break;
      }
    } catch (error) {
      // index out of range
      break;
    }
  }

  for (let i = 0; ; i++) {
    if (i === airdropCellIndexInInputs) {
      continue; // skip the airdrop cell itself
    }

    try {
      const cell = HighLevel.loadCell(i, bindings.SOURCE_INPUT);
      if (cell.type !== null) {
        if (
          bytesEq(cell.type!.hash(), bindings.hex.decode(udtTypeScriptHash))
        ) {
          // udt cell found
          isRefund = false;
        }
      }
    } catch (error) {
      // index out of range
      break;
    }
  }

  if (!isRefund) {
    // normal unlock flow
    if (airdropCellIndexInInputs < 0) {
      log.error("Airdrop cell not found in inputs");
      return 1;
    }

    let receiverUdtAmountOutput = BigInt(0);
    let airdropCellFoundInOutputs = false;

    for (let i = 0; ; i++) {
      try {
        const cell = HighLevel.loadCell(i, bindings.SOURCE_OUTPUT);
        if (bytesEq(cell.lock.hash(), script.hash())) {
          airdropCellFoundInOutputs = true;
          const cellData = HighLevel.loadCellData(i, bindings.SOURCE_OUTPUT);
          if (cellData.byteLength === 16) {
            receiverUdtAmountOutput = getUDTAmountFromData(cellData);
          }
          break;
        }
      } catch (error) {
        // index out of range
        break;
      }
    }

    if (!airdropCellFoundInOutputs) {
      log.error("Airdrop cell not found in outputs");
      return 1;
    }

    if (receiverUdtAmountOutput <= receiverUdtAmountInput) {
      log.error("UDT amount did not increase in output");
      return 1;
    }
  } else {
    // refund flow
    const since = HighLevel.loadInputSince(
      airdropCellIndexInInputs,
      bindings.SOURCE_INPUT
    );
    if (since > sinceValue) {
      log.error("Lock period has not expired");
      return 1;
    }
  }

  return 0;
}

bindings.exit(main());
