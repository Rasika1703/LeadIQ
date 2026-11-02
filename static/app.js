(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P = {grid:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',users:'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',plus:'M12 5v14M5 12h14',cpu:'M6 4h12v16H6zM9 9h6v6H9zM2 9h4M2 15h4M18 9h4M18 15h4',flask:'M9 3h6M10 3v6l-6 11h16L14 9V3',gear:'M12 15a3 3 0 100-6 3 3 0 000 6M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',search:'M11 18a7 7 0 100-14 7 7 0 000 14M21 21l-4-4',bell:'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4',menu:'M3 6h18M3 12h18M3 18h18',trash:'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',edit:'M4 20h4L19 9l-4-4L4 16z',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 100-6 3 3 0 000 6',chev:'M9 6l6 6-6 6',hot:'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',warm:'M12 16a4 4 0 100-8 4 4 0 000 8M12 2v2M12 20v2M2 12h2M20 12h2',cold:'M12 2v20M3 7l18 10M21 7L3 17',gauge:'M4 18a8 8 0 1116 0M12 18l4-6',panel:'M3 5h18v14H3zM9 5v14'};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const COL = {Hot:'var(--teal)', Warm:'var(--amber)', Cold:'var(--coral)'};
const NAV = [['overview','Overview','grid'],['leads','Leads','users'],['add','Add Lead','plus'],['-'],['engine','Scoring Engine','cpu'],['tests','Test Cases','flask'],['settings','Settings','gear']];
const S = {q:'', f:'All', sort:'desc', page:0, size:8, stats:null};
let seq = 0;

async function api(u, o) {
  const r = await fetch('/api' + u, o);
  if (!r.ok) { let m = 'Request failed'; try { const j = await r.json(); m = typeof j.detail === 'string' ? j.detail : j.detail?.[0]?.msg || m; } catch {} throw new Error(m); }
  return r.json();
}
const toast = (m, e) => { const t = document.createElement('div'); t.className = 'toast' + (e ? ' e' : ''); t.textContent = m; $('#toasts').append(t); setTimeout(() => t.remove(), 3200); };
const sk = (...h) => `<div class="grid">${h.map(x => `<div class="sk" style="height:${x}px"></div>`).join('')}</div>`;
const ini = n => String(n).split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase() || '').join('');
const fdate = d => new Date(d + (/Z|\+/.test(d) ? '' : 'Z')).toLocaleDateString(undefined, {day:'numeric', month:'short', year:'numeric'});
const badge = c => `<span class="badge ${c}">${c}</span>`;
const sample = l => l.is_sample ? '<span class="tag">Sample</span>' : '';
const who = l => `<div class="who"><span class="av">${esc(ini(l.name))}</span><div><b>${esc(l.name)}${sample(l)}</b><small>${esc(l.job_title || 'No title')}</small></div></div>`;
const scoreCell = l => `<div class="sc">${l.result.score}<div class="bar"><i data-w="${l.result.score}" style="background:${COL[l.result.classification]}"></i></div></div>`;
const actions = l => `<div class="acts"><button data-act="go" data-h="#/lead/${l.id}" aria-label="View ${esc(l.name)}" data-tip="View">${ic('eye')}</button><button data-act="go" data-h="#/add/${l.id}" aria-label="Edit ${esc(l.name)}" data-tip="Edit">${ic('edit')}</button><button class="del" data-act="del" data-id="${l.id}" data-n="${esc(l.name)}" aria-label="Delete ${esc(l.name)}" data-tip="Delete">${ic('trash')}</button></div>`;
const leadRow = l => `<tr><td>${who(l)}</td><td>${esc(l.company)}</td><td>${esc(l.industry || '-')}</td><td>${scoreCell(l)}</td><td>${badge(l.result.classification)}</td><td>${esc(l.source || '-')}</td><td class="muted">${fdate(l.created_at)}</td><td>${actions(l)}</td></tr>`;
const table = rows => `<div class="tw"><table><thead><tr><th>Lead<th>Company<th>Industry<th>Score<th>Class<th>Source<th>Added<th></tr></thead><tbody>${rows}</tbody></table></div>`;
const animateBars = () => requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('[data-w]').forEach(b => b.style.width = b.dataset.w + '%')));
function countUp(el, to, dec) { const d = matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 700, t0 = performance.now(); const f = t => { const p = d ? 1 : Math.min(1, (t - t0) / d); el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec || 0); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }

