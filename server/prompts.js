const source = (files = []) => files.map(f => `\n--- ${f.path} ---\n${f.content}`).join('').slice(0, 80000)
const intro = 'You are DevPilot, an exacting senior engineer. Work only from supplied code. Be specific and concise. Return valid JSON only, with no markdown fences.'
export function buildPrompt(feature, { files = [], file, request }) {
  const code = file ? `\n--- ${file.path} ---\n${file.content}` : source(files)
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
