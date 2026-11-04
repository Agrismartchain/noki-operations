import json, sys, collections
data = json.load(open(sys.argv[1]))
label = sys.argv[2]
rows = []
for res in data.get("Results", []):
    cls = res.get("Class", ""); tgt = res.get("Target", "")
    for v in res.get("Vulnerabilities") or []:
        path = v.get("PkgPath", "") or tgt
        if cls == "os-pkgs":
            cat = "system(os)"
        elif any(k in path for k in ("lib/node_modules/npm", "lib/node_modules/corepack", "opt/yarn", "usr/local/bin/")):
            cat = "node-embedded(npm/corepack/yarn)"
        else:
            cat = "app(node_modules)"
        rows.append((cat, v.get("Severity"), v.get("VulnerabilityID"), v.get("PkgName"),
                     v.get("InstalledVersion"), v.get("FixedVersion", ""), v.get("Status", ""), path))
secrets = sum(len(r.get("Secrets") or []) for r in data.get("Results", []))
print(f"===== {label}: HIGH/CRITICAL vulnerabilities = {len(rows)} (secrets findings: {secrets}) =====")
c = collections.Counter((r[0], r[1]) for r in rows)
for cat in ("system(os)", "app(node_modules)", "node-embedded(npm/corepack/yarn)"):
    print(f"  {cat:34s} CRITICAL={c[(cat,'CRITICAL')]:3d} HIGH={c[(cat,'HIGH')]:3d}")
print(f"  TOTAL CRITICAL={sum(1 for r in rows if r[1]=='CRITICAL')} HIGH={sum(1 for r in rows if r[1]=='HIGH')}")
print("  --- detail (category | sev | id | pkg installed -> fixed | status | path)")
for r in sorted(rows):
    print(f"  {r[0]} | {r[1]} | {r[2]} | {r[3]} {r[4]} -> {r[5] or '-'} | {r[6]} | {r[7]}")
