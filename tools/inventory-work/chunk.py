"""Small-shard queue. `python chunk.py init` builds index tasks; `python chunk.py split <dialect>`
turns scratchpad/index/<dialect>.json into statement chunks; `python chunk.py next [n]` prints the
next queued tasks; `python chunk.py set <task> <status> [agent]` updates one."""
import json, sys, os
S = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(S, "queue2.json")
OLD = json.load(open(os.path.join(S, "inventory-queue.json")))
BRIEF = os.path.join(S, "inventory-brief.md")
IBRIEF = os.path.join(S, "index-brief.md")
POINTS = {"high": 3, "medium": 0.6, "low": 0.15}
BUDGET = 6
EXPR = [
    ("expr_a", "literals (numbers, strings and their prefixes/escapes, dates, intervals, arrays, maps, structs, JSON), type names and parameterized types, casts, identifier quoting, comments, parameters and variables"),
    ("expr_b", "every operator family, predicates (LIKE, BETWEEN, IN, IS, EXISTS, subquery predicates), CASE, special-form functions with keywords inside the parentheses (EXTRACT, SUBSTRING ... FROM, TRIM, POSITION, OVERLAY, CAST ... FORMAT)"),
    ("expr_c", "aggregate syntax (FILTER, WITHIN GROUP, ordered aggregates, DISTINCT), window syntax (OVER, frames, named windows), lambdas, JSON/array/struct access and constructors, one probe per ordinary function family"),
]

def load(): return json.load(open(Q)) if os.path.exists(Q) else []
def save(q): json.dump(q, open(Q, "w"), indent=1)

def notes(d):
    return "\n\n".join(s["assignment"] for s in OLD if s["shard"].split(".")[0] == d)

def init():
    q = load(); have = {t["task"] for t in q}
    for d in dict.fromkeys(s["shard"].split(".")[0] for s in OLD):
        if d == "sqlite" or f"{d}.index" in have: continue
        q.append({"task": f"{d}.index", "kind": "index", "status": "queued", "agent": None,
                  "prompt": f"Read {IBRIEF} and follow it exactly.\n\nAssignment: dialect `{d}`. "
                            f"The notes below were written for a bigger task; use only their engine, version and "
                            f"doc-source information.\n\n{notes(d)}"})
    save(q)

def split(d):
    idx = json.load(open(os.path.join(S, "index", f"{d}.json")))
    q = load()
    order = {"high": 0, "medium": 1, "low": 2}
    sts = sorted(idx["statements"], key=lambda s: order.get(s["tier"], 3))
    chunks, cur, pts = [], [], 0
    for s in sts:
        p = POINTS.get(s["tier"], 1)
        if cur and pts + p > BUDGET:
            chunks.append(cur); cur, pts = [], 0
        cur.append(s); pts += p
    if cur: chunks.append(cur)
    header = (f"dialect: {d}\nengine: {idx.get('engine')}\nversion: \"{idx.get('version')}\"\n"
              f"source: {idx.get('source')}")
    common = (f"Use this file header:\n```yaml\n{header}\n```\n\nDialect notes (engine, version and doc "
              f"sources; ignore their scope wording):\n\n{notes(d)}")
    for i, c in enumerate(chunks, 1):
        part = f"s{i:02d}"
        lst = "\n".join(f"- id `{s['id']}`, {s['name']} ({s['tier']}): {s['url']}" for s in c)
        q.append({"task": f"{d}.{part}", "kind": "chunk", "status": "queued", "agent": None,
                  "prompt": f"Read {BRIEF} and follow it exactly.\n\nAssignment: dialect `{d}`, write "
                            f"`tools/inventory/{d}.{part}.yml` with a `statements:` section covering exactly these "
                            f"statements (no `expressions:` section):\n{lst}\n\n{common}"})
    if not idx.get("expressions_done"):
        for part, scope in EXPR:
            q.append({"task": f"{d}.{part}", "kind": "chunk", "status": "queued", "agent": None,
                      "prompt": f"Read {BRIEF} and follow it exactly.\n\nAssignment: dialect `{d}`, write "
                                f"`tools/inventory/{d}.{part}.yml` with an empty `statements: []` and an "
                                f"`expressions:` section covering only: {scope}. Use the engine's expression, "
                                f"operator, data-type and function reference pages. Prefix every expression id "
                                f"with `{part[-1]}_` so ids stay unique across parts.\n\n{common}"})
    save(q)
    print(f"{d}: {len(chunks)} statement chunks" + ("" if idx.get("expressions_done") else " + 3 expression chunks"))

def nxt(n):
    q = load()
    rank = {}
    for i, t in enumerate(q): rank.setdefault(t["task"].split(".")[0], i)
    queued = sorted((t for t in q if t["status"] == "queued"),
                    key=lambda t: (rank[t["task"].split(".")[0]], q.index(t)))
    for t in queued[:n]:
        print(t["task"])

def setst(task, status, agent=None):
    q = load()
    for t in q:
        if t["task"] == task:
            t["status"] = status
            if agent: t["agent"] = agent
    save(q)

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "init": init()
    elif cmd == "split": split(sys.argv[2])
    elif cmd == "next": nxt(int(sys.argv[2]) if len(sys.argv) > 2 else 3)
    elif cmd == "set": setst(*sys.argv[2:])
    elif cmd == "prompt": print(next(t["prompt"] for t in load() if t["task"] == sys.argv[2]))
    elif cmd == "status":
        from collections import Counter
        print(Counter(t["status"] for t in load()))
