import { mat4, vec3 } from 'gl-matrix'
import {
  IFC4,
  IFCAXIS2PLACEMENT3D,
  IFCBUILDINGSTOREY,
  IFCLOCALPLACEMENT,
  IFCSIUNIT,
  IFCUNITASSIGNMENT,
  IfcAPI,
  type IfcLineObject,
  type Vector
} from 'web-ifc'
import wasmUrl from 'web-ifc/web-ifc.wasm?url'

import type { ImportedStorey, ParsedIfcModel, RawIfcStorey } from '@/importers/ifc/types'
import { createIdentityMatrix } from '@/importers/ifc/utils'

interface CachedModelContext {
  readonly modelID: number
  readonly unitScale: number
}

type DisposableVector<T> = Vector<T> & { delete?: () => void }

export class IfcImporter {
  private readonly api = new IfcAPI()
  private initialised = false

  async importFromArrayBuffer(buffer: ArrayBuffer): Promise<ParsedIfcModel> {
    await this.ensureInitialised()

    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    const modelID = this.api.OpenModel(uint8)

    try {
      const context = this.buildContext(modelID)
      const storeys = this.extractStoreys(context).map<ImportedStorey>(raw => ({
        expressId: raw.expressId,
        guid: raw.guid,
        name: raw.name,
        elevation: raw.elevation,
        height: null,
        placement: raw.placement,
        walls: [],
        slabs: []
      }))

      return {
        unitScale: context.unitScale,
        storeys
      }
    } finally {
      this.api.CloseModel(modelID)
    }
  }

  private async ensureInitialised(): Promise<void> {
    if (this.initialised) return

    await this.api.Init((path: string, prefix: string) => {
      if (path.endsWith('.wasm')) {
        return wasmUrl
      }
      return prefix + path
    })

    this.initialised = true
  }

  private buildContext(modelID: number): CachedModelContext {
    const unitScale = this.extractModelLengthUnit(modelID)
    return { modelID, unitScale }
  }

  private extractStoreys(context: CachedModelContext): RawIfcStorey[] {
    const ids = this.api.GetLineIDsWithType(context.modelID, IFCBUILDINGSTOREY) as DisposableVector<number>
    const storeys: RawIfcStorey[] = []

    for (let i = 0; i < ids.size(); i++) {
      const expressId = ids.get(i)
      const storey = this.api.GetLine(context.modelID, expressId) as IFC4.IfcBuildingStorey

      const guid = this.getStringValue(storey.GlobalId)
      const name = this.getStringValue(storey.Name)

      const elevationRaw = this.getNumberValue(storey.Elevation)
      const elevation = elevationRaw * context.unitScale

      const placement = this.resolveObjectPlacement(context, storey)

      storeys.push({
        expressId,
        guid,
        name,
        elevation,
        placement
      })
    }

    storeys.sort((a, b) => a.elevation - b.elevation)
    this.disposeVector(ids)
    return storeys
  }

  private extractModelLengthUnit(modelID: number): number {
    const assignments = this.api.GetLineIDsWithType(modelID, IFCUNITASSIGNMENT) as DisposableVector<number>
    try {
      if (assignments.size() === 0) {
        return 1
      }

      const assignment = this.api.GetLine(modelID, assignments.get(0)) as IFC4.IfcUnitAssignment
      const context: CachedModelContext = { modelID, unitScale: 1 }

      for (const unitRef of assignment.Units ?? []) {
        const unitLine = this.dereferenceLine(context, unitRef)
        if (!this.isSiUnit(unitLine)) continue

        if (this.enumEquals(unitLine.UnitType, IFC4.IfcUnitEnum.LENGTHUNIT)) {
          return this.computeSiPrefixScale(unitLine.Prefix, unitLine.Name)
        }
      }
    } finally {
      this.disposeVector(assignments)
    }

    return 1
  }

  private computeSiPrefixScale(prefix: unknown, name: unknown): number {
    const metreScale = 1000

    if (this.enumEquals(prefix, IFC4.IfcSIPrefix.MILLI)) {
      return 1
    }

    if (this.enumEquals(name, IFC4.IfcSIUnitName.METRE)) {
      return metreScale
    }

    return metreScale
  }

  private resolveObjectPlacement(context: CachedModelContext, product: IFC4.IfcProduct): mat4 {
    const placementReference = product.ObjectPlacement ?? null
    if (placementReference == null) {
      return createIdentityMatrix()
    }

    return this.resolvePlacementRecursive(context, placementReference)
  }

  private resolvePlacementRecursive(context: CachedModelContext, reference: unknown): mat4 {
    const placement = this.dereferenceLine(context, reference)
    if (!this.isLocalPlacement(placement)) {
      return createIdentityMatrix()
    }

    const relativeReference = placement.RelativePlacement ?? null
    const parentReference = placement.PlacementRelTo ?? null

    const relativeMatrix =
      relativeReference != null ? this.resolveAxis2Placement3D(context, relativeReference) : createIdentityMatrix()
    const parentMatrix =
      parentReference != null ? this.resolvePlacementRecursive(context, parentReference) : createIdentityMatrix()

    return mat4.mul(mat4.create(), parentMatrix, relativeMatrix)
  }

