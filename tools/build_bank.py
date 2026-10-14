"""Build question files from compact staging transcriptions, then validate the whole bank.

Staging files: tools/staging/<paper>_<batch>.json — a JSON array of compact entries:
  {"n": 12, "t": "root_verb", "d": "easy", "q": "...", "o": ["..","..","..",".."], "a": 0, "e": "..."}
  optional: "s" (tamil|general_studies|aptitude; default: the subject whose taxonomy holds the topic),
            "ca": true (current affairs / time-sensitive)
<paper> is e.g. "pyq2024" -> writes data/gen_pyq_2024.json; "new" -> data/gen_new.json
  (new questions: n is a running number unique across all new_*.json files; optional "src" = source note)

Usage:  python tools/build_bank.py            (build every paper found in staging + validate bank)
"""
import collections
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
STAGING = os.path.join(ROOT, "tools", "staging")
TAX = json.load(open(os.path.join(DATA, "_taxonomy.json"), encoding="utf-8"))
PART = {"tamil": "A", "general_studies": "B", "aptitude": "C"}
ABBR = {"tamil": "TA", "general_studies": "GS", "aptitude": "AP"}
# Latin-1 debris typical of legacy-Tamil-font extraction (math symbols like × ÷ ² ½ are allowed)
PENDING = []
BAD_CHARS = re.compile(r"[ÃÂ¤¦©®´µ¶¸º»¿Þßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ�]")


def subject_for(topic):
    """Topic keys are unique across subjects, so the topic decides the subject."""
    return next((s for s in TAX if isinstance(TAX[s], dict) and topic in TAX[s].get("topics", {})), None)


def build_paper(paper, files):
    is_pyq = paper.startswith("pyq")
    year = paper.replace("pyq", "")
    errors, out, seen = [], [], set()
    for f in files:
        for e in json.load(open(f, encoding="utf-8")):
            n = e["n"]
            where = f"{os.path.basename(f)} n={n}"
            if n in seen:
                errors.append(f"{where}: duplicate question number")
            seen.add(n)
            if e.get("chk"):  # answer not yet independently verified -> keep out of the bank
                PENDING.append(f"{paper} Q{n}: {e['chk']}")
                continue
            s = e.get("s") or subject_for(e["t"])
            if s is None:
                errors.append(f"{where}: unknown topic {e['t']}")
                continue
            topics = TAX[s]["topics"]
            if e["t"] not in topics:
                errors.append(f"{where}: unknown topic {e['t']} for {s}")
                continue
            unit = topics[e["t"]]["unit"]
            out.append({
                "id": f"PYQ-{year}-{ABBR[s]}-{n:03d}" if is_pyq else f"NEW-{ABBR[s]}-U{unit}-{n:03d}",
                "part": PART[s], "subject": s, "unit": unit,
                "unit_name_ta": TAX[s]["unit_names_ta"][unit],
                "topic": e["t"], "topic_name_ta": topics[e["t"]]["ta"],
                "difficulty": e.get("d", "medium"),
                "question_ta": e["q"].strip(), "options_ta": [o.strip() for o in e["o"]],
                "answer_index": e["a"], "explanation_ta": e["e"].strip(),
                "source_hint": f"TNPSC குரூப் 4 – {year} வினாத்தாள், வினா {n}" if is_pyq
                               else e.get("src", "சமச்சீர் பாடநூல் / பாடத்திட்டம் அடிப்படையில் புதிய வினா"),
                "is_current_affairs": bool(e.get("ca", False)),
            })
    out.sort(key=lambda q: int(q["id"].rsplit("-", 1)[1]))
    dest = os.path.join(DATA, f"gen_pyq_{year}.json" if is_pyq else f"gen_{paper}.json")
    json.dump({"source": f"TNPSC Group 4 {year} question paper (answers ticked in source scan)" if is_pyq
               else "New questions written from Samacheer textbooks / syllabus, independently verified",
               "questions": out}, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return dest, errors


def validate_bank():
    manifest = json.load(open(os.path.join(DATA, "manifest.json"), encoding="utf-8"))
    errors, ids = [], set()
    count = collections.Counter()
    total = 0
    for fname in manifest["files"]:
        path = os.path.join(DATA, fname)
        if not os.path.exists(path):
            continue
        j = json.load(open(path, encoding="utf-8"))
        for q in j.get("questions", []):
            s = j.get("subject") or q["subject"]
            where = f"{fname}:{q.get('id')}"
            if q["id"] in ids:
                errors.append(f"{where}: duplicate id")
            ids.add(q["id"])
            opts = q["options_ta"]
            if len(opts) != 4 or any(not o.strip() for o in opts):
                errors.append(f"{where}: needs exactly 4 non-empty options")
            if len(set(opts)) != 4:
                errors.append(f"{where}: duplicate options")
            if not isinstance(q["answer_index"], int) or not 0 <= q["answer_index"] <= 3:
                errors.append(f"{where}: bad answer_index")
            if not q["question_ta"].strip() or not q["explanation_ta"].strip():
                errors.append(f"{where}: empty question/explanation")
            if q["topic"] not in TAX[s]["topics"]:
                errors.append(f"{where}: topic {q['topic']} not in taxonomy")
            elif TAX[s]["topics"][q["topic"]]["unit"] != str(q["unit"]):
                errors.append(f"{where}: unit {q['unit']} != taxonomy unit for {q['topic']}")
            text = q["question_ta"] + "".join(opts) + q["explanation_ta"]
            if BAD_CHARS.search(text):
                errors.append(f"{where}: suspicious mojibake characters")
            count[(s, str(q["unit"]))] += 1
            total += 1
    cov_path = os.path.join(DATA, "_coverage.json")
    cov = json.load(open(cov_path, encoding="utf-8"))
    print(f"\nBank total: {total}")
    for s in ("tamil", "general_studies", "aptitude"):
        for u, info in cov[s].items():
            info["have"] = count[(s, u)]
            flag = "" if info["have"] >= info["target"] else "  (below target)"
            print(f"  {s:16s} U{u}: {info['have']:4d} / {info['target']}{flag}")
    json.dump(cov, open(cov_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return errors


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    papers = collections.defaultdict(list)
    for f in sorted(glob.glob(os.path.join(STAGING, "*.json"))):
        papers[os.path.basename(f).split("_")[0]].append(f)
    errors = []
    for paper, files in papers.items():
        dest, errs = build_paper(paper, files)
        errors += errs
        print(f"built {os.path.relpath(dest, ROOT)} from {len(files)} staging file(s)")
    errors += validate_bank()
    if PENDING:
        print(f"\nHeld back pending verification ({len(PENDING)}):")
        print("\n".join("  " + p for p in PENDING))
    if errors:
        print("\nERRORS:")
        print("\n".join("  " + e for e in errors))
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
