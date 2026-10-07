const $ = (selector) => document.querySelector(selector);
const state = { skills: [], data: null, active: 'all', query: '', dialogTab: 'intro', browseMode: 'skills', packDisplayType: 'all' };
const icons = { visual:'◈', media:'▷', web:'⌘', game:'◉', research:'⌕', writing:'✎', automation:'↻', data:'≋', engineering:'⌁', agent:'✦', business:'↗', other:'○' };
const cardIcons = {
  visual:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 4.4 4.9 4.9-9.2 9.2-4.8.9.9-4.8zM13.3 5.8l4.9 4.9M5.7 5.7h4M5.7 9.7h2"/></svg>',
  media:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h10v11H5zM15 10l4-2v8l-4-2z"/></svg>',
  web:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 9h16M7 7h.1M10 7h.1M8 12h3v4H8zM13 12h4M13 15h4"/></svg>',
  game:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 9.2h9.6l2 3.9a3 3 0 0 1-5 3.3l-1.8-1.8-1.8 1.8a3 3 0 0 1-5-3.3zM8 12h3M9.5 10.5v3M15.8 11.2h.1M17.4 12.8h.1"/></svg>',
  research:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.5 15.5 4 4M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0zM9 6.7h4M9 10h3"/></svg>',
  writing:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6zM15 4v4h4M9 13.8l5.7-5.7 1.5 1.5-5.7 5.7-2.3.8z"/></svg>',
  automation:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-7 11h5l-1 9 8-12h-5z"/></svg>',
  data:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V11M10 19V6M15 19v-4M20 19H4M4 5l5 3 5-3 5 2"/></svg>',
  engineering:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
  agent:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6zM18 16l.7 2.3L21 19l-2.3.7L18 22l-.7-2.3L15 19l2.3-.7z"/></svg>',
  business:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6M15 7h4v4"/></svg>',
  other:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5 8 5l3 2.5v3L8 13l-3-2.5zM13 7.5 16 5l3 2.5v3L16 13l-3-2.5zM9 16.5l3-2.5 3 2.5v3L12 22l-3-2.5z"/></svg>'
};
const roleLabels = { entry:'主入口', child:'子 Skill', companion:'配套 Skill', independent:'独立可用成员', unconfirmed:'未确认角色' };
const groupLabels = { pack:'已确认 Pack', suite:'Skill Suite', bundle:'Install Bundle', historical_confirmed_workflow:'历史确认工作流', historical_companion_bundle:'历史配套组合', historical_recommended_combo:'历史推荐组合', historical_exclusion:'历史排除关系', unconfirmed:'关系待确认' };
const packDisplayLabels = { all:'全部', workflow:'工作流', suite:'工具套件', companion:'配套组合', recommendation:'历史推荐', pending:'待确认' };
function packDisplayType(pack) {
  const type = pack.relationType || 'pack';
  if (type === 'pack' || type === 'historical_confirmed_workflow') return 'workflow';
  if (type === 'suite') return 'suite';
  if (type === 'bundle' || type === 'historical_companion_bundle') return 'companion';
  if (type === 'historical_recommended_combo') return 'recommendation';
  return 'pending';
}

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '请求失败。');
  return result;
}

function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); window.setTimeout(() => node.classList.remove('show'), 2200); }
function escape(value) { const node = document.createElement('span'); node.textContent = value ?? ''; return node.innerHTML; }
function currentState() { return state.data.state; }
function enhanceSelects(root = document) {
  root.querySelectorAll('select:not([data-enhanced])').forEach((select) => {
    select.dataset.enhanced = 'true';
    const menu = document.createElement('div'); menu.className = 'select-menu';
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'select-trigger'; trigger.setAttribute('aria-haspopup', 'listbox');
    const list = document.createElement('div'); list.className = 'select-options'; list.setAttribute('role', 'listbox');
    const close = () => { menu.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
    const update = () => { const option = select.options[select.selectedIndex]; trigger.innerHTML = `<span>${escape(option?.text || '')}</span><i aria-hidden="true">⌄</i>`; list.querySelectorAll('[role="option"]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.value === select.value))); };
    [...select.options].forEach((option) => { const item = document.createElement('button'); item.type = 'button'; item.className = 'select-option'; item.setAttribute('role', 'option'); item.dataset.value = option.value; item.textContent = option.text; item.addEventListener('click', () => { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); update(); close(); trigger.focus(); }); list.append(item); });
    trigger.addEventListener('click', () => { const isOpen = menu.classList.toggle('open'); trigger.setAttribute('aria-expanded', String(isOpen)); if (isOpen) list.querySelector(`[data-value="${CSS.escape(select.value)}"]`)?.focus(); });
    trigger.addEventListener('keydown', (event) => { if (['ArrowDown', 'Enter', ' '].includes(event.key)) { event.preventDefault(); menu.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); list.querySelector(`[data-value="${CSS.escape(select.value)}"]`)?.focus(); } });
    list.addEventListener('keydown', (event) => { const options = [...list.querySelectorAll('[role="option"]')]; const index = options.indexOf(document.activeElement); if (event.key === 'Escape') { close(); trigger.focus(); } if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus(); } });
    select.addEventListener('change', update); menu.append(trigger, list); select.insertAdjacentElement('afterend', menu); update();
  });
}
document.addEventListener('click', (event) => { if (!event.target.closest('.select-menu')) document.querySelectorAll('.select-menu.open').forEach((menu) => menu.classList.remove('open')); });

