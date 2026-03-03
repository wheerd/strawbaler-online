import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { UserMenu } from '@/app/user/UserMenu'
import { ProjectMenu } from '@/projects/ui/ProjectMenu'
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher'
import { Logo } from '@/shared/ui/Logo'
import { cn } from '@/shared/ui/utils'

import { OfflineStatusIndicator } from '../editor/status-bar/OfflineStatusIndicator'
import { ThemeToggle } from '../editor/status-bar/ThemeToggle'

const navItems = [
  { path: '/', labelKey: 'welcome' },
  { path: '/editor', labelKey: 'editor' },
  { path: '/plan', labelKey: 'plan' },
  { path: '/3d-view', labelKey: '3dView' },
  { path: '/parts', labelKey: 'parts' },
  { path: '/config', labelKey: 'config' }
] as const

export function Header(): React.JSX.Element {
  const { t } = useTranslation('common')

  return (
    <header className="border-border bg-card flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center">
          <Logo compact />
        </Link>
        <ProjectMenu />
      </div>

      <nav className="flex items-center gap-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive && 'bg-primary/10 text-primary'
              )
            }
          >
            {t($ => $.nav[item.labelKey])}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <LanguageSwitcher size="sm" />
        <ThemeToggle />
        <OfflineStatusIndicator />
        <UserMenu />
      </div>
    </header>
  )
}
