const fetch = require('node-fetch');

function getDifficulty(rating) {
  if (rating == null) return 'Unknown';
  if (rating < 1200) return 'Easy';
  if (rating <= 1900) return 'Medium';
  return 'Hard';
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
      link: `https://codeforces.com/problemset/problem/${s.problem.contestId}/${s.problem.index}`,
      platform: 'Codeforces',
      topics: (s.problem.tags || []).join(', '),
      difficulty: getDifficulty(s.problem.rating),
    });
  }

  return results;
}

module.exports = { fetchCodeforces };
