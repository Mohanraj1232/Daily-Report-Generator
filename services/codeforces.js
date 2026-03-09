const fetch = require('node-fetch');

function getDifficulty(rating, index) {
  if (rating != null) {
    if (rating < 1200) return 'Easy';
    if (rating < 1900) return 'Medium';
    return 'Hard';
  }
  if (index) {
    const letter = index.charAt(0).toUpperCase();
    if (letter <= 'B') return 'Easy';
    if (letter <= 'D') return 'Medium';
    return 'Hard';
  }
  return 'Unknown';
}

async function fetchCodeforces(username) {
  const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Codeforces API returned ${resp.status}`);
  const json = await resp.json();

  if (json.status !== 'OK') throw new Error(json.comment || 'Codeforces API error');

  const accepted = json.result.filter((s) => s.verdict === 'OK');

  // Deduplicate by problem (contestId + index)
  const seen = new Set();
  const results = [];

  for (const s of accepted) {
    const key = `${s.problem.contestId}-${s.problem.index}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const ts = s.creationTimeSeconds * 1000;
    const d = new Date(ts);

    results.push({
      date: d.toISOString(),
      title: `${s.problem.index}. ${s.problem.name}`,
      problemLink: `https://codeforces.com/problemset/problem/${s.problem.contestId}/${s.problem.index}`,
      link: `https://codeforces.com/contest/${s.problem.contestId}/submission/${s.id}`,
      platform: 'Codeforces',
      topics: (s.problem.tags || []).join(', '),
      difficulty: getDifficulty(s.problem.rating, s.problem.index),
    });
  }

  return results;
}

module.exports = { fetchCodeforces };
