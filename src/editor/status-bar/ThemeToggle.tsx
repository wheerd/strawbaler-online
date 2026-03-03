import { Check, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/ui/components/dropdown-menu'

export function ThemeToggle(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const { theme, resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon-sm"
          className="h-7 w-7"
          title={t($ => $.themeToggle.changeTheme)}
          aria-label={t($ => $.themeToggle.changeTheme)}
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setTheme('light')
          }}
        >
          {theme === 'light' && <Check className="h-4 w-4" />}
          <span className={theme !== 'light' ? 'pl-6' : ''}>{t($ => $.themeToggle.light)}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTheme('dark')
          }}
        >
          {theme === 'dark' && <Check className="h-4 w-4" />}
          <span className={theme !== 'dark' ? 'pl-6' : ''}>{t($ => $.themeToggle.dark)}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTheme('system')
          }}
        >
          {theme === 'system' && <Check className="h-4 w-4" />}
          <span className={theme !== 'system' ? 'pl-6' : ''}>{t($ => $.themeToggle.system)}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
