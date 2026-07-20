import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import { buildPrompt } from './prompts.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_, res) => res.json({ configured: Boolean(process.env.OPENAI_API_KEY) }))

const githubUrlPattern = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)(?:\/tree\/([^/?#]+))?\/?$/i
const githubShorthandPattern = /^([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i
app.post('/api/repository/import', async (req, res) => {
  const input = String(req.body?.url || '').trim()
  const match = input.match(githubUrlPattern) || input.match(githubShorthandPattern)
  if (!match) return res.status(400).json({ error: 'Use a public GitHub URL or shorthand, such as owner/repository.' })
  const [, owner, repo, requestedBranch] = match
  try {
    const metadataResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'DevPilot-MVP' } })
    if (!metadataResponse.ok) throw new Error(metadataResponse.status === 404 ? 'Repository not found or it is private. DevPilot supports public repositories only.' : 'GitHub could not load this repository.')
    const metadata = await metadataResponse.json()
    const branch = requestedBranch || metadata.default_branch
    const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'DevPilot-MVP' } })
    if (!treeResponse.ok) throw new Error('GitHub could not read the repository file tree.')
    const tree = await treeResponse.json()
    const allowed = /\.(js|jsx|ts|tsx|mjs|cjs|py|json|md|css|html|yml|yaml)$/i
    const candidates = (tree.tree || []).filter(item => item.type === 'blob' && item.size <= 50000 && allowed.test(item.path) && !/(^|\/)(node_modules|dist|build|coverage|vendor)(\/|$)/.test(item.path)).slice(0, 40)
    if (!candidates.length) throw new Error('No supported source files were found. DevPilot supports JS/TS, Python, Markdown, JSON, CSS, HTML, and YAML.')
    const loaded = await Promise.all(candidates.map(async item => {
      const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${encodeURIComponent(branch)}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'DevPilot-MVP' } })
      if (!fileResponse.ok) return null
      const file = await fileResponse.json()
      return file.encoding === 'base64' ? { path: item.path, content: Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8') } : null
    }))
    const files = loaded.filter(Boolean)
    if (!files.length) throw new Error('GitHub returned no readable source files.')
    res.json({ name: metadata.full_name, branch, files })
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
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
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
app.listen(3001, () => console.log('DevPilot API: http://localhost:3001'))
