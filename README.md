# DevPilot — AI Engineering Workspace

> Built for the **OpenAI Build Week Hackathon** · Track: **Developer Tools**

> **Submission readiness:** DevPilot is a browser-based developer tool built with Codex and powered by GPT-5.6. Add the deployed Render URL, public demo-video URL, and primary Codex `/feedback` Session ID in the submission checklist below before submitting to Devpost.

DevPilot is an AI-powered engineering workspace that helps developers understand, review, test, and extend any codebase — in seconds. Paste a GitHub repo URL, and DevPilot instantly lets you analyze architecture, get a code review, generate tests, write docs, plan features, and forecast maintainability risk — all from a clean, single-page interface.

---

## What It Does

| Feature | Description |
|---|---|
| **Repository Import** | Import any public GitHub repo by URL or `owner/repo` shorthand. Up to 40 source files loaded into context automatically. |
| **Architecture Analysis** | Get a structured breakdown of tech stack, entry points, modules, dependencies, and complexity notes. |
| **Code Review** | File-level review with categorized findings: security issues, code smells, performance, and design problems — with specific fix suggestions. |
| **Test Generation** | Auto-generate a full test suite for any file, with edge cases identified and listed. |
| **Docs / README Generator** | Generate a complete, production-ready README for any codebase. |
| **Feature Planner** | Describe a feature in plain English and get a full implementation plan: steps, affected files, and a dev checklist. |
| **Time Machine (Forecast)** | Six-month maintainability risk forecast with actionable suggestions to reduce technical debt. |

---

## Live Demo

Deploy the included `render.yaml` to Render, then add the resulting URL here:

- **App:** `https://devpilot-75lc.onrender.com/`

### How judges can test it

1. Open the deployed app URL in a modern desktop browser.
2. Import a public GitHub repository using `owner/repository` or a full GitHub URL.
3. Select any DevPilot tool from the sidebar and run an analysis.
4. Optionally paste a new file into the workspace; it is added to the local browser workspace and included in subsequent analysis without changing GitHub.

If a hosted demo is unavailable, follow the local setup instructions below. No account, database, or local project files are required to evaluate the core workflow.

---

## Tech Stack

- **Frontend:** React 18, Vite
- **Backend:** Node.js, Express
- **AI:** OpenAI API — GPT-5.6 (`gpt-5.6`) via the `responses` endpoint
- **GitHub Integration:** GitHub REST API (public repos, no token required)

---

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key with access to GPT-5.6
- A modern browser: Chrome, Edge, Firefox, or Safari

### Installation

```bash
git clone https://github.com/your-username/devpilot
cd devpilot
npm install
```

### Configuration

Copy the example env file and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.6
PORT=3001
IMPORT_MAX_FILES=40
IMPORT_MAX_FILE_BYTES=50000
RATE_LIMIT_MAX_REQUESTS=12
```

### Run

```bash
npm run dev
```

This starts both the Express API server (`localhost:3001`) and the Vite dev server (`localhost:5173`) concurrently.

Open your browser at `http://localhost:5173`.

### Deploy on Render

This repository includes `render.yaml` for a single free Render web service. It builds the React client, serves it from Express, and keeps the OpenAI key on the server.

1. Push this repository to GitHub without committing `.env`.
2. In Render, choose **New → Blueprint** and select the repository.
3. Enter `OPENAI_API_KEY` when prompted. Optionally set `GITHUB_TOKEN` to reduce GitHub import rate-limit failures.
4. Deploy and use the generated `onrender.com` URL as the live-demo link above.

The free Render service may sleep after inactivity; its first request can take longer while it starts.

---

## How to Use

1. **Repository tab** — Import a public GitHub repo (`owner/repo` or full URL), or use the bundled TaskFlow API demo.
2. **Pick a tool** from the left sidebar.
3. Hit the action button and DevPilot sends your codebase to GPT-5.6 and streams back a structured report.
4. For **Code Review** and **Test Generation**, select the specific file you want to analyze.
5. For **Feature Planner**, type your feature request in the input field before running.

---

## Project Structure

```
devpilot/
├── server/
│   ├── index.js        # Express API — repo import, rate limiting, AI proxy
│   └── prompts.js      # Prompt templates for all 6 AI features
├── src/
│   ├── main.jsx        # React app — all UI components
│   └── styles.css      # Styling
├── index.html
├── vite.config.js
└── package.json
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Required. Your OpenAI API key. |
| `OPENAI_MODEL` | `gpt-5.6` | Model to use for all AI features. |
| `PORT` | `3001` | Port for the Express server. |
| `IMPORT_MAX_FILES` | `40` | Max files fetched from a GitHub repo. |
| `IMPORT_MAX_FILE_BYTES` | `50000` | Max size per file (bytes). |
| `RATE_LIMIT_MAX_REQUESTS` | `12` | Max AI requests per IP per minute. |

---

## How Codex and GPT-5.6 Powered This Build

This project was built during OpenAI Build Week with Codex as the primary development partner. Here's where AI made the biggest difference:

**Codex accelerated the build in these areas:**

- **Prompt engineering** — Codex helped design and iterate on all six prompt templates in `server/prompts.js`. Getting structured JSON output that maps cleanly to UI components required multiple rounds of refinement; Codex handled most of the iteration.
- **GitHub API integration** — The repository import pipeline (tree fetch → file filtering → parallel content fetch → base64 decode) was scaffolded by Codex, including the edge case handling for rate limits, private repos, and truncated trees.
- **Rate limiting middleware** — The in-memory rate limiter in `server/index.js` was generated and tuned by Codex to be lightweight with no external dependencies.
- **React UI layout** — The sidebar navigation, split-panel file explorer, and result rendering components were built with Codex handling the repetitive JSX and state wiring.

**Key decisions made by the developer:**

- Choosing a stateless, file-in-context architecture (no database, no auth) to keep the tool instantly usable.
- Selecting the six AI features based on the most common pain points in code onboarding workflows.
- Deciding to cap context at 40 files and 50KB per file to stay within model limits while covering most real-world repos.
- Designing the prompt format to always return plain JSON (no markdown fences) to avoid parsing failures.

**GPT-5.6 contributions:**

- GPT-5.6 is the inference engine behind all six analysis features. The quality of structured output — especially the code review findings with specific `area`, `issue`, and `fix` fields — is only possible with a model that understands code deeply.
- The maintainability forecast feature (`Time Machine`) leans heavily on GPT-5.6's ability to reason about long-term software risk from a snapshot of source files.

---

## Supported File Types

JS, JSX, TS, TSX, MJS, CJS, Python, JSON, Markdown, CSS, HTML, YAML/YML

Automatically excludes: `node_modules`, `dist`, `build`, `coverage`, `vendor`

---

## Supported Platforms

DevPilot is a responsive web application tested for modern desktop browsers: Chrome, Microsoft Edge, Firefox, and Safari. It requires an internet connection to import public GitHub repositories and call the OpenAI API. There is no native desktop or mobile application, database, authentication flow, or browser extension to install.

---


## Hackathon Track

**Developer Tools** — DevPilot targets developers who need to onboard to an unfamiliar codebase quickly, get an objective code review without waiting for a teammate, or plan a feature without reading every file manually.