const R = {
async overview() {
  const [s, l] = await Promise.all([api('/stats'), api('/leads')]); S.stats = s; notif();
  const h = new Date().getHours(), g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const M = [['lead','users','Total leads',s.total,0],['hot','hot','Hot leads',s.hot],['warm','warm','Warm leads',s.warm],['cold','cold','Cold leads',s.cold],['lead','gauge','Average score',s.avg,1]];
  const circ = 2 * Math.PI * 52; let off = 0;
  const seg = [['Hot',s.hot],['Warm',s.warm],['Cold',s.cold]].map(([n, v]) => { const len = s.total ? v / s.total * circ : 0; const c = `<circle cx="75" cy="75" r="52" stroke="${COL[n]}" stroke-dasharray="${len} ${circ}" stroke-dashoffset="${-off}" data-tip="${n}: ${v} (${s.total ? Math.round(v / s.total * 100) : 0}%)"/>`; off += len; return c; }).join('');
  const bins = Array(10).fill(0); l.forEach(x => bins[Math.min(9, Math.floor(x.result.score / 10))]++); const mx = Math.max(1, ...bins);
  const cats = {}; l.forEach(x => x.result.breakdown.forEach(b => { (cats[b.category] ||= {p:0, m:0}).p += b.points; cats[b.category].m += b.max; }));
  $('#view').innerHTML = `<div class="hero"><div><h1>${g}</h1><p>Here's what's happening with your lead pipeline. <span class="muted">${new Date().toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long'})}</span></p></div><a class="btn p" href="#/add">${ic('plus')}Add New Lead</a></div>
  <div class="grid metrics">${M.map(([c, i, n, v, d], k) => `<div class="card m ${k == 4 ? '' : c}${k == 0 ? ' lead' : ''}${k == 4 ? ' lead' : ''}"><span class="ic">${ic(i)}</span><b data-n="${v}" data-d="${d || 0}">0</b><small>${n}</small></div>`).join('')}</div>
  <div class="grid cols" style="margin-top:16px"><div class="card"><h2>Lead distribution</h2>${s.total ? `<div class="donut"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="52" stroke="var(--bg)"/>${seg}</svg><div class="leg">${['Hot','Warm','Cold'].map(n => `<div><i style="background:${COL[n]}"></i>${n}<span>${s[n.toLowerCase()]}</span></div>`).join('')}<div class="muted">Average score<span>${s.avg}</span></div></div></div>` : '<div class="empty">No leads yet.</div>'}</div>
  <div class="card"><h2>Score distribution</h2><div class="hist">${bins.map((n, i) => `<div style="height:${n / mx * 100}%" data-tip="${i * 10}-${i == 9 ? 100 : i * 10 + 9}: ${n} lead${n == 1 ? '' : 's'}"></div>`).join('')}</div><div class="axis"><span>0</span><span>50</span><span>100</span></div></div>
  <div class="card"><h2>Quality breakdown <small>avg. points earned</small></h2>${Object.entries(cats).map(([n, c]) => `<div class="row"><span class="muted">${esc(n.split(' / ')[0].replace('Company Info Completeness','Completeness'))}</span><div class="bar"><i data-w="${Math.round(c.p / c.m * 100)}"></i></div><span>${Math.round(c.p / c.m * 100)}%</span></div>`).join('') || '<div class="empty">No data.</div>'}</div></div>
  <div class="card" style="margin-top:16px"><h2>Recent leads<a class="btn s" href="#/leads">View all</a></h2>${l.length ? table(l.slice(0, 5).map(leadRow).join('')) : '<div class="empty">No leads yet. Add your first lead to see it scored.</div>'}</div>`;
  document.querySelectorAll('[data-n]').forEach(e => countUp(e, +e.dataset.n, +e.dataset.d));
},
async leads() {
  const all = await api('/leads'); const q = S.q.toLowerCase();
  const cnt = c => c == 'All' ? all.length : all.filter(x => x.result.classification == c).length;
  let l = all.filter(x => (S.f == 'All' || x.result.classification == S.f) && (!q || [x.name, x.company, x.industry, x.email].join(' ').toLowerCase().includes(q)));
  l.sort((a, b) => S.sort == 'desc' ? b.result.score - a.result.score : a.result.score - b.result.score);
  const pages = Math.max(1, Math.ceil(l.length / S.size)); S.page = Math.min(S.page, pages - 1);
  $('#view').innerHTML = `<div class="hero"><div><h1>Leads</h1><p>${all.length} total, scored by the deterministic engine.</p></div><a class="btn p" href="#/add">${ic('plus')}Add Lead</a></div>
  <div class="card"><div class="chips">${['All','Hot','Warm','Cold'].map(c => `<button class="chip ${S.f == c ? 'on' : ''}" data-act="filter" data-v="${c}">${c}<small>${cnt(c)}</small></button>`).join('')}<button class="btn s" data-act="sort">Score ${S.sort == 'desc' ? 'high to low' : 'low to high'}</button></div>
  ${l.length ? table(l.slice(S.page * S.size, (S.page + 1) * S.size).map(leadRow).join('')) : `<div class="empty">No leads match your search or filter.${S.q || S.f != 'All' ? '<br><button class="btn s" style="margin-top:12px" data-act="reset">Clear filters</button>' : ''}</div>`}
  <div class="pager"><small>${l.length} result${l.length == 1 ? '' : 's'} - page ${S.page + 1} of ${pages}</small><div><button class="btn s" data-act="page" data-v="-1" ${S.page ? '' : 'disabled'}>Previous</button><button class="btn s" data-act="page" data-v="1" ${S.page < pages - 1 ? '' : 'disabled'}>Next</button></div></div></div>`;
  animateBars();
},
async add(id) {
  const [m, e] = await Promise.all([api('/methodology'), id ? api('/leads/' + id) : {}]);
  const cap = s => s.replace(/\b\w/g, c => c.toUpperCase());
  const opts = (list, cur) => `<option value="">Select...</option>${[...new Set([...(list), ...(cur && !list.includes(cur) ? [cur] : [])])].map(o => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}`;
  const inp = (k, l, ph, req, t = 'text') => `<div class="f" data-f="${k}"><label for="${k}">${l}${req ? ' <span class="req">*</span>' : ''}</label><input id="${k}" name="${k}" type="${t}" placeholder="${ph}" value="${esc(e[k])}"><div class="err"></div></div>`;
  const sel = (k, l, list) => `<div class="f"><label for="${k}">${l}</label><select id="${k}" name="${k}">${opts(list, e[k])}</select></div>`;
  $('#view').innerHTML = `<div class="hero"><div><h1>${id ? 'Edit lead' : 'Add a new lead'}</h1><p>${id ? 'Saving re-runs the scoring engine on the updated details.' : 'The more complete the details, the higher the confidence of the analysis.'}</p></div></div>
  <form id="lf" class="form" novalidate><div>
  <div class="card sec"><h2>Contact information</h2><p>Who are we talking to?</p><div class="fs">${inp('name','Full name','Rahul Sharma',1)}${inp('job_title','Job title','Founder')}${inp('email','Email','rahul@company.com',0,'email')}${inp('phone','Phone number','+91 9876543210',0,'tel')}</div></div>
  <div class="card sec"><h2>Company information</h2><p>Used for size, industry fit and completeness.</p><div class="fs">${inp('company','Company name','ABC Technologies',1)}${inp('website','Website','www.company.com')}${sel('industry','Industry',[...m.core_industries, ...m.adjacent_industries, 'Other'])}${inp('location','Company location','Bangalore')}${sel('size','Company size',['1-10','11-49','50-199','200-999','1000+'])}</div></div>
  <div class="card sec"><h2>Business requirement</h2><p>What does the lead want, and where did they come from?</p><div class="fs">${sel('source','Lead source',Object.keys(m.sources).map(cap))}<div class="f w"><label for="requirement">Requirement description</label><textarea id="requirement" name="requirement" placeholder="Looking for CRM software for a 40-person sales team">${esc(e.requirement)}</textarea></div></div></div></div>
  <div class="card aside-n"><h2>Before you analyse</h2><ul><li>Name and company are required.</li><li>An invalid email or phone is accepted, but lowers the contact score and the confidence.</li><li>Scores come from fixed rules, so identical input always gives an identical score.</li></ul><button class="btn p" style="width:100%" id="sb">${id ? 'Save and re-analyse' : 'Analyse Lead'}</button></div></form>`;
},
async lead(id) {
  const x = await api('/leads/' + id), r = x.result, c = COL[r.classification], circ = 2 * Math.PI * 82;
  const kv = (k, v) => `<div class="kv"><span class="muted">${k}</span><b>${esc(v || '-')}</b></div>`;
  $('#view').innerHTML = `<div class="hero"><div><h1>${esc(x.name)}${sample(x)}</h1><p>${esc(x.job_title || 'No title')} at ${esc(x.company)}</p></div><div class="acts"><a class="btn" href="#/add/${x.id}">${ic('edit')}Edit</a><a class="btn" href="#/leads">All leads</a></div></div>
  <div class="rep"><div><div class="card center"><div class="ringw"><svg viewBox="0 0 200 200"><circle class="t" cx="100" cy="100" r="82"/><circle class="v" cx="100" cy="100" r="82" stroke="${c}" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" data-off="${circ * (1 - r.score / 100)}"/></svg><div><b data-n="${r.score}">0</b><small>out of 100</small></div></div>${badge(r.classification)}<p class="muted" style="margin:12px 0 16px">${esc(r.quality)}</p>
  <div class="kv"><span class="muted">Confidence</span><b>${esc(r.confidence_level)} (${r.confidence}%)</b></div><div class="bar" style="margin:4px 0 0"><i data-w="${r.confidence}"></i></div></div>
  <div class="card"><h2>Lead details</h2>${kv('Email', x.email)}${kv('Phone', x.phone)}${kv('Website', x.website)}${kv('Industry', x.industry)}${kv('Location', x.location)}${kv('Size', x.size)}${kv('Source', x.source)}${kv('Requirement', x.requirement)}${kv('Added', fdate(x.created_at))}</div></div>
  <div><div class="card next"><small>Recommended next action</small><p>${esc(r.next_action)}</p></div>
  <div class="grid cols" style="margin-top:16px"><div class="card pos"><h2>Positive factors</h2><div class="fac">${r.positive.map(p => `<p>${esc(p)}</p>`).join('') || '<small>None identified.</small>'}</div></div><div class="card neg"><h2>Negative factors</h2><div class="fac">${r.negative.map(p => `<p>${esc(p)}</p>`).join('') || '<small>None identified.</small>'}</div></div></div>
  <div class="card" style="margin-top:16px"><h2>Score breakdown</h2>${r.breakdown.map(b => `<div class="bk"><div><b>${esc(b.category)}</b><b>${b.points} / ${b.max}</b></div><div class="bar"><i data-w="${b.points / b.max * 100}" style="background:${b.points / b.max >= .6 ? 'var(--teal)' : b.points / b.max >= .3 ? 'var(--amber)' : 'var(--coral)'}"></i></div><small>${esc(b.note)}</small></div>`).join('')}</div>
  <div class="card" style="margin-top:16px"><details><summary>How this score was calculated</summary><p>${esc(r.explanation)}</p></details></div></div></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { const v = $('.ringw .v'); v.style.strokeDashoffset = v.dataset.off; })); countUp($('[data-n]'), r.score); animateBars();
},
async engine() {
  const m = await api('/methodology'), th = m.thresholds, tot = Object.values(m.weights).reduce((a, b) => a + b, 0);
  const D = {title:'Founders, C-level and owners earn full marks; directors and VPs less; unrecognised titles earn almost nothing.',size:'Based on the upper bound of the employee range. Larger companies score higher.',industry:'Core target industries score full points, adjacent industries partial, everything else minimal.',requirement:'Buying-intent phrases, product keywords and specificity earn points. Browsing or non-buyer language is capped low.',source:'Referrals and website enquiries rank above cold outreach.',completeness:'Company name, a valid website and a location each add points.',contact:'A correctly formatted email and phone number.'};
  $('#view').innerHTML = `<div class="hero"><div><h1>Scoring engine</h1><p>Seven weighted rules, calculated in the backend. No randomness and no LLM in the score.</p></div></div>
  <div class="card"><h2>Weights <small>${tot} points total</small></h2>${Object.entries(m.weights).map(([k, v]) => `<div class="bk"><div><b>${esc(m.labels[k])}</b><b>${v} pts / ${Math.round(v / tot * 100)}%</b></div><div class="bar"><i data-w="${v / tot * 100 * 4}"></i></div><small>${D[k] || ''}</small></div>`).join('')}</div>
  <div class="card"><h2>Classification thresholds</h2><div class="seg"><div style="flex:${th.warm};background:var(--coral)">Cold 0-${th.warm - 1}</div><div style="flex:${th.hot - th.warm};background:var(--amber)">Warm ${th.warm}-${th.hot - 1}</div><div style="flex:${101 - th.hot};background:var(--teal)">Hot ${th.hot}-100</div></div><small>Configurable with HOT_MIN and WARM_MIN environment variables.</small></div>
  <div class="grid cols" style="margin-top:16px"><div class="card"><h2>Missing data</h2><p class="muted">A missing or invalid field earns zero for that rule. Text alone never earns points.</p></div><div class="card"><h2>Confidence</h2><p class="muted">70% field completeness across 11 fields, plus 30% validity of email, phone and website. It never comes from an LLM.</p></div><div class="card"><h2>Determinism</h2><p class="muted">Identical input always produces an identical score, breakdown and classification.</p></div><div class="card"><h2>Role of the LLM</h2><p class="muted">Optional and not yet connected. It could only reword explanations and could never change a score.</p></div></div>
  <div class="card" style="margin-top:16px"><h2>Industry lists</h2><small>Core</small><div class="pills" style="margin:6px 0 14px">${m.core_industries.map(i => `<span>${esc(i)}</span>`).join('')}</div><small>Adjacent</small><div class="pills" style="margin-top:6px">${m.adjacent_industries.map(i => `<span>${esc(i)}</span>`).join('')}</div></div>`;
  animateBars();
},
async tests() {
  const t = await api('/tests'), ok = t.filter(x => x.status == 'Pass').length;
  $('#view').innerHTML = `<div class="hero"><div><h1>Test cases</h1><p>Executed live against the scoring engine.</p></div><span class="badge ${ok == t.length ? 'Hot' : 'Cold'}">${ok} of ${t.length} passing</span></div><div class="card">${`<div class="tw"><table><thead><tr><th>Scenario<th>Input<th>Expected<th>Actual<th>Status</tr></thead><tbody>${t.map(x => `<tr><td><b>${esc(x.name)}</b><td class="muted">${esc(x.condition)}<td>${esc(x.expected)}<td>${esc(x.actual)}<td><span class="badge ${x.status == 'Pass' ? 'Hot' : 'Cold'}">${esc(x.status)}</span></tr>`).join('')}</tbody></table></div>`}</div>`;
},
async settings() {
  const m = await api('/methodology');
  $('#view').innerHTML = `<div class="hero"><div><h1>Settings</h1><p>Configuration is read from the backend environment.</p></div></div><div class="card"><h2>Thresholds</h2><div class="kv"><span class="muted">Hot from</span><b>${m.thresholds.hot}</b></div><div class="kv"><span class="muted">Warm from</span><b>${m.thresholds.warm}</b></div><p class="muted">Change HOT_MIN or WARM_MIN in the backend environment and restart. Editing them from this screen is a future enhancement.</p></div>`;
}
};

function notif() { const s = S.stats; $('#notif').innerHTML = `<p class="h">Notifications</p>` + (s && s.hot ? `<a href="#/leads" data-act="hotf"><b>${s.hot} hot lead${s.hot == 1 ? '' : 's'}</b><br><small>Ready for follow-up</small></a>` : '<p class="muted">You are all caught up.</p>'); $('#bell').innerHTML = ic('bell') + (s && s.hot ? '<i class="dot"></i>' : ''); }
function route() {
  const [, pg = 'overview', arg] = location.hash.split('/'); const key = R[pg] ? pg : 'overview', my = ++seq;
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.p == (key == 'lead' ? 'leads' : key)));
  $('#crumb').textContent = {overview:'Overview', leads:'Leads', add: arg ? 'Edit lead' : 'Add lead', lead:'Lead analysis', engine:'Scoring engine', tests:'Test cases', settings:'Settings'}[key];
  const v = $('#view'); v.classList.remove('enter'); v.innerHTML = key == 'overview' ? sk(110, 260, 300) : sk(80, 360);
  document.body.classList.remove('open'); window.scrollTo(0, 0);
  R[key](arg).then(() => { if (my == seq) { v.classList.add('enter'); animateBars(); } }).catch(e => { if (my == seq) v.innerHTML = `<div class="card empty"><b>Something went wrong</b><br>${esc(e.message)}</div>`; });
}
function confirmDel(id, n) {
  const d = $('#dlg'); d.innerHTML = `<h2>Delete this lead?</h2><p class="muted">${esc(n)} will be permanently removed. This cannot be undone.</p><div class="acts2"><button class="btn" data-act="close">Cancel</button><button class="btn d" data-act="confirm" data-id="${id}">Delete lead</button></div>`; d.showModal();
}
async function submit(f) {
  const d = Object.fromEntries(new FormData(f)), id = (location.hash.split('/')[2] || ''); let bad = null;
  f.querySelectorAll('.f').forEach(x => { x.classList.remove('bad'); const e = $('.err', x); if (e) e.textContent = ''; });
  const fail = (k, m) => { const w = f.querySelector(`[data-f="${k}"]`); w.classList.add('bad'); $('.err', w).textContent = m; bad ||= k; };
  if (d.name.trim().length < 2) fail('name', 'Enter the lead\u2019s full name.');
  if (!d.company.trim()) fail('company', 'Company name is required.');
  if (d.email && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(d.email)) fail('email', 'This email looks invalid. It can still be analysed but scores lower.');
  if (bad && bad != 'email') { f.querySelector(`[name="${bad}"]`).focus(); return; }
  if (bad == 'email' && f.dataset.warned != '1') { f.dataset.warned = '1'; f.querySelector('[name=email]').focus(); toast('Check the email, or press Analyse again to continue.', true); return; }
  const b = $('#sb'), t = b.textContent; b.disabled = true; b.textContent = 'Analysing...';
  try { const r = await api(id ? '/leads/' + id : '/leads', {method:id ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d)}); toast(id ? 'Lead updated and re-scored' : 'Lead analysed'); location.hash = '#/lead/' + r.id; }
  catch (e) { toast(e.message, true); b.disabled = false; b.textContent = t; }
}
document.addEventListener('click', async ev => {
  const a = ev.target.closest('[data-act]'); const pop = ev.target.closest('.pop');
  document.querySelectorAll('.menu.open').forEach(m => { if (!pop || m.parentNode != pop) m.classList.remove('open'); });
  if (!a) return; const act = a.dataset.act, rerender = () => route();
  if (act == 'pop') $('#' + a.dataset.p).classList.toggle('open');
  else if (act == 'go') location.hash = a.dataset.h;
  else if (act == 'menu') matchMedia('(max-width:900px)').matches ? document.body.classList.toggle('open') : (document.body.classList.toggle('mini'));
  else if (act == 'drawer') document.body.classList.remove('open');
  else if (act == 'filter') { S.f = a.dataset.v; S.page = 0; rerender(); }
  else if (act == 'sort') { S.sort = S.sort == 'desc' ? 'asc' : 'desc'; rerender(); }
  else if (act == 'page') { S.page += +a.dataset.v; rerender(); }
  else if (act == 'reset') { S.f = 'All'; S.q = ''; $('#q').value = ''; rerender(); }
  else if (act == 'hotf') { S.f = 'Hot'; }
  else if (act == 'del') confirmDel(a.dataset.id, a.dataset.n);
  else if (act == 'close') $('#dlg').close();
  else if (act == 'confirm') { a.disabled = true; try { await api('/leads/' + a.dataset.id, {method:'DELETE'}); $('#dlg').close(); toast('Lead deleted'); rerender(); } catch (e) { toast(e.message, true); a.disabled = false; } }
});
document.addEventListener('submit', ev => { if (ev.target.id == 'lf') { ev.preventDefault(); submit(ev.target); } });
document.addEventListener('input', ev => { if (ev.target.name == 'email') ev.target.form.dataset.warned = ''; });
$('#q').addEventListener('input', e => { S.q = e.target.value; S.page = 0; if (location.hash.startsWith('#/leads')) route(); else location.hash = '#/leads'; });
document.addEventListener('keydown', e => { if (e.key == '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); } });
const tip = $('#tip');
document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (!t) return tip.classList.remove('on'); const r = t.getBoundingClientRect(); tip.textContent = t.dataset.tip; tip.style.left = Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2) + 'px'; tip.style.top = r.top - 34 + 'px'; tip.classList.add('on'); });
$('#nav').innerHTML = NAV.map(n => n[0] == '-' ? '<hr>' : `<a href="#/${n[0]}" data-p="${n[0]}">${ic(n[2])}<span>${n[1]}</span></a>`).join('');
$('#menuBtn').innerHTML = ic('panel'); $('#si').innerHTML = ic('search'); $('#ci').innerHTML = ic('chev'); notif();
addEventListener('hashchange', route); route();
})();
