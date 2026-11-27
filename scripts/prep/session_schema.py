"""Shared Zepp session preparation. Raw coordinates are read locally only.

Headline distance/time retain Zepp history values for published compatibility;
splits and chart distances use haversine GPS accumulation and elapsed offsets.
Elevation is always expressed in km / m. Missing sensor values remain null.
"""
import json, math, datetime

# History summary fields share aggregates for race and training.
SUMMARY_FIELDS = {
    'vo2max': ('VO2_max', 1),
    'aerobic_te': ('te', 10),
    'anaerobic_te': ('anaerobic_te', 10),
    'exercise_load': ('exercise_load', 1),
    'total_steps': ('total_step', 1),
    'max_power_w': ('max_power', 1),
    'max_vo_mm': ('maxVo', 1),
    'min_gct_ms': ('minGct', 1),
    'equiv_pace_s_km': ('avgEquivPace', 1),
    'best_equiv_pace_s_km': ('bestEquivPace', 1),
    'equiv_distance_m': ('equivDistance', 100),
    'rpe': ('rpe', 1),
}


def history_aggregates(item):
    result = {}
    for name, (source, divisor) in SUMMARY_FIELDS.items():
        raw = item.get(source)
        if raw is None or raw == '':
            continue
        value = float(raw)
        if not math.isfinite(value) or value <= 0:
            continue
        value /= divisor
        result[name] = (round(value) if name == 'equiv_distance_m'
                        else value if divisor != 1 else int(value) if value.is_integer() else value)
    raw = item.get('heart_range')
    if raw and raw not in ('0', '-1', '-274'):
        zones = []
        for pair in raw.split(';'):
            if not pair.strip():
                continue
            seconds, under = map(int, pair.split(','))
            if seconds >= 0 and under > 0:
                zones.append({'under_bpm': under, 'seconds': seconds})
        if zones and any(z['seconds'] > 0 for z in zones):
            result['hr_zones'] = zones
    weather = item.get('weatherInfo')
    if weather and weather.strip() not in ('0', '-1', '-274'):
        result['weather_info_raw'] = weather
    return result


