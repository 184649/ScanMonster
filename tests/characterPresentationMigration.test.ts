import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { selectCharacterDisplayName } from "../src/services/characterPresentation.core.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), "utf8");

const sourceFiles = (relativeDirectory: string): string[] => {
  const directory = path.join(root, relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relativePath);
    return /\.tsx?$/.test(entry.name) ? [relativePath] : [];
  });
};

describe("Phase 3B character presentation migration", () => {
  it("表示名はresolver値、保存値、characterIdの順で安定してfallbackする", () => {
    assert.equal(
      selectCharacterDisplayName({
        characterId: "ground_hamster",
        resolvedDisplayName: "現在名",
        storedDisplayName: "保存名"
      }),
      "現在名"
    );
    assert.equal(
      selectCharacterDisplayName({ characterId: "unknown_character", storedDisplayName: "保存名" }),
      "保存名"
    );
    assert.equal(selectCharacterDisplayName({ characterId: "unknown_character" }), "unknown_character");
    assert.equal(selectCharacterDisplayName({}), "キャラクター");
  });

  it("Homeは名前と画像を共通経路へ接続し、先頭6件・順序・遷移IDを変えない", () => {
    const source = read("src/screens/HomeScreen.tsx");
    assert.match(source, /const recentMonsters = monsters\.slice\(0, 6\);/);
    assert.doesNotMatch(source, /recentMonsters\.(?:filter|sort|reverse)\(/);
    assert.match(source, /resolveUserMonsterDisplayName\(monster\)/);
    assert.match(source, /<MonsterAvatar monster=\{monster\} size=\{88\}/);
    assert.match(source, /navigate\("MonsterDetail", \{ monsterId: monster\.id \}\)/);
    assert.match(source, /accessibilityLabel=\{`\$\{displayName\}の詳細を開く`\}/);
  });

  it("ShareCardは現在名と共通画像fallbackを使い、共有導線と番号表示を保持する", () => {
    const card = read("src/components/ShareCard.tsx");
    const result = read("src/screens/SummonResultScreen.tsx");
    assert.match(card, /resolveUserMonsterDisplayName\(monster\)/);
    assert.match(card, /<MonsterAvatar monster=\{monster\}/);
    assert.match(card, /accessibilityLabel=\{`\$\{displayName\}の共有カード。\$\{displayName\}のキャラクター画像/);
    assert.match(result, /<ShareCard[\s\S]*monster=\{monster\}/);
    assert.match(result, /formatDiscoveryNo\(record\.characterDiscoveryNo\)/);
    assert.match(result, /Share\.share\(\{ message: lines\.join\("\\n"\) \}\)/);
  });

  it("UI用UserMonster名はresolverへ集約し、永続displayNameと履歴名は削除しない", () => {
    const uiPaths = [...sourceFiles("src/screens"), ...sourceFiles("src/components"), "src/utils/formStage.ts"];
    const directUserMonsterNames = uiPaths.filter((relativePath) => /\bmonster\??\.displayName\b/.test(read(relativePath)));
    assert.deepEqual(directUserMonsterNames, []);
    assert.match(read("src/types/monster.ts"), /export type UserMonster = \{[\s\S]*?displayName: string;/);
    assert.match(read("src/types/discoveryRecord.ts"), /characterName: string;/);
    assert.match(read("src/services/storageService.ts"), /saveMonster\(monster: UserMonster\)/);
    assert.match(read("src/stores/monsterStore.ts"), /characterName: monster\.displayName/);
  });

  it("production UIはgenerated画像manifestを直接importしない", () => {
    const uiPaths = [...sourceFiles("src/screens"), ...sourceFiles("src/components")];
    const directManifestImports = uiPaths.filter((relativePath) => /characterImages\.generated/.test(read(relativePath)));
    assert.deepEqual(directManifestImports, []);
    const reveal = read("src/components/discovery/AwakeningReveal.tsx");
    assert.match(reveal, /<MonsterAvatar/);
    assert.doesNotMatch(reveal, /getCharacterImage|getCharacterThumb|getMonsterImageSource/);
  });

  it("発見・同期・抽選・採番・serverはpresentation resolverへ依存しない", () => {
    const domainPaths = [
      "src/stores/monsterStore.ts",
      "src/stores/authStore.ts",
      "src/services/monsterGenerator.ts",
      "src/services/worldSpawn.ts",
      "src/services/discoveryRecordService.ts",
      "src/services/numberValue.core.ts",
      ...sourceFiles("server/src")
    ];
    const violations = domainPaths.filter((relativePath) => /characterPresentationResolver/.test(read(relativePath)));
    assert.deepEqual(violations, []);
  });

  it("設定画面とproduction default modeはPhase 3Aのまま", () => {
    assert.match(
      read("src/config/characterPresentation.ts"),
      /DEFAULT_CHARACTER_PRESENTATION_MODE: PresentationMode = "character"/
    );
    assert.doesNotMatch(read("src/screens/SettingsScreen.tsx"), /PresentationMode|characterPresentation/);
  });
});
