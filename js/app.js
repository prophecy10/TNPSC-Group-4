/* app.js — screen controller + quiz runtime (with resume, review, dashboard, timer) */
const OPT_KEYS = ['அ','ஆ','இ','ஈ'];
const OPT_KEYS_EN = ['A','B','C','D'];
const MARK_PER_Q = 1.5;                 // 200 questions × 1.5 = 300 marks (Notification 11/2026)
const FULL_SECONDS = 3*60*60;           // 3 hours for 200 questions
const PASS_FRACTION = 0.4;              // Part A Tamil: 40% (60 of 150) needed to qualify
const SUBJ_LABELS = {tamil:'பகுதி அ – தமிழ்', general_studies:'பகுதி ஆ – பொது அறிவு', aptitude:'பகுதி இ – திறனறிவு'};
const SUBJ_LABELS_EN = {tamil:'Part A – Tamil', general_studies:'Part B – General Studies', aptitude:'Part C – Aptitude'};
const MODE_LABELS = {study:'படிப்பு முறை', quick:'விரைவுத் தேர்வு', full:'முழுத் தேர்வு', daily:'இன்றைய 10',
                     review_wrong:'தவறுகள் மீள்பார்வை', review_marks:'அடையாளமிட்டவை'};
const MODE_LABELS_EN = {study:'Study mode', quick:'Quick test', full:'Full test', daily:"Today's 10",
                        review_wrong:'Practise mistakes', review_marks:'Bookmarks'};

let state = null;       // active quiz state
let lang = Store.getLang();   // 'ta' | 'en' — the site's interface, plus Part B (GS + aptitude) questions

/* ========== LANGUAGE ========== */
// Interface text follows the chosen language; question text switches only for Part B (Part A stays Tamil)
function T(ta, en){ return lang==='en' ? en : ta; }
function modeLabel(m){ return (lang==='en' ? MODE_LABELS_EN : MODE_LABELS)[m] || m; }
function subjLabel(s){ return (lang==='en' ? SUBJ_LABELS_EN : SUBJ_LABELS)[s] || s; }
function applyStaticText(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-en]').forEach(el=>{
    if(el.dataset.ta === undefined) el.dataset.ta = el.innerHTML;
    el.innerHTML = lang==='en' ? el.dataset.en : el.dataset.ta;
  });
}
function useEn(q){ return lang==='en' && (q._subject||q.subject)!=='tamil' && !!q.question_en; }
function qText(q){ return useEn(q) ? q.question_en : q.question_ta; }
function qOpts(q){ return useEn(q) ? q.options_en : q.options_ta; }
function qExp(q){ return (useEn(q) ? q.explanation_en : q.explanation_ta) || ''; }
function qMeta(q){
  return useEn(q) ? `${q.unit_name_en||''} ${q.topic_name_en?'· '+q.topic_name_en:''}`
                  : `${q.unit_name_ta||''} ${q.topic_name_ta?'· '+q.topic_name_ta:''}`;
}
function optKeys(q){ return useEn(q) ? OPT_KEYS_EN : OPT_KEYS; }
function updateLangToggles(){
  document.querySelectorAll('.lang-toggle button').forEach(b=>b.classList.toggle('on', b.dataset.lang===lang));
  // Header switch: on home, topic list and score page, and in a quiz only while a Part B question is showing
  // (a Part A Tamil question stays in Tamil, so the switch is hidden there)
  const onHome = $('#home').classList.contains('active');
  const onScore = $('#score').classList.contains('active');
  const q = state && $('#quiz').classList.contains('active') ? state.questions[state.idx] : null;
  const partB = q && (q._subject||q.subject)!=='tamil' && !!q.question_en;
  const onTopics = $('#topic-picker').classList.contains('active') || $('#learn-topics').classList.contains('active');
  const partBCards = $('#learn-cards').classList.contains('active') && fc && fc.subject!=='tamil';
  $('#lang-top').classList.toggle('hidden', !(onHome || onScore || onTopics || partB || partBCards));
}
function setLang(l){
  if(l===lang) return;
  lang = l; Store.setLang(l); updateLangToggles(); applyStaticText();
  renderHome();
  if($('#quiz').classList.contains('active') && state) renderQuestion();
  else if($('#score').classList.contains('active') && state){ renderScoreCard(); renderReview(); }
  else if($('#topic-picker').classList.contains('active')) renderTopics();
  else if($('#learn-topics').classList.contains('active')) renderLearnTopics();
  else if($('#learn-cards').classList.contains('active') && fc) renderCard();
}
let timerId = null;     // setInterval handle

function $(s){ return document.querySelector(s); }
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $('#'+id).classList.add('active');
  window.scrollTo(0,0);
  updateLangToggles();
}
function fmtTime(sec){
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = sec%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}
function fmtMarks(x){ return Number.isInteger(x) ? String(x) : x.toFixed(1); }
// Same pace as the real exam: 3 hours for 200 questions (25 questions → 22½ minutes)
function timeLimitFor(n){ return Math.round(FULL_SECONDS * n / 200); }

