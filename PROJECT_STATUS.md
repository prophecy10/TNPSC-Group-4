# TNPSC Group 4 Quiz — Project Status

_Last updated: 2026-10-17_

Exam: TNPSC CCSE-IV (Group 4), Notification 11/2026, on **10 Jan 2027**. Repo: `github.com/prophecy10/TNPSC-Group-4` (GitHub Pages).

## Question bank: 939 questions (Tamil; 523 Part B questions also in English)
- **Past papers 2022 / 2024 / 2025:** ticked answers were re-verified. Wrong ticks and misprints were corrected, with a note in the explanation (for example 2024 Q148 and Q154, and 2022 Q105, Q107 and Q171). 48 unfixable questions are left out and listed in `HELD_BACK.md`.
- **New questions:** written from the Samacheer textbooks and the official syllabus. GS facts were cross-checked against the English-medium Class 8–10 textbook text. Every aptitude and reasoning answer was recomputed in Python.
- **Final review on 2026-10-14:** all 799 question/answer pairs were re-read, and an automatic consistency check was run. Two questions with now-outdated textbook figures and one time-sensitive amount were removed.
- **Official final keys (2022, 2024):** every transcribed answer was compared with TNPSC's final answer keys. One wrong answer was fixed (2022 Q153). 2024 Q148 is kept on premolars, the scientifically correct answer, with a note. Questions where TNPSC accepted several answers were reworded. 2025 has no final key yet.
- **Exam-style questions:** 45 statement, match, assertion-reason and chronology GS questions, plus 30 on state government, local bodies, judiciary, TN development administration and economy.
- **English versions:** every GS and aptitude question has an English version in `tools/staging_en/`, fingerprinted against the Tamil source (`build_bank.py --stamp`).

Per-unit counts are in `data/_coverage.json`. Run `python tools/build_bank.py` to rebuild.

- **2026-10-17 additions (39):** 22 GS Unit 6 questions (archaeology, Sangam polities, Tamil literary history, Thirukkural, freedom struggle, social reform) with English versions; 15 Tamil Unit 3 (மரபு, வாக்கிய வகைகள், தன்வினை/பிறவினை, நிறுத்தற்குறிகள், வினா அமைத்தல்); 2 Tamil Unit 4 technical terms. Every unit is now at or above its coverage target.

## App
- Study, Quick Test (25 questions, 22½ min) and Full Test (200 questions, 3-hour countdown, auto-submits).
- Marks out of 300 (1.5 per question), shown per part, plus the Part A Tamil qualifying check (40%, i.e. 60/150).
- Answer review shows each question with your answer, the correct answer and the explanation, with a filter for wrong answers.
- Also: resume, mistakes and bookmarks review, weak-area dashboard, score history.
- Tamil / English switch (top of the screen): changes the whole interface and the Part B questions; Part A Tamil questions stay in Tamil. The choice is saved in the browser.
- Leaving a topic-wise (Study) quiz returns to the topic list.
- Today's 10: a date-seeded set of 10 (5 Tamil, 4 GS, 1 aptitude), the same for everyone each day; first attempt recorded; day streak.
- Share score: canvas score card shared through the phone's share sheet, or WhatsApp + image download on desktop.
- Installable and offline (PWA): `manifest.webmanifest` + `sw.js` cache the app and the full bank; files refresh in the background.
- Optional private visit counter: set `GOATCOUNTER_CODE` in `js/config.js`.

## Next ideas
- All units meet their targets; next, deepen exam-style (statement / match / assertion-reason) questions in GS U6 and Tamil U3.
- Before each exam cycle, recheck the questions tagged `is_current_affairs`.
