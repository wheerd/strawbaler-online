import { expect, test } from '@playwright/test'

test('Welcome page displays correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/StrawBuild/)

  await expect(page.getByTestId('header')).toMatchAriaSnapshot(`
    - link:
      - /url: /
    - button "Project": My Project
    - navigation:
      - link "Welcome":
        - /url: /
      - link "Editor":
        - /url: /editor
      - link "Plan":
        - /url: /plan
      - link "3D View":
        - /url: /3d-view
      - link "Parts":
        - /url: /parts
      - link "Config":
        - /url: /config
    - link "View on GitHub":
      - /url: https://github.com/wheerd/strawbuild-studio
    - button "Change language"
    - button "Change theme"
    - button "Account"
  `)

  await expect(page.getByText(/Version \w+/)).toBeVisible()

  const welcomeContent = page.getByTestId('welcome-page')
  await expect(welcomeContent).toBeVisible()

  await expect(welcomeContent.getByRole('link', { name: /View on GitHub/i })).toHaveAttribute(
    'href',
    'https://github.com/wheerd/strawbuild-studio'
  )

  await expect(welcomeContent.getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('href', '/privacy')

  await expect(page.getByRole('heading', { name: /Key Features/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Planned Features/i })).toBeVisible()
})