/* ========== DATES (device-local, so "today" matches the user's clock) ========== */
function dayStr(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayStr(){ return dayStr(new Date()); }
function prevDay(s){ const [y,m,d] = s.split('-').map(Number); return dayStr(new Date(y, m-1, d-1)); }
function daysToExam(){
  const [y,m,d] = EXAM_DATE.split('-').map(Number);
  const now = new Date(); const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m-1, d) - t0) / 86400000);
}
const EXAM_DATE = '2027-01-10';   // Notification 11/2026

/* ========== HOME ========== */
function renderHome(){
  renderDaily();
  renderResumeBanner();
  renderReviewButtons();
  renderDashboard();
  renderHistory();
}

function renderResumeBanner(){
  const r = Store.getResume();
  const el = $('#resume-banner');
  if(!r){ el.innerHTML=''; el.style.display='none'; return; }
  el.style.display='block';
  const done = r.answers.filter(a=>a!==undefined && a!==null).length;
  el.innerHTML = `<div class="resume-card">
    <div><strong>▶ ${T('முடிக்காத '+modeLabel(r.mode), 'Unfinished '+modeLabel(r.mode))}</strong>
    <div class="resume-sub">${done}/${r.questions.length} ${T('வினா','questions')}${r.topicName?' · '+r.topicName:''}</div></div>
    <div class="resume-actions">
      <button class="btn-primary" id="resume-yes">${T('தொடரவும்','Resume')}</button>
      <button class="btn-ghost btn-small" id="resume-no">${T('நீக்கு','Discard')}</button>
    </div></div>`;
  $('#resume-yes').onclick = resumeTest;
  $('#resume-no').onclick = ()=>{ Store.clearResume(); renderResumeBanner(); };
}

function renderDaily(){
  const today = todayStr(), rec = Store.getDaily(today), streak = Store.dailyStreak(today, prevDay);
  const left = daysToExam();
  const examLine = left > 0 ? T(` · தேர்வுக்கு ${left} நாள்`, ` · ${left} days to the exam`) : '';
  $('#daily-card').classList.toggle('done', !!rec);
  $('#daily-sub').textContent = rec
    ? T(`இன்று முடித்தீர்கள்: ${rec.score}/${rec.total} · மீண்டும் பயிற்சி செய்யலாம்`, `Done today: ${rec.score}/${rec.total} · tap to practise again`)
    : T('தினமும் 10 வினாக்கள் · உடனடி விளக்கம்', '10 questions a day · instant explanations') + examLine;
  $('#daily-streak').textContent = streak ? `🔥 ${streak}` : T('தொடங்கு →', 'Start →');
  $('#daily-streak').title = T('தொடர்ச்சியான நாட்கள்', 'Day streak');
}

function renderReviewButtons(){
  const w = Store.allWrong().length, b = Store.allBookmarks().length;
  $('#review-wrong-count').textContent = w;
  $('#review-mark-count').textContent = b;
  $('#review-wrong').classList.toggle('disabled-card', w===0);
  $('#review-marks').classList.toggle('disabled-card', b===0);
}

function renderDashboard(){
  const stats = Store.topicStats();
  const keys = Object.keys(stats);
  const el = $('#dashboard');
  if(!keys.length){ el.innerHTML=''; return; }
  // sort weakest first (lowest accuracy, min 1 attempt)
  const rows = keys.map(k=>({...stats[k], key:k, pct: Math.round(stats[k].correct/stats[k].total*100)}))
                   .sort((a,b)=>a.pct-b.pct);
  const enNames = {};
  if(lang==='en') Bank.topics().forEach(g=>g.topics.forEach(t=>{ if(t.name_en) enNames[t.topic]=t.name_en; }));
  el.innerHTML = `<h2>${T('🎯 பலவீனப் பகுதிகள்','🎯 Weak areas')}</h2>
    <div class="dash-list">${rows.map(r=>{
      const cls = r.pct>=70?'good':r.pct>=40?'mid':'low';
      return `<div class="dash-row">
        <span class="dash-name">${enNames[r.key]||r.name}</span>
        <div class="dash-bar"><div class="dash-fill ${cls}" style="width:${r.pct}%"></div></div>
        <span class="dash-pct ${cls}">${r.pct}%</span>
        <span class="dash-n">${r.correct}/${r.total}</span>
      </div>`;}).join('')}</div>`;
}

