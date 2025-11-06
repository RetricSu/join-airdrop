export function getUDTAmountFromData(data: ArrayBuffer): bigint {
  const n = new BigUint64Array(data);
  return n[0] | (n[1] << 64n);
}
