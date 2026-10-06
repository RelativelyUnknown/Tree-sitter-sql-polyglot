"""Phase 3 verification queue. `verify.py init` builds queue3.json from tools/inventory-results/*.json;
`verify.py next [n]`, `verify.py prompt <task>`, `verify.py set <task> <status> [agent]`, `verify.py status`."""
import glob, json, os, sys, collections
import yaml
S = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(os.path.dirname(S))
Q = os.path.join(S, "queue3.json"); BRIEF = os.path.join(S, "verify-brief.md")
OUT = os.path.join(R, "tools", "inventory-verify")
UNCONF_DIALECTS = ["oracle", "snowflake", "db2", "teradata", "clickhouse"]
CHUNK = 60
ORDER = ["oracle", "snowflake", "tsql", "db2", "teradata", "clickhouse"]

def load(): return json.load(open(Q)) if os.path.exists(Q) else []
def save(q): json.dump(q, open(Q, "w"), indent=1)

def part_of(d):
    """entry key -> part file, by scanning the dialect's part files."""
    m = {}
    for f in sorted(glob.glob(os.path.join(R, "tools", "inventory", f"{d}.*.yml"))):
        y = yaml.safe_load(open(f)) or {}
        for s in y.get("statements") or []: m[f"statements.{s['id']}"] = os.path.relpath(f, R)
        for e in y.get("expressions") or []: m[f"expressions.{e['id']}"] = os.path.relpath(f, R)
    return m

def init():
    q = load(); have = {t["task"] for t in q}
    dialects = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(R, "tools", "inventory-results", "*.json")))
    dialects.sort(key=lambda d: (ORDER.index(d) if d in ORDER else 99, d))
    for d in dialects:
        res = json.load(open(os.path.join(R, "tools", "inventory-results", f"{d}.json")))
        want = {"suspect"} | ({"unconfirmed"} if d in UNCONF_DIALECTS else set())
        parts = part_of(d)
        by_entry = collections.OrderedDict()
        for key, e in res["entries"].items():
            sel = [(pid, p) for pid, p in e.get("probes", {}).items() if p["status"] in want]
            if sel: by_entry[key] = (e, sel)
        chunks, cur, n = [], [], 0
        for key, (e, sel) in by_entry.items():
            if cur and n + len(sel) > CHUNK: chunks.append(cur); cur, n = [], 0
            cur.append((key, e, sel)); n += len(sel)
        if cur: chunks.append(cur)
        for i, c in enumerate(chunks, 1):
            task = f"{d}.v{i:02d}"
            if task in have: continue
            lines = []
            for key, e, sel in c:
                lines.append(f"### {key} ({e.get('name')}) in `{parts.get(key, '?')}`\ndoc: {e.get('doc')}")
                for pid, p in sel:
                    lines.append(f"- probe `{pid}` [{p['status']}]: `{p['sql']}`")
            q.append({"task": task, "kind": "verify", "status": "queued", "agent": None,
                      "prompt": f"Read {BRIEF} and follow it exactly.\n\nAssignment: dialect `{d}`, write your verdicts to "
                                f"`tools/inventory-verify/{task}.json`. Probes to verify (grouped by entry):\n\n" + "\n".join(lines)})
        print(d, len(chunks), "chunks")
    save(q)

def nxt(n):
    for t in [t for t in load() if t["status"] == "queued"][:n]: print(t["task"])

def prompt(task):
    for t in load():
        if t["task"] == task: print(t["prompt"]); return
    sys.exit("no such task")

def setst(task, status, agent=None):
    q = load()
    for t in q:
        if t["task"] == task:
            t["status"] = status
            if agent: t["agent"] = agent
    save(q)

def status():
    q = load(); print(collections.Counter(t["status"] for t in q))

if __name__ == "__main__":
    c = sys.argv[1]
    {"init": init, "next": lambda: nxt(int(sys.argv[2]) if len(sys.argv) > 2 else 1), "prompt": lambda: prompt(sys.argv[2]),
     "set": lambda: setst(*sys.argv[2:5]), "status": status}[c]()
