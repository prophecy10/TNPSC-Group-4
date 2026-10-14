# TNPSC Group 4 Quiz — Project Status

_Last updated: 2026-10-14_

Exam: TNPSC CCSE-IV (Group 4), Notification 11/2026, on **10 Jan 2027**. Repo: `github.com/prophecy10/TNPSC-Group-4` (GitHub Pages).

## Question bank: 900 questions (Tamil; 501 Part B questions also in English)
- **Past papers 2022 / 2024 / 2025:** ticked answers were re-verified. Wrong ticks and misprints were corrected, with a note in the explanation (for example 2024 Q148 and Q154, and 2022 Q105, Q107 and Q171). 48 unfixable questions are left out and listed in `HELD_BACK.md`.
- **New questions:** written from the Samacheer textbooks and the official syllabus. GS facts were cross-checked against the English-medium Class 8–10 textbook text. Every aptitude and reasoning answer was recomputed in Python.
- **Final review on 2026-10-14:** all 799 question/answer pairs were re-read, and an automatic consistency check was run. Two questions with now-outdated textbook figures and one time-sensitive amount were removed.
- **Official final keys (2022, 2024):** every transcribed answer was compared with TNPSC's final answer keys. One wrong answer was fixed (2022 Q153). 2024 Q148 is kept on premolars, the scientifically correct answer, with a note. Questions where TNPSC accepted several answers were reworded. 2025 has no final key yet.
- **Exam-style questions:** 45 statement, match, assertion-reason and chronology GS questions, plus 30 on state government, local bodies, judiciary, TN development administration and economy.
- **English versions:** every GS and aptitude question has an English version in `tools/staging_en/`, fingerprinted against the Tamil source (`build_bank.py --stamp`).

Per-unit counts are in `data/_coverage.json`. Run `python tools/build_bank.py` to rebuild.

## App
- Study, Quick Test (25 questions, 22½ min) and Full Test (200 questions, 3-hour countdown, auto-submits).
- Marks out of 300 (1.5 per question), shown per part, plus the Part A Tamil qualifying check (40%, i.e. 60/150).
- Answer review shows each question with your answer, the correct answer and the explanation, with a filter for wrong answers.
- Also: resume, mistakes and bookmarks review, weak-area dashboard, score history.
- Tamil / English switch (top of the screen): changes the whole interface and the Part B questions; Part A Tamil questions stay in Tamil. The choice is saved in the browser.
- Leaving a topic-wise (Study) quiz returns to the topic list.
- Optional private visit counter: set `GOATCOUNTER_CODE` in `js/config.js`.

## Next ideas
- Fill the remaining thin units: Tamil U3 writing skills, GS U4 polity, U6 TN history, U2 geography.
- Before each exam cycle, recheck the questions tagged `is_current_affairs`.
