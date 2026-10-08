# Architecture

## Decision

MVPは **TypeScript + Vite のPWA** とする。

理由:

- Androidでインストール可能
- 単一コードベースでPCでも利用可能
- バックエンド不要
- 試験エンジンの純粋関数をTDDしやすい
- ServiceNow資格追加をJSONデータ追加に限定しやすい

## Directory layout

```text
docs/
public/
  exams/
    index.json
    cis-df/
      exam.json
      questions.json
  sw.js
src/
  domain/
    types.ts
    examEngine.ts
    examEngine.test.ts
    questionBank.ts
    questionBank.test.ts
  storage/
    progress.ts
    progress.test.ts
  update/
    appUpdate.ts
    appUpdate.test.ts
    fetchJson.ts
    fetchJson.test.ts
  vite-env.d.ts
  main.ts
  styles.css
tests/
  cisDfQuestionBank.test.ts
  serviceWorker.test.ts
index.html
package.json
```

## Boundary

### Generic code: `src/`

資格ID・分野名・CIS-DF固有用語をハードコードしない。

### Exam data: `public/exams/<exam-id>/`

- `public/exams/index.json`: 利用可能な試験ID一覧
- `exam.json`: 表示名、試験時間、問題数、分野と比率、content version
- `questions.json`: 問題データ

## Question model

Questionはdiscriminated unionとする。共通field:

- `id`: stable ID
- `domainId`: exam.jsonのdomain ID
- `objective`: Blueprint上の論点
- `scenario`: scenario-oriented itemか
- `prompt`: 問題文
- `explanation`: 解説
- `tags`: 復習用タグ
- `sourceUrl`: 公式ServiceNow根拠URL

Choice question:

- `type`: `single` | `multiple`
- `options`: 選択肢
- `correctOptionIds`: 正答ID

Matching question:

- `type`: `matching`
- `matchingItems`: 左側/source items。各itemは `correctTargetId` を1つ持つ
- `matchingTargets`: 右側/target options

このモデルで公式の3パターンをすべて表現する。

1. item数 = target数の1対1。
2. target数 > item数で未使用targetがある。
3. 複数itemが同じtargetを正解として共有する。

各source itemの正解targetは常に1つ。採点は全一致のみで部分点なし。

## Matching UI

Desktop/Pointerではsource itemをtargetへdrag/dropできる。Mobile/Touchではdragだけに依存せず、source itemをtapしてからtargetをtapする操作も提供する。同じstateを両操作から更新し、UIロジックを二重化しない。

## Mock allocation

各分野の `weight` を期待値として問題数を配分する。整数丸めによる差を許容し、各分野の実数期待値との差が原則1問以内となるよう配分する。

問題バンクに不足がある場合は同一問題を重複出題せず、利用可能数まで縮小する。問題数を偽って75問に水増ししない。

## Update architecture

### Application assets

Service Workerは同一originのGETを **network-first** で処理する。

1. networkへ取得を試みる。
2. 成功時はresponseをruntime cacheへ保存して返す。
3. network失敗時のみcacheへfallbackする。

これにより、オンライン時は新しいindex/JS/CSS/試験JSONを優先し、オフライン時のみ直近キャッシュを利用する。

アプリ起動時は `registration.update()` を実行し、Service Worker scriptそのものの更新も確認する。新しいworkerは `skipWaiting()` と `clients.claim()` で自動的に切り替える。controller変更時、ページは一度だけreloadする。

### Exam content

`exam.json` に以下を追加する。

- `contentVersion`: 問題データ版。単純な整数。
- `updatedAt`: ISO日付。

問題データ取得は `cache: "no-store"` を指定する。HTTP cacheに依存せず、Service Workerのnetwork-first/fallbackのみを利用する。

アプリと問題データは別バージョンとして扱う。問題JSONだけ更新しても試験エンジン変更は不要。

## Question bank validation

`src/domain/questionBank.ts` は資格非依存の構造検証を行い、`tests/cisDfQuestionBank.test.ts` はCIS-DF固有の品質ゲートを検証する。

共通検証:
- ID一意性
- domain参照整合性
- option ID一意性
- correctOptionIdsの参照整合性
- single/multipleの正答数
- matching item/target ID一意性
- matchingのcorrectTargetId参照整合性
- matching source itemの正解がexactly oneであること
- prompt/explanation/objective/sourceUrl必須
- sourceUrlがServiceNow公式URLであること

CIS-DF検証:
- 100問
- domain内訳 15/19/35/20/11
- 各domainにsingle/multiple/matching
- scenario比率60%以上

## Progress storage

localStorageにexam単位の履歴を保存する。

保存するのは問題ごとの以下の集計のみ:

- attempts
- correct
- lastCorrect
- lastAnsweredAt

問題本文や正解データは保存しない。

## KISS constraints

- state management libraryなし
- routerなし
- databaseなし
- backendなし
- framework固有の複雑な抽象化なし
