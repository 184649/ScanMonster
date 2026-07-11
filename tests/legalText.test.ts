import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LEGAL_BODY, PRIVACY_POLICY, TERMS_OF_SERVICE } from "../src/data/legalText.ts";

describe("利用規約（Phase 7）", () => {
  it("必須条項を含む", () => {
    for (const kw of ["禁止事項", "number farming", "複数アカウント", "フレンドQR", "公式発見番号", "金銭的価値", "準拠法", "改定", "お問い合わせ"]) {
      assert.ok(TERMS_OF_SERVICE.includes(kw), `missing: ${kw}`);
    }
  });
  it("虚偽の法的保証表現を含まない", () => {
    assert.ok(!TERMS_OF_SERVICE.includes("弁護士確認済み"));
    assert.ok(!TERMS_OF_SERVICE.includes("法的保証済み"));
  });
});

describe("プライバシーポリシー（Phase 8）", () => {
  it("実装に基づく収集/非収集を明記", () => {
    for (const kw of ["sourceHash", "都道府県", "SecureStore", "ハッシュ", "利用目的", "保存期間", "第三者提供", "データ削除", "未成年"]) {
      assert.ok(PRIVACY_POLICY.includes(kw), `missing: ${kw}`);
    }
  });
  it("非収集（生コード/商品名/正確な位置/移動履歴/平文パスワード）を明記", () => {
    for (const kw of ["生の内容", "商品名", "正確な住所", "移動履歴", "平文"]) {
      assert.ok(PRIVACY_POLICY.includes(kw), `missing: ${kw}`);
    }
  });
  it("虚偽の法的保証表現を含まない", () => {
    assert.ok(!PRIVACY_POLICY.includes("弁護士確認済み"));
    assert.ok(!PRIVACY_POLICY.includes("法的保証済み"));
  });
});

describe("LEGAL_BODY", () => {
  it("terms/privacy を引ける", () => {
    assert.equal(LEGAL_BODY.terms, TERMS_OF_SERVICE);
    assert.equal(LEGAL_BODY.privacy, PRIVACY_POLICY);
  });
});
