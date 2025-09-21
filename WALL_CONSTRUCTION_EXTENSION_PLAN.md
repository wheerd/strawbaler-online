# Wall Construction Extension Plan

## Overview

This document outlines a comprehensive plan to extend the wall construction system with configurable construction methods, plate systems, and wall layers. The extension will provide users with complete control over wall construction details while maintaining the existing system's strengths.

## Current Architecture Analysis

### Strengths

- ✅ Well-structured construction system with `PerimeterWallConstructionMethod<TConfig>`
- ✅ Flexible `ConstructionElement` system with typed materials
- ✅ Strong ID typing system ready for extension
- ✅ Zustand slices for state management
- ✅ Comprehensive measurement system

### Extension Points

- ✅ `ConstructionElementType` can be extended for plates and layers
- ✅ `Measurement` type system can be extended
- ✅ Model types can be extended without breaking changes
- ✅ Construction configs are already type-safe and extensible

## Proposed Architecture

### 1. WallConstructionMethod Entity Design

```typescript
// New ID types
export type WallConstructionMethodId = string & { readonly brand: unique symbol }
export type RingBeamConstructionMethodId = string & { readonly brand: unique symbol }

// Wall construction method entity
export interface WallConstructionMethod {
  id: WallConstructionMethodId
  name: string
  description?: string

  // Core wall construction
  constructionType: PerimeterConstructionType
  coreConfig: InfillConstructionConfig | StrawhengeConstructionConfig

  // Wall layers (applied to thickness)
  layers: WallLayer[]

  // Plate system
  topPlate?: PlateConfig
  bottomPlate?: PlateConfig

  // Metadata
  createdAt: Date
  updatedAt: Date
}

// Wall layer system
export interface WallLayer {
  id: string
  name: string
  material: MaterialId
  thickness: Length
  position: 'inside' | 'outside' | 'both' // Relative to wall
  type: 'plaster' | 'planking' | 'insulation' | 'vapor-barrier' | 'custom'
}

// Plate configuration
export interface PlateConfig {
  material: MaterialId
  height: Length
  width?: Length // If different from wall thickness
  offsetFromEdge?: Length // For stepped plates
}
```

### 2. RingBeamConstructionMethod Entity Design

```typescript
export interface RingBeamConstructionMethod {
  id: RingBeamConstructionMethodId
  name: string
  description?: string

  // Ring beam configuration
  material: MaterialId
  height: Length
  width?: Length // If different from wall thickness

  // Positioning
  position: 'top' | 'bottom' | 'both'
  offsetFromEdge?: Length

  // Connection details
  connectionType: 'continuous' | 'lapped' | 'bolted'
  anchorDetails?: AnchorConfig

  // Metadata
  createdAt: Date
  updatedAt: Date
}

export interface AnchorConfig {
  spacing: Length
  material: MaterialId
  diameter: Length
  embedmentDepth: Length
}
```

### 3. Model Extension Plan

**Extend `PerimeterWall`:**

```typescript
export interface PerimeterWall {
  // ... existing properties
  wallConstructionMethodId?: WallConstructionMethodId
}
```

**Extend `Perimeter`:**

```typescript
export interface Perimeter {
  // ... existing properties
  ringBeamConstructionMethodId?: RingBeamConstructionMethodId
}
```

### 4. New Model Slice: `constructionMethodsSlice.ts`

```typescript
export interface ConstructionMethodsState {
  wallConstructionMethods: Map<WallConstructionMethodId, WallConstructionMethod>
  ringBeamConstructionMethods: Map<RingBeamConstructionMethodId, RingBeamConstructionMethod>

  // Default method IDs for new entities
  defaultWallMethodId?: WallConstructionMethodId
  defaultRingBeamMethodId?: RingBeamConstructionMethodId
}

export interface ConstructionMethodsActions {
  // Wall construction methods
  addWallConstructionMethod: (
    method: Omit<WallConstructionMethod, 'id' | 'createdAt' | 'updatedAt'>
  ) => WallConstructionMethod
  updateWallConstructionMethod: (id: WallConstructionMethodId, updates: Partial<WallConstructionMethod>) => void
  removeWallConstructionMethod: (id: WallConstructionMethodId) => void
  duplicateWallConstructionMethod: (id: WallConstructionMethodId, newName: string) => WallConstructionMethod

  // Ring beam construction methods
  addRingBeamConstructionMethod: (
    method: Omit<RingBeamConstructionMethod, 'id' | 'createdAt' | 'updatedAt'>
  ) => RingBeamConstructionMethod
  updateRingBeamConstructionMethod: (
    id: RingBeamConstructionMethodId,
    updates: Partial<RingBeamConstructionMethod>
  ) => void
  removeRingBeamConstructionMethod: (id: RingBeamConstructionMethodId) => void

  // Assignment helpers
  assignWallConstructionMethod: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    methodId: WallConstructionMethodId
  ) => void
  assignRingBeamConstructionMethod: (perimeterId: PerimeterId, methodId: RingBeamConstructionMethodId) => void
}
```

## Construction System Integration

### 5. Enhanced Construction Plan

