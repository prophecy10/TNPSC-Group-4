/* app.js — screen controller + quiz runtime (with resume, review, dashboard, timer) */
const OPT_KEYS = ['அ','ஆ','இ','ஈ'];
const MARK_PER_Q = 1.5;                 // 200 questions × 1.5 = 300 marks (Notification 11/2026)
const FULL_SECONDS = 3*60*60;           // 3 hours for 200 questions
const PASS_FRACTION = 0.4;              // Part A Tamil: 40% (60 of 150) needed to qualify
const SUBJ_LABELS = {tamil:'பகுதி அ – தமிழ்', general_studies:'பகுதி ஆ – பொது அறிவு', aptitude:'பகுதி இ – திறனறிவு'};
const MODE_LABELS = {study:'படிப்பு முறை', quick:'விரைவுத் தேர்வு', full:'முழுத் தேர்வு',
                     review_wrong:'தவறுகள் மீள்பார்வை', review_marks:'அடையாளமிட்டவை'};

let state = null;       // active quiz state
let timerId = null;     // setInterval handle

function $(s){ return document.querySelector(s); }
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $('#'+id).classList.add('active');
  window.scrollTo(0,0);
}
function fmtTime(sec){
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = sec%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}
function fmtMarks(x){ return Number.isInteger(x) ? String(x) : x.toFixed(1); }
// Same pace as the real exam: 3 hours for 200 questions (25 questions → 22½ minutes)
function timeLimitFor(n){ return Math.round(FULL_SECONDS * n / 200); }

