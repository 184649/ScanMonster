# WORLDAWN API サーバー。tsx で TypeScript を直接実行する（ビルド不要）。
FROM node:22-slim

WORKDIR /app

# 依存だけ先に入れてキャッシュを効かせる。
COPY package.json ./
RUN npm install --omit=dev && npm install tsx@^4.16.0

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# 起動前にマイグレーションを適用してからサーバーを起動する。
CMD ["sh", "-c", "npx tsx src/migrate.ts && npx tsx src/server.ts"]
