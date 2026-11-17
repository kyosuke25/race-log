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

## GitHubソース公開

- リポジトリ: https://github.com/kyosuke25/race-log
- 公開範囲: public
- gh CLIの認証アカウント: `kyosuke25`
- サイトの再デプロイ・変更は実施していない。

### 公開前の秘密情報スキャン

隠しファイル、Git管理外ファイル、依存関係、Git内部を含むツリー全体の1,879ファイル（論理サイズ596,581,982 bytes）と、既存コミット履歴内の全14 blobを検査した。APIキー、各種トークン、JWT、秘密鍵、パスワードやクライアントシークレットの代入、認証情報入りURLのパターン、および `.env`・認証ファイル名を確認。読み取りエラーなし。

検出は `node_modules/` 内の16箇所のみ。Playwright/Undiciのサンプル用パスワード・プロキシURL、Wranglerのドキュメント例や設定フィールド、Miniflareのローカル開発用同梱TLS鍵など。ユーザーの実認証情報は見つからず、コミット済みファイルと履歴はパターン検出なし。`.env` や個別の認証ファイルも見つからなかった。パターン検査による確認であり、未知の形式を含む秘密情報の完全な不存在を保証するものではない。

除外対象:

- `node_modules/`：検出箇所を含む依存関係全体。既存の `.gitignore` で除外済み。Git履歴にも含まれていない。
- `.wrangler/`：ローカルのWrangler生成物。既存設定で除外済み。
- 今後の混入防止として `.env`、`.env.*`（`.env.example` は除く）、`.dev.vars`、`.dev.vars.*`、`.npmrc`、`.netrc`、`*.pem`、`*.key`、`*.p12`、`*.pfx` を `.gitignore` に追加。現在これらに該当する実ファイルはない。
- `public/data.json` は依頼どおり公開対象に含めた。

公開ファイルの配置は `public/index.html`、`public/fukuoka-2026.html`、`public/data.json`、ルートの `wrangler.toml`。

## トレーニング記録の追加（2026-11-16）

- 個人Cloudflareアカウントの `run-log`、カスタムドメイン `https://run.kyosuke.tokyo` に公開する構成。
- `public/training-2026-11.json` と `public/comments.json` は指定URLから取得した原本を改変せず保存。
- `/training/`、`/training/2026-11`、JSONのslugに対応する6個別ページを生成。レース行は既存の `/fukuoka-2026` にリンク。
- 月次サマリ・週別距離・日別距離はmonthブロックを使用。週別・日別距離はレース込み。
- セッション平均ペースは `elapsed_s / distance_m * 1000` を秒/kmとして算出し、秒に丸めて表示。
- 100mバケットのグラフと高低図は元JSONをfetchし、距離mをkmに換算して描画。元の計測値は変更していない。
- コメントはsummary/good/improveをHTMLエスケープしてそのまま掲載。
- `public/chart-utils.js` に既存レース記事とトレーニングページの共通描画処理を配置。`public/training-charts.js` を追加。
- `npm run verify:training` で全6セッション・36グラフ、月次グラフ、コメント、端数行、経過時間ペース、スマホ表示を照合済み。`npm run verify` で既存レース記事も検証済み。
- 変更ファイルの秘密情報パターン検査は検出なし。認証設定ファイルはコミット対象に含めない。

再生成: `npm run build`

個人アカウントへのデプロイ: `npx wrangler deploy --config wrangler.personal.toml --profile personal`

デプロイ成功。Version ID: `4ad8c0bc-976c-46ae-9b1b-ddeac519bb77`。

新規8ページをcurlで取得し、すべてHTTP 200かつ生成済みHTMLとバイト単位で一致することを確認。全URLと結果は `verification/training-http-status.txt` に保存。公開された両JSONも保存原本と一致。

公開サイトに対する `VERIFY_URL=https://run.kyosuke.tokyo npm run verify:training` と `VERIFY_URL=https://run.kyosuke.tokyo npm run verify` は成功。未解決の問題なし。


# REPORT — 2026-11-17 統一prep・CI移行（未デプロイ）

## 変更ファイル

- `.gitignore`: Pythonキャッシュ除外。
- `.github/workflows/deploy.yml`: main push時にnpm ci → build → 個人Workersデプロイ。
- `scripts/prep/session_schema.py`: 共通のGPS補間、センサー系列、スプリット、集計、靴累計。
- `scripts/prep/prep_fukuoka.py`, `scripts/prep/prep_training.py`: 入出力引数付きラッパ。
- `scripts/prep/race_metadata.json`: 既存公開の大会・公式タイム・前年比較データ。
- `scripts/prep/README.md`: 再生成方法、単位、集計規則と元データの差。
- `public/data.json`, `public/training-2026-11.json`: 再生成。
- `scripts/build.mjs`: 共通sessionからレースのサマリ・靴を参照、月次raceの靴情報を直接使用。
- `public/training-charts.js`, `scripts/verify-training.cjs`: elevation距離をkmに統一。
- `public/training/2026-11-16-am.html`: 従来省略されていた端数34mの行を追加。
- `scripts/verify-data.py`, `scripts/verify-charts.cjs`: ネットワーク不要の回帰検証。
- `REPORT.md`: 本ログ追記。他の生成HTMLは既存と同一。

