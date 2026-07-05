/**
 * 伝説キャラのワールド解放判定（純粋・テスト可能）。段3 §3〜§6。
 *
 * 解放条件は「そのワールドの normal キャラを全発見」すること。
 *  - 判定対象は normal のみ（rare のコンプリートは不要・§3）。
 *  - ワールドごとに独立（地上コンプでも水ワールドは未解放・§27）。
 *  - 未解放時は存在を一切示唆しない（§4）。この関数はサーバー内部判定にのみ使う。
 */

export type WorldNormalProgress = {
  worldGroup: string;
  normalTotal: number;
  normalDiscovered: number;
};

/** そのワールドの伝説が解放済みか（normal を全発見しているか）。normalTotal=0 は未解放扱い。 */
export const isLegendaryUnlocked = (p: { normalTotal: number; normalDiscovered: number }): boolean =>
  p.normalTotal > 0 && p.normalDiscovered >= p.normalTotal;

/** 進捗一覧から解放済みワールドの集合を返す。 */
export const legendaryUnlockedWorlds = (progress: readonly WorldNormalProgress[]): Set<string> => {
  const set = new Set<string>();
  for (const p of progress) {
    if (isLegendaryUnlocked(p)) set.add(p.worldGroup);
  }
  return set;
};

/**
 * 「今回の発見で解放が成立したワールド」を判定する（解放演出のトリガ・§5/§25）。
 *  - 発見したキャラが normal で、そのワールドの normal が「直前は未完了・今回で完了」した場合に true。
 *  - discoveredBefore はこの発見を含まない発見済み数。
 */
export const didUnlockLegendaryNow = (input: {
  rarity: string;
  normalTotal: number;
  normalDiscoveredBefore: number;
  isNewForUser: boolean;
}): boolean => {
  if (input.rarity !== "normal") return false;
  if (!input.isNewForUser) return false; // 再発見では新規完了しない
  if (input.normalTotal <= 0) return false;
  const before = input.normalDiscoveredBefore;
  const after = before + 1;
  return before < input.normalTotal && after >= input.normalTotal;
};