function visibleSkills() {
  const query = state.query.trim().toLowerCase();
  return state.skills.filter((skill) => {
    const special = state.active === 'favorites' ? skill.favorite : state.active === 'recent' ? skill.recent : state.active === 'all' ? true : skill.category === state.active;
    const relations = (skill.relations || []).flatMap((relation) => [relation.packName, relation.chineseName, roleLabels[relation.role]]);
    const haystack = [skill.name, skill.displayName, skill.chineseName, skill.oneLine, skill.description, ...skill.tags, ...relations].join(' ').toLowerCase();
    return special && (!query || haystack.includes(query));
  }).sort((a, b) => state.active === 'recent' ? currentState().recent.indexOf(a.id) - currentState().recent.indexOf(b.id) : a.name.localeCompare(b.name));
}

function navItem(id, label, icon, count) { const active = state.active === id && state.browseMode === 'skills'; return `<button class="nav-item ${active ? 'active' : ''}" data-nav="${id}"><span>${icon}</span><span class="nav-text">${label}</span><span>${count}</span></button>`; }
function renderNav() {
  const categories = [...new Map((state.data.categories || []).map(([id, label]) => [id, label])).entries()];
  const counts = Object.fromEntries(categories.map(([id]) => [id, state.skills.filter((skill) => skill.category === id).length]));
  const packActive = state.browseMode === 'packs';
  $('#nav').innerHTML = `<span class="nav-label">资料库</span>${navItem('all','全部 Skill','◌',state.skills.length)}<button class="nav-item ${packActive ? 'active' : ''}" data-nav="packs"><span>▦</span><span class="nav-text">组合浏览</span><span>${(state.data.packs || []).filter((pack)=>pack.relationType!=='historical_exclusion').length}</span></button>${navItem('favorites','我的收藏','★',state.skills.filter((skill)=>skill.favorite).length)}${navItem('recent','最近查看','◷',state.skills.filter((skill)=>skill.recent).length)}<span class="nav-label">功能分类</span>${categories.map(([id,label])=>navItem(id,label,icons[id],counts[id]||0)).join('')}`;
  $('#nav').querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => { const target = button.dataset.nav; state.browseMode = target === 'packs' ? 'packs' : 'skills'; state.active = target === 'packs' ? 'all' : target; render(); }));
}

function relationBadge(skill) { const relation = skill.relations?.[0]; return relation ? `<button class="pack-badge" data-pack="${escape(relation.packId)}">${escape(relation.relationType==='unconfirmed' ? '组合待确认' : '组合成员')}</button>` : ''; }
function card(skill) {
  const pending = skill.analysisStatus === 'unorganized'; return `<article class="skill-card" data-detail="${escape(skill.id)}" role="button" tabindex="0" aria-label="查看 ${escape(skill.name)} 的详情"><div class="card-top"><span class="category-icon">${cardIcons[skill.category] || cardIcons.other}</span><button class="favorite ${skill.favorite ? 'on' : ''}" data-favorite="${escape(skill.id)}" aria-label="${skill.favorite ? '取消收藏' : '收藏'}">${skill.favorite ? '★' : '☆'}</button></div><div class="card-title">${escape(skill.name)}</div><div class="card-chinese">${escape(pending ? '尚未 AI 整理' : skill.chineseName)}</div><p class="card-description">${escape(pending ? (skill.description || '原始文档未提供简介。') : (skill.oneLine || skill.description || '原始文档未提供简介。'))}</p><div class="card-meta"><div class="tags">${pending ? '<span class="tag">未整理</span>' : skill.tags.slice(0,2).map((tag)=>`<span class="tag">${escape(tag)}</span>`).join('')}</div>${relationBadge(skill)}</div><footer class="card-footer"><span class="availability"><i class="dot"></i>${skill.available ? '已安装' : '路径失效'}</span></footer></article>`;
}

function renderGrid() {
  if (state.browseMode === 'packs') return renderPacks();
  $('#history-records').hidden = true; $('#history-records').innerHTML = '';
  const list = visibleSkills(); const packMatches = state.query ? visiblePacks() : []; const label = state.active === 'all' ? '全部 Skill' : state.active === 'favorites' ? '我的收藏' : state.active === 'recent' ? '最近查看' : state.data.categories.find(([id])=>id===state.active)?.[1] || 'Skill';
  $('#page-title').textContent = label; $('#count-label').textContent = `显示 ${list.length} 个 Skill${packMatches.length ? ` / ${packMatches.length} 个 Skill Pack` : ''} · 已收录 ${state.data.counts.unique} 个去重 Skill / ${state.data.counts.paths} 条安装路径`;
  $('#filter-line').innerHTML = [state.active !== 'all' ? `<span class="filter-chip">${label}</span>` : '', state.query ? `<span class="filter-chip">搜索：${escape(state.query)}</span>` : ''].join('');
  const grid = $('#grid'); grid.className = `skill-grid ${currentState().view === 'list' ? 'list' : ''}`; grid.innerHTML = list.length || packMatches.length ? [...packMatches.map(packCard), ...list.map(card)].join('') : $('#empty-template').innerHTML; syncViewButton();
  grid.querySelectorAll('[data-detail]').forEach((node) => { node.addEventListener('click', (event) => { if (!event.target.closest('[data-favorite],[data-pack]')) openDetail(node.dataset.detail); }); node.addEventListener('keydown', (event) => { if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('[data-favorite],[data-pack]')) { event.preventDefault(); openDetail(node.dataset.detail); } }); });
  grid.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); toggleFavorite(button.dataset.favorite); }));
  grid.querySelectorAll('[data-pack]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); openPack(button.dataset.pack); }));
}

