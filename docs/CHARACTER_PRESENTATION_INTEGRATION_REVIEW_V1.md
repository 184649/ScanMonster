# Character Presentation Integration Review V1

Status: **READY_WITH_NOTES** / Phase 3C / 2026-07-18

## 1. 目的と結論

Phase 3AとPhase 3Bで導入・移行したCharacter Presentation層を、main統合前に累積監査した。最新`origin/main`上へ対象2コミットだけを追跡可能な形で載せ、明確な不具合だけを最小修正し、Phase 2A・2Cを含まないPR候補ブランチを構築した。

結論は`READY_WITH_NOTES`である。アプリ／serverの型検査と全自動テストは成功し、発見・抽選・採番・履歴・DB・server・正式データへの責務逸脱はない。注意事項は、既知の`ground_sheep`原画IEND欠損によりrelease asset validatorがbaseline同様に失敗することと、発見証明が「現在名を表示し、保存時名をfallbackとして保持する」既存方針であることの2点である。

## 2. Git基準と構築方法

- Repository: `184649/ScanMonster`
- latest `origin/main`: `8fb31949bff0c627b83d1f58ee0aece0bb71353f`
- Phase 3A source: `152e920b673def0f19ed343f48c8590368ab8131`
- Phase 3B source: `d7bc637b5701ac886c797994e79d9adafeb77bed`
- Phase 3A start: `d3d044a006d3839d6de270c1ad97a7d3cc07ae6e`
- Integration candidate: `review/character-presentation-integration`

実在性と祖先関係は、`d3d044a`が`152e920`の祖先、`152e920`が`d7bc637`の親であることをGitで確認した。作業ツリー内の別作業は破棄せず、独立cloneを使用した。

Phase 3B元ブランチを`origin/main`へ直接PRすると、次の4コミットが入る。

1. `818fbc7` design: reset character IP architecture and validation pipeline
2. `d3d044a` design: prepare human flagship character commission package
3. `152e920` feat: separate character identity from presentation
4. `d7bc637` refactor: complete character presentation migration

このうち先頭2件はPhase 2A・2Cの設計／外部発注資料であり、Character Presentation実装PRの範囲外である。そのため最新`origin/main`から新規ブランチを作成し、次を順番に`git cherry-pick -x`した。

1. `5caa9e90e59327e9d43447d1c809ccb1e1efcee8`（source `152e920b...`）
2. `42c9d5c98d5f9dfbfd3ee23e6e10bec00b3366b5`（source `d7bc637b...`）

競合は発生しなかった。main側の変更を上書きする競合解消、merge、squash、rebase、amend、force pushは行っていない。

## 3. 累積差分

レビュー文書追加前の実装／テスト累積差分は19ファイル、`+890/-69`である。

- 文書: Phase 3A／3Bの既存設計・移行文書2件
- 型・設定: `CharacterIdentity`、`CharacterPresentation`、`PresentationMode`、default mode
- resolver: pure coreとgenerated catalog／画像manifestへのbinding
- 共通UI: `MonsterAvatar`、`ShareCard`、`AwakeningReveal`、`DiscoveryCertificateCard`
- 画面: Home、WorldDex、MonsterDetail、SummonResult、ScanHistory、Friend QR結果
- 既存表示helper: `formStage`
- テスト: resolver回帰、移行境界／ガード
- Phase 3C: 明確なレビュー指摘だけを修正した1コミット

Phase 2A・2C文書、正式データ、正式画像、generated出力、server、DB、依存関係は累積差分に含まれない。

## 4. CharacterIdentityレビュー

`CharacterIdentity`は`characterId`を中心に、world、rarity、release status、discoverable、公式番号／履歴scopeを持つ89件のread viewである。UI表示値、発見記録本体、公式番号、履歴配列、store、DTOをコピーしていない。resolver初期化時にgenerated catalogから一度だけ組み立て、永続化しない。

catalog型とのフィールド重複はあるが、presentationからドメイン同一性を切り離す小さな境界型として限定されている。現在のruntime consumerはresolverだけで、変換は89件のモジュール初期化時のみである。将来の整理候補としてliteral型の狭窄、`readonly`化、未使用scopeの再評価はあるが、削除や大規模再設計を行う統合ブロッカーではない。

## 5. CharacterPresentationレビュー

`CharacterPresentation`は名前、モチーフ、短い説明、原画／thumbnail、alt text、requested／resolved mode、presentation status、fallback reason、provisional flagだけを返す。rarity、releaseStatus、発見番号、履歴、抽選重み、DB操作は含まず、保存・同期対象でもない。

