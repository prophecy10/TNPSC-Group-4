# TNPSC குரூப் 4 — தேர்வுப் பயிற்சி

**▶ Open the site: https://prophecy10.github.io/TNPSC-Group-4/**

A free practice website for the **TNPSC Group 4 exam (CCSE-IV)**. It works on phone and desktop, with no sign-up and no ads.

- Built for **Notification 11/2026** (exam on **10 January 2027**), following its official syllabus.
- **939 questions in Tamil.** The 523 Part B questions (General Studies and Aptitude) also have an **English version**; switch with the **த / En** button. Each question has a detailed explanation of why the answer is right and why the other options are wrong.
- Your progress stays only in your own browser; nothing you answer is uploaded. The site may count visits with [GoatCounter](https://www.goatcounter.com/), which uses no cookies and collects no personal data.

> This project was built with **[Claude Code](https://claude.com/claude-code)** (Anthropic's AI coding assistant), guided and reviewed by the repo owner. That covers the app, the transcription of past papers, the new questions, and the answer checking.

---

## Sections of the site

| Section | What it does |
|---|---|
| **த / En (Language)** | The switch at the top of the screen changes the whole site, and the Part B questions (General Studies and Aptitude), to Tamil or English. The site remembers your choice. Part A (Tamil) questions always stay in Tamil, as in the real exam, so the switch is hidden while one is showing. |
| 🗓️ **இன்றைய 10 (Today's 10)** | 10 new questions every day (5 Tamil, 4 GS, 1 aptitude), the **same set for everyone** that day, with instant explanations. Your first attempt is recorded and builds a **🔥 day streak**. |
| 📚 **படிப்பு முறை (Study)** | Pick a topic (Tamil grammar, Polity, Aptitude and so on) and answer one question at a time. You see right or wrong **immediately**, with the explanation. Up to 25 questions per session. Leaving returns you to the topic list. |
| ⚡ **விரைவுத் தேர்வு (Quick Test)** | 25 questions in the same subject mix as the real exam, in **22½ minutes**. Answers are shown at the end. |
| 📝 **முழுத் தேர்வு (Full Test)** | A full **200-question mock exam**: Tamil 100, General Studies 75, Aptitude 25. It has a **3-hour countdown** and submits automatically when time runs out. You can skip a question and come back to it. |
| 🏆 **Score page** | Marks **out of 300** (1.5 per question), shown separately for each part. It also checks the **Part A Tamil pass mark (60/150)**: in the real exam, Parts B and C are only marked if you clear it. |
| 🔍 **விடைகள் மீள்பார்வை (Answer review)** | Every question with your answer, the correct answer and the explanation. A filter shows only the wrong or skipped ones. |
| 🔁 **தவறுகள் மீள்பார்வை (Practise mistakes)** | Re-attempt the questions you got wrong. A question leaves this list once you answer it correctly. |
| ★ **அடையாளமிட்டவை (Bookmarks)** | Tap ☆ on any question to save it for revision. |
| 🎯 **பலவீனப் பகுதிகள் (Weak areas)** | Your accuracy for each topic, weakest first, so you know what to study next. |
| 📊 **முந்தைய மதிப்பெண்கள் (History)** | Your past test scores with date and time taken. An unfinished test can be **resumed**. |
| 📤 **Share score** | Share a score card image on WhatsApp or any app, with a link to the site. |
| 📲 **Install & offline** | Install it like an app from the browser. After the first visit, the whole site and question bank work **without internet**. |

---

## Where the questions come from

| Source | Used for |
|---|---|
| **TNPSC Notification 11/2026, Annexure III (syllabus)** | Units, topics and question weightage (Tamil 100 · GS 75 · Aptitude 25) |
| **TNPSC Group 4 question papers: 2022, 2024, 2025** | Past questions, transcribed and with **every answer independently re-checked**. The 2022 and 2024 answers have also been compared with TNPSC's **official final answer keys**. Where TNPSC accepted more than one answer, or the printed question was wrong, the question has been corrected and a note added in the explanation. |
| **Samacheer Kalvi (Tamil Nadu State Board) textbooks, Classes 6–12, Tamil and English medium** | New questions on geography, polity, economics, history, science and Tamil grammar, with facts cross-checked against the textbook text |
| **Topic-wise TNPSC study material** and **"where to study" guides** | Checking that the syllabus is fully covered |
| **Official and reliable websites** (government portals, PRS, ISRO and Election Commission information, major newspapers) | Current affairs and recent schemes. These questions are marked as time-sensitive. |

All aptitude and reasoning answers were **recalculated by computer**, not copied from answer keys.

> ⚠️ Current-affairs questions (marked `is_current_affairs` in the data) can go out of date. Please recheck them before the exam.

---

## How to contribute

Contributions are very welcome, whether that's new questions, corrections or app improvements.

### Found a wrong answer or a typo?
[Open an issue](https://github.com/prophecy10/TNPSC-Group-4/issues) and include:
- the question text, or its ID (for example `PYQ-2024-GS-148`; IDs are in `data/gen_*.json`)
- what is wrong
- a **source**, such as a Samacheer textbook class and chapter, an official notification or a reliable website

### Want to add questions?
1. Fork this repo.
2. Add your questions to a file in `tools/staging/` in the short format described in [CONTRIBUTING.md](CONTRIBUTING.md): question, 4 options, answer, Tamil explanation and source. For a General Studies or Aptitude question, also add its English version in `tools/staging_en/`.
3. Run `python tools/build_bank.py`. It builds the question files and checks every question for mistakes such as wrong option counts, duplicate IDs, unknown topics or garbled Tamil.
4. Test locally (see below), then open a pull request.

**The one rule: accuracy first.** Every fact needs a source, and every maths answer must be recalculated. If a question could have two correct answers, rewrite it or leave it out. Full guidelines are in [CONTRIBUTING.md](CONTRIBUTING.md).

### Want to improve the app?
It's plain HTML, CSS and JavaScript with no build step. Please keep it mobile-friendly, and keep users' answers and progress in their own browser.

---

## Run it on your computer

The app loads its questions with `fetch()`, so opening `index.html` directly won't work. Serve the folder instead:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Project structure

```
├── index.html, css/, js/     # the website (static, no build step)
├── data/
│   ├── gen_*.json            # question files used by the site (generated, do not edit by hand)
│   ├── _taxonomy.json        # syllabus units and allowed topics
│   └── _coverage.json        # questions per unit vs target
├── tools/
│   ├── build_bank.py         # builds and validates the question bank
│   ├── staging/*.json        # editable question sources (Tamil): add questions here
│   └── staging_en/*.json     # English versions of Part B questions
└── CONTRIBUTING.md           # detailed contribution guide
```

The site is hosted on GitHub Pages from the `main` branch.

## License

- **Code** (HTML, CSS, JavaScript, Python tools): [MIT License](LICENSE).
- **Questions and explanations** (`data/`, `tools/staging/`): [CC BY-SA 4.0](LICENSE-CONTENT). You can reuse and adapt them with credit to this repo, and must share your changes under the same license.
- **Past-paper questions** (`PYQ-` IDs) are based on TNPSC question papers. TNPSC's original wording remains its own and is used here for educational practice. See [LICENSE-CONTENT](LICENSE-CONTENT).

By contributing, you agree that your code is released under MIT and your questions under CC BY-SA 4.0.