function visiblePacks() {
  const query = state.query.trim().toLowerCase();
  return (state.data.packs || []).filter((pack) => {
    if (pack.relationType === 'historical_exclusion') return false;
    if (state.packDisplayType !== 'all' && packDisplayType(pack) !== state.packDisplayType) return false;
    const haystack = [pack.name, pack.chineseName, pack.description, pack.repo, pack.entry?.name, ...pack.members.map((member) => `${member.skill.name} ${member.skill.chineseName}`)].join(' ').toLowerCase();
    return !query || haystack.includes(query);
  });
}
function packCard(pack) {
  const display = packDisplayType(pack); const members = pack.members.slice(0,2).map((member) => member.skill.name).join(' · ');
  const total = pack.historyEvidence?.[0]?.skillNames?.length || pack.memberCount;
  const count = display === 'recommendation' ? `当前已安装 ${pack.memberCount} / 总成员 ${total}` : `${pack.memberCount} 个 Skill`;
  const action = display === 'workflow' ? '查看工作流' : display === 'suite' ? '查看套件' : display === 'recommendation' ? '查看记录' : display === 'pending' ? '查看证据' : '查看组合';
  return `<article class="pack-card pack-card-${display}" data-pack="${escape(pack.id)}"><div class="card-top"><span class="tag pack-type">${escape(packDisplayLabels[display])}</span></div><div class="card-title">${escape(pack.name)}</div><div class="card-chinese">${escape(pack.chineseName)}</div><p class="card-description">${escape(pack.description)}</p><div class="pack-meta"><span>${escape(count)}</span>${pack.entry ? `<span>入口：${escape(pack.entry.name)}</span>` : ''}</div>${members ? `<p class="pack-members">成员：${escape(members)}${pack.memberCount > 2 ? ` · +${pack.memberCount - 2}` : ''}</p>` : ''}<footer class="card-footer"><span>${action}</span><span>→</span></footer></article>`;
}
function renderPacks() {
  const all = (state.data.packs || []).filter((pack) => pack.relationType !== 'historical_exclusion'); const packs = visiblePacks();
  const counts = Object.fromEntries(['workflow','suite','companion','recommendation','pending'].map((type) => [type, all.filter((pack) => packDisplayType(pack) === type).length]));
  $('#page-title').textContent = '组合浏览'; $('#count-label').textContent = state.packDisplayType === 'all' ? `共 ${all.length} 个组合关系` : `显示 ${packs.length} / ${all.length}`;
  $('#filter-line').innerHTML = `<div class="pack-filters">${['all','workflow','suite','companion','recommendation','pending'].map((type) => `<button class="${state.packDisplayType===type?'active':''}" data-pack-filter="${type}">${packDisplayLabels[type]} <span>${type==='all'?all.length:counts[type]}</span></button>`).join('')}</div>${state.query ? `<span class="filter-chip">搜索：${escape(state.query)}</span>` : ''}`;
  $('#filter-line').querySelectorAll('[data-pack-filter]').forEach((button) => button.addEventListener('click', () => { state.packDisplayType = button.dataset.packFilter; renderPacks(); }));
  const grid = $('#grid'); grid.className = 'skill-grid pack-grid'; grid.innerHTML = packs.length ? packs.map(packCard).join('') : $('#empty-template').innerHTML;
  const history = (state.data.packs || []).filter((pack) => pack.relationType === 'historical_exclusion'); const records = $('#history-records'); records.hidden = !history.length; records.innerHTML = history.length ? `<h2>历史关系记录</h2><div>${history.map((pack) => `<button data-pack="${escape(pack.id)}"><strong>${escape(pack.chineseName)}</strong><span>${escape(pack.description)}</span><em>查看证据 →</em></button>`).join('')}</div>` : '';
  grid.querySelectorAll('[data-pack]').forEach((node) => node.addEventListener('click', () => openPack(node.dataset.pack)));
  records.querySelectorAll('[data-pack]').forEach((node) => node.addEventListener('click', () => openPack(node.dataset.pack)));
}

function render() { renderNav(); renderGrid(); }
async function saveState() { state.data.state = await api('/api/state', { method:'POST', body:JSON.stringify(currentState()) }); }
function syncViewButton() { const button = $('#view-button'); if (!button || !state.data) return; const list = currentState().view === 'list'; const label = list ? '切换为卡片视图' : '切换为列表视图'; button.textContent = list ? '☷' : '▦'; button.title = label; button.setAttribute('aria-label', label); button.setAttribute('aria-pressed', String(list)); }
async function toggleFavorite(id) { const favorites = new Set(currentState().favorites); const wasFavorite = favorites.has(id); wasFavorite ? favorites.delete(id) : favorites.add(id); currentState().favorites = [...favorites]; state.skills = state.skills.map((skill) => ({...skill, favorite:favorites.has(skill.id)})); await saveState(); render(); toast(wasFavorite ? '已取消收藏' : '已收藏'); return !wasFavorite; }
async function copy(text, success='已复制到剪贴板') { try { await navigator.clipboard.writeText(text); toast(success); } catch { toast('浏览器未允许复制，请手动复制。'); } }
function useInstruction(skill) { return `请在当前任务中使用 ${skill.name}，先读取其实际 SKILL.md，再按照该 Skill 的真实能力与使用规则执行任务。`; }

