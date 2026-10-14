"""Build question files from compact staging transcriptions, then validate the whole bank.

Staging files: tools/staging/<paper>_<batch>.json — a JSON array of compact entries:
  {"n": 12, "t": "root_verb", "d": "easy", "q": "...", "o": ["..","..","..",".."], "a": 0, "e": "..."}
  optional: "s" (tamil|general_studies|aptitude; default: the subject whose taxonomy holds the topic),
            "ca": true (current affairs / time-sensitive)
<paper> is e.g. "pyq2024" -> writes data/gen_pyq_2024.json; "new" -> data/gen_new.json
  (new questions: n is a running number unique across all new_*.json files; optional "src" = source note)

English versions (Part B — GS + aptitude only): tools/staging_en/*.json, each a JSON object
  {"<question id>": {"q": "...", "o": ["..","..","..",".."], "e": "...", "h": "<hash>"}}
  Options must be in the same order as the Tamil options. "h" is a fingerprint of the Tamil question,
  options and answer; if the Tamil version changes later, the build fails until the English is re-checked.
  New entries may omit "h": run with --stamp to fill it in after checking the translation.

Usage:  python tools/build_bank.py            (build every paper found in staging + validate bank)
        python tools/build_bank.py --stamp    (also record fingerprints for new English entries)
"""
import hashlib
import collections
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
STAGING = os.path.join(ROOT, "tools", "staging")
STAGING_EN = os.path.join(ROOT, "tools", "staging_en")
TAX = json.load(open(os.path.join(DATA, "_taxonomy.json"), encoding="utf-8"))
PART = {"tamil": "A", "general_studies": "B", "aptitude": "C"}
ABBR = {"tamil": "TA", "general_studies": "GS", "aptitude": "AP"}
# Latin-1 debris typical of legacy-Tamil-font extraction (math symbols like × ÷ ² ½ are allowed)
PENDING = []
BAD_CHARS = re.compile(r"[ÃÂ¤¦©®´µ¶¸º»¿Þßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ�]")


def fingerprint(q):
    raw = q["question_ta"] + "\x1f" + "\x1f".join(q["options_ta"]) + "\x1f" + str(q["answer_index"])
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]


def load_english():
    en, where = {}, {}
    for f in sorted(glob.glob(os.path.join(STAGING_EN, "*.json"))):
        for qid, entry in json.load(open(f, encoding="utf-8")).items():
            if qid in en:
                raise SystemExit(f"{os.path.basename(f)}: duplicate English entry {qid}")
            en[qid], where[qid] = entry, f
    return en, where


def attach_english(questions, en, where, stamp, errors, used):
    """Copy English text onto Part B questions; returns files that need re-writing for --stamp."""
    dirty = set()
    for q in questions:
        e = en.get(q["id"])
        if not e:
            continue
        used.add(q["id"])
        where_q = f"English {q['id']}"
        if q["subject"] == "tamil":
            errors.append(f"{where_q}: Part A (Tamil) questions are Tamil-only")
            continue
        if len(e.get("o", [])) != 4 or any(not o.strip() for o in e["o"]) or len(set(e["o"])) != 4:
            errors.append(f"{where_q}: needs exactly 4 distinct non-empty options")
            continue
        if not e.get("q", "").strip() or not e.get("e", "").strip():
            errors.append(f"{where_q}: empty question/explanation")
            continue
        fp = fingerprint(q)
        if "h" not in e:
            if stamp:
                e["h"] = fp
                dirty.add(where[q["id"]])
            else:
                errors.append(f"{where_q}: not yet stamped (check it, then run with --stamp)")
                continue
        elif e["h"] != fp:
            errors.append(f"{where_q}: Tamil version changed since translation — re-check English, then delete 'h' and --stamp")
            continue
        q["question_en"] = e["q"].strip()
        q["options_en"] = [o.strip() for o in e["o"]]
        q["explanation_en"] = e["e"].strip()
    return dirty


def subject_for(topic):
    """Topic keys are unique across subjects, so the topic decides the subject."""
    return next((s for s in TAX if isinstance(TAX[s], dict) and topic in TAX[s].get("topics", {})), None)


def build_paper(paper, files, en, en_where, stamp, used):
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
                **({"unit_name_en": TAX[s]["unit_names_en"][unit]} if "unit_names_en" in TAX[s] else {}),
                "topic": e["t"], "topic_name_ta": topics[e["t"]]["ta"],
                **({"topic_name_en": topics[e["t"]]["en"]} if "en" in topics[e["t"]] else {}),
                "difficulty": e.get("d", "medium"),
                "question_ta": e["q"].strip(), "options_ta": [o.strip() for o in e["o"]],
                "answer_index": e["a"], "explanation_ta": e["e"].strip(),
                "source_hint": f"TNPSC குரூப் 4 – {year} வினாத்தாள், வினா {n}" if is_pyq
                               else e["src"],
                "is_current_affairs": bool(e.get("ca", False)),
            })
    out.sort(key=lambda q: int(q["id"].rsplit("-", 1)[1]))
    dirty = attach_english(out, en, en_where, stamp, errors, used)
    dest = os.path.join(DATA, f"gen_pyq_{year}.json" if is_pyq else f"gen_{paper}.json")
    json.dump({"source": f"TNPSC Group 4 {year} question paper (answers ticked in source scan)" if is_pyq
               else "New questions written from Samacheer textbooks / syllabus, independently verified",
               "questions": out}, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return dest, errors, dirty


def validate_bank():
    manifest = json.load(open(os.path.join(DATA, "manifest.json"), encoding="utf-8"))
    errors, ids = [], set()
    count = collections.Counter()
    total, part_b, part_b_en = 0, 0, 0
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
            if s != "tamil":
                part_b += 1
                part_b_en += "question_en" in q
    cov_path = os.path.join(DATA, "_coverage.json")
    cov = json.load(open(cov_path, encoding="utf-8"))
    print(f"\nBank total: {total}   (Part B with English version: {part_b_en} / {part_b})")
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
    stamp = "--stamp" in sys.argv
    en, where = load_english()
    errors, used, dirty = [], set(), set()
    for paper, files in papers.items():
        dest, errs, d = build_paper(paper, files, en, where, stamp, used)
        errors += errs
        dirty |= d
        print(f"built {os.path.relpath(dest, ROOT)} from {len(files)} staging file(s)")
    for qid in sorted(set(en) - used):
        errors.append(f"English {qid}: no such question in the bank (held back or removed?)")
    for f in sorted(dirty):   # write fingerprints back, keeping the translation file otherwise as-is
        data = json.load(open(f, encoding="utf-8"))
        for qid in data:
            if qid in en and "h" in en[qid]:
                data[qid]["h"] = en[qid]["h"]
        json.dump(data, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"stamped {os.path.relpath(f, ROOT)}")
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
