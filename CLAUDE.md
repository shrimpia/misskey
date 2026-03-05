# CLAUDE.md

このファイルは、このリポジトリで作業する際にClaude Code (claude.ai/code) にガイダンスを提供します。

## プロジェクト概要

このプロジェクトは **misskey-shrimpia** で、シュリンピアというMisskeyサーバー向けにカスタマイズされた[Misskey](https://github.com/misskey-dev/misskey)のフォークです。Misskeyは分散型ソーシャルネットワーキングプラットフォーム（ActivityPub/Fediverse）です。このフォークは他のサーバーでの使用を想定していません。

## リポジトリ構造

このプロジェクトは **pnpm workspaces** で管理されているモノレポです。主なパッケージ：

- **`packages/backend`**: NestJSベースのAPIサーバー、TypeORM（PostgreSQL）を使用
- **`packages/frontend`**: Vue 3フロントエンド、Viteでビルド
- **`packages/misskey-js`**: Misskey API用のTypeScriptクライアントライブラリ
- **`packages/frontend-embed`**: 埋め込み可能なフロントエンドコンポーネント
- **`packages/sw`**: Service Worker
- **`packages/i18n`**: 国際化
- **`packages/misskey-reversi`**: リバーシゲーム
- **`packages/misskey-bubble-game`**: バブルゲーム
- **`packages/frontend-shared`**: フロントエンド共通ユーティリティ
- **`packages/frontend-builder`**: フロントエンドビルドツール
- **`packages/icons-subsetter`**: アイコンサブセット化ユーティリティ

## よく使うコマンド

### ビルド
```bash
pnpm build                    # 全パッケージをビルド
pnpm build-pre                # プリビルドスクリプトを実行
pnpm build-assets             # 静的アセットをビルド
```

### 開発
```bash
pnpm dev                      # 開発サーバーを起動（フロントエンド + バックエンド）
pnpm watch                    # devのエイリアス

# バックエンドのみ
cd packages/backend
pnpm watch                    # 自動リビルド付きのウォッチモード
pnpm dev                      # 開発モード

# フロントエンドのみ
cd packages/frontend
pnpm watch                    # Vite開発サーバー
```

### サーバー起動
```bash
pnpm start                    # 本番サーバーを起動
pnpm start:test               # テストサーバーを起動
pnpm migrateandstart          # マイグレーション実行後に起動
```

### データベース
```bash
pnpm migrate                  # TypeORMマイグレーションを実行
pnpm revert                   # 最後のマイグレーションをロールバック
pnpm check:connect            # データベース接続を確認
```

### テスト
```bash
# 全テスト
pnpm test                     # 全パッケージのテストを実行

# バックエンドのテスト
cd packages/backend
pnpm jest                     # ユニットテスト
pnpm jest:e2e                 # E2Eテスト
pnpm jest:fed                 # 連合テスト
pnpm jest-and-coverage        # カバレッジ付き

# フロントエンドのテスト
cd packages/frontend
pnpm test                     # Vitestテストを実行
pnpm test-and-coverage        # カバレッジ付き

# E2Eテスト（Cypress）
pnpm e2e                      # Cypressテストを実行
pnpm cy:open                  # Cypress UIを開く
```

### Lint
```bash
pnpm lint                     # 全パッケージをLint（typecheck + eslint）

cd packages/backend
pnpm typecheck                # TypeScript型チェック
pnpm eslint                   # ESLintのみ

cd packages/frontend
pnpm typecheck                # Vue + TypeScriptチェック
pnpm eslint                   # ESLintのみ
```

### Storybook
```bash
pnpm build-storybook          # Storybookをビルド
cd packages/frontend
pnpm storybook-dev            # Storybook開発サーバーを起動
```

## アーキテクチャ

### バックエンド (`packages/backend`)

- **フレームワーク**: NestJS + Fastify
- **データベース**: PostgreSQL + TypeORM
- **ビルドツール**: SWC（tscではなく高速コンパイルのため）
- **キューシステム**: BullMQでバックグラウンドジョブを処理
- **API構造**: `src/server/api/endpoints/` にあるREST API
  - エンドポイントは機能ごとに整理（例：`notes/`、`users/`、`admin/`）
  - 各エンドポイントは `endpoint-base.ts` を継承
- **コアサービス**: `src/core/` に配置（例：`NoteCreateService.ts`、`UserService.ts`）
- **データベースモデル**: `src/core/entities/` にエンティティ定義
- **マイグレーション**: `migration/` ディレクトリに配置
- **ActivityPub**: 連合ロジックは `src/core/activitypub/` に配置
- **キュージョブ**: バックグラウンドワーカーは `src/queue/` に配置

### フロントエンド (`packages/frontend`)

- **フレームワーク**: Vue 3 + Composition API
- **ビルドツール**: Vite
- **状態管理**: 主にreactive refsとcomposablesを使用
- **ルーティング**: `src/pages/` のファイルベースルーティング
- **コンポーネント**: `src/components/` に再利用可能なコンポーネント
- **Composables**: `src/composables/` に共有ロジック
- **スタイリング**: Sass/SCSSモジュール
- **APIクライアント**: `misskey-js` パッケージを使用

### APIエンドポイント

`packages/backend/src/server/api/endpoints/` でAPIエンドポイントを追加・変更する際：
1. エンドポイントベースクラスを使用してバリデーション付きのエンドポイントスキーマを定義
2. `endpoint-list.ts` にエンドポイントを登録
3. エンドポイントロジックを実装（通常はコアサービスを呼び出す）
4. エンドポイント追加後、API型を再生成：`pnpm build-misskey-js-with-types`

### データベーススキーマ

- `packages/backend/src/core/entities/` のTypeORMエンティティを使用
- マイグレーションは `packages/backend/migration/` に配置
- スキーマ変更時は必ずマイグレーションを作成（TypeORMが自動生成）
- `pnpm migrate` と `pnpm revert` でマイグレーションをテスト

## シュリンピア固有の開発ガイドライン

### ブランチ戦略
- **`empire`**: シュリンピア固有機能のブランチ（現在アクティブ）

### コード変更のマーキング
シュリンピア固有の変更はコメントでマーク：
```typescript
// #region shrimpia
const shrimpiaFeature = true;
// #endregion
```

値の変更の場合：
```typescript
// #region shrimpia デフォルト値をfalseからtrueに
shrimpIsTasty: true;
// #endregion
```

### 本家との互換性
- このフォークは本家 `misskey-dev/misskey` を追従
- 本家の変更が優先、競合時は独自機能が削除される可能性あり

## 設定

設定は `.config/default.yml` で管理（参考：`.config/example.yml`）。
バックエンドは実行時に `pnpm compile-config` で設定をコンパイルします。

## Node.jsバージョン

必須：**Node.js 22.15.0+ または 24.10.0+**（`packages/backend/package.json` を参照）

## その他の注意事項

- このプロジェクトは主に日本語でドキュメントとIssueを管理
- 全ての依存関係はpnpmで管理、`npm install` ではなく `pnpm install` を使用
- バックエンドはパフォーマンスのため `tsc` ではなくSWCでビルド（`pnpm build`）
- APIエンドポイントのコードを読む際は、カスタムエンドポイント定義パターンを使用していることに注意
- フロントエンドはAPI呼び出しに `misskey-js` を使用、バックエンドAPI変更時は型を再生成
