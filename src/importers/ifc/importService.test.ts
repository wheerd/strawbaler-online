import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import type { Storey } from '@/building/model/model'
import { clearPersistence, getModelActions } from '@/building/store'
import { importIfcIntoModel } from '@/importers/ifc/importService'

const IFC_SAMPLE_PATH = path.resolve(process.cwd(), 'src', 'test', 'strawbaler-export.ifc')

describe('IFC import service', () => {
  beforeEach(() => {
    const actions = getModelActions()
    clearPersistence()
    actions.reset()
  })

  afterEach(() => {
    const actions = getModelActions()
    actions.reset()
  })

  test('imports storeys and perimeters into the model store', async () => {
    expect(fs.existsSync(IFC_SAMPLE_PATH)).toBe(true)

    const fileBuffer = await readFile(IFC_SAMPLE_PATH)
    const result = await importIfcIntoModel(fileBuffer)
    expect(result.success).toBe(true)

    const actions = getModelActions()
    const storeys: Storey[] = actions.getStoreysOrderedByLevel()

    expect(storeys.length).toBeGreaterThan(0)

    const firstStorey = storeys[0]
    const perimeters = actions.getPerimetersByStorey(firstStorey.id)
    expect(perimeters.length).toBeGreaterThan(0)

    const perimeter = perimeters[0]
    expect(perimeter.walls.length).toBeGreaterThan(0)
    expect(perimeter.walls.some(wall => wall.thickness > 0)).toBe(true)

    const floorAreas = actions.getFloorAreasByStorey(firstStorey.id)
    expect(floorAreas.length).toBeGreaterThan(0)
  })
})
