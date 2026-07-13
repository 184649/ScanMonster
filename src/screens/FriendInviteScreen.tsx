import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { APP_INFO } from "../constants/appInfo";
import { FRIEND_INVITE_DP } from "../constants/friends";
import { Camera, Sparkles } from "../components/icons";
import { FriendQrCode } from "../components/FriendQrCode";
import { PrimaryButton } from "../components/PrimaryButton";
import { DP_ABBR } from "../data/economy";
import { useProfileStore } from "../stores/profileStore";
import { buildFriendPayload, buildInviteMessage, formatFriendCode } from "../utils/friendCode";
import { colors } from "../theme";

export const FriendInviteScreen = () => {
  const navigation = useNavigation<any>();
  const profile = useProfileStore((state) => state.profile);
  const redeemInviteCode = useProfileStore((state) => state.redeemInviteCode);

  const [inputCode, setInputCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const friendCode = profile?.friendCode ?? "";
  const friends = profile?.friends ?? [];
  const alreadyInvited = Boolean(profile?.invitedByCode);

  const handleShare = () => {
    if (!friendCode) {
      return;
    }
    void Share.share({ message: buildInviteMessage(friendCode, APP_INFO.name) });
  };

  const handleRedeem = () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setMessage(null);
    void (async () => {
      try {
        const result = await redeemInviteCode(inputCode);
        setIsError(!result.ok);
        setMessage(result.message);
        if (result.ok) {
          setInputCode("");
        }
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>フレンド・招待</Text>
            <Text style={styles.title}>友達を招待</Text>
            <Text style={styles.lead}>
              招待が成立すると、招待した人・された人の双方に +{FRIEND_INVITE_DP} {DP_ABBR}。
              付与されるのは{DP_ABBR}のみです。限定キャラクターや特別なQR・限定図鑑登録などは一切ありません。
            </Text>
          </View>

          {message ? <Text style={[styles.message, isError ? styles.messageError : styles.messageOk]}>{message}</Text> : null}

          {/* 自分の招待QR・コード */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>あなたの招待QR</Text>
            <View style={styles.qrWrap}>
              {friendCode ? <FriendQrCode value={buildFriendPayload(friendCode)} size={220} /> : null}
            </View>
            <Text style={styles.codeLabel}>フレンドコード</Text>
            <Text style={styles.codeValue}>{formatFriendCode(friendCode)}</Text>
            <Text style={styles.cardNote}>相手にこのQRを読み取ってもらうか、コードを伝えてください。</Text>
            <PrimaryButton label="招待リンクを共有" icon={Sparkles} onPress={handleShare} />
          </View>

          {/* 招待された人：コード入力 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>招待コードを受け取る</Text>
            <Text style={styles.cardNote}>
              招待された方は、相手のフレンドコードを入力してください。受け取りは1回だけ、+{FRIEND_INVITE_DP} {DP_ABBR}。
            </Text>
            <TextInput
              style={styles.input}
              value={inputCode}
              onChangeText={setInputCode}
              placeholder="例: WD34-K7QP"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!alreadyInvited}
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
            />
            {alreadyInvited ? (
              <Text style={styles.doneNote}>招待コードは受け取り済みです（1回のみ）。</Text>
            ) : (
              <PrimaryButton label="受け取る" loading={submitting} disabled={inputCode.trim().length === 0} onPress={handleRedeem} />
            )}
            <PrimaryButton label="フレンドQRを読み取る" icon={Camera} variant="ghost" onPress={() => navigation.navigate("FriendQrScan")} />
          </View>

          {/* フレンド一覧 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>フレンド（{friends.length}人）</Text>
            {friends.length === 0 ? (
              <Text style={styles.cardNote}>まだフレンドがいません。招待コードやフレンドQRで追加しましょう。</Text>
            ) : (
              friends.map((friend) => (
                <View key={friend.friendCode} style={styles.friendRow}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>{(friend.displayName ?? "F").slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.friendBody}>
                    <Text style={styles.friendName} numberOfLines={1}>{friend.displayName ?? "フレンド"}</Text>
                    <Text style={styles.friendCode}>{formatFriendCode(friend.friendCode)}</Text>
                  </View>
                  <Text style={styles.friendSource}>{friend.source === "qr" ? "QR" : "コード"}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBg
  },
  flex: {
    flex: 1
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 40
  },
  header: {
    gap: 6
  },
  kicker: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: "900"
  },
  lead: {
    color: colors.textBody,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700"
  },
  message: {
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  messageOk: {
    color: colors.successDark,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "#BBF7D0"
  },
  messageError: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  card: {
    gap: 10,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  cardTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "900"
  },
  cardNote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  },
  qrWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  codeValue: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center"
  },
  input: {
    height: 52,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.ink,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  doneNote: {
    color: colors.successDark,
    fontSize: 13,
    fontWeight: "800"
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
    paddingTop: 10
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  friendAvatarText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  friendBody: {
    flex: 1,
    minWidth: 0
  },
  friendName: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "900"
  },
  friendCode: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1
  },
  friendSource: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "900"
  }
});
