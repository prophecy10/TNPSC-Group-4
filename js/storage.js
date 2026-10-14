/* storage.js — all persistence in localStorage only (no backend, no tracking) */
const Store = (() => {
  const KEY_HIST  = 'tnpsc_g4_history_v1';   // completed-attempt history
  const KEY_RESUME= 'tnpsc_g4_resume_v1';    // single in-progress test
  const KEY_WRONG = 'tnpsc_g4_wrong_v1';     // wrong-answered question ids (+meta)
  const KEY_MARK  = 'tnpsc_g4_bookmarks_v1'; // bookmarked question ids
  const KEY_STATS = 'tnpsc_g4_topicstats_v1';// per-topic correct/total tallies

  function _get(k, def){ try{ return JSON.parse(localStorage.getItem(k)) ?? def; }catch(e){ return def; } }
  function _set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

  /* ---- History ---- */
  function allHistory(){ return _get(KEY_HIST, []); }
  function addHistory(entry){
    const list = allHistory(); list.unshift(entry);
    _set(KEY_HIST, list.slice(0,100));
  }
  function clearHistory(){ localStorage.removeItem(KEY_HIST); }

  /* ---- Resume (one active test at a time) ---- */
  function saveResume(snap){ _set(KEY_RESUME, snap); }
  function getResume(){ return _get(KEY_RESUME, null); }
  function clearResume(){ localStorage.removeItem(KEY_RESUME); }

  /* ---- Wrong answers (dedup by question id, keep latest meta) ---- */
  function allWrong(){ return _get(KEY_WRONG, []); }
  function addWrong(q){
    const list = allWrong().filter(w => w.id !== q.id);
    list.unshift({ id:q.id, subject:q._subject||q.subject, topic:q.topic,
      topic_name_ta:q.topic_name_ta, question_ta:q.question_ta,
      options_ta:q.options_ta, answer_index:q.answer_index, explanation_ta:q.explanation_ta,
      unit:q.unit, unit_name_ta:q.unit_name_ta });
    _set(KEY_WRONG, list.slice(0,500));
  }
  function removeWrong(id){ _set(KEY_WRONG, allWrong().filter(w=>w.id!==id)); }
  function clearWrong(){ localStorage.removeItem(KEY_WRONG); }

  /* ---- Bookmarks ---- */
  function allBookmarks(){ return _get(KEY_MARK, []); }
  function isBookmarked(id){ return allBookmarks().some(b=>b.id===id); }
  function toggleBookmark(q){
    const list = allBookmarks();
    const i = list.findIndex(b=>b.id===q.id);
    if(i>=0){ list.splice(i,1); }
    else { list.unshift({ id:q.id, subject:q._subject||q.subject, topic:q.topic,
      topic_name_ta:q.topic_name_ta, question_ta:q.question_ta, options_ta:q.options_ta,
      answer_index:q.answer_index, explanation_ta:q.explanation_ta,
      unit:q.unit, unit_name_ta:q.unit_name_ta }); }
    _set(KEY_MARK, list.slice(0,500));
    return i<0; // true if now bookmarked
  }
  function clearBookmarks(){ localStorage.removeItem(KEY_MARK); }

  /* ---- Per-topic stats (for weak-area dashboard) ---- */
  function recordAnswer(topic, topic_name_ta, correct){
    const s = _get(KEY_STATS, {});
    if(!s[topic]) s[topic] = {name:topic_name_ta||topic, correct:0, total:0};
    s[topic].total++; if(correct) s[topic].correct++;
    _set(KEY_STATS, s);
  }
  function topicStats(){ return _get(KEY_STATS, {}); }
  function clearStats(){ localStorage.removeItem(KEY_STATS); }

  function clearAll(){ [KEY_HIST,KEY_RESUME,KEY_WRONG,KEY_MARK,KEY_STATS].forEach(k=>localStorage.removeItem(k)); }

  return {
    allHistory, addHistory, clearHistory,
    saveResume, getResume, clearResume,
    allWrong, addWrong, removeWrong, clearWrong,
    allBookmarks, isBookmarked, toggleBookmark, clearBookmarks,
    recordAnswer, topicStats, clearStats, clearAll
  };
})();
