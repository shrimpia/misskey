# shrimpia-headline.vue 改修案

## 現状の問題点

1. **コードの責務が混在**
   - [`changeText()`](packages/frontend/src/ui/_common_/shrimpia-headline.vue:89)関数内でマーキーモードと電光掲示板モードの処理が混在
   - アニメーションの制御ロジックが分散している

2. **電光掲示板モードの不完全な実装**
   - `animated === false`の場合、即座に表示されるだけでフェードイン/アウトがない
   - テキスト切り替え時の視覚的なフィードバックが不足

3. **スタイルの管理**
   - `.hide`クラスが定義されているが使用されていない（244行目）
   - `padding-left`の制御が直接スタイル操作で行われている

## 改修方針

### 1. 状態管理の明確化

**追加する状態変数:**
```typescript
// フェードモード用の状態（string union型を使用）
type DisplayState = 'fadingIn' | 'showing' | 'fadingOut';
const displayState = ref<DisplayState>('showing');
```

### 2. 関数の責務分離

**リファクタリング対象:**
- [`changeText()`](packages/frontend/src/ui/_common_/shrimpia-headline.vue:89) → マーキーモードと電光掲示板モードで分離

**新規追加関数:**
```typescript
// マーキーモード用
const changeTextMarquee = async () => { ... }

// フェードモード用
const changeTextFade = async () => { ... }

// フェードイン実行
const fadeIn = async () => { ... }

// フェードアウト実行
const fadeOut = async () => { ... }
```

### 3. CSSアニメーションの追加

**追加するスタイル:**
```scss
.text {
  transition: opacity 0.5s ease-in-out;
  
  &.fadeIn {
    animation: fadeIn 0.5s ease-in-out forwards;
  }
  
  &.fadeOut {
    animation: fadeOut 0.5s ease-in-out forwards;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

### 4. タイミング設定

**フェードモードのタイムライン:**
```
フェードイン (0.5秒)
    ↓
表示維持 (5秒)
    ↓
フェードアウト (0.5秒)
    ↓
次のテキストへ (合計6秒サイクル)
```

## 実装の詳細

### テンプレート変更

```vue
<template>
<div :class="$style.root">
  <MkA :to="currentArticle?.link || ''" :class="$style.inner">
    <i :class="[$style.icon, currentArticle?.iconClass ?? '']"/>
    <div 
      ref="textEl" 
      :class="[
        $style.text,
        !animated && displayState === 'fadingIn' && $style.fadeIn,
        !animated && displayState === 'fadingOut' && $style.fadeOut
      ]"
    />
  </MkA>
</div>
</template>
```

### スクリプト変更の概要

1. **定数の追加**
```typescript
// フェードモードのタイミング定数
const FADE_DURATION = 500;  // 0.5秒
const FADE_SHOW_DURATION = 5000; // 5秒
```

2. **changeText関数のリファクタリング**
```typescript
const changeText = async () => {
  if (animated) {
    await changeTextMarquee();
  } else {
    await changeTextFade();
  }
};
```

3. **マーキーモード実装**
```typescript
const changeTextMarquee = async () => {
  if (!textEl.value || !articleQueue.value.length) {
    fillQueue();
  }
  
  const article = articleQueue.value.shift();
  if (!article) return;
  
  // テキスト設定
  setArticleText(article);
  
  // マーキーアニメーション設定
  const speed = 120;
  const duration = textEl.value.offsetWidth / speed;
  textEl.value.style.setProperty('--marquee-duration', `${duration}s`);
  textEl.value.classList.add('marquee');
  
  // 次のテキストへ
  window.setTimeout(changeText, duration * 1000 + 500);
};
```

4. **フェードモード実装**
```typescript
const changeTextFade = async () => {
  if (!textEl.value) return;
  
  // フェードアウト
  await fadeOut();
  
  // キューのチェックとテキスト設定
  if (!articleQueue.value.length) {
    fillQueue();
  }
  const article = articleQueue.value.shift();
  if (!article) return;
  
  setArticleText(article);
  
  // フェードイン
  await fadeIn();
  
  // 表示時間待機
  await new Promise(resolve => setTimeout(resolve, FADE_SHOW_DURATION));
  
  // 次のサイクルへ
  changeTextFade();
};
```

5. **フェードアニメーション実装**
```typescript
const fadeIn = async () => {
  if (!textEl.value) return;
  
  displayState.value = 'fadingIn';
  textEl.value.style.opacity = '0';
  
  await new Promise(resolve => {
    setTimeout(() => {
      if (textEl.value) {
        textEl.value.style.opacity = '1';
      }
      resolve(undefined);
    }, 50);
  });
  
  await new Promise(resolve => setTimeout(resolve, FADE_DURATION));
  displayState.value = 'showing';
};

