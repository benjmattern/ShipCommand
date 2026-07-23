from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os
from functools import partial

class MyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)

    def end_headers(self):
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'text/javascript; charset=utf-8')
        elif self.path.endswith('.css'):
            self.send_header('Content-Type', 'text/css; charset=utf-8')
        elif self.path.endswith('.json'):
            self.send_header('Content-Type', 'application/json; charset=utf-8')
        elif self.path.endswith('.svg'):
            self.send_header('Content-Type', 'image/svg+xml; charset=utf-8')
        super().end_headers()

if __name__ == '__main__':
    port = 3000
    print(f'Serving on http://127.0.0.1:{port}/')
    ThreadingHTTPServer(('127.0.0.1', port), MyHandler).serve_forever()