def prepare(base, race_mode=False):
    race_details = {}
    BASE = str(base)
    JST = datetime.timezone(datetime.timedelta(hours=9))
    R = 6371008.8

    def hav(a, b):
        la1, lo1 = math.radians(a[0]), math.radians(a[1])
        la2, lo2 = math.radians(b[0]), math.radians(b[1])
        h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
        return 2 * R * math.asin(math.sqrt(h))

    def load_tool_result(path):
        raw = json.load(open(path))
        return json.loads(raw['content'][0]['text'])

    # ---- gear map ----
    # Naming rule (user, 2026-11-17): differences from official product names are
    # fine; what matters is consistency WITHIN the data. Canonical form = Zepp's
    # registered name verbatim (the race-log repo unified on it, e.g.
    # "asics Magic Speed 5"). No normalization.
    def display_name(raw):
        return raw

    gear = load_tool_result(f'{BASE}/list_gear_raw.json')
    gear_name = {}
    for gid, lst in (gear.get('gear_by_id') or {}).items():
        if lst:
            gear_name[gid] = display_name(lst[0].get('name'))

    # ---- history ----
    hist = load_tool_result(f'{BASE}/list_workouts_raw.json')['items']
    by_id = {it['trackid']: it for it in hist}

    # per-session shoe cumulative: gear total minus distances of later runs on the same gear
    # (history counts match gear totalCount, so this is exact within the pulled history)
    gear_by_id_full = {}
    for it in (gear.get('items') or []):
        gear_by_id_full[it.get('gearId')] = it
    shoe_total_after = {}
    for gid, git in gear_by_id_full.items():
        runs = [it for it in hist if it.get('gearId') == gid]
        runs.sort(key=lambda it: int(it['end_time']) - int(it['run_time']))
        total = float(git.get('totalDistanceM') or 0)
        # list_gear can lag a run that is already in history. Use the larger
        # figure so that run's cumulative includes its own distance.
        hist_sum = sum(float(it['dis']) for it in runs)
        if hist_sum > total:
            total = hist_sum
        later = 0.0
        for it in reversed(runs):
            shoe_total_after[it['trackid']] = total - later
            later += float(it['dis'])

    RACE_ID = '1794093775'  # Fukuoka Marathon 2026 -> race article, not a session page

    def daypart_label(dt, dist_km):
        if dist_km >= 10:
            return 'ロングラン'
        h = dt.hour
        if 5 <= h < 11:
            return '朝ラン'
        if 11 <= h < 17:
            return '昼ラン'
        if 17 <= h < 23:
            return '夜ラン'
        return '深夜ラン'

    def slug_for(dt, dist_km):
        h = dt.hour
        part = 'am' if 5 <= h < 12 else ('pm' if 12 <= h < 17 else 'night')
        return dt.strftime('%Y-%m-%d') + '-' + part

    def process(trackid):
        it = by_id[trackid]
        t = load_tool_result(f'{BASE}/get_workout_raw.json' if race_mode else f'{BASE}/raw/get_{trackid}.json')
        if race_mode:
            indexed = {r['offset_s']: r for r in t['timeline']}
            for stream in t['streams'].values():
                for row in stream:
                    if row['offset_s'] in indexed:
                        indexed[row['offset_s']].update(row)
        tl = sorted(t['timeline'], key=lambda r: r['offset_s'])
        start = datetime.datetime.fromtimestamp(int(it['end_time']) - int(it['run_time']), JST)
        # run_time excludes pauses, so end_time - run_time is later than the
        # recorded start. Keep the historical calculation for other published sessions.
        if trackid in {
            '1794868431', '1795004813', '1795041402', '1795126819', '1795228002',
            '1795416468', '1795472674', '1795559161', '1795647160', '1795732373',
        }:
            start = datetime.datetime.fromtimestamp(int(t['start_time_unix']), JST)
        # cumulative GPS distance
        cum = {}
        d = 0.0
        prev = None
        for r in tl:
            o = r['offset_s']
            lat, lon = r.get('latitude'), r.get('longitude')
            if lat is not None and lon is not None:
                p = (lat, lon)
                if prev is not None:
                    d += hav(prev, p)
                prev = p
            cum[o] = d
        offs = [r['offset_s'] for r in tl]
        rows = {r['offset_s']: r for r in tl}
        total_gps = d

        def time_at(dist):
            prev_o, prev_d = offs[0], cum[offs[0]]
            for o in offs:
                dd = cum[o]
                if dd >= dist:
                    if dd == prev_d:
                        return float(o)
                    return prev_o + (o - prev_o) * (dist - prev_d) / (dd - prev_d)
                prev_o, prev_d = o, dd
            return float(offs[-1])

        def window_avg(field, t0, t1):
            vals = [rows[o][field] for o in offs if t0 <= o < t1 and rows[o].get(field) is not None]
            return round(sum(vals) / len(vals), 3 if field == 'stride_m' else 1) if vals else None

        # 1 km splits (GPS), final partial included
        splits = []
        full = int(total_gps // 1000)
        bounds = [time_at(k * 1000) for k in range(full + 1)]
        if race_mode:
            bounds[0] = 0.0
        for k in range(full):
            t0, t1 = bounds[k], bounds[k + 1]
            splits.append({'km': k + 1, 'sec': round(t1 - t0), 'hr': window_avg('heart_rate_bpm', t0, t1)})
        rem = total_gps - full * 1000
        if rem > 0:
            t0 = bounds[full]
            t1 = float(offs[-1])
            splits.append({'km': full + 1, 'sec': round(t1 - t0), 'partial_m': round(rem),
                           'pace_s_km': round((t1 - t0) / rem * 1000), 'hr': window_avg('heart_rate_bpm', t0, t1)})

        # 100 m buckets: pace / hr / cadence / power / gct / altitude
        series = {'pace': [], 'hr': [], 'cadence': [], 'power': [], 'gct': [], 'vo': [], 'vr': [], 'stride': [], 'speed': [], 'alt': []}
        nb = int(total_gps // 100)
        alt_clean = {}
        last_alt = None
        for o in offs:
            a = rows[o].get('altitude_m')
            if a is not None and a > -100:
                last_alt = a
            alt_clean[o] = last_alt
        for b in range(nb):
            d0, d1 = b * 100, (b + 1) * 100
            t0, t1 = time_at(d0), time_at(d1)
            mid = round((d0 + d1) / 2)
            series['pace'].append([mid, round((t1 - t0) * 10)])  # s per km
            for key, field in (('hr', 'heart_rate_bpm'), ('cadence', 'cadence_spm'), ('power', 'power_w'), ('gct', 'stance_time_ms'), ('vo', 'vertical_oscillation_mm'), ('vr', 'vertical_ratio_pct'), ('stride', 'stride_m'), ('speed', 'speed_m_per_s')):
                v = window_avg(field, t0, t1)
                series[key].append([mid, v])
            # altitude at bucket end (smoothed later at 250 m sampling)
            o_end = min(offs, key=lambda o: abs(o - t1))
            series['alt'].append([mid, alt_clean.get(o_end)])
        # elevation profile: sample every 250 m from smoothed alt series
        alt_pts = [(x, y) for x, y in series['alt'] if y is not None]
        elev = []
        if alt_pts:
            sm = []
            for i, (x, y) in enumerate(alt_pts):
                w = [yy for _, yy in alt_pts[max(0, i - 2):i + 3]]
                sm.append((x, sum(w) / len(w)))
            step = 250
            xs = [x for x, _ in sm]
            for target in range(0, int(total_gps) + 1, step):
                cand = min(sm, key=lambda p: abs(p[0] - target))
                elev.append([target / 1000, round(cand[1], 1)])
        series.pop('alt')

        # coach metrics
        half_t = float(offs[-1]) / 2
        dist = float(it['dis'])
        elapsed = int(it['run_time'])
        cm = {
            'avg_pace_s_km': round(elapsed / dist * 1000),
            'hr_first_half': window_avg('heart_rate_bpm', 0, half_t),
            'hr_second_half': window_avg('heart_rate_bpm', half_t, offs[-1] + 1),
            'cadence_avg': window_avg('cadence_spm', 0, offs[-1] + 1),
            'cadence_first_half': window_avg('cadence_spm', 0, half_t),
            'cadence_second_half': window_avg('cadence_spm', half_t, offs[-1] + 1),
            'gct_avg_ms': window_avg('stance_time_ms', 0, offs[-1] + 1),
            'vo_avg_mm': window_avg('vertical_oscillation_mm', 0, offs[-1] + 1),
            'vr_avg_pct': window_avg('vertical_ratio_pct', 0, offs[-1] + 1),
            'stride_avg_m': window_avg('stride_m', 0, offs[-1] + 1),
            'power_avg_w': window_avg('power_w', 0, offs[-1] + 1),
        }
        if splits:
            full_splits = [s for s in splits if 'partial_m' not in s]
            if full_splits:
                cm['first_km_s'] = full_splits[0]['sec']
                cm['last_km_s'] = full_splits[-1]['sec']
                cm['fastest_km'] = min(full_splits, key=lambda s: s['sec'])
                cm['slowest_km'] = max(full_splits, key=lambda s: s['sec'])
                h = len(full_splits) // 2
                if h:
                    cm['pace_first_half_s_km'] = round(sum(s['sec'] for s in full_splits[:h]) / h)
                    cm['pace_second_half_s_km'] = round(sum(s['sec'] for s in full_splits[h:]) / (len(full_splits) - h))
        if cm['hr_first_half'] and cm['hr_second_half']:
            cm['hr_drift_pct'] = round((cm['hr_second_half'] / cm['hr_first_half'] - 1) * 100, 1)

        cm.update(history_aggregates(it))

        if race_mode:
            def fmt(s):
                s = round(s)
                return f'{s // 60}:{s % 60:02d}'
            table = []
            for a, b in [(i * 5000, (i + 1) * 5000) for i in range(8)] + [(40000, 42195)]:
                sec = time_at(b) - (time_at(a) if a else 0)
                table.append({'range': f'{a/1000:g}–{b/1000:g} km', 'time': fmt(sec), 'pace': fmt(sec / ((b-a)/1000))})
            race_details['splits5k'] = table
            race_details['km'] = []
            for k in range(1, full + 1):
                a, b = (0 if k == 1 else time_at((k-1)*1000)), time_at(k*1000)
                item = {'km': k, 'pace_s': round(b-a)}
                for key, field in [('hr','heart_rate_bpm'), ('cadence_spm','cadence_spm'), ('power_w','power_w'), ('stance_ms','stance_time_ms'), ('vo_mm','vertical_oscillation_mm')]:
                    vals = [rows[o][field] for o in offs if a < o <= b and rows[o].get(field) is not None]
                    item[key] = round(sum(vals)/len(vals), 1) if vals else None
                race_details['km'].append(item)
            # Preserve the race elevation sampling and smoothing used by the published charts.
            alts = [alt_clean[o] for o in offs]
            smooth = []
            for i in range(len(offs)):
                w = [v for v in alts[max(0,i-15):i+16] if v is not None]
                smooth.append(sum(w)/len(w) if w else None)
            elev = []
            target = 0
            for i, o in enumerate(offs):
                if cum[o] >= target and smooth[i] is not None:
                    elev.append([round(cum[o]/1000,2),round(smooth[i],1)])
                    target += 250
            elev.append([round(total_gps/1000,2),round(smooth[-1],1)])

        return {
            'kind': 'race' if race_mode else 'training',
            'track_id': trackid,
            'slug': slug_for(start, dist / 1000),
            'date': start.strftime('%Y-%m-%d'),
            'weekday': '月火水木金土日'[start.weekday()],
            'start_time': start.strftime('%H:%M'),
            'label': daypart_label(start, dist / 1000),
            'distance_m': round(dist),
            'elapsed_s': elapsed,
            'avg_hr': int(float(it['avg_heart_rate'])) if it.get('avg_heart_rate') else None,
            'max_hr': it.get('max_heart_rate'),
            'calories': round(float(it['calorie'])) if it.get('calorie') else None,
            'ascent_m': it.get('altitude_ascend'),
            'descent_m': it.get('altitude_descend'),
            'city': it.get('city') or '',
            'shoe': gear_name.get(it.get('gearId')),
            'shoe_total_km': round(shoe_total_after[trackid] / 1000, 1) if trackid in shoe_total_after else None,
            'shoe_target_km': round(float(gear_by_id_full[it['gearId']].get('targetDistanceM') or 0) / 1000) if it.get('gearId') in gear_by_id_full else None,
            'splits': splits,
            'series': series,
            'elevation': elev,
            'aggregates': cm,
        }

    if race_mode:
        return process(RACE_ID), race_details

    nov = []
    for it in hist:
        st = int(it['end_time']) - int(it['run_time'])
        dt = datetime.datetime.fromtimestamp(st, JST)
        if dt.year == 2026 and dt.month == 11:
            nov.append((dt, it))
    nov.sort(key=lambda x: x[0])

    sessions = []
    race_entry = None
    for dt, it in nov:
        if it['trackid'] == RACE_ID:
            race_entry = {'date': dt.strftime('%Y-%m-%d'), 'weekday': '月火水木金土日'[dt.weekday()],
                          'distance_m': round(float(it['dis'])), 'elapsed_s': int(it['run_time']),
                          'link': '/fukuoka-2026', 'name': '福岡マラソン2026',
                          'shoe': gear_name.get(it.get('gearId')),
                          'shoe_total_km': round(shoe_total_after[it['trackid']] / 1000, 1) if it['trackid'] in shoe_total_after else None,
                          'shoe_target_km': round(float(gear_by_id_full[it['gearId']].get('targetDistanceM') or 0) / 1000) if it.get('gearId') in gear_by_id_full else None}
        else:
            sessions.append(process(it['trackid']))

    # monthly aggregates
    train_km = sum(s['distance_m'] for s in sessions) / 1000
    month = {
        'ym': '2026-11',
        'through': sessions[-1]['date'] if sessions else None,
        'training_sessions': len(sessions),
        'training_km': round(train_km, 2),
        'training_time_s': sum(s['elapsed_s'] for s in sessions),
        'race': race_entry,
        'total_km_with_race': round(train_km + (race_entry['distance_m'] / 1000 if race_entry else 0), 2),
    }
    # daily distances (training + race marked)
    daily = {}
    for s in sessions:
        daily[s['date']] = daily.get(s['date'], 0) + s['distance_m']
    if race_entry:
        daily[race_entry['date']] = daily.get(race_entry['date'], 0) + race_entry['distance_m']
    month['daily_m'] = {k: round(v) for k, v in sorted(daily.items())}
    # weekly (Mon-Sun) sums of all running
    weeks = {}
    for ds, m in daily.items():
        d = datetime.date.fromisoformat(ds)
        monday = d - datetime.timedelta(days=d.weekday())
        key = monday.isoformat()
        weeks[key] = weeks.get(key, 0) + m
    month['weekly_m'] = {k: round(v) for k, v in sorted(weeks.items())}
    # pickups among training
    if sessions:
        longest = max(sessions, key=lambda s: s['distance_m'])
        fastest = min((s for s in sessions if s['distance_m'] >= 4000), key=lambda s: s['aggregates']['avg_pace_s_km'])
        month['pickup'] = {
            'longest_slug': longest['slug'],
            'fastest_slug': fastest['slug'],
        }

    # gear section: per-shoe cumulative distance and target (user instruction 2026-11-17: always include)
    gear_list = []
    for it in (gear.get('items') or []):
        if it.get('gearType') != 0:
            continue
        gear_list.append({
            'name': display_name(it.get('brandModel')),
            'total_km': round((it.get('totalDistanceM') or 0) / 1000, 1),
            'target_km': round((it.get('targetDistanceM') or 0) / 1000),
            'count': it.get('totalCount'),
        })
    gear_list.sort(key=lambda g: -g['total_km'])

    out = {'month': month, 'sessions': sessions, 'gear': gear_list}
    return out
