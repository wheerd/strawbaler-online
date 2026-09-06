import { expect, test } from '@playwright/test'

import { getEditorSvg, getInspector, loadTestData, pressKey, setupEditorPage } from '../fixtures/editor'

test.describe('Intermediate Wall Selection', () => {
  test('selects intermediate walls and their wall nodes', async ({ page }) => {
    test.setTimeout(120000)
    await setupEditorPage(page)
    await loadTestData(page, /Intermediate Wall Relationships/)
    await pressKey(page, 'Escape')

    const svg = getEditorSvg(page)
    const inspector = getInspector(page)
    const intermediateWalls = svg.locator('[data-entity-type="intermediate-wall"]')
    const wallNodes = svg.locator('[data-entity-type="wall-node"]')

    await expect(intermediateWalls).toHaveCount(3)
    await expect(wallNodes).toHaveCount(5)

    for (const index of [0, 1, 2]) {
      await intermediateWalls.nth(index).click()
      await expect(inspector.getByText('Wall Configuration')).toBeVisible()
      await intermediateWalls.nth(index).click()
      await expect(inspector.locator('#intermediate-wall-thickness')).toHaveValue('12')
      await expect(inspector.getByText('Length')).toBeVisible()
      await pressKey(page, 'Escape')
      await pressKey(page, 'Escape')
    }

    // Cover an outer-wall attachment, a standalone endpoint, and the shared
    // node between the two intermediate walls.
    for (const index of [0, 2, 3]) {
      await wallNodes.nth(index).click()
      await expect(inspector.getByText('Wall Configuration')).toBeVisible()
      await wallNodes.nth(index).click()
      await expect(inspector.getByRole('button', { name: /fit to view/i })).toBeVisible()
      await pressKey(page, 'Escape')
      await pressKey(page, 'Escape')
    }
  })
})
