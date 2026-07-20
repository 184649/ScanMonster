import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { discoveriesOfDay, discoveredSpeciesWithinDays } from "../src/services/discoveryShare.core.ts";
import type { DiscoveryRecord } from "../src/types/discoveryRecord.ts";

/** テスト用の最小レコード。集計に使うフィールドだけ意味を持たせる。 */
const rec = (characterId: string, localDate: string): DiscoveryRecord =>
  ({ characterId, localDate, characterName: characterId }) as unknown as DiscoveryRecord;

describe("今日の発見（共有導線）", () => {
  it("その日の発見だけを返す", () => {
    const records = [rec("a", "2026-07-20"), rec("b", "2026-07-19"), rec("c", "2026-07-20")];
    assert.deepEqual(discoveriesOfDay(records, "2026-07-20").map((r) => r.characterId), ["a", "c"]);
  });

  it("同じ種を複数回発見しても1件にまとめる", () => {
    const records = [rec("a", "2026-07-20"), rec("a", "2026-07-20"), rec("b", "2026-07-20")];
    assert.deepEqual(discoveriesOfDay(records, "2026-07-20").map((r) => r.characterId), ["a", "b"]);
  });

  it("発見が無い日は空配列（共有カードを出さない）", () => {
    assert.deepEqual(discoveriesOfDay([rec("a", "2026-07-19")], "2026-07-20"), []);
  });
});

describe("直近7日のコレクション（共有導線）", () => {
  const today = "2026-07-20";

  it("当日を含む7日ぶんを数える", () => {
    const records = [
      rec("a", "2026-07-20"), // 当日
      rec("b", "2026-07-14"), // 7日前＝境界内
      rec("c", "2026-07-13") // 8日前＝範囲外
    ];
    assert.equal(discoveredSpeciesWithinDays(records, today, 7), 2);
  });

  it("同じ種を複数日で発見しても1種として数える", () => {
    const records = [rec("a", "2026-07-20"), rec("a", "2026-07-18"), rec("a", "2026-07-16")];
    assert.equal(discoveredSpeciesWithinDays(records, today, 7), 1);
  });

  it("未来日付は数えない", () => {
    assert.equal(discoveredSpeciesWithinDays([rec("a", "2026-07-21")], today, 7), 0);
  });

  it("不正な日付・日数でも壊れない", () => {
    assert.equal(discoveredSpeciesWithinDays([rec("a", "こわれた日付")], today, 7), 0);
    assert.equal(discoveredSpeciesWithinDays([rec("a", today)], "こわれた日付", 7), 0);
    assert.equal(discoveredSpeciesWithinDays([rec("a", today)], today, 0), 0);
  });

  it("月をまたいでも正しく数える", () => {
    // 2026-07-01 から7日ぶん＝06-25〜07-01。06-25 は境界内、06-24 は範囲外。
    const records = [rec("a", "2026-07-01"), rec("b", "2026-06-30"), rec("c", "2026-06-25"), rec("d", "2026-06-24")];
    assert.equal(discoveredSpeciesWithinDays(records, "2026-07-01", 7), 3);
  });
});
