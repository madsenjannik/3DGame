#!/usr/bin/env python3
import os
import threading
import time
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT=os.path.dirname(os.path.abspath(__file__))
BUILD_ID = 'BOAT-WATERFALL-R31-20260929A'
os.chdir(ROOT)

class NoCacheHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma','no-cache')
        self.send_header('Expires','0')
        self.send_header('X-DYM-Build',BUILD_ID)
        super().end_headers()

server=None
for port in range(4530,4570):
    try:
        server=ThreadingHTTPServer(('127.0.0.1',port),NoCacheHandler)
        server.daemon_threads=True
        break
    except OSError:
        server=None
if server is None:
    raise SystemExit('Could not find a free localhost port between 4530 and 4569.')

run_id=str(time.time_ns())
url=f'http://127.0.0.1:{port}/dev-hub.html?run={run_id}'
print('\nTHE GROWING WILDS - DEV HUB R31')
print('BUILD:',BUILD_ID)
print('Opening developer launcher:')
print(url)
print('\nNormal player entry remains index.html. Stop server with Ctrl-C.\n')
try:
    threading.Timer(.6,lambda:webbrowser.open(url)).start()
except Exception:
    pass
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
