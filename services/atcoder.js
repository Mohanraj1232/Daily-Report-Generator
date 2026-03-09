const fetch = require('node-fetch');

async function fetchProblemsMap() {
  const resp = await fetch('https://kenkoooo.com/atcoder/resources/problems.json');
  if (!resp.ok) throw new Error(`AtCoder problems API returned ${resp.status}`);
  const problems = await resp.json();
  const map = new Map();
  for (const p of problems) {
    map.set(p.id, p.title);
  }
  return map;
}

async function fetchAtCoder(username) {
  const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(username)}&from_second=0`;
  const [resp, problemMap] = await Promise.all([
    fetch(url),
    fetchProblemsMap(),
  ]);
  if (!resp.ok) throw new Error(`AtCoder API returned ${resp.status}`);
  const submissions = await resp.json();

  const accepted = submissions.filter((s) => s.result === 'AC');

  // Deduplicate by problem_id — keep earliest
  const seen = new Map();
  for (const s of accepted) {
    if (!seen.has(s.problem_id) || s.epoch_second < seen.get(s.problem_id).epoch_second) {
      seen.set(s.problem_id, s);
    }
  }

  const results = [];
  for (const s of seen.values()) {
    const ts = s.epoch_second * 1000;
    const d = new Date(ts);

    // Derive contest category from contest_id prefix as a rough topic
    let topic = '';
    if (s.contest_id) {
      if (s.contest_id.startsWith('abc')) topic = 'AtCoder Beginner Contest';
      else if (s.contest_id.startsWith('arc')) topic = 'AtCoder Regular Contest';
      else if (s.contest_id.startsWith('agc')) topic = 'AtCoder Grand Contest';
      else topic = s.contest_id;
    }

    results.push({
      date: d.toISOString(),
      title: problemMap.get(s.problem_id) || s.problem_id,
      link: `https://atcoder.jp/contests/${s.contest_id}/submissions/${s.id}`,
      platform: 'Atcoder',
      topics: topic,
      difficulty: 'Unknown',
    });
  }

  return results;
}

module.exports = { fetchAtCoder };
