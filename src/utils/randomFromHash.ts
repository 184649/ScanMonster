export const hashToInt = (hash: string, offset = 0, length = 8): number => {
  const safeOffset = Math.max(0, Math.min(offset, Math.max(hash.length - 1, 0)));
  const slice = hash.slice(safeOffset, safeOffset + length).padEnd(length, "0");
  const parsed = Number.parseInt(slice, 16);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const pickFromHash = <T>(hash: string, items: readonly T[], offset = 0): T => {
  if (items.length === 0) {
    throw new Error("pickFromHash requires at least one item.");
  }

  return items[hashToInt(hash, offset) % items.length]!;
};

export const valueFromHash = (hash: string, min: number, max: number, offset = 0): number => {
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const range = normalizedMax - normalizedMin + 1;
  return normalizedMin + (hashToInt(hash, offset) % range);
};

export const shortHash = (hash: string, length = 10): string => {
  return hash.slice(0, length).toUpperCase();
};
