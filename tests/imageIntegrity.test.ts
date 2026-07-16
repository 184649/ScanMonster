import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Phase 0.5：画像健全性の回帰テスト。
 * 破損PNG（IEND欠損＝末尾切断）は release gate で検出し、リリースを止める。
 * サムネイル拡大や manifest 手動追加では検証を通過できないことも固定する。
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const imgSrc = fs.readFileSync(path.join(root, "src", "assets", "characterImages.generated.ts"), "utf8");

const section = (name: string) => {
  const i = imgSrc.indexOf(`export const ${name}`);
  return imgSrc.slice(i, imgSrc.indexOf("};", i));
};
const keysOf = (name: string) => [...section(name).matchAll(/"([^"]+)":\s*require/g)].map((m) => m[1]!);
const pathsOf = (name: string) =>
  [...section(name).matchAll(/"([^"]+)":\s*require\("\.\.\/\.\.\/([^"]+)"\)/g)].map((m) => ({ id: m[1]!, rel: m[2]! }));

/** PNG が IEND を持つか（末尾切断の検出）。 */
const hasIend = (abs: string) => fs.readFileSync(abs).includes(Buffer.from("IEND", "ascii"));

describe("画像 manifest の整合", () => {
  it("原画 manifest のキーは重複しない", () => {
    const k = keysOf("CHARACTER_IMAGES");
    assert.equal(k.length, new Set(k).size);
  });

  it("原画 manifest の全ファイルが実在する", () => {
    for (const { id, rel } of pathsOf("CHARACTER_IMAGES")) {
      assert.ok(fs.existsSync(path.join(root, rel)), `${id} の原画が存在しない: ${rel}`);
    }
  });

  it("サムネイル manifest の全ファイルが実在する", () => {
    for (const { id, rel } of pathsOf("CHARACTER_THUMBS")) {
      assert.ok(fs.existsSync(path.join(root, rel)), `${id} のサムネが存在しない: ${rel}`);
    }
  });
});

describe("release gate による破損PNG検出", () => {
  it("破損原画（IEND欠損）が1件でもあると validate:release-assets が非0終了する", () => {
    const corrupt = pathsOf("CHARACTER_IMAGES").filter((e) => !hasIend(path.join(root, e.rel)));
    const res = spawnSync(process.execPath, [path.join(root, "scripts", "validateReleaseAssets.js")], {
      cwd: root,
      encoding: "utf8"
    });
    if (corrupt.length > 0) {
      assert.notEqual(res.status, 0, "破損原画があるのに release gate が成功している");
      assert.match(res.stdout + res.stderr, /corrupt/i);
      for (const c of corrupt) assert.match(res.stdout + res.stderr, new RegExp(c.id));
    } else {
      assert.equal(res.status, 0, `破損が無いのに失敗: ${res.stdout}${res.stderr}`);
    }
  });

  it("原画とサムネイルのキー集合不一致を検出できる（現状は ground_sheep が破損のため不一致）", () => {
    const imgs = new Set(keysOf("CHARACTER_IMAGES"));
    const thumbs = new Set(keysOf("CHARACTER_THUMBS"));
    const onlyImg = [...imgs].filter((k) => !thumbs.has(k));
    const onlyThumb = [...thumbs].filter((k) => !imgs.has(k));
    const corrupt = pathsOf("CHARACTER_IMAGES").filter((e) => !hasIend(path.join(root, e.rel))).map((e) => e.id);
    // サムネが無いキーは「原画が破損してサムネ生成できなかったもの」と一致するはず。
    assert.deepEqual(onlyThumb, [], "原画に無いサムネがある");
    assert.deepEqual([...onlyImg].sort(), [...corrupt].sort(), "サムネ欠落と破損原画が一致しない（別要因の欠落）");
  });

  it("原画が全て健全になった場合にのみ 89/89 でキー集合が一致する", () => {
    const imgs = keysOf("CHARACTER_IMAGES");
    const thumbs = keysOf("CHARACTER_THUMBS");
    const corrupt = pathsOf("CHARACTER_IMAGES").filter((e) => !hasIend(path.join(root, e.rel)));
    if (corrupt.length === 0) {
      assert.equal(imgs.length, 89);
      assert.equal(thumbs.length, 89);
      assert.deepEqual([...imgs].sort(), [...thumbs].sort());
    } else {
      // 破損がある間は不一致が正（サムネを拡大・手動追加して埋めてはいけない）。
      assert.equal(imgs.length, 89, "原画は89件であるべき");
      assert.equal(thumbs.length, 89 - corrupt.length, "破損件数ぶんサムネが欠落しているはず");
    }
  });
});

describe("復元してはいけない方法の固定", () => {
  it("サムネイル(256x256)を原画として採用していない", () => {
    // 実測：原画は 1024x1024 が基本だが、sky の一部は 512x512 で制作されている（破損ではない）。
    // ここで固定したいのは「サムネ(256)を拡大して原画に流用していないこと」。
    for (const { id, rel } of pathsOf("CHARACTER_IMAGES")) {
      const b = fs.readFileSync(path.join(root, rel));
      if (b.toString("ascii", 12, 16) !== "IHDR") continue;
      const w = b.readUInt32BE(16);
      const h = b.readUInt32BE(20);
      assert.ok(w >= 512 && h >= 512, `${id} の原画が ${w}x${h}（サムネ拡大の疑い）`);
      assert.ok(!(w === 256 && h === 256), `${id} がサムネ寸法(256x256)のまま原画になっている`);
    }
  });

  it("Sheep の原画は破損したままで、別画像・サムネ拡大へ置き換えられていない", () => {
    const sheep = pathsOf("CHARACTER_IMAGES").find((e) => e.id === "ground_sheep");
    assert.ok(sheep, "ground_sheep が原画 manifest に無い");
    const abs = path.join(root, sheep!.rel);
    const b = fs.readFileSync(abs);
    // 正常な同一原画が Git 履歴にも存在しないため、復元せず破損のまま維持する（release gate が赤で止める）。
    assert.equal(b.slice(0, 8).toString("hex"), "89504e470d0a1a0a", "PNG シグネチャが壊れている");
    assert.equal(b.readUInt32BE(16), 1024);
    assert.equal(b.readUInt32BE(20), 1024);
    assert.ok(!hasIend(abs), "破損が解消された場合はこのテストと release gate の期待値を更新すること");
  });

  it("manifest へ手動追加しても破損原画は release gate を通過できない", () => {
    // release gate は manifest の require パスから実ファイルを読み、IEND を検査する。
    // したがって manifest にキーを足すだけでは通過しない（＝手動追加は無意味）。
    const validator = fs.readFileSync(path.join(root, "scripts", "validateReleaseAssets.js"), "utf8");
    assert.match(validator, /IEND/, "release gate が PNG 健全性を検査していない");
    assert.match(validator, /isCompletePng/, "release gate に健全性検査関数が無い");
  });
});
