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
  const outsidePadding = 300
  const outsideThickness = 100
  const insideThickness = 100
  const wallLeft = outsidePadding + outsideThickness
  const wallWidth = 360
  const wallRight = wallLeft + wallWidth
  const inside = wallRight + insideThickness
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
  const floorWidth = 800

  const totalHeight = marginTop + storeyHeight + totalFloorThickness + marginBottom
  const totalWidth = outsidePadding + outsideThickness + wallWidth + insideThickness + floorWidth

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
      <rect
        key="top-wall"
        x={wallLeft}
        y={-100}
        width={wallWidth}
        height={marginTop + floorTopThickness + floorConstructionTopOverlap - bottomPlateThickness + 100}
        fill="var(--gray-7)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="inside-layer-top"
        x={wallRight}
        y={-100}
        width={insideThickness}
        height={marginTop + floorTopThickness + floorConstructionTopOverlap + 100}
        fill="var(--gray-5)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="bottom-plate-top"
        x={wallLeft}
        y={
          marginTop +
          floorTopThickness +
          floorConstructionThickness +
          floorConstructionTopOverlap +
          wallHeight -
          bottomPlateThickness -
          storeyHeight
        }
        width={wallWidth}
        height={bottomPlateThickness}
        fill="var(--gray-8)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="top-floor"
        x={inside}
        y={marginTop}
        width={floorWidth + 100}
        height={floorTopThickness}
        fill="var(--gray-6)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <path
        key="top-floor-construction"
        d={`M ${wallLeft} ${marginTop + floorTopThickness + floorConstructionTopOverlap}
            h ${wallWidth}
            v -${floorConstructionTopOverlap}
            H ${totalWidth + 100}
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
        y={marginTop + floorTopThickness + floorTotalConstructionThickness}
        width={floorWidth + 100}
        height={floorBottomThickness}
        fill="var(--gray-6)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="top-plate"
        x={wallLeft}
        y={marginTop + floorTopThickness + floorConstructionThickness + floorConstructionTopOverlap}
        width={wallWidth}
        height={topPlateThickness}
        fill="var(--gray-8)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="wall"
        x={wallLeft}
        y={marginTop + floorTopThickness + floorConstructionThickness + floorConstructionTopOverlap + topPlateThickness}
        width={wallWidth}
        height={wallHeight - topPlateThickness - bottomPlateThickness}
        fill="var(--gray-7)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <rect
        key="bottom-plate"
        x={wallLeft}
        y={
          marginTop +
          floorTopThickness +
          floorConstructionThickness +
          floorConstructionTopOverlap +
          wallHeight -
          bottomPlateThickness
        }
        width={wallWidth}
        height={bottomPlateThickness}
        fill="var(--gray-8)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="inside-layer-middle"
        x={wallRight}
        y={marginTop + floorTopThickness + floorTotalConstructionThickness}
        width={insideThickness}
        height={wallHeight - floorConstructionTopOverlap - floorConstructionBottomOverlap}
        fill="var(--gray-5)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="bottom-floor"
        x={inside}
        y={marginTop + storeyHeight}
        width={floorWidth + 100}
        height={floorTopThickness}
        fill="var(--gray-6)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />
      <path
        key="bottom-floor-construction"
        d={`M ${wallLeft} ${marginTop + storeyHeight + floorTopThickness + floorConstructionTopOverlap}
            h ${wallWidth}
            v -${floorConstructionTopOverlap}
            H ${totalWidth + 100}
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
        y={marginTop + storeyHeight + floorTopThickness + floorTotalConstructionThickness}
        width={floorWidth + 100}
        height={floorBottomThickness}
        fill="var(--gray-6)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="top-plate-bottom"
        x={wallLeft}
        y={marginTop + storeyHeight + floorTopThickness + floorConstructionThickness + floorConstructionTopOverlap}
        width={wallWidth}
        height={topPlateThickness}
        fill="var(--gray-8)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="bottom-wall"
        x={wallLeft}
        y={
          marginTop +
          storeyHeight +
          floorTopThickness +
          floorConstructionThickness +
          floorConstructionTopOverlap +
          bottomPlateThickness
        }
        width={wallWidth}
        height={wallHeight}
        fill="var(--gray-7)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="inside-layer-bottom"
        x={wallRight}
        y={marginTop + storeyHeight + floorTopThickness + floorConstructionThickness + floorConstructionTopOverlap}
        width={insideThickness}
        height={wallHeight}
        fill="var(--gray-5)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect
        key="outside-layer"
        x={wallLeft - outsideThickness}
        y={-1}
        width={outsideThickness}
        height={totalHeight + 1}
        fill="var(--gray-5)"
        stroke="var(--gray-12)"
        strokeWidth="5"
      />

      <rect key="margin-top" x={0} y={0} width={2000} height={marginTop} fill="url(#marginTop)" />
      <rect
        key="margin-bottom"
        x={0}
        y={totalHeight - marginBottom}
        width={2000}
        height={marginBottom + 1}
        fill="url(#marginBottom)"
      />
      <rect
        key="margin-right"
        x={totalWidth - marginRight}
        y={0}
        width={marginRight + 1}
        height={totalHeight}
        fill="url(#marginRight)"
      />

      <SvgMeasurementIndicator
        startPoint={[totalWidth - marginRight, marginTop]}
        endPoint={[totalWidth - marginRight, marginTop + storeyHeight]}
        label={'Storey Height'}
        fontSize={60}
        offset={40}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[totalWidth - marginRight, marginTop + totalFloorThickness]}
        endPoint={[totalWidth - marginRight, marginTop + storeyHeight]}
        label={'Room Height'}
        fontSize={60}
        offset={120}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[wallRight, marginTop + floorTopThickness]}
        endPoint={[wallRight, marginTop + floorTopThickness + floorConstructionTopOverlap]}
        label={'Construction Top Offset'}
        fontSize={40}
        offset={-350}
        strokeWidth={10}
        color="var(--accent-10)"
        labelOrientation="perpendicular"
      />

      <SvgMeasurementIndicator
        startPoint={[
          wallRight,
          marginTop + floorTopThickness + floorTotalConstructionThickness - floorConstructionBottomOverlap
        ]}
        endPoint={[wallRight, marginTop + floorTopThickness + floorTotalConstructionThickness]}
        label={'Construction Bottom Offset'}
        fontSize={40}
        offset={-350}
        strokeWidth={10}
        color="var(--accent-10)"
        labelOrientation="perpendicular"
      />

      <SvgMeasurementIndicator
        startPoint={[inside + floorWidth / 2, marginTop]}
        endPoint={[inside + floorWidth / 2, marginTop + floorTopThickness]}
        label={'Floor Top Layers'}
        fontSize={40}
        strokeWidth={10}
        color="var(--accent-10)"
        labelOrientation="perpendicular"
      />

      <SvgMeasurementIndicator
        startPoint={[inside + floorWidth / 2, marginTop + floorTopThickness + floorTotalConstructionThickness]}
        endPoint={[
          inside + floorWidth / 2,
          marginTop + floorTopThickness + floorTotalConstructionThickness + floorBottomThickness
        ]}
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
        x={wallLeft + wallWidth / 2}
        y={
          marginTop +
          floorTopThickness +
          floorConstructionThickness +
          floorConstructionTopOverlap +
          wallHeight -
          bottomPlateThickness / 2
        }
        fontSize={50}
        text-anchor="middle"
        dominantBaseline="middle"
      >
        Bottom Plate
      </text>

      <text
        x={wallLeft + wallWidth / 2}
        y={
          marginTop +
          floorTopThickness +
          floorTotalConstructionThickness -
          floorConstructionBottomOverlap +
          topPlateThickness / 2
        }
        fontSize={50}
        text-anchor="middle"
        dominantBaseline="middle"
      >
        Top Plate
      </text>

      <SvgMeasurementIndicator
        startPoint={[
          wallLeft,
          marginTop + floorTopThickness + floorConstructionThickness + floorConstructionTopOverlap
        ]}
        endPoint={[
          wallLeft,
          marginTop + floorTopThickness + floorConstructionThickness + floorConstructionTopOverlap + wallHeight
        ]}
        label={'Wall Assembly Height'}
        fontSize={60}
        offset={outsideThickness + 160}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[
          wallLeft,
          marginTop + floorTopThickness + floorConstructionThickness + floorConstructionTopOverlap + topPlateThickness
        ]}
        endPoint={[
          wallLeft,
          marginTop +
            floorTopThickness +
            floorConstructionThickness +
            floorConstructionTopOverlap +
            wallHeight -
            bottomPlateThickness
        ]}
        label={'Wall Construction Height'}
        fontSize={60}
        offset={outsideThickness + 100}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[inside + floorWidth / 2, marginTop + storeyHeight]}
        endPoint={[inside + floorWidth / 2, marginTop + storeyHeight + totalFloorThickness]}
        label={'Total Floor Thickness'}
        labelOrientation="perpendicular"
        fontSize={60}
        strokeWidth={10}
        color="var(--accent-10)"
      />

      <SvgMeasurementIndicator
        startPoint={[wallLeft - outsideThickness, marginTop + storeyHeight / 2]}
        endPoint={[wallRight + insideThickness, marginTop + storeyHeight / 2]}
        label={'Total\nWall\nThickness'}
        fontSize={60}
        strokeWidth={10}
        color="var(--accent-10)"
      />
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
