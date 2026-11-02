import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Today', icon: 'home' },
  { to: '/mistakes', label: 'Mistakes', icon: 'mistakes' },
  { to: '/vocab', label: 'Vocab', icon: 'vocab' },
  { to: '/library', label: 'Library', icon: 'book' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export function TabBar() {
  return (
    <nav aria-label="Main" className="pb-safe flex border-t border-line bg-bg px-1.5 pt-1.5">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs ${
              isActive ? 'font-extrabold text-ink' : 'font-semibold text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-2xl ${
                  isActive ? 'bg-accent text-on-accent' : ''
                }`}
              >
                <Icon name={tab.icon} size={22} />
              </span>
              {tab.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
