import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDexPresentation,
  revealIntensityFor,
  revealHeadlineFor,
  revealTagFor,
  revealEntranceFor,
  revealDurationFor,
  revealSoundFor,
  dexProgressOf,
  dexProgressMessage,
  shouldCelebrateWorldComplete,
  completionCelebrationOf,
  pickCompletionCelebration
} from "../src/services/dexPresentation.core.ts";
import {
  buildDiscoveryShareText,
  buildWorldCompleteShareText,
  buildTodayShareText,
  buildWeeklyShareText,
  findShareTextLeaks,
  shareProgressOf,
  SHARE_HASHTAG
} from "../src/services/shareText.core.ts";
import type { DexClass } from "../src/data/characterCatalog.generated.ts";

const ALL: DexClass[] = ["NORMAL", "RARE", "LEGEND", "SECRET"];

describe("図鑑分類ごとの提示ルール", () => {
  it("4分類すべてに枠色・バッジ・見出しがある", () => {
    for (const d of ALL) {
      const p = getDexPresentation(d);
      assert.ok(p.frameColor.startsWith("#"), `${d}: 枠色が無い`);
      assert.ok(p.badgeLabel.length > 0, `${d}: バッジ文言が無い`);
      assert.ok(p.revealHeadline.length > 0, `${d}: 見出しが無い`);
    }
  });

  it("NORMAL は過剰な演出をしない（強度0・共有を強調しない）", () => {
    const p = getDexPresentation("NORMAL");
    assert.equal(p.revealIntensity, 0);
    assert.equal(p.emphasizeShare, false);
  });

  it("RARE / LEGEND / SECRET はUIで特別感を出す", () => {
    for (const d of ["RARE", "LEGEND", "SECRET"] as const) {
      const p = getDexPresentation(d);
      assert.ok(p.revealIntensity >= 2, `${d}: 演出強度が弱い`);
      assert.equal(p.emphasizeShare, true, `${d}: 共有導線が強調されていない`);
    }
  });

  it("SECRET と LEGEND が最も重い演出（共有導線の主役）", () => {
    assert.equal(getDexPresentation("SECRET").revealIntensity, 3);
    assert.equal(getDexPresentation("LEGEND").revealIntensity, 3);
    assert.ok(getDexPresentation("SECRET").revealIntensity > getDexPresentation("NORMAL").revealIntensity);
  });

  it("RARE は NORMAL と枠色・背景が異なる（通常種との差が分かる）", () => {
    const n = getDexPresentation("NORMAL");
    const r = getDexPresentation("RARE");
    assert.notEqual(n.frameColor, r.frameColor);
    assert.notEqual(n.backgroundColor, r.backgroundColor);
  });

  it("初発見は演出を1段上げ、再発見は上げない", () => {
    assert.equal(revealIntensityFor("NORMAL", true), 1);
    assert.equal(revealIntensityFor("NORMAL", false), 0);
    assert.equal(revealIntensityFor("RARE", true), 3);
    assert.equal(revealIntensityFor("RARE", false), 0, "再発見で重い演出を出さない");
    assert.equal(revealIntensityFor("SECRET", true), 3, "上限3を超えない");
  });

  it("初発見の NORMAL は専用見出しになる", () => {
    assert.equal(revealHeadlineFor("NORMAL", true), "はじめての発見！");
    assert.equal(revealHeadlineFor("NORMAL", false), "発見！");
    assert.match(revealHeadlineFor("SECRET", true), /未知/);
  });
});

