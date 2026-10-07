const base = process.env.SKILL_LIBRARY_URL || 'http://127.0.0.1:32147';
const fetchJson = async (path, options) => {
  const response = await fetch(`${base}${path}`, options);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};
const health = await fetchJson('/api/health');
if (!health.ok) throw new Error('Health check failed.');
const library = await fetchJson('/api/skills');
if (!Array.isArray(library.skills) || library.skills.length !== library.counts.unique || library.skills.length === 0) throw new Error('Skill list is inconsistent.');
if (new Set(library.skills.map((skill) => skill.id)).size !== library.skills.length) throw new Error('Duplicate skill ids found.');
if (!Array.isArray(library.packs)) throw new Error('Pack payload is invalid.');
const target = library.skills.find((skill) => skill.available);
const detail = await fetchJson(`/api/detail?id=${encodeURIComponent(target.id)}`);
if (!detail.raw || !detail.intro?.oneLine || !Array.isArray(detail.allPaths)) throw new Error('Detail payload is incomplete.');
const originalState = library.state;
await fetchJson('/api/state', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(originalState) });
console.log(JSON.stringify({ ok:true, skills:library.skills.length, packs:library.packs.length, testedDetail:target.id }));
