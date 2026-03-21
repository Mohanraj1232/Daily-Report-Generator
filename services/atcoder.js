const fetch = require('node-fetch');

const SUBMISSION_PAGE_SIZE = 500;
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 15000;

let problemsMapPromise;
let difficultyMapPromise;
let problemDetailsPromise;

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

async function fetchProblemDetails() {
  if (!problemDetailsPromise) {
    problemDetailsPromise = (async () => {
      const problems = await fetchJsonWithRetry('https://kenkoooo.com/atcoder/resources/problems.json', 'AtCoder problems details API');
      const map = new Map();
      for (const p of problems) {
        map.set(p.id, p);
      }
      return map;
    })().catch((err) => {
      problemDetailsPromise = undefined;
      throw err;
    });
  }
  return problemDetailsPromise;
}

function getAtCoderDifficulty(problemId, difficultyMap, problemDetails) {
  // First try to get difficulty from the difficulty map
  let model = difficultyMap[problemId];
  
  if (model && model.difficulty != null) {
    const d = model.difficulty;
    if (d < 800) return 'Easy';
    if (d < 1200) return 'Medium';
    return 'Hard';
  }
  
  // Fallback: use problem index to infer difficulty
  // In AtCoder contests, typically: A=Easy, B/C=Medium, D+=Hard
  const problemDetail = problemDetails.get(problemId);
  if (problemDetail && problemDetail.problem_index) {
    const index = problemDetail.problem_index.toUpperCase();
    if (index === 'A') return 'Easy';
    if (index === 'B' || index === 'C') return 'Medium';
    return 'Hard';
  }
  
  // If all else fails
  return 'Unknown';
}

async function fetchAtCoder(username, startDate, endDate) {
  const startTs = startDate ? Math.floor(new Date(startDate).setHours(0, 0, 0, 0) / 1000) : 0;
  const endTs = endDate ? Math.floor(new Date(endDate).setHours(23, 59, 59, 999) / 1000) : Number.MAX_SAFE_INTEGER;

  const [problemMap, difficultyMap, problemDetails] = await Promise.all([
    fetchProblemsMap(),
    fetchDifficultyMap(),
    fetchProblemDetails(),
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

    // Derive contest category and number from contest_id
    let topic = '';
    if (s.contest_id) {
      if (s.contest_id.startsWith('abc')) {
        const num = s.contest_id.replace('abc', '');
        topic = `AtCoder Beginner Contest ${num}`;
      } else if (s.contest_id.startsWith('arc')) {
        const num = s.contest_id.replace('arc', '');
        topic = `AtCoder Regular Contest ${num}`;
      } else if (s.contest_id.startsWith('agc')) {
        const num = s.contest_id.replace('agc', '');
        topic = `AtCoder Grand Contest ${num}`;
      } else {
        topic = s.contest_id;
      }
    }

    results.push({
      date: d.toISOString(),
      title: problemMap.get(s.problem_id) || s.problem_id,
      link: `https://atcoder.jp/contests/${s.contest_id}/submissions/${s.id}`,
      platform: 'Atcoder',
      topics: topic,
      difficulty: getAtCoderDifficulty(s.problem_id, difficultyMap, problemDetails),
    });
  }

  return results;
}

module.exports = { fetchAtCoder };