describe("図鑑の完成率", () => {
  it("基本の計算", () => {
    const p = dexProgressOf(30, 69);
    assert.equal(p.discovered, 30);
    assert.equal(p.total, 69);
    assert.equal(p.percent, 43);
    assert.equal(p.remaining, 39);
    assert.equal(p.isComplete, false);
  });

  it("100% は全件発見時のみ（切り捨てで偽の100%を出さない）", () => {
    const almost = dexProgressOf(999, 1000);
    assert.equal(almost.percent, 99, "99.9% を 100% と表示してはいけない");
    assert.equal(almost.isComplete, false);

    const done = dexProgressOf(1000, 1000);
    assert.equal(done.percent, 100);
    assert.equal(done.isComplete, true);
    assert.equal(done.remaining, 0);
  });

  it("total=0 や不正値でも壊れない", () => {
    const zero = dexProgressOf(0, 0);
    assert.equal(zero.percent, 0);
    assert.equal(zero.isComplete, false, "0/0 を完成扱いにしない");
    assert.equal(dexProgressOf(-5, 10).discovered, 0);
    assert.equal(dexProgressOf(99, 10).discovered, 10, "total を超えない");
  });

  it("進捗メッセージが収集欲を押す（あと少しを明示）", () => {
    assert.match(dexProgressMessage(dexProgressOf(68, 69)), /あと1種/);
    assert.match(dexProgressMessage(dexProgressOf(67, 69)), /あと2種/);
    assert.match(dexProgressMessage(dexProgressOf(69, 69)), /完成/);
    assert.match(dexProgressMessage(dexProgressOf(0, 69)), /最初の1種/);
    assert.match(dexProgressMessage(dexProgressOf(40, 69)), /折り返し/);
  });

  it("ワールド完成演出は完成時に一度だけ", () => {
    const complete = dexProgressOf(69, 69);
    assert.equal(shouldCelebrateWorldComplete(complete, "ground", new Set()), true);
    assert.equal(shouldCelebrateWorldComplete(complete, "ground", new Set(["ground"])), false, "二重表示している");
    assert.equal(shouldCelebrateWorldComplete(dexProgressOf(68, 69), "ground", new Set()), false);
  });
});

describe("共有テキスト", () => {
  const subject = {
    name: "ゾウ",
    speciesJa: "アフリカゾウ",
    dexClass: "NORMAL" as DexClass,
    officialNo: "42",
    worldLabel: "地上",
    isFirstDiscovery: true
  };

  it("発見の共有に名前・分類・進捗・ハッシュタグが入る", () => {
    const text = buildDiscoveryShareText(subject, shareProgressOf(30, 69));
    assert.match(text, /ゾウ/);
    assert.match(text, /現生/);
    assert.match(text, /地上/);
    assert.match(text, /図鑑 30\/69（43%）/);
    assert.ok(text.endsWith(SHARE_HASHTAG));
  });

  it("レア以上は見出しが変わる", () => {
    const secret = buildDiscoveryShareText({ ...subject, dexClass: "SECRET", name: "イエティ" });
    assert.match(secret, /未知の存在との遭遇/);
    const legend = buildDiscoveryShareText({ ...subject, dexClass: "LEGEND", name: "メガロドン" });
    assert.match(legend, /失われた生きもの/);
  });

  it("再発見は初発見と文面が異なる", () => {
    const again = buildDiscoveryShareText({ ...subject, isFirstDiscovery: false });
    assert.match(again, /また会えました/);
  });

  it("ワールド完成・今日・今週の導線がある", () => {
    assert.match(buildWorldCompleteShareText("地上", 69), /地上の図鑑が完成/);
    const today = buildTodayShareText([{ name: "ゾウ", dexClass: "NORMAL" }], shareProgressOf(1, 69));
    assert.match(today!, /今日の発見（1種）/);
    const weekly = buildWeeklyShareText(12, 5, shareProgressOf(30, 69));
    assert.match(weekly!, /今週は12種/);
    assert.match(weekly!, /5日連続/);
  });

  it("発見0件なら共有導線を出さない（undefined）", () => {
    assert.equal(buildTodayShareText([], shareProgressOf(0, 69)), undefined);
    assert.equal(buildWeeklyShareText(0, 3), undefined);
  });

  it("今日の発見が多いときは5件までに省略する", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `種${i}`, dexClass: "NORMAL" as DexClass }));
    const text = buildTodayShareText(many)!;
    assert.match(text, /今日の発見（9種）/);
    assert.match(text, /ほか4種/);
    assert.equal(text.split("\n").filter((l) => l.startsWith("・")).length, 5);
  });
});

