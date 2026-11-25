#!/usr/bin/env python3
"""Offline regression checks for public session schema and published headlines."""
import argparse
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
race = json.loads((root / 'public/data.json').read_text())
training = json.loads((root / 'public/training-2026-11.json').read_text())
sessions = [race['session'], *training['sessions']]

def html_esc(value):
    return (str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            .replace('"', '&quot;').replace("'", '&#39;'))

def comment_items(items):
    return ''.join(f'<li>{html_esc(item)}</li>' for item in items)

comments = json.loads((root / 'public/comments.json').read_text())['comments']
training_slugs = [s['slug'] for s in training['sessions']]
assert list(comments) == training_slugs, (list(comments), training_slugs)
for session in training['sessions']:
    comment = comments[session['slug']]
    assert list(comment) == ['menu', 'purpose', 'recap', 'good', 'next'], (session['slug'], list(comment))
    for key in ('menu', 'purpose', 'recap'):
        assert isinstance(comment[key], str) and comment[key], (session['slug'], key)
    for key in ('good', 'next'):
        assert (isinstance(comment[key], list) and comment[key]
                and all(isinstance(item, str) and item for item in comment[key])), (session['slug'], key)
    page = (root / 'public' / 'training' / f'{session["slug"]}.html').read_text()
    expected = (
        '<section class="manager-comments"><h2>マネージャーのコメント</h2>'
        f'<h3>Menu</h3><p class="comment-menu">{html_esc(comment["menu"])}</p>'
        f'<h3>Purpose</h3><p class="comment-purpose">{html_esc(comment["purpose"])}</p>'
        f'<h3>Recap</h3><p class="comment-recap">{html_esc(comment["recap"])}</p>'
        f'<h3>Good</h3><div class="comment-good"><ul>{comment_items(comment["good"])}</ul></div>'
        f'<h3>Next</h3><div class="comment-next"><ul>{comment_items(comment["next"])}</ul></div></section>'
    )
    assert expected in page, session['slug']
    assert 'comment-summary' not in page and 'comment-improve' not in page, session['slug']
    assert '<h3>総評</h3>' not in page and '<h3>良かった点</h3>' not in page and '<h3>改善点</h3>' not in page, session['slug']

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--race-source', type=Path, default=Path.home() / 'workspace/fukuoka-page')
parser.add_argument('--training-source', type=Path, default=Path.home() / 'workspace/training-page')
args = parser.parse_args()
histories = {}
for kind, source in [('race', args.race_source), ('training', args.training_source)]:
    raw = json.loads((source / 'list_workouts_raw.json').read_text())
    histories[kind] = {str(it['trackid']): it for it in json.loads(raw['content'][0]['text'])['items']}
summary_fields = {
    'vo2max': ('VO2_max', 1), 'aerobic_te': ('te', 10),
    'anaerobic_te': ('anaerobic_te', 10), 'exercise_load': ('exercise_load', 1),
    'total_steps': ('total_step', 1), 'max_power_w': ('max_power', 1),
    'max_vo_mm': ('maxVo', 1), 'min_gct_ms': ('minGct', 1),
    'equiv_pace_s_km': ('avgEquivPace', 1), 'best_equiv_pace_s_km': ('bestEquivPace', 1),
    'equiv_distance_m': ('equivDistance', 100), 'rpe': ('rpe', 1),
}
for session in sessions:
    item = histories[session['kind']][str(session['track_id'])]
    expected = {}
    for name, (source, divisor) in summary_fields.items():
        raw = item.get(source)
        if raw is not None and raw != '' and float(raw) > 0:
            expected[name] = round(float(raw) / divisor) if name == 'equiv_distance_m' else float(raw) / divisor
    raw = item.get('heart_range')
    if raw and raw not in ('0', '-1', '-274'):
        zones = []
        for pair in raw.split(';'):
            if pair.strip():
                seconds, under = map(int, pair.split(','))
                if seconds >= 0 and under > 0:
                    zones.append({'under_bpm': under, 'seconds': seconds})
        if any(z['seconds'] > 0 for z in zones):
            expected['hr_zones'] = zones
    raw = item.get('weatherInfo')
    if raw and raw.strip() not in ('0', '-1', '-274'):
        expected['weather_info_raw'] = raw
    for key in [*summary_fields, 'hr_zones', 'weather_info_raw']:
        actual = session['aggregates']
        assert (key in actual) == (key in expected), (session['slug'], key, 'presence')
        if key in expected:
            assert actual[key] == expected[key], (session['slug'], key, actual[key], expected[key])
