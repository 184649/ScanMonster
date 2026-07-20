import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDiscoveryCard,
  buildWorldCompleteCard,
  buildDexProgressCard,
  buildTodayCard,
  buildWeeklyCard,
  shareHeadlineFor,
  topDexClass,
  formatDiscoveryDate,
  type ShareCardSubject
} from "../src/services/shareCard.core.ts";
import { findShareTextLeaks } from "../src/services/shareText.core.ts";
import type { DexClass } from "../src/data/characterCatalog.generated.ts";

const subject = (name: string, dexClass: DexClass = "NORMAL"): ShareCardSubject => ({
  id: `id_${name}`,
  name,
  dexClass
});

describe("シェアカード共通", () => {
  it("最上位の分類で配色が決まる", () => {
    assert.equal(topDexClass(["NORMAL", "RARE", "NORMAL"]), "RARE");
    assert.equal(topDexClass(["RARE", "SECRET", "LEGEND"]), "SECRET");
    assert.equal(topDexClass([]), "NORMAL");
  });

  it("発見日は日付までで、時刻を出さない", () => {
    assert.equal(formatDiscoveryDate("2026-07-20T14:03:27.000Z").length, 10);
    assert.match(formatDiscoveryDate("2026-07-20T14:03:27.000Z"), /^\d{4}\.\d{2}\.\d{2}$/);
    assert.equal(formatDiscoveryDate(undefined), "");
    assert.equal(formatDiscoveryDate("こわれた日付"), "");
  });

  it("情報行は空値を落とす（空欄を並べない）", () => {
    const card = buildDiscoveryCard({
      subject: subject("ゾウ"),
      rarityLabel: "現生"
      // officialNo / discoveredAt / conditionLabel なし
    });
    assert.equal(card.fields.length, 1, "空の項目が残っている");
    assert.equal(card.fields[0]!.label, "レアリティ");
  });
});

describe("1. 単体発見カード", () => {
  const card = buildDiscoveryCard({
    subject: subject("ゾウ"),
    speciesLabel: "アフリカゾウ",
    officialNo: "42",
    discoveredAt: "2026-07-20T09:00:00.000Z",
    conditionLabel: "東京都",
    rarityLabel: "現生"
  });

  it("NORMAL は NEW DISCOVERY", () => {
    assert.equal(card.kind, "discovery");
    assert.equal(card.tag, "NEW DISCOVERY");
    assert.equal(card.paletteClass, "NORMAL");
  });

  it("イラスト・名前・図鑑番号・レアリティ・発見日を持つ", () => {
    assert.equal(card.subjects.length, 1);
    assert.equal(card.title, "ゾウ");
    assert.equal(card.subtitle, "アフリカゾウ");
    const labels = card.fields.map((f) => f.label);
    assert.deepEqual(labels, ["レアリティ", "図鑑番号", "発見日", "発見地域"]);
    assert.equal(card.fields.find((f) => f.label === "図鑑番号")!.value, "No.42");
  });

  it("進捗バーは出さない", () => {
    assert.equal(card.showsProgressBar, false);
  });
});

describe("2. レア発見カード", () => {
  it("RARE 以上は専用コピーに切り替わる", () => {
    for (const d of ["RARE", "LEGEND", "SECRET"] as const) {
      const card = buildDiscoveryCard({ subject: subject("X", d), rarityLabel: "希少形態" });
      assert.equal(card.kind, "rareDiscovery", `${d}: レア発見カードになっていない`);
      assert.equal(card.tag, "I FOUND A RARE SPECIES");
      assert.equal(card.paletteClass, d, `${d}: 配色が分類と一致しない`);
    }
  });

  it("レアは「発見条件」として物語性を出す", () => {
    const card = buildDiscoveryCard({
      subject: subject("ホワイトタイガー", "RARE"),
      conditionLabel: "北海道",
      rarityLabel: "希少形態"
    });
    assert.ok(card.fields.some((f) => f.label === "発見条件"));
    assert.ok(!card.fields.some((f) => f.label === "発見地域"), "レアで通常の見出しが使われている");
  });

  it("投稿文テンプレが分類ごとに変わる", () => {
    assert.match(shareHeadlineFor(buildDiscoveryCard({ subject: subject("A"), rarityLabel: "現生" })), /新しい生きもの/);
    assert.match(
      shareHeadlineFor(buildDiscoveryCard({ subject: subject("B", "RARE"), rarityLabel: "希少形態" })),
      /レア生物/
    );
    assert.match(
      shareHeadlineFor(buildDiscoveryCard({ subject: subject("C", "LEGEND"), rarityLabel: "絶滅生物" })),
      /絶滅/
    );
    assert.match(
      shareHeadlineFor(buildDiscoveryCard({ subject: subject("D", "SECRET"), rarityLabel: "未確認の存在" })),
      /SECRET/
    );
  });
});

describe("3. ワールド完成カード", () => {
  const card = buildWorldCompleteCard({
    worldLabel: "地上",
    representatives: [subject("ゾウ"), subject("キリン"), subject("ゴリラ"), subject("コアラ"), subject("余り")],
    totalDiscovered: 69,
    completedAt: "2026-07-20T09:00:00.000Z"
  });

  it("WORLD COMPLETE 表示と完成率100%", () => {
    assert.equal(card.kind, "worldComplete");
    assert.equal(card.tag, "WORLD COMPLETE");
    assert.equal(card.progressPercent, 100);
    assert.equal(card.fields.find((f) => f.label === "完成率")!.value, "100%");
    assert.equal(card.fields.find((f) => f.label === "発見総数")!.value, "69種");
  });

  it("代表イラストは4体まで", () => {
    assert.equal(card.subjects.length, 4, "代表が多すぎる");
  });

  it("配色は重厚な LEGEND 系", () => {
    assert.equal(card.paletteClass, "LEGEND");
  });

  it("投稿文テンプレがワールド名を含む", () => {
    assert.match(shareHeadlineFor(card), /地上/);
    assert.match(shareHeadlineFor(card), /完成/);
  });
});

