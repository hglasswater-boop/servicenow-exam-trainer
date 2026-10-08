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

## Release signing

Android本番APKは固定のrelease signing keyで署名する。同じpackage IDの更新APKは同じ署名鍵を使う。

署名鍵はGitへコミットせず、GitHub Actionsでは次のRepository Secretsから復元する。

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

CIは `assembleRelease` でunsigned APKを生成し、Secretsが存在する場合のみ `zipalign` + `apksigner` を実行する。最後に `apksigner verify --verbose --print-certs` で署名を検証する。

AndroidのversionCodeはSemVerから `major*10000 + minor*100 + patch` で生成する。v0.5.0はversionCode 500。

release keystoreは端末更新の恒久的な署名IDなので、GitHub以外にも安全なバックアップを保持する。

## Service worker

Capacitor native環境ではService Workerを登録しない。Web/PWA環境のみ既存のService Worker更新機構を利用する。