function packSection(detail) {
  const relation = detail.relations?.[0]; const pack = detail.packs?.[0];
  const options = ['<option value="">无所属组合</option>', ...(state.data.packs || []).map((item) => `<option value="${escape(item.id)}" ${relation?.packId===item.id?'selected':''}>${escape(item.chineseName)}</option>`)].join('');
  const controls = `<div class="classification-controls"><select id="relation-pack">${options}</select><select id="relation-role">${['independent','entry','child','companion'].map((role) => `<option value="${role}" ${(relation?.role || 'independent')===role?'selected':''}>${roleLabels[role]}</option>`).join('')}</select><input id="relation-order" type="number" min="0" step="1" value="${relation?.order ?? ''}" placeholder="推荐顺序" aria-label="推荐顺序"><label class="check"><input id="relation-standalone" type="checkbox" ${relation?.standaloneAllowed!==false?'checked':''}> 可单独使用</label><button class="secondary" data-save-relation>保存关系</button></div>`;
  if (!relation || !pack) return `<section class="detail-section"><h3>组合关系</h3><p>当前关系未确认：本地资料没有充分证据证明它必须独立或必须配套。</p>${controls}<p class="muted">手动调整仅保存到本机覆盖层，不会改写原始索引。</p></section>`;
  const workflow = pack.workflow || []; const at = workflow.indexOf(detail.id); const prior = at > 0 ? state.skills.find((skill) => skill.id === workflow[at-1]) : null; const next = at >= 0 && at < workflow.length-1 ? state.skills.find((skill) => skill.id === workflow[at+1]) : null;
  const start = relation.role==='entry' ? `这是 ${pack.chineseName} 的推荐入口；先从当前 Skill 开始，再按实际任务选择成员。` : relation.standaloneAllowed ? `当前 Skill 可以单独使用；若任务覆盖 ${pack.chineseName} 的多个环节，建议从 ${pack.entry?.name || '未确认入口'} 开始。` : `不建议直接从当前 Skill 开始；优先使用 ${pack.entry?.name || 'Pack 入口未确认'}。`;
  const relationStatus = pack.relationStatus==='confirmed' ? '关系已确认' : pack.relationStatus==='historical' ? '历史使用关系' : '关系待确认';
  return `<section class="detail-section pack-section"><h3>组合关系</h3><button class="pack-link" data-open-pack="${escape(pack.id)}">${escape(pack.chineseName)} →</button><p><strong>${escape(groupLabels[relation.relationType || 'pack'])}</strong> · ${escape(roleLabels[relation.role])} · ${relationStatus}</p><p><strong>你应该怎么开始：</strong>${escape(start)}</p><p><strong>前置 / 后续：</strong>${prior ? escape(prior.name) : '未规定'} / ${next ? escape(next.name) : '未规定'}</p><p><strong>使用顺序：</strong>${escape(pack.workflowNote)}</p><p><strong>关系证据：</strong>${escape(pack.evidence.join('；'))}</p>${controls}<p class="muted">手动调整仅保存到本机覆盖层，不会改写原始索引。</p></section>`;
}

function historySection(detail) {
  const evidence = detail.historyEvidence || [];
  if (!evidence.length) return '';
  const labels = { historical_confirmed_workflow:'历史确认工作流', historical_companion_bundle:'历史配套组合', historical_install_bundle:'历史安装组合', historical_recommended_combo:'历史推荐组合', historical_exclusion:'历史排除关系' };
  return `<section class="detail-section"><h3>历史使用证据</h3><ul>${evidence.map((item)=>`<li><strong>${escape(labels[item.relationType] || '历史关系')}</strong>：${escape(item.notes)}${item.order ? `<br><span class="muted">历史顺序：${escape(item.order)}</span>` : ''}</li>`).join('')}</ul><p class="muted">这是历史聊天记录，不替代当前本地 SKILL.md 的能力与版本事实。</p></section>`;
}

function sourceSection(detail) {
  const source = detail.source;
  if (!source) return `<section class="detail-section"><h3>来源</h3><p>本地来源信息尚未建立。</p></section>`;
  const repo = source.repoUrl ? `<a href="${escape(source.repoUrl)}" target="_blank" rel="noreferrer">${escape(source.repoUrl)}</a>` : 'GitHub 来源未确认';
  const version = source.version;
  const status = source.sourceStatus || (source.localSourcePath?.includes('/.system') ? 'Codex / OpenAI 系统 Skill' : source.repoKey ? 'GitHub 来源已确认' : '来源待确认');
  const comparison = version ? `${version.comparisonStatus}：${version.comparisonSummary}` : source.repoKey ? '远程核验未完成；资料库功能说明仍以当前本地 SKILL.md 为准。' : '仅确认本地安装位置；未把未知来源推断为 GitHub 仓库。';
  const versionInfo = version ? `<p><strong>本地版本：</strong>${escape(version.localVersion || '无法确认')} · <strong>GitHub 默认分支：</strong>${escape(version.remoteDefaultBranch || '无法确认')}</p><p><strong>GitHub 最新提交：</strong>${escape(version.remoteLatestCommit || '无法确认')} ${version.remoteLatestTag ? `· ${escape(version.remoteLatestTag)}` : ''}</p><p><strong>版本状态：</strong>${escape(comparison)}</p><p><strong>最后核验：</strong>${escape(version.checkedAt || '无法确认')}</p>` : '';
  return `<section class="detail-section"><h3>来源与版本</h3><p><strong>来源状态：</strong>${escape(status)}</p><p><strong>本地路径：</strong>${escape(source.localPaths?.[0] || '未记录')}</p><p><strong>本地来源：</strong>${escape(source.localSourcePath || '未确认')}</p><p><strong>GitHub 参考：</strong>${repo}</p><p><strong>同来源 Skill：</strong>${escape(source.sameRepoSkillCount || 1)} 个</p>${versionInfo}<p class="muted">${escape(source.repoEvidence || '')}</p></section>`;
}