function renderHistory(){
  const list = Store.allHistory();
  const el = $('#history-list');
  if (!list.length){ el.innerHTML = `<p class="empty-note">${T('இதுவரை தேர்வுகள் எதுவும் முடிக்கப்படவில்லை.','No tests completed yet.')}</p>`; return; }
  el.innerHTML = list.map(h=>{
    const pct = Math.round(h.score/h.total*100);
    const t = h.time ? ` · ⏱ ${fmtTime(h.time)}` : '';
    if (h.marks != null) return `<div class="history-item">
      <div><div class="h-mode">${modeLabel(h.mode)}</div>
      <div class="h-date">${h.date}${t}</div></div>
      <div class="h-score">${fmtMarks(h.marks)}<small>/${fmtMarks(h.maxMarks)} · ${pct}%</small></div>
    </div>`;
    return `<div class="history-item">
      <div><div class="h-mode">${modeLabel(h.mode)}${h.topic?' · '+h.topic:''}</div>
      <div class="h-date">${h.date}${t}</div></div>
      <div class="h-score">${h.score}<small>/${h.total} · ${pct}%</small></div>
    </div>`;
  }).join('') + `<button class="clear-history" id="clear-hist">${T('வரலாற்றை அழி','Clear history')}</button>`;
  $('#clear-hist').onclick = ()=>{ if(confirm(T('அனைத்து மதிப்பெண் வரலாற்றையும் அழிக்கவா?','Clear all score history?'))){ Store.clearHistory(); renderHistory(); } };
}

/* ========== STUDY TOPIC PICKER ========== */
function renderTopics(){
  const groups = Bank.topics();
  const el = $('#topic-list');
  let html = '';
  groups.forEach(g=>{
    if(!g.topics.length) return;
    html += `<div class="topic-group-label">${T(g.label, g.label_en)}</div>`;
    g.topics.forEach(t=>{
      const label = (lang==='en' && t.name_en) ? `${t.name_en} <small class="t-alt">${t.name}</small>` : t.name;
      html += `<button class="topic-btn" data-topic="${t.topic}" data-name="${t.name}">
        <span>${label}</span><span class="t-count">${t.qs.length} ${T('வினா','Qs')}</span></button>`;
    });
  });
  el.innerHTML = html || `<p class="empty-note">${T('வினாக்கள் ஏற்றப்படவில்லை.','Questions could not be loaded.')}</p>`;
  el.querySelectorAll('.topic-btn').forEach(b=>{
    b.onclick = ()=> startStudy(b.dataset.topic, b.dataset.name);
  });
}

/* ========== STUDY TIME (flashcards) ========== */
let flash = null;      // data/flashcards.json, loaded on first use
let fc = null;         // {subject, topic, idx}
async function loadFlashcards(){
  if(flash) return flash;
  const res = await fetch('data/flashcards.json', {cache:'no-store'});
  flash = await res.json();
  return flash;
}
// Tamil (Part A) cards stay Tamil; GS and aptitude cards follow the language switch
function fcEn(){ return lang==='en' && fc && fc.subject!=='tamil'; }
function fcField(c, k){ return (fcEn() && c[k+'_en']!==undefined) ? c[k+'_en'] : c[k]; }
const SUBJ_GROUP = {tamil:['பகுதி அ – தமிழ்','Part A – Tamil'], general_studies:['பகுதி ஆ – பொது அறிவு','Part B – General Studies'],
                    aptitude:['பகுதி இ – திறனறிவு, நுண்ணறிவு','Part C – Aptitude & Mental Ability']};
async function openLearn(){
  try { await loadFlashcards(); }
  catch(e){ alert(T('அட்டைகளை ஏற்ற இயலவில்லை.','Could not load the flashcards.')); return; }
  renderLearnTopics(); show('learn-topics');
}
function renderLearnTopics(){
  if(!flash) return;
  let html = '';
  flash.subjects.forEach(s=>{
    html += `<div class="topic-group-label">${T(SUBJ_GROUP[s.subject][0], SUBJ_GROUP[s.subject][1])}</div>`;
    s.units.forEach(u=>{
      html += `<div class="unit-label">${T('அலகு','Unit')} ${u.unit} · ${(lang==='en' && u.name_en) ? u.name_en : u.name}</div>`;
      u.topics.forEach(t=>{
        const label = (lang==='en' && t.name_en) ? `${t.name_en} <small class="t-alt">${t.name}</small>` : t.name;
        html += `<button class="topic-btn" data-subject="${s.subject}" data-topic="${t.topic}">
          <span>${label}</span><span class="t-count">${t.cards.length} ${T('அட்டை','cards')}</span></button>`;
      });
    });
  });
  const el = $('#learn-list');
  el.innerHTML = html;
  el.querySelectorAll('.topic-btn').forEach(b=> b.onclick = ()=> openCards(b.dataset.subject, b.dataset.topic));
}
function findTopic(subject, topic){
  for(const s of flash.subjects) if(s.subject===subject)
    for(const u of s.units) for(const t of u.topics) if(t.topic===topic) return {unit:u, topic:t};
  return null;
}
function openCards(subject, topic){
  fc = {subject, topic, idx:0};
  show('learn-cards'); renderCard();
}
function renderCard(){
  const hit = findTopic(fc.subject, fc.topic); if(!hit) return;
  const cards = hit.topic.cards, c = cards[fc.idx], n = cards.length, en = fcEn();
  $('#fc-counter').textContent = `${fc.idx+1} / ${n}`;
  $('#fc-progress').style.width = ((fc.idx+1)/n*100)+'%';
  $('#fc-meta').textContent = (en && hit.topic.name_en) ? hit.topic.name_en : hit.topic.name;
  const card = $('#fc-card');
  const title = fcField(c,'t'), body = fcField(c,'b')||'', ex = fcField(c,'x')||'';
  card.className = 'fc-card';
  card.innerHTML = `<div class="fc-title">${title}</div>
    ${body ? `<div class="fc-body">${body}</div>` : ''}
    ${ex ? `<div class="fc-ex"><b>${T('எடுத்துக்காட்டு','Example')}</b>${ex}</div>` : ''}`;
  $('#fc-prev').textContent = T('← முந்தையது','← Previous');
  $('#fc-prev').style.visibility = fc.idx>0 ? 'visible' : 'hidden';
  $('#fc-next').textContent = fc.idx<n-1 ? T('அடுத்தது →','Next →') : T('தலைப்புகளுக்குத் திரும்பு','Back to topics');
  updateLangToggles();
}
function stepCard(d){
  const n = findTopic(fc.subject, fc.topic).topic.cards.length;
  if(d>0 && fc.idx===n-1){ renderLearnTopics(); show('learn-topics'); return; }
  fc.idx = Math.max(0, Math.min(n-1, fc.idx+d)); renderCard(); window.scrollTo(0,0);
}