required = set('track_id slug date weekday start_time kind distance_m elapsed_s avg_hr max_hr calories ascent_m descent_m city shoe shoe_total_km shoe_target_km splits series elevation aggregates'.split())
metrics = set('avg_pace_s_km pace_first_half_s_km pace_second_half_s_km hr_first_half hr_second_half hr_drift_pct cadence_avg cadence_first_half cadence_second_half gct_avg_ms power_avg_w vo_avg_mm vr_avg_pct stride_avg_m fastest_km slowest_km first_km_s last_km_s'.split())
for s in sessions:
    assert required <= s.keys(), s['slug']
    assert metrics <= s['aggregates'].keys(), s['slug']
    assert set(s['series']) == set('pace hr cadence power gct vo vr stride speed'.split())
    for key, points in s['series'].items():
        assert points and any(v is not None for _, v in points), (s['slug'], key)
        assert all(x == 50 + i * 100 for i, (x, _) in enumerate(points))
    assert [sp['km'] for sp in s['splits']] == list(range(1,len(s['splits'])+1))
    assert all({'km','sec','hr'} <= sp.keys() for sp in s['splits'])
    partial_m = s['splits'][-1]['partial_m']
    assert 0 < partial_m <= 1000
    gps_distance_km = len(s['splits']) - 1 + partial_m / 1000
    # Splits and elevation share the GPS distance. Allow for rounding to meters
    # in splits and hundredths of a kilometer in the race elevation profile.
    assert s['elevation'] and max(x for x, _ in s['elevation']) <= gps_distance_km + .006, s['slug']
    assert s['kind'] in ('race', 'training')

def private_keys(value):
    if isinstance(value, dict):
        for k,v in value.items():
            assert not any(word in k.lower() for word in ('latitude', 'longitude', 'timestamp', 'location')), k
            private_keys(v)
    elif isinstance(value,list):
        for v in value: private_keys(v)
