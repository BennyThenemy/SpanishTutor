// Builds the placement content that ships inside the app: runs db/*.sql in an in-memory SQLite
// database and writes one JSON file per language to src/content/<language>.json.
// Usage: node scripts/build-content.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const root = new URL('../', import.meta.url)
const db = new DatabaseSync(':memory:')
for (const file of ['db/setup-words.sql', 'db/setup-grammar.sql']) {
  db.exec(readFileSync(new URL(file, root), 'utf8'))
}

const languages = new Set([
  ...db.prepare('SELECT DISTINCT language FROM words').all().map((r) => r.language),
  ...db.prepare('SELECT DISTINCT language FROM grammar_rungs').all().map((r) => r.language),
])

mkdirSync(new URL('src/content/', root), { recursive: true })

for (const language of languages) {
  const words = db
    .prepare(
      `SELECT word, translation, difficulty, duolingo_section AS section, kind, in_placement AS placement
       FROM words WHERE language = ? ORDER BY duolingo_section, id`,
    )
    .all(language)
    .map((w) => ({
      word: w.word,
      translation: w.translation,
      band: w.difficulty,
      section: w.section,
      kind: w.kind,
      ...(w.placement ? { placement: true } : {}),
    }))

  const itemsStmt = db.prepare('SELECT id, prompt FROM grammar_items WHERE rung_id = ? ORDER BY position')
  const optionsStmt = db.prepare('SELECT text, is_correct FROM grammar_options WHERE item_id = ? ORDER BY position')
  const rungs = db
    .prepare('SELECT id, rung, topic, cefr, speaking_path_start FROM grammar_rungs WHERE language = ? ORDER BY rung')
    .all(language)
    .map((r) => ({
      rung: r.rung,
      topic: r.topic,
      band: r.cefr,
      ...(r.speaking_path_start ? { speakingPathStart: true } : {}),
      items: itemsStmt.all(r.id).map((item) => {
        const options = optionsStmt.all(item.id)
        if (options.filter((o) => o.is_correct).length !== 1) {
          throw new Error(`${language} rung ${r.rung}: "${item.prompt}" needs exactly one correct option`)
        }
        return {
          prompt: item.prompt,
          options: options.map((o) => o.text),
          answer: options.findIndex((o) => o.is_correct),
        }
      }),
    }))

  const out = new URL(`src/content/${language}.json`, root)
  writeFileSync(out, JSON.stringify({ language, words, rungs }) + '\n')
  const bubbles = words.filter((w) => w.placement).length
  console.log(`${language}: ${words.length} words (${bubbles} placement), ${rungs.length} rungs → src/content/${language}.json`)
}