/* ========== START MODES ========== */
function beginQuiz(opts){
  // opts: {mode, questions, reveal, topicName, timed}
  state = {
    mode:opts.mode, questions:opts.questions, idx:0, answers:[],
    reveal:opts.reveal, topicName:opts.topicName||null,
    timed: !!opts.timed, elapsed:0, startedAt:Date.now(),
    limit: opts.timed ? timeLimitFor(opts.questions.length) : null
  };
  stopTimer();
  if(state.timed) startTimer();
  show('quiz'); renderQuestion(); persist();
}
function startStudy(topicKey, topicName, exclude){
  const qs = Bank.studyQuestions(topicKey, exclude);
  if(!qs.length){ alert(T('இந்தத் தலைப்பில் வினாக்கள் இல்லை.','There are no questions in this topic.')); return; }
  beginQuiz({mode:'study', questions:qs, reveal:true, topicName, timed:false});
  state._topicKey = topicKey; state._studied = (exclude||[]).concat(qs.map(q=>q.id));
}
function startDaily(){
  const day = todayStr();
  const qs = Bank.dailyQuestions(day);
  if(!qs.length){ alert(T('வினாக்கள் ஏற்றப்படவில்லை.','Questions could not be loaded.')); return; }
  beginQuiz({mode:'daily', questions:qs, reveal:true, timed:false});
  state._day = day;
}
function startQuick(){ beginQuiz({mode:'quick', questions:Bank.quickTest(), reveal:false, timed:true}); }
function startFull(){ beginQuiz({mode:'full', questions:Bank.fullTest(), reveal:false, timed:true}); }
function startReviewWrong(){
  const list = Store.allWrong(); if(!list.length) return;
  beginQuiz({mode:'review_wrong', questions:Bank.reviewQuestions(list), reveal:true, topicName:'தவறுகள்', timed:false});
}
function startReviewMarks(){
  const list = Store.allBookmarks(); if(!list.length) return;
  beginQuiz({mode:'review_marks', questions:Bank.reviewQuestions(list), reveal:true, topicName:'அடையாளமிட்டவை', timed:false});
}

/* ========== RESUME ========== */
function persist(){
  // Only persist resumable test modes (not study/review, which are low-stakes & topic-based)
  if(state && (state.mode==='quick' || state.mode==='full')){
    Store.saveResume({
      mode:state.mode, questions:state.questions, answers:state.answers,
      idx:state.idx, topicName:state.topicName, timed:state.timed, elapsed:state.elapsed, limit:state.limit
    });
  }
}
function resumeTest(){
  const r = Store.getResume(); if(!r) return;
  state = {mode:r.mode, questions:r.questions, idx:r.idx||0, answers:r.answers||[],
           reveal:false, topicName:r.topicName, timed:r.timed, elapsed:r.elapsed||0, startedAt:Date.now(),
           limit: r.limit || (r.timed ? timeLimitFor(r.questions.length) : null)};
  stopTimer(); if(state.timed) startTimer();
  show('quiz'); renderQuestion();
}

