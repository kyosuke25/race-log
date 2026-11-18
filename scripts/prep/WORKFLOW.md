# 月次トレーニング記録の記事化ワークフロー

## 全体像

サイトは run.kyosuke.tokyo、リポジトリは `kyosuke25/race-log`。`master` へ push すると、GitHub Actions が `node scripts/build.mjs` を実行し、個人 Cloudflare 環境へデプロイする。

対象はトレーニング記録の月次ページと、そこからリンクするセッション記事。入力元は `~/workspace/training-page` とし、生データはリポジトリに入れない。レース記事は `prep_fukuoka.py` と `race_metadata.json` を使う別フローで、この手順の対象外。

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

距離と時間のサマリには Zepp の履歴値を使う。`elapsed_s` には履歴の `run_time` を採用し、総経過の `totalTimeWithMillis` は使わない。系列とスプリットは GPS から算出する。詳細は [ローカルデータ整形](README.md) を参照する。

## 手順3　コメント

- [コーチのペルソナ](coach-persona.md) に厳密に従う。作成前に「相手の前提」の対象月や次のレースなどが当月の文脈と合っているか確認する。ずれがあればペルソナを独断で書き換えず、その旨を作業報告に明記する。
- `public/comments.json` の `comments` 配下に slug をキーとして追加する。各値は `summary`（文字列）、`good`（配列）、`improve`（配列）を持つオブジェクト。`build.mjs` はこのファイルを直接読み、対象の slug にコメントがなければビルドが失敗する。
- 新規セッション分だけ作成し、既存のコメントは変更しない。数値を根拠に評価し、ペースの秒/km は「分：秒/km」に換算して記載する。評価は経過時間を基準にする。

## 手順4　build

リポジトリルートで実行する。

```sh
node scripts/build.mjs
```

全ページが再生成される。実行後に `git diff` で、`fukuoka-2026.html` や `data.json` などのレース側ファイルに意図しない差分が出ていないことを確認する。

## 手順5　verify

セッション追加時は `scripts/verify-data.py` のハードコードされた期待値を更新する。値を確定する前に、生成 JSON と `list_workouts_raw.json` の Zepp 履歴を必ず突き合わせる。

- `expected` のセッション一覧（距離、`elapsed_s`、シューズ累計）
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

- [ ] 数値が Zepp 履歴と一致する（距離、`elapsed_s`、心拍、シューズ累計）。
- [ ] 新規の全セッションにコメントがある。
- [ ] `verify-data.py` が `PASS` する。
- [ ] レース側ファイルに差分がない。
- [ ] 実サイトで新規記事が表示される。
