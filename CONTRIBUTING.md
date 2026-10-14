# Contributing to TNPSC குரூப் 4 பயிற்சி

Thank you for helping! This site is used by people preparing for the TNPSC Group 4 exam. **A wrong "correct answer" does more harm than a missing question**, so every contribution must be accurate and verifiable.

## Ways to help
- **Report a wrong answer or typo:** [open an issue](https://github.com/prophecy10/TNPSC-Group-4/issues). Include the question ID (for example `PYQ-2024-GS-148`), what is wrong, and a source such as a Samacheer textbook page, an official notification or a reliable website.
- **Add new questions:** see below. Units that need more questions are listed in `data/_coverage.json`, or run the build script to print them.
- **Improve the app:** the HTML, CSS and JS are plain files with no build step.

## Adding questions

### 1. Write them in a staging file
Questions live in `tools/staging/*.json` in a short format. Add them to an existing `new_*.json` file, or create a new one (for example `new_polity2.json`):

```json
{
  "n": 1201,
  "t": "rights_duties",
  "d": "easy",
  "q": "அடிப்படை உரிமைகள் அரசியலமைப்பின் எந்தப் பகுதியில் உள்ளன?",
  "o": ["பகுதி II", "பகுதி III", "பகுதி IV", "பகுதி IV-A"],
  "a": 1,
  "e": "அடிப்படை உரிமைகள் பகுதி III-இல் (உறுப்புகள் 12–35) உள்ளன. பகுதி IV – நெறிமுறைக் கோட்பாடுகள்; IV-A – அடிப்படைக் கடமைகள்.",
  "src": "10-ஆம் வகுப்பு சமூக அறிவியல் – குடிமையியல் அலகு 1"
}
```

| Field | Meaning |
|---|---|
| `n` | A number unique across **all** `new_*.json` files. Pick one above the current highest. |
| `t` | Topic key. It must exist in `data/_taxonomy.json`, which also decides the subject and unit. |
| `d` | `easy`, `medium` or `hard` |
| `q` | The question in Tamil. Use `\n` for line breaks in matching or statement questions. |
| `o` | Exactly **4** distinct options |
| `a` | Index of the correct option (0–3) |
| `e` | Explanation in Tamil: **why the answer is right and why the others are wrong** |
| `src` | Where the fact comes from (textbook, class, chapter, or an official source) |
| `ca` | Optional. Set to `true` for current affairs that may go out of date. |

### 2. Build and validate

```bash
python tools/build_bank.py
```

This writes `data/gen_*.json` and checks every question: 4 distinct options, a valid answer, unique IDs, known topics, and no garbled text. **Do not edit `data/gen_*.json` by hand**, because the next build overwrites it.

### 3. Test locally

```bash
python -m http.server 8000
```

Open http://localhost:8000, find your topic in படிப்பு முறை (Study), and try your questions.

### 4. Open a pull request
Explain which units you added to and the sources you used.

## Accuracy rules (please read)
1. **Every fact needs a source.** Prefer Samacheer Kalvi textbooks (6th–12th), the official TNPSC syllabus and notifications, or government websites.
2. **Recompute every maths and reasoning answer.** Don't copy it from a key.
3. **Past-paper answer keys can be wrong.** If the ticked answer is wrong, use the correct one and say so in the explanation.
4. **If a question has two defensible answers, rewrite it or leave it out.**
5. **Avoid figures that change**, such as scheme amounts or rankings. If you must include one, set `"ca": true`.
6. **Use clean Unicode Tamil.** Text copied from old-font PDFs often comes out garbled, and the build will reject it.

## Code changes
- Keep it a static site, so GitHub Pages can serve it without a build step.
- Store progress in `localStorage` only. No tracking, no backend.
- Check the layout on a phone-sized screen before submitting.

## License
By contributing, you agree that code changes are released under the [MIT License](LICENSE) and questions/explanations under [CC BY-SA 4.0](LICENSE-CONTENT).
