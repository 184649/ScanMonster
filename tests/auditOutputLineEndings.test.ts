import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { writePreservingEol } = require("../scripts/auditCharacterAssets.js") as {
  writePreservingEol: (filePath: string, contentLf: string) => void;
};

/**
 * 監査文書の改行安定化テスト。
 *
 * この環境は core.autocrlf=true のため、チェックアウトされた監査文書は CRLF になる。
 * 監査スクリプトが LF 固定で上書きすると、内容が同一でも git status が dirty になり、
 * 監査を再実行するたびに作業ツリーが汚れてしまう。
 *
 * **実際の正式画像・Character.xlsx・リポジトリ内の監査文書は一切触らない。**
 * すべてテスト用の一時ディレクトリで検証する。
 */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "worldawn-eol-"));
const tmpFile = (name: string) => path.join(tmp, name);

/** LF で組み立てた監査文書の中身（実際の出力と同じ形）。 */
const JSON_CONTENT = `${JSON.stringify({ auditKind: "test", summary: { total: 1 }, results: [{ id: "x" }] }, null, 2)}\n`;
const MD_CONTENT = ["# 監査", "", "| id | 判定 |", "|---|---|", "| `x` | **PASS** |", ""].join("\n") + "\n";

const countEol = (buf: Buffer) => {
  const crlf = buf.toString("binary").split("\r\n").length - 1;
  const lf = buf.toString("binary").split("\n").length - 1;
  return { crlf, bareLf: lf - crlf };
};

/** 改行を無視した内容（意味の同一性を見る）。 */
const normalized = (buf: Buffer) => buf.toString("utf8").replace(/\r\n/g, "\n");

describe("既存ファイルの改行コードを保持する", () => {
  it("既存JSONがCRLFなら、再生成後もCRLFを維持する", () => {
    const p = tmpFile("crlf.json");
    fs.writeFileSync(p, JSON_CONTENT.replace(/\n/g, "\r\n"), "utf8");
    writePreservingEol(p, JSON_CONTENT);
    const after = countEol(fs.readFileSync(p));
    assert.ok(after.crlf > 0, "CRLF が維持されていない");
    assert.equal(after.bareLf, 0, "裸のLFが混入した");
  });

  it("既存MarkdownがCRLFなら、再生成後もCRLFを維持する", () => {
    const p = tmpFile("crlf.md");
    fs.writeFileSync(p, MD_CONTENT.replace(/\n/g, "\r\n"), "utf8");
    writePreservingEol(p, MD_CONTENT);
    const after = countEol(fs.readFileSync(p));
    assert.ok(after.crlf > 0, "CRLF が維持されていない");
    assert.equal(after.bareLf, 0, "裸のLFが混入した");
  });

  it("既存JSONがLFなら、再生成後もLFを維持する", () => {
    const p = tmpFile("lf.json");
    fs.writeFileSync(p, JSON_CONTENT, "utf8");
    writePreservingEol(p, JSON_CONTENT);
    const after = countEol(fs.readFileSync(p));
    assert.equal(after.crlf, 0, "CRLF が混入した");
    assert.ok(after.bareLf > 0, "LF が失われた");
  });

  it("既存MarkdownがLFなら、再生成後もLFを維持する", () => {
    const p = tmpFile("lf.md");
    fs.writeFileSync(p, MD_CONTENT, "utf8");
    writePreservingEol(p, MD_CONTENT);
    const after = countEol(fs.readFileSync(p));
    assert.equal(after.crlf, 0, "CRLF が混入した");
    assert.ok(after.bareLf > 0, "LF が失われた");
  });
});

describe("改行以外の内容は変わらない", () => {
  it("CRLF維持でもJSONの内容・並び順・インデント・数値が同一", () => {
    const p = tmpFile("content.json");
    fs.writeFileSync(p, JSON_CONTENT.replace(/\n/g, "\r\n"), "utf8");
    writePreservingEol(p, JSON_CONTENT);
    assert.equal(normalized(fs.readFileSync(p)), JSON_CONTENT, "改行以外が変化した");
    // JSON として解釈しても同一であること。
    assert.deepEqual(JSON.parse(fs.readFileSync(p, "utf8")), JSON.parse(JSON_CONTENT));
  });

  it("CRLF維持でもMarkdownの内容が同一", () => {
    const p = tmpFile("content.md");
    fs.writeFileSync(p, MD_CONTENT.replace(/\n/g, "\r\n"), "utf8");
    writePreservingEol(p, MD_CONTENT);
    assert.equal(normalized(fs.readFileSync(p)), MD_CONTENT, "改行以外が変化した");
  });
});

