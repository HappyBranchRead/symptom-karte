# Repository Guidelines

## プロジェクト構成

4グループで症状カルテを共同編集する、日本語のワークショップ用アプリです。Next.js App Router、React、TypeScript、Upstash Redisを使用します。

- `src/app/`: ページ、レイアウト、CSS、`api/[route]/route.ts` のAPIエントリーポイント。
- `src/components/`: カルテ編集、一覧、ヘッダー。`src/lib/`: 教材データ、型定義、通信、API接続処理。
- `lib/api.js`: 入力検証、カルテのデータ整形、旧版互換、Redisへの不可分な更新。`lib/redis.js` は接続設定を担当します。
- `test/api.test.js`: メモリー内のRedis代替実装を使ったAPIテスト。
- `test/browser/`: Playwrightによるブラウザーテスト。`next.config.ts` は旧URLの転送とセキュリティヘッダーの設定です。

## 開発・検証コマンド

Node.js 22以上を使用してください。

- `npm install`: 依存パッケージをインストールします。
- `Copy-Item .env.example .env.local`: PowerShellでローカル設定を作成します。開発用Redisの接続情報を記入してください。
- `npm run dev`: `.env.local` を読み込み、`http://localhost:3000` で開発サーバーを起動します。
- `npm test`: APIテストを実行します。
- `npm run check`: TypeScriptの型と既存JavaScriptの構文を検査します。
- `npm run build` / `npm start`: 本番ビルドを作成・起動します。
- `npm run test:e2e`: ビルド済みアプリでPlaywrightテストを実行します。初回は `npx playwright install chromium` が必要です。

VercelではNext.jsプリセットを使用し、旧設定のOutput Directory `public` は解除してください。

## コーディング規約・命名

ES Modulesを使用し、JavaScriptへのインポートには `.js` 拡張子を明記してください。新しい画面はTypeScript・Reactで実装します。文字列はシングルクォート、文末はセミコロン、インデントは階層ごとに半角スペース1個とします。関数・変数はcamelCase、定数は `TTL` のような大文字、モジュール名は小文字を使用してください。フォーマッターやリンターは未設定です。画面の文言は日本語にし、参加者の入力はReactのテキストとして表示し、HTMLとして挿入しないでください。

## テスト方針

`node:test` と `node:assert/strict` を使用します。`test/api.test.js` に、動作が分かる名前の `test('動作の説明', ...)` を追加してください。入力検証、版番号の競合、一括保存、TTL、旧版互換を変更した場合は回帰テストを追加します。カバレッジの数値基準はありません。

提出前に `npm test` と `npm run check` を実行してください。代替実装では実RedisのLua実行を検証できないため、デプロイ後に別途確認します。UI変更時は、2端末での共同編集、下書き保持、一覧からの移動、幅375pxでの操作を確認してください。

## コミット・プルリクエスト

履歴では `Remove Markdown export from the overview` のように、変更内容を短い英語の命令形で記述しています。Conventional Commitsの接頭辞は使われていません。この形式に合わせてください。PRには変更後の動作と検証結果を記載し、関連Issueがあればリンクしてください。画面変更にはスクリーンショットを添付します。

## セキュリティ・設定

認証情報をソースや文書に記録しないでください。開発には専用のRedisデータベースを使用します。版番号の検証、7日間の有効期限、旧データとの互換性を維持してください。URLを知る参加者は編集できるため、顧客名や機密情報を入力しないでください。