describe("共有テキストのプライバシー", () => {
  it("バーコード値・ハッシュ・座標・秒時刻を検出できる", () => {
    assert.deepEqual(findShareTextLeaks("ゾウ #WORLDAWN"), []);
    assert.ok(findShareTextLeaks("code 4901234567894").length > 0, "バーコード値を検出できない");
    assert.ok(findShareTextLeaks("hash 9f86d081884c7d65").length > 0, "ハッシュを検出できない");
    assert.ok(findShareTextLeaks("35.68944, 139.69167").length > 0, "座標を検出できない");
    assert.ok(findShareTextLeaks("14:03:27 に発見").length > 0, "秒時刻を検出できない");
  });

  it("生成される全ての共有文面に機微情報が含まれない", () => {
    const texts = [
      buildDiscoveryShareText({ ...{ name: "ゾウ", dexClass: "NORMAL" as DexClass, isFirstDiscovery: true }, officialNo: "777", worldLabel: "地上" }, shareProgressOf(30, 69)),
      buildWorldCompleteShareText("地上", 69),
      buildTodayShareText([{ name: "ゾウ", dexClass: "RARE" }], shareProgressOf(5, 69))!,
      buildWeeklyShareText(12, 5, shareProgressOf(30, 69))!
    ];
    for (const t of texts) {
      assert.deepEqual(findShareTextLeaks(t), [], `機微情報が漏れている:\n${t}`);
    }
  });

  it("公式番号が長くてもバーコードと誤検出されない範囲で扱える", () => {
    // 公式番号は 7 桁までを想定。8 桁以上はバーコード値と区別できないため共有しない。
    const t = buildDiscoveryShareText({ name: "ゾウ", dexClass: "NORMAL", isFirstDiscovery: true, officialNo: "1000000" });
    assert.deepEqual(findShareTextLeaks(t), []);
  });
});

describe("テーマとの同期", () => {
  it("提示ルールが使う色が src/theme.ts の値と一致している（ドリフト検出）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const theme = fs.readFileSync(path.join(root, "src", "theme.ts"), "utf8");

    // dexPresentation.core.ts は純粋モジュールのため theme を実行時 import しない。
    // 値がずれたまま放置されないよう、ここで実ファイルと突き合わせる。
    const expected: Record<string, string> = {
      border: "#E2E8F0",
      surface: "#FFFFFF",
      surfaceMuted: "#F8FAFC",
      textSlate: "#52627A",
      ink: "#0F172A",
      borderFaint: "#EEF2F7",
      rareSilver: "#C7CDD6",
      rareSilverSoft: "#F3F5F8",
      rareIridescent: "#AFC6E9",
      rareInk: "#41506B",
      legendBronze: "#9C6B3F",
      legendDarkGold: "#B08542",
      legendAmber: "#D9A05B",
      legendDeep: "#2B1E12",
      legendSoft: "#F6EFE4",
      secretPurple: "#3B2A5A",
      secretNavy: "#111B34",
      secretTeal: "#1F4A4A",
      secretBlackGold: "#C9A14A",
      secretSoft: "#EDEAF3"
    };
    for (const [token, hex] of Object.entries(expected)) {
      const m = new RegExp(`\\b${token}:\\s*"(#[0-9A-Fa-f]{6})"`).exec(theme);
      assert.ok(m, `theme.ts に ${token} が無い`);
      assert.equal(m![1], hex, `theme.ts の ${token} が変更された（dexPresentation.core.ts も更新すること）`);
    }
  });

  it("4分類の枠色がすべて異なる系統（一覧で見分けられる）", () => {
    const frames = ALL.map((d) => getDexPresentation(d).frameColor);
    assert.equal(new Set(frames).size >= 3, true, "枠色が同じすぎて分類を見分けられない");
  });
});