private_keys(race)
private_keys(training)
r = race['session']
assert (r['distance_m'],r['elapsed_s'],r['avg_hr'],r['max_hr'],r['shoe_total_km'],r['shoe_target_km']) == (42457,14269,151,170,79.6,700)
assert len(r['aggregates']['hr_zones']) == 6
assert abs(sum(z['seconds'] for z in r['aggregates']['hr_zones']) - r['elapsed_s']) <= 5
assert r['race']['net'] == '3:57:48'
assert (r['ascent_m'],r['descent_m']) == (177,155)
assert len(r['splits']) == 43
assert (r['splits'][0]['sec'],r['splits'][41]['sec']) == (377,314)
expected = [
    (6794, 2785, 28.2),
    (4471, 1734, 32.6),
    (4479, 1800, 37.1),
    (4185, 1644, 77.2),
    (11723, 4598, 111.2),
    (5043, 2100, 82.2),
    (5132, 2028, 87.4),
    (11006, 4613, 37.5),
    (5049, 2107, 116.3),
    (10400, 3697, 18.5),
    (13522, 7980, None),
    (4266, 1724, 91.6),
    (5193, 2162, 121.5),
    (11003, 4500, 48.5),
]
assert [(s['distance_m'],s['elapsed_s'],s['shoe_total_km']) for s in training['sessions']] == expected
assert training['month']['training_km'] == 102.27
assert training['month']['training_time_s'] == 43472
assert training['month']['total_km_with_race'] == 144.72
assert training['month']['race']['shoe_total_km'] == r['shoe_total_km']
assert training['sessions'][-1]['track_id'] == '1795559161'
assert [(s['slug'], s['start_time']) for s in training['sessions'][-3:]] == [
    ('2026-11-23-pm', '15:47'),
    ('2026-11-24-am', '07:24'),
    ('2026-11-25-am', '07:26'),
]
assert training['month']['training_sessions'] == 14
assert training['gear']
detail_labels = {
    'vo2max': ('VO2max', ''), 'aerobic_te': ('有酸素TE', ''),
    'anaerobic_te': ('無酸素TE', ''), 'exercise_load': ('運動負荷', ''),
    'total_steps': ('総歩数', ' 歩'), 'max_power_w': ('最大パワー', ' W'),
    'max_vo_mm': ('最大上下動', ' mm'), 'min_gct_ms': ('最小接地時間', ' ms'),
    'equiv_pace_s_km': ('等価ペース', ' /km'),
    'best_equiv_pace_s_km': ('ベスト等価ペース', ' /km'),
    'equiv_distance_m': ('等価距離', ' m'), 'rpe': ('RPE', ''),
}
for s in sessions:
    path = root / 'public' / ('fukuoka-2026.html' if s['kind']=='race' else f'training/{s["slug"]}.html')
    html = path.read_text()
    shoe = s['shoe'] if s['shoe'] is not None else '—'
    assert f'<dt>シューズ</dt><dd>{html_esc(shoe)}</dd>' in html, s['slug']
    assert ('<dt>シューズ累計／目標</dt>' in html) == (s['shoe'] is not None), s['slug']
    a = s['aggregates']
    assert ('<h2 id="details">詳細データ</h2>' in html) == any(k in a for k in detail_labels)
    for key, (label, unit) in detail_labels.items():
        assert (f'<dt>{label}</dt>' in html) == (key in a), (s['slug'], key)
        if key in a:
            value = a[key]
            if key.endswith('pace_s_km'):
                seconds = int(value + .5)
                value = f'{seconds // 60}:{seconds % 60:02d}'
            elif isinstance(value, float) and value.is_integer():
                value = int(value)
            assert f'<dt>{label}</dt><dd>{value}{unit}</dd>' in html, (s['slug'], key)
    zones = a.get('hr_zones', [])
    total = sum(z['seconds'] for z in zones)
    assert ('<h2 id="hr-zones">心拍ゾーン</h2>' in html) == bool(total)
    for z in zones:
        percent = f"{z['seconds'] / total * 100:.1f}"
        assert (f"<dt>上限 {z['under_bpm']} bpm</dt><dd>{z['seconds']} 秒（{percent}%）"
                f'<span class="shoe-bar" aria-hidden="true"><span style="width:{percent}%"></span></span>') in html
    assert 'weather_info_raw' not in html
    if a.get('weather_info_raw'):
        assert a['weather_info_raw'] not in html
    if s['kind'] == 'race':
        assert '<dt>VO2max</dt><dd>49</dd>' in html
        assert '<dt>総歩数</dt><dd>41666 歩</dd>' in html
        assert '<dt>上限 153 bpm</dt><dd>9116 秒（' in html
    assert html.count('<canvas ') == (7 if s['kind']=='race' else 6)
print(f'PASS: {len(sessions)} unified sessions; 9 sensor series each; history summary values and invalid-value omission; elevation km; partial splits; all aggregates; no coordinate/private keys; published headlines; generated page shoes and charts; optional detail tiles and HR zone seconds/percentages/bars on all pages; Fukuoka VO2max 49, steps 41666, 153 bpm / 9116 seconds; raw weather omitted; training comments are menu/purpose/recap/good/next.')
