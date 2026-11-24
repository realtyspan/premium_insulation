"""Combine the one-file-per-job folder into the list the website reads.

    python .tools/build_jobs.py

The editing page (/admin/) saves each job as its own file in
public/content/jobs/<slug>.json. The portfolio pages read one list,
public/content/jobs.json, which this script writes. It is NOT kept in git:
Cloudflare runs this on every publish (wrangler.jsonc "build"), and the local
preview (.tools/preview.py) builds the list on the fly.

Each job gets a "slug" from its FILE name, not its title, so renaming a job in
the editor does not change its web address (/portfolio/<slug>).
Newest jobs (by "date") come first.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
JOBS_DIR = ROOT / "public" / "content" / "jobs"
OUT = ROOT / "public" / "content" / "jobs.json"


def slugify(text):
    """Same rule as slugify() in public/js/portfolio-common.js."""
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", str(text).lower().strip()))


def collect(jobs_dir=JOBS_DIR):
    jobs = []
    for path in sorted(jobs_dir.glob("*.json")):
        try:
            job = json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError) as e:
            # One bad file must not take the whole portfolio down.
            print(f"skipped {path.name}: {e}", file=sys.stderr)
            continue
        if not isinstance(job, dict) or not job.get("title"):
            print(f"skipped {path.name}: no title", file=sys.stderr)
            continue
        job["slug"] = slugify(path.stem) or slugify(job["title"])
        job.setdefault("gallery", [])
        jobs.append(job)
    # Newest first; jobs without a date go last, then alphabetical.
    jobs.sort(key=lambda j: j.get("title", "").lower())
    jobs.sort(key=lambda j: str(j.get("date") or ""), reverse=True)
    return {"jobs": jobs}


def main():
    data = collect()
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"jobs.json: {len(data['jobs'])} job(s)")


if __name__ == "__main__":
    main()