async function openDetail(id) {
  const detail = await api(`/api/detail?id=${encodeURIComponent(id)}`); const recent = [id, ...currentState().recent.filter((item)=>item!==id)].slice(0,10); currentState().recent = recent; state.skills = state.skills.map((skill)=>({...skill, recent:recent.includes(skill.id)})); await saveState(); renderNav();
  state.dialogTab = 'intro'; renderDetail(detail); $('#detail-dialog').showModal();
}
function detailIntro(detail) {
  const intro = detail.intro;
  const list = (title, values) => `<section class="detail-section"><h3>${title}</h3><ul>${values.map((item)=>`<li>${escape(item)}</li>`).join('')}</ul></section>`;
  const categoryOptions = state.data.categories.map(([id,label])=>`<option value="${id}" ${id===detail.category?'selected':''}>${escape(label)}</option>`).join('');
  const relation = detail.relations?.[0]; const pack = detail.packs?.[0];
  const packSummary = relation && pack ? `<section class="detail-section"><h3>所属组合</h3><button class="pack-link" data-open-pack="${escape(pack.id)}">${escape(pack.chineseName)} →</button><p class="muted">${escape(relation.role === 'entry' ? '这是该组合的推荐入口。' : '可单独使用；跨多个环节时再从组合入口开始。')}</p></section>` : '';
  const related = `<section class="detail-section"><h3>相关 Skill</h3><div class="related">${detail.related.length ? detail.related.map((item)=>`<button data-related="${escape(item.id)}"><strong>${escape(item.name)}</strong><small>${escape(item.reason)}</small></button>`).join('') : '<span class="muted">没有足够相关的已安装 Skill。</span>'}</div></section>`;
  const more = `<details class="more-info"><summary>更多信息</summary><div class="more-info-body">${sourceSection(detail)}${historySection(detail)}${packSection(detail)}${list('核心功能与主要能力',intro.capabilities)}${list('不适合什么情况',intro.unsuitable)}${list('使用限制及注意事项',intro.limitations)}${list('实际任务示例',intro.examples)}<section class="detail-section"><h3>依赖、额外 API、潜在费用</h3><p>${escape(intro.prerequisites)}</p></section><section class="detail-section"><h3>原始 SKILL.md</h3><pre class="raw-doc">${escape(detail.raw || '当前安装路径无效，无法读取原始 SKILL.md。')}</pre></section><section class="detail-section"><h3>手动分类与标签</h3><div class="classification-controls"><select id="manual-category">${categoryOptions}</select><input id="manual-tags" value="${escape(detail.tags.filter((tag)=>tag!==detail.categoryLabel).join(', '))}" placeholder="标签，以逗号分隔"><button class="secondary" data-save-classification>保存</button>${detail.stale ? '<button class="secondary" data-refresh-intro>确认更新中文介绍</button>' : ''}</div><p class="muted">仅保存到本机资料库，不会改写原始 SKILL.md。</p></section><section class="detail-section"><h3>全部安装位置</h3><div class="path-list">${detail.allPaths.map((item)=>escape(item.skill_md)).join('<br>')}</div></section></div></details>`;
  return `${detail.stale ? '<aside class="stale-note">原始 SKILL.md 已变化。当前中文介绍仍是旧缓存；确认后才会按最新本地文档更新。</aside>' : ''}<section class="detail-section intro-lead"><h3>一句话介绍</h3><p>${escape(intro.oneLine)}</p></section>${list('适合什么时候使用',intro.suitable)}<section class="detail-section"><h3>怎么开始</h3><p>${escape(intro.usage)}</p></section>${packSummary}${related}${more}`;
}
function renderDetail(detail) {
  $('#detail-content').innerHTML = `<header class="detail-head"><div><p class="eyebrow">${escape(detail.categoryLabel)}</p><h2 class="detail-title">${escape(detail.name)}</h2><p class="muted">${escape(detail.chineseName)} · ${detail.available ? '已安装' : '安装路径失效'}</p></div><div class="detail-header-actions"><button class="secondary detail-action ${detail.favorite ? 'is-favorited' : ''}" data-detail-favorite aria-pressed="${detail.favorite}">${detail.favorite?'已收藏':'收藏'}</button><button class="secondary detail-action" data-copy-name>复制名称</button><button class="primary detail-action" data-copy-use>使用</button><button class="close inspector-close" data-close aria-label="关闭详情">×</button></div></header><div class="detail-scroll"><div id="detail-body">${detailIntro(detail)}</div></div>`;
  $('[data-close]')?.addEventListener('click',()=>$('#detail-dialog').close()); $('[data-detail-favorite]')?.addEventListener('click',async()=>{detail.favorite=await toggleFavorite(detail.id); renderDetail(detail);}); $('[data-copy-name]')?.addEventListener('click',()=>copy(detail.name,'已复制名称')); $('[data-copy-use]')?.addEventListener('click',()=>copy(useInstruction(detail),'已复制使用指令'));
  $('[data-save-classification]')?.addEventListener('click', async ()=>{ const category=$('#manual-category').value; const tags=$('#manual-tags').value.split(/[,，]/).map((item)=>item.trim()).filter(Boolean).slice(0,8); currentState().overrides[detail.id]={category,tags}; await saveState(); await load(); $('#detail-dialog').close(); toast('本地分类与标签已保存。'); });
  $('[data-save-relation]')?.addEventListener('click', async ()=>{ const packId=$('#relation-pack').value || null; const orderValue=$('#relation-order').value.trim(); const order=orderValue === '' ? null : Number(orderValue); await api('/api/pack-member',{method:'POST',body:JSON.stringify({skillId:detail.id,packId,role:$('#relation-role').value,order,standaloneAllowed:$('#relation-standalone').checked})}); await load(); $('#detail-dialog').close(); toast('本地组合关系已保存。'); });
  $('[data-refresh-intro]')?.addEventListener('click', async ()=>{ await api('/api/refresh-intro',{method:'POST',body:JSON.stringify({id:detail.id})}); await openDetail(detail.id); toast('中文介绍已按最新本地文档更新。'); });
  $('#detail-content').querySelectorAll('[data-related]').forEach((button)=>button.addEventListener('click',()=>openDetail(button.dataset.related)));
  $('#detail-content').querySelectorAll('[data-open-pack]').forEach((button)=>button.addEventListener('click',()=>openPack(button.dataset.openPack)));
  enhanceSelects($('#detail-content'));
}