/* ========== TIMER ========== */
function startTimer(){
  updateTimerLabel();
  timerId = setInterval(()=>{
    state.elapsed++; updateTimerLabel();
    if(state.limit && state.elapsed >= state.limit){
      stopTimer(); alert(T('நேரம் முடிந்தது! தேர்வு தானாகச் சமர்ப்பிக்கப்படுகிறது.','Time is up! The test is being submitted automatically.')); finishQuiz(); return;
    }
    if(state.elapsed%10===0) persist();
  }, 1000);
}
function stopTimer(){ if(timerId){ clearInterval(timerId); timerId=null; } }
function updateTimerLabel(){
  const el = $('#timer'); if(!el) return;
  el.style.display = state.timed ? 'inline' : 'none';
  if(state.timed){
    const left = state.limit - state.elapsed;
    el.textContent = '⏱ '+fmtTime(left);
    el.classList.toggle('low', left <= 300);   // last 5 minutes in red
  }
}

/* ========== QUESTION RENDER ========== */
function renderQuestion(){
  const q = state.questions[state.idx];
  const n = state.questions.length;
  $('#q-counter').textContent = `${state.idx+1} / ${n}`;
  $('#progress-bar').style.width = ((state.idx)/n*100)+'%';
  updateTimerLabel();

  const marked = Store.isBookmarked(q.id);
  const area = $('#question-area');
  area.innerHTML = `
    <div class="q-head">
      <div class="q-meta">${qMeta(q)}</div>
      <button class="bookmark-btn ${marked?'on':''}" id="bm" title="${T('அடையாளமிடு','Bookmark')}">${marked?'★':'☆'}</button>
    </div>
    <div class="q-text">${state.idx+1}. ${qText(q)}</div>
    <div class="options">
      ${qOpts(q).map((o,i)=>`<button class="option" data-i="${i}">
        <span class="opt-key">${optKeys(q)[i]}</span><span class="opt-text">${o}</span></button>`).join('')}
    </div>
    <div id="fb-slot"></div>`;
  area.querySelectorAll('.option').forEach(btn=>{
    btn.onclick = ()=> selectOption(parseInt(btn.dataset.i));
  });
  $('#bm').onclick = ()=>{
    const now = Store.toggleBookmark(q);
    $('#bm').textContent = now?'★':'☆';
    $('#bm').classList.toggle('on', now);
  };
  updateLangToggles();
  // If this question was already answered (resume), re-render its answered state
  if(state.answers[state.idx]!==undefined && state.answers[state.idx]!==null){
    replayAnswered();
  } else if (!state.reveal) {
    renderNextBtn();          // tests: allow skipping, like the real exam
  } else {
    $('#quiz-footer').innerHTML = '';
  }
}

function replayAnswered(){
  const q = state.questions[state.idx], choice = state.answers[state.idx];
  const opts = $('#question-area').querySelectorAll('.option');
  if(state.reveal){
    opts.forEach((b,i)=>{ b.classList.add('disabled');
      if(i===q.answer_index) b.classList.add('correct');
      if(i===choice && choice!==q.answer_index) b.classList.add('wrong'); });
    const ok = choice===q.answer_index;
    $('#fb-slot').innerHTML = feedbackHtml(q, ok);
  } else {
    opts.forEach((b,i)=>b.classList.toggle('selected', i===choice));
  }
  renderNextBtn();
}

function feedbackHtml(q, ok){
  const title = ok ? T('✓ சரி!','✓ Correct!') : T('✗ தவறு','✗ Wrong');
  return `<div class="feedback ${ok?'ok':'no'}">
      <div class="f-title ${ok?'ok':'no'}">${title}</div>
      <div class="f-exp">${qExp(q)}</div></div>`;
}

function selectOption(choice){
  const q = state.questions[state.idx];
  const firstTime = (state.answers[state.idx]===undefined || state.answers[state.idx]===null);
  state.answers[state.idx] = choice;
  const opts = $('#question-area').querySelectorAll('.option');

  if (state.reveal){
    opts.forEach((b,i)=>{ b.classList.add('disabled');
      if(i===q.answer_index) b.classList.add('correct');
      if(i===choice && choice!==q.answer_index) b.classList.add('wrong'); });
    const ok = choice===q.answer_index;
    $('#fb-slot').innerHTML = feedbackHtml(q, ok);
    // study/review: record stats + wrong list immediately
    if(firstTime){
      Store.recordAnswer(q.topic, q.topic_name_ta, ok);
      if(!ok) Store.addWrong(q); else if(state.mode==='review_wrong') Store.removeWrong(q.id);
    }
    renderNextBtn();
  } else {
    opts.forEach((b,i)=>b.classList.toggle('selected', i===choice));
    renderNextBtn();
  }
  persist();
}

