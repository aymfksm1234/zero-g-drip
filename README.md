# Zero-G Drip

**無重力空間でコーヒーを淹れる実験的スマホゲーム**
An experimental zero-gravity coffee drip game for mobile browsers.

---

## どんなゲーム？

スマホを傾けると画面上の「お湯の粒子」が重力に従って動く。
その粒子をコーヒー豆に当て続けることで抽出ゲージが溜まり、60%に達すると豆が無重力に飛び散る。
美しく、丁寧に注ぐほど高スコアが出る。

```
傾ける → お湯が流れる → 豆にヒット → ゲージ充電 → 60%で飛散 → スコア
```

---

## ゲームルール

| アクション | 効果 |
|-----------|------|
| 傾けてお湯を豆に当てる | ゲージ充電（ヒット数 × 5pt） |
| 連続ヒット（コンボ） | ×2 → ×3 → ×5 倍率ボーナス |
| ピーベリー（金色の丸い豆）に当てる | 大量チャージ ＋ 80pt |
| 傾けすぎ（35°超）→ G-Force Alert | コンボリセット＆ゲージ減少 |
| ゲージ60%到達 | 豆が飛散 → スコア画面へ |

### スコア計算

```
合計 = 命中スコア(最大400) + ピーベリースコア + コンボスコア(最大200) − G-Forceペナルティ
```

### グレード

| スコア | グレード |
|--------|---------|
| 700+ | MASTER BREW / マスターブリュー |
| 450+ | CRAFT BREW / クラフトブリュー |
| 250+ | DECENT CUP / まあまあ |
| 80+  | ROOKIE / ルーキー |
| 〜79 | SPILLED / こぼした |

---

## 技術構成

| 役割 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| スタイリング | Tailwind CSS v4 |
| 物理演算 | Matter.js |
| センサー | DeviceOrientation API (ジャイロ) |
| 描画 | Matter.js afterRender + Canvas 2D API |
| スコア保存 | localStorage |

### ファイル構成

```
components/
├── ZeroGDrip.tsx        # メイン: ゲームロジック・状態管理
├── ZeroGCanvas.tsx      # Matter.js 物理演算・カスタム豆描画
├── ExtractionGauge.tsx  # 抽出ゲージ（Canvas描画）
├── TutorialOverlay.tsx  # 初回チュートリアル（日英）
└── ScoreOverlay.tsx     # スコア結果画面

hooks/
└── useDeviceOrientation.ts  # ジャイロセンサーフック（iOS許可対応）
```

### 物理演算の設計

- **重力方向**: `beta`（前後）・`gamma`（左右）をそのままMatter.jsの重力ベクトルに変換
- **豆の描画**: Matter.jsのデフォルト描画を透明化し、`afterRender`イベントでCanvas APIによるカスタム描画
  - 通常豆: 楕円 + ラジアルグラデーション + 中心クリース（溝）
  - ピーベリー: 丸い形状 + ゴールドグラデーション + スパークル
- **波紋エフェクト**: 衝突検出（`collisionStart`）のたびに拡張・フェードするリングをafterRenderで描画
- **境界壁**: 画面四辺に透明なstatic bodyを配置し豆が飛び出さないよう制御

---

## セットアップ

```bash
git clone https://github.com/aymfksm1234/zero-g-drip
cd zero-g-drip
npm install
npm run dev
```

ブラウザで `http://localhost:3001` を開く。

### スマホで実機テスト

LAN内のスマホからアクセスする場合:

```bash
npm run dev -- --hostname 0.0.0.0
```

> **注意**: Android Chromeはジャイロセンサーに **HTTPS** が必須。
> ローカル (`localhost`) は例外で動作する。本番デプロイはVercel等のHTTPS環境を推奨。

### iOS の注意

iOS 13以降は `DeviceOrientationEvent.requestPermission()` が必要なため、
起動時に「Enable Sensor」ボタンをタップしてセンサー許可を付与してください。

---

## PCでの動作確認

マウスの位置でジャイロをシミュレーション。

- 画面中央付近 → 水平（チャージしやすい）
- 画面端に近づける → 大きく傾く → G-Force Alert に注意

---

## Deploy

Vercelへのワンクリックデプロイ:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aymfksm1234/zero-g-drip)
