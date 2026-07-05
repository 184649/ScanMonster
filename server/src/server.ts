/**
 * WORLDAWN API サーバー起動。
 */
import { createApp } from "./app.ts";

const app = createApp();
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`[worldawn-server] listening on :${port}`);
});