## 新スキーマ

格納先: data.json.session / training-2026-11.json.sessions[]。

- 基本: track_id, slug, date, weekday, start_time, kind（training/race）。labelも保持。
- サマリ: distance_m, elapsed_s, avg_hr, max_hr, calories, ascent_m, descent_m, city。
- 靴: shoe（Zepp登録名そのまま）, shoe_total_km, shoe_target_km。
- splits: km, sec, hr, 最終端数はpartial_mとpace_s_km。
- series: pace（秒/km）, hr（bpm）, cadence（spm）, power（W）, gct（ms）,
  vo（mm）, vr（%）, stride（m）。完全100m区間の中央距離mと値の配列。
- elevation: [距離km, 標高m]。
- aggregates: avg_pace_s_km, pace_first_half_s_km, pace_second_half_s_km,
  hr_first_half, hr_second_half, hr_drift_pct, cadence_avg, cadence_first_half,
  cadence_second_half, gct_avg_ms, power_avg_w, vo_avg_mm, vr_avg_pct,
  stride_avg_m, fastest_km, slowest_km, first_km_s, last_km_s。
- レース専用race: race（大会名）, edition, date（表示文字列）, net,
  first_half, second_half, yoy5k。
- month.raceにshoe / shoe_total_km / shoe_target_kmを追加。gearを7足分出力。
  旧公開JSONにはgearがなかったが、現行prepに存在していたセクションを反映。
- レースのmeta / km / splits5k / elevation / yoy5kは従来表示との互換用に保持。

## 既存値との比較

福岡: 距離42,457m、経過14,269秒、平均心拍151、最大170、
asics Magic Speed 5累計79.6km／目標700km。すべて既存公開値と一致。
公式ネット3:57:48、前半1:59:45、後半1:58:03も維持。
注意: 既存月次の経過は3:57:49で公式ネットとは1秒差、
GPS timelineの最終offsetは14,270秒。既存値を変えない方針で別々に保持した。
GPS累積は約42.384kmで、履歴サマリ42.457kmとは異なる。
公開サマリは履歴値、スプリット・系列は従来同様GPS累積を使用。
レース獲得177m／下降155m、1kmスプリット42本＋端数384mを追加。
初km377秒／最終完走km314秒。既存レースのmeta、5km表、kmグラフ用値、
高低図、前年比較は全要素の比較で一致。

| 練習 | 距離m | 経過秒 | 靴累計km |
|---|---:|---:|---:|
| 2026-11-03-pm | 6794 | 2785 | 28.2 |
| 2026-11-05-night | 4471 | 1734 | 32.6 |
| 2026-11-06-night | 4479 | 1800 | 37.1 |
| 2026-11-12-night | 4185 | 1644 | 77.2 |
| 2026-11-14-pm | 11723 | 4598 | 111.2 |
| 2026-11-16-am | 5043 | 2100 | 82.2 |

6件すべて既存公開値と一致。月合計36.70km／14,661秒（4:04:21）、
レース込み79.15km（表示79.2km）を維持。
既存の系列・標高値・coach_metrics各値も一致（標高距離の単位変換を除く）。
既存の1kmスプリットは全行一致。11/16のみ従来切り捨てていた端数34mを追加。
元の生データはリポジトリへコピーしていない。出力JSONの全キーを再帰検査し、
緯度経度・timestamp・locationが含まれないことを確認。

## 実行結果

- 両prep: 成功。Python標準ライブラリのみ、既定パスから再生成。
- `node scripts/build.mjs`: 成功。トップ・レース・月次・セッション6ページを生成。
- `python3 scripts/verify-data.py`: PASS。7セッション、8系列、集計、単位、
  公開値、座標不在、生成ページの靴とチャート数を検証。
- `node scripts/verify-charts.cjs`: PASS。実際のチャートJSをVMで実行、
  45チャートのアダプタ処理、距離変換、標高km、ペース反転、月次処理を検証。
- `git diff --check`: PASS。
- `node scripts/verify.cjs`: 実行したがMODULE_NOT_FOUND: playwrightで起動失敗。
- `node scripts/verify-training.cjs`: 同じ理由で起動失敗。Chromiumも未導入。

## 残課題・引き継ぎ

- ブラウザverifyを通すにはPlaywrightとChromiumが必要。CDNのChart.js・
  フォントも使用するため、オフライン実行には別途ローカル配信が必要。
  現環境でブラウザ検証を通したとは扱わない。
- CIは作成済み、実デプロイは未実行。GitHub SecretsのCLOUDFLARE_API_TOKENと
  CLOUDFLARE_ACCOUNT_IDを設定する。個人設定のaccount_idとの一致をCIで検査し、
  `npx --no-install wrangler deploy --config wrangler.personal.toml`を実行する。
  トークンはCI環境変数から渡し、ローカルの認証情報には依存しない。
- ネットワーク不使用。git commit / pushは実行せず、変更はワーキングツリーに残した。
