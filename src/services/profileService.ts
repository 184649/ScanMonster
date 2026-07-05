import type { FriendLink, UserProfile } from "../types/profile";
import { deriveFriendCodeFromHash, normalizeFriendCode } from "../utils/friendCode";
import { createHash, createUserSalt } from "./hashService";

/** userSalt から決定的にフレンドコードを作る（同じ端末では常に同じ）。 */
export const deriveFriendCode = async (userSalt: string): Promise<string> => {
  const hash = await createHash(`${userSalt}:friend`);
  return deriveFriendCodeFromHash(hash);
};

const sanitizeFriends = (value: unknown): FriendLink[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const friends: FriendLink[] = [];

  for (const entry of value) {
    const code = normalizeFriendCode((entry as FriendLink)?.friendCode);
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    friends.push({
      friendCode: code,
      displayName: typeof (entry as FriendLink)?.displayName === "string" ? (entry as FriendLink).displayName : undefined,
      source: (entry as FriendLink)?.source === "qr" ? "qr" : "code",
      addedAt: typeof (entry as FriendLink)?.addedAt === "string" ? (entry as FriendLink).addedAt : new Date().toISOString()
    });
  }

  return friends;
};

const sanitizeCodeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const out = new Set<string>();
  for (const entry of value) {
    const code = normalizeFriendCode(entry as string);
    if (code) {
      out.add(code);
    }
  }
  return Array.from(out);
};

/**
 * 保存済みプロフィール（旧形式＝userSalt/createdAt のみ の場合も含む）を
 * 現行の UserProfile へ整える。friendCode は呼び出し側で確定させる。
 */
export const normalizeUserProfile = (
  value: Partial<UserProfile> | null | undefined,
  userSalt: string,
  friendCode: string
): UserProfile => {
  const normalizedCode = normalizeFriendCode(value?.friendCode) ?? friendCode;
  const invitedBy = normalizeFriendCode(value?.invitedByCode) ?? undefined;

  return {
    userSalt,
    createdAt: typeof value?.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    friendCode: normalizedCode,
    displayName:
      typeof value?.displayName === "string" && value.displayName.trim().length > 0 ? value.displayName.trim() : undefined,
    onboarded: Boolean(value?.onboarded),
    invitedByCode: invitedBy,
    friends: sanitizeFriends(value?.friends),
    rewardedFriendCodes: sanitizeCodeList(value?.rewardedFriendCodes)
  };
};

/** userSalt を作ってから、まっさらな UserProfile を生成する。 */
export const createDefaultProfile = async (): Promise<UserProfile> => {
  const userSalt = await createUserSalt();
  const friendCode = await deriveFriendCode(userSalt);
  return normalizeUserProfile(null, userSalt, friendCode);
};
