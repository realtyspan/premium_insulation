"""Check a deployed copy of this site (run after every first deploy):

    python -I .tools/check_live.py https://premium-insulation.dataderivation.workers.dev

Confirms the pages load at addresses without .html, that internal files
(notes, scripts, settings, git) are NOT public, including different-case
spellings, and that the security headers are present. Exit code 1 = problem.
"""
import sys
import urllib.error
import urllib.request

PAGES = ["/", "/about", "/services", "/portfolio", "/contact", "/admin/",
         "/portfolio/daycare", "/content/jobs.json", "/robots.txt", "/sitemap.xml"]

# Every one of these must NOT come back with a 200.
PRIVATE = [
    "/CLAUDE.md", "/Claude.md", "/claude.md", "/CLAUDE.MD",
    "/.claude/CLAUDE.md", "/.claude/claude.md", "/.Claude/CLAUDE.md", "/.claude/launch.json",
    "/.tools/preview.py", "/.tools/check_live.py", "/.Tools/preview.py",
    "/.tools/make-icons.ps1", "/.tools/optimize-images.ps1", "/.tools/server.ps1",
    "/server.ps1", "/tools/make-icons.ps1", "/netlify.toml",
    "/.git/config", "/.git/HEAD", "/.GIT/config", "/.gitignore",
    "/wrangler.jsonc", "/Wrangler.jsonc", "/src/worker.js", "/Src/worker.js",
    "/public/index.html", "/public/_headers",
    "/_headers", "/_redirects", "/_Headers", "/.assetsignore",
]

HEADERS = ["x-content-type-options", "referrer-policy", "x-frame-options", "strict-transport-security"]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


opener = urllib.request.build_opener(NoRedirect)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "site-check/1.0"})
    try:
        with opener.open(req, timeout=20) as r:
            return r.status, dict((k.lower(), v) for k, v in r.headers.items())
    except urllib.error.HTTPError as e:
        return e.code, dict((k.lower(), v) for k, v in e.headers.items())
    except Exception as e:  # no answer at all (e.g. a brand-new address still starting up)
        print(f"  (no response from {url}: {e.__class__.__name__}; re-run in a few minutes)")
        return 0, {}


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    base = sys.argv[1].rstrip("/")
    problems = 0

    print("Pages (should be 200):")
    for p in PAGES:
        status, _ = get(base + p)
        ok = status == 200
        problems += not ok
        print(f"  {'ok ' if ok else 'BAD'} {status} {p}")

    status, h = get(base + "/about.html")
    ok = status in (301, 307, 308) and h.get("location", "").rstrip("/").endswith("/about")
    problems += not ok
    print(f"\n.html removed: {'ok ' if ok else 'BAD'} /about.html -> {status} {h.get('location', '')}")

    print("\nInternal files (must NOT be 200):")
    for p in PRIVATE:
        status, _ = get(base + p)
        ok = status != 200
        problems += not ok
        print(f"  {'ok ' if ok else 'PUBLIC!'} {status} {p}")

    print("\nSecurity headers on the home page:")
    _, h = get(base + "/")
    for name in HEADERS:
        ok = name in h
        problems += not ok
        print(f"  {'ok ' if ok else 'MISSING'} {name}: {h.get(name, '')}")
    print(f"  (info) x-robots-tag: {h.get('x-robots-tag', '(none)')}  <- 'noindex' before launch, none after")

    status, _ = get(base + "/api/contact")
    ok = status == 405
    problems += not ok
    print(f"\nForm endpoint answers: {'ok ' if ok else 'BAD'} GET /api/contact -> {status} (405 expected)")

    print("\nAll good." if not problems else f"\n{problems} problem(s) found.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