`presentationStatus`と`isProvisional`は正式データの`releaseStatus`と独立し、現行89件はlegacy、欠損source fixtureはmissingとして扱う。`characterName`は`displayName`と同値の互換aliasで現consumerはないため将来整理候補だが、今回削除するとPhase 3A契約変更になるため維持した。alt textは画像あり／画像準備中を区別し、fallback reasonはmode未定義または画像欠損を明示する。

## 6. Resolverレビュー

pure coreは入力sourceから`Map<string, CharacterPresentationSource>`を一度だけ構築し、重複IDを例外にする。画面render時はO(1) lookupで、461件の正式masterを毎回線形検索しない。bindingだけがgenerated catalogとstatic image manifestを読む。動的require、store write、DB、fetch、抽選、採番、発見判定はない。

未知IDは`undefined`を返し、架空の正式presentationへ変換しない。UI名helperは保存名、ID、「キャラクター」へ安定fallbackする。zoological／hybridは常にcharacterへ一方向fallbackし、Phase 3Cでunsupported modeをdefaultに渡した場合も循環しないよう修正・テストした。既存89件の名前、原画、thumbnailは全件回帰テスト済みである。

## 7. 表示名優先順位レビュー

nickname対応画面の優先順位は次の1箇所へ集約した。

1. 空白だけではないnickname
2. resolverの現在`displayName`
3. 保存済み`UserMonster.displayName`またはrecord名
4. `characterId`／`imageKey`
5. `キャラクター`

Phase 3C以前はHome／詳細だけ`??`でnicknameを選んでおり、空文字が現在名を隠せたため修正した。nickname非対応のScanHistory、SummonResult、証明などはnicknameを新規参照しない。保存済み名は上書き・削除せずfallbackとして残る。優先順位の純粋selectorは空文字／空白を除外する。

発見証明の永続`DiscoveryRecord.characterName`は一切書き換えない。表示時は既存Phase 3方針どおりresolver現在名を優先し、保存時名をfallbackにする。この「保存スナップショットは保持するが通常表示は現在名」という製品方針は、PR前に確認すべき非重大な注意事項である。

## 8. 画像解決とfallbackレビュー

取得順は、明示source、resolverの原画／thumbnail、対象外の旧画像、`MonsterAvatar`の文字fallbackである。generated manifestへのproduction直接importはresolverだけに限定した。static requireを使用し、動的パス生成はない。

`Image.onError`後は同じcharacter/sourceを再描画せずfallbackを表示する。Phase 3Cでerror stateのreset依存を`[imageSource, resolvedImageKey]`へ変更し、同じlegacy sourceを共有する別characterIdへ古い失敗状態が引き継がれないようにした。hookは無条件で同じ順序、fallbackも同寸法frame内で描画される。不明IDはID文字列を表示し、familyを捏造しない。

`ground_sheep`は正式原画を変更せず、decode失敗時は共通fallbackへ移る。原画、thumbnail、manifestを差し替えていない。

## 9. Homeレビュー

最近の発見は既存どおり`monsters.slice(0, 6)`で、filter、sort、reverseを追加していない。store順、最大6件、`monster.id`による詳細遷移、発見回数、最終発見／取得日時、`MonsterAvatar`のサイズ・枠を維持した。

表示名はnickname対応の共通helperへ接続した。空nicknameだけをfallbackさせる修正以外に見た目の変更はない。Pressableへbutton roleと「現在表示名の詳細を開く」ラベルを持たせた。今日の一番は既存の`DiscoveryCertificateCard`経由で同じ表示解決を使う。

## 10. ShareCardレビュー

nickname優先と現在名fallbackを共通helperへ集約し、画像は`MonsterAvatar`を継続する。species／family、星、属性、図鑑進捗、レイアウトは変更していない。ShareCard自体は従来から公式番号、発見日時、worldをpropsに持たず、今回も証明固有データをresolverへ移していない。

周辺のSummonResultでは公式番号、難度、番号badge、rarity、world、発見証明、共有テキスト、`Share.share`導線が維持されている。カードrootを1つのaccessible groupとして読み上げ、画像説明をroot labelに含めるため、親子の二重読み上げを避ける構成である。

## 11. UserMonster.displayNameレビュー

`UserMonster.displayName`型、serverの`characterName`取込、local発見時catalog名、AsyncStorageの`saveMonster`、同期／再構築経路を変更していない。既知IDではresolver現在名を表示し、offline、未知ID、旧データでは保存名をfallbackにする。

UIの直接property accessは型checkerで検査する。永続フィールドの削除、既存値更新、履歴書換え、DTO変更はない。表示helperは純粋でstoreへ結果を書き戻さない。

