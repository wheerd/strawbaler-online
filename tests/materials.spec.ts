import { type Page, expect, test } from '@playwright/test'

async function setupMaterialsPage(page: Page): Promise<void> {
  await page.goto('/config/materials')
  await expect(page.getByRole('link', { name: 'Materials' }).first()).toBeVisible({ timeout: 15000 })
}

async function addMaterialOfType(page: Page, typeLabel: string) {
  await page.getByRole('button', { name: 'Add New' }).click()
  await page.getByRole('menuitem', { name: typeLabel }).click()
}

test('materials configuration journey', async ({ page }) => {
  test.setTimeout(60000)

  await setupMaterialsPage(page)
  const nameField = page.getByPlaceholder('Material name')

  await addMaterialOfType(page, 'Dimensional')
  await nameField.fill('E2E Dimensional')

  await page.getByLabel('Cross section smaller dimension').fill('6')
  await page.getByLabel('Cross section larger dimension').fill('12')
  await page.getByRole('button', { name: 'Add cross section' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: /6cm × 12cm/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove cross section' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove cross section' }).click()
  await expect(page.getByText('No cross sections configured')).toBeVisible()

  await page.getByLabel('Stock length input').fill('450')
  await page.getByRole('button', { name: 'Add stock length' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: /4\.5m/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove stock length' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove stock length' }).click()
  await expect(page.getByText('No lengths configured')).toBeVisible()

  await addMaterialOfType(page, 'Sheet')
  await nameField.fill('E2E Sheet')

  await page.getByLabel('Sheet width').fill('60')
  await page.getByLabel('Sheet length').fill('120')
  await page.getByRole('button', { name: 'Add sheet size' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: /0.6m × 1.2m/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove sheet size' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove sheet size' }).click()
  await expect(page.getByText('No sheet sizes configured')).toBeVisible()

  await page.getByLabel('Thickness input').fill('30')
  await page.getByRole('button', { name: 'Add thickness' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: /3cm/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove thickness' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove thickness' }).click()
  await expect(page.getByText('No thicknesses configured')).toBeVisible()

  await addMaterialOfType(page, 'Volume')
  await nameField.fill('E2E Volume')

  await expect(page.getByRole('radio', { name: 'L' })).toBeChecked()
  await expect(page.getByText('No volumes configured')).toBeVisible()

  await page.getByLabel('Volume input').fill('1500')
  await page.getByRole('button', { name: 'Add volume option' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: /1,500L/ })).toBeVisible()

  await page.getByRole('radio', { name: 'm³' }).click()

  await page.getByLabel('Volume input').fill('1.3')
  await page.getByRole('button', { name: 'Add volume option' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: /1\.30m³/ })).toBeVisible()

  await expect(page.getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('listitem').filter({ hasText: /1\.50m³/ })).toBeVisible()

  await page.getByRole('button', { name: 'Remove volume option' }).first().click()
  await expect(page.getByRole('listitem')).toHaveCount(1)

  await addMaterialOfType(page, 'Generic')
  await nameField.fill('E2E Generic')

  await addMaterialOfType(page, 'Strawbale')
  await nameField.fill('E2E Strawbale')

  await page.getByRole('button', { name: 'Duplicate' }).click()
  await expect(nameField).toHaveValue(/Copy/)

  await page.getByRole('button', { name: 'Delete' }).click()
  const alert = page.getByRole('alertdialog', { name: 'Delete Material' })
  await alert.getByRole('button', { name: 'Delete' }).click()
  await expect(alert).toBeHidden()
})
