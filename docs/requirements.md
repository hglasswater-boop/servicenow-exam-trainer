# Requirements

## Product goal

ServiceNow認定試験を、スマートフォン中心に反復学習できる試験対策アプリを作る。

初期対応は CIS-DF。共通の試験エンジンは資格固有の知識を持たず、資格追加は原則として `public/exams/<exam-id>/` 配下のデータ追加だけで行えること。

## Target

- Primary: Android / mobile browser
- Secondary: Desktop browser
- Delivery: installable PWA
- Storage: local browser storage only
- Backend/account: MVPでは持たない

## MVP user stories

1. 学習者は試験を選べる。
2. 学習者は分野を指定して演習できる。
3. 学習者は全分野からランダム演習できる。
4. 学習者は公式Blueprintの比率を反映した模擬試験を開始できる。
5. 回答後に正誤と解説を確認できる。
6. 間違えた問題だけを復習できる。
7. 全体・分野別の正答率を確認できる。
8. ブラウザを閉じても学習履歴が残る。
9. 回答後にBlueprint論点と公式ServiceNow根拠を確認できる。
10. 学習者はsingle / multiple / matchingを同じ学習導線で解ける。
11. matchingはドラッグ操作とタップ操作の両方で回答できる。

## Automatic update requirements

- アプリは起動時にService Worker更新を確認する。
- 新しいService Workerが取得できた場合は自動的にactivateし、現在の画面を1回だけreloadして最新版へ切り替える。
- 試験定義と問題データはオンライン時にnetwork-firstで取得し、HTTP/browser cacheよりネットワーク上の最新版を優先する。
- ネットワークが利用できない場合はService Worker cacheを利用して学習を継続できる。
- 問題データの更新はアプリ本体の再ビルドを要求しない。
- exam.jsonは `contentVersion` と `updatedAt` を持ち、現在の問題データ版をUIに表示できる。
- データ移行レイヤーは作らない。同一question IDは同一学習対象として扱う。

## Question bank quality requirements

- CIS-DFは100問を初期高品質バンクとする。
- domain内訳はBlueprint比率どおり Configuration 15 / Ingest 19 / Govern 35 / Insight 20 / CSDM 11。
- question IDは全件一意。
- correctOptionIdsは存在するoption IDのみを参照する。
- single問題は正答1個、multiple問題は正答2個以上。
- matching問題は各source itemがexactly one targetを正解として持つ。
- matchingのtargetは複数source itemから再利用でき、未使用targetも許可する。
- matchingは全source itemが正しい場合のみ正解とし、部分点を与えない。
- domainIdはexam.jsonで定義済みのdomainだけを使用する。
- prompt/explanation/objective/sourceUrlを空にしない。
- sourceUrlはServiceNow公式ドメインのみ。
- 各domainにsingleとmultipleを最低1問ずつ含む。
- 各domainにmatchingを最低1問含む。
- scenario問題を全体の60%以上とする。
- 問題は独自作成し、公式試験問題・有料模試・exam dumpを転載しない。

各問題は以下を持つ。

- `id`
- `domainId`
- `objective`
- `type`
- `scenario`
- `prompt`
- choice問題: `options` / `correctOptionIds`
- matching問題: `matchingItems` / `matchingTargets`
- `explanation`
- `tags`
- `sourceUrl`

## Non-goals for MVP

- ログイン
- クラウド同期
- サーバー/API
- 管理画面
- 問題投稿機能
- AIによる動的な問題生成
- 公式試験問題の複製
- 過去データ移行や後方互換レイヤー

## Content policy

問題文・選択肢・解説は独自作成する。ServiceNow公式の試験問題、有料模試、第三者のexam dumpを転載しない。公式資料は事実確認と根拠提示に利用する。

## Acceptance criteria

- CIS-DFが試験一覧に表示される。
- Domain / Random / Mock / Wrong Answers の各学習導線がある。
- single-select / multi-select / matching をQuestion unionで扱える。
- matchingは公式仕様の3パターン（1対1 / 未使用targetあり / target再利用）を表現できる。
- 回答判定は選択肢の順序に依存しない。
- Mockの出題数配分がBlueprint比率から大きく逸脱しない。
- 学習履歴はローカルに永続化される。
- 問題の解説からBlueprint論点と公式根拠を確認できる。
- 資格固有ロジックが `src/` に入らない。
- `npm test`, `npm run build` が成功する。
- オンライン起動時にアプリ更新確認が走る。
- オンライン時は試験データの最新版を優先し、オフライン時はキャッシュへフォールバックする。
- 問題データ検証テストが全件成功する。
