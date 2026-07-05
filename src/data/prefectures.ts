/**
 * 都道府県マスタ（JISコード）と名称→コード変換（純粋・テスト可能）。
 * reverseGeocode の region（"福島県" / "Fukushima" など）から都道府県を判定する。
 * GPS座標や住所は保存しない（code/name のみ）。§8
 */
export type Prefecture = { code: string; name: string; aliases: string[] };

const p = (code: string, name: string, ...aliases: string[]): Prefecture => ({ code, name, aliases: [name, ...aliases] });

export const PREFECTURES: Prefecture[] = [
  p("01", "北海道", "hokkaido"),
  p("02", "青森県", "青森", "aomori"),
  p("03", "岩手県", "岩手", "iwate"),
  p("04", "宮城県", "宮城", "miyagi"),
  p("05", "秋田県", "秋田", "akita"),
  p("06", "山形県", "山形", "yamagata"),
  p("07", "福島県", "福島", "fukushima"),
  p("08", "茨城県", "茨城", "ibaraki"),
  p("09", "栃木県", "栃木", "tochigi"),
  p("10", "群馬県", "群馬", "gunma"),
  p("11", "埼玉県", "埼玉", "saitama"),
  p("12", "千葉県", "千葉", "chiba"),
  p("13", "東京都", "東京", "tokyo"),
  p("14", "神奈川県", "神奈川", "kanagawa"),
  p("15", "新潟県", "新潟", "niigata"),
  p("16", "富山県", "富山", "toyama"),
  p("17", "石川県", "石川", "ishikawa"),
  p("18", "福井県", "福井", "fukui"),
  p("19", "山梨県", "山梨", "yamanashi"),
  p("20", "長野県", "長野", "nagano"),
  p("21", "岐阜県", "岐阜", "gifu"),
  p("22", "静岡県", "静岡", "shizuoka"),
  p("23", "愛知県", "愛知", "aichi"),
  p("24", "三重県", "三重", "mie"),
  p("25", "滋賀県", "滋賀", "shiga"),
  p("26", "京都府", "京都", "kyoto"),
  p("27", "大阪府", "大阪", "osaka"),
  p("28", "兵庫県", "兵庫", "hyogo"),
  p("29", "奈良県", "奈良", "nara"),
  p("30", "和歌山県", "和歌山", "wakayama"),
  p("31", "鳥取県", "鳥取", "tottori"),
  p("32", "島根県", "島根", "shimane"),
  p("33", "岡山県", "岡山", "okayama"),
  p("34", "広島県", "広島", "hiroshima"),
  p("35", "山口県", "山口", "yamaguchi"),
  p("36", "徳島県", "徳島", "tokushima"),
  p("37", "香川県", "香川", "kagawa"),
  p("38", "愛媛県", "愛媛", "ehime"),
  p("39", "高知県", "高知", "kochi"),
  p("40", "福岡県", "福岡", "fukuoka"),
  p("41", "佐賀県", "佐賀", "saga"),
  p("42", "長崎県", "長崎", "nagasaki"),
  p("43", "熊本県", "熊本", "kumamoto"),
  p("44", "大分県", "大分", "oita"),
  p("45", "宮崎県", "宮崎", "miyazaki"),
  p("46", "鹿児島県", "鹿児島", "kagoshima"),
  p("47", "沖縄県", "沖縄", "okinawa")
];

const byCode = new Map(PREFECTURES.map((pref) => [pref.code, pref]));

/** reverseGeocode の region 名（日本語/ローマ字）から都道府県を判定する。 */
export const resolvePrefectureCode = (raw?: string | null): { code: string; name: string } | null => {
  if (!raw) return null;
  const haystack = String(raw).trim().toLowerCase();
  if (haystack.length === 0) return null;
  for (const pref of PREFECTURES) {
    if (pref.aliases.some((alias) => haystack.includes(alias.toLowerCase()))) {
      return { code: pref.code, name: pref.name };
    }
  }
  return null;
};

export const getPrefectureName = (code?: string | null): string | undefined =>
  code ? byCode.get(code)?.name : undefined;
