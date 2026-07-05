import { create } from "zustand";

import { FRIEND_INVITE_DP } from "../constants/friends";
import { storageService } from "../services/storageService";
import type { FriendLink, UserProfile } from "../types/profile";
import { normalizeFriendCode } from "../utils/friendCode";
import { useMonsterStore } from "./monsterStore";

export type FriendActionResult = {
  ok: boolean;
  message: string;
  /** 今回付与された招待DP（0なら未付与）。 */
  dpEarned: number;
};

type ProfileStore = {
  profile: UserProfile | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** ログイン画面の「はじめる」。表示名を保存し onboarded にする。 */
  completeLogin: (displayName?: string) => Promise<void>;
  setDisplayName: (displayName: string) => Promise<void>;
  /** 招待された側：招待コードを1回だけ受け取り、+100 DP。 */
  redeemInviteCode: (code: string) => Promise<FriendActionResult>;
  /** フレンドを追加（フレンドQR/コード）。新規かつ未付与なら +100 DP。 */
  addFriend: (code: string, source: "qr" | "code", displayName?: string) => Promise<FriendActionResult>;
};

const persist = async (
  set: (partial: Partial<ProfileStore>) => void,
  profile: UserProfile
): Promise<void> => {
  await storageService.saveUserProfile(profile);
  set({ profile });
};

/**
 * フレンド追加・招待受け取りの共通処理。
 * - 自分のコード・不正コードは拒否。
 * - 既にフレンドなら再付与しない。
 * - 未付与コードなら +100 DP（DPのみ。限定要素は一切なし）。
 */
const registerFriend = async (
  profile: UserProfile,
  rawCode: string,
  source: "qr" | "code",
  displayName: string | undefined
): Promise<{ profile: UserProfile; result: FriendActionResult }> => {
  const code = normalizeFriendCode(rawCode);

  if (!code) {
    return {
      profile,
      result: { ok: false, dpEarned: 0, message: "コードの形式が正しくありません。8文字のフレンドコードを確認してください。" }
    };
  }

  if (code === profile.friendCode) {
    return { profile, result: { ok: false, dpEarned: 0, message: "自分のコードは追加できません。" } };
  }

  const alreadyFriend = profile.friends.some((friend) => friend.friendCode === code);
  const alreadyRewarded = profile.rewardedFriendCodes.includes(code);

  const friendLink: FriendLink = {
    friendCode: code,
    displayName: displayName?.trim() || undefined,
    source,
    addedAt: new Date().toISOString()
  };

  const nextFriends = alreadyFriend ? profile.friends : [friendLink, ...profile.friends];

  // 未付与コードのときだけ +100 DP（重複付与防止）。
  let dpEarned = 0;
  if (!alreadyRewarded) {
    dpEarned = await useMonsterStore.getState().grantFriendInviteDP(FRIEND_INVITE_DP, "友達招待ボーナス");
  }

  const nextProfile: UserProfile = {
    ...profile,
    friends: nextFriends,
    rewardedFriendCodes: alreadyRewarded ? profile.rewardedFriendCodes : [code, ...profile.rewardedFriendCodes]
  };

  const message = alreadyFriend
    ? "すでにフレンドです。"
    : dpEarned > 0
      ? `フレンドを追加しました。招待ボーナス +${dpEarned} DP を獲得！`
      : "フレンドを追加しました。";

  return { profile: nextProfile, result: { ok: true, dpEarned, message } };
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  hydrated: false,

  async hydrate() {
    const profile = await storageService.ensureProfile();
    set({ profile, hydrated: true });
  },

  async completeLogin(displayName) {
    const profile = get().profile ?? (await storageService.ensureProfile());
    const trimmed = displayName?.trim();
    const nextProfile: UserProfile = {
      ...profile,
      displayName: trimmed && trimmed.length > 0 ? trimmed : profile.displayName,
      onboarded: true
    };
    await persist(set, nextProfile);
  },

  async setDisplayName(displayName) {
    const profile = get().profile;
    if (!profile) {
      return;
    }
    const trimmed = displayName.trim();
    await persist(set, { ...profile, displayName: trimmed.length > 0 ? trimmed : undefined });
  },

  async redeemInviteCode(rawCode) {
    const profile = get().profile;
    if (!profile) {
      return { ok: false, dpEarned: 0, message: "プロフィールの読み込み中です。少し待って再度お試しください。" };
    }

    if (profile.invitedByCode) {
      return { ok: false, dpEarned: 0, message: "招待コードは1回だけ受け取れます（受け取り済みです）。" };
    }

    const code = normalizeFriendCode(rawCode);
    if (code && code === profile.friendCode) {
      return { ok: false, dpEarned: 0, message: "自分のコードは受け取れません。" };
    }

    const { profile: registered, result } = await registerFriend(profile, rawCode, "code", undefined);

    if (!result.ok || !code) {
      return result;
    }

    const nextProfile: UserProfile = { ...registered, invitedByCode: code };
    await persist(set, nextProfile);

    return {
      ok: true,
      dpEarned: result.dpEarned,
      message:
        result.dpEarned > 0
          ? `招待コードを受け取りました。招待ボーナス +${result.dpEarned} DP を獲得！`
          : "招待コードを受け取りました。"
    };
  },

  async addFriend(rawCode, source, displayName) {
    const profile = get().profile;
    if (!profile) {
      return { ok: false, dpEarned: 0, message: "プロフィールの読み込み中です。少し待って再度お試しください。" };
    }

    const { profile: nextProfile, result } = await registerFriend(profile, rawCode, source, displayName);

    if (result.ok) {
      await persist(set, nextProfile);
    }

    return result;
  }
}));
