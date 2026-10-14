# TNPSC குரூப் 4 — தேர்வுப் பயிற்சி (Quiz App)

**▶ Open the site: https://prophecy10.github.io/TNPSC-Group-4/** (works on phone and desktop, no sign-up)

Contributions are welcome: new questions, corrections and app improvements. See [CONTRIBUTING.md](CONTRIBUTING.md).

A mobile-friendly, fully client-side quiz site for the TNPSC Group 4 exam (CCSE-IV, Notification 11/2026, exam on 10 Jan 2027).
All questions are in Tamil. Progress is stored only in the browser (localStorage). There is no backend and no tracking.

## Features
- **படிப்பு முறை (Study):** pick a topic and answer one question at a time. You see right or wrong straight away, with a detailed Tamil explanation. A session is up to 25 questions.
- **விரைவுத் தேர்வு (Quick Test):** 25 questions weighted to the syllabus, with 22½ minutes on the clock.
- **முழுத் தேர்வு (Full Test):** a 200-question mock exam with the real pattern: Tamil 100, General Studies 75, Aptitude 25. It has a **3-hour countdown that auto-submits**.
- **Exam-style scoring:** 1.5 marks per question, **out of 300**, with marks for each part and the **Part A (Tamil) qualifying check of 40%, i.e. 60/150**. Below that, Parts B and C are not evaluated in the real exam.
- **Answer review:** for every question you see your answer, the correct answer and the explanation. You can filter to only the wrong or skipped ones.
- **Also included:** resume an unfinished test, practise your mistakes, bookmarks, a weak-area dashboard, and score history.

## Question bank (799 questions)
| File | Source |
|---|---|
| `data/gen_pyq_2024.json`, `gen_pyq_2025.json`, `gen_pyq_2022.json` | Past TNPSC Group 4 papers. Each ticked answer was re-verified, and wrong ticks or misprints were corrected with a note. |
| `data/gen_new.json` | New questions written from the Samacheer textbooks and the official syllabus. Facts were cross-checked and every maths answer was recomputed. |
| `data/general_studies.json`, `data/aptitude.json` | Starter questions |

Past-paper questions that could not be made reliable are listed in `HELD_BACK.md` and are **not** in the app.

### Adding or editing questions
Questions are written in a short format in `tools/staging/*.json`. To rebuild and check the bank, run:

```bash
python tools/build_bank.py
```

The script writes `data/gen_*.json` and validates the whole bank: exactly 4 options, a valid answer, unique IDs, topics from `data/_taxonomy.json`, and no garbled text. It also prints coverage for each syllabus unit.

## Running locally
The app loads its questions with `fetch()`, so opening `index.html` directly does not work. Serve the folder instead:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Contributing
- **Found a wrong answer?** [Open an issue](https://github.com/prophecy10/TNPSC-Group-4/issues) with the question ID (shown in `data/gen_*.json`) and a source.
- **Want to add questions?** Write them in `tools/staging/`, then run `python tools/build_bank.py` and open a pull request.

Full guide, question format and accuracy rules: [CONTRIBUTING.md](CONTRIBUTING.md).

## Project structure
```
TNPSC-Quiz/
├── index.html, css/, js/       # the app (static, no build step)
├── data/
│   ├── gen_*.json              # generated question files (do not edit by hand)
│   ├── _taxonomy.json          # allowed topics per syllabus unit
│   ├── _coverage.json          # question count vs target per unit
│   └── manifest.json           # list of files the app loads
├── tools/
│   ├── build_bank.py           # build + validate the bank
│   └── staging/*.json          # editable question sources
├── HELD_BACK.md                # past-paper questions left out, with reasons
└── CONTRIBUTING.md
```

## Hosting
The site is served by GitHub Pages from the `main` branch root (`.nojekyll` is included).