describe("純粋モジュール間のラベル同期", () => {
  it("共有文面のラベル・見出しが提示ルールと一致している（ドリフト検出）", () => {
    // shareText.core と dexPresentation.core は実行時 import を避けるため値を各自持つ。
    // ずれると共有文面と画面表示で表記が食い違うため、ここで突き合わせる。
    for (const d of ALL) {
      const p = getDexPresentation(d);
      const shared = buildDiscoveryShareText({ name: "X", dexClass: d, isFirstDiscovery: true });
      assert.ok(shared.includes(p.revealHeadline), `${d}: 見出しが提示ルールと違う`);
      assert.ok(shared.includes(p.badgeLabel), `${d}: 分類ラベルが提示ルールと違う`);
    }
  });

  it("進捗計算が両モジュールで一致している", () => {
    for (const [d, t] of [[0, 0], [1, 3], [30, 69], [999, 1000], [69, 69]] as const) {
      assert.deepEqual(shareProgressOf(d, t), dexProgressOf(d, t), `${d}/${t} で計算がずれている`);
    }
  });
});

describe("レア演出仕様", () => {
  it("一覧の英字ラベルは NORMAL だけ出さない", () => {
    assert.equal(getDexPresentation("NORMAL").rarityTag, undefined, "NORMAL に英字ラベルを出している");
    assert.equal(getDexPresentation("RARE").rarityTag, "RARE");
    assert.equal(getDexPresentation("LEGEND").rarityTag, "LEGEND");
    assert.equal(getDexPresentation("SECRET").rarityTag, "SECRET");
  });

  it("subtle glow は RARE 以上のみ", () => {
    assert.equal(getDexPresentation("NORMAL").hasInnerGlow, false);
    for (const d of ["RARE", "LEGEND", "SECRET"] as const) {
      assert.equal(getDexPresentation(d).hasInnerGlow, true, `${d}: glow が無い`);
      assert.notEqual(getDexPresentation(d).glowColor, "transparent");
    }
  });

  it("格上ほど枠が太い（一覧で格の違いが読める）", () => {
    const w = ALL.map((d) => getDexPresentation(d).frameWidth);
    assert.ok(w[0]! < w[1]!, "NORMAL より RARE が太くない");
    assert.ok(w[1]! <= w[2]!, "RARE より LEGEND が細い");
    assert.ok(w[1]! <= w[3]!, "RARE より SECRET が細い");
  });

  it("発見演出の入り方が仕様どおり", () => {
    assert.equal(revealEntranceFor("NORMAL", true), "fade");
    assert.equal(revealEntranceFor("RARE", true), "glow");
    assert.equal(revealEntranceFor("LEGEND", true), "dim_then_rise");
    assert.equal(revealEntranceFor("SECRET", true), "silhouette_then_reveal");
  });

  it("再発見は常に短いフェード（重い演出を繰り返さない）", () => {
    for (const d of ALL) {
      assert.equal(revealEntranceFor(d, false), "fade", `${d}: 再発見で重い演出が出る`);
      assert.equal(revealDurationFor(d, false), 600, `${d}: 再発見の演出が長い`);
      assert.equal(revealSoundFor(d, false), "rediscovery", `${d}: 再発見で発見音が鳴る`);
      assert.equal(revealTagFor(d, false), undefined, `${d}: 再発見で英字ラベルが出る`);
    }
  });

  it("英字ラベルは初発見のときだけ出る", () => {
    assert.equal(revealTagFor("SECRET", true), "SECRET DISCOVERED");
    assert.equal(revealTagFor("LEGEND", true), "LEGEND DISCOVERED");
    assert.equal(revealTagFor("RARE", true), "RARE DISCOVERED");
    assert.equal(revealTagFor("NORMAL", true), undefined, "NORMAL に英字ラベルを出している");
  });

  it("演出長は格上ほど長い", () => {
    const d = ALL.map((c) => revealDurationFor(c, true));
    assert.ok(d[0]! < d[1]! && d[1]! < d[2]! && d[2]! < d[3]!, `演出長が単調増加でない: ${d.join(",")}`);
  });

  it("分類ごとに専用 SE が割り当てられている", () => {
    assert.equal(revealSoundFor("NORMAL", true), "discovery_normal");
    assert.equal(revealSoundFor("RARE", true), "discovery_rare");
    assert.equal(revealSoundFor("LEGEND", true), "discovery_legend");
    assert.equal(revealSoundFor("SECRET", true), "discovery_secret");
  });

  it("発見日時・図鑑番号を目立たせるのは LEGEND 以上", () => {
    assert.equal(getDexPresentation("NORMAL").emphasizeRecordMeta, false);
    assert.equal(getDexPresentation("RARE").emphasizeRecordMeta, false);
    assert.equal(getDexPresentation("LEGEND").emphasizeRecordMeta, true);
    assert.equal(getDexPresentation("SECRET").emphasizeRecordMeta, true);
  });

  it("共有導線の優先度は SECRET が最優先", () => {
    const p = ALL.map((d) => getDexPresentation(d).sharePriority);
    assert.deepEqual(p, [0, 1, 2, 3], "共有優先度が仕様どおりでない");
  });

  it("詳細ヘッダの色が分類ごとに異なる（本文色は変えない）", () => {
    const headers = ALL.map((d) => getDexPresentation(d).headerBackgroundColor);
    assert.equal(new Set(headers).size, 4, "詳細ヘッダが分類ごとに区別されていない");
  });

  it("LEGEND は古代図鑑系、SECRET は伝承系の色調", () => {
    // 仕様：LEGEND=ブロンズ/ダークゴールド/アンバー、SECRET=深い紫/濃紺/青緑/黒金
    assert.equal(getDexPresentation("LEGEND").frameColor, "#B08542");
    assert.equal(getDexPresentation("LEGEND").glowColor, "#D9A05B");
    assert.equal(getDexPresentation("SECRET").frameColor, "#C9A14A");
    assert.equal(getDexPresentation("SECRET").glowColor, "#3B2A5A");
    assert.notEqual(getDexPresentation("LEGEND").frameColor, getDexPresentation("SECRET").frameColor);
  });

  it("RARE はシルバー〜淡い虹彩（金系にしない）", () => {
    assert.equal(getDexPresentation("RARE").frameColor, "#C7CDD6");
    assert.equal(getDexPresentation("RARE").glowColor, "#AFC6E9");
  });
});

