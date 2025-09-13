# Strawbale Construction Methods Guide

## Overview

This document provides detailed instructions for implementing strawbale wall construction using infill and strawhenge methods. These instructions are based on proven strawbale construction techniques and serve as the foundation for the digital construction planning system.

## Table of Contents

1. [General Principles](#general-principles)
2. [Material Specifications](#material-specifications)
3. [Infill Construction Method](#infill-construction-method)
4. [Strawhenge Construction Method](#strawhenge-construction-method)
5. [Opening Construction](#opening-construction)
6. [Construction Rules and Constraints](#construction-rules-and-constraints)
7. [Quality Control](#quality-control)
8. [Common Problems and Solutions](#common-problems-and-solutions)

## General Principles

### Structural Foundation

All strawbale construction assumes:

- **Stem Wall Foundation**: Minimum 150mm (6") above ground level
- **Base Plate**: Continuous timber base plate (minimum 60mm thick) anchored to foundation
- **Top Plate**: Continuous timber top plate (minimum 60mm thick) supporting roof load
- **Wall Height**: Typically 2400-2700mm (8-9 feet) floor to ceiling

### Load Path

- **Roof Load**: Carried by top plate and distributed through wall construction
- **Wall Load**: Self-weight carried to foundation through posts/modules and straw
- **Lateral Load**: Wind and seismic loads carried through wall construction to foundation

### Moisture Protection

- **Stem Wall**: Prevents ground moisture from reaching straw
- **Roof Overhang**: Protects walls from rain
- **Vapor Barrier**: Not typically used - walls must breathe
- **Plaster System**: Protects straw from moisture and provides fire resistance

## Material Specifications

### Timber Materials

```
Base Plates:       60mm x 120mm minimum (2" x 5")
Top Plates:        60mm x 120mm minimum (2" x 5")
Posts (Infill):    60mm x 120mm typical (2" x 5")
Double Posts:      2x 60mm x 120mm with spacers
Module Frame:      60mm x 120mm for all members
Headers:           Sized per opening span and load
Sills:             60mm x 120mm minimum
```

### Straw Materials

```
Strawbales:        Standard rectangular bales
  - Dimensions:    360mm W x 500mm H x 800mm L (14" x 20" x 32")
  - Density:       110-130 kg/m³ (7-8 lbs/ft³)
  - Moisture:      <20% at time of installation
  - Binding:       Polypropylene strapping (not wire)

Stuffed Straw:     Loose straw for small spaces
  - Density:       Same as bales when compacted
  - Moisture:      <20%
  - Compaction:    Hand-stuffed to same density as bales
```

### Fasteners and Hardware

```
Base Plate Anchors:    12mm diameter x 200mm embed (1/2" x 8")
Post Connections:      10mm bolts or screws (3/8")
Module Connections:    12mm bolts or construction screws (1/2")
Temporary Bracing:     As required for stability during construction
```

## Infill Construction Method

### Overview

Infill construction uses a framework of vertical posts with straw bales or stuffed straw between posts. Posts are placed at regular intervals to provide structural support and compression for the straw.

### Construction Sequence

#### Step 1: Base Plate Installation

```
1. Install continuous base plate on stem wall foundation
2. Anchor base plate with 12mm bolts at 1200mm centers maximum
3. Ensure base plate is level and straight
4. Mark post locations on base plate according to design
```

#### Step 2: Post Layout and Placement Rules

**Standard Post Spacing:**

- **Maximum Spacing**: 800mm between post centerlines
- **Minimum Straw Space**: 70mm clear space for straw installation
- **Post Thickness**: 60mm standard (can be 80mm for heavy loads)

**Post Placement Algorithm:**

```
Given: Wall segment length L, opening positions and widths

1. Start with empty wall segment of length L
2. For each opening:
   - Reserve opening width + 2 × 15mm padding
   - This creates "unavailable space" for posts/straw

3. For remaining "available space" segments:
   - If segment length ≤ 60mm: ERROR - too small
   - If segment length ≤ 800mm: Place single bale/straw section
   - If segment length > 800mm: Use recursive placement:

4. Recursive Placement (for segments > 800mm):
   - Calculate optimal straw width for current segment
   - Place straw section at start or end (alternate direction)
   - If space remains for post (≥ 60mm): place post
   - Recursively process remaining space
```

**Straw Width Calculation Rules:**

```
For available space of width W:

If W ≤ 800mm:
  - Use full width W for straw

If 800mm < W ≤ 870mm (800 + 70):
  - Use W - 70mm for straw (leave min space for next segment)

If 870mm < W ≤ 1600mm:
  - Use 800mm for straw (standard bale length)

If W > 1600mm:
  - Use 800mm for straw, place post, continue with remainder
```

#### Step 3: Post Installation

```
1. Cut posts to exact height (floor to top plate minus plate thickness)
2. Install posts plumb and square to base plate
3. Secure posts to base plate with appropriate fasteners
4. Brace posts temporarily for stability
5. Mark straw placement zones between posts
```

#### Step 4: Straw Installation

**Full Bale Installation:**

```
1. Check bale dimensions and quality
2. Retie bales if necessary to achieve target density
3. Place bale between posts with tight fit
4. Compress bale height to match wall height exactly
5. Stuff any gaps with loose straw to same density
6. Maintain consistent wall face alignment
```

**Partial Bale Installation:**

```
1. Measure required straw section width
2. Cut bale to required width using chainsaw or straw needle
3. Retie cut bale with polypropylene strapping
4. Install same as full bale
5. Ensure cut face is clean and well-compressed
```

**Stuffed Straw Installation:**

```
1. For spaces < 300mm wide (too small for bale)
2. Hand-stuff loose straw in 100mm lifts
3. Compress each lift to match bale density
4. Maintain consistent wall face
5. Continue until space is completely filled
```

#### Step 5: Top Plate Installation

```
1. Install continuous top plate over completed wall
2. Ensure top plate is level and connects to adjacent walls
3. Secure top plate to posts with appropriate fasteners
4. Top plate must be continuous over openings (use headers)
```

### Infill Construction Examples

#### Example 1: Simple Wall Segment (3000mm long, no openings)

```
Wall Length: 3000mm
Construction sequence:

1. Place 800mm straw section at start (0-800mm)
2. Place 60mm post (800-860mm)
3. Place 800mm straw section (860-1660mm)
4. Place 60mm post (1660-1720mm)
5. Place 800mm straw section (1720-2520mm)
6. Place 60mm post (2520-2580mm)
7. Place 420mm straw section at end (2580-3000mm)

Result: 4 straw sections, 3 posts, all within spacing limits
```

#### Example 2: Wall with Door Opening (4000mm wall, 900mm door at 1500mm)

```
Wall Length: 4000mm
Door: 900mm wide at 1500mm offset, requires 15mm padding each side

1. Analyze segments:
   - Segment 1: 0mm to 1485mm (1485mm available)
   - Opening: 1485mm to 2415mm (930mm reserved for door + padding)
   - Segment 2: 2415mm to 4000mm (1585mm available)

2. Construct Segment 1 (1485mm):
   - Place 800mm straw (0-800mm)
   - Place 60mm post (800-860mm)
   - Place 625mm straw (860-1485mm)

3. Construct Opening (1485-2415mm):
   - Install door frame with 15mm padding each side
   - Frame members: 1485-1500mm, 2400-2415mm
   - Door opening: 1500-2400mm clear

4. Construct Segment 2 (1585mm):
   - Place 800mm straw (2415-3215mm)
   - Place 60mm post (3215-3275mm)
   - Place 725mm straw (3275-4000mm)

Result: Wall properly segmented around door with structural continuity
```

## Strawhenge Construction Method

### Overview

Strawhenge construction uses prefabricated timber frame modules (920mm wide) alternated with straw sections. Modules provide structural support and create standardized construction rhythm. Falls back to infill construction for spaces too small for modules.

### Module Specifications

#### Standard Module Dimensions

```
Module Width:      920mm (standard)
Frame Thickness:   60mm all members
Module Height:     Wall height minus base/top plate thickness

Frame Members:
- Top Beam:        60mm x 120mm full width
- Bottom Beam:     60mm x 120mm full width
- Side Posts:      60mm x 120mm full height
- Interior Space:  800mm wide x (height-120mm) tall for straw
```

#### Module Types

**Full Frame Module:**

```
Construction:
- Solid timber frame on all four sides
- Top and bottom beams full width
- Side posts full height
- Creates enclosed box for straw filling
- Best structural strength
- Use for high-load applications
```

**Double Frame Module:**

```
Construction:
- Two parallel frames with gap between
- Each frame: top beam, bottom beam, side post
- Creates two straw chambers side by side
- Lighter weight than full frame
- Use for standard residential construction
```

### Strawhenge Construction Sequence

#### Step 1: Module Layout Planning

```
Given: Wall segment length L, opening positions

1. Identify continuous wall segments (between openings)
2. For each segment, determine module placement:
   - If segment = 920mm: Perfect module fit
   - If segment > 920mm: Place modules where possible
   - If segment < 920mm: Use infill construction

3. Module Placement Rules:
   - Always place modules at wall ends if space allows
   - Fill center space with straw and additional modules
   - Use infill construction for remainder spaces
```

#### Step 2: Module Fabrication

```
1. Cut all frame members to exact dimensions
2. Assemble frame with structural joints (half-laps or mortise/tenon)
3. Square and brace frame during assembly
4. Pre-drill for connection to base/top plates
5. Apply wood preservative treatment if required
6. Transport to installation location
```

#### Step 3: Module Installation

```
1. Position module on base plate at marked location
2. Plumb and square module to base plate
3. Secure module to base plate with bolts/screws
4. Temporarily brace module for stability
5. Verify module alignment with adjacent construction
```

#### Step 4: Module Straw Filling

```
1. Fill module interior with straw to match module density
2. For 800mm x (height) interior space:
   - Use full bales if they fit interior dimensions
   - Cut bales to fit if necessary
   - Hand-stuff loose straw for tight fit
3. Compress straw to consistent density
4. Maintain flush faces with module frame
```

#### Step 5: Inter-Module Straw Construction

```
1. Measure space between modules
2. If space ≥ 920mm: Install additional module
3. If space 300-919mm: Install straw section per infill rules
4. If space < 300mm: Hand-stuff with loose straw
5. Maintain consistent wall face across modules and straw
```

### Strawhenge Construction Examples

#### Example 1: Long Wall Segment (5000mm, no openings)

```
Wall Length: 5000mm
Module planning:

1. Place modules at wall ends:
   - Module 1: 0-920mm
   - Module 2: 4080-5000mm (920mm from end)

2. Fill center space (920-4080mm = 3160mm):
   - Place Module 3: 920-1840mm
   - Place Module 4: 1840-2760mm
   - Remaining space: 2760-4080mm = 1320mm
   - Place 800mm straw: 2760-3560mm
   - Place 60mm post: 3560-3620mm
   - Place 460mm straw: 3620-4080mm

Result: 4 modules + 2 straw sections + 1 post
```

#### Example 2: Short Wall Segment (600mm)

```
Wall Length: 600mm
Module analysis: 600mm < 920mm (too small for module)

Fall back to infill construction:
1. Single 600mm straw section fills entire space
2. No posts needed (within 800mm limit)

Result: Pure infill construction used
```

### Module-to-Infill Transition Rules

```
For any wall segment of length L:

If L < 920mm:
  - Use infill construction exclusively
  - Follow standard infill rules

If L = 920mm:
  - Use single module, perfect fit

If 920mm < L < (920mm + 70mm + 60mm) = 1050mm:
  - Use infill construction (module won't fit with minimum straw space)

If L ≥ 1050mm:
  - Place module + continue with strawhenge rules for remainder
  - If remainder < 920mm, use infill for remainder
```

## Opening Construction

### General Opening Principles

All openings in strawbale walls require structural framing to:

- Transfer loads around the opening
- Provide attachment points for doors/windows
- Maintain thermal and moisture performance
- Provide compression for adjacent straw

### Opening Frame Types

#### Frame Construction (Standard)

**Components:**

- **Header**: Horizontal timber beam above opening
- **Sill**: Horizontal timber beam below opening (windows only)
- **Side Frames**: Vertical timber frames on each side
- **Padding**: 15mm clearance around opening for installation

**Frame Dimensions:**

```
Header Size: Calculated per span and load
  - Typical residential: 60mm x 120mm for spans ≤ 1200mm
  - Larger spans: Engineering required

Side Frames: 60mm x 120mm minimum
Sill: 60mm x 120mm minimum (windows only)
Padding: 15mm all sides for installation clearance
```

#### Box Construction (Alternative)

**Components:**

- **Complete timber box** surrounding entire opening
- **Box thickness**: 25mm minimum timber frame
- **Filling thickness**: 50mm typical for door/window installation
- **More robust**: Better for large openings or high-load conditions

### Opening Construction Sequence

#### Step 1: Opening Layout

```
1. Mark opening location on base plate
2. Calculate total opening width: opening + 2 × padding
3. Reserve space in wall construction sequence
4. Verify opening dimensions with actual door/window unit
```

#### Step 2: Sill Installation (Windows Only)

```
1. Cut sill to opening width + 2 × frame width
2. Install sill at specified height above floor
3. Level sill and secure to wall construction
4. Verify sill height matches window unit requirements
```

#### Step 3: Side Frame Installation

```
1. Cut side frames to opening height
2. Install side frames plumb and parallel
3. Secure frames to base plate and sill (if present)
4. Maintain specified opening width
5. Brace frames during construction
```

#### Step 4: Wall Construction Around Opening

```
1. Build wall sections up to header level
2. Install temporary support for header if required
3. Continue with normal wall construction on both sides
4. Maintain consistent wall face alignment
```

#### Step 5: Header Installation

```
1. Calculate header size per structural requirements
2. Install header bearing on wall construction each side
3. Secure header to side frames
4. Verify opening dimensions before proceeding
```

#### Step 6: Wall Construction Above Opening

```
1. Continue wall construction above header
2. Use appropriate construction method (infill/strawhenge)
3. Maintain structural continuity above opening
4. Complete to top plate level
```

### Door Construction Specifics

#### Standard Door Frame

```
Opening Width: Door width + 2 × 15mm padding
Opening Height: Door height + 15mm padding above
Sill: Typically no sill - opening to floor level
Side Frames: Full height from floor to header
Header: Spans opening plus bearing on each side

Frame Details:
- Side frames: 60mm x 120mm minimum
- Header: Sized per span and load
- Padding: 15mm clearance for door installation
- Threshold: Separate component, not part of frame
```

#### Door Installation Clearances

```
Door Rough Opening = Door Unit Width + 30mm
Door Rough Opening Height = Door Unit Height + 15mm

Example: 800mm door unit
- Rough opening width: 800 + 30 = 830mm
- Total reserved space: 830 + 2×15 = 860mm in wall
```

### Window Construction Specifics

#### Standard Window Frame

```
Opening Width: Window width + 2 × 15mm padding
Opening Height: Window height + 15mm padding above/below
Sill Height: Per architectural requirements (typically 900mm)
Side Frames: From sill to header
Header: Spans opening plus bearing each side

Frame Details:
- Sill: 60mm x 120mm minimum, sloped for drainage
- Side frames: 60mm x 120mm minimum
- Header: Sized per span and load
- Padding: 15mm clearance all sides
```

#### Window Sill Details

```
Sill Requirements:
- Sloped minimum 1:12 (5 degrees) for drainage
- Project minimum 20mm beyond exterior wall face
- Sealed connection to window unit
- Proper flashing integration

Sill Installation:
1. Install sill level and properly sloped
2. Verify sill height matches window unit
3. Install flashing per building code
4. Test for proper drainage
```

## Construction Rules and Constraints

### Dimensional Constraints

#### Minimum Dimensions

```
Minimum wall thickness: 300mm (for structural adequacy)
Minimum straw space: 70mm (for proper compression)
Minimum post thickness: 60mm (for structural capacity)
Maximum post spacing: 800mm (for proper straw support)
Minimum opening width: 600mm (for practical use)
Maximum opening width: 2400mm (without special engineering)
```

#### Standard Dimensions

```
Standard wall thickness: 400-500mm
Standard post thickness: 60mm x 120mm
Standard module width: 920mm
Standard bale dimensions: 360mm x 500mm x 800mm
Standard door height: 2100mm
Standard window sill height: 900mm
```

### Structural Rules

#### Load Path Requirements

```
1. All loads must have continuous path to foundation
2. Headers must bear on solid construction each side
3. Posts must be continuous from base plate to top plate
4. Modules must connect properly to base and top plates
5. No load-bearing elements in opening spans
```

#### Connection Requirements

```
1. Base plates anchored per building code
2. Posts connected to base and top plates with fasteners
3. Modules connected with minimum 12mm bolts
4. Headers properly sized for span and load
5. All connections accessible for inspection
```

### Construction Sequence Rules

#### Wall Construction Order

```
1. Foundation and stem wall completion
2. Base plate installation and anchoring
3. Opening layout and frame installation
4. Wall construction (infill or strawhenge)
5. Top plate installation
6. Roof construction (provides weather protection)
7. Door and window installation
8. Plaster application
```

#### Quality Control Points

```
1. Base plate level and anchor inspection
2. Post plumb and spacing verification
3. Straw density and moisture testing
4. Opening dimension verification
5. Top plate level and connection check
6. Final wall face alignment check
```

## Quality Control

### Material Quality Standards

#### Straw Quality Requirements

```
Density: 110-130 kg/m³ (proper compression)
Moisture: <20% (prevents mold and decay)
Binding: Polypropylene strapping only (no wire)
Color: Golden/tan (not gray or black)
Smell: Sweet/fresh (not moldy or sour)
Age: Current year harvest preferred
```

#### Timber Quality Requirements

```
Grade: Construction grade minimum for structural members
Moisture: <19% for all structural members
Treatment: Per building code for foundation contact
Connections: Galvanized fasteners for durability
Dimensions: Actual dimensions per specifications
```

### Construction Quality Checks

#### Daily Quality Checks

```
1. Straw moisture testing (random samples)
2. Wall face alignment verification
3. Post plumb and spacing check
4. Opening dimension verification
5. Connection integrity inspection
```

#### Weekly Quality Reviews

```
1. Overall wall alignment and structure
2. Material inventory and quality
3. Construction sequence adherence
4. Weather protection adequacy
5. Documentation completion
```

### Testing and Verification

#### Straw Density Testing

```
Method: Sample measurement and weighing
Frequency: Minimum 1 test per 10 bales
Target: 110-130 kg/m³ consistent density
Corrective Action: Retie or replace substandard bales
```

#### Moisture Testing

```
Method: Moisture meter readings
Frequency: Daily random sampling
Target: <20% moisture content
Corrective Action: Reject wet materials, improve storage
```

## Common Problems and Solutions

### Construction Problems

#### Problem: Posts Not Plumb or Aligned

```
Causes:
- Inaccurate layout on base plate
- Base plate not level
- Inadequate temporary bracing

Solutions:
- Use string lines for alignment
- Check and correct base plate level
- Install adequate temporary bracing
- Verify measurements before fastening
```

#### Problem: Inconsistent Wall Face

```
Causes:
- Varying straw density
- Poor bale preparation
- Inadequate compression

Solutions:
- Maintain consistent straw density
- Properly retie bales if needed
- Use consistent compression techniques
- Check alignment frequently during construction
```

#### Problem: Gaps in Straw Construction

```
Causes:
- Poor cutting of partial bales
- Inadequate stuffing of small spaces
- Shrinkage of straw over time

Solutions:
- Use sharp cutting tools for clean cuts
- Stuff all gaps with loose straw immediately
- Maintain consistent straw density
- Re-stuff gaps during construction if needed
```

### Opening Problems

#### Problem: Opening Dimensions Incorrect

```
Causes:
- Incorrect layout measurements
- Frame movement during construction
- Inadequate bracing of frames

Solutions:
- Verify all dimensions before cutting
- Use proper bracing during construction
- Check dimensions at multiple stages
- Allow for thermal movement in design
```

#### Problem: Header Sagging

```
Causes:
- Undersized header for span/load
- Inadequate bearing on each side
- Green timber shrinkage

Solutions:
- Calculate header size properly
- Provide adequate bearing length
- Use seasoned lumber for headers
- Install temporary support during construction
```

### Material Problems

#### Problem: High Moisture Content in Straw

```
Causes:
- Wet harvest conditions
- Poor storage conditions
- Inadequate weather protection

Solutions:
- Test all materials before use
- Improve storage with ventilation
- Reject materials >20% moisture
- Allow wet materials to dry before use
```

#### Problem: Poor Straw Density

```
Causes:
- Loose original baling
- Damage during handling
- Poor retying technique

Solutions:
- Select high-quality bales initially
- Handle materials carefully
- Retie loose bales properly
- Maintain consistent compression standards
```

---

This construction methods guide provides the detailed technical foundation for implementing both digital planning tools and actual strawbale construction. The rules and constraints documented here form the basis for the algorithmic construction planning system while ensuring real-world constructability and structural integrity.
