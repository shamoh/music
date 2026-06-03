# Local development setup

`server.py` is gitignored. Run the block below once after cloning to create it:

```shell
cat > server.py << 'EOF'
#!/usr/bin/env python3
"""
Local dev server — serves files from the docs/ directory on port 8080.

Difference from `python3 -m http.server 8080`:
  HTML files and directory responses get `Cache-Control: no-store` so the
  browser never serves a stale cached page (avoids redirect loops after
  index.html changes).

Usage:
  python3 server.py
  python3 server.py 9000   # optional port argument
"""

import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
SERVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')

NO_CACHE_TYPES = ('text/html', 'application/xhtml+xml')


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        mime = self.headers.get('Content-Type', '')
        path = self.path.split('?')[0].split('#')[0]
        if mime.startswith(NO_CACHE_TYPES) or path in ('/', ''):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()}  {fmt % args}")


handler = lambda *args, **kwargs: DevHandler(*args, directory=SERVE_DIR, **kwargs)
with socketserver.TCPServer(('', PORT), handler) as httpd:
    httpd.allow_reuse_address = True
    print(f"Serving at  http://localhost:{PORT}  (from docs/)")
    print(f"Press Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
EOF
```

Then start the server:

```shell
python3 server.py
```
