const fetch = require('node-fetch');

const SUBMISSION_PAGE_SIZE = 500;
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 15000;

let problemsMapPromise;
let difficultyMapPromise;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, label) {
  let lastErr;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, { timeout: REQUEST_TIMEOUT_MS });
      if (!resp.ok) {
        const err = new Error(`${label} returned ${resp.status}`);
        err.status = resp.status;
        throw err;
      }
      return await resp.json();
    } catch (err) {
      lastErr = err;
      const status = err.status || 0;
      const retriable = status >= 500 || status === 0;
      if (!retriable || attempt === MAX_RETRIES) break;
      await sleep(300 * (attempt + 1));
    }
  }

  throw lastErr;
}

async function fetchProblemsMap() {
  if (!problemsMapPromise) {
    problemsMapPromise = (async () => {
      const problems = await fetchJsonWithRetry('https://kenkoooo.com/atcoder/resources/problems.json', 'AtCoder problems API');
      const map = new Map();
      for (const p of problems) {
        map.set(p.id, p.title);
      }
      return map;
    })().catch((err) => {
      problemsMapPromise = undefined;
      throw err;
    });
  }
  return problemsMapPromise;
}

async function fetchDifficultyMap() {
  if (!difficultyMapPromise) {
    difficultyMapPromise = fetchJsonWithRetry('https://kenkoooo.com/atcoder/resources/problem-models.json', 'AtCoder difficulty API').catch((err) => {
      difficultyMapPromise = undefined;
      throw err;
    });
  }
  return difficultyMapPromise;
}

function getAtCoderDifficulty(problemId, difficultyMap) {
  const model = difficultyMap[problemId];
  if (!model || model.difficulty == null) return 'Unknown';
  const d = model.difficulty;
  if (d < 400) return 'Easy';
  if (d < 800) return 'Medium';
  return 'Hard';
}

async function fetchAtCoder(username, startDate, endDate) {
  const startTs = startDate ? Math.floor(new Date(startDate).setHours(0, 0, 0, 0) / 1000) : 0;
  const endTs = endDate ? Math.floor(new Date(endDate).setHours(23, 59, 59, 999) / 1000) : Number.MAX_SAFE_INTEGER;

  const [problemMap, difficultyMap] = await Promise.all([
    fetchProblemsMap(),
    fetchDifficultyMap(),
  ]);

  const submissions = [];
  let fromSecond = startTs;

  while (true) {
    const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(username)}&from_second=${fromSecond}`;
    const page = await fetchJsonWithRetry(url, 'AtCoder API');
    if (!Array.isArray(page) || page.length === 0) break;

    submissions.push(...page);

    if (page.length < SUBMISSION_PAGE_SIZE) break;

    const lastEpoch = page[page.length - 1].epoch_second;
    if (!Number.isFinite(lastEpoch) || lastEpoch < fromSecond) break;
    fromSecond = lastEpoch + 1;
  }

  const accepted = submissions.filter((s) => s.result === 'AC' && s.epoch_second >= startTs && s.epoch_second <= endTs);

  // Deduplicate by problem_id - keep earliest
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
      difficulty: getAtCoderDifficulty(s.problem_id, difficultyMap),
    });
  }

  return results;
}

module.exports = { fetchAtCoder };
