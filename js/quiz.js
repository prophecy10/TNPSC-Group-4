/* quiz.js — loads the question bank and builds quizzes with syllabus weightage */
const Bank = (() => {
  let loaded = null;   // {tamil:[], general_studies:[], aptitude:[]}

  // Full-test weightage (200 Q) and quick-test (25 Q), per Annexure III syllabus
  const WEIGHT_FULL = {
    tamil:            { total:100, units:{'1':25,'2':15,'3':15,'4':10,'5':15,'6':5,'7':15} },
    general_studies:  { total:75,  units:{'1':5,'2':5,'3':10,'4':15,'5':20,'6':20} },
    aptitude:         { total:25,  units:{'1':15,'2':10} }
  };
  const WEIGHT_QUICK = { tamil:12, general_studies:9, aptitude:4 }; // ~1/8 scale

  async function load(){
    if (loaded) return loaded;
    const out = { tamil:[], general_studies:[], aptitude:[] };
    const seen = new Set();
    // A manifest lists every data file to load. Falls back to the built-in list.
    let fileList = ['gen_pyq_2024.json','gen_pyq_2025.json','gen_pyq_2022.json','gen_new.json'];
    try {
      const mres = await fetch('data/manifest.json', {cache:'no-store'});
      if (mres.ok){ const mj = await mres.json(); if (Array.isArray(mj.files) && mj.files.length) fileList = mj.files; }
    } catch(e){ /* use built-in list */ }
    for (const fname of fileList){
      try {
        const res = await fetch(`data/${fname}`, {cache:'no-store'});
        if (!res.ok) continue;
        const j = await res.json();
        const fileSubj = (j.subject && out[j.subject]) ? j.subject : null;
        (j.questions || []).forEach(q => {
          const s = fileSubj || q.subject;
          if (!out[s] || seen.has(q.id)) return;   // dedup by id across files
          seen.add(q.id);
          out[s].push({...q, _subject:s});
        });
      } catch(e){ /* skip a bad file, keep the rest */ }
    }
    loaded = out;
    return out;
  }

  function shuffle(a){
    a = a.slice();
    for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

  // Shuffle a question's options while keeping answer_index correct
  function shuffleOptions(q){
    const idx = q.options_ta.map((_,i)=>i);
    const order = shuffle(idx);
    const newOpts = order.map(i=>q.options_ta[i]);
    const newAns = order.indexOf(q.answer_index);
    const out = {...q, options_ta:newOpts, answer_index:newAns};
    if (q.options_en) out.options_en = order.map(i=>q.options_en[i]);   // English options follow the same order
    return out;
  }

  function byUnit(subjectArr, unit){ return subjectArr.filter(q=>String(q.unit)===String(unit)); }
  function sample(arr, n){ return shuffle(arr).slice(0, n); }

  function weightedSubject(subjectArr, unitWeights, scale){
    let picked = [];
    for (const [unit, w] of Object.entries(unitWeights)){
      const n = Math.max(0, Math.round(w*scale));
      picked = picked.concat(sample(byUnit(subjectArr, unit), n));
    }
    return picked;
  }

  function topics(){
    const groups = [];
    const labels = {tamil:'தமிழ்', general_studies:'பொது அறிவு', aptitude:'கணிதம் & நுண்ணறிவு'};
    const labelsEn = {tamil:'Tamil', general_studies:'General Studies', aptitude:'Aptitude & Mental Ability'};
    for (const subj of ['tamil','general_studies','aptitude']){
      const arr = loaded[subj]||[];
      const byTopic = {};
      arr.forEach(q=>{
        const key = q.topic;
        if(!byTopic[key]) byTopic[key] = {topic:key, name:q.topic_name_ta||key, name_en:q.topic_name_en||null, unit:q.unit, subject:subj, qs:[]};
        byTopic[key].qs.push(q);
      });
      groups.push({subject:subj, label:labels[subj], label_en:labelsEn[subj], topics:Object.values(byTopic)});
    }
    return groups;
  }

  function studyQuestions(topicKey, exclude){
    exclude = exclude || [];
    let all = [];
    for (const subj of ['tamil','general_studies','aptitude']) all = all.concat(loaded[subj]||[]);
    const pool = all.filter(q=>q.topic===topicKey && !exclude.includes(q.id));
    return shuffle(pool).slice(0,25).map(shuffleOptions);
  }

  function quickTest(){
    let qs = [];
    qs = qs.concat(weightedSubject(loaded.tamil||[], WEIGHT_FULL.tamil.units, WEIGHT_QUICK.tamil/WEIGHT_FULL.tamil.total));
    qs = qs.concat(weightedSubject(loaded.general_studies||[], WEIGHT_FULL.general_studies.units, WEIGHT_QUICK.general_studies/WEIGHT_FULL.general_studies.total));
    qs = qs.concat(weightedSubject(loaded.aptitude||[], WEIGHT_FULL.aptitude.units, WEIGHT_QUICK.aptitude/WEIGHT_FULL.aptitude.total));
    let all=[]; for(const s of ['tamil','general_studies','aptitude']) all=all.concat(loaded[s]||[]);
    const have = new Set(qs.map(q=>q.id));
    for (const q of shuffle(all)){ if(qs.length>=25) break; if(!have.has(q.id)){qs.push(q);have.add(q.id);} }
    return shuffle(qs).slice(0,25).map(shuffleOptions);
  }

  function fullTest(){
    let qs = [];
    for (const [subj,cfg] of Object.entries(WEIGHT_FULL)){
      qs = qs.concat(weightedSubject(loaded[subj]||[], cfg.units, 1));
    }
    return shuffle(qs).map(shuffleOptions);
  }

  // Look up a single question by id across all subjects (for resume)
  function byId(id){
    for (const s of ['tamil','general_studies','aptitude']){
      const hit = (loaded[s]||[]).find(q=>q.id===id);
      if(hit) return hit;
    }
    return null;
  }

  // Build a review quiz from a saved list (wrong answers / bookmarks).
  function reviewQuestions(savedList){
    // Prefer the current bank copy (picks up later corrections and English versions)
    return shuffle(savedList.map(s=>{ const fresh = byId(s.id); return fresh ? {...fresh} : {...s, _subject:s.subject}; })).map(shuffleOptions);
  }

  function countAll(){
    let n=0; for(const s of ['tamil','general_studies','aptitude']) n+=(loaded[s]||[]).length; return n;
  }

  return { load, topics, studyQuestions, quickTest, fullTest, shuffleOptions,
           byId, reviewQuestions, countAll, _w:{WEIGHT_FULL,WEIGHT_QUICK} };
})();
