# 月次トレーニング記録の記事化ワークフロー

## 全体像

サイトは run.kyosuke.tokyo、リポジトリは `kyosuke25/race-log`。`master` へ push すると、GitHub Actions が `node scripts/build.mjs` を実行し、個人 Cloudflare 環境へデプロイする。

対象はトレーニング記録の月次ページと、そこからリンクするセッション記事。入力元は `~/workspace/training-page` とし、生データはリポジトリに入れない。レース記事は `prep_fukuoka.py` と `race_metadata.json` を使う別フローで、この手順の対象外。

## 時間の基準

- 練習はムービングタイム（moving）を基準に評価・表示する。見出し、平均ペース、1 km スプリット、ペースグラフ、月次の練習累計に適用する。経過時間を併記する場合は、停止込みのウォッチ計測値に「参考・経過時間」と付ける。
- レースは停止を含む経過時間（elapsed）が基準。結果と月次一覧のレース行は公式ネットタイムを使い、平均ペースは公認距離で計算する。ウォッチ由来のスプリットとグラフも停止を含む計測時間で算出する。

## 手順1　Zepp から取得

次の形式でヘルパーを呼び出す。`<tool>` と `<args.json>` はツール名と引数ファイルのパスに置き換える。

```sh
python3 ~/workspace/custom-connectors/custom.zepp/bin/client.py call-tool --name <tool> --arguments-file <args.json>
```

1. `list_workouts` を実行し、出力をそのまま `~/workspace/training-page/list_workouts_raw.json` に上書き保存する。
2. `list_workouts` の履歴から、`public/training-YYYY-MM.json` の `month.through` より後の日付のワークアウトを未記事化の対象として選ぶ。
3. 対象ごとに `get_workout` を実行する。引数は `{"track_id":"<id>","source":"run.11145475.huami.com"}` とし、`<id>` を対象の track ID に置き換える。引数ファイルは入力元の `raw/gw-<trackid>-args.json` に残し、出力はそのまま `raw/get_<trackid>.json` に保存する。
4. シューズ名の解決に必要な場合は `list_gear` を実行し、入力元の `list_gear_raw.json` を更新する。記事には Zepp の登録名をそのまま使う。

## 手順2　prep

リポジトリルートで実行する。既定の入力元は `~/workspace/training-page`、出力先は `public/training-YYYY-MM.json`。

```sh
python3 scripts/prep/prep_training.py
```

距離と `moving_s` には Zepp の履歴値を使い、練習の `elapsed_s` には停止込みの `totalTimeWithMillis` を秒に換算して格納する。系列とスプリットは `metadata.currentDistance` を線形補間し、`metadata.pause` と距離が進まないタイムラインの空白を除く。再生成時に取得する生データはリポジトリ外の `mktemp -d` に保存し、`--source` と `--training-source` で指定する。詳細は [ローカルデータ整形](README.md) を参照する。

## 手順3　コメント

- [コーチのペルソナ](coach-persona.md) に厳密に従う。作成前に「相手の前提」の対象月や次のレースなどが当月の文脈と合っているか確認する。ずれがあればペルソナを独断で書き換えず、その旨を作業報告に明記する。
- `public/comments.json` の `comments` 配下に slug をキーとして追加する。各値は `menu`（文字列）、`purpose`（文字列）、`recap`（文字列）、`good`（配列）、`next`（配列）を持つオブジェクト。ページの見出しは英語の Menu / Purpose / Recap / Good / Next。`build.mjs` はこのファイルを直接読み、対象の slug にコメントがなければビルドが失敗する。
- 練習はムービングタイムの数値を根拠に評価し、ペースの秒/km は「分：秒/km」に換算する。コメントに出す km 番号と値はセッション記事のスプリット表に合わせる。本練などの区間を指す場合は「本練の入り」「終盤」のように書く。ページやコメントには作業履歴を書かない。
- ヒーロー画像は `public/images/training/<slug>.webp`（なければ `<slug>.jpg`）に置き、同名の `.txt` に alt を1行書く。ファイルがなければページは従来どおり。レースは `public/images/races/<slug>.webp`（なければ `.jpg`）と同じ `.txt`。
- ヒーローがあるページはビルド時に `public/images/og/<slug>.jpg`（1200×630）を作る。ヒーローをカバーで敷き、下部のグラデーションの上へ、日付・距離・ペースだけを Barlow Condensed で載せる。トレーニングの距離はメートルを km にして小数第2位、ペースはムービングタイム基準。福岡は公式ネットと 42.195 km。`og:image` は `https://run.kyosuke.tokyo/images/og/<slug>.jpg`。ヒーローが無いページには付けない。生成には ffmpeg が必要で、デプロイの CI でも入れる。

### ヒーロー画像の猫と alt

- ヒーロー画像に登場させる猫は、キジトラの「さんくん」とチンチラシルバーの「ジャスミン」の2匹に限る。
- 画像と同名の `.txt` に書く alt の基本形は「（場所・場面）で先輩を待つキジトラのさんくん」または「（場所・場面）で先輩を待つチンチラシルバーのジャスミン」。場所や場面の描写は記事ごとに変えてよいが、品種と名前の組み合わせは固定する。
- 「白い猫」「茶トラ」「名前なしの猫」といった表記は禁止。茶トラとキジトラは別の柄なので、さんくんを茶トラと書かない。
- 画像生成のプロンプトには品種・毛色・毛の長さを明記する。さんくんはキジトラ柄の短毛、ジャスミンは銀白色の長毛のチンチラシルバーと指定する。生成した画像の猫と alt の指定が一致することを確認してから使う。

## 手順4　build

リポジトリルートで実行する。

```sh
node scripts/build.mjs
```

全ページが再生成される。実行後に `git diff` で、`fukuoka-2026.html` や `data.json` などのレース側ファイルに意図しない差分が出ていないことを確認する。

## 手順5　verify

セッション追加時は `scripts/verify-data.py` のハードコードされた期待値を更新する。値を確定する前に、生成 JSON と `list_workouts_raw.json` の Zepp 履歴を必ず突き合わせる。

- `expected` のセッション一覧（距離、`moving_s`、シューズ累計）
- 月次集計の `training_km`、`training_time_s`、`total_km_with_race`
- 最終セッションの `track_id` と `start_time`
- `training_sessions` の件数

リポジトリルートで次を実行し、`PASS` を確認する。

```sh
python3 scripts/verify-data.py
```

表示は公開後に実サイトで確認する。

## 手順6　push と公開確認

1. push 前に `git status` で意図したファイルだけが変更されていることを確認する。ヘルパーは作業ツリーの全変更を 1 コミットにまとめる。
2. 次を実行する。

   ```sh
   python3 ~/workspace/custom-connectors/custom.github/bin/client.py push ~/workspace/race-log "<変更内容のメッセージ>"
   ```

3. GitHub Actions の完了（数分）を待つ。実サイトで新規記事 `https://run.kyosuke.tokyo/training/<slug>.html` と対象の月次ページを開き、数値、シューズ、コメントが表示されることを確認する。

## 品質チェックリスト

- [ ] 数値が Zepp 履歴と一致する（距離、`moving_s`、心拍、シューズ累計）。スプリット合計がムービングタイムと数秒以内で一致する。
- [ ] 新規の全セッションにコメントがある。
- [ ] `verify-data.py` が `PASS` する。
- [ ] レース側ファイルに差分がない。
- [ ] 実サイトで新規記事が表示される。
