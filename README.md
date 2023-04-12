<div align="center">

<h1>Ebisskey for Shrimpia</h1>

---

</div>

[Misskey](https://github.com/misskey-dev/misskey) の最新版をベースにいくつかの追加機能と改善をもたらしています。

[本家 Misskey との違い](DIFFERENCE.md)

> **Note** <br>
> 🦐 本ブランチ `empire` は、シュリンピア帝国での利用を目的とした、Ebisskeyの「帝国フォーク」です。<br>
> シュリンピア帝国の動作環境を前提にした機能が追加される可能性もあり、帝国以外での利用を想定していません。<br>
> 本ブランチを無理やり使うことも可能ですが、サポートは一切受けません。

## 状況

現在、Misskey 13.11.2 に追従しています。Ebisskey固有のリリースノートは [CHANGELOG-EBISSKEY.md](CHANGELOG-EBISSKEY.md)を参照。

## サーバー構築方法

基本的に[Misskey Hubの手順](https://misskey-hub.net/docs/install/manual.html)が適用できます。
ただし、cloneする場合は `https://github.com/shrimpia/misskey.git` をURLに指定してください。

### 本家 Misskeyから移行する

1. リモートブランチのURLを変更する
  `git remote set-url origin https://github.com/shrimpia/misskey`
2. `git pull`
3. `pnpm install && pnpm build`
4. `pnpm migrate`