function renderNextBtn(){
  const last = state.idx === state.questions.length-1;
  const footer = $('#quiz-footer');
  const label = last
    ? (state.reveal ? T('முடிவைக் காண்','See result') : T('தேர்வை முடி','Finish test'))
    : (state.reveal ? T('அடுத்த வினா →','Next question →') : T('அடுத்தது →','Next →'));
  const prev = state.idx>0 ? `<button class="btn-ghost" id="prev">${T('← முந்தையது','← Previous')}</button>` : '';
  footer.innerHTML = prev + `<button class="btn-primary" id="next">${label}</button>`;
  if($('#prev')) $('#prev').onclick = ()=>{ state.idx--; renderQuestion(); };
  $('#next').onclick = ()=>{
    const unanswered = state.answers[state.idx]===undefined || state.answers[state.idx]===null;
    // Study/review: answer before moving on. Tests: may skip and come back, like the real exam.
    if (state.reveal && unanswered){ alert(T('ஒரு விடையைத் தேர்ந்தெடுக்கவும்.','Please choose an answer.')); return; }
    if (last){
      const skipped = state.questions.filter((_,i)=>state.answers[i]===undefined||state.answers[i]===null).length;
      if (!state.reveal && skipped && !confirm(T(`${skipped} வினாக்களுக்கு விடையளிக்கவில்லை. தேர்வை முடிக்கவா?`, `${skipped} questions are unanswered. Finish the test?`))) return;
      finishQuiz();
    }
    else { state.idx++; renderQuestion(); }
  };
}

/* ========== SCORE ========== */
function finishQuiz(){
  stopTimer();
  const qs = state.questions;
  const isTest = state.mode==='quick' || state.mode==='full';
  let score = 0, skipped = 0;
  const parts = {};   // per-subject {n, correct}
  qs.forEach((q,i)=>{
    const ans = state.answers[i];
    const ok = ans===q.answer_index;
    if(ok) score++;
    if(ans===undefined || ans===null) skipped++;
    const subj = q._subject || q.subject || 'general_studies';
    parts[subj] = parts[subj] || {n:0, correct:0};
    parts[subj].n++; if(ok) parts[subj].correct++;
    // For test modes, record stats + wrong list now (study/review already did on answer)
    if(isTest){
      Store.recordAnswer(q.topic, q.topic_name_ta, ok);
      if(!ok) Store.addWrong(q);
    }
  });
  const total = qs.length;
  const marks = score*MARK_PER_Q, maxMarks = total*MARK_PER_Q;
  state._result = {isTest, score, skipped, total, parts};
  if(state.mode==='daily'){
    state._result.dailyFirst = Store.saveDaily(state._day, score, total);
    state._result.streak = Store.dailyStreak(state._day, prevDay);
  }

  Store.addHistory({
    mode: state.mode, topic: state.topicName||null, score, total,
    marks: isTest ? marks : null, maxMarks: isTest ? maxMarks : null,
    time: state.timed ? state.elapsed : null,
    date: new Date().toLocaleString('ta-IN',{dateStyle:'medium',timeStyle:'short'})
  });
  Store.clearResume();

  $('#back-topics').style.display = state.mode==='study' ? '' : 'none';
  renderScoreCard();
  renderReview();
  show('score');
}

function renderScoreCard(){
  const {isTest, score, skipped, total, parts} = state._result;
  const pct = Math.round(score/total*100);
  const marks = score*MARK_PER_Q, maxMarks = total*MARK_PER_Q;
  // Part A (Tamil) qualifying check: 40% of Part A marks (60 of 150 in the full exam)
  let qualifyHtml = '';
  if(isTest && parts.tamil){
    const tm = parts.tamil.correct*MARK_PER_Q, tmax = parts.tamil.n*MARK_PER_Q, need = tmax*PASS_FRACTION;
    const pass = tm >= need, got = `${fmtMarks(tm)}/${fmtMarks(tmax)}`;
    qualifyHtml = `<div class="qualify ${pass?'ok':'no'}">${pass
      ? T(`✓ பகுதி அ (தமிழ்) தகுதி பெற்றீர்கள்: ${got} (தேவை ${fmtMarks(need)})`,
          `✓ You qualified in Part A (Tamil): ${got} (needed ${fmtMarks(need)})`)
      : T(`✗ பகுதி அ (தமிழ்) தகுதி பெறவில்லை: ${got} (தேவை ${fmtMarks(need)}). உண்மைத் தேர்வில் இவ்வாறு இருந்தால் பகுதி ஆ, இ மதிப்பிடப்படமாட்டா.`,
          `✗ You did not qualify in Part A (Tamil): ${got} (needed ${fmtMarks(need)}). In the real exam, Parts B and C would not be evaluated.`)}</div>`;
  }
  const partRows = isTest ? `<div class="part-table">${['tamil','general_studies','aptitude'].filter(s=>parts[s]).map(s=>
    `<div class="part-row"><span>${subjLabel(s)}</span><span>${parts[s].correct}/${parts[s].n} · <b>${fmtMarks(parts[s].correct*MARK_PER_Q)}</b>/${fmtMarks(parts[s].n*MARK_PER_Q)} ${T('மதிப்பெண்','marks')}</span></div>`).join('')}</div>` : '';
  const msg = pct>=80 ? T('🏆 சிறப்பு!','🏆 Excellent!') : pct>=60 ? T('👍 நன்று!','👍 Good!')
            : pct>=40 ? T('🙂 பரவாயில்லை','🙂 Not bad') : T('📖 இன்னும் பயிற்சி தேவை','📖 More practice needed');
  const timeLine = state.timed ? `<div class="score-pct">⏱ ${T('எடுத்த நேரம்','Time taken')}: ${fmtTime(state.elapsed)} / ${fmtTime(state.limit)}</div>` : '';
  const big = isTest
    ? `<div class="score-big">${fmtMarks(marks)}<small>/${fmtMarks(maxMarks)}</small></div>
       <div class="score-pct">${T(`மதிப்பெண் · ${score}/${total} சரி (${pct}%)`, `Marks · ${score}/${total} correct (${pct}%)`)}${skipped?T(` · ${skipped} விடையளிக்கவில்லை`, ` · ${skipped} unanswered`):''}</div>`
    : `<div class="score-big">${score}<small>/${total}</small></div>
       <div class="score-pct">${T(`${pct}% சரியான விடைகள்`, `${pct}% correct answers`)}</div>`;
  let dailyLine = '';
  if(state.mode==='daily'){
    const st = state._result.streak || 0;
    dailyLine = `<div class="score-pct">${st ? T(`🔥 ${st} நாள் தொடர்ச்சி`, `🔥 ${st}-day streak`) : ''}${state._result.dailyFirst ? '' : T(' · இது மறுபயிற்சி (முதல் முயற்சியே பதிவாகும்)', ' · practice re-run (only your first attempt is recorded)')}</div>
      <div class="score-pct">${T('நாளை புதிய 10 வினாக்கள்!', 'New 10 questions tomorrow!')}</div>`;
  }
  $('#score-card').innerHTML = `${big}${timeLine}${dailyLine}${partRows}${qualifyHtml}<div class="score-msg">${msg}</div>`;
}

