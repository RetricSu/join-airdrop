import { getUDTAmountFromData } from "../contracts/airdrop-lock/src/util";

describe("getUDTAmountFromData", () => {
  test("should return 0 for empty data", () => {
    const data = new ArrayBuffer(16);
    const result = getUDTAmountFromData(data);
    expect(result).toBe(0n);
  });

  test("should return 0 for zero-filled data", () => {
    const data = new ArrayBuffer(16);
    const view = new Uint8Array(data);
    // All bytes are already 0
    const result = getUDTAmountFromData(data);
    expect(result).toBe(0n);
  });

  test("should parse small UDT amount correctly", () => {
    const data = new ArrayBuffer(16);
    const view = new DataView(data);
    // Set amount to 1000 (0x3E8 in little-endian)
    view.setUint32(0, 1000, true); // true for little-endian
    const result = getUDTAmountFromData(data);
    expect(result).toBe(1000n);
  });

  test("should parse large UDT amount correctly", () => {
    const data = new ArrayBuffer(16);
    const view = new DataView(data);
    // Set lower 64 bits to 0xFFFFFFFFFFFFFFFF
    view.setUint32(0, 0xffffffff, true);
    view.setUint32(4, 0xffffffff, true);
    // Set upper 64 bits to 0x1
    view.setUint32(8, 0x1, true);
    view.setUint32(12, 0x0, true);
    const result = getUDTAmountFromData(data);
    expect(result).toBe(0x1ffffffffffffffffn);
  });

  test("should parse maximum 128-bit value correctly", () => {
    const data = new ArrayBuffer(16);
    const view = new Uint8Array(data);
    // Set all bytes to 0xFF
    for (let i = 0; i < 16; i++) {
      view[i] = 0xff;
    }
    const result = getUDTAmountFromData(data);
    expect(result).toBe((1n << 128n) - 1n);
  });

  test("should handle data with only upper 64 bits set", () => {
    const data = new ArrayBuffer(16);
    const view = new DataView(data);
    // Set upper 64 bits to 0x100000000 (1 << 32)
    view.setUint32(8, 0x1, true);
    view.setUint32(12, 0x0, true);
    const result = getUDTAmountFromData(data);
    expect(result).toBe(1n << 64n);
  });

  test("should handle data with mixed endianness simulation", () => {
    const data = new ArrayBuffer(16);
    const view = new DataView(data);
    // Simulate little-endian 128-bit: 0x123456789ABCDEF0FEDCBA9876543210
    // Lower 64 bits: 0xFEDCBA9876543210
    view.setUint32(0, 0x76543210, true);
    view.setUint32(4, 0xfedcba98, true);
    // Upper 64 bits: 0x123456789ABCDEF0
    view.setUint32(8, 0x9abcdef0, true);
    view.setUint32(12, 0x12345678, true);
    const result = getUDTAmountFromData(data);
    expect(result).toBe(0x123456789abcdef0fedcba9876543210n);
  });
});
