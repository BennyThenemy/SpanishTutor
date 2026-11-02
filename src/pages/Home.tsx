import { Link } from 'react-router-dom'
import { ButtonLink } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { TabBar } from '../components/TabBar'
import { firebaseConfigured } from '../lib/firebase'
import { today, tutor } from '../lib/profile'

export function Home() {
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="flex h-full flex-col">
      <main className="pt-safe flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        <header className="flex flex-col gap-1 pt-4">
          <span className="text-sm font-medium text-muted">{date}</span>
          <h1 lang="es" className="m-0 text-[30px] font-extrabold tracking-tight">
            {greeting()}
          </h1>
        </header>

        {!firebaseConfigured && (
          <p role="alert" className="m-0 rounded-[22px] border-[1.5px] border-dashed border-mark p-4 text-sm font-medium leading-normal">
            Firebase isn't set up yet. Copy <code>.env.example</code> to <code>.env.local</code> and add your web app
            config to make calls.
          </p>
        )}

        <section className="flex flex-col gap-4 rounded-[28px] bg-card p-5">
          <div className="flex items-center gap-3.5">
            <Avatar name={tutor.name} size={52} />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-muted">Next call with {tutor.name}</span>
              <span className="text-2xl font-extrabold tracking-tight">Today, {today.nextCall}</span>
            </div>
            <span className="text-[13px] font-semibold text-muted">~{today.minutes} min</span>
          </div>
          <ButtonLink to="/call" aria-disabled={!firebaseConfigured}>
            <Icon name="phone" size={22} />
            Call me now
          </ButtonLink>
        </section>

        <section className="flex flex-col gap-2.5 rounded-[28px] border-[1.5px] border-line p-5">
          <span className="text-[13px] font-bold tracking-wider text-muted uppercase">Today's focus</span>
          <h2 className="m-0 text-xl leading-tight font-extrabold">{today.focusTitle}</h2>
          <p className="m-0 text-[15px] leading-normal text-muted">{today.focusDetail}</p>
          <span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            <Icon name="book" size={18} />
            {today.focusSource}
          </span>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/mistakes" className="flex min-h-[76px] flex-col justify-center gap-0.5 rounded-[22px] bg-sunk px-4 py-3.5">
            <span className="text-2xl font-extrabold">—</span>
            <span className="text-[13px] font-semibold text-muted">mistakes to review</span>
          </Link>
          <Link to="/vocab" className="flex min-h-[76px] flex-col justify-center gap-0.5 rounded-[22px] bg-sunk px-4 py-3.5">
            <span className="text-2xl font-extrabold">—</span>
            <span className="text-[13px] font-semibold text-muted">words due</span>
          </Link>
        </div>
      </main>
      <TabBar />
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}
