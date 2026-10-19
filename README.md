# AI駆動開発 症状カルテ

4グループが原因・つながり・一番の原因・打ち手を記入し、ファシリテーターが集約する、仕様書準拠のWebアプリです。画面はフレームワークなしのHTML/CSS/JavaScript、APIはVercel Functions（Node.js）、保存先はUpstash Redisです。

## Vercelへデプロイ

1. このフォルダーの中身をGitHubリポジトリに追加し、Vercelの「Add New Project」でインポートします。
2. Framework Preset は **Other**。Root Directory はこの `package.json` がある場所。Output Directory は `public`（`vercel.json` に設定済み）、Build Command は未指定、Install Command は `npm install` を使用します。Node.js は22以上を選びます。
3. Vercel MarketplaceでUpstash Redisを追加して、このプロジェクトに接続します。
4. Environment Variablesで下記を設定します。PreviewとProductionそれぞれに必要です。

| 環境変数 | 設定内容 |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | UpstashのREST URL |
| `UPSTASH_REDIS_REST_TOKEN` | UpstashのRESTトークン |
| `ADMIN_PASS` | ファシリテーターの合言葉（8文字以上） |

Marketplaceが `KV_REST_API_URL` / `KV_REST_API_TOKEN` を設定した場合も対応しています。`example_KV_REST_API_URL` / `example_KV_REST_API_TOKEN` のように接頭辞が付いた組み合わせも自動検出します。同じ接頭辞のURLと書き込み用TOKENを使用し、READ_ONLY_TOKENは使用しません。複数の接続先がある場合は接頭辞なしの標準変数名で使用先を指定してください。RedisのTCP接続URLとは異なります。環境変数の変更後はRedeployしてください。

5. デプロイされたURLの `/admin.html` にアクセスして合言葉で入り、全入力をリセットします。
6. `/?g=1`、`/?g=2`、`/?g=3`、`/?g=4` を各グループに配布します。管理画面下部にも配布用URLがあります。これらのURLをQRコード化して配布してください。
7. 下記の当日確認を行います。

CLIを利用する場合は、このフォルダーから `npx vercel` でプロジェクトを作成し、環境変数の設定後に `npx vercel --prod` で本番デプロイできます。ログインとVercelアカウントが必要です。

## ローカル起動

```sh
npm install
cp .env.example .env.local
# .env.local に実際のRedis接続情報・合言葉を設定
node --env-file=.env.local dev-server.mjs
```

`http://localhost:3000` を開きます。ローカルでも実際のRedisを使用します。稼働中の本番DBを使うと本番データに影響するため、検証には別のRedisデータベースを使ってください。

```sh
npm test
npm run check
```

テストではRedisのテスト用アダプターで、アクセス制御・入力検証・保存・TTL・リセット・エラー応答を検証します。実際のUpstash接続は環境変数を設定してから確認してください。

## 操作

- グループ画面：入力停止から2秒で自動保存。通信失敗時は10秒後に再試行。端末内にも入力の控えを保存します。
- サーバーに入力がない場合や未保存の控えがある場合は端末内の控えを復元します。リセット後に同じ端末を再使用する際は、以前の控えを使わないようブラウザーのサイトデータを消してください。
- タイマー：2分・12分・8分・3分を選択し、開始・一時停止・リセット。バックグラウンドから戻っても時刻差で残り時間を計算します。端末間では同期しません。
- ファシリテーター：5秒ごとの集約、前後移動つき発表モード、ヒント表示、全体公開切り替え、Markdownのコピー／ファイル保存、リセットができます。
- 合言葉は管理画面のsessionStorageだけに保持し、ログアウトで削除します。
- ライト／ダークに対応。初期値はOS設定、手動切り替えは端末に保存します。BIZ UDPゴシック・明朝が端末にあれば使用し、なければ日本語システムフォントを使用します。外部フォント通信はありません。

## 当日確認（実環境で実施）

- [ ] 4台でそれぞれの担当症状・問いを確認
- [ ] 入力停止の2秒後に保存済み、再読込でも保持
- [ ] ワーク中の未認証 `GET /api/all` は403
- [ ] 未認証でフェーズ変更・リセット不可
- [ ] 管理画面に5秒以内で反映
- [ ] 全体公開にするとグループ画面に全件が表示、ワーク中へ戻すと非表示
- [ ] 発表モード・ヒント・Markdown書き出しを確認
- [ ] `<script>` 等が文字として表示される
- [ ] スマートフォン幅で操作・入力を確認
- [ ] 最後にリセットし、配布端末の以前の控えを削除

## 保存とアクセス範囲

`karte:1`〜`karte:4` と `phase` を使用し、書き込みのたびに7日のTTLを付けます。Redisへの通信と管理合言葉の検証はサーバー側だけで行います。リセットはRedisトランザクションです。入力表示には `textContent` を使用しています。

仕様どおりグループのログイン認証はありません。`GET /api/karte?group=N` は指定グループを返すため、URLを書き換えると別グループの個別データを取得できます。「ワーク中に非公開」は通常画面と未認証 `/api/all` に適用される設計です。個別APIまでグループ間の厳密な秘匿が必要なら、グループごとのトークンを追加する仕様変更が必要です。

この成果物はVercelへの実デプロイ・実Redisとの接続・4台の実端末検証は未実施です。Vercel/Upstashの接続情報は同梱していません。
