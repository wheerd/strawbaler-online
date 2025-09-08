# Strawbale Construction System Implementation Plan

## Project Overview

This document outlines the complete implementation plan for integrating a strawbale construction planning system into the existing floor plan editor. The system will support infill and strawhenge construction methods with full opening integration and plan-view visualization.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Integration](#data-integration)
3. [Construction Engine](#construction-engine)
4. [Visualization System](#visualization-system)
5. [UI Integration](#ui-integration)
6. [Implementation Phases](#implementation-phases)
7. [File Structure](#file-structure)
8. [Configuration System](#configuration-system)
9. [Testing Strategy](#testing-strategy)
10. [Future Enhancements](#future-enhancements)

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Strawbale Construction System            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Construction    │  │ Wall Segmentation│  │ Opening     │ │
│  │ Engine          │  │ Engine           │  │ Factory     │ │
│  │                 │  │                  │  │ System      │ │
│  │ - InfillFactory │  │ - Split walls at │  │ - Frame     │ │
│  │ - StrawhengeF.  │  │   opening points │  │ - Box       │ │
│  │ - ConfigMgr     │  │ - Calculate gaps │  │ - Custom    │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Plan View       │  │ Data Integration │  │ UI          │ │
│  │ Renderer        │  │ Layer            │  │ Components  │ │
│  │                 │  │                  │  │             │ │
│  │ - SVG Generator │  │ - OuterWallSeg.  │  │ - Inspector │ │
│  │ - Material      │  │ - Opening        │  │ - Toolbar   │ │
│  │   Colors        │  │ - Floor Height   │  │ - Preview   │ │
│  └─────────────────┘  └──────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Zero Data Conversion**: Leverage existing `OuterWallSegment` and `Opening` structures directly
2. **Incremental Enhancement**: Add construction features without breaking existing functionality
3. **Modular Design**: Construction engine separate from visualization and UI
4. **Configuration Driven**: All construction parameters externally configurable
5. **Plan-View Focus**: Top-down visualization optimized for floor plan editing

## Data Integration

### Existing Data Structures (Perfect Compatibility)

#### OuterWallSegment Integration

```typescript
// Existing structure - no changes needed
interface OuterWallSegment {
  id: WallSegmentId // ✅ Unique identification
  thickness: Length // ✅ Wall thickness for construction
  constructionType: OuterWallConstructionType // ✅ 'infill' | 'strawhenge'
  openings: Opening[] // ✅ Opening data for processing

  // Computed geometry - perfect for construction
  segmentLength: Length // ✅ Length for post/module calculations
  insideLine: LineSegment2D // ✅ Interior wall positioning
  outsideLine: LineSegment2D // ✅ Exterior wall positioning
  direction: Vec2 // ✅ Wall direction vector
  outsideDirection: Vec2 // ✅ Wall normal vector
}
```

#### Opening Integration

```typescript
// Existing structure - direct compatibility
interface Opening {
  id: OpeningId // ✅ Unique identification
  type: OpeningType // ✅ 'door' | 'window' | 'passage'
  offsetFromStart: Length // ✅ Position along wall (strawbaler: OffsetInWall)
  width: Length // ✅ Opening width
  height: Length // ✅ Opening height
  sillHeight?: Length // ✅ Window sill height (strawbaler: Bottom)
}
```

### New Construction Data Structures

#### Construction Plan Output

```typescript
interface WallConstructionPlan {
  wallSegmentId: WallSegmentId
  constructionType: 'infill' | 'strawhenge'
  wallDimensions: {
    length: Length
    thickness: Length
    height: Length
  }

  // Wall segments between openings
  wallSegments: ConstructionSegment[]

  // Opening constructions
  openingConstructions: OpeningConstruction[]

  // Material summary
  materialSummary: MaterialSummary
}

interface ConstructionSegment {
  id: string
  type: 'wall'
  startPosition: Length // Along wall from start
  endPosition: Length // Along wall from start
  constructionType: 'infill' | 'strawhenge'
  elements: ConstructionElement[]
}

interface OpeningConstruction {
  id: string
  openingId: OpeningId
  type: 'opening'
  position: Length // Along wall from start
  width: Length
  frameType: 'frame' | 'box'
  elements: ConstructionElement[]
}

interface ConstructionElement {
  id: string
  type: 'post' | 'module' | 'straw' | 'frame' | 'header' | 'sill'
  material: 'wood' | 'straw' | 'door' | 'window'

  // Position along wall
  startPosition: Length
  endPosition: Length

  // Position across wall thickness
  insideOffset: Length // Distance from inside face
  thickness: Length // Element thickness

  // Dimensions for rendering
  planViewBounds: {
    start: Vec2
    end: Vec2
    width: Length
  }
}
```

## Construction Engine

### Core Engine Interface

```typescript
interface WallConstructionEngine {
  // Main construction method
  constructWall(
    segment: OuterWallSegment,
    floorHeight: Length,
    config: WallConstructionConfig
  ): WallConstructionPlan

  // Wall segmentation (splits at openings)
  private segmentWallAroundOpenings(
    segment: OuterWallSegment,
    config: WallConstructionConfig
  ): WallSegmentPart[]

  // Construction methods
  private constructInfillSegment(
    segmentPart: WallSegmentPart,
    config: InfillConfig
  ): ConstructionElement[]

  private constructStrawhengeSegment(
    segmentPart: WallSegmentPart,
    config: StrawhengeConfig
  ): ConstructionElement[]

  // Opening construction
  private constructOpening(
    opening: Opening,
    wallThickness: Length,
    wallHeight: Length,
    config: OpeningConfig
  ): OpeningConstruction
}
```

### Construction Algorithms

#### Wall Segmentation Algorithm

```typescript
// Split wall at openings, accounting for frame padding
function segmentWallAroundOpenings(segment: OuterWallSegment, config: WallConstructionConfig): WallSegmentPart[] {
  const parts: WallSegmentPart[] = []
  let currentPosition: Length = 0

  // Sort openings by position
  const sortedOpenings = segment.openings.sort((a, b) => a.offsetFromStart - b.offsetFromStart)

  for (const opening of sortedOpenings) {
    const openingConfig = getOpeningConfig(opening.type, config)
    const framePadding = openingConfig.additionalPadding

    const openingStart = opening.offsetFromStart - framePadding
    const openingEnd = opening.offsetFromStart + opening.width + framePadding

    // Add wall segment before opening (if space exists)
    if (openingStart > currentPosition) {
      parts.push({
        type: 'wall',
        startPosition: currentPosition,
        endPosition: openingStart,
        constructionType: segment.constructionType
      })
    }

    // Add opening segment
    parts.push({
      type: 'opening',
      startPosition: opening.offsetFromStart,
      endPosition: opening.offsetFromStart + opening.width,
      opening: opening,
      framePadding: framePadding
    })

    currentPosition = openingEnd
  }

  // Add final wall segment (if space exists)
  if (currentPosition < segment.segmentLength) {
    parts.push({
      type: 'wall',
      startPosition: currentPosition,
      endPosition: segment.segmentLength,
      constructionType: segment.constructionType
    })
  }

  return parts
}
```

#### Infill Construction Algorithm

```typescript
// Recursive infill construction - alternates posts and straw
function constructInfillSegment(
  segment: WallSegmentPart,
  config: InfillConfig,
  startAtEnd: boolean = false
): ConstructionElement[] {
  const elements: ConstructionElement[] = []
  const availableLength = segment.endPosition - segment.startPosition

  if (availableLength <= 0) return elements
  if (availableLength < config.minStrawSpace) {
    // Too small for construction - mark as error
    return [createErrorElement(segment)]
  }

  // Calculate straw section width
  const strawWidth = calculateStrawWidth(availableLength, config)

  // Position straw section
  const strawStart = startAtEnd ? segment.endPosition - strawWidth : segment.startPosition

  const strawElement: ConstructionElement = {
    id: generateId(),
    type: 'straw',
    material: 'straw',
    startPosition: strawStart,
    endPosition: strawStart + strawWidth,
    insideOffset: 0,
    thickness: segment.wallThickness,
    planViewBounds: calculatePlanViewBounds(strawStart, strawWidth, segment)
  }

  elements.push(strawElement)

  // Add post if space allows
  if (strawWidth + config.postThickness <= availableLength) {
    const postStart = startAtEnd ? strawStart - config.postThickness : strawStart + strawWidth

    const postElement: ConstructionElement = {
      id: generateId(),
      type: 'post',
      material: 'wood',
      startPosition: postStart,
      endPosition: postStart + config.postThickness,
      insideOffset: 0,
      thickness: segment.wallThickness,
      planViewBounds: calculatePlanViewBounds(postStart, config.postThickness, segment)
    }

    elements.push(postElement)

    // Recursively construct remaining space
    const remainingSegment = createRemainingSegment(segment, postElement, startAtEnd)
    const remainingElements = constructInfillSegment(remainingSegment, config, !startAtEnd)
    elements.push(...remainingElements)
  }

  return elements
}
```

#### Strawhenge Construction Algorithm

```typescript
// Strawhenge construction - modules where possible, fallback to infill
function constructStrawhengeSegment(segment: WallSegmentPart, config: StrawhengeConfig): ConstructionElement[] {
  const elements: ConstructionElement[] = []
  const availableLength = segment.endPosition - segment.startPosition

  // Check if module fits
  if (availableLength < config.moduleWidth) {
    // Fallback to infill construction
    return constructInfillSegment(segment, config.infillConfig)
  }

  if (availableLength === config.moduleWidth) {
    // Perfect module fit
    return [createModuleElement(segment, config)]
  }

  // Place module + remaining construction
  const moduleElement = createModuleElement(
    {
      ...segment,
      endPosition: segment.startPosition + config.moduleWidth
    },
    config
  )

  elements.push(moduleElement)

  // Construct remaining space
  const remainingSegment = {
    ...segment,
    startPosition: segment.startPosition + config.moduleWidth
  }

  const remainingElements = constructStrawhengeSegment(remainingSegment, config)
  elements.push(...remainingElements)

  return elements
}
```

### Opening Construction Factories

#### Frame Opening Factory

```typescript
class FrameOpeningFactory implements OpeningFactory {
  createOpening(
    opening: Opening,
    wallThickness: Length,
    wallHeight: Length,
    config: FrameOpeningConfig
  ): OpeningConstruction {
    const elements: ConstructionElement[] = []

    // Side frames (visible in plan view)
    const leftFrameElement: ConstructionElement = {
      id: generateId(),
      type: 'frame',
      material: 'wood',
      startPosition: opening.offsetFromStart - config.framePadding,
      endPosition: opening.offsetFromStart,
      insideOffset: 0,
      thickness: wallThickness,
      planViewBounds: calculateFrameBounds('left', opening, config)
    }

    const rightFrameElement: ConstructionElement = {
      id: generateId(),
      type: 'frame',
      material: 'wood',
      startPosition: opening.offsetFromStart + opening.width,
      endPosition: opening.offsetFromStart + opening.width + config.framePadding,
      insideOffset: 0,
      thickness: wallThickness,
      planViewBounds: calculateFrameBounds('right', opening, config)
    }

    // Door/window filling (center of opening)
    const fillingElement: ConstructionElement = {
      id: generateId(),
      type: opening.type,
      material: opening.type, // 'door' | 'window'
      startPosition: opening.offsetFromStart,
      endPosition: opening.offsetFromStart + opening.width,
      insideOffset: (wallThickness - config.fillingThickness) / 2,
      thickness: config.fillingThickness,
      planViewBounds: calculateFillingBounds(opening, config)
    }

    elements.push(leftFrameElement, rightFrameElement, fillingElement)

    return {
      id: generateId(),
      openingId: opening.id,
      type: 'opening',
      position: opening.offsetFromStart,
      width: opening.width + 2 * config.framePadding,
      frameType: 'frame',
      elements: elements
    }
  }
}
```

## Visualization System

### Plan-View SVG Renderer

```typescript
class WallConstructionRenderer {
  renderConstructionPlan(plan: WallConstructionPlan, options: RenderOptions): SVGElement {
    const svg = createSVGElement('g')
    svg.setAttribute('class', 'wall-construction')

    // Render wall outline
    if (options.showWallOutline) {
      svg.appendChild(this.renderWallOutline(plan.wallDimensions))
    }

    // Render construction segments
    for (const segment of plan.wallSegments) {
      svg.appendChild(this.renderConstructionSegment(segment, options))
    }

    // Render opening constructions
    for (const opening of plan.openingConstructions) {
      svg.appendChild(this.renderOpeningConstruction(opening, options))
    }

    // Render annotations
    if (options.showAnnotations) {
      svg.appendChild(this.renderConstructionAnnotations(plan))
    }

    return svg
  }

  private renderConstructionSegment(segment: ConstructionSegment, options: RenderOptions): SVGElement {
    const segmentGroup = createSVGElement('g')
    segmentGroup.setAttribute('class', `construction-segment-${segment.constructionType}`)

    for (const element of segment.elements) {
      const elementSVG = this.renderConstructionElement(element, options)
      segmentGroup.appendChild(elementSVG)
    }

    return segmentGroup
  }

  private renderConstructionElement(element: ConstructionElement, options: RenderOptions): SVGElement {
    const bounds = element.planViewBounds
    const rect = createSVGElement('rect')

    rect.setAttribute('x', bounds.start[0].toString())
    rect.setAttribute('y', bounds.start[1].toString())
    rect.setAttribute('width', bounds.width.toString())
    rect.setAttribute('height', (bounds.end[1] - bounds.start[1]).toString())

    // Apply material-based styling
    const style = this.getElementStyle(element.type, element.material, options)
    rect.setAttribute('style', style)

    // Add element metadata for interaction
    rect.setAttribute('data-element-id', element.id)
    rect.setAttribute('data-element-type', element.type)
    rect.setAttribute('data-material', element.material)

    return rect
  }

  private getElementStyle(type: string, material: string, options: RenderOptions): string {
    const colors = options.materialColors
    const fillColor = colors[material] || colors.default
    const strokeColor = options.showElementBorders ? '#000000' : 'none'
    const strokeWidth = options.showElementBorders ? '1' : '0'

    return [
      `fill: ${fillColor}`,
      `stroke: ${strokeColor}`,
      `stroke-width: ${strokeWidth}`,
      `opacity: ${options.materialOpacity}`
    ].join('; ')
  }
}
```

### Material Color Scheme

```typescript
const CONSTRUCTION_COLORS = {
  // Wood elements
  wood: '#8B4513', // Saddle brown for posts, modules, frames

  // Straw elements
  straw: '#F4A460', // Sandy brown for straw filling
  fullStrawbale: '#DEB887', // Burlywood for full strawbales
  partialStrawbale: '#D2B48C', // Tan for partial strawbales
  stuffedStraw: '#F5DEB3', // Wheat for loose straw

  // Opening elements
  door: '#654321', // Dark brown for door representation
  window: '#87CEEB', // Sky blue for window representation
  passage: '#A0A0A0', // Gray for passage openings

  // Construction elements
  frame: '#8B4513', // Same as wood for consistency
  header: '#654321', // Darker brown for structural headers
  sill: '#654321', // Darker brown for structural sills

  // Utility colors
  wallOutline: '#000000', // Black for wall boundaries
  error: '#FF6B6B', // Red for construction errors
  default: '#CCCCCC' // Gray fallback color
}
```

## UI Integration

### Properties Panel Extensions

#### Wall Construction Inspector

```typescript
interface WallConstructionInspectorProps {
  segment: OuterWallSegment
  floorHeight: Length
  constructionConfig: WallConstructionConfig
  onConstructionConfigChange: (config: WallConstructionConfig) => void
}

// Add to existing OuterWallInspector component
const WallConstructionSection = ({ segment, ...props }: WallConstructionInspectorProps) => {
  return (
    <div className="construction-section">
      <h3>Construction Details</h3>

      {/* Construction Type Selector */}
      <ConstructionTypeSelector
        value={segment.constructionType}
        onChange={(type) => updateConstructionType(segment.id, type)}
      />

      {/* Construction Parameters */}
      {segment.constructionType === 'infill' && (
        <InfillParametersPanel
          config={props.constructionConfig.infill}
          onChange={props.onConstructionConfigChange}
        />
      )}

      {segment.constructionType === 'strawhenge' && (
        <StrawhengeParametersPanel
          config={props.constructionConfig.strawhenge}
          onChange={props.onConstructionConfigChange}
        />
      )}

      {/* Construction Summary */}
      <ConstructionSummary segment={segment} floorHeight={props.floorHeight} />

      {/* Construction Visualization Toggle */}
      <ConstructionVisualizationToggle />
    </div>
  )
}
```

#### Opening Construction Inspector

```typescript
interface OpeningConstructionInspectorProps {
  opening: Opening
  wallSegment: OuterWallSegment
  openingConfig: OpeningConfig
  onOpeningConfigChange: (config: OpeningConfig) => void
}

const OpeningConstructionSection = ({ opening, ...props }: OpeningConstructionInspectorProps) => {
  return (
    <div className="opening-construction-section">
      <h3>Opening Construction</h3>

      {/* Frame Type Selector */}
      <FrameTypeSelector
        value={props.openingConfig.frameType}
        onChange={(type) => updateFrameType(opening.id, type)}
      />

      {/* Frame Parameters */}
      <FrameParametersPanel
        config={props.openingConfig}
        onChange={props.onOpeningConfigChange}
      />

      {/* Opening Construction Preview */}
      <OpeningConstructionPreview
        opening={opening}
        config={props.openingConfig}
      />
    </div>
  )
}
```

### Canvas Integration

#### Construction Detail Toggle

```typescript
// Add to MainToolbar component
const ConstructionToggleButton = () => {
  const [showConstruction, setShowConstruction] = useConstructionVisibility()

  return (
    <ToolbarButton
      icon={<ConstructionIcon />}
      active={showConstruction}
      onClick={() => setShowConstruction(!showConstruction)}
      tooltip="Show/hide construction details"
    />
  )
}
```

#### Construction Layer Rendering

```typescript
// Extend existing FloorPlanStage component
const ConstructionLayer = ({ walls, showConstruction }: ConstructionLayerProps) => {
  const constructionRenderer = useConstructionRenderer()

  if (!showConstruction) return null

  return (
    <Group name="construction-layer">
      {walls.map(wall =>
        wall.segments.map(segment => {
          if (!shouldShowConstruction(segment.constructionType)) return null

          return (
            <Group key={segment.id} name={`construction-${segment.id}`}>
              <ConstructionSegmentShape
                segment={segment}
                renderer={constructionRenderer}
              />
            </Group>
          )
        })
      )}
    </Group>
  )
}
```

## Implementation Phases

### Phase 1: Core Construction Engine (Weeks 1-2)

**Deliverables:**

- [ ] Basic construction type definitions
- [ ] Wall segmentation algorithm implementation
- [ ] Infill construction algorithm
- [ ] Strawhenge construction algorithm
- [ ] Opening frame factory (basic)
- [ ] Construction plan data structures
- [ ] Unit tests for construction algorithms

**Files:**

- `src/construction/types.ts`
- `src/construction/WallConstructionEngine.ts`
- `src/construction/InfillConstructionFactory.ts`
- `src/construction/StrawhengeConstructionFactory.ts`
- `src/construction/OpeningFrameFactory.ts`
- `src/construction/__tests__/`

### Phase 2: Plan-View Visualization (Weeks 3-4)

**Deliverables:**

- [ ] SVG construction renderer
- [ ] Material color system
- [ ] Plan-view bounds calculations
- [ ] Construction element styling
- [ ] Basic canvas integration
- [ ] Construction detail toggle

**Files:**

- `src/construction/visualization/WallConstructionRenderer.ts`
- `src/construction/visualization/ConstructionColors.ts`
- `src/construction/visualization/PlanViewCalculations.ts`
- `src/components/FloorPlanEditor/Canvas/ConstructionLayer.tsx`

### Phase 3: UI Integration (Weeks 5-6)

**Deliverables:**

- [ ] Wall construction inspector panel
- [ ] Opening construction options
- [ ] Construction parameter controls
- [ ] Construction summary display
- [ ] Toolbar construction toggle
- [ ] Construction visualization settings

**Files:**

- `src/components/FloorPlanEditor/Tools/PropertiesPanel/Inspectors/WallConstructionInspector.tsx`
- `src/components/FloorPlanEditor/Tools/PropertiesPanel/Inspectors/OpeningConstructionInspector.tsx`
- `src/components/FloorPlanEditor/Tools/Toolbar/ConstructionToggle.tsx`

### Phase 4: Configuration & Polish (Week 7)

**Deliverables:**

- [ ] Construction configuration system
- [ ] Default construction presets
- [ ] Construction validation rules
- [ ] Error handling and user feedback
- [ ] Performance optimizations
- [ ] Documentation updates

**Files:**

- `src/construction/config/WallConstructionConfig.ts`
- `src/construction/config/DefaultConfigs.ts`
- `src/construction/validation/ConstructionValidator.ts`

## File Structure

```
src/
├── construction/                           # New construction system
│   ├── types.ts                           # Core construction type definitions
│   ├── WallConstructionEngine.ts          # Main construction engine
│   ├── factories/                         # Construction method factories
│   │   ├── InfillConstructionFactory.ts   # Infill construction logic
│   │   ├── StrawhengeConstructionFactory.ts # Strawhenge construction logic
│   │   └── OpeningFrameFactory.ts         # Opening construction logic
│   ├── visualization/                     # Plan-view rendering
│   │   ├── WallConstructionRenderer.ts    # SVG construction renderer
│   │   ├── ConstructionColors.ts          # Material color definitions
│   │   └── PlanViewCalculations.ts        # Bounds/positioning calculations
│   ├── config/                           # Configuration system
│   │   ├── WallConstructionConfig.ts      # Configuration interfaces
│   │   └── DefaultConfigs.ts              # Default configuration presets
│   ├── validation/                       # Construction validation
│   │   └── ConstructionValidator.ts       # Validation rules and checks
│   └── __tests__/                        # Construction system tests
│       ├── WallConstructionEngine.test.ts
│       ├── InfillConstruction.test.ts
│       └── StrawhengeConstruction.test.ts
├── components/FloorPlanEditor/
│   ├── Canvas/
│   │   └── ConstructionLayer.tsx          # Construction visualization layer
│   └── Tools/PropertiesPanel/Inspectors/
│       ├── WallConstructionInspector.tsx  # Wall construction properties
│       └── OpeningConstructionInspector.tsx # Opening construction properties
└── hooks/
    └── useConstructionSystem.ts           # Construction system hooks
```

## Configuration System

### Construction Configuration Interface

```typescript
interface WallConstructionConfig {
  // Global settings
  showConstructionDetails: boolean
  materialOpacity: number
  showElementBorders: boolean
  showAnnotations: boolean

  // Infill construction parameters
  infill: {
    postThickness: Length // Default: 60mm
    maxPostSpacing: Length // Default: 800mm
    minStrawSpace: Length // Default: 70mm
    postType: 'full' | 'double' // Default: 'full'
    postMaterial: 'wood'
    strawMaterial: 'straw'
  }

  // Strawhenge construction parameters
  strawhenge: {
    moduleWidth: Length // Default: 920mm
    frameThickness: Length // Default: 60mm
    moduleType: 'full' | 'double' // Default: 'full'
    frameMaterial: 'wood'
    infillFallback: InfillConfig // Fallback for small spaces
  }

  // Opening construction parameters
  openings: {
    door: OpeningFrameConfig
    window: OpeningFrameConfig
    passage: OpeningFrameConfig
  }

  // Material colors
  materialColors: ConstructionColorScheme
}

interface OpeningFrameConfig {
  frameType: 'frame' | 'box' // Default: 'frame'
  framePadding: Length // Default: 15mm
  frameThickness: Length // Default: 60mm
  fillingThickness: Length // Default: 30mm
  additionalPadding: Length // Space needed around opening
  frameMaterial: 'wood'
  fillingMaterial: 'door' | 'window' | 'passage'
}
```

### Default Configuration Presets

```typescript
export const DEFAULT_CONSTRUCTION_CONFIGS = {
  // Standard infill construction (most common)
  standardInfill: {
    infill: {
      postThickness: createLength(60), // 60mm posts
      maxPostSpacing: createLength(800), // Max 800mm between posts
      minStrawSpace: createLength(70), // Min 70mm straw space
      postType: 'full' as const,
      postMaterial: 'wood' as const,
      strawMaterial: 'straw' as const
    }
    // ... other settings
  },

  // Heavy-duty infill (closer post spacing)
  heavyDutyInfill: {
    infill: {
      postThickness: createLength(80), // Thicker posts
      maxPostSpacing: createLength(600), // Closer spacing
      minStrawSpace: createLength(70),
      postType: 'double' as const, // Double posts
      postMaterial: 'wood' as const,
      strawMaterial: 'straw' as const
    }
    // ... other settings
  },

  // Standard strawhenge construction
  standardStrawhenge: {
    strawhenge: {
      moduleWidth: createLength(920), // Standard 920mm modules
      frameThickness: createLength(60), // 60mm frame thickness
      moduleType: 'full' as const,
      frameMaterial: 'wood' as const,
      // Fallback to infill for small spaces
      infillFallback: {
        postThickness: createLength(60),
        maxPostSpacing: createLength(800),
        minStrawSpace: createLength(70),
        postType: 'full' as const
      }
    }
    // ... other settings
  }
}
```

## Testing Strategy

### Unit Tests

- **Construction Engine Tests**: Algorithm correctness, edge cases
- **Wall Segmentation Tests**: Opening placement, overlap handling
- **Construction Factory Tests**: Element placement, material assignment
- **Visualization Tests**: SVG generation, bounds calculations

### Integration Tests

- **Data Integration Tests**: OuterWallSegment processing, Opening handling
- **UI Integration Tests**: Properties panel updates, canvas rendering
- **Configuration Tests**: Config validation, preset loading

### Performance Tests

- **Construction Generation**: Large walls, many openings
- **Rendering Performance**: Complex constructions, multiple walls
- **Memory Usage**: Construction plan storage, cleanup

### User Acceptance Tests

- **Construction Accuracy**: Manual verification against construction rules
- **UI Usability**: Construction parameter adjustment, visualization clarity
- **Real-world Scenarios**: Typical building layouts, complex opening arrangements

## Future Enhancements

### Phase 2 Features (Future)

- **3D Visualization**: Side-view construction details
- **Construction Export**: PDF/DXF export with construction details
- **Material Calculations**: Timber lists, straw volume calculations
- **Construction Validation**: Structural integrity warnings
- **Advanced Opening Types**: Custom opening configurations
- **Construction Scheduling**: Build sequence optimization

### Advanced Features (Long-term)

- **Multi-floor Construction**: Column alignment, load paths
- **Corner Construction**: Advanced corner detail resolution
- **MEP Integration**: Electrical/plumbing routing through construction
- **Sustainability Analysis**: Embodied carbon calculations
- **Cost Estimation**: Material and labor cost calculations
- **Construction Documentation**: Automated detail drawings

## Success Criteria

### Technical Success Metrics

- [ ] All existing OuterWallSegment data processes correctly
- [ ] Construction algorithms handle all edge cases without errors
- [ ] Plan-view visualization renders accurately and performantly
- [ ] UI integration maintains existing functionality
- [ ] Configuration system allows full construction customization

### User Experience Success Metrics

- [ ] Construction details enhance floor plan understanding
- [ ] Construction parameter adjustment is intuitive
- [ ] Construction visualization improves design decision making
- [ ] System performance remains responsive with construction details enabled
- [ ] Construction accuracy matches real-world building practices

### Business Success Metrics

- [ ] Feature increases user engagement with floor plan editor
- [ ] Construction planning reduces design iteration time
- [ ] System supports strawbale construction community needs
- [ ] Implementation demonstrates technical capability for future enhancements

---

This implementation plan provides a comprehensive roadmap for integrating strawbale construction planning into the existing floor plan editor while maintaining compatibility with current data structures and user workflows.
