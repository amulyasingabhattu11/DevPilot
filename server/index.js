import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import { buildPrompt } from './prompts.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '12mb' }))
const port = Number(process.env.PORT || 3001)
const maxFiles = Number(process.env.IMPORT_MAX_FILES || 40)
const maxFileBytes = Number(process.env.IMPORT_MAX_FILE_BYTES || 250000)
const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 12)
const requestCounts = new Map()
const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'DevPilot-MVP',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
}
const githubFetch = async (url) => {
  try { return await fetch(url, { headers: githubHeaders, signal: AbortSignal.timeout(20_000) }) }
  catch (error) { throw new Error('Could not reach GitHub. Check your internet connection, then retry. Add GITHUB_TOKEN to .env if GitHub is rate-limiting this server.') }
}

app.get('/api/health', (_, res) => res.json({ configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || 'gpt-5.6' }))
app.use('/api/ai', (req, res, next) => {
  const key = req.ip || 'unknown'
  const now = Date.now()
  const state = requestCounts.get(key) || { startedAt: now, count: 0 }
  if (now - state.startedAt >= rateWindowMs) Object.assign(state, { startedAt: now, count: 0 })
  state.count += 1
  requestCounts.set(key, state)
  if (state.count > maxRequests) return res.status(429).json({ error: 'Too many AI requests. Please wait a minute and try again.' })
  next()
})

const githubUrlPattern = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)(?:\/tree\/([^/?#]+))?\/?$/i
const githubShorthandPattern = /^([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i
app.post('/api/repository/import', async (req, res) => {
  const input = String(req.body?.url || '').trim()
  const match = input.match(githubUrlPattern) || input.match(githubShorthandPattern)
  if (!match) return res.status(400).json({ error: 'Use a public GitHub URL or shorthand, such as owner/repository.' })
  const [, owner, repo, requestedBranch] = match
  try {
    const metadataResponse = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`)
    if (!metadataResponse.ok) {
      if (metadataResponse.status === 404) throw new Error('Repository not found or it is private. DevPilot supports public repositories only.')
      if (metadataResponse.status === 403) throw new Error('GitHub rate limit reached. Try again later or add a GitHub token to the server.')
      throw new Error('GitHub could not load this repository.')
    }
    const metadata = await metadataResponse.json()
    const branch = requestedBranch || metadata.default_branch
    const treeResponse = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
    if (!treeResponse.ok) throw new Error(treeResponse.status === 403 ? 'GitHub rate limit reached while reading the file tree.' : 'GitHub could not read the repository file tree.')
    const tree = await treeResponse.json()
    const allowed = /\.(js|jsx|ts|tsx|mjs|cjs|py|json|md|css|html|yml|yaml)$/i
    const sourceFiles = (tree.tree || []).filter(item => item.type === 'blob' && allowed.test(item.path) && !/(^|\/)(node_modules|dist|build|coverage|vendor)(\/|$)/.test(item.path))
    const sizeEligible = sourceFiles.filter(item => item.size <= maxFileBytes)
    const candidates = sizeEligible.slice(0, maxFiles)
    if (!candidates.length) throw new Error('No supported source files were found. DevPilot supports JS/TS, Python, Markdown, JSON, CSS, HTML, and YAML.')
    const loaded = []
    for (let index = 0; index < candidates.length; index += 6) {
      const batch = candidates.slice(index, index + 6)
      const batchResults = await Promise.all(batch.map(async item => {
        const fileResponse = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${encodeURIComponent(branch)}`)
        if (!fileResponse.ok) return null
        const file = await fileResponse.json()
        return file.encoding === 'base64' ? { path: item.path, content: Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8') } : null
      }))
      loaded.push(...batchResults)
    }
    const files = loaded.filter(Boolean)
    if (!files.length) throw new Error('GitHub returned no readable source files.')
    res.json({
      name: metadata.full_name,
      branch,
      files,
      importInfo: {
        totalTreeFiles: (tree.tree || []).filter(item => item.type === 'blob').length,
        supportedFiles: sourceFiles.length,
        includedFiles: files.length,
        skippedTooLarge: sourceFiles.length - sizeEligible.length,
        skippedByLimit: Math.max(0, sizeEligible.length - maxFiles),
        treeTruncated: Boolean(tree.truncated),
        limits: { maxFiles, maxFileBytes }
      }
    })
  } catch (error) {
    res.status(502).json({ error: error.message || 'Repository import failed.' })
  }
})

app.post('/api/ai/:feature', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(400).json({ error: 'Missing OPENAI_API_KEY. Add it to .env and restart.' })
  try {
    const prompt = buildPrompt(req.params.feature, req.body)
    if (!prompt) return res.status(400).json({ error: 'Unknown AI feature.' })
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6',
      input: prompt,
      text: { format: { type: 'json_object' } }
    })
    const output = response.output_text?.trim()
    if (!output) throw new Error('The model returned an empty response. Please try again.')
    res.json(JSON.parse(output))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error instanceof SyntaxError ? 'The model returned invalid JSON. Try again.' : error.message || 'AI request failed.' })
  }
})
app.listen(port, () => console.log(`DevPilot API: http://localhost:${port}`))
