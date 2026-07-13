/**
 * WORLDAWN API サーバー起動。
 */
import { createApp } from "./app.ts";
import { isDefaultFriendQrSecret } from "./friendQrToken.ts";

/**
 * 本番の設定ガード。危険な既定値のまま公開すると認証・なりすまし事故になるため、起動を止める/警告する。
 */
const assertProductionConfig = (): void => {
  if (process.env.NODE_ENV !== "production") return;
  if (isDefaultFriendQrSecret()) {
    throw new Error(
      "FRIEND_QR_SECRET must be set to a strong non-default value in production. " +
        "With the default secret, friend-QR tokens can be forged and any user impersonated."
    );
  }
  if (!process.env.APP_ORIGIN || process.env.APP_ORIGIN === "*") {
    console.warn("[worldawn-server] WARNING: APP_ORIGIN is unset/'*' in production; CORS is wide open. Set it to your app origin.");
  }
};

assertProductionConfig();

const app = createApp();
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`[worldawn-server] listening on :${port}`);
});
