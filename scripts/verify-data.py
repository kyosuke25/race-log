#!/usr/bin/env python3
"""Offline regression checks for public session schema and published headlines."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
race = json.loads((root / 'public/data.json').read_text())
training = json.loads((root / 'public/training-2026-11.json').read_text())
sessions = [race['session'], *training['sessions']]
required = set('track_id slug date weekday start_time kind distance_m elapsed_s avg_hr max_hr calories ascent_m descent_m city shoe shoe_total_km shoe_target_km splits series elevation aggregates'.split())
metrics = set('avg_pace_s_km pace_first_half_s_km pace_second_half_s_km hr_first_half hr_second_half hr_drift_pct cadence_avg cadence_first_half cadence_second_half gct_avg_ms power_avg_w vo_avg_mm vr_avg_pct stride_avg_m fastest_km slowest_km first_km_s last_km_s'.split())
for s in sessions:
    assert required <= s.keys(), s['slug']
    assert metrics <= s['aggregates'].keys(), s['slug']
    assert set(s['series']) == set('pace hr cadence power gct vo vr stride'.split())
    for key, points in s['series'].items():
        assert points and any(v is not None for _, v in points), (s['slug'], key)
        assert all(x == 50 + i * 100 for i, (x, _) in enumerate(points))
    assert s['elevation'] and max(x for x, _ in s['elevation']) <= s['distance_m']/1000 + .1
    assert [sp['km'] for sp in s['splits']] == list(range(1,len(s['splits'])+1))
    assert all({'km','sec','hr'} <= sp.keys() for sp in s['splits'])
    assert s['splits'][-1]['partial_m'] > 0
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
assert r['race']['net'] == '3:57:48'
assert (r['ascent_m'],r['descent_m']) == (177,155)
assert len(r['splits']) == 43
assert (r['splits'][0]['sec'],r['splits'][41]['sec']) == (377,314)
expected = [(6794,2785,28.2),(4471,1734,32.6),(4479,1800,37.1),(4185,1644,77.2),(11723,4598,111.2),(5043,2100,82.2)]
assert [(s['distance_m'],s['elapsed_s'],s['shoe_total_km']) for s in training['sessions']] == expected
assert training['month']['training_km'] == 36.7
assert training['month']['training_time_s'] == 14661
assert training['month']['total_km_with_race'] == 79.15
assert training['month']['race']['shoe_total_km'] == r['shoe_total_km']
assert training['gear']
for s in sessions:
    path = root / 'public' / ('fukuoka-2026.html' if s['kind']=='race' else f'training/{s["slug"]}.html')
    html = path.read_text()
    assert s['shoe'] in html
    assert html.count('<canvas ') == (7 if s['kind']=='race' else 6)
print('PASS: 7 unified sessions; 8 sensor series each; elevation km; partial splits; all aggregates; no coordinate/private keys; published headlines; generated page shoes and charts.')
