import type { RareMonster } from "../types/monster";

export const RARE_MONSTERS: RareMonster[] = [
  {
    id: "rare_phoenix",
    displayName: "フェニックス",
    baseFamilyId: "eagle",
    imageKey: "rare_phoenix",
    emoji: "🔥",
    rareCategory: "伝承生物",
    rarity: 5,
    defaultElement: "flame",
    designConcept: "炎の翼を広げる不死鳥。金と深紅の羽、再生を象徴する光輪。通常のワシ種よりも巨大で神々しい。",
    relationToBaseFamily: "大きな翼・鋭い視力・空を支配する姿から、ワシ種に分類されます。",
    loreMemo: "フェニックスは、炎と再生の象徴として語られる伝説の鳥です。",
    discoveryDifficulty: "★★★★★ きわめて低確率",
    unlockHint: "ワシ種を集め、空高くを飛ぶ個体を研究すると手がかりが見えてきます。"
  },
  {
    id: "rare_dragon",
    displayName: "ドラゴン",
    baseFamilyId: "crocodile",
    imageKey: "rare_dragon",
    emoji: "🐉",
    rareCategory: "空想生物",
    rarity: 5,
    defaultElement: "flame",
    designConcept: "ワニの鱗と顎の力強さを残した巨大な竜。角、翼、重厚な鱗、古代王のような存在感。",
    relationToBaseFamily: "硬い鱗・強い顎・爬虫類的な体から、ワニ種に分類されます。",
    loreMemo: "ドラゴンは世界各地の物語に登場する、強大な空想生物です。",
    discoveryDifficulty: "★★★★★ きわめて低確率",
    unlockHint: "ワニ種の硬い鱗と強い顎を研究すると、古代の竜の伝承が見えてきます。"
  },
  {
    id: "rare_kraken",
    displayName: "クラーケン",
    baseFamilyId: "jellyfish",
    imageKey: "rare_kraken",
    emoji: "🦑",
    rareCategory: "伝承・海洋怪物",
    rarity: 5,
    defaultElement: "aqua",
    designConcept: "深海に漂う巨大な触手の怪物。クラゲの透明感と巨大な触手を融合。青紫の発光器官。",
    relationToBaseFamily: "触手と水中の浮遊感から、クラゲ種に分類されます。",
    loreMemo: "クラーケンは、海にすむ巨大な怪物として語られる伝承上の存在です。",
    discoveryDifficulty: "★★★★★ きわめて低確率",
    unlockHint: "クラゲ種を夜の海で研究すると、深海の巨大な触手の気配が見えてきます。"
  },
  {
    id: "rare_fenrir",
    displayName: "フェンリル",
    baseFamilyId: "dog",
    imageKey: "rare_fenrir",
    emoji: "🐺",
    rareCategory: "神話生物",
    rarity: 5,
    defaultElement: "ice",
    designConcept: "巨大な狼型モンスター。青白い発光紋様、氷の息、月夜の王のような威厳。",
    relationToBaseFamily: "イヌの仲間に見られる嗅覚・群れ行動・牙を、神話的に拡張した存在です。",
    loreMemo: "フェンリルは、北欧神話に登場する巨大な狼です。",
    discoveryDifficulty: "★★★★★ きわめて低確率",
    unlockHint: "イヌ種の群れ行動と鋭い嗅覚を研究すると、神話の巨狼の手がかりが見えてきます。"
  },
  {
    id: "rare_robot",
    displayName: "ロボット",
    baseFamilyId: "human",
    imageKey: "rare_robot",
    emoji: "🤖",
    rareCategory: "未来・機械生命体",
    rarity: 5,
    defaultElement: "digital",
    designConcept: "人型の高性能ロボット。白金の装甲、青い発光コア、知性を感じる目。未来の守護者の雰囲気。",
    relationToBaseFamily: "道具を使い知識を発展させるヒト種の、未来的な姿として分類されます。",
    loreMemo: "ロボットは人間が生み出した機械の存在で、未来社会を象徴します。",
    discoveryDifficulty: "★★★★★ きわめて低確率",
    unlockHint: "ヒト種の道具を使う知性を研究すると、未来の機械生命体の手がかりが見えてきます。"
  },
  {
    id: "rare_alien",
    displayName: "宇宙人",
    baseFamilyId: "human",
    imageKey: "rare_alien",
    emoji: "👽",
    rareCategory: "未確認生命体",
    rarity: 5,
    defaultElement: "special",
    designConcept: "細身の知的生命体。星雲のような体表、青紫の発光、浮遊する小さな星輪。",
    relationToBaseFamily: "知性や道具使用の延長として、ヒト種に分類されます。",
    loreMemo: "宇宙人は、地球外に存在するかもしれない未知の知的生命体です。",
    discoveryDifficulty: "★★★★★ きわめて低確率",
    unlockHint: "ヒト種の知性を深く研究すると、遠い星から来た存在の気配が見えてきます。"
  },
  {
    id: "rare_ghost",
    displayName: "ゴースト",
    baseFamilyId: "crow",
    imageKey: "rare_ghost",
    emoji: "👻",
    rareCategory: "怪異",
    rarity: 5,
    defaultElement: "shadow",
    designConcept: "カラスの羽と霊体が融合したゴースト。黒紫の霧、半透明の翼、光る目。",
    relationToBaseFamily: "夜・影・知性・不吉なイメージから、カラス種に分類されます。",
    loreMemo: "ゴーストは、世界中の物語で語られる霊的な存在です。",
    discoveryDifficulty: "★★★★★ きわめて低確率",
    unlockHint: "カラス種を夜に研究すると、影に潜む霊的な存在の手がかりが見えてきます。"
  },
  {
    id: "rare_panda",
    displayName: "パンダ",
    baseFamilyId: "bear",
    imageKey: "rare_panda",
    emoji: "🐼",
    rareCategory: "希少生物",
    rarity: 5,
    defaultElement: "nature",
    designConcept: "森の守護者のようなパンダモンスター。白黒の毛並み、緑と金の装飾、竹の杖。",
    relationToBaseFamily: "クマの仲間であり、希少性が高いため、クマ種の隠れレアに分類されます。",
    loreMemo: "パンダはクマの仲間で、主に竹を食べることで知られています。",
    discoveryDifficulty: "★★★★☆ 低確率",
    unlockHint: "クマ種を森の奥で研究すると、希少な聖獣の手がかりが見えてきます。"
  }
];

export const getRareById = (rareId: string): RareMonster | undefined => {
  return RARE_MONSTERS.find((item) => item.id === rareId);
};

export const getRaresByBaseFamily = (familyId: string): RareMonster[] => {
  return RARE_MONSTERS.filter((item) => item.baseFamilyId === familyId);
};
