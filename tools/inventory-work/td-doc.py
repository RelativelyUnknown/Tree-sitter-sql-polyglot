#!/usr/bin/env python3
"""Read Teradata docs through docs.teradata.com's Fluid Topics API (the site
itself is a JavaScript app).

  td-doc.py manuals                 list the SQL manuals this audit uses
  td-doc.py toc <map> [filter]      table of contents: depth, title, content id
  td-doc.py topic <map> <content>   one topic as plain text
  td-doc.py url <map> <content>     canonical reader URL for `doc:`
"""
import html, json, re, sys, urllib.request

B = "https://docs.teradata.com/api/khub/maps"
MANUALS = {
    "ddl": ("X~2C1PifIMPUALz40wgyxQ", "SQL Data Definition Language Syntax and Examples 20.00"),
    "dml": ("4_jiz05LXsLWBbfvKTLneg", "SQL Data Manipulation Language 20.00"),
    "dcl": ("~XaK0mxyTPufZup~1UD0sA", "SQL Data Control Language 20.00"),
    "fep": ("ka4q4xtYpyQGplkKwXaNBQ", "SQL Functions, Expressions, and Predicates 20.00"),
    "spl": ("W_rdgXBblWWI0~tPgRlZMw", "SQL Stored Procedures and Embedded SQL 20.00"),
    "lake": ("6rLn2rLdIynJrm3gFQo1Zg", "Lake - Working with SQL"),
}

def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read().decode("utf-8", "replace")

def mapid(m):
    return MANUALS[m][0] if m in MANUALS else m

def main(a):
    if a[0] == "manuals":
        for k, (i, t) in MANUALS.items():
            print(f"{k:5} {i}  {t}")
    elif a[0] == "toc":
        flt = a[2].lower() if len(a) > 2 else None
        def walk(ns, d=0):
            for n in ns:
                t = n.get("title") or ""
                if not flt or flt in t.lower():
                    print(f"{'  ' * d}{t}  [{n.get('contentId')}]")
                walk(n.get("children", []), d + 1)
        walk(json.loads(get(f"{B}/{mapid(a[1])}/toc")))
    elif a[0] == "topic":
        t = get(f"{B}/{mapid(a[1])}/topics/{a[2]}/content")
        t = re.sub(r"(?is)<(script|style).*?</\1>", "", t)
        t = re.sub(r"<(br|/p|/div|/li|/tr|/h\d|/pre)[^>]*>", "\n", t)
        t = re.sub(r"<[^>]+>", "", t)
        print(re.sub(r"\n\s*\n+", "\n", html.unescape(t)).strip())
    elif a[0] == "url":
        print(f"https://docs.teradata.com/reader/{mapid(a[1])}/{a[2]}")

if __name__ == "__main__":
    main(sys.argv[1:])
