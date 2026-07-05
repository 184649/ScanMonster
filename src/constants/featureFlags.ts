/**
 * リリース前にデバッグ表示を OFF にできるようにするためのフラグ。
 * 初回リリースはスキャン、図鑑、DP、カテゴリ解放、気配ブースト、称号に絞る。
 */
export const FEATURE_FLAGS = {
  // デバッグモード：ON の間は全ワールドが解放され、全キャラが図鑑・出現の対象になる
  //（実出現は画像実在キャラのみ）。動作確認用。リリース時は false にする。
  DEBUG_MODE: true,

  // デバッグ用：ON の間は図鑑で全キャラクターを「取得済み」として表示する（進捗も満タン）。
  // 実際の所持データは変更しない（表示のみ）。リリース時は false にする。
  DEBUG_ALL_OWNED: true,

  // デバッグ表示
  // これらを true にすると、対応する画面にデバッグ表示が出ます（設定トグルより優先＝強制ON）。
  SHOW_SCAN_DEBUG: false, // スキャン画面に検出コードのデバッグ情報を表示
  SHOW_CHARACTER_IMAGE_DEBUG: false, // キャラ詳細に画像解決のデバッグ情報を表示
  // false にすると設定画面の「ローカルデータをリセット」ボタンが非表示になります。
  ENABLE_DEV_RESET_BUTTON: true,
  // 動作確認用：設定画面に「DP大量付与＋全開放」ボタンを表示する。リリース時は false。
  ENABLE_DEV_UNLOCK_ALL: false,

  // キャラクター世界（初回は animal のみ）
  ENABLE_ANIMAL_WORLD: true,
  ENABLE_FOOD_WORLD: false,
  ENABLE_PLANT_WORLD: false,
  ENABLE_DINOSAUR_WORLD: false,
  ENABLE_FANTASY_WORLD: false,
  ENABLE_SPACE_WORLD: false,

  // スキャン手段（初回は barcode + qr + 写真ライブラリ）
  ENABLE_BARCODE_SCAN: true,
  ENABLE_QR_SCAN: true,
  ENABLE_PHOTO_IMPORT: true,
  ENABLE_RECEIPT_SCAN: false,
  ENABLE_SKY_SCAN: false,
  ENABLE_SPONSOR_CHARACTERS: false,

  // ゲーム機能
  ENABLE_EXPEDITION: false,
  ENABLE_RESEARCH: false,
  ENABLE_MISSIONS: false,
  ENABLE_RARE_DEX: true,
  ENABLE_INDIVIDUAL_VARIANTS: false,
  ENABLE_CATEGORY_DEX: false,
  ENABLE_HABITAT_UNLOCK: true,
  ENABLE_HABITAT_BOOST: true,
  ENABLE_TITLES: true,

  // 演出（初回リリースではキャラクターを動かさない）
  ENABLE_CHARACTER_MOTION: false
} as const;
