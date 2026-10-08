# Automatic update strategy

## Goal

インストール済みPWAが再インストールなしでアプリ本体と試験データの最新版へ追従し、通信できない場合のみ最後に取得した版を使う。

## App update flow

1. 起動時にService Workerを登録する。
2. `updateViaCache: "none"` でService Worker scriptのHTTP cacheを避ける。
3. 登録直後に `registration.update()` を呼ぶ。
4. 新workerはinstall時に `skipWaiting()` する。
5. activate時に古いruntime cacheを削除して `clients.claim()` する。
6. controllerchangeが発生したらページを1回だけreloadする。

## Runtime fetch strategy

同一originのGETはnetwork-first。

- Online: network responseを返し、runtime cacheへ保存。
- Offline/network error: cached responseを返す。
- Cacheに存在しない状態でnetworkも失敗した場合は通常のfetch failureとする。

Cross-origin requestはService Workerでcacheしない。

## Exam data update

- `exam.json` と `questions.json` はアプリ起動時/試験切替時に取得する。
- fetchは `cache: "no-store"`。
- `contentVersion` は表示・診断用。差分移行処理には使わない。
- question IDを変更すると学習履歴上は別問題になる。
- 同じ学習対象を修正する場合はIDを維持する。

## Deliberately not implemented

- 自前アップデートサーバー
- differential patch
- schema migration framework
- background polling
- 強制的な定期reload
- アカウント同期

起動時の更新確認だけに限定し、学習中に突然画面を切り替えない。
