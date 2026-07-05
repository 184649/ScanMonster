/**
 * フレンドQR発見（段2 / 仕様 §3〜§12）。
 *
 * 新規フレンド（その相手を過去に一度も有効に読んでいない）:
 *   その場で「未発見キャラ」を1体確定出現させ、正式な発見として採番・証明・記録する。
 * 既存フレンド（過去に1回以上読んだ相手）:
 *   その場でキャラ（未発見・発見済み両方が候補）を1体出現。未発見に重み補正を掛ける。
 *
 * 新規・既存の両方をその日の有効フレンド人数に +1 する（同一相手は1日1回・最大100人補正・§6）。
 * 旧「friend ワールド専用キャラの均等抽選」は廃止（master/migration は残し未使用化・§14）。
 * ユーザーには倍率も確率も secret も見せない（レベルと文言のみ・§11/§12）。
 */
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withTransaction } from "./db.ts";
import type { DiscoveryRarity } from "./domain.ts";
import { computeFriendEffectLevel, nextFriendEffectState } from "./friendEffect.ts";
import {
  friendDailyLevel,
  friendDailyMessage,
  pickWeightedByUnseen,
  scanDistribution,
  unseenWeightMultiplier,
  type FriendDailyLevel
} from "./friendDaily.core.ts";
import { pickRarity } from "./rates.ts";
import {
  dailyFriendCount,
  finalizeDiscovery,
  getDiscoveredCharacterIds,
  getLegendaryUnlockedWorlds,
  resolveWorlds,
  type DiscoveryRecordDTO,
  type SpawnCharacter
} from "./scanService.ts";

export class FriendError extends Error {
  status: number;
  constructor(code: string) {
    super(code);
    this.name = "FriendError";
    this.status = code === "owner_not_found" ? 404 : 400;
  }
}

export type FriendScanResult =
  | {
      status: "friend_found";
      isNewFriend: boolean;
      effectLevel: FriendDailyLevel;
      message: string;
      discoveryRecord: DiscoveryRecordDTO;
    }
  | { status: "duplicate"; message: string };

/**
 * 初期リリースでフレンド発見の候補になるレアリティ（prefecture/variant/limited/friend は除外・§14）。
 * legendary は「そのワールドが解放済み」の時のみ候補に含める（呼び出し側で付与）。
 */
const FRIEND_RARITIES_BASE: DiscoveryRarity[] = ["normal", "rare", "secret"];

type MasterRow = { id: string; name: string; world_group: string; rarity: DiscoveryRarity };
const toSpawn = (r: MasterRow): SpawnCharacter => ({ id: r.id, name: r.name, world_group: r.world_group, rarity: r.rarity });

const mastersByRarity = async (client: PoolClient, rarity: DiscoveryRarity): Promise<MasterRow[]> =>
  (
    await client.query<MasterRow>(
      "SELECT id, name, world_group, rarity FROM character_masters WHERE rarity = $1 AND is_available_for_scan = TRUE ORDER BY id",
      [rarity]
    )
  ).rows;

/**
 * フレンド発見のキャラ抽選。
 *  - 新規フレンド: 未発見キャラを必ず1体返す（レアリティを跨いでフォールバック）。全発見済みなら既存扱いに落とす。
 *  - 既存フレンド: 未発見・発見済み両方を候補にし、未発見に重み補正を掛けて1体選ぶ。
 */
const chooseFriendCharacter = async (
  client: PoolClient,
  userId: string,
  effectiveCount: number,
  isNewFriend: boolean
): Promise<{ character: SpawnCharacter; source: string }> => {
  const worlds = await resolveWorlds(client, userId);
  const discovered = await getDiscoveredCharacterIds(client, userId);
  const legendaryWorlds = await getLegendaryUnlockedWorlds(client, userId, worlds);
  const legendaryUnlocked = legendaryWorlds.size > 0;
  const inUnlocked = (rows: MasterRow[]): MasterRow[] => rows.filter((r) => worlds.includes(r.world_group));
  // normal/rare は解放済みワールド内、legendary は解放済みワールド内、secret はワールド外の隠し。
  const candFor = async (rarity: DiscoveryRarity): Promise<MasterRow[]> => {
    if (rarity === "secret") return await mastersByRarity(client, "secret");
    const rows = inUnlocked(await mastersByRarity(client, rarity));
    return rarity === "legendary" ? rows.filter((r) => legendaryWorlds.has(r.world_group)) : rows;
  };

  const dist = scanDistribution({ friendCountToday: effectiveCount, legendaryUnlocked }); // prefecture=0（§13）
  // 候補レアリティ（legendary は解放済みのときだけ）。
  const rarities: DiscoveryRarity[] = legendaryUnlocked ? [...FRIEND_RARITIES_BASE, "legendary"] : FRIEND_RARITIES_BASE;

  if (isNewFriend) {
    // 未発見確定。レアリティ抽選 → その区分に未発見が無ければ他区分へフォールバック（§14）。
    const first = pickRarity(dist, Math.random()) as DiscoveryRarity;
    const order = [first, ...rarities.filter((r) => r !== first)];
    for (const rarity of order) {
      const unseen = (await candFor(rarity)).filter((c) => !discovered.has(c.id));
      if (unseen.length > 0) {
        const chosen = unseen[Math.floor(Math.random() * unseen.length)]!;
        return { character: toSpawn(chosen), source: "friend_new" };
      }
    }
    // 全対象キャラ発見済み → 既存フレンドと同様の通常発見にフォールバック（エラーにしない・§10）。
  }

  const rarity = pickRarity(dist, Math.random()) as DiscoveryRarity;
  let cands = await candFor(rarity);
  if (cands.length === 0) cands = await candFor("normal");
  if (cands.length === 0) throw new FriendError("no_available_character");
  const chosen =
    pickWeightedByUnseen(cands, (c) => !discovered.has(c.id), unseenWeightMultiplier(effectiveCount), Math.random()) ?? cands[0]!;
  return { character: toSpawn(chosen), source: isNewFriend ? "friend_new" : "friend_existing" };
};

