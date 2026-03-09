const express = require('express');
const path = require('path');
const { fetchLeetCode } = require('./services/leetcode');
const { fetchCodeforces } = require('./services/codeforces');
const { fetchAtCoder } = require('./services/atcoder');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ---------- helpers ----------

function filterByDateRange(submissions, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return submissions.filter((s) => {
    const d = new Date(s.date);
    return d >= start && d <= end;
  });
}

function sanitizeUsername(raw) {
  // Allow alphanumeric, underscores, hyphens, dots (common across platforms)
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(raw)) {
    return null;
  }
  return raw;
}

// ---------- routes ----------

app.get('/api/leetcode/:username', async (req, res) => {
  try {
    const username = sanitizeUsername(req.params.username);
    if (!username) return res.status(400).json({ error: 'Invalid username' });
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate query params required' });
    const all = await fetchLeetCode(username, startDate, endDate);
    res.json(all);
  } catch (err) {
    console.error('LeetCode error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/codeforces/:username', async (req, res) => {
  try {
    const username = sanitizeUsername(req.params.username);
    if (!username) return res.status(400).json({ error: 'Invalid username' });
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate query params required' });
    const all = await fetchCodeforces(username);
    res.json(filterByDateRange(all, startDate, endDate));
  } catch (err) {
    console.error('Codeforces error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/atcoder/:username', async (req, res) => {
  try {
    const username = sanitizeUsername(req.params.username);
    if (!username) return res.status(400).json({ error: 'Invalid username' });
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate query params required' });
    const all = await fetchAtCoder(username);
    res.json(filterByDateRange(all, startDate, endDate));
  } catch (err) {
    console.error('AtCoder error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start server only when run directly (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
