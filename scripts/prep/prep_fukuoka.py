#!/usr/bin/env python3
"""Prepare public JSON from local Zepp exports; never copies raw data."""
import argparse
import json
from pathlib import Path
from session_schema import prepare

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=Path.home() / 'workspace' / 'fukuoka-page')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2] / 'public' / 'data.json')
args = parser.parse_args()
session, details = prepare(args.source, race_mode=True)
metadata = json.loads(Path(__file__).with_name('race_metadata.json').read_text())
m = metadata['meta']
m.update(avg_hr=session['avg_hr'], max_hr=session['max_hr'], shoes=session['shoe'],
         shoe_total_km=session['shoe_total_km'], shoe_target_km=session['shoe_target_km'])
session['slug'] = 'fukuoka-2026'
session['race'] = {k: m[k] for k in ('race', 'edition', 'date', 'net', 'first_half', 'second_half')}
session['race']['yoy5k'] = metadata['yoy5k']
# Keep precise legacy chart samples and 5km table as presentation data.
out = {'meta': m, 'session': session, **details, 'elevation': session['elevation'], 'yoy5k': metadata['yoy5k']}
args.output.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
print(f'Wrote {args.output}')
