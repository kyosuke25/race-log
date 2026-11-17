# ローカルデータ整形

リポジトリのルートから実行:

```sh
python3 scripts/prep/prep_fukuoka.py
python3 scripts/prep/prep_training.py
node scripts/build.mjs
python3 scripts/verify-data.py
node scripts/verify-charts.cjs
```

両ラッパは `--source DIRECTORY` / `--output FILE` に対応する。
既定の入力は `~/workspace/fukuoka-page` / `~/workspace/training-page`。
Python標準ライブラリのみ使用。元のprepスクリプトは不要。
生データ・GPS座標は入力元に残し、リポジトリへコピーしない。
`race_metadata.json` は公式記録・大会情報・前年比較の公開編集データ。

`data.json.session` と `training-2026-11.json.sessions[]` が共通スキーマ。
日付と開始時刻はJST。`label` は既存の朝ラン等の表示ラベルを保持。
距離・経過時間のサマリは既存公開値との互換のためZepp履歴値を保持する。
スプリットと系列の距離はGPS haversine累積、時刻は経過offsetの線形補間。
100m系列は完全な100m区間の中央距離（m）。平均は区間内の有効サンプル平均。
ストライドはm単位で小数3桁、他のセンサー平均は小数1桁。
欠測センサー値はnull。elevationの距離単位は全セッションでkm、標高はm。
1km未満の最終区間もpartial_mを付け、pace_s_kmで距離補正する。

`aggregates` は旧coach_metricsの計算法を維持。心拍・ケイデンスの前後半は
経過時間の半分、ペースの前後半は完走1kmスプリットの本数を半分に分ける。
心拍ドリフトは後半心拍/前半心拍の増加率。最速・最遅は完走1kmのみ。

福岡のsession.elapsed_sは既存月次JSONの14,269秒（3:57:49）を保持。
公式ネットはrace.netの3:57:48。GPS timelineの最終offsetは14,270秒。
3つは元データから異なるため、相互に置き換えない。
従来のレース表示用km / splits5k / elevation / yoy5k / metaも保持する。
5km表は丸め前のGPS補間時刻から計算し、既存表示と完全一致させている。
これらは互換用の公開派生データで、セッションの正規スキーマではない。

ブラウザ検証にはPlaywright、Chromiumとローカル配信サーバーが必要。
既存verifyはChart.jsとフォントをCDNから読むため、完全オフライン実行には
別途それらのローカル配信設定も必要。verify-data.py / verify-charts.cjsは
依存インストール・ネットワーク・サーバー不要で実行できる。
