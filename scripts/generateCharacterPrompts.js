/**
 * WORLDAWN キャラ画像生成プロンプト作成。
 *   node scripts/generateCharacterPrompts.js
 * assets/characters/Character.xlsx を読み、A〜G を保持したまま H〜O を追加して
 * assets/characters/Character_with_prompts.xlsx を出力する（元ファイルは上書きしない）。
 *
 * 方針：カテゴリ（哺乳/鳥/魚/鯨類/昆虫/クモ/甲殻/軟体/両生/爬虫/幻獣 等）ごとに
 * 「その生物を定義する構造的特徴」を保持し、名前ハッシュで性格/ポーズ/フックを分散させる。
 * 著名種は CURATED で種固有の特徴・フック・配色を上書きする。テンプレート依存の行は O 列で明示。
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const root = path.join(__dirname, "..");
const inPath = path.join(root, "assets", "characters", "Character.xlsx");
const outPath = path.join(root, "assets", "characters", "Character_with_prompts.xlsx");

const NAVY = "#0B1B3B";
const GOLD = "#C6A15B";

const hash = (s) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};
const pickN = (arr, seed, n) => {
  const out = [];
  let s = seed;
  const used = new Set();
  while (out.length < Math.min(n, arr.length)) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const i = s % arr.length;
    if (!used.has(i)) {
      used.add(i);
      out.push(arr[i]);
    }
  }
  return out;
};
const pick1 = (arr, seed) => arr[seed % arr.length];

// 性格プール（§8：多様性）。
const PERSONA = [
  "好奇心旺盛で無邪気", "穏やかでマイペース", "少し臆病だが心優しい", "堂々として頼もしい",
  "いたずら好きで活発", "静かで知的", "のんびり屋", "勇敢で負けず嫌い",
  "面倒見がよく温厚", "気まぐれで自由奔放", "誇り高く凛としている", "甘えん坊で人懐こい",
  "慎重で観察好き", "陽気でおしゃべり", "無口で職人気質", "警戒心が強く俊敏",
  "おっとりした食いしん坊", "孤高でクール", "働き者でひたむき", "夢見がちでふんわり"
];

// カテゴリ判定。
const WATER_MAMMAL = new Set(["beaver","capybara","otter","sea otter","seal","walrus","platypus","hippopotamus","manatee","dugong","vaquita"]);
const CETACEAN = new Set(["dolphin","whale","orca"]);
const AMPHIBIAN = new Set(["frog","newt","salamander","axolotl"]);
const REPTILE_WATER = new Set(["crocodile","turtle"]);
const CNIDARIAN = new Set(["jellyfish","coral","sea anemone"]);
const MOLLUSK = new Set(["octopus","squid","clam","common orient clam","scallop","turban shell","sea slug","nautilus","sea hare"]);
const ECHINODERM = new Set(["starfish","sea urchin","sea cucumber"]);
const CRUSTACEAN = new Set(["crab","hermit crab","shrimp","lobster","krill","horseshoe crab"]);
const ARACHNID = new Set(["scorpion","spider","tick","mite","tarantula","pseudoscorpion","harvestman","water scorpion"]);
const MYRIAPOD = new Set(["centipede","millipede","house centipede","symphylan","pauropod"]);
const CROCODILIAN = new Set(["crocodile"]);
const REPTILE_LAND = new Set(["chameleon","gecko","iguana","lizard","snake","komodo dragon"]);

function categorize(sheet, en) {
  const n = en.toLowerCase();
  if (sheet === "phantom") return "fantasy";
  if (sheet === "planet") return n.includes("robot") ? "robot" : n.includes("alien") ? "alien" : "fantasy";
  if (sheet === "bug") {
    if (ARACHNID.has(n)) return "arachnid";
    if (MYRIAPOD.has(n)) return "myriapod";
    if (n.includes("pill bug") || n.includes("velvet worm")) return "other_bug";
    return "insect";
  }
  if (sheet === "sky") return "bird";
  if (sheet === "waterside") {
    if (CETACEAN.has(n)) return "cetacean";
    if (WATER_MAMMAL.has(n)) return "water_mammal";
    if (AMPHIBIAN.has(n)) return "amphibian";
    if (CROCODILIAN.has(n)) return "crocodilian";
    if (n === "turtle") return "turtle";
    if (n === "penguin") return "penguin";
    if (CNIDARIAN.has(n)) return "cnidarian";
    if (MOLLUSK.has(n)) return "mollusk";
    if (ECHINODERM.has(n)) return "echinoderm";
    if (CRUSTACEAN.has(n)) return "crustacean";
    if (["kraken","sea dragon","megalodon","nessie","merlion","coelacanth"].includes(n)) return n === "megalodon" || n === "coelacanth" ? "fish" : "fantasy";
    return "fish";
  }
  // ground
  if (REPTILE_LAND.has(n)) return "reptile";
  if (n === "snake" || n === "tsuchinoko") return "serpent";
  if (["fenrir","yeti","underground dweller"].includes(n)) return "fantasy";
  return "mammal";
}

// カテゴリ別：構造的な必須特徴（種固有はできるだけ CURATED / キーワードで補う）。
const CAT_FEATURES = {
  mammal: ["四本の脚（四足歩行）", "毛並みのある体", "丸みのある頭部", "この種を特徴づける耳・顔・尾の形を残す"],
  serpent: ["脚のない細長い胴", "低く這う姿勢", "なめらかな鱗（写実にしない）", "この種の頭部と模様を残す"],
  reptile: ["低い四足の姿勢", "この種特有の頭部と尾", "うろこ（簡略化）", "特徴的な目や指先"],
  bird: ["翼", "くちばし", "尾羽", "二本の脚", "この種を特徴づける羽色・冠羽・体型を残す"],
  fish: ["流線形の魚体", "背びれ・尾びれ・胸びれ", "この種の体型と模様を残す", "泳ぐ姿勢"],
  cetacean: ["流線形の体", "胸びれ・背びれ・尾びれ", "水中を泳ぐ姿勢", "この種の吻・体型を残す"],
  water_mammal: ["ずんぐりした体", "水かき／ひれ足", "この種の顔・尾の形", "水辺での自然な姿勢"],
  amphibian: ["大きく張り出した目", "幅広い口", "発達した後脚", "この種の指先・体型を残す"],
  turtle: ["甲羅", "短い四肢と尾", "小さな頭", "泳ぐ／歩く自然な姿勢"],
  crocodilian: ["長い口吻", "横に広い頭", "背の隆起した装甲列", "短い四肢と長く太い尾"],
  penguin: ["直立気味の体", "ひれ状の翼", "水かきの足", "この種の頭部模様を残す"],
  insect: ["頭・胸・腹の3分割", "6本の脚", "触角", "この種を特徴づける翅・器官を残す"],
  arachnid: ["8本の脚", "頭胸部と腹部", "この種特有の器官（鋏・尾など）", "低い姿勢"],
  myriapod: ["細長い体節の連なり", "多数の脚", "触角", "低く這う姿勢"],
  other_bug: ["節足動物としての体節", "多数の脚", "触角", "この種の体型を残す"],
  crustacean: ["外殻の体", "はさみ／多数の脚", "触角・眼柄", "この種の体型を残す"],
  mollusk: ["やわらかい体", "腕・触手／殻など", "この種を定義する構造", "水中を漂う姿勢"],
  cnidarian: ["半透明の傘／柱状の体", "触手", "ふわりと漂う姿勢", "この種の輪郭を残す"],
  echinoderm: ["放射状の体", "この種特有の腕・棘", "低い姿勢", "簡略化した表面"],
  fantasy: ["この存在を定義づける象徴的特徴", "生き物としての頭・胴・四肢または相当部位", "威厳のある造形", "過剰な鎧・武器・装飾は付けない"],
  robot: ["丸みのある人工的な体", "この存在を定義する象徴パーツ", "生き物のような愛嬌", "過剰なメカ配線を描かない"],
  alien: ["未知の生物としての頭・胴", "象徴的な大きな目や触角", "不気味かわいい造形", "過剰な装飾を付けない"]
};

const CAT_PROPORTION = {
  serpent: "細長い胴の長さを保ったまま、頭を大きめにデフォルメ。丸く短縮しすぎない",
  crocodilian: "長い口吻と長い尾の比率を保ちつつ、頭と目を大きく。極端に丸めない",
  fish: "魚体の流線形を保ち、頭と目を大きめに。全身を丸くしない",
  cetacean: "流線形の体を保ち、頭を大きめに。二足化・陸上化しない",
  bird: "翼・脚・くちばしの比率を保ち、頭と目を大きく。全部を丸くしない",
  insect: "頭胸腹の区分と6脚を保ち、頭と目を大きめに。単なる丸い玉にしない",
  myriapod: "体節の連なりと多脚の特徴を保ち、頭を親しみやすく",
  arachnid: "8脚の特徴を保ち、頭部を大きめに。恐怖感より愛嬌を",
  default: "頭が大きく目も大きい、胴はふっくら。2.5〜3.5頭身。ただし本来の体型比を失わない"
};

// カテゴリ別ポーズ。
const CAT_POSE = {
  mammal: ["片方の前脚を一歩踏み出して振り返る","身を低くして辺りをうかがう","伸びをして体をひねる","片耳を立てて音のする方へ首を傾ける","座り込んで小首をかしげる"],
  serpent: ["体をゆるくS字に曲げ、鎌首をもたげて周囲を見る","低く這いながら頭だけ持ち上げる"],
  reptile: ["片前脚を上げて周囲をうかがう","尾を片側へ大きく曲げて振り返る","舌を少し出して匂いを探る"],
  bird: ["片翼を半分広げ着地寸前","地上で首を傾げて足元を探る","羽づくろいの途中で顔を上げる","翼をたたみ胸を張って見上げる"],
  fish: ["泳ぎながら体を緩くひねって振り返る","口を少し開けて前方を探る","ひれを広げてホバリングする"],
  cetacean: ["水中で体を弧を描くように泳ぐ","尾びれを片側へ振り上げる"],
  water_mammal: ["水面から顔を上げてきょろきょろ","仰向けに浮かんで前足を胸で合わせる","身を低くして水辺へ踏み出す"],
  amphibian: ["跳び出す直前に後脚を畳んで身構える","前脚をついて口を少し開ける"],
  turtle: ["首を伸ばして片側を見上げる","水をかいて緩く旋回する"],
  penguin: ["翼を左右に広げてよちよち踏み出す","首を伸ばして見上げる"],
  insect: ["片方の触角を前へ向けて探る","前脚を持ち上げて身構える","翅を半分開いて飛び立つ直前"],
  arachnid: ["前脚を持ち上げて低く身構える","体を少し傾けて向き直る"],
  myriapod: ["体を緩くカーブさせ頭を持ち上げる"],
  other_bug: ["体を丸め気味に、頭をこちらへ向ける"],
  crustacean: ["はさみを片方持ち上げて振り返る","眼柄を立てて周囲をうかがう"],
  mollusk: ["腕／触手を一本前へ伸ばして漂う","体をひねって向きを変える"],
  cnidarian: ["触手をなびかせてふわりと漂う"],
  echinoderm: ["腕を片側へ曲げてゆっくり動く"],
  fantasy: ["体を低く構え、頭を片側へ向けて見据える","翼／体を半分広げて存在感を示す","ゆったりと身をひねって振り返る"],
  robot: ["片手／片パーツを上げて小首をかしげる"],
  alien: ["体をゆらりと傾けてこちらを見つめる"]
};

// カテゴリ別フック（身体に融合。花/葉/水滴/星/炎/雲の乱用を避け、体の造形で固有性を出す）。
const CAT_HOOK = {
  mammal: ["背や額の模様を、この動物らしい幾何学的な一筆のマークにまとめる","毛の流れを風の筋のように整理し、輪郭に一本の際立つ房を作る","尾の先の毛並みを特徴的なシルエットに造形する"],
  serpent: ["胴の鱗模様を、連続する菱形の一続きの帯として造形する"],
  reptile: ["背の鱗の並びを、規則的な小さな山形の連なりとして造形する","尾の模様を段階的に細くなるリング状にまとめる"],
  bird: ["翼の風切羽の縁のラインを、なめらかな曲線の署名として整える","冠羽／頭部の羽を、この鳥ならではの一房のシルエットに造形する","尾羽の先端の模様を単純な幾何形にまとめる"],
  fish: ["体側のラインを、静かな水の流れを思わせる一本の曲線として造形する","ひれの縁の形を、この魚ならではの波形シルエットにする","鱗の並びを規則的な単純パターンに整理する"],
  cetacean: ["体側の白黒／濃淡の境界線を、なめらかな弧として造形する"],
  water_mammal: ["体の濃淡の境界を、水面のさざなみのような一本の曲線にする"],
  amphibian: ["背の模様を、丸い斑点が連なる単純パターンにまとめる"],
  turtle: ["甲羅の甲板を、規則的な多角形のモザイクとして造形する"],
  penguin: ["胸元の白黒の境界を、なめらかな一本の曲線として造形する"],
  insect: ["翅の翅脈を、幾何学的で読みやすい格子として整理する","背中の紋様を左右対称の単純な図形にまとめる","前翅の色帯をこの虫ならではの一続きの帯にする"],
  arachnid: ["腹部の紋様を、この種ならではの単純な図形にまとめる"],
  myriapod: ["体節の縁を、規則的なリズムの帯として造形する"],
  other_bug: ["体節の紋様を規則的な帯にまとめる"],
  crustacean: ["殻の稜線を、幾何学的な稜として整える"],
  mollusk: ["腕／殻の曲線を、渦を巻く一続きのラインとして造形する"],
  cnidarian: ["傘の縁と触手のラインを、なめらかな同心の弧として整える"],
  echinoderm: ["放射状の腕の模様を、規則的な同心パターンにまとめる"],
  fantasy: ["この存在を象徴する部位（角・翼・尾など）の輪郭を、洗練された一つの造形にまとめる"],
  robot: ["継ぎ目のラインを、丸くやわらかな幾何パターンに整理する"],
  alien: ["体表の模様を、未知だが規則的な単純パターンにまとめる"]
};

// カテゴリ別 配色（種で上書き）。
const CAT_COLOR = {
  mammal: ["やわらかな土色ブラウン","クリーム色の下腹","落ち着いたセピア"],
  serpent: ["深い苔緑","淡いクリームの腹","落ち着いた青緑"],
  reptile: ["若葉色グリーン","クリームの下面","深いオリーブ"],
  bird: ["やわらかなグレージュ","白い胸元","落ち着いたスレートブルー"],
  fish: ["澄んだアクアブルー","銀白の腹","深いネイビー"],
  cetacean: ["やわらかなブルーグレー","白い下面","深い藍"],
  water_mammal: ["温かみのあるブラウン","クリーム色の下面","濃いチャコール"],
  amphibian: ["みずみずしい若草色","淡いクリームの腹","落ち着いた青緑"],
  turtle: ["深い苔緑","クリームの下甲","琥珀色の差し"],
  penguin: ["すみれ寄りのチャコール","白い腹","やわらかなグレー"],
  insect: ["深い森緑","つやを抑えた黒","琥珀色の差し"],
  arachnid: ["落ち着いたセピア","クリームの斑","濃いチャコール"],
  myriapod: ["落ち着いたテラコッタ","琥珀色の節","濃い茶"],
  other_bug: ["やわらかなグレー","淡いクリーム","濃いスレート"],
  crustacean: ["やわらかな珊瑚朱","クリームの下面","落ち着いた小豆色"],
  mollusk: ["やわらかなコーラルピンク","乳白色","落ち着いた藤色"],
  cnidarian: ["半透明のペールブルー","淡い乳白","やわらかな藤色"],
  echinoderm: ["やわらかな珊瑚朱","淡いクリーム","落ち着いた赤茶"],
  fantasy: ["落ち着いた深緑または藍","乳白色の差し","濃い影色"],
  robot: ["やわらかなアイボリー","淡いミント","濃いスレートグレー"],
  alien: ["ミステリアスな青紫","淡い乳白","深い藍"]
};

// カテゴリ別 アクセント部位。
const CAT_ACCENT = {
  mammal: "耳の内側", serpent: "尾の先の模様", reptile: "背の稜の一部", bird: "風切羽の一部",
  fish: "背びれの内側", cetacean: "尾びれの縁", water_mammal: "水かき／足先", amphibian: "指先",
  turtle: "甲羅の甲板の縁", penguin: "足先", insect: "翅の付け根の一部", arachnid: "脚先",
  myriapod: "頭部の触角", other_bug: "体節の縁の一部", crustacean: "はさみの先", mollusk: "腕／触手の先",
  cnidarian: "触手の先", echinoderm: "腕の先", fantasy: "翼／角の内側", robot: "継ぎ目の一部", alien: "触角／目の縁"
};

// 名前キーワードから色ヒント（80%自然＋20%意外性の“意外性”側にも使える）。
const COLOR_KEYWORDS = [
  [/white|albino|snow|polar|egret|swan/i, "本体：清らかなオフホワイト"],
  [/black|raven|crow|blackbird|melan/i, "本体：深い墨色チャコール"],
  [/red|scarlet|firebrat|robin/i, "本体：落ち着いた朱赤"],
  [/blue|azure|bluebird|blue tang|blue-footed/i, "本体：澄んだブルー"],
  [/green|emerald|verd|leaf/i, "本体：みずみずしい若葉色"],
  [/gold|golden|amber|yellow|canary/i, "本体：やわらかな山吹色"],
  [/silver|grey|gray|ash/i, "本体：やわらかなシルバーグレー"],
  [/pink|rose|flamingo/i, "本体：やさしいコーラルピンク"],
  [/purple|violet|amethyst/i, "本体：落ち着いた菫色"]
];

// ===== 著名種の CURATED 上書き（種固有の特徴・フック・配色） =====
const CURATED = {
  crocodile: { p: "冷静沈着で頼れる年長者", f: ["長い口吻","横に広い頭","背中の隆起した装甲列","短い四肢","長く太い尾"], hook: "背の装甲列を、水に磨かれた流木の木目のような造形にする", pose: "水面から目と鼻先だけを上げ、頭を片側へ向ける", colors: ["深いオリーブ緑","クリーム色の下顎","くすんだ真鍮色"], accent: "背の装甲の一列" },
  giraffe: { p: "おっとりして視野の広い夢見がち", f: ["非常に長い首","長い四肢","頭頂の一対の角状突起","網目模様"], hook: "体の網目模様を、大きめの角丸の単純なタイル状に整理する", pose: "長い首を片側へ緩く傾けて遠くを見る", colors: ["温かなキャラメル色","クリームの網目","濃いトフィー色"], accent: "角状突起の先" },
  elephant: { p: "穏やかで面倒見がよい", f: ["長い鼻","大きな耳","太い四肢","大きな頭部","牙"], hook: "耳の縁のラインを、やわらかな一枚の扇形シルエットに整える", pose: "鼻を片側へ緩く持ち上げて匂いを探る", colors: ["やわらかなグレー","淡い象牙色の牙","青みのあるスレート"], accent: "耳の内側" },
  lion: { p: "堂々として頼もしい王者", f: ["雄大なたてがみ","がっしりした体","房のある尾","力強い前脚"], hook: "たてがみの毛流れを、放射状の力強い一枚のシルエットに造形する", pose: "前脚を一歩出して振り返り、胸を張る", colors: ["温かな砂金色","クリームの口元","琥珀の陰影"], accent: "たてがみの一房" },
  tiger: { p: "誇り高く凛とした一匹狼", f: ["縦縞模様","がっしりした体","丸い耳","長い尾"], hook: "縦縞を、太さの揃った流れるような帯として整理する", pose: "身を低くして片前脚を踏み出す", colors: ["深いオレンジ","白い頬と腹","濃い墨の縞"], accent: "耳の内側" },
  dolphin: { p: "陽気で人懐こい遊び好き", f: ["流線形の体","湾曲した背びれ","くちばし状の吻","尾びれ"], hook: "体側の濃淡の境界を、朝の穏やかな波を思わせる曲線に造形する", pose: "水中で体を弧に描いて振り返る", colors: ["やわらかなブルーグレー","白い下面","深い藍"], accent: "背びれの縁" },
  octopus: { p: "静かで知的な策略家", f: ["丸い頭部（外套膜）","8本の腕","吸盤","大きな目"], hook: "腕の曲線を、渦を巻く一続きの優雅なラインに造形する", pose: "腕を一本前へ伸ばし、体をひねって漂う", colors: ["やわらかなコーラル","乳白の吸盤","落ち着いた小豆色"], accent: "腕の先" },
  mantis: { p: "冷静で隙のない狩人", f: ["鎌状の前脚","三角形の頭","大きな複眼","細長い体"], hook: "前翅の葉脈を、幾何学的で読みやすい格子として整える", pose: "鎌を胸の前で構え、頭を片側へ向ける", colors: ["若葉色グリーン","淡いクリームの腹","落ち着いた深緑"], accent: "鎌の内側" },
  dragonfly: { p: "颯爽として自由", f: ["4枚の透明な翅","細長い腹部","大きな複眼","短い触角"], hook: "翅の翅脈を、繊細で規則的な格子模様として整理する", pose: "翅を水平に広げてホバリングし、頭を片側へ", colors: ["澄んだシアン","金属光沢を抑えた藍","琥珀の差し"], accent: "翅の付け根" },
  butterfly: { p: "ふんわり夢見がち", f: ["大きな4枚の翅","細い胴","くるりと巻く口吻","一対の触角"], hook: "翅の模様を、左右対称の大きな単純図形にまとめる", pose: "翅を半分開いて舞い上がる直前", colors: ["やわらかなクリーム","落ち着いた橙の帯","深い藍の縁"], accent: "翅の縁の一部" },
  penguin: { p: "少し不器用で愛嬌たっぷり", f: ["直立気味の体","ひれ状の翼","水かきの足","丸い頭"], hook: "胸元の白黒の境界を、なめらかな一本の曲線として造形する", pose: "翼を左右に広げてよちよち踏み出す", colors: ["すみれ寄りのチャコール","白い腹","やわらかなグレー"], accent: "足先" },
  seahorse: { p: "内気で穏やか", f: ["S字に曲がる体","馬のような頭","巻きつく尾","背びれ"], hook: "体の環状の節を、規則的なリズムの帯として造形する", pose: "尾を片側へ巻き、体を立てて漂う", colors: ["やわらかな珊瑚色","乳白の腹","落ち着いた琥珀"], accent: "背びれの内側" },
  chameleon: { p: "マイペースで観察好き", f: ["くるりと巻く尾","独立して動く目","掴む足","背の鋸歯状の稜"], hook: "背の鋸歯状の稜を、規則的な小さな山形の連なりに造形する", pose: "巻いた尾を片側へ、片足を上げて枝渡り風に踏み出す", colors: ["若葉色グリーン","クリームの下面","青緑の差し"], accent: "背の稜の一部" },
  frog: { p: "のんびりした食いしん坊", f: ["大きく張り出した目","幅広い口","発達した後脚","短い前脚","丸い指先"], hook: "背の模様を、朝露を思わせる丸い楕円の斑点にまとめる", pose: "後脚を畳み、跳ぶ直前に身構える", colors: ["みずみずしい若草色","淡いクリームの腹","落ち着いた青緑"], accent: "指先" },
  octopus_dummy: {},
  fenrir: { p: "静かな威厳をまとう孤高の守り手", f: ["逞しい狼の体","豊かなたてがみ状の襟毛","鋭い眼","力強い四肢と長い尾"], hook: "襟毛の流れを、夜明けの光の筋のような一続きのシルエットに造形する", pose: "身を低く構え、頭を片側へ向けて見据える", colors: ["深い鉄紺グレー","銀白の襟毛","くすんだ藍"], accent: "襟毛の一房" },
  yeti: { p: "見た目は大きいが心優しい", f: ["長くふさふさの白い毛","大きな体","がっしりした腕","穏やかな顔"], hook: "胸の毛の渦を、やわらかな一つの流れのシルエットにまとめる", pose: "しゃがんで片手を差し出す", colors: ["清らかなオフホワイト","淡い水色の陰影","くすんだ藍の差し"], accent: "胸毛の渦の縁" },
  tsuchinoko: { p: "とぼけて憎めない", f: ["太く短く幅広い胴","小さな頭と尾","丸い体つき","小さな牙"], hook: "腹の鱗模様を、規則的な横帯として造形する", pose: "コミカルに跳ねる一瞬、体が豆のように潰れる", colors: ["落ち着いた土緑","淡い黄の斑","濃いオリーブ"], accent: "腹の鱗の一列" },
  dragon: { p: "誇り高く雄大", f: ["翼","角","長い尾","鱗のある体","逞しい四肢"], hook: "翼膜の骨のラインを、扇状の洗練された一枚に整える", pose: "体を低く構え翼を半分広げて頭を片側へ", colors: ["落ち着いた深緑","乳白の腹","濃い藍の陰"], accent: "翼膜の内側" },
  phoenix: { p: "気高く再生を象徴する", f: ["長く流れる尾羽","広い翼","冠羽","しなやかな首"], hook: "尾羽の先を、なめらかに反り返る一続きの曲線に造形する", pose: "翼を広げて舞い上がる直前", colors: ["落ち着いた朱金","乳白の胸","深い橙の陰"], accent: "冠羽の内側" },
  unicorn: { p: "気高く清らか", f: ["額の一本角","馬体","流れるたてがみと尾","しなやかな四肢"], hook: "額の角の螺旋を、簡潔で美しい一本の造形にする", pose: "首を片側へ傾け前脚を軽く上げる", colors: ["清らかなオフホワイト","淡い真珠色の陰影","くすんだ藤の差し"], accent: "角の螺旋" },
  griffin: { p: "勇敢で誇り高い守護者", f: ["鷲の頭と翼","獅子の胴と後脚","鉤爪","羽毛と毛皮の境"], hook: "翼と胴の羽毛から毛皮への移り変わりを、なめらかな一つの境界線に整える", pose: "翼を半分広げ、頭を片側へ向けて身構える", colors: ["温かな砂金色","乳白の胸羽","濃いトフィー"], accent: "翼の風切羽の一部" },
  pegasus: { p: "自由で颯爽としている", f: ["翼","馬体","流れるたてがみと尾","しなやかな四肢"], hook: "翼の風切羽の縁を、風になびく一続きの曲線に整える", pose: "前脚を上げ翼を広げて跳び立つ直前", colors: ["清らかなオフホワイト","淡い空色の陰影","くすんだ藍の差し"], accent: "翼の風切羽の一部" },
  sphinx: { p: "静かで謎めいた賢者", f: ["獅子の体","大きな頭","伏せた四肢","長い尾"], hook: "顔まわりの頭巾状の毛を、左右対称の簡潔なシルエットに造形する", pose: "伏せた姿勢から頭だけ片側へ向ける", colors: ["温かな砂色","乳白の口元","くすんだ金褐色"], accent: "頭巾状の毛の縁" },
  robot: { p: "生真面目でひたむき", f: ["丸みのある人工的な胴","単純な手足","大きな一つ目または二つ目","継ぎ目"], hook: "胸の丸いパネルを、シンプルな同心円の造形にまとめる", pose: "片手を上げて小首をかしげる", colors: ["やわらかなアイボリー","淡いミント","濃いスレートグレー"], accent: "継ぎ目の一部" },
  alien: { p: "無邪気で不思議ちゃん", f: ["大きな頭","大きなアーモンド形の目","細い手足","つややかな体表"], hook: "頭部の模様を、未知だが規則的な同心の単純パターンにまとめる", pose: "体をゆらりと傾けてこちらを見つめる", colors: ["ミステリアスな青緑","淡い乳白","深い藍"], accent: "目の縁" }
};

// キャラごとの H〜O を生成。
function buildForCharacter(sheet, en, ja, rarity) {
  const key = en.toLowerCase();
  const cat = categorize(sheet, en);
  const seed = hash(en + "|" + ja);
  const cur = CURATED[key];

  const persona = cur ? cur.p : pick1(PERSONA, seed);
  const features = cur ? cur.f : (() => {
    const base = (CAT_FEATURES[cat] || CAT_FEATURES.mammal).slice();
    return base.map((b) => b.replace("この種", `${ja || en}`));
  })();
  const hook = cur ? cur.hook : pick1(CAT_HOOK[cat] || CAT_HOOK.mammal, seed >>> 3);
  const pose = cur ? cur.pose : pick1(CAT_POSE[cat] || CAT_POSE.mammal, seed >>> 5);
  const proportion = CAT_PROPORTION[cat] || CAT_PROPORTION.default;

  let colors = cur ? cur.colors.slice() : (CAT_COLOR[cat] || CAT_COLOR.mammal).slice();
  if (!cur) {
    for (const [re, c] of COLOR_KEYWORDS) if (re.test(en)) { colors[0] = c.replace("本体：", ""); break; }
  }
  const accent = cur ? cur.accent : (CAT_ACCENT[cat] || "耳の内側");
  const speciesLabel = ja ? `${ja}（${en}）` : en;

  const H = persona;
  const I = features.map((f) => "・" + f).join("\n");
  const J = hook;
  const K = pose;
  const L = `本体：${colors[0]}\n補助：${colors[1]}\n濃色：${colors[2]}`;
  const M = `${accent} だけに、深い紺 ${NAVY} と 金 ${GOLD} の自然なツートーンを入れる（他部位に増やさない）`;

  const N = [
    "【WORLDAWNキャラクター生成】",
    "",
    "オリジナル収集ゲーム「WORLDAWN」の完全オリジナルキャラクターを1体デザインする。既存作品・既存IPを模倣しない。",
    "",
    `【モデル生物】\n${speciesLabel}`,
    `【性格】\n${persona}`,
    `【必ず残す身体的特徴（デフォルメしても消さない・むしろ誇張）】\n${I}`,
    `【プロポーション】\n${proportion}`,
    `【生物らしいポーズ（非対称の一瞬・擬人化しない・二足直立や手を振る等は禁止）】\n${pose}`,
    `【固有デザインフック（1つだけ・身体そのものに融合／小物や装飾の後付け禁止）】\n${hook}`,
    `【配色（本体は最大3色。80%は${en}と分かる自然さ＋20%の意外性）】\n${L}`,
    "【WORLDAWN署名：暁の瞳】\n両目とも完全に同一デザイン。大きな虹彩の上半分＝金 " + GOLD + "、下半分＝深い紺 " + NAVY + " の明確な上下2トーン。白いハイライトは1点のみ。左右で仕様を変えない。",
    `【WORLDAWNアクセント】\n${M}\n片側から、ごく薄い金桃色の朝日のリムライトを添える（強い発光やオーラにしない）。`,
    "【画風】\n実在動物を少し可愛くしただけの写実イラストではなく、ゲームのために再設計された立体感のある収集キャラクター。頭と目は大きめ、胴はふっくら。ただしモデル生物を定義する身体的特徴と本来の体型比率を失わない。中程度の太さで均一な主線（外周だけの極太縁取りは禁止）。セルシェーディング1〜2段＋ごく控えめな柔らかい質感（完全なベタ塗りにしない）。皮膚の毛穴・細かなざらつき・湿った生々しい皮膚・写実的な鱗・一本一本のリアルな毛・写実的な筋肉や骨格・リアルCGは禁止。実在動物の身体に大きな目だけを付けた造形にしない。表情から「" + persona + "」が明確に伝わるようにする（無表情禁止）。",
    "【参考画像がある場合】\n添付されたWORLDAWN公式スタイルアンカー画像からは、個別キャラクターの姿・色・模様・装飾をコピーせず、共通するデフォルメ強度・頭身・目の大きさ・主線・セルシェーディング・柔らかな立体感・表面ディテールの単純化レベルだけをスタイル基準として使用する。",
    "【基本仕様】\n1024×1024、PNG、完全な透過背景（アルファチャンネル）。1体のみ・全身・中央配置・キャラクターが画面の約80%。背景／単色背景／グラデーション背景／地面／接地影／水面／石／木／植物／小物／文字／ロゴ／フレーム／光の粒／発光する球体／周囲のエフェクトは禁止。",
    "【最終判定】\n実在動物をリアルに描いて目だけ大きくした造形になっていないか確認する。なっていれば失敗。頭・目・胴・シルエット・表情をゲームキャラクターとして再設計しつつ、モデル生物を定義する身体的特徴は絶対に失わない。"
  ].join("\n\n");

  const O = cur ? "OK" : `OK（カテゴリ:${cat} の一般テンプレート＋種名反映。種固有の特徴を精査する場合はI/J列を微調整推奨）`;

  return { H, I, J, K, L, M, N, O, curated: Boolean(cur), cat };
}

// ===== xlsx 読み込み → H〜O 追加 → 書き出し =====
const wb = XLSX.readFile(inPath);
const SHEETS = ["ground", "waterside", "sky", "bug", "phantom", "planet"];
let processed = 0;
let curatedCount = 0;
const HEADERS_ADD = ["性格・印象", "必須身体特徴", "固有デザインフック", "生物らしいポーズ", "本体配色", "WORLDAWNアクセント部位", "個別生成プロンプト", "プロンプト設計チェック"];

for (const name of SHEETS) {
  const ws = wb.Sheets[name];
  if (!ws) continue;
  const ref = XLSX.utils.decode_range(ws["!ref"]);
  // ヘッダ（1行目 = index 0）に H〜O を追加。
  HEADERS_ADD.forEach((h, i) => {
    const addr = XLSX.utils.encode_cell({ r: ref.s.r, c: 7 + i });
    ws[addr] = { t: "s", v: h };
  });
  for (let r = ref.s.r + 1; r <= ref.e.r; r++) {
    const getCell = (c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      return cell ? String(cell.v).trim() : "";
    };
    const ja = getCell(2), en = getCell(3), rarity = getCell(4);
    if (!en && !ja) continue;
    const b = buildForCharacter(name, en, ja, rarity);
    const cols = [b.H, b.I, b.J, b.K, b.L, b.M, b.N, b.O];
    cols.forEach((v, i) => {
      ws[XLSX.utils.encode_cell({ r, c: 7 + i })] = { t: "s", v: String(v) };
    });
    processed++;
    if (b.curated) curatedCount++;
  }
  // 参照範囲を O 列(index14)まで拡張。
  ref.e.c = Math.max(ref.e.c, 14);
  ws["!ref"] = XLSX.utils.encode_range(ref);
}

XLSX.writeFile(wb, outPath);
console.log(`wrote ${path.relative(root, outPath)}`);
console.log(`processed characters: ${processed}  (curated: ${curatedCount}, template: ${processed - curatedCount})`);
