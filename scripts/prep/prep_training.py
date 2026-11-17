#!/usr/bin/env python3
"""Prepare public JSON from local Zepp exports; never copies raw data."""
import argparse
import json
from pathlib import Path
from session_schema import prepare

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=Path.home() / 'workspace' / 'training-page')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2] / 'public' / 'training-2026-11.json')
args = parser.parse_args()
out = prepare(args.source)
history = json.loads((args.source / 'list_workouts_raw.json').read_text())
tracks = json.loads(history['content'][0]['text'])['items']
race_track = next(track for track in tracks if str(track['trackid']) == '1794093775')
out['month']['race'].update({
    'avg_hr': int(float(race_track['avg_heart_rate'])),
    'max_hr': int(float(race_track['max_heart_rate'])),
})
args.output.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
print(f'Wrote {args.output}')
