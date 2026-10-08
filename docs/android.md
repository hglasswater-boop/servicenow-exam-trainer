# Android application

## Decision

Android版は既存のTypeScript/Viteアプリを **Capacitor 8** で包む。

- App ID: `com.hglasswater.servicenowexamtrainer`
- App name: `ServiceNow Exam Trainer`
- webDir: `dist`
- min SDK: 24
- target/compile SDK: 36
- Android projectはCIで生成し、リポジトリへ重複コードを常駐させない

## Exam data update

Android native shellではService Workerを利用しない。

試験データは次の順で取得する。

1. public GitHub repoの `raw.githubusercontent.com/.../main/public/exams/` から最新版を取得
2. 取得失敗時はAPKに同梱された `./exams/` を利用

これにより、問題データ更新だけならAPK再配布は不要。

## App update

初期段階ではGitHub Actionsがdebug APKを生成する。

debug APKは動作確認用。継続的なインプレース更新には固定のrelease signing keyが必要なので、release signingとGitHub Releases経由の本体更新は別Issueで実装する。

## Service worker

Capacitor native環境ではService Workerを登録しない。Web/PWA環境のみ既存のService Worker更新機構を利用する。
