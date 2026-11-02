import { TabBar } from '../components/TabBar'
import { useLearner } from '../lib/learner'

/** The learner's vocabulary list. It starts with the placement bubbles they didn't tap. */
export function Vocab() {
  const { vocab } = useLearner()
  return (
    <div className="flex h-full flex-col">
      <main className="pt-safe flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        <header className="flex flex-col gap-1 pt-4">
          <h1 className="m-0 text-[30px] font-extrabold tracking-tight">Vocab</h1>
          <span className="text-sm font-medium text-muted">
            {vocab.length ? `${vocab.length} words to learn` : 'Words you meet will show up here.'}
          </span>
        </header>
        {vocab.length > 0 && (
          <ul className="m-0 flex list-none flex-col p-0">
            {vocab.map((v) => (
              <li key={v.word} className="flex min-h-14 flex-col justify-center gap-0.5 border-b border-line py-2 last:border-0">
                <span lang="es" className="text-[17px] font-bold">
                  {v.word}
                </span>
                <span className="text-sm font-medium text-muted">{v.translation}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
      <TabBar />
    </div>
  )
}
