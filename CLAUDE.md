# Misskey – Claude Code Guide

ルール本体は [AGENTS.md](AGENTS.md) (Codex / Copilot と共有する単一ソース)。本ファイルは Claude Code 用の薄いラッパーで、`@AGENTS.md` 構文で本体規約をセッション開始時にコンテキストへ展開する。

Claude Code 固有の補助 (skills / agents / slash commands / docs) は `.claude/` 配下にコミット済。個人ローカル設定は `.claude/settings.local.json` に、MCP 認証情報は `.claude/.credentials.json` に置く (いずれも `.gitignore` 済)。

@AGENTS.md

## シュリンピア固有の開発ガイドライン
上記のルールに加え、以下のシュリンピア固有のガイドラインも遵守してください。

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

### SPDX ヘッダー（フォーク独自の新規ファイル）
AGENTS.md の SPDX 規約は本家由来ファイル向け。**シュリンピアフォークで新規に作成するソースファイル（本家に存在しないファイル）** は、著作権表記を `Ebise Lutica and GitHub Contributors` にする。ライセンスは引き続き `AGPL-3.0-only`。

- **フォーク独自の新規ファイル**（例: 新しい stream channel や `Sh*` コンポーネント）:

  `.ts` / `.js` / `.cjs` / `.mjs` / `.scss`:
  ```text
  /*
   * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   */
  ```
  `.vue` / `.html`:
  ```text
  <!--
  SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
  SPDX-License-Identifier: AGPL-3.0-only
  -->
  ```
- **本家由来ファイルの改変**: 既存ヘッダー（`syuilo and misskey-project`）はそのまま維持する。書き換えない。
- 既存のシュリンピア独自ファイルの遡及修正は不要（今後の新規ファイルから適用）。

### 本家との互換性
- このフォークは本家 `misskey-dev/misskey` を追従
- 本家の変更が優先、競合時は独自機能が削除される可能性あり