describe("4. 図鑑進捗カード", () => {
  const card = buildDexProgressCard({
    discovered: 30,
    total: 69,
    percent: 43,
    recent: [subject("ゾウ"), subject("キリン", "RARE"), subject("ゴリラ"), subject("余り")]
  });

  it("My Collection Progress 表示と進捗バー", () => {
    assert.equal(card.kind, "dexProgress");
    assert.equal(card.tag, "My Collection Progress");
    assert.equal(card.showsProgressBar, true);
    assert.equal(card.progressPercent, 43);
    assert.equal(card.title, "30 / 69 種");
  });

  it("直近の新発見は3体まで", () => {
    assert.equal(card.subjects.length, 3);
    assert.match(card.fields.find((f) => f.label === "直近の発見")!.value, /ゾウ、キリン、ゴリラ/);
  });

  it("配色は直近発見の最上位分類", () => {
    assert.equal(card.paletteClass, "RARE");
  });
});

describe("5. 今日の発見カード", () => {
  it("Today's Discoveries 表示・4体まで", () => {
    const card = buildTodayCard({
      discoveries: [subject("A"), subject("B"), subject("C"), subject("D"), subject("E")],
      newCount: 5,
      percentDelta: 3,
      percent: 43
    })!;
    assert.equal(card.kind, "today");
    assert.equal(card.tag, "Today's Discoveries");
    assert.equal(card.subjects.length, 4, "5体以上並べている");
    assert.match(card.title, /今日は5種/);
    assert.match(card.fields.find((f) => f.label === "完成率")!.value, /43%（\+3）/);
  });

  it("完成率が動いていなければ増分を出さない", () => {
    const card = buildTodayCard({ discoveries: [subject("A")], newCount: 1, percentDelta: 0, percent: 43 })!;
    assert.equal(card.fields.find((f) => f.label === "完成率")!.value, "43%");
  });

  it("発見0件ならカードを作らない", () => {
    assert.equal(buildTodayCard({ discoveries: [], newCount: 0, percentDelta: 0, percent: 43 }), undefined);
  });
});

describe("6. 今週のコレクションカード", () => {
  it("連続日数と完成率を出す", () => {
    const card = buildWeeklyCard({ weeklyCount: 12, streakDays: 5, percent: 43, highlights: [subject("A")] })!;
    assert.equal(card.kind, "weekly");
    assert.match(card.title, /今週は12種/);
    assert.match(card.subtitle, /5日連続/);
    assert.equal(card.fields.find((f) => f.label === "連続発見")!.value, "5日");
  });

  it("連続1日なら連続表示を出さない", () => {
    const card = buildWeeklyCard({ weeklyCount: 3, streakDays: 1, percent: 10, highlights: [] })!;
    assert.equal(card.subtitle, "");
    assert.ok(!card.fields.some((f) => f.label === "連続発見"));
  });

  it("今週0種ならカードを作らない", () => {
    assert.equal(buildWeeklyCard({ weeklyCount: 0, streakDays: 5, percent: 43, highlights: [] }), undefined);
  });
});

describe("シェアカードのプライバシー", () => {
  it("全6種のカードに機微情報が含まれない", () => {
    const cards = [
      buildDiscoveryCard({
        subject: subject("ゾウ"),
        officialNo: "4901234567894", // バーコード相当の長い数字を渡しても
        discoveredAt: "2026-07-20T14:03:27.000Z",
        conditionLabel: "東京都",
        rarityLabel: "現生"
      }),
      buildDiscoveryCard({ subject: subject("X", "SECRET"), rarityLabel: "未確認の存在" }),
      buildWorldCompleteCard({ worldLabel: "地上", representatives: [subject("A")], totalDiscovered: 69 }),
      buildDexProgressCard({ discovered: 30, total: 69, percent: 43, recent: [subject("A")] }),
      buildTodayCard({ discoveries: [subject("A")], newCount: 1, percentDelta: 1, percent: 43 })!,
      buildWeeklyCard({ weeklyCount: 12, streakDays: 5, percent: 43, highlights: [subject("A")] })!
    ];

    for (const card of cards) {
      // 発見日時は日付までなので、秒単位の時刻は絶対に出ない。
      const dateField = card.fields.find((f) => f.label === "発見日");
      if (dateField) assert.ok(!/\d{1,2}:\d{2}/.test(dateField.value), "時刻が出ている");

      const text = [card.tag, card.title, card.subtitle, ...card.fields.map((f) => `${f.label} ${f.value}`)].join("\n");
      const leaks = findShareTextLeaks(text);
      // 図鑑番号は呼び出し側が正しい値を渡す前提。ここでは「日時・座標・ハッシュ」が出ないことを見る。
      assert.ok(
        !leaks.includes("秒単位の時刻") && !leaks.includes("緯度経度らしき座標") && !leaks.includes("ハッシュらしき16進文字列"),
        `機微情報が漏れている: ${leaks.join(",")}\n${text}`
      );
    }
  });

  it("カードは生の発見時刻を保持しない（日付へ丸めてから格納する）", () => {
    const card = buildDiscoveryCard({
      subject: subject("ゾウ"),
      discoveredAt: "2026-07-20T14:03:27.000Z",
      rarityLabel: "現生"
    });
    const serialized = JSON.stringify(card);
    assert.ok(!serialized.includes("14:03:27"), "生の時刻がカードに残っている");
    assert.ok(!serialized.includes("T14:03"), "ISO文字列がそのまま残っている");
  });
});