// Answer review: every question with your answer, the correct answer and why
function renderReview(){
  const qs = state.questions;
  let score = 0;
  const items = qs.map((q,i)=>{
    const your = state.answers[i], ok = your===q.answer_index, none = your===undefined||your===null;
    if(ok) score++;
    const status = ok ? 'ok' : none ? 'skip' : 'no';
    const badge = ok ? T('✓ சரி','✓ Correct') : none ? T('— விடையளிக்கவில்லை','— Not answered') : T('✗ தவறு','✗ Wrong');
    const opts = qOpts(q).map((o,j)=>{
      const cls = j===q.answer_index ? 'rv-opt right' : (j===your ? 'rv-opt picked' : 'rv-opt');
      const tag = j===q.answer_index ? T(' ✓ சரியான விடை',' ✓ Correct answer') : (j===your ? T(' ✗ உங்கள் விடை',' ✗ Your answer') : '');
      return `<div class="${cls}"><b>${optKeys(q)[j]}.</b> ${o}<span class="rv-tag">${tag}</span></div>`;
    }).join('');
    return `<div class="exp-item st-${status}">
      <div class="exp-head"><span class="exp-num">${i+1}</span><span class="exp-badge ${status}">${badge}</span></div>
      <div class="exp-q">${qText(q).replace(/\n/g,'<br>')}</div>
      <div class="rv-opts">${opts}</div>
      <div class="exp-detail"><span class="lab">💡 ${T('விளக்கம்','Explanation')}:</span> ${qExp(q)}</div></div>`;
  });
  const wrongCount = qs.length - score;
  const filter = $('#rv-list') && $('#rv-list').classList.contains('only-bad') ? 'bad' : 'all';
  $('#explanations').innerHTML = `<h3>${T('விடைகள் மீள்பார்வை','Answer review')}</h3>
    <div class="rv-filter">
      <button class="chip ${filter==='all'?'on':''}" data-f="all">${T('அனைத்தும்','All')} (${qs.length})</button>
      <button class="chip ${filter==='bad'?'on':''}" data-f="bad">${T('தவறு / விடையில்லை','Wrong / unanswered')} (${wrongCount})</button>
    </div>
    <div id="rv-list" class="${filter==='bad'?'only-bad':''}">${items.join('')}</div>`;
  $('#explanations').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{
    $('#explanations').querySelectorAll('.chip').forEach(x=>x.classList.toggle('on', x===c));
    $('#rv-list').classList.toggle('only-bad', c.dataset.f==='bad');
  });
}