function packInstruction(pack) {
  const entry = pack.entry?.name || '未确认统一主入口'; const flow = pack.workflow.length ? pack.workflow.map((id, index) => `${index+1}. ${id}：按 Pack 的实际顺序处理对应阶段。`).join('\n') : '原始文档未明确规定调用顺序，请按当前业务域选择成员。';
  return `请使用 ${pack.name} 协助完成当前任务。\n\n优先从 ${entry} 开始。\n\n成员分工：\n${pack.members.map((member) => `- ${member.skill.name}（${roleLabels[member.skillId===pack.entrySkill?'entry':member.role]}）：${member.skill.chineseName}`).join('\n')}\n\n推荐调用顺序：\n${flow}\n\n不要无必要地同时加载全部 Skill。先阅读各自真实 SKILL.md，再按照 Pack 的实际工作流执行。`;
}
function renderPackDetail(pack) {
  const groups = [['entry','主入口'],['child','子 Skill'],['companion','配套 Skill']].map(([role,label]) => [label, pack.members.filter((member) => (member.skillId===pack.entrySkill?'entry':member.role)===role)]).filter(([,members]) => members.length);
  const flow = pack.workflow.length ? `<ol class="workflow">${pack.workflow.map((id) => { const member=pack.members.find((item)=>item.skillId===id); return member ? `<li><button data-pack-skill="${escape(id)}">${escape(member.skill.name)}</button> — ${escape(member.skill.chineseName)}</li>` : ''; }).join('')}</ol>` : '<p>原始文档未明确规定调用顺序。</p>';
  const memberGroups = groups.map(([label,members])=>`<section class="detail-section"><h3>${label}</h3><div class="related">${members.map((member)=>`<button data-pack-skill="${escape(member.skillId)}"><strong>${escape(member.skill.name)}</strong><small>${escape(member.skill.chineseName)} · ${member.standaloneAllowed!==false?'可单独使用':'建议经入口使用'}</small></button>`).join('')}</div></section>`).join('');
  const versionedMembers = pack.members.map((member) => member.skill.source?.version).filter(Boolean);
  const consistentMembers = versionedMembers.filter((version) => version.comparisonStatus === '基本一致').length;
  const unresolvedMembers = versionedMembers.filter((version) => version.comparisonStatus !== '基本一致').length;
  const versionNote = versionedMembers.length
    ? `本地成员结构保持不变。已核验 ${versionedMembers.length}/${pack.memberCount} 个具 GitHub 来源的成员：${consistentMembers} 个基本一致，${unresolvedMembers} 个尚无法可靠比较；不会据此自动增删成员。`
    : '当前成员没有可核验的 GitHub 版本信息；本地成员结构保持不变。';
  const packStatus = pack.relationStatus==='confirmed' ? '已确认' : pack.relationStatus==='historical' ? '历史使用关系' : '待确认';
  const entryOptions = pack.members.map((member)=>`<option value="${escape(member.skillId)}" ${member.skillId===pack.entrySkill?'selected':''}>${escape(member.skill.name)}</option>`).join('');
  const members = pack.members.slice(0, 5).map((member)=>`<button data-pack-skill="${escape(member.skillId)}"><strong>${escape(member.skill.name)}</strong><small>${escape(member.skill.chineseName)}</small></button>`).join('');
  const more = `<details class="more-info"><summary>更多信息</summary><div class="more-info-body"><section class="detail-section"><h3>来源与版本</h3><p><strong>来源：</strong>${escape(pack.repo || '未记录')} ${pack.repoUrl ? `· ${escape(pack.repoUrl)}` : '· GitHub 来源未确认'}</p><p>${escape(versionNote)}</p></section><section class="detail-section"><h3>完整工作流</h3>${flow}<p class="muted">${escape(pack.workflowNote)}</p></section>${memberGroups}<section class="detail-section"><h3>关系来源</h3><ul>${pack.evidence.map((item)=>`<li>${escape(item)}</li>`).join('')}</ul></section>${pack.historyOnly ? '' : `<section class="detail-section"><h3>调整主入口</h3><div class="classification-controls"><select id="pack-entry-select">${entryOptions}</select><button class="secondary" data-save-pack-entry>保存主入口</button></div></section>`}</div></details>`;
  $('#pack-content').innerHTML = `<header class="detail-head"><div><p class="eyebrow">${escape(groupLabels[pack.relationType || 'pack'])} · ${escape(packStatus)}</p><h2 class="detail-title">${escape(pack.name)}</h2><p class="muted">${escape(pack.chineseName)} · ${pack.memberCount} 个 Skill</p></div><div class="detail-header-actions"><button class="primary" data-copy-pack>使用组合</button><button class="close inspector-close" data-close-pack aria-label="关闭详情">×</button></div></header><div class="detail-scroll"><section class="detail-section intro-lead"><h3>一句话用途</h3><p>${escape(pack.description)}</p></section><section class="detail-section"><h3>怎么开始</h3><p>${pack.entry ? `<button class="pack-link" data-pack-skill="${escape(pack.entry.id)}">从 ${escape(pack.entry.name)} 开始 →</button>` : '该组合没有确认的统一入口。'}</p><p class="muted">${escape(pack.usage)}</p></section><section class="detail-section"><h3>包含的 Skill</h3><div class="related">${members || '<span class="muted">当前没有已安装成员。</span>'}</div></section>${more}</div>`;
  $('[data-close-pack]').addEventListener('click',()=>$('#pack-dialog').close()); $('[data-copy-pack]').addEventListener('click',()=>copy(packInstruction(pack),'整套使用指令已复制'));
  $('[data-save-pack-entry]')?.addEventListener('click',async()=>{await api('/api/pack-entry',{method:'POST',body:JSON.stringify({packId:pack.id,entrySkill:$('#pack-entry-select').value})}); await load(); $('#pack-dialog').close(); toast('主入口已保存到本机覆盖层。');});
  $('#pack-content').querySelectorAll('[data-pack-skill]').forEach((button)=>button.addEventListener('click',()=>{ $('#pack-dialog').close(); openDetail(button.dataset.packSkill); }));
  enhanceSelects($('#pack-content'));
}
function openPack(id) { const pack=(state.data.packs || []).find((item)=>item.id===id); if (!pack) return toast('当前 Pack 不存在或成员已变化。'); renderPackDetail(pack); $('#pack-dialog').showModal(); }

