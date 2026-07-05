/**
 * ワールド出現抽選（純粋・依存注入）。node:test で読めるよう import type のみ。
 *
 * フロー：
 *  1. 画像実在キャラを持つ「解放済みワールド」を候補にする。
 *  2. rates（getWorldRates で算出）に従い出現ワールドを1つ抽選（ブースト補正込み）。
 *  3. wantRare なら、そのワールドの画像実在レアから抽選（無ければ通常へフォールバック）。
 *  4. 通常はそのワールドの画像実在キャラから1体抽選（未発見優先はしない＝所持済みも候補）。
 */
export type SpawnRng = () => number;

export type SpawnCandidate = {
  id: string;
  worldGroup: string;
  hasImage: boolean;
};

export type WorldSpawnResult<C, R> =
  | { kind: "normal"; world: string; character: C }
  | { kind: "rare"; world: string; rare: R };

/** 画像実在キャラを1体以上持つ解放済みワールドだけを、渡された順で返す。 */
export const spawnableWorldGroups = <C extends SpawnCandidate>(
  characters: C[],
  unlockedWorlds: string[]
): string[] => {
  const out: string[] = [];
  for (const w of unlockedWorlds) {
    if (!out.includes(w) && characters.some((c) => c.worldGroup === w && c.hasImage)) {
      out.push(w);
    }
  }
  return out;
};

/** rates（ワールド→確率）で1ワールドを抽選。合計が0（rates無し）なら均等抽選。 */
export const pickWorldByRates = (
  worlds: string[],
  rates: Partial<Record<string, number>>,
  rng: SpawnRng
): string | undefined => {
  if (worlds.length === 0) {
    return undefined;
  }
  const weights = worlds.map((w) => Math.max(0, rates[w] ?? 0));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    const idx = Math.min(worlds.length - 1, Math.floor(rng() * worlds.length));
    return worlds[idx];
  }
  let r = rng() * total;
  for (let i = 0; i < worlds.length; i++) {
    r -= weights[i] ?? 0;
    if (r < 0) {
      return worlds[i];
    }
  }
  return worlds[worlds.length - 1];
};

const pickFrom = <T>(items: T[], rng: SpawnRng): T | undefined => {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
};

export const selectWorldSpawn = <C extends SpawnCandidate, R extends SpawnCandidate>(
  characters: C[],
  rares: R[],
  args: {
    unlockedWorlds: string[];
    rates: Partial<Record<string, number>>;
    wantRare: boolean;
    rng: SpawnRng;
  }
): WorldSpawnResult<C, R> | undefined => {
  const worlds = spawnableWorldGroups(characters, args.unlockedWorlds);
  if (worlds.length === 0) {
    return undefined;
  }
  const world = pickWorldByRates(worlds, args.rates, args.rng);
  if (!world) {
    return undefined;
  }

  if (args.wantRare) {
    const rarePool = rares.filter((r) => r.worldGroup === world && r.hasImage);
    const rare = pickFrom(rarePool, args.rng);
    if (rare) {
      return { kind: "rare", world, rare };
    }
    // このワールドに画像実在レアが無ければ通常へフォールバック。
  }

  const normalPool = characters.filter((c) => c.worldGroup === world && c.hasImage);
  const character = pickFrom(normalPool, args.rng);
  if (!character) {
    return undefined;
  }
  return { kind: "normal", world, character };
};

export const hasSpawnableWorld = <C extends SpawnCandidate>(
  characters: C[],
  unlockedWorlds: string[]
): boolean => spawnableWorldGroups(characters, unlockedWorlds).length > 0;