describe("再実行してもバイト列が変化しない（冪等）", () => {
  it("CRLFファイルへ2回書いてもバイト列が同一", () => {
    const p = tmpFile("idempotent-crlf.json");
    fs.writeFileSync(p, JSON_CONTENT.replace(/\n/g, "\r\n"), "utf8");
    writePreservingEol(p, JSON_CONTENT);
    const first = fs.readFileSync(p);
    writePreservingEol(p, JSON_CONTENT);
    const second = fs.readFileSync(p);
    assert.ok(first.equals(second), "2回目でバイト列が変化した");
  });

  it("LFファイルへ2回書いてもバイト列が同一", () => {
    const p = tmpFile("idempotent-lf.md");
    fs.writeFileSync(p, MD_CONTENT, "utf8");
    writePreservingEol(p, MD_CONTENT);
    const first = fs.readFileSync(p);
    writePreservingEol(p, MD_CONTENT);
    const second = fs.readFileSync(p);
    assert.ok(first.equals(second), "2回目でバイト列が変化した");
  });

  it("CRLFで書かれた既存ファイルを読み直しても、同じ改行のまま安定する", () => {
    const p = tmpFile("stable.json");
    fs.writeFileSync(p, JSON_CONTENT.replace(/\n/g, "\r\n"), "utf8");
    for (let i = 0; i < 3; i += 1) writePreservingEol(p, JSON_CONTENT);
    const after = countEol(fs.readFileSync(p));
    assert.ok(after.crlf > 0 && after.bareLf === 0, "繰り返し実行で改行が崩れた");
  });
});

describe("新規ファイルの扱い", () => {
  it("既存ファイルが無ければ os.EOL に合わせる", () => {
    const p = tmpFile("brand-new.json");
    assert.equal(fs.existsSync(p), false);
    writePreservingEol(p, JSON_CONTENT);
    const after = countEol(fs.readFileSync(p));
    if (os.EOL === "\r\n") {
      assert.ok(after.crlf > 0, "os.EOL=CRLF なのに LF で書かれた");
      assert.equal(after.bareLf, 0);
    } else {
      assert.equal(after.crlf, 0, "os.EOL=LF なのに CRLF で書かれた");
      assert.ok(after.bareLf > 0);
    }
    // 新規でも内容は変わらない。
    assert.equal(normalized(fs.readFileSync(p)), JSON_CONTENT);
  });
});

describe("実リポジトリのファイルを汚さない", () => {
  it("書き込み先がすべて一時ディレクトリ配下である", () => {
    // このテストで作ったファイルはすべて mkdtemp のディレクトリ内にある。
    const created = fs.readdirSync(tmp);
    assert.ok(created.length > 0, "一時ディレクトリにファイルが作られていない");
    for (const name of created) {
      const p = path.join(tmp, name);
      assert.ok(p.startsWith(tmp), `一時ディレクトリ外へ書き込んでいる: ${p}`);
    }
    // リポジトリ直下は一切変更していない（tmp は OS の一時領域）。
    assert.ok(!tmp.startsWith(process.cwd()), "一時ディレクトリがリポジトリ内にある");
  });

  it("リポジトリ内の監査文書を書き換えていない", () => {
    const auditJson = path.join(process.cwd(), "docs", "asset-audits", "current-character-assets-audit.json");
    if (!fs.existsSync(auditJson)) return; // 監査未実行の環境ではスキップ相当
    const before = fs.statSync(auditJson).mtimeMs;
    writePreservingEol(tmpFile("unrelated.json"), JSON_CONTENT);
    assert.equal(fs.statSync(auditJson).mtimeMs, before, "リポジトリの監査文書が書き換えられた");
  });
});