function finderTerms(task) {
  const terms = new Set((task.toLowerCase().match(/[a-z0-9][a-z0-9+.#-]*/g) || []).filter((term) => term.length > 1));
  for (const run of task.match(/[\u4e00-\u9fff]{2,}/g) || []) for (let index = 0; index < run.length - 1; index += 1) terms.add(run.slice(index, index + 2));
  return [...terms].slice(0, 24);
}
function includesAny(text, terms) { return terms.some((term) => text.includes(term)); }
function localCandidates(task) {
  const terms = finderTerms(task); if (!terms.length) return [];
  const score = (fields) => fields.reduce((total, [text, weight]) => total + [...terms].filter((term) => text.includes(term)).length * weight, 0);
  const skills = state.skills.map((skill) => {
    const relationText = (skill.relations || []).map((relation) => `${relation.packName} ${relation.chineseName}`).join(' ');
    const value = score([[skill.name.toLowerCase(), 6], [skill.chineseName.toLowerCase(), 5], [skill.categoryLabel.toLowerCase(), 4], [skill.tags.join(' ').toLowerCase(), 3], [`${skill.oneLine} ${skill.description} ${relationText}`.toLowerCase(), 2]]);
    const reasons = [includesAny(skill.categoryLabel.toLowerCase(), terms) ? `分类：${skill.categoryLabel}` : '', includesAny(skill.tags.join(' ').toLowerCase(), terms) ? `标签：${skill.tags.slice(0, 2).join('、')}` : '', includesAny(`${skill.name} ${skill.chineseName} ${skill.oneLine}`.toLowerCase(), terms) ? '名称或简介命中' : ''].filter(Boolean);
    return { type: 'skill', item: skill, score: value, reasons };
  });
  const packs = (state.data.packs || []).map((pack) => {
    const members = pack.members.map((member) => `${member.skill.name} ${member.skill.chineseName} ${member.skill.oneLine || ''}`).join(' ');
    const value = score([[pack.name.toLowerCase(), 6], [pack.chineseName.toLowerCase(), 5], [pack.description.toLowerCase(), 3], [members.toLowerCase(), 2]]);
    const reasons = [includesAny(`${pack.name} ${pack.chineseName}`.toLowerCase(), terms) ? '组合名称命中' : '', includesAny(pack.description.toLowerCase(), terms) ? '组合用途命中' : '', includesAny(members.toLowerCase(), terms) ? '成员 Skill 命中' : ''].filter(Boolean);
    return { type: 'pack', item: pack, score: value, reasons };
  });
  return [...skills, ...packs].filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name)).slice(0, 8);
}
function candidateCard(candidate) {
  const item = candidate.item; const title = candidate.type === 'pack' ? item.chineseName : item.name; const subtitle = candidate.type === 'pack' ? item.name : item.chineseName; const summary = candidate.type === 'pack' ? item.description : item.oneLine;
  return `<article class="finder-result"><span class="tag">${candidate.type === 'pack' ? 'Skill Pack' : 'Skill'}</span><div><strong>${escape(title)}</strong><small>${escape(subtitle)}</small><p>${escape(summary)}</p><em>匹配原因：${escape(candidate.reasons.join('、') || '本地字段命中')}</em></div><button class="secondary" type="button" data-finder-open="${candidate.type}:${escape(item.id)}">查看</button></article>`;
}
function quickFilter() {
  const task = $('#quick-filter-input').value.trim(); const results = task ? localCandidates(task) : [];
  $('#quick-filter-results').innerHTML = !task ? '<p class="muted">输入关键词、分类或任务片段后开始筛选。</p>' : results.length ? results.map(candidateCard).join('') : '<p class="muted">本地资料库中没有直接命中的 Skill 或 Pack；可以换一个更具体的关键词。</p>';
  $('#quick-filter-results').querySelectorAll('[data-finder-open]').forEach((button) => button.addEventListener('click', () => { const [type, id] = button.dataset.finderOpen.split(':'); $('#smart-dialog').close(); type === 'pack' ? openPack(id) : openDetail(id); }));
}
function codexPrompt(task, candidates) {
  const context = candidates.length ? candidates.map((candidate, index) => {
    const item = candidate.item;
    if (candidate.type === 'pack') return `${index + 1}. [Skill Pack] ${item.chineseName}（${item.name}）\n   用途：${item.description}\n   主入口：${item.entry?.name || '未确认'}\n   成员：${item.members.slice(0, 5).map((member) => member.skill.name).join('、')}${item.members.length > 5 ? ' 等' : ''}\n   本地命中：${candidate.reasons.join('、') || '相关字段'}`;
    return `${index + 1}. [Skill] ${item.name}｜${item.chineseName}\n   分类：${item.categoryLabel}\n   简介：${item.oneLine}\n   标签：${item.tags.slice(0, 4).join('、') || '未整理'}${item.relations?.length ? `\n   所属组合：${item.relations.map((relation) => relation.chineseName).join('、')}` : ''}\n   本地命中：${candidate.reasons.join('、') || '相关字段'}`;
  }).join('\n\n') : '本地初筛没有直接命中项；请明确说明当前已安装工具可能不足，不要自行外部搜索。';
  return `我现在要完成以下任务：\n\n${task}\n\n请基于我当前 Skill Library 中已安装的 Skill / Pack 进行推荐。\n\n要求：\n- 先理解并拆解任务\n- 优先推荐已安装工具\n- 最多推荐 3 个核心 Skill / Pack\n- 必要时最多补充 2 个辅助 Skill\n- 说明为什么推荐、各自负责什么和不负责什么\n- 判断是否需要整套 Pack，避免为了使用而组合\n- 不要因为关键词相同就推荐，必须依据候选说明与关系\n- 不要自动执行 Skill\n- 不要自动安装新 Skill\n- 如果当前已安装工具不够，请明确指出，等待我决定是否外部搜索\n\n以下是由本地资料库初筛出的候选（仅供最终判断，不代表结论）：\n\n${context}`;
}
function buildCodexRequest() {
  const task = $('#codex-task-input').value.trim(); if (!task) return toast('请先描述要完成的任务。');
  $('#codex-request-preview').value = codexPrompt(task, localCandidates(task)); $('#codex-request-wrap').hidden = false;
}
function setFinderMode(mode) {
  $('#smart-dialog').querySelectorAll('[data-finder-mode]').forEach((button) => { const active = button.dataset.finderMode === mode; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  $('#smart-dialog').querySelectorAll('[data-finder-panel]').forEach((panel) => { panel.hidden = panel.dataset.finderPanel !== mode; });
}

async function refresh() { $('#sync-state').textContent='正在增量刷新…'; try { const result=await api('/api/refresh',{method:'POST'}); await load(); toast(`索引已刷新：${result.unique} 个 Skill`); } catch(error) { toast(`刷新失败：${error.message}`); } finally { $('#sync-state').textContent='本地索引已就绪'; } }
function applyTheme(value) { document.documentElement.dataset.theme=value; currentState().theme=value; saveState(); }
async function exportBackup() { const backup=await api('/api/backup'); const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}); const link=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`skill-library-backup-${new Date().toISOString().slice(0,10)}.json`}); link.click(); URL.revokeObjectURL(link.href); }
async function importBackup(file) { try { const value=JSON.parse(await file.text()); await api('/api/backup',{method:'POST',body:JSON.stringify(value)}); await load(); $('#settings-dialog').close(); toast('备份已导入。'); } catch(error) { toast(`导入失败：${error.message}`); } }
async function load() { const result=await api('/api/skills'); state.data=result; state.skills=result.skills; document.documentElement.dataset.theme=result.state.theme; $('#theme').value=result.state.theme; const queue=result.analysisQueue?.items || []; const notice=$('#analysis-notice'); notice.hidden=!queue.length; notice.innerHTML=queue.length ? `<span>发现 ${queue.length} 个 Skill 尚未 AI 整理。</span><button class="secondary" id="copy-analysis-request">复制 Codex 整理请求</button>` : ''; $('#copy-analysis-request')?.addEventListener('click',()=>copy(`请使用 skill-library 整理我的 Skill Library。只分析待整理队列中的 ${queue.length} 个 Skill；读取其本地 SKILL.md，写入用户数据 skill-metadata.json，保留字段级 manualOverride，不修改第三方 SKILL.md。`,'已复制 Codex 整理请求')); enhanceSelects(); render(); const detailId=new URLSearchParams(location.search).get('detail'); if(detailId && !$('#detail-dialog').open) await openDetail(detailId); }

