import { create } from "zustand";

import { isServerMode } from "../config/apiConfig";
import { getCatalogCharacterById, getCatalogRareById } from "../data/catalogLookup";
import {
  ApiUnavailableError,
  getDiscoveries,
  postLogin,
  postRegister,
  postTransferCreate,
  postTransferRedeem,
  type ServerDiscoveryRow
} from "../services/apiClient";
import { clearOverrideToken, setOverrideToken } from "../services/authToken";
import { storageService } from "../services/storageService";
import type { AccountState } from "../types/account";
import type {
  CharacterTitle,
  DifficultyRank,
  DiscoveryNumberBadge,
  DiscoveryRarity,
  DiscoveryRecord
} from "../types/discoveryRecord";
import { useMonsterStore } from "./monsterStore";

export type AuthActionResult = { ok: boolean; message: string; code?: string };

type AuthStore = {
  account: AccountState | null;
  hydrated: boolean;
  busy: boolean;
  hydrate: () => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<AuthActionResult>;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  createTransferCode: () => Promise<AuthActionResult>;
  redeemTransfer: (code: string) => Promise<AuthActionResult>;
  syncFromServer: (userId: string) => Promise<void>;
};

const authErrorMessage = (error: unknown): string => {
  if (error instanceof ApiUnavailableError) return "通信できません。オンライン状態で再度お試しください。";
  const msg = error instanceof Error ? error.message : "";
  if (msg.includes("409")) return "このメールアドレスは既に使われています。";
  if (msg.includes("401")) return "メールアドレスまたはパスワードが違います。";
  if (msg.includes("404")) return "コードが見つかりません。";
  if (msg.includes("400")) return "入力を確認してください（メール形式・パスワードは6文字以上）。";
  return "エラーが発生しました。時間をおいて再度お試しください。";
};

const deviceUserId = async (): Promise<string> =>
  useMonsterStore.getState().userSalt || (await storageService.ensureUserSalt());

/** サーバーの発見証明（DB行）を DiscoveryRecord に変換（名前・画像はローカルカタログで補完）。 */
const toDiscoveryRecord = (row: ServerDiscoveryRow): DiscoveryRecord => ({
  id: row.id,
  certificateId: row.certificate_id,
  characterId: row.character_id,
  characterName: getCatalogCharacterById(row.character_id)?.name ?? getCatalogRareById(row.character_id)?.name ?? row.character_id,
  imageKey: row.character_id,
  worldGroup: row.world_group,
  rarity: row.rarity as DiscoveryRarity,
  discoveredAt: row.discovered_at,
  localDate: row.local_date,
  isNewForUser: row.is_new_for_user,
  isRediscovery: row.is_rediscovery,
  difficultyRank: row.difficulty_rank as DifficultyRank,
  characterDiscoveryNo: String(row.character_discovery_no),
  numberBadges: Array.isArray(row.number_badges) ? (row.number_badges as DiscoveryNumberBadge[]) : [],
  primaryNumberBadge: (row.primary_number_badge as DiscoveryNumberBadge | null) ?? undefined,
  grantedCharacterTitles: Array.isArray(row.granted_character_titles) ? (row.granted_character_titles as CharacterTitle[]) : [],
  strongestProof: row.strongest_proof,
  discoveryRankLabel: row.discovery_rank_label,
  dpGained: row.dp_gained,
  numberSource: "server"
});

const notConfigured: AuthActionResult = {
  ok: false,
  message: "サーバー未設定です（EXPO_PUBLIC_API_BASE_URL）。連携・引継ぎには接続先が必要です。"
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  account: null,
  hydrated: false,
  busy: false,

  async hydrate() {
    const account = await storageService.getAccount();
    if (account?.token) setOverrideToken(account.token); // 連携済みなら account トークンを Bearer に使う
    set({ account, hydrated: true });
  },

  async register(email, password, displayName) {
    if (!isServerMode) return notConfigured;
    set({ busy: true });
    try {
      const userId = get().account?.userId || (await deviceUserId());
      const res = await postRegister(userId, { email, password, displayName });
      const account: AccountState = {
        userId: res.userId,
        token: res.token,
        email: res.email,
        displayName: res.displayName,
        linked: true,
        updatedAt: new Date().toISOString()
      };
      await storageService.saveAccount(account);
      setOverrideToken(res.token);
      set({ account });
      return { ok: true, message: "アカウントを連携しました。この端末のデータはアカウントに紐づきました。" };
    } catch (error) {
      return { ok: false, message: authErrorMessage(error) };
    } finally {
      set({ busy: false });
    }
  },

  async login(email, password) {
    if (!isServerMode) return notConfigured;
    set({ busy: true });
    try {
      const res = await postLogin({ email, password });
      const account: AccountState = {
        userId: res.userId,
        token: res.token,
        email: res.email,
        displayName: res.displayName,
        linked: true,
        updatedAt: new Date().toISOString()
      };
      await storageService.saveAccount(account);
      setOverrideToken(res.token); // 以後の API は新アカウントのトークンで認証
      set({ account });
      await get().syncFromServer(res.userId);
      return { ok: true, message: "ログインしました。発見記録を引き継ぎました。" };
    } catch (error) {
      return { ok: false, message: authErrorMessage(error) };
    } finally {
      set({ busy: false });
    }
  },

  async logout() {
    await storageService.saveAccount(null);
    clearOverrideToken(); // 匿名トークンに戻す
    set({ account: null });
  },

  async createTransferCode() {
    if (!isServerMode) return notConfigured;
    try {
      const userId = get().account?.userId || (await deviceUserId());
      const { code } = await postTransferCreate(userId);
      return { ok: true, code, message: "引継ぎコードを発行しました。別の端末で入力してください。" };
    } catch (error) {
      return { ok: false, message: authErrorMessage(error) };
    }
  },

  async redeemTransfer(code) {
    if (!isServerMode) return notConfigured;
    set({ busy: true });
    try {
      const res = await postTransferRedeem(code.trim());
      const account: AccountState = { userId: res.userId, token: res.token, linked: false, updatedAt: new Date().toISOString() };
      await storageService.saveAccount(account);
      setOverrideToken(res.token); // 新端末はこのトークンで認証
      set({ account });
      await get().syncFromServer(res.userId);
      return { ok: true, message: "発見記録を引き継ぎました。" };
    } catch (error) {
      return { ok: false, message: authErrorMessage(error) };
    } finally {
      set({ busy: false });
    }
  },

  async syncFromServer(userId) {
    try {
      const { discoveries } = await getDiscoveries(userId);
      await useMonsterStore.getState().applyServerDiscoveries(discoveries.map(toDiscoveryRecord));
    } catch {
      // 引継ぎ後の同期は best-effort（失敗してもログインは維持）。
    }
  }
}));
