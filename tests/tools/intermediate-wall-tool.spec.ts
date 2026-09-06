import { type Locator, type Page, expect, test } from '@playwright/test'

import {
  activateTool,
  getEditorSvg,
  getInspector,
  loadTestData,
  pressKey,
  setupEditorPage,
  takeEditorScreenshot
} from '../fixtures/editor'

async function clickEntityRelativePosition(page: Page, entity: Locator, pos: { x: number; y: number }): Promise<void> {
  const svg = getEditorSvg(page)
  const [svgBox, entityBox] = await Promise.all([svg.boundingBox(), entity.boundingBox()])
  if (!svgBox || !entityBox) throw new Error('Could not get editor entity bounds')

  await svg.click({
    position: {
      x: entityBox.x + entityBox.width * pos.x - svgBox.x,
      y: entityBox.y + entityBox.height * pos.y - svgBox.y
    }
  })
}

test.describe('Intermediate Wall Tool', () => {
  test('draws outer-connected, standalone, and intermediate-connected walls', async ({ page }) => {
    test.setTimeout(120000)
    await setupEditorPage(page)
    await loadTestData(page, /Rectangular Perimeter/)
    await pressKey(page, 'Escape')
    await activateTool(page, 'Draw Intermediate Wall')

    const inspector = getInspector(page)
    const svg = getEditorSvg(page)
    const perimeterWalls = svg.locator('[data-entity-type="perimeter-wall"]')
    const intermediateWalls = svg.locator('[data-entity-type="intermediate-wall"]')

    await expect(inspector.getByText('Wall Thickness')).toBeVisible()
    await expect(inspector.getByRole('radio', { name: 'Left' })).toBeChecked()

    // Connect a new wall to two existing outer walls.
    await clickEntityRelativePosition(page, perimeterWalls.nth(0), { x: 0.55, y: 0.8 })
    await clickEntityRelativePosition(page, perimeterWalls.nth(2), { x: 0.55, y: 0.2 })
    await expect(intermediateWalls).toHaveCount(1)
    await takeEditorScreenshot(page, '01-outer-connected-wall.png')

    // Create a wall entirely inside the perimeter and complete it with Enter.
    const svgBox = await svg.boundingBox()
    if (!svgBox) throw new Error('Could not get editor SVG bounds')
    await svg.click({ position: { x: svgBox.width * 0.65, y: svgBox.height * 0.65 } })
    await svg.click({ position: { x: svgBox.width * 0.72, y: svgBox.height * 0.65 } })
    await pressKey(page, 'Enter')
    await expect(intermediateWalls).toHaveCount(2)
    await takeEditorScreenshot(page, '02-standalone-wall.png')

    // Start on an existing intermediate wall and finish on another one.
    await clickEntityRelativePosition(page, intermediateWalls.nth(0), { x: 0.5, y: 0.5 })
    await clickEntityRelativePosition(page, intermediateWalls.nth(1), { x: 0.5, y: 0.5 })
    // Snapping to existing walls may split either endpoint wall, so this can
    // add more than one SVG wall entity in addition to the new segment.
    await expect(intermediateWalls).toHaveCount(5)
    await takeEditorScreenshot(page, '03-intermediate-connected-wall.png')

    // An unfinished wall can be cancelled without adding another entity.
    await clickEntityRelativePosition(page, perimeterWalls.nth(1), { x: 0.5, y: 0.5 })
    await pressKey(page, 'Escape')
    await expect(intermediateWalls).toHaveCount(5)

    // Verify a changed tool parameter is accepted for a subsequent wall.
    await inspector.locator('#wall-thickness').fill('200')
    await inspector.locator('#wall-thickness').press('Enter')
    await inspector.getByRole('radio', { name: 'Right' }).click()
    await svg.click({ position: { x: svgBox.width * 0.65, y: svgBox.height * 0.25 } })
    await svg.click({ position: { x: svgBox.width * 0.72, y: svgBox.height * 0.25 } })
    await pressKey(page, 'Enter')
    await expect(intermediateWalls).toHaveCount(6)
    await expect(inspector.locator('#wall-thickness')).toHaveValue('200')
  })
})
