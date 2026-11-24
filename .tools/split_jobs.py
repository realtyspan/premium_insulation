"""One-off: turn an old single-list jobs.json into one file per job.

    python .tools/split_jobs.py [path/to/jobs.json]

Default input: public/content/jobs.json. Writes public/content/jobs/<slug>.json,
where <slug> is the job's current web address (slugify(title)), so existing
links keep working. Existing files are never overwritten.

Needed once when switching to the one-file-per-job editor, and AGAIN AT LAUNCH:
the live site's main branch still uses the single list, so the client's latest
jobs must be split after merging main in (see .claude/CLAUDE.md).
"""
import json
import pathlib
import sys

from build_jobs import JOBS_DIR, ROOT, slugify

src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public" / "content" / "jobs.json"
jobs = json.loads(src.read_text(encoding="utf-8")).get("jobs", [])
JOBS_DIR.mkdir(parents=True, exist_ok=True)

for job in jobs:
    job.pop("slug", None)
    base = slugify(job.get("title", "")) or "job"
    path = JOBS_DIR / f"{base}.json"
    if path.exists():
        same = json.loads(path.read_text(encoding="utf-8")) == job
        print(f"{'unchanged' if same else 'EXISTS, left alone'}: {path.name}")
        continue
    path.write_text(json.dumps(job, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.name}")
