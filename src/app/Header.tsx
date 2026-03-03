import { HandIcon, PencilIcon, SettingsIcon, TablePropertiesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { UserMenu } from '@/app/user/UserMenu'
import { OfflineStatusIndicator } from '@/editor/status-bar/OfflineStatusIndicator'
import { ThemeToggle } from '@/editor/status-bar/ThemeToggle'
import { ProjectMenu } from '@/projects/ui/ProjectMenu'
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher'
import { Logo } from '@/shared/ui/Logo'
import { ConstructionPlanIcon, GitHubIcon, Model3DIcon } from '@/shared/ui/icons'
import { cn } from '@/shared/ui/utils'

const navItems = [
  { path: '/', labelKey: 'welcome', icon: HandIcon },
  { path: '/editor', labelKey: 'editor', icon: PencilIcon },
  { path: '/plan', labelKey: 'plan', icon: ConstructionPlanIcon },
  { path: '/3d-view', labelKey: '3dView', icon: Model3DIcon },
  { path: '/parts', labelKey: 'parts', icon: TablePropertiesIcon },
  { path: '/config', labelKey: 'config', icon: SettingsIcon }
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
                'text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive && 'bg-primary/10 text-primary'
              )
            }
          >
            <item.icon className="inline-block h-5 w-5" />
            {t($ => $.nav[item.labelKey])}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <a
          title={t($ => $.viewOnGitHub, { ns: 'welcome' })}
          className="text-sm"
          href="https://github.com/wheerd/strawbuild-studio"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitHubIcon width="14" height="14" />
        </a>
        <OfflineStatusIndicator />
        <LanguageSwitcher size="sm" />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