/* ========== SHARE ========== */
async function shareScore(){
  if(!state || !state._result) return;
  const {isTest, score, total, parts} = state._result;
  const pct = Math.round(score/total*100);
  const marks = score*MARK_PER_Q, maxMarks = total*MARK_PER_Q;
  const left = daysToExam();
  const modeName = state.mode==='study' && state.topicName ? `${modeLabel('study')} · ${state.topicName}` : modeLabel(state.mode);
  const info = {
    heading: T('TNPSC குரூப் 4 பயிற்சி', 'TNPSC Group 4 Practice'),
    mode: modeName,
    big: isTest ? fmtMarks(marks) : String(score),
    small: '/' + (isTest ? fmtMarks(maxMarks) : String(total)),
    line: isTest ? T(`${score}/${total} சரி (${pct}%)`, `${score}/${total} correct (${pct}%)`) : T(`${pct}% சரியான விடைகள்`, `${pct}% correct`),
    rows: isTest ? ['tamil','general_studies','aptitude'].filter(s=>parts[s]).map(s=>[subjLabel(s), `${parts[s].correct}/${parts[s].n}`]) : [],
    badge: state.mode==='daily' && state._result.streak ? T(`🔥 ${state._result.streak} நாள் தொடர்ச்சி`, `🔥 ${state._result.streak}-day streak`)
         : (left>0 ? T(`தேர்வுக்கு ${left} நாள்`, `${left} days to the exam`) : ''),
    cta: T('நீங்களும் முயற்சி செய்யுங்கள் 👇', 'Try it yourself 👇'),
    accent: pct>=60 ? '#2b8a3e' : pct>=40 ? '#0b7285' : '#c92a2a'
  };
  const text = state.mode==='daily'
    ? T(`இன்றைய TNPSC குரூப் 4 – 10 வினாக்களில் ${score} சரி! உங்களால் முடியுமா? 💪`, `Today's TNPSC Group 4 daily 10: I got ${score}/10. Can you beat it? 💪`)
    : isTest
      ? T(`TNPSC குரூப் 4 ${modeLabel(state.mode)}: ${fmtMarks(marks)}/${fmtMarks(maxMarks)} மதிப்பெண். இலவசமாகப் பயிற்சி செய்யுங்கள் 👇`, `TNPSC Group 4 ${modeLabel(state.mode)}: ${fmtMarks(marks)}/${fmtMarks(maxMarks)} marks. Practise free 👇`)
      : T(`TNPSC குரூப் 4 பயிற்சியில் ${score}/${total} சரி. இலவசமாகப் பயிற்சி செய்யுங்கள் 👇`, `I got ${score}/${total} in TNPSC Group 4 practice. Practise free 👇`);
  const btn = $('#share-btn'); btn.disabled = true;
  try { await Share.share(info, text); } finally { btn.disabled = false; }
}

/* ========== OFFLINE + INSTALL ========== */
let installEvt = null;
function setupPwa(){
  if('serviceWorker' in navigator && location.protocol !== 'file:'){
    const reg = ()=> navigator.serviceWorker.register('sw.js').catch(()=>{});
    if(document.readyState==='complete') reg(); else window.addEventListener('load', reg);
  }
  window.addEventListener('beforeinstallprompt', e=>{
    e.preventDefault(); installEvt = e; $('#install-btn').style.display = 'flex';
  });
  window.addEventListener('appinstalled', ()=>{ installEvt = null; $('#install-btn').style.display = 'none'; });
  $('#install-btn').onclick = async ()=>{
    if(!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch(e){}
    installEvt = null; $('#install-btn').style.display = 'none';
  };
}

/* ========== WIRING ========== */
function goHome(){ stopTimer(); renderHome(); show('home'); }
// Leaving a topic-wise (study) quiz returns to the topic list; tests and reviews return home
function goTopics(){ stopTimer(); renderTopics(); show('topic-picker'); }
function exitQuiz(){ if(state && state.mode==='study') goTopics(); else goHome(); }

async function init(){
  applyStaticText();
  setupPwa();
  await Bank.load();
  renderHome();

  document.querySelectorAll('.mode-card').forEach(c=>{
    c.onclick = ()=>{
      const m = c.dataset.mode;
      if(m==='learn') openLearn();
      else if(m==='study'){ renderTopics(); show('topic-picker'); }
      else if(m==='quick') startQuick();
      else if(m==='full') startFull();
    };
  });
  $('#daily-card').onclick = startDaily;
  $('#share-btn').onclick = shareScore;
  $('#quiz-exit').onclick = exitQuiz;
  $('#learn-back').onclick = ()=>{ renderLearnTopics(); show('learn-topics'); };
  $('#fc-prev').onclick = ()=> stepCard(-1);
  $('#fc-next').onclick = ()=> stepCard(1);
  $('#back-topics').onclick = goTopics;
  document.querySelectorAll('.lang-toggle button').forEach(b=> b.onclick = ()=> setLang(b.dataset.lang));
  updateLangToggles();
  $('#review-wrong').onclick = ()=>{ if(Store.allWrong().length) startReviewWrong(); };
  $('#review-marks').onclick = ()=>{ if(Store.allBookmarks().length) startReviewMarks(); };

  document.querySelectorAll('[data-back]').forEach(b=>{
    b.onclick = ()=>{ const t=b.dataset.back; if(t==='home') goHome(); else show(t); };
  });

  // Warn before leaving an in-progress test
  window.addEventListener('beforeunload', (e)=>{
    if(state && (state.mode==='quick'||state.mode==='full') && !$('#score').classList.contains('active')){
      persist();
    }
  });
}
init();
