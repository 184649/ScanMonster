/**
 * 発見番号の採番サービス（仕様 §15/§34）。
 *
 * 重要:
 *  - 採番は発見処理から分離した専用サービスにする（直書きしない）。
 *  - 値は BIGINT 相当。string で扱い、内部計算は BigInt で行う（Number 変換しない）。
 *  - 方針変更（§1）: 公式発見番号はサーバー採番。ローカル採番は撤回し、この端末内実装は
 *    **暫定（非公式）番号**の生成にのみ使う（オフライン/開発用の閲覧キャッシュ）。公式番号として
 *    表示しないこと（DiscoveryRecord.numberSource="local" で暫定扱い）。
 *  - サーバーモード（EXPO_PUBLIC_API_BASE_URL 設定時）は apiClient.postScan の返却番号を使い、
 *    この端末内採番は使わない。
 */
import { storageService } from "./storageService";

export type NumberingService = {
  /** キャラ別公式発見番号を1つ発行する（1始まり）。 */
  issueCharacterDiscoveryNo(characterId: string): Promise<string>;
  /** 将来拡張: ワールド別番号。未使用でも interface に持たせる。 */
  issueWorldDiscoveryNo?(worldGroup: string): Promise<string>;
};

const characterCounterKey = (characterId: string): string => `character:${characterId}`;
const worldCounterKey = (worldGroup: string): string => `world:${worldGroup}`;

/** 指定カウンターを +1 して新値(string)を返す。 */
const bumpCounter = async (counterKey: string): Promise<string> => {
  const counters = await storageService.getDiscoveryCounters();
  const raw = counters[counterKey];
  let current = 0n;
  try {
    current = raw ? BigInt(raw) : 0n;
  } catch {
    current = 0n;
  }
  const next = current + 1n;
  const nextStr = next.toString();
  await storageService.saveDiscoveryCounters({ ...counters, [counterKey]: nextStr });
  return nextStr;
};

/** 端末内採番の実装（初回リリース）。 */
export const localNumberingService: NumberingService = {
  async issueCharacterDiscoveryNo(characterId: string): Promise<string> {
    return bumpCounter(characterCounterKey(characterId));
  },
  async issueWorldDiscoveryNo(worldGroup: string): Promise<string> {
    return bumpCounter(worldCounterKey(worldGroup));
  }
};

/** アプリが使う採番サービス。将来ここをサーバー実装に差し替える。 */
export const numberingService: NumberingService = localNumberingService;
