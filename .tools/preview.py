"""Local preview server for this site (run from the site folder):

    python .tools/preview.py [port]

Python's built-in http.server, serving only public/, with three extras so
local preview behaves like Cloudflare:
  * /about serves about.html, and /about.html redirects to /about
  * missing pages get public/404.html with a 404 status
  * POST /api/contact answers "ok" WITHOUT sending email (preview only)
  * /portfolio/<slug> serves portfolio-detail.html, like src/worker.js
  * /content/jobs.json is built fresh from public/content/jobs/ on every
    request (.tools/build_jobs.py; Cloudflare builds it once per deploy)
Photos are never resized here (only the real domain on Cloudflare resizes).
The _redirects file is not applied here; it works on Cloudflare.
"""
import http.server
import re
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build_jobs  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent / "public"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _file(self, path):
        return ROOT / path.lstrip("/")

    def do_GET(self):
        path, _, query = self.path.partition("?")
        if path == "/content/jobs.json":
            body = json.dumps(build_jobs.collect(), ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        # /portfolio/<slug>: one job's page (src/worker.js does this on Cloudflare).
        if re.fullmatch(r"/portfolio/[^/]+/?", path):
            self.path = "/portfolio-detail.html" + ("?" + query if query else "")
            return super().do_GET()
        # Cloudflare never serves the rules files themselves.
        if path in ("/_headers", "/_redirects", "/.assetsignore"):
            return self._not_found()
        if path.endswith(".html") and self._file(path).is_file():
            target = path[: -len(".html")]
            if target.endswith("/index"):
                target = target[: -len("index")]
            self.send_response(307)
            self.send_header("Location", (target or "/") + ("?" + query if query else ""))
            self.end_headers()
            return
        if not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
            if self._file(path + ".html").is_file():
                self.path = path + ".html" + ("?" + query if query else "")
            elif not self._file(path).is_dir():
                return self._not_found()
        elif not self._file(path).exists():
            return self._not_found()
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] == "/api/contact":
            length = int(self.headers.get("Content-Length") or 0)
            self.rfile.read(length)
            body = json.dumps({"ok": True, "preview": "Local preview: nothing was emailed."}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(405)

    def _not_found(self):
        body = (ROOT / "404.html").read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print(f"Preview: http://localhost:{PORT}  (serving {ROOT})")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