## 12. その他移行画面レビュー

- ScanHistory: 配列順・日時・個体遷移を維持し、nicknameなしの現在名fallbackを使用。
- Collection: `formStage`でnickname／現在名の後に既存姿suffixを付け、filter／sort／form assetを変更しない。
- Friend QR結果: resolver現在名、server record名、IDの順。公式番号とDTOは不変。
- AwakeningReveal: 直接manifest取得を`MonsterAvatar`へ統一。演出tier、duration、particle、skip導線は不変。
- WorldDex: 名前／motif／原画／thumbnailをresolverへ寄せ、No、world、rarity、owned判定、解放判定はcatalog/domainに残す。
- MonsterDetail: preview／所持個体の現在名、motif、短い説明だけをresolverから取得。番号、rarity、habitat、memo fallbackは既存domain。
- SummonResult: 表示名／説明のみresolver。発見結果、DP、共有、証明、legendary演出は不変。
- DiscoveryCertificateCard: 現在名表示と保存時名fallback。番号、日時、rarity、world、証明badgeはrecordのまま。
- Discovery Log／Calendar／CharacterRecord: `DiscoveryCertificateCard`再利用のため同じ経路。
- MonsterAvatar利用箇所: current catalog、旧family、未知ID、破損decodeを共通fallbackで処理。

同一画面でcatalogを使う箇所はNo、world、rarity、旧family metadataなど表示resolver外の意味に限定される。

## 13. 未移行箇所レビュー

- My Page: 人間profile名と旧family単位avatar。characterId presentationへ変えると意味と見た目が変わるため正当な残存。
- Research: familyId単位の進捗・種族研究であり、独立character名ではないため正当。
- duplicate表示: 未発見成立前のfamilyIdだけを持つ結果で、characterIdを捏造しないため正当。
- `DiscoveryRevealScreen`／`DiscoveryCoreAnimation`: navigation未登録の受取型旧API。production経路ではなく、API削除は別Phase。
- `CharacterMotionPlayer`／form asset: 専用frame／姿asset層で、正式character原画manifestとは別責務。
- server response: 記録時名とoffline fallbackを運ぶ互換契約。削除・変更しない。
- Settings: production defaultはcharacter固定。zoological／hybrid切替UIを公開しない。

今回安全に直せる追加の移行漏れはなかった。

## 14. アーキテクチャ境界

依存方向は次を維持する。

`Domain data → characterId → CharacterPresentationResolver → CharacterPresentation → UI`

全production sourceのimportを検査し、resolver利用をscreens、components、正当な`formStage` UI helperだけに限定した。monster/auth/profile store、storage、sync/API、generator、world spawn、discovery record、number value、release status、legendary unlock、secret visibility、server、DBはresolver非依存である。presentation層から永続値へのwriteはない。

## 15. 移行ガードレビュー

元ガードの良い点は、screens／componentsを再帰列挙するため新規UIファイルも対象になり、fixtureやgeneratedファイル自身を走査しないことだった。一方、`monster.displayName`という変数名だけの正規表現はaliasで回避でき、domain依存検査はファイル名列挙のためrename／新規ファイルに弱かった。

Phase 3Cで次へ改善した。

- TypeScript checkerでexpressionの実型が`UserMonster`である`displayName` property accessを検出する。
- `src`全体のmanifest importを検査し、resolver bindingだけを正確に許可する。
- `src`／`server/src`全production sourceのresolver importを検査し、UI directoryと`formStage`だけを許可する。
- 新規依存関係、広いファイルallowlist、test fixture制限を追加しない。

これにより変数名変更、domainファイル追加、serverファイル追加でもガードが有効で、profile／friendの正当な`displayName`は型で区別される。

## 16. パフォーマンスレビュー

- source Map構築: module初期化時に89件を1回。
- resolver lookup: O(1)。461 masterのrender時線形検索なし。
- presentation object: lookupごとに小さなplain objectを作るが、Home最大6件、FlatListはbatch制御済みで著しい負荷なし。
- image: static manifest require。動的requireなし。
- state: resolver結果をstoreへ保存しない。
- hooks: `MonsterAvatar`の1 state／1 effectのみ。conditional hookなし。
- AwakeningReveal: 演出用にsilhouette／fullの2 avatarを持つが既存2 image layerの置換であり、無限retryなし。

推測だけのmemoizationやcacheは追加しなかった。

## 17. React／アクセシビリティレビュー

