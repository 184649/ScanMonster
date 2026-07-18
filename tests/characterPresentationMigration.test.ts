import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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

const isUserMonsterType = (type: ts.Type): boolean => {
  if (type.isUnionOrIntersection()) return type.types.some(isUserMonsterType);
  return (type.aliasSymbol ?? type.getSymbol())?.getName() === "UserMonster";
};

const directUserMonsterDisplayNameAccesses = (relativePaths: readonly string[]): string[] => {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
  assert.ok(configPath, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined, "tsconfig.json should be readable");
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const targetPaths = new Set(relativePaths.map((relativePath) => path.resolve(root, relativePath)));
  const violations: string[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (!targetPaths.has(path.resolve(sourceFile.fileName))) continue;
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.text === "displayName" &&
        isUserMonsterType(checker.getTypeAtLocation(node.expression))
      ) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        violations.push(`${path.relative(root, sourceFile.fileName)}:${line}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return violations;
};

describe("Phase 3B character presentation migration", () => {
  it("表示名はresolver値、保存値、characterIdの順で安定してfallbackする", () => {
    assert.equal(
      selectCharacterDisplayName({
        nickname: "愛称",
        characterId: "ground_hamster",
        resolvedDisplayName: "現在名",
        storedDisplayName: "保存名"
      }),
      "愛称"
    );
    assert.equal(
      selectCharacterDisplayName({ nickname: "  ", resolvedDisplayName: "現在名", storedDisplayName: "保存名" }),
      "現在名"
    );
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
    assert.match(source, /resolveUserMonsterDisplayNameWithNickname\(monster\)/);
    assert.match(source, /<MonsterAvatar monster=\{monster\} size=\{88\}/);
    assert.match(source, /navigate\("MonsterDetail", \{ monsterId: monster\.id \}\)/);
    assert.match(source, /accessibilityLabel=\{`\$\{displayName\}の詳細を開く`\}/);
  });

  it("ShareCardは現在名と共通画像fallbackを使い、共有導線と番号表示を保持する", () => {
    const card = read("src/components/ShareCard.tsx");
    const result = read("src/screens/SummonResultScreen.tsx");
    assert.match(card, /resolveUserMonsterDisplayNameWithNickname\(monster\)/);
    assert.match(card, /<MonsterAvatar monster=\{monster\}/);
    assert.match(card, /accessibilityLabel=\{`\$\{displayName\}の共有カード。\$\{displayName\}のキャラクター画像/);
    assert.match(result, /<ShareCard[\s\S]*monster=\{monster\}/);
    assert.match(result, /formatDiscoveryNo\(record\.characterDiscoveryNo\)/);
    assert.match(result, /Share\.share\(\{ message: lines\.join\("\\n"\) \}\)/);
  });

  it("UI用UserMonster名はresolverへ集約し、永続displayNameと履歴名は削除しない", () => {
    const uiPaths = [...sourceFiles("src/screens"), ...sourceFiles("src/components"), "src/utils/formStage.ts"];
    const directUserMonsterNames = directUserMonsterDisplayNameAccesses(uiPaths);
    assert.deepEqual(directUserMonsterNames, []);
    assert.match(read("src/types/monster.ts"), /export type UserMonster = \{[\s\S]*?displayName: string;/);
    assert.match(read("src/types/discoveryRecord.ts"), /characterName: string;/);
    assert.match(read("src/services/storageService.ts"), /saveMonster\(monster: UserMonster\)/);
    assert.match(read("src/stores/monsterStore.ts"), /characterName: monster\.displayName/);
  });

  it("production UIはgenerated画像manifestを直接importしない", () => {
    const directManifestImports = sourceFiles("src").filter((relativePath) =>
      /from\s+["'][^"']*characterImages\.generated["']/.test(read(relativePath))
    );
    assert.deepEqual(directManifestImports, ["src/services/characterPresentationResolver.ts"]);
    const reveal = read("src/components/discovery/AwakeningReveal.tsx");
    assert.match(reveal, /<MonsterAvatar/);
    assert.doesNotMatch(reveal, /getCharacterImage|getCharacterThumb|getMonsterImageSource/);
  });

  it("発見・同期・抽選・採番・serverはpresentation resolverへ依存しない", () => {
    const productionPaths = [...sourceFiles("src"), ...sourceFiles("server/src")];
    const presentationConsumers = productionPaths.filter((relativePath) =>
      /from\s+["'][^"']*characterPresentationResolver["']/.test(read(relativePath))
    );
    const violations = presentationConsumers.filter(
      (relativePath) =>
        !relativePath.startsWith("src/screens/") &&
        !relativePath.startsWith("src/components/") &&
        relativePath !== "src/utils/formStage.ts"
    );
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
