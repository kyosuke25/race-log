# レース記録 作成・公開レポート

## 公開先

- ブログトップ: https://run-log.kyosuke-yoshimura.workers.dev/
- 第1回投稿: https://run-log.kyosuke-yoshimura.workers.dev/fukuoka-2026
- 指定された `.html` URL: https://run-log.kyosuke-yoshimura.workers.dev/fukuoka-2026.html （上記記事URLへリダイレクト）
- Worker名: `run-log`
- デプロイ日: 2026-11-15
- 最終デプロイの Version ID: `c3a0e986-74c0-43cd-bdb4-5bd3bddcbd2e`

## 作成場所とファイル構成

作業ディレクトリ: `/home/kyosuke/race-log`

```text
race-log/
├── public/                   # 公開する静的アセットのみ
│   ├── index.html            # 投稿1件のブログトップ
│   ├── fukuoka-2026.html     # 大会について・結果・グラフの3部
│   ├── data.json             # 最初に取得した元データ（改変なし）
│   ├── style.css             # 日本語・スマートフォン対応
│   └── charts.js             # JSONをfetchしChart.jsで7グラフを描画
├── scripts/
│   ├── build.mjs             # JSONから結果・表・投稿一覧をHTMLに生成
│   └── verify.cjs            # Chromiumでの表示・データ照合検証
├── verification/
│   ├── top-headers.txt        # 公開トップのcurlレスポンスヘッダー
│   └── article-headers.txt    # 公開記事のcurlレスポンスヘッダー
├── wrangler.toml
├── package.json
├── package-lock.json
├── .gitignore
└── REPORT.md
```

`verification/` には検証時のHTML・JSON・画面画像も保存。これらはgit対象外。REPORT.md、スクリプト、検証ファイルは公開アセットに含めていない。

## データの扱い

期限付きURLのデータ取得を最初の操作で実施。元の `data.json` は変更していない。

取得元: https://muse.ai/files/1389455320919225/28912048391811099/rmo0l79gehz5lk3kjh6efxdm/data.json

SHA-256: `234a4b6a30d90f64de75ef475eddcfe472aece3f6cee6ad67e02a09c9bed26b3`

結果、スプリット、参考値、装備、前年比較の総タイムはJSONからHTMLを生成。全グラフはブラウザーで同じJSONをfetchして描画し、計測値の補完・平滑化はしていない。大会概要の開始年・スタート時刻・公認距離・定員は元JSONにないため、依頼に明記された文章をそのまま使用した。大会名・開催回・開催日はJSONを使用。

Chart.jsはバージョンを固定したCDNから読み込み。CDNまたはデータ取得に失敗するとグラフ欄にメッセージを表示し、静的HTMLの結果と表は閲覧できる。

## curl確認結果

実施コマンド（レスポンス本文・ヘッダーを `verification/` に保存）:

```sh
curl --fail --silent --show-error -D verification/top-headers.txt -o verification/top.html -w 'top HTTP %{http_code} %{url_effective}\n' https://run-log.kyosuke-yoshimura.workers.dev/
curl --fail --silent --show-error --location -D verification/article-headers.txt -o verification/article.html -w 'article HTTP %{http_code} %{url_effective}\n' https://run-log.kyosuke-yoshimura.workers.dev/fukuoka-2026.html
curl --fail --silent --show-error -o verification/deployed-data.json -w 'data HTTP %{http_code}\n' https://run-log.kyosuke-yoshimura.workers.dev/data.json
cmp public/data.json verification/deployed-data.json
```

結果:

```text
top HTTP 200 https://run-log.kyosuke-yoshimura.workers.dev/
article HTTP 200 https://run-log.kyosuke-yoshimura.workers.dev/fukuoka-2026
data HTTP 200
cmp: 差分なし（終了コード0）
```

記事HTMLに「福岡マラソン2026」「3:57:48」「1:59:45」「1:58:03」「前年比較」が含まれることを確認。

## 表示・動作検証

ローカルと公開サイトでPlaywright + `/usr/bin/chromium` による検証を実施:

- 投稿一覧が1件、記事の主要セクションが3つ。
- 結果タイムと全スプリット行を元JSONと照合。
- 7つのChart.jsインスタンスと各データ系列が元JSONに一致。
- ペースのY軸が反転。
- 375px・1280px幅で横はみ出しなし。
- JavaScriptのページエラーなし。

```sh
npm ci
npm run build
npm run dev
# 別ターミナルでローカル検証
npm run verify
# 公開サイト検証
VERIFY_URL=https://run-log.kyosuke-yoshimura.workers.dev npm run verify
# 再デプロイ
npm run deploy
```

## 詰まった点

- PATH上にwranglerがなかったためプロジェクトの開発依存としてインストール。既存の吉村さんのOAuth認証でデプロイ成功。認証エラーなし。
- 初回の `html_handling = "none"` では `/` が404となった。`auto-trailing-slash` に変更して再デプロイし、トップのHTTP 200を確認。`.html` の記事URLは拡張子なしの正規URLへリダイレクトされる。
- 未解決の問題なし。

設定の参照: [Cloudflare公式 静的アセット設定](https://developers.cloudflare.com/workers/static-assets/binding/)、[HTMLルーティング](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。