const fadeOut = async () => {
  if (!textEl.value) return;
  
  displayState.value = 'fadingOut';
  textEl.value.style.opacity = '0';
  
  await new Promise(resolve => setTimeout(resolve, FADE_DURATION));
};
```

6. **共通処理の抽出**
```typescript
const setArticleText = (article: Article) => {
  if (!textEl.value) return;
  
  // marqueeクラスを削除
  textEl.value.classList.remove('marquee');
  
  // テキストの設定
  const escapedTitle = escapeHtml(article.title);
  const escapedText = escapeHtml(article.text);
  textEl.value.innerHTML = escapedTitle 
    ? `<b>${escapedTitle}</b>　${escapedText}` 
    : escapedText;
  
  currentArticle.value = article;
  
  // パディングのリセット
  if (!animated) {
    textEl.value.style.setProperty('padding-left', '0');
  }
};
```

### スタイル変更

1. **CSS Modulesスタイル**
```scss
.text {
  flex: 1;
  white-space: nowrap;
  padding-left: 100%;
  transition: opacity 0.5s ease-in-out;
  
  &.fadeIn {
    opacity: 1;
  }
  
  &.fadeOut {
    opacity: 0;
  }
}

// .hideクラスは不要なため削除
```

2. **通常のscoped CSS**
```css
.marquee {
  animation: marquee var(--marquee-duration) linear;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
```

## 改善点

### コードの可読性
- モードごとに関数を分離することで、各モードの動作が明確になる
- 状態管理が整理され、デバッグしやすくなる

### 保守性
- 新しいアニメーションモードの追加が容易
- タイミング調整が定数で管理され、変更しやすい

### ユーザー体験
- 電光掲示板モードで滑らかなフェード効果により、視認性が向上
- テキストの切り替わりがより自然になる

## テスト観点

1. **マーキーモード** (`animated === true`)
   - 右から左へ流れるアニメーションが正常に動作する
   - アニメーション速度が適切
   - 次のテキストへの切り替えがスムーズ

2. **フェードモード** (`animated === false`)
   - 0.5秒でフェードインする
   - 5秒間表示される
   - 0.5秒でフェードアウトする
   - 次のテキストに正しく切り替わる

3. **共通**
   - アナウンスメント、イベント、ヒントが正しく表示される
   - キューが空になった際に再読み込みされる
   - リンクが正しく機能する

## 実装順序

1. 定数と型定義の追加
2. ヘルパー関数の実装（`setArticleText`, `fadeIn`, `fadeOut`）
3. モード別関数の実装（`changeTextMarquee`, `changeTextFade`）
4. `changeText`関数のリファクタリング
5. CSSスタイルの追加・修正
6. テンプレートのクラスバインディング修正

## 注意事項

- 既存の`animated`変数の判定ロジックは変更しない
- [`onMounted`](packages/frontend/src/ui/_common_/shrimpia-headline.vue:196)の初期化処理は維持する
- マーキーモードの動作は既存のものを維持する
- タイマーのクリーンアップは既存通り（コンポーネントのアンマウント時に自動的に停止）
