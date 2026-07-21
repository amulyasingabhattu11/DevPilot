const maxSourceChars = 80_000
const excerpt = (content, limit) => content.length <= limit ? content : `${content.slice(0, Math.max(1, limit - 500))}\n\n/* … file excerpt shortened for AI context … */\n\n${content.slice(-420)}`
const source = (files = []) => {
  let remaining = maxSourceChars
  return files.map((file, index) => {
    const header = `\n--- ${file.path} ---\n`
    const fairShare = Math.min(12_000, Math.max(1_200, Math.floor(remaining / Math.max(1, files.length - index))))
    const body = excerpt(file.content, fairShare)
    remaining -= header.length + body.length
    return `${header}${body}`
  }).join('')
}
const intro = 'You are DevPilot, an exacting senior engineer. Work only from supplied code. Be specific and concise. Return valid JSON only, with no markdown fences.'
export function buildPrompt(feature, { files = [], file, request }) {
  const code = file ? `\n--- ${file.path} ---\n${excerpt(file.content, maxSourceChars)}` : source(files)
  const asks = {
    architecture: 'Return {"summary":"","techStack":[""],"entryPoints":[""],"modules":[{"name":"","purpose":""}],"dependencies":[""],"complexityNotes":[""]}.',
    review: 'Return {"summary":"","findings":{"security":[{"area":"","issue":"","fix":""}],"smells":[{"area":"","issue":"","fix":""}],"performance":[{"area":"","issue":"","fix":""}],"design":[{"area":"","issue":"","fix":""}]}}. Include only evidence-based findings.',
    tests: 'Return {"framework":"","tests":"full test source","edgeCases":[""]}. Generate tests compatible with the selected language.',
    docs: 'Return {"markdown":"complete README Markdown","highlights":[""]}.',
    planner: `Plan the requested feature: ${request}. Return {"summary":"","complexity":"Low|Medium|High","steps":[""],"files":[{"path":"","change":""}],"checklist":[""]}.`,
    forecast: 'Return {"headline":"","risk":"Low|Medium|High","narrative":"","suggestions":[{"title":"","action":"","impact":""}]}. Forecast six-month maintainability risks.'
  }
  return asks[feature] ? `${intro}\n${asks[feature]}\nSOURCE:${code}` : null
}
