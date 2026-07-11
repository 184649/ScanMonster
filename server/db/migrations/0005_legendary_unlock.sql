-- 伝説キャラのワールド解放（段3 §6）。
-- 解放の真実は normal コンプリート状態から再計算可能だが、
-- 「初めて解放した瞬間」を一度だけ演出するため到達時刻を記録する（推測情報は含めない）。
-- 未解放ワールドの行は作らない＝存在しない＝APIから件数も漏れない（§4）。

CREATE TABLE IF NOT EXISTS user_world_legendary (
  user_id TEXT NOT NULL,
  world_group TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, world_group)
);
