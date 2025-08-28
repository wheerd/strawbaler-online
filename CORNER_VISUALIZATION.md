# Corner Visualization

The floor plan editor now displays corners with visual symbols and angle information.

## Corner Types & Symbols

### Corner (⌐)

- **Symbol**: ⌐ (corner bracket)
- **Color**: Blue (#007acc)
- **Shows**: When two walls meet at any significant angle
- **Angle Display**: Shows angle in degrees when selected or when it's a regular corner

### Straight (━)

- **Symbol**: ━ (horizontal line)
- **Color**: Gray (#666666)
- **Shows**: When two walls are in a perfectly straight line (180°)
- **Angle Display**: Hidden (always 180°)

### Tee Junction (┬)

- **Symbol**: ┬ (T-junction)
- **Color**: Orange (#ff6b35)
- **Shows**: When exactly 3 walls meet at a point
- **Angle Display**: Shows main wall angle when selected

### Cross Junction (┼)

- **Symbol**: ┼ (plus/intersection)
- **Color**: Red (#ff0000)
- **Shows**: When 4 or more walls meet at a point
- **Angle Display**: Shows main wall angle when selected

## Visual Features

### Main Wall Highlighting

When a corner is selected, its main walls are highlighted:

- **Color**: Green (#00cc66) stroke for main walls
- **Thickness**: Increased stroke width (+2px) for emphasis
- **Automatic**: Highlights both wall1Id and wall2Id of the selected corner
- **Clear Indication**: Shows which walls define the corner's primary angle

### Corner Markers

- **Background**: Clean white circle (12px radius) with colored border
- **Selection**: Dashed blue circle (18px radius) when selected
- **No Center Symbol**: Clean circle design without clutter
- **Click to Select**: Click the background circle to select corners
- **Non-Blocking**: Doesn't interfere with point dragging

### Clean Information Display

- **Format**: Symbol + Angle (e.g., "⌐ 90°", "┬ 120°", "┼ 90°")
- **Position**: Above corner marker for clear readability
- **Background**: Strong white shadow for excellent contrast
- **Single Location**: Information only appears above the corner (not duplicated in center)
- **Visibility**:
  - Always shown for corners, tees, and cross junctions
  - Hidden only for straight corners (always 180°)
- **Size**: Larger 12px font for better readability

### Layer Ordering & Interaction

Corners are carefully positioned to be visible while not interfering with point editing:

1. **Grid Lines** (background)
2. **Rooms** (filled areas)
3. **Walls** (structural lines)
4. **Corners** (junction markers) ← Below points but non-blocking
5. **Connection Points** (editing handles)
6. **Wall Preview** (drawing aid)
7. **Selection Overlay** (UI feedback)

**Smart Interaction Design:**

- Corner groups are non-interactive by default (`listening={false}`)
- Only the background circle can be clicked for corner selection
- All text and visual elements are non-interactive
- This allows point dragging to work through corner symbols
- Corners remain visible while not blocking editing operations

## Implementation Details

### Components

- **CornerShape**: Renders individual corners with symbols and angles
- **CornerLayer**: Manages all corners on the active floor
- **Integration**: Automatically appears when walls are created/modified

### Automatic Updates

- Corners appear/disappear automatically as walls are added/removed
- Symbols and angles update immediately when wall configurations change
- No manual corner management required

### Performance

- Only renders corners for the active floor
- Efficient React re-rendering with proper memoization
- Minimal impact on editor performance
