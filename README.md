# Competitive Programming Activity Report Generator

Fetch accepted submissions from **LeetCode**, **Codeforces**, and **AtCoder** and generate a structured table you can copy-paste into Excel or Google Sheets.

---

## Features

- Fetch accepted submissions by username and date range
- Supports LeetCode, Codeforces, AtCoder (or all at once)
- Displays: Date, Problem Title, Link, Platform, Topics, Difficulty
- Copy to clipboard, Export CSV, Export Excel
- Clean responsive UI — no frameworks needed

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or later

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

---

## Project Structure

```
├── server.js            # Express server & API routes
├── package.json
├── services/
│   ├── leetcode.js      # LeetCode GraphQL fetcher
│   ├── codeforces.js    # Codeforces REST API fetcher
│   └── atcoder.js       # AtCoder (Kenkoooo API) fetcher
└── public/
    ├── index.html       # Frontend UI
    ├── style.css        # Styles
    └── script.js        # Frontend logic
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leetcode/:username?startDate=&endDate=` | LeetCode submissions |
| GET | `/api/codeforces/:username?startDate=&endDate=` | Codeforces submissions |
| GET | `/api/atcoder/:username?startDate=&endDate=` | AtCoder submissions |
| GET | `/api/all/:username?startDate=&endDate=` | All platforms combined |

Dates use `YYYY-MM-DD` format.

---

## Deployment

### Vercel

1. Install the Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root
3. Follow the prompts

> Note: For Vercel serverless functions you may need to convert `server.js` into `api/` route handlers. For a quick deploy the server approach works well on Render or Railway.

### Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your Git repo
3. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Deploy

### Railway

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your repo
3. Railway auto-detects Node.js — it will run `npm install` and `npm start`
4. Deploy

---

## License

MIT