export const scanFriendQr = async (params: {
  readerUserId: string;
  ownerUserId: string;
  localDate: string;
}): Promise<FriendScanResult> =>
  withTransaction(async (client) => {
    if (!params.ownerUserId || params.ownerUserId === params.readerUserId) {
      throw new FriendError("self_qr");
    }
    const owner = await client.query("SELECT 1 FROM users WHERE id = $1", [params.ownerUserId]);
    if ((owner.rowCount ?? 0) === 0) throw new FriendError("owner_not_found");

    // 同一相手・同日は1回のみ有効（§3.1/§16）。無効な重複では何も付与しない。
    const sameDay = await client.query(
      "SELECT 1 FROM friend_qr_reads WHERE reader_user_id = $1 AND owner_user_id = $2 AND local_date = $3 LIMIT 1",
      [params.readerUserId, params.ownerUserId, params.localDate]
    );
    if ((sameDay.rowCount ?? 0) > 0) {
      return { status: "duplicate", message: "このフレンドとは今日すでに交流しています。また明日読み合えます。" };
    }

    // 新規フレンド判定（この相手を過去に一度でも有効に読んでいるか・全日付対象）。
    const prior = await client.query(
      "SELECT 1 FROM friend_qr_reads WHERE reader_user_id = $1 AND owner_user_id = $2 LIMIT 1",
      [params.readerUserId, params.ownerUserId]
    );
    const isNewFriend = (prior.rowCount ?? 0) === 0;

    // その日の有効フレンド人数（この読み込みを含めた実効値・最大100は補正側で丸める）。
    const countBefore = await dailyFriendCount(client, params.readerUserId, params.localDate);
    const effectiveCount = countBefore + 1;

    // キャラ抽選 → 正式な発見として採番・証明・記録・DP（通常スキャンと共通処理）。
    const { character, source } = await chooseFriendCharacter(client, params.readerUserId, effectiveCount, isNewFriend);
    const discoveryRecord = await finalizeDiscovery(client, {
      userId: params.readerUserId,
      character,
      localDate: params.localDate,
      discoverySource: source,
      proofRoll: Math.random(),
      friendCountToday: effectiveCount,
      isFirstValidScanOfDay: false
    });

    // 交流履歴を保存（discovery_id を紐づけ）。UNIQUE(reader,owner,local_date) で同日重複はDBでも防止。
    await client.query(
      `INSERT INTO friend_qr_reads (id, reader_user_id, owner_user_id, is_new_friend, discovery_id, local_date)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [`fqr_${randomUUID()}`, params.readerUserId, params.ownerUserId, isNewFriend, discoveryRecord.id, params.localDate]
    );

    // フレンド効果の履歴（連続日数・新規フレンド累計）を継続記録（表示レベルは日次人数から算出）。
    const prevRow = (
      await client.query<{ streak_days: number; new_friend_count: number; last_friend_qr_date: string | null }>(
        "SELECT streak_days, new_friend_count, last_friend_qr_date FROM friend_effect_state WHERE user_id = $1",
        [params.readerUserId]
      )
    ).rows[0];
    const next = nextFriendEffectState({
      prev: {
        streakDays: prevRow?.streak_days ?? 0,
        newFriendCount: prevRow?.new_friend_count ?? 0,
        lastFriendQrDate: prevRow?.last_friend_qr_date ?? null
      },
      today: params.localDate,
      isNewFriend
    });
    const legacyLevel = computeFriendEffectLevel({ newFriendCount: next.newFriendCount, streakDays: next.streakDays });
    await client.query(
      `INSERT INTO friend_effect_state (user_id, streak_days, new_friend_count, effect_level, last_friend_qr_date, updated_at)
       VALUES ($1,$2,$3,$4,$5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET streak_days = $2, new_friend_count = $3, effect_level = $4, last_friend_qr_date = $5, updated_at = NOW()`,
      [params.readerUserId, next.streakDays, next.newFriendCount, legacyLevel, next.lastFriendQrDate]
    );

    const level = friendDailyLevel(effectiveCount);
    return {
      status: "friend_found",
      isNewFriend,
      effectLevel: level,
      message: isNewFriend
        ? "新しいフレンドと出会いました！まだ見ぬキャラを呼び寄せました。"
        : friendDailyMessage(level),
      discoveryRecord
    };
  });

/** フレンド効果（表示用・数値なし）。その日の有効フレンド人数からレベルと文言を返す（§11）。 */
export const getFriendEffect = async (
  userId: string,
  localDate: string
): Promise<{ effectLevel: FriendDailyLevel; message: string }> =>
  withTransaction(async (client) => {
    const count = await dailyFriendCount(client, userId, localDate);
    const level = friendDailyLevel(count);
    return { effectLevel: level, message: friendDailyMessage(level) };
  });
