#!/usr/bin/env python3
import os
import sys
import threading
import time
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
BUILD_ID = 'BOAT-WATERFALL-R31-20260929A'
os.chdir(ROOT)

ENTRIES = {
    'hub': 'dev-hub.html',
    'home': 'game.html?char=succulent&dev=1&devSpawn=home',
    'garden': 'game.html?char=succulent&dev=1&devSpawn=privateGarden',
    'orangery': 'game.html?char=succulent&dev=1&devSpawn=orangery',
    'cabin': 'game.html?char=succulent&dev=1&devSpawn=cabin&devFishing=1&devBoat=1',
    'stable': 'game.html?char=succulent&dev=1&devSpawn=stable',
    'stableinside': 'game.html?char=succulent&dev=1&devSpawn=stableInside',
    'wildlife': 'game.html?char=succulent&dev=1&devSpawn=meadow&devWildlife=1',
    'selector': 'selector.html',
    'normal': 'index.html',
}

mode = (sys.argv[1].strip().lower() if len(sys.argv) > 1 else 'hub')
if mode not in ENTRIES:
    print('Unknown mode:', mode)
    print('Use one of:', ', '.join(ENTRIES))
    raise SystemExit(2)

class NoCacheHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('X-DYM-Build', BUILD_ID)
        super().end_headers()

server = None
for port in range(4530, 4570):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler)
        server.daemon_threads = True
        break
    except OSError:
        server = None

if server is None:
    raise SystemExit('Could not find a free localhost port between 4530 and 4569.')

run_id = str(time.time_ns())
entry = ENTRIES[mode]
sep = '&' if '?' in entry else '?'
url = f'http://127.0.0.1:{port}/{entry}{sep}build={quote(BUILD_ID)}&run={run_id}'
hub_url = f'http://127.0.0.1:{port}/dev-hub.html?build={quote(BUILD_ID)}&run={run_id}'

print('\nTHE GROWING WILDS - DEV HUB R31')
print('BUILD:', BUILD_ID)
print('CACHE: OFF / NO-STORE')
print('MODE:', mode.upper())
print('\nAabn i Safari:')
print(url)
if mode != 'hub':
    print('\nDEV HUB:')
    print(hub_url)
print('\nStop serveren med Ctrl-C.\n')

try:
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
except Exception:
    pass

try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
