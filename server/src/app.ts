/**
 * Express アプリ本体（テストから listen(0) で起動できるよう分離）。
 */
import express, { type Express } from "express";

import { router } from "./routes.ts";

export const createApp = (): Express => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // 簡易 CORS（本番は APP_ORIGIN を許可する）。
  const allowedOrigin = process.env.APP_ORIGIN ?? "*";
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use("/api", router);
  return app;
};