$('#search').addEventListener('input',(event)=>{state.query=event.target.value;renderGrid();}); $('#theme').addEventListener('change',(event)=>applyTheme(event.target.value)); $('#refresh-button').addEventListener('click',refresh); $('#view-button').addEventListener('click',async()=>{currentState().view=currentState().view==='grid'?'list':'grid'; syncViewButton(); await saveState(); renderGrid();}); $('#smart-button').addEventListener('click',()=>$('#smart-dialog').showModal()); $('#quick-filter-button').addEventListener('click',quickFilter); $('#build-codex-request').addEventListener('click',buildCodexRequest); $('#copy-codex-request').addEventListener('click',()=>copy($('#codex-request-preview').value,'已复制 Codex 推荐指令')); $('#smart-dialog').querySelectorAll('[data-finder-mode]').forEach((button)=>button.addEventListener('click',()=>setFinderMode(button.dataset.finderMode))); $('#settings-button').addEventListener('click',()=>$('#settings-dialog').showModal()); $('#export-button').addEventListener('click',exportBackup); $('#import-input').addEventListener('change',(event)=>event.target.files[0]&&importBackup(event.target.files[0])); document.querySelectorAll('[data-close]').forEach((button)=>button.addEventListener('click',()=>button.closest('dialog').close())); document.querySelectorAll('dialog').forEach((dialog)=>dialog.addEventListener('click',(event)=>{if(event.target===dialog) dialog.close();})); document.addEventListener('keydown',(event)=>{if(event.key==='Escape') document.querySelectorAll('dialog[open]').forEach((dialog)=>dialog.close());}); window.setInterval(()=>api('/api/heartbeat',{method:'POST'}).catch(()=>{}),15000);
load().catch((error)=>{document.body.innerHTML=`<main class="empty"><strong>Skill Library 无法启动</strong><span>${escape(error.message)}</span></main>`;});