/* ========== HOME ========== */
function renderHome(){
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
    <div><strong>▶ முடிக்காத ${MODE_LABELS[r.mode]||r.mode}</strong>
    <div class="resume-sub">${done}/${r.questions.length} வினா · ${r.topicName||''}</div></div>
    <div class="resume-actions">
      <button class="btn-primary" id="resume-yes">தொடரவும்</button>
      <button class="btn-ghost btn-small" id="resume-no">நீக்கு</button>
    </div></div>`;
  $('#resume-yes').onclick = resumeTest;
  $('#resume-no').onclick = ()=>{ Store.clearResume(); renderResumeBanner(); };
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
  el.innerHTML = `<h2>🎯 பலவீனப் பகுதிகள்</h2>
    <div class="dash-list">${rows.map(r=>{
      const cls = r.pct>=70?'good':r.pct>=40?'mid':'low';
      return `<div class="dash-row">
        <span class="dash-name">${r.name}</span>
        <div class="dash-bar"><div class="dash-fill ${cls}" style="width:${r.pct}%"></div></div>
        <span class="dash-pct ${cls}">${r.pct}%</span>
        <span class="dash-n">${r.correct}/${r.total}</span>
      </div>`;}).join('')}</div>`;
}

function renderHistory(){
  const list = Store.allHistory();
  const el = $('#history-list');
  if (!list.length){ el.innerHTML = '<p class="empty-note">இதுவரை தேர்வுகள் எதுவும் முடிக்கப்படவில்லை.</p>'; return; }
  el.innerHTML = list.map(h=>{
    const pct = Math.round(h.score/h.total*100);
    const t = h.time ? ` · ⏱ ${fmtTime(h.time)}` : '';
    if (h.marks != null) return `<div class="history-item">
      <div><div class="h-mode">${MODE_LABELS[h.mode]||h.mode}</div>
      <div class="h-date">${h.date}${t}</div></div>
      <div class="h-score">${fmtMarks(h.marks)}<small>/${fmtMarks(h.maxMarks)} · ${pct}%</small></div>
    </div>`;
    return `<div class="history-item">
      <div><div class="h-mode">${MODE_LABELS[h.mode]||h.mode}${h.topic?' · '+h.topic:''}</div>
      <div class="h-date">${h.date}${t}</div></div>
      <div class="h-score">${h.score}<small>/${h.total} · ${pct}%</small></div>
    </div>`;
  }).join('') + '<button class="clear-history" id="clear-hist">வரலாற்றை அழி</button>';
  $('#clear-hist').onclick = ()=>{ if(confirm('அனைத்து மதிப்பெண் வரலாற்றையும் அழிக்கவா?')){ Store.clearHistory(); renderHistory(); } };
}

/* ========== STUDY TOPIC PICKER ========== */
function renderTopics(){
  const groups = Bank.topics();
  const el = $('#topic-list');
  let html = '';
  groups.forEach(g=>{
    if(!g.topics.length) return;
    html += `<div class="topic-group-label">${g.label}</div>`;
    g.topics.forEach(t=>{
      html += `<button class="topic-btn" data-topic="${t.topic}" data-name="${t.name}">
        <span>${t.name}</span><span class="t-count">${t.qs.length} வினா</span></button>`;
    });
  });
  el.innerHTML = html || '<p class="empty-note">வினாக்கள் ஏற்றப்படவில்லை.</p>';
  el.querySelectorAll('.topic-btn').forEach(b=>{
    b.onclick = ()=> startStudy(b.dataset.topic, b.dataset.name);
  });
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
  if(!qs.length){ alert('இந்தத் தலைப்பில் வினாக்கள் இல்லை.'); return; }
  beginQuiz({mode:'study', questions:qs, reveal:true, topicName, timed:false});
  state._topicKey = topicKey; state._studied = (exclude||[]).concat(qs.map(q=>q.id));
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
      stopTimer(); alert('நேரம் முடிந்தது! தேர்வு தானாகச் சமர்ப்பிக்கப்படுகிறது.'); finishQuiz(); return;
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
      <div class="q-meta">${q.unit_name_ta||''} ${q.topic_name_ta?'· '+q.topic_name_ta:''}</div>
      <button class="bookmark-btn ${marked?'on':''}" id="bm" title="அடையாளமிடு">${marked?'★':'☆'}</button>
    </div>
    <div class="q-text">${state.idx+1}. ${q.question_ta}</div>
    <div class="options">
      ${q.options_ta.map((o,i)=>`<button class="option" data-i="${i}">
        <span class="opt-key">${OPT_KEYS[i]}</span><span class="opt-text">${o}</span></button>`).join('')}
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
    $('#fb-slot').innerHTML = `<div class="feedback ${ok?'ok':'no'}">
      <div class="f-title ${ok?'ok':'no'}">${ok?'✓ சரி!':'✗ தவறு'}</div>
      <div class="f-exp">${q.explanation_ta||''}</div></div>`;
  } else {
    opts.forEach((b,i)=>b.classList.toggle('selected', i===choice));
  }
  renderNextBtn();
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
    $('#fb-slot').innerHTML = `<div class="feedback ${ok?'ok':'no'}">
      <div class="f-title ${ok?'ok':'no'}">${ok?'✓ சரி!':'✗ தவறு'}</div>
      <div class="f-exp">${q.explanation_ta||''}</div></div>`;
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
    ? (state.reveal ? 'முடிவைக் காண்' : 'தேர்வை முடி')
    : (state.reveal ? 'அடுத்த வினா →' : 'அடுத்தது →');
  const prev = state.idx>0 ? `<button class="btn-ghost" id="prev">← முந்தையது</button>` : '';
  footer.innerHTML = prev + `<button class="btn-primary" id="next">${label}</button>`;
  if($('#prev')) $('#prev').onclick = ()=>{ state.idx--; renderQuestion(); };
  $('#next').onclick = ()=>{
    const unanswered = state.answers[state.idx]===undefined || state.answers[state.idx]===null;
    // Study/review: answer before moving on. Tests: may skip and come back, like the real exam.
    if (state.reveal && unanswered){ alert('ஒரு விடையைத் தேர்ந்தெடுக்கவும்.'); return; }
    if (last){
      const skipped = state.questions.filter((_,i)=>state.answers[i]===undefined||state.answers[i]===null).length;
      if (!state.reveal && skipped && !confirm(`${skipped} வினாக்களுக்கு விடையளிக்கவில்லை. தேர்வை முடிக்கவா?`)) return;
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
  const total = qs.length, pct = Math.round(score/total*100);
  const marks = score*MARK_PER_Q, maxMarks = total*MARK_PER_Q;

  // Part A (Tamil) qualifying check: 40% of Part A marks (60 of 150 in the full exam)
  let qualifyHtml = '';
  if(isTest && parts.tamil){
    const tm = parts.tamil.correct*MARK_PER_Q, tmax = parts.tamil.n*MARK_PER_Q, need = tmax*PASS_FRACTION;
    const pass = tm >= need;
    qualifyHtml = `<div class="qualify ${pass?'ok':'no'}">${pass
      ? `✓ பகுதி அ (தமிழ்) தகுதி பெற்றீர்கள்: ${fmtMarks(tm)}/${fmtMarks(tmax)} (தேவை ${fmtMarks(need)})`
      : `✗ பகுதி அ (தமிழ்) தகுதி பெறவில்லை: ${fmtMarks(tm)}/${fmtMarks(tmax)} (தேவை ${fmtMarks(need)}). உண்மைத் தேர்வில் இவ்வாறு இருந்தால் பகுதி ஆ, இ மதிப்பிடப்படமாட்டா.`}</div>`;
  }
  const partRows = isTest ? `<div class="part-table">${['tamil','general_studies','aptitude'].filter(s=>parts[s]).map(s=>
    `<div class="part-row"><span>${SUBJ_LABELS[s]}</span><span>${parts[s].correct}/${parts[s].n} · <b>${fmtMarks(parts[s].correct*MARK_PER_Q)}</b>/${fmtMarks(parts[s].n*MARK_PER_Q)} மதிப்பெண்</span></div>`).join('')}</div>` : '';

  Store.addHistory({
    mode: state.mode, topic: state.topicName||null, score, total,
    marks: isTest ? marks : null, maxMarks: isTest ? maxMarks : null,
    time: state.timed ? state.elapsed : null,
    date: new Date().toLocaleString('ta-IN',{dateStyle:'medium',timeStyle:'short'})
  });
  Store.clearResume();

  let msg = pct>=80?'🏆 சிறப்பு!':pct>=60?'👍 நன்று!':pct>=40?'🙂 பரவாயில்லை':'📖 இன்னும் பயிற்சி தேவை';
  const timeLine = state.timed ? `<div class="score-pct">⏱ எடுத்த நேரம்: ${fmtTime(state.elapsed)} / ${fmtTime(state.limit)}</div>` : '';
  const big = isTest
    ? `<div class="score-big">${fmtMarks(marks)}<small>/${fmtMarks(maxMarks)}</small></div>
       <div class="score-pct">மதிப்பெண் · ${score}/${total} சரி (${pct}%)${skipped?` · ${skipped} விடையளிக்கவில்லை`:''}</div>`
    : `<div class="score-big">${score}<small>/${total}</small></div>
       <div class="score-pct">${pct}% சரியான விடைகள்</div>`;
  $('#score-card').innerHTML = `${big}${timeLine}${partRows}${qualifyHtml}<div class="score-msg">${msg}</div>`;

  // Answer review: every question with your answer, the correct answer and why
  const items = qs.map((q,i)=>{
    const your = state.answers[i], ok = your===q.answer_index, none = your===undefined||your===null;
    const status = ok ? 'ok' : none ? 'skip' : 'no';
    const badge = ok ? '✓ சரி' : none ? '— விடையளிக்கவில்லை' : '✗ தவறு';
    const opts = q.options_ta.map((o,j)=>{
      const cls = j===q.answer_index ? 'rv-opt right' : (j===your ? 'rv-opt picked' : 'rv-opt');
      const tag = j===q.answer_index ? ' ✓ சரியான விடை' : (j===your ? ' ✗ உங்கள் விடை' : '');
      return `<div class="${cls}"><b>${OPT_KEYS[j]}.</b> ${o}<span class="rv-tag">${tag}</span></div>`;
    }).join('');
    return `<div class="exp-item st-${status}">
      <div class="exp-head"><span class="exp-num">${i+1}</span><span class="exp-badge ${status}">${badge}</span></div>
      <div class="exp-q">${q.question_ta.replace(/\n/g,'<br>')}</div>
      <div class="rv-opts">${opts}</div>
      <div class="exp-detail"><span class="lab">💡 விளக்கம்:</span> ${q.explanation_ta||''}</div></div>`;
  });
  const wrongCount = qs.length - score;
  $('#explanations').innerHTML = `<h3>விடைகள் மீள்பார்வை</h3>
    <div class="rv-filter">
      <button class="chip on" data-f="all">அனைத்தும் (${qs.length})</button>
      <button class="chip" data-f="bad">தவறு / விடையில்லை (${wrongCount})</button>
    </div>
    <div id="rv-list">${items.join('')}</div>`;
  $('#explanations').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{
    $('#explanations').querySelectorAll('.chip').forEach(x=>x.classList.toggle('on', x===c));
    $('#rv-list').classList.toggle('only-bad', c.dataset.f==='bad');
  });

  show('score');
}

/* ========== STUDY: extend / switch after a stretch ========== */
function studyFollowUp(){
  // Called from score screen when mode was study — offer more or switch
}

/* ========== WIRING ========== */
function goHome(){ stopTimer(); renderHome(); show('home'); }

async function init(){
  await Bank.load();
  renderHome();

  document.querySelectorAll('.mode-card').forEach(c=>{
    c.onclick = ()=>{
      const m = c.dataset.mode;
      if(m==='study'){ renderTopics(); show('topic-picker'); }
      else if(m==='quick') startQuick();
      else if(m==='full') startFull();
    };
  });
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
