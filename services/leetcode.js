const fetch = require('node-fetch');

const GRAPHQL_URL = 'https://leetcode.com/graphql';

async function fetchAllSubmissions(username) {
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  const resp = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { username, limit: 20 },
    }),
  });

  if (!resp.ok) throw new Error(`LeetCode API returned ${resp.status}`);
  const json = await resp.json();
  if (json.errors) throw new Error(json.errors[0].message);

  return json.data.recentAcSubmissionList || [];
}

async function fetchProblemDetail(titleSlug) {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        difficulty
        topicTags {
          name
        }
      }
    }
  `;

  const resp = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { titleSlug },
    }),
  });

  if (!resp.ok) return { questionFrontendId: '', difficulty: 'Unknown', topics: '' };
  const json = await resp.json();
  if (json.errors || !json.data.question) return { questionFrontendId: '', difficulty: 'Unknown', topics: '' };

  const q = json.data.question;
  return {
    questionFrontendId: q.questionFrontendId || '',
    difficulty: q.difficulty || 'Unknown',
    topics: (q.topicTags || []).map((t) => t.name).join(', '),
  };
}

async function fetchLeetCode(username, startDate, endDate) {
  const submissions = await fetchAllSubmissions(username);

  // Compute date boundaries for filtering
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // Filter by date range
  const inRange = submissions.filter((s) => {
    const d = new Date(parseInt(s.timestamp, 10) * 1000);
    return d >= start && d <= end;
  });

  // Deduplicate by titleSlug per day — keep most recent accepted
  const seen = new Map();
  for (const s of inRange) {
    const ts = parseInt(s.timestamp, 10);
    const dayKey = new Date(ts * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `${s.titleSlug}|${dayKey}`;
    const existing = seen.get(key);
    if (!existing || ts > parseInt(existing.timestamp, 10)) {
      seen.set(key, s);
    }
  }

  const unique = Array.from(seen.values());

  // Fetch metadata for each problem (batch with concurrency limit)
  const BATCH = 5;
  const results = [];

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const details = await Promise.all(
      batch.map((s) => fetchProblemDetail(s.titleSlug))
    );
    batch.forEach((s, idx) => {
      const ts = parseInt(s.timestamp, 10) * 1000;
      const d = new Date(ts);
      const detail = details[idx];
      const frontendId = detail.questionFrontendId;
      const programTitle = frontendId ? `${frontendId}. ${s.title}` : s.title;
      results.push({
        date: d.toISOString(),
        title: programTitle,
        link: `https://leetcode.com/problems/${s.titleSlug}/submissions/${s.id}/`,
        problemLink: `https://leetcode.com/problems/${s.titleSlug}`,
        platform: 'Leetcode',
        topics: detail.topics,
        difficulty: detail.difficulty,
      });
    });
  }

  return results;
}

module.exports = { fetchLeetCode };