describe("完成演出", () => {
  it("ワールド完成は代表生物の記念カードを出す", () => {
    const c = completionCelebrationOf("world", "地上");
    assert.match(c.title, /地上/);
    assert.equal(c.showsRepresentativeGallery, true, "代表生物を並べる指定が無い");
    assert.equal(c.offersShare, true);
    assert.equal(c.sound, "dex_complete");
  });

  it("完成演出はどれも通常の発見より大きい（強度3）", () => {
    for (const k of ["world", "dexClass", "firstComplete", "full"] as const) {
      const c = completionCelebrationOf(k, "地上");
      assert.equal(c.intensity, 3, `${k}: 完成演出が通常発見より小さい`);
    }
  });

  it("同時成立時は大きい方を1つだけ選ぶ", () => {
    const base = {
      worldComplete: true,
      worldLabel: "地上",
      dexClassComplete: true,
      dexClassLabel: "希少形態",
      isFirstEverComplete: false,
      fullDexComplete: false
    };
    assert.equal(pickCompletionCelebration({ ...base, fullDexComplete: true })!.kind, "full");
    assert.equal(pickCompletionCelebration({ ...base, isFirstEverComplete: true })!.kind, "firstComplete");
    assert.equal(pickCompletionCelebration(base)!.kind, "dexClass", "分類完成がワールド完成より優先されていない");
    assert.equal(pickCompletionCelebration({ ...base, dexClassComplete: false })!.kind, "world");
  });

  it("何も完成していなければ演出を出さない", () => {
    assert.equal(
      pickCompletionCelebration({
        worldComplete: false,
        worldLabel: "地上",
        dexClassComplete: false,
        dexClassLabel: "",
        isFirstEverComplete: false,
        fullDexComplete: false
      }),
      undefined
    );
  });

  it("図鑑100%達成は専用文言", () => {
    const c = completionCelebrationOf("full", "");
    assert.match(c.title, /100/);
    assert.equal(c.showsRepresentativeGallery, true);
  });
});
