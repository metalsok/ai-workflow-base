#!/usr/bin/env python3
"""Validate IGDB credentials and report metadata coverage without exposing secrets."""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / '.scratch/game-tracker/igdb-validation.json'


def request_json(url, body, headers):
    request = Request(url, data=body.encode(), headers=headers, method='POST')
    try:
        with urlopen(request, timeout=25) as response:
            return json.load(response)
    except HTTPError as error:
        # Never print response bodies, request headers, or credentials.
        raise RuntimeError(f'{request.host}: HTTP {error.code}') from None
    except (URLError, TimeoutError, OSError):
        raise RuntimeError(f'{request.host}: connection failed or timed out') from None
    except (ValueError, UnicodeError):
        raise RuntimeError(f'{request.host}: unexpected JSON response') from None


def main():
    values = {}
    for line in (ROOT / '.env').read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        key, separator, value = line.partition('=')
        if separator:
            values[key.strip().removeprefix('export ')] = value.strip().strip('\"\x27')
    client_id = values.get('IGDB_CLIENT_ID', '')
    secret = values.get('IGDB_CLIENT_SECRET', '')
    if not client_id or not secret:
        raise RuntimeError('Fill both IGDB credential fields in the local .env file.')

    token_data = request_json(
        'https://id.twitch.tv/oauth2/token',
        urlencode({'client_id': client_id, 'client_secret': secret,
                   'grant_type': 'client_credentials'}),
        {'Content-Type': 'application/x-www-form-urlencoded'},
    )
    token = token_data.get('access_token')
    if not token:
        raise RuntimeError('Twitch did not return an application token.')
    print('Application authentication: successful (token kept in memory only).', flush=True)
    headers = {'Client-ID': client_id, 'Authorization': f'Bearer {token}',
               'Content-Type': 'text/plain', 'Accept': 'application/json'}
    searches = []
    samples = (
        ('Elden Ring', 119133),
        ("Baldur's Gate 3", 119171),
        ('The Legend of Zelda: Breath of the Wild', 7346),
    )
    for title, expected_id in samples:
        query = (
            f'search {json.dumps(title)}; '
            'fields name,summary,first_release_date,cover.url,platforms.name,'
            'genres.name,involved_companies.company.name,involved_companies.developer,'
            'involved_companies.publisher,version_parent.name,parent_game.name; limit 5;'
        )
        games = request_json('https://api.igdb.com/v4/games', query, headers)
        if not isinstance(games, list):
            raise RuntimeError('IGDB returned an unexpected search result shape.')
        results = []
        for game in games:
            companies = game.get('involved_companies', [])
            results.append({
                'id': game['id'], 'name': game.get('name'),
                'platforms': [p['name'] for p in game.get('platforms', [])],
                'genres': [g['name'] for g in game.get('genres', [])],
                'has_cover': bool(game.get('cover', {}).get('url')),
                'has_description': bool(game.get('summary')),
                'has_release_date': bool(game.get('first_release_date')),
                'developers': [c['company']['name'] for c in companies
                               if c.get('developer') and c.get('company', {}).get('name')],
                'publishers': [c['company']['name'] for c in companies
                               if c.get('publisher') and c.get('company', {}).get('name')],
                'version_parent': game.get('version_parent'),
                'parent_game': game.get('parent_game'),
            })
        exact = [g for g in results if (g.get('name') or '').casefold() == title.casefold()]
        expected = next((g for g in results if g['id'] == expected_id), None)
        fields_present = bool(expected) and all((
            expected['has_cover'], expected['has_description'], expected['has_release_date'],
            expected['platforms'], expected['genres'], expected['developers'], expected['publishers'],
        ))
        searches.append({'query': title, 'results': results, 'exact_match_found': bool(exact),
                         'expected_game_id': expected_id, 'expected_game_found': bool(expected),
                         'required_metadata_present': bool(fields_present)})
        print(f'{title}: expected game found: {bool(expected)}; '
              f'required metadata present: {bool(fields_present)}', flush=True)
        time.sleep(0.3)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    report = {'checked_at': datetime.now(timezone.utc).isoformat(),
              'authentication': 'successful', 'searches': searches,
              'limits': 'Metadata sample only; no browser, image retrieval, or load test.'}
    REPORT.write_text(json.dumps(report, indent=2) + '\n')
    print(f'Non-secret metadata report saved to {REPORT.relative_to(ROOT)}')
    if not all(search['expected_game_found'] and search['required_metadata_present']
               for search in searches):
        raise RuntimeError('One or more expected games or metadata fields need review.')


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        print(f'Validation did not complete: {error}', file=sys.stderr)
        sys.exit(1)
    except (OSError, KeyError, TypeError):
        # Keep unexpected exceptions free of request data and secret values.
        print('Validation did not complete. Check connectivity, credentials, and API schema.',
              file=sys.stderr)
        sys.exit(1)