`MonsterAvatar`はhook順が常に一定で、character/source変更時にerror stateをresetする。keyやtestIDは変更していない。fallbackは同じframe寸法を維持する。

Home、ShareCard、ScanHistory、AwakeningRevealに識別可能なlabelがある。ShareCardとAwakeningRevealは親をaccessible control／groupにし、子画像の情報を親labelへ含める。単独`MonsterAvatar`画像はpresentation alt text、不明IDはID、画像欠損時は可視Text fallbackを持つ。親子で別々に同じ名前を読ませるための追加accessible要素はない。

## 18. 検出・修正した問題

`856555714f840f72caf7c5fcce78c083aee96e18 fix: address character presentation review findings`で次を修正した。

1. 別characterIdが同じlegacy sourceを共有すると画像失敗状態が残り得たため、ID変更でもreset。
2. Home／詳細の空nicknameが現在名を隠せたため、空白判定を含む共通優先順位helperへ統一。
3. unsupported modeをdefaultに渡すとfallback先が同じmodeになり得たため、characterへ一方向化。
4. 変数名／ファイル名依存の移行ガードを、型と全production import検査へ強化。
5. 上記の回帰テストを追加。

## 19. 修正しなかった事項

- `ground_sheep` IEND欠損: 既知baselineかつ正式画像変更禁止。共通runtime fallbackで扱い、原画は修復しない。
- 発見証明の現在名表示: 保存時名は不変で、Phase 3A／3Bの明示方針。歴史表示を保存時名固定へ変えるかは製品仕様判断のため変更しない。
- `CharacterIdentity`のcatalog overlap、`CharacterPresentation.characterName`互換alias: 実害や回帰がなく、削除は契約再設計になるため別Phase候補。
- 旧family／unused reveal／motion／form／server／Settings: 前節のとおり責務または互換性が異なり、機能追加なしでは移行しない。
- mainに既に存在するtracked log files: このブランチでは追加・変更していないため、無関係な削除をしない。

## 20. 正式データ不変

`origin/main..HEAD`で次に差分がないことを確認した。

- `assets/characters/Character.xlsx`
- `assets/characters/character_master.json`
- `assets/characters/character-classification.json`
- 既存461 ID、89 initial、rarity、releaseStatus
- `src/data/characterCatalog.generated.ts`
- `src/assets/characterImages.generated.ts`
- server seed／server source／DB schema／migration
- 正式character画像、thumbnail、`Sheep.png`
- `package.json`、app／server lockfile、`.gitattributes`
- Phase 2A／2C文書、外部デザイナー資料

master parityテストで461 ID、generated app/server parityで89 initialを確認した。

## 21. テスト結果

| 検証 | 結果 |
|---|---|
| app typecheck | PASS |
| app tests | PASS: 237 / 237 |
| server typecheck | PASS |
| server tests | PASS: 139、SKIP: 1（実PostgreSQL必須） |
| resolver／migration targeted tests | PASS: 16 / 16 |
| `git diff --check` | PASS |
| 461 ID／89 initial／server-app parity | PASS |
| release asset validator | KNOWN FAIL: `ground_sheep` PNG IEND欠損1件 |

release validatorはcanonical initial 89、asset complete initial 89、missing 0、corrupt 1を報告した。今回差分による失敗ではなく、正式画像を変更して解消していない。新規の一時ファイル、cache、logはコミット対象にない。

## 22. PR候補のコミットとファイル

コミット順は次である。

1. `5caa9e90e59327e9d43447d1c809ccb1e1efcee8` feat: separate character identity from presentation
2. `42c9d5c98d5f9dfbfd3ee23e6e10bec00b3366b5` refactor: complete character presentation migration
3. `856555714f840f72caf7c5fcce78c083aee96e18` fix: address character presentation review findings
4. `docs: add character presentation integration review`（本書を追加するcommit）

PR候補へ入るファイルは、本書を含む文書3件、presentation型／設定／resolver4件、UI／画面10件、form helper 1件、テスト2件である。Phase 2A／2Cコミットとその文書群は含まれない。

## 23. 統合判定とロールバック

判定は`READY_WITH_NOTES`。ユーザーが次を確認した後、当ブランチからmain向けPRを作成できる。

1. `ground_sheep`の既知release gate失敗は別Phaseで正式原画を修復する。
2. 発見証明は保存時名を保持しつつ通常表示では現在名を優先する。

ロールバックは新しい順にreview文書commit、`8565557`、`42c9d5c`、`5caa9e9`を`git revert`する。DB migration、seed rollback、ID修復、履歴書換え、画像復元は不要である。ユーザー承認なしにPR作成、main merge、main pushは行わない。