  private resolveAxis2Placement3D(context: CachedModelContext, reference: unknown): mat4 {
    const placement = this.dereferenceLine(context, reference)
    if (!this.isAxis2Placement3D(placement)) {
      return createIdentityMatrix()
    }

    const matrix = mat4.create()
    mat4.identity(matrix)

    const location = this.getPoint3(context, placement.Location)
    const axis = this.getDirection3(context, placement.Axis) ?? vec3.fromValues(0, 0, 1)
    const refDirection = this.getDirection3(context, placement.RefDirection) ?? vec3.fromValues(1, 0, 0)

    const localX = vec3.normalize(vec3.create(), refDirection)
    const localZ = vec3.normalize(vec3.create(), axis)
    const localY = vec3.cross(vec3.create(), localZ, localX)
    vec3.normalize(localY, localY)

    matrix[0] = localX[0]
    matrix[1] = localX[1]
    matrix[2] = localX[2]

    matrix[4] = localY[0]
    matrix[5] = localY[1]
    matrix[6] = localY[2]

    matrix[8] = localZ[0]
    matrix[9] = localZ[1]
    matrix[10] = localZ[2]

    matrix[12] = location[0]
    matrix[13] = location[1]
    matrix[14] = location[2]

    return matrix
  }

  private getPoint3(context: CachedModelContext, reference: unknown): vec3 {
    const pointLine = this.dereferenceLine(context, reference)
    if (!this.isCartesianPoint(pointLine)) {
      return vec3.fromValues(0, 0, 0)
    }

    const coords = pointLine.Coordinates ?? []
    return vec3.fromValues(
      this.getNumberValue(coords[0]) * context.unitScale,
      this.getNumberValue(coords[1]) * context.unitScale,
      this.getNumberValue(coords[2] ?? 0) * context.unitScale
    )
  }

  private getDirection3(context: CachedModelContext, reference: unknown): vec3 | null {
    const directionLine = this.dereferenceLine(context, reference)
    if (!this.isDirection(directionLine)) {
      return null
    }

    const ratios = directionLine.DirectionRatios ?? []
    return vec3.fromValues(
      this.getNumberValue(ratios[0]),
      this.getNumberValue(ratios[1]),
      this.getNumberValue(ratios[2] ?? 0)
    )
  }

  private getStringValue(value: unknown): string | null {
    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'object' && value != null && 'value' in value) {
      const raw = (value as { value: unknown }).value
      if (typeof raw === 'string') {
        return raw
      }
    }

    return null
  }

  private getNumberValue(value: unknown): number {
    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'object' && value != null && 'value' in value) {
      const raw = (value as { value: unknown }).value
      if (typeof raw === 'number') {
        return raw
      }
      if (typeof raw === 'string') {
        const parsed = Number(raw)
        return Number.isFinite(parsed) ? parsed : 0
      }
    }

    return 0
  }

  private disposeVector<T>(vector: DisposableVector<T> | null | undefined): void {
    if (vector && typeof vector.delete === 'function') {
      vector.delete()
    }
  }

  private dereferenceLine(context: CachedModelContext, reference: unknown): IfcLineObject | null {
    if (this.isLineObject(reference)) {
      return reference
    }

    const expressId = this.getExpressId(reference)
    if (expressId != null) {
      return this.api.GetLine(context.modelID, expressId) as IfcLineObject
    }

    return null
  }

  private isLineObject(value: unknown): value is IfcLineObject {
    return (
      typeof value === 'object' &&
      value != null &&
      'expressID' in value &&
      typeof (value as { expressID: unknown }).expressID === 'number'
    )
  }

  private getExpressId(reference: unknown): number | null {
    if (typeof reference === 'number') {
      return reference
    }

    if (typeof reference === 'object' && reference != null) {
      if ('value' in reference && typeof (reference as { value: unknown }).value === 'number') {
        return (reference as { value: number }).value
      }

      if ('ExpressID' in reference && typeof (reference as { ExpressID: unknown }).ExpressID === 'number') {
        return (reference as { ExpressID: number }).ExpressID
      }
    }

    return null
  }

  private enumEquals(value: unknown, expected: unknown): boolean {
    const actualValue = this.extractEnumValue(value)
    const expectedValue = this.extractEnumValue(expected)
    return actualValue != null && actualValue === expectedValue
  }

  private extractEnumValue(value: unknown): string | number | null {
    if (value == null) {
      return null
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return value
    }

    if (typeof value === 'object' && 'value' in value) {
      const raw = (value as { value: unknown }).value
      if (typeof raw === 'string' || typeof raw === 'number') {
        return raw
      }
    }

    return null
  }

  private isLocalPlacement(value: IfcLineObject | null): value is IFC4.IfcLocalPlacement {
    return value != null && value.type === IFCLOCALPLACEMENT
  }

  private isAxis2Placement3D(value: IfcLineObject | null): value is IFC4.IfcAxis2Placement3D {
    return value != null && value.type === IFCAXIS2PLACEMENT3D
  }

  private isCartesianPoint(value: IfcLineObject | null): value is IFC4.IfcCartesianPoint {
    return value != null && Array.isArray((value as IFC4.IfcCartesianPoint).Coordinates)
  }

  private isDirection(value: IfcLineObject | null): value is IFC4.IfcDirection {
    return value != null && Array.isArray((value as IFC4.IfcDirection).DirectionRatios)
  }

  private isSiUnit(value: IfcLineObject | null): value is IFC4.IfcSIUnit {
    return value != null && value.type === IFCSIUNIT
  }
}
