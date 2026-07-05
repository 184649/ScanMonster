import type { RegionKey, RegionOption } from "../types/region";

export const REGIONS: RegionOption[] = [
  {
    key: "hokkaido",
    name: "北海道",
    shortName: "北海道",
    description: "北海道エリア。雪原、澄んだ空気、冷たいデータ粒子が強い地域。"
  },
  {
    key: "tohoku",
    name: "東北",
    shortName: "東北",
    description: "青森・岩手・宮城・秋田・山形・福島を含む、森と雪の気配が残る地域。"
  },
  {
    key: "kanto",
    name: "関東",
    shortName: "関東",
    description: "茨城・栃木・群馬・埼玉・千葉・東京・神奈川を含む、情報流の密度が高い地域。"
  },
  {
    key: "chubu",
    name: "中部",
    shortName: "中部",
    description: "新潟・富山・石川・福井・山梨・長野・岐阜・静岡・愛知を含む、山と海の性質が混ざる地域。"
  },
  {
    key: "kansai",
    name: "関西",
    shortName: "関西",
    description: "三重・滋賀・京都・大阪・兵庫・奈良・和歌山を含む、歴史と都市の記録が濃い地域。"
  },
  {
    key: "chugoku",
    name: "中国",
    shortName: "中国",
    description: "鳥取・島根・岡山・広島・山口を含む、穏やかな海風と山陰の影を持つ地域。"
  },
  {
    key: "shikoku",
    name: "四国",
    shortName: "四国",
    description: "徳島・香川・愛媛・高知を含む、巡礼路と清流のタグが付きやすい地域。"
  },
  {
    key: "kyushu",
    name: "九州",
    shortName: "九州",
    description: "福岡・佐賀・長崎・熊本・大分・宮崎・鹿児島を含む、火山と生命力の波形が宿る地域。"
  },
  {
    key: "okinawa",
    name: "沖縄",
    shortName: "沖縄",
    description: "沖縄エリア。潮風、月光、鮮やかな色味が出やすい地域。"
  },
  {
    key: "unknown",
    name: "自動判定できない地域",
    shortName: "未判定",
    description: "位置情報から地域を判定できなかった状態。スキャンは継続できます。"
  }
];

export const getRegionOption = (key: RegionKey): RegionOption => {
  return REGIONS.find((region) => region.key === key) ?? REGIONS[REGIONS.length - 1]!;
};
