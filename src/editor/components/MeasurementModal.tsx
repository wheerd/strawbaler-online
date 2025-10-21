import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { BaseModal } from '@/shared/components/BaseModal'

function Schematic() {
  /*
  |   |       Slab Construction                           
  |   +--------------+ . . . . . . . . . . . . . . . . . .  
  |   |     Top      | Slab Construction Bottom Offset          
  |   |    Plate     +---+-------------------------------- 
  |   +--------------+   | Floor Bottom layers             
  |   |              |   +--------------------------------
  |   |              |   |                 .
  |   |              |   |                 .
  |   |    Header    |   |       I         .      
  +---+--------------+---+       n         .
  .   .              .   .       s         .
  .   .              .   .       i         .
  .   .   Opening    .   .       d         .
  .   .              .   .       e       Storey
  .   .              .   .               Height    
  +---+--------------+---+ . . .           .
  |   |     Sill     | I |     .           .
  |   |              | n |     .           .
  | O |              | s |     .           .
  | u |              | i |   Sill          .
  | t |              | d |   Height        .
  | s |              | e |     .           .
O | i |              |   |     .           .
u | d |              | L |     .           .
t | e |              | a |     .           .
s |   |              | y |     .           .
i | L |     Wall     | e |     .           .
d | a | Construction | r +--------------------------------  }
e | y +--------------+ s | Floor top layers                 }
  | e |    Bottom    +---+--------------------------------  }
  | r |    Plate     | Slab Construction Top Offset         }
  | s +--------------+ . . . . . . . . . . . . . . . . . .  } . . . . . . .  Zero level for wall construction
  |   |       Slab  Construction                            } Floor
  |   +--------------+ . . . . . . . . . . . . . . . . . .  } Thickness
  |   |     Top      | Slab Construction Bottom Offset      }      
  |   |    Plate     +---+--------------------------------  }
  |   +--------------+ I | Floor Bottom layers              }
  |   |     Wall     | n +--------------------------------  }
  |   | Construction | s |                 .
  |   |              | i |                 .
  |   |              | d |                 .
  |   |              | e |                 .
*/

  const marginTop = 100
  const marginBottom = 100
  const marginRight = 100
  const wallVerticalExtension = 100
  const floorProjection = 100
  const outsidePadding = 300
  const outsideThickness = 100
  const insideThickness = 100
  const wallLeft = outsidePadding + outsideThickness
  const wallWidth = 360
  const wallRight = wallLeft + wallWidth
  const inside = wallRight + insideThickness
  const floorWidth = 800
  const floorMeasurementX = inside + floorWidth / 2

  const storeyHeight = 3000
  const floorConstructionThickness = 100
  const floorConstructionTopOverlap = 100
  const floorConstructionBottomOverlap = 100
  const floorTotalConstructionThickness =
    floorConstructionThickness + floorConstructionTopOverlap + floorConstructionBottomOverlap

  const floorTopThickness = 150
  const floorBottomThickness = 100
  const totalFloorThickness = floorTotalConstructionThickness + floorTopThickness + floorBottomThickness

  const wallHeight = storeyHeight - floorConstructionThickness
  const topPlateThickness = 150
  const bottomPlateThickness = 150

  const totalHeight = marginTop + storeyHeight + totalFloorThickness + marginBottom
  const totalWidth = outsidePadding + outsideThickness + wallWidth + insideThickness + floorWidth

  const marginRightX = totalWidth - marginRight
  const interiorExtentX = wallRight + insideThickness
  const storeyCenterY = marginTop + storeyHeight / 2
  const roomHeightStartY = marginTop + totalFloorThickness

  const floorTopY = marginTop
  const topFloorConstructionTopY = floorTopY + floorTopThickness
  const topFloorConstructionBottomY = topFloorConstructionTopY + floorTotalConstructionThickness
  const topFloorBottomLayersTopY = topFloorConstructionBottomY
  const topFloorBottomLayersBottomY = topFloorBottomLayersTopY + floorBottomThickness

  const bottomFloorTopY = marginTop + storeyHeight
  const bottomFloorConstructionTopY = bottomFloorTopY + floorTopThickness
  const bottomFloorConstructionBottomY = bottomFloorConstructionTopY + floorTotalConstructionThickness
  const bottomFloorBottomLayersTopY = bottomFloorConstructionBottomY
  const bottomFloorBottomLayersBottomY = bottomFloorBottomLayersTopY + floorBottomThickness

  const wallAssemblyTopY = topFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap
  const wallAssemblyBottomY = wallAssemblyTopY + wallHeight
  const wallCoreTopY = wallAssemblyTopY + topPlateThickness
  const wallCoreHeight = wallHeight - topPlateThickness - bottomPlateThickness
  const wallCenterY = wallCoreTopY + wallCoreHeight / 2
  const wallCoreBottomY = wallAssemblyBottomY - bottomPlateThickness
  const bottomPlateTopY = wallAssemblyBottomY - bottomPlateThickness
  const bottomWallTopY =
    bottomFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap + bottomPlateThickness

  const insideLayerMiddleHeight = wallHeight - floorConstructionTopOverlap - floorConstructionBottomOverlap

  const wallCenterX = wallLeft + wallWidth / 2
  const outsideLayerX = wallLeft - outsideThickness

  const floorShapes = (
    <g key="floor-shapes">
      <g key="top-floor-group">
        <rect
          key="top-floor"
          x={inside}
          y={floorTopY}
          width={floorWidth + floorProjection}
          height={floorTopThickness}
          fill="var(--gray-6)"
          stroke="var(--gray-12)"
          strokeWidth="5"
        />
        <path
          key="top-floor-construction"
          d={`M ${wallLeft} ${topFloorConstructionTopY + floorConstructionTopOverlap}
              h ${wallWidth}
              v -${floorConstructionTopOverlap}
              H ${totalWidth + floorProjection}
              v ${floorTotalConstructionThickness}
              H ${wallRight}
              v -${floorConstructionBottomOverlap}
              H ${wallLeft} Z`}
          fill="var(--gray-7)"
          stroke="var(--gray-12)"
          strokeWidth="5"
        />
        <rect
          key="top-floor-bottom"
          x={inside}
          y={topFloorBottomLayersTopY}
          width={floorWidth + floorProjection}
          height={floorBottomThickness}
          fill="var(--gray-6)"
          stroke="var(--gray-12)"
          strokeWidth="5"
        />
      </g>
      <g key="bottom-floor-group">
        <rect
          key="bottom-floor"
          x={inside}
          y={bottomFloorTopY}
          width={floorWidth + floorProjection}
          height={floorTopThickness}
          fill="var(--gray-6)"
          stroke="var(--gray-12)"
          strokeWidth="5"
        />
        <path
          key="bottom-floor-construction"
          d={`M ${wallLeft} ${bottomFloorConstructionTopY + floorConstructionTopOverlap}
              h ${wallWidth}
              v -${floorConstructionTopOverlap}
              H ${totalWidth + floorProjection}
              v ${floorTotalConstructionThickness}
              H ${wallRight}
              v -${floorConstructionBottomOverlap}
              H ${wallLeft} Z`}
          fill="var(--gray-7)"
          stroke="var(--gray-12)"
          strokeWidth="5"
        />
        <rect
          key="bottom-floor-bottom"
          x={inside}
          y={bottomFloorBottomLayersTopY}
          width={floorWidth + floorProjection}
          height={floorBottomThickness}
          fill="var(--gray-6)"
          stroke="var(--gray-12)"
          strokeWidth="5"
        />
      </g>
    </g>
  )

  const wallShapes = (
    <g key="wall-shapes">
      <rect
        key="top-wall"
        x={wallLeft}
        y={-wallVerticalExtension}
        width={wallWidth}
        height={topFloorConstructionTopY + floorConstructionTopOverlap - bottomPlateThickness + wallVerticalExtension}
        fill="var(--gray-7)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="inside-layer-top"
        x={wallRight}
        y={-wallVerticalExtension}
        width={insideThickness}
        height={topFloorConstructionTopY + floorConstructionTopOverlap + wallVerticalExtension}
        fill="var(--gray-5)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="bottom-plate-top"
        x={wallLeft}
        y={topFloorConstructionTopY + floorConstructionTopOverlap - bottomPlateThickness}
        width={wallWidth}
        height={bottomPlateThickness}
        fill="var(--gray-8)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="top-plate"
        x={wallLeft}
        y={wallAssemblyTopY}
        width={wallWidth}
        height={topPlateThickness}
        fill="var(--gray-8)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="wall"
        x={wallLeft}
        y={wallCoreTopY}
        width={wallWidth}
        height={wallCoreHeight}
        fill="var(--gray-7)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="bottom-plate"
        x={wallLeft}
        y={bottomPlateTopY}
        width={wallWidth}
        height={bottomPlateThickness}
        fill="var(--gray-8)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="inside-layer-middle"
        x={wallRight}
        y={topFloorBottomLayersTopY}
        width={insideThickness}
        height={insideLayerMiddleHeight}
        fill="var(--gray-5)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="top-plate-bottom"
        x={wallLeft}
        y={bottomFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap}
        width={wallWidth}
        height={topPlateThickness}
        fill="var(--gray-8)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="bottom-wall"
        x={wallLeft}
        y={bottomWallTopY}
        width={wallWidth}
        height={wallHeight}
        fill="var(--gray-7)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="inside-layer-bottom"
        x={wallRight}
        y={bottomFloorConstructionTopY + floorConstructionThickness + floorConstructionTopOverlap}
        width={insideThickness}
        height={wallHeight}
        fill="var(--gray-5)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="outside-layer"
        x={outsideLayerX}
        y={-1}
        width={outsideThickness}
        height={totalHeight + 1}
        fill="var(--gray-5)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
    </g>
  )

  return (
    <svg height={500} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
      <defs>
        <linearGradient id="marginTop" x1="0" x2="0" y1="0" y2="1">
          <stop offset="10%" stop-color="var(--color-background)" stop-opacity="1" />
          <stop offset="100%" stop-color="var(--color-background)" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="marginBottom" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--color-background)" stop-opacity="0" />
          <stop offset="90%" stop-color="var(--color-background)" stop-opacity="1" />
        </linearGradient>
        <linearGradient id="marginRight" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="var(--color-background)" stop-opacity="0" />
          <stop offset="90%" stop-color="var(--color-background)" stop-opacity="1" />
        </linearGradient>
        <style dangerouslySetInnerHTML={{ __html: 'text { font-family: monospace; }' }}></style>
      </defs>

      {floorShapes}
      {wallShapes}

      <rect key="margin-top" x={-50} y={-5} width={totalWidth + 100} height={marginTop + 5} fill="url(#marginTop)" />
      <rect
        key="margin-bottom"
        x={-50}
        y={totalHeight - marginBottom}
        width={totalWidth + 100}
        height={marginBottom + 5}
        fill="url(#marginBottom)"
      />
      <rect
        key="margin-right"
        x={marginRightX}
        y={-50}
        width={marginRight + 5}
        height={totalHeight + 100}
        fill="url(#marginRight)"
      />

      <SvgMeasurementIndicator
        startPoint={[marginRightX, marginTop]}
        endPoint={[marginRightX, marginTop + storeyHeight]}
        label={'Storey Height'}
        fontSize={60}
        offset={40}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[marginRightX, roomHeightStartY]}
        endPoint={[marginRightX, marginTop + storeyHeight]}
        label={'Room Height'}
        fontSize={60}
        offset={120}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[wallRight, topFloorConstructionTopY]}
        endPoint={[wallRight, topFloorConstructionTopY + floorConstructionTopOverlap]}
        label={'Construction Top Offset'}
        fontSize={40}
        offset={-350}
        strokeWidth={10}
        color="var(--accent-10)"
        labelOrientation="perpendicular"
      />

      <SvgMeasurementIndicator
        startPoint={[wallRight, topFloorConstructionBottomY - floorConstructionBottomOverlap]}
        endPoint={[wallRight, topFloorConstructionBottomY]}
        label={'Construction Bottom Offset'}
        fontSize={40}
        offset={-350}
        strokeWidth={10}
        color="var(--accent-10)"
        labelOrientation="perpendicular"
      />

      <SvgMeasurementIndicator
        startPoint={[floorMeasurementX, floorTopY]}
        endPoint={[floorMeasurementX, topFloorConstructionTopY]}
        label={'Floor Top Layers'}
        fontSize={40}
        strokeWidth={10}
        color="var(--accent-10)"
        labelOrientation="perpendicular"
      />

      <SvgMeasurementIndicator
        startPoint={[floorMeasurementX, topFloorBottomLayersTopY]}
        endPoint={[floorMeasurementX, topFloorBottomLayersBottomY]}
        label={'Floor Bottom Layers'}
        fontSize={40}
        strokeWidth={10}
        color="var(--accent-10)"
        labelOrientation="perpendicular"
      />

      <text
        fontSize={60}
        text-anchor="middle"
        dominantBaseline="text-after-edge"
        transform={`translate(${outsidePadding} ${totalHeight / 2}) rotate(-90)`}
      >
        Outside
      </text>
      <text
        fontSize={60}
        text-anchor="middle"
        dominantBaseline="text-after-edge"
        transform={`translate(${inside} ${totalHeight / 2}) rotate(90)`}
      >
        Inside
      </text>

      <text
        x={wallCenterX}
        y={wallAssemblyBottomY - bottomPlateThickness / 2}
        fontSize={50}
        text-anchor="middle"
        dominantBaseline="middle"
      >
        Bottom Plate
      </text>

      <text
        x={wallCenterX}
        y={topFloorConstructionBottomY - floorConstructionBottomOverlap + topPlateThickness / 2}
        fontSize={50}
        text-anchor="middle"
        dominantBaseline="middle"
      >
        Top Plate
      </text>

      <SvgMeasurementIndicator
        startPoint={[wallLeft, wallAssemblyTopY]}
        endPoint={[wallLeft, wallAssemblyBottomY]}
        label="Wall Assembly Height"
        fontSize={60}
        offset={outsideThickness + 160}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[wallLeft, wallCoreTopY]}
        endPoint={[wallLeft, wallCoreBottomY]}
        label="Wall Construction Height"
        fontSize={60}
        offset={outsideThickness + 100}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[floorMeasurementX, bottomFloorTopY]}
        endPoint={[floorMeasurementX, bottomFloorBottomLayersBottomY]}
        label={'Total Floor Thickness'}
        labelOrientation="perpendicular"
        fontSize={60}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[outsideLayerX, storeyCenterY]}
        endPoint={[interiorExtentX, storeyCenterY]}
        label={'Total\nWall\nThickness'}
        offset={-100}
        fontSize={60}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <g transform={`translate(${wallCenterX} ${wallCenterY})`}>
        <text x={0} y={0} fontSize={50} color="var(--accent-10)" text-anchor="middle" dominantBaseline="middle">
          <tspan x={0}>Wall</tspan>
          <tspan x={0} dy="1.2em">
            Construction
          </tspan>
        </text>
      </g>
    </svg>
  )
}

export interface MeasurementModalProps {
  trigger: React.ReactNode
}
export function MeasurementModal({ trigger }: MeasurementModalProps): React.JSX.Element {
  return (
    <BaseModal title="Measurements" trigger={trigger}>
      <Schematic />
    </BaseModal>
  )
}