```typescript
export interface EnhancedWallConstructionPlan extends WallConstructionPlan {
  // Core wall (existing)
  coreConstruction: WallConstructionPlan

  // New additions
  topPlate?: PlateConstructionPlan
  bottomPlate?: PlateConstructionPlan
  layers: LayerConstructionPlan[]

  // Adjusted dimensions
  actualDimensions: {
    totalHeight: Length // Including plates
    coreHeight: Length // Excluding plates
    totalThickness: Length // Including layers
    coreThickness: Length // Excluding layers
  }
}

export interface PlateConstructionPlan {
  plateId: string
  elements: ConstructionElement[]
  measurements: Measurement[]
  position: 'top' | 'bottom'
  height: Length
}

export interface LayerConstructionPlan {
  layerId: string
  layer: WallLayer
  elements: ConstructionElement[]
  position: 'inside' | 'outside'
  thickness: Length
}
```

### 6. Extended Construction Elements

```typescript
// Add to ConstructionElementType
export type ConstructionElementType =
  | 'post'
  | 'plate'
  | 'full-strawbale'
  | 'partial-strawbale'
  | 'straw'
  | 'frame'
  | 'header'
  | 'sill'
  | 'opening'
  | 'infill'
  // New additions:
  | 'top-plate'
  | 'bottom-plate'
  | 'ring-beam'
  | 'plaster'
  | 'planking'
  | 'insulation'
  | 'vapor-barrier'
  | 'wall-layer'
```

### 7. Enhanced Measurements

```typescript
// Add to Measurement type
export type MeasurementType =
  | 'post-spacing'
  | 'opening-spacing'
  | 'opening-width'
  | 'sill-height'
  | 'header-height'
  | 'opening-height'
  // New additions:
  | 'plate-height'
  | 'core-height'
  | 'total-height'
  | 'layer-thickness'
  | 'core-thickness'
  | 'total-thickness'
  | 'ring-beam-dimensions'
```

## UI Configuration Design

### 8. Configuration Interfaces

**Wall Construction Method Editor:**

- Core construction type selector (infill/strawhenge)
- Core configuration panel
- Layer management (add/remove/reorder layers)
- Plate configuration (top/bottom plates)
- Preview with cross-section view

**Ring Beam Method Editor:**

- Material and dimension inputs
- Position and connection type selectors
- Anchor configuration
- Preview along perimeter

**Assignment Interface:**

- Wall-level construction method assignment
- Perimeter-level ring beam assignment
- Override capabilities
- Bulk assignment tools

## Implementation Strategy

### Phase 1: Foundation (High Priority)

**1. Model Extensions**

- Add new ID types and generators to `src/types/ids.ts`
- Extend `PerimeterWall` and `Perimeter` interfaces in `src/types/model.ts`
- Create new entity interfaces in `src/types/constructionMethods.ts`

**2. Construction Methods Slice**

- Implement `src/model/store/slices/constructionMethodsSlice.ts`
- Add CRUD operations for both method types
- Add assignment logic for walls and perimeters

### Phase 2: Construction System (High Priority)

**3. Enhanced Construction Engine**

- Extend `WallConstructionPlan` in `src/construction/base.ts`
- Implement plate construction logic in `src/construction/plates.ts`
- Implement layer construction logic in `src/construction/layers.ts`
- Update dimension calculations throughout system

**4. Measurement Extensions**

- Add new measurement types to `src/construction/measurements.ts`
- Update calculation functions for plates and layers
- Extend display system in components

### Phase 3: Integration (Medium Priority)

**5. Construction Method Integration**

- Update `constructInfillWall` to use method configuration
- Implement construction method resolution
- Add validation and error handling
- Create construction method factory functions

**6. UI Configuration**

- Construction method editor components
- Assignment interfaces in properties panel
- Preview systems for cross-sections
- Material and dimension input controls

### Phase 4: Polish (Low Priority)

**7. Advanced Features**

- Import/export construction methods
- Method templates and presets
- Advanced validation rules
- Performance optimizations
- Documentation and help system

## Key Benefits

✅ **User Configurability**: Complete control over wall construction details  
✅ **Modularity**: Reusable construction methods across projects  
✅ **Accuracy**: Proper height and thickness calculations including plates and layers  
✅ **Scalability**: Easy to add new layer types and construction methods  
✅ **Maintainability**: Clean separation of concerns between model and construction logic

## Implementation Notes

### Backward Compatibility

- Existing walls without `wallConstructionMethodId` should use default infill configuration
- Existing perimeters without `ringBeamConstructionMethodId` should have no ring beams
- All existing tests should continue to pass

### Performance Considerations

- Construction method resolution should be cached
- Layer and plate calculations should be optimized for real-time updates
- Large numbers of construction methods should be handled efficiently

### Validation Rules

- Plate heights must not exceed wall height
- Layer thicknesses must not exceed wall thickness
- Material assignments must be valid
- Construction method assignments must be compatible with wall construction types

### Testing Strategy

- Unit tests for all new construction functions
- Integration tests for enhanced construction plans
- UI tests for configuration interfaces
- Performance tests for complex construction scenarios

## Next Steps

1. **Review and Approve Plan**: Ensure all stakeholders agree on the approach
2. **Create Implementation Tasks**: Break down phases into specific development tasks
3. **Set Up Development Environment**: Prepare branches and testing setup
4. **Begin Phase 1**: Start with model extensions and construction methods slice
5. **Iterative Development**: Implement each phase with continuous testing and feedback

This plan provides a comprehensive roadmap for extending the wall construction system while maintaining the existing architecture's strengths and ensuring scalability for future enhancements.
