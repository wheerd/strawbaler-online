import { expect, test } from '@playwright/test'
import path from 'node:path'

test('Editor page loads with correct toolbar', async ({ page }) => {
  await page.goto('/editor')
  await expect(page.getByTestId('floor-plan-editor')).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('editor-svg')).toBeVisible()

  await expect(page.getByTestId('editor-toolbar')).toMatchAriaSnapshot(`
    - combobox: L0 Ground Floor
    - button "Manage floors"
    - button "Import plan image"
    - toolbar:
      - button "Select"
      - button "Move"
      - button "Fit to View"
      - separator
      - button "Building Perimeter"
      - button "Perimeter Presets"
      - button "Add Opening"
      - button "Add Post"
      - button "Split Wall"
      - separator
      - button "Floor Opening"
      - separator
      - button "Roof"
      - separator
      - button "Test Data"
  `)
})

test('Editor loads test data correctly', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/editor')
  await expect(page.getByTestId('floor-plan-editor')).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: 'Test Data' }).click()
  await page.getByRole('button', { name: /Cross\/T-Shape Perimeter/ }).click()

  await expect(page.getByTestId('editor-svg')).toHaveScreenshot({
    animations: 'disabled',
    scale: 'css',
    stylePath: path.resolve(import.meta.dirname, 'hide-overlays.css')
  })
})
