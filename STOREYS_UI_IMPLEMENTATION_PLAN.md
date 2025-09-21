# Storeys UI Implementation Plan

## Overview

This document outlines the implementation plan for adding storey (floor) management UI to the FloorPlanEditor. The UI consists of a storey selector in the bottom-left of the canvas area and a modal for comprehensive storey management.

## Current State Analysis

### Existing Infrastructure

- ✅ **Storeys slice** with complete CRUD operations (`storeysSlice.ts`)
- ✅ **Editor store** with `activeStoreyId` tracking (`useEditorStore.ts`)
- ✅ **Modal pattern** established with Radix UI (`RingBeamConstructionModal.tsx`)
- ✅ **UI placement pattern** established (`GridSizeDisplay.tsx` in bottom-right)

### Data Structure

- `Storey`: `{id: StoreyId, name: string, level: StoreyLevel, height: Length}`
- `StoreyLevel`: Branded integer type supporting negative levels (basements)
- Store actions: add, remove, update (name/level/height), query by level order

## Level Management Constraints

### Core Rules

1. **Lowest floor level** ≤ 0 (cannot be above ground level)
2. **Highest floor level** ≥ 0 (cannot be below ground level)
3. **Levels remain consecutive** integers (e.g., -1, 0, 1, 2)
4. **Minimum one floor** must exist at all times

### Movement Logic

**Move Up (towards higher levels):**

- If storey is not the highest: swap with storey above
- If storey is highest: increase all levels by +1
  - **Constraint**: Only if lowest floor level would remain ≤ 0

**Move Down (towards lower levels):**

- If storey is not the lowest: swap with storey below
- If storey is lowest: decrease all levels by -1
  - **Constraint**: Only if highest floor level would remain ≥ 0

## Required Store Enhancements

### New Actions for StoreysSlice

```typescript
export interface StoreysActions {
  // ... existing actions ...

  // Level management operations
  swapStoreyLevels: (storeyId1: StoreyId, storeyId2: StoreyId) => void
  adjustAllLevels: (adjustment: number) => void // +1 or -1
  duplicateStorey: (sourceStoreyId: StoreyId, newName?: string) => Storey
  moveStoreyUp: (storeyId: StoreyId) => void // Convenience wrapper
  moveStoreyDown: (storeyId: StoreyId) => void // Convenience wrapper
}
```

### Implementation Details

```typescript
// Enhanced validation for moveStoreyUp
moveStoreyUp: (storeyId: StoreyId) => {
  const storeys = getStoreysOrderedByLevel()
  const targetStorey = storeys.find(s => s.id === storeyId)
  const lowestStorey = storeys[0]
  const highestStorey = storeys[storeys.length - 1]

  if (!targetStorey || storeys.length === 1) return

  const isHighest = targetStorey.id === highestStorey.id

  if (isHighest) {
    // Moving highest floor up - check constraint
    if (lowestStorey.level === 0) {
      throw new Error('Cannot move floor up: lowest floor would exceed ground level')
    }
    adjustAllLevels(1)
  } else {
    // Find floor above and swap
    const currentIndex = storeys.findIndex(s => s.id === storeyId)
    const floorAbove = storeys[currentIndex + 1]
    swapStoreyLevels(storeyId, floorAbove.id)
  }
}

// Enhanced validation for moveStoreyDown
moveStoreyDown: (storeyId: StoreyId) => {
  const storeys = getStoreysOrderedByLevel()
  const targetStorey = storeys.find(s => s.id === storeyId)
  const lowestStorey = storeys[0]
  const highestStorey = storeys[storeys.length - 1]

  if (!targetStorey || storeys.length === 1) return

  const isLowest = targetStorey.id === lowestStorey.id

  if (isLowest) {
    // Moving lowest floor down - check constraint
    if (highestStorey.level === 0) {
      throw new Error('Cannot move floor down: highest floor would go below ground level')
    }
    adjustAllLevels(-1)
  } else {
    // Find floor below and swap
    const currentIndex = storeys.findIndex(s => s.id === storeyId)
    const floorBelow = storeys[currentIndex - 1]
    swapStoreyLevels(storeyId, floorBelow.id)
  }
}
```

## Component Structure

### 1. StoreySelector Component (`StoreySelector.tsx`)

**Location:** Bottom-left of canvas area (mirroring `GridSizeDisplay` placement)

```tsx
<div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white border border-gray-200 rounded shadow-sm p-2">
  <select
    value={activeStoreyId}
    onChange={handleStoreyChange}
    className="text-sm border-none bg-transparent focus:outline-none"
  >
    {storeysOrderedByLevel.map(storey => (
      <option key={storey.id} value={storey.id}>
        Level {storey.level}: {storey.name}
      </option>
    ))}
  </select>

  <Dialog.Trigger asChild>
    <button className="p-1 text-gray-600 hover:text-gray-800 transition-colors">
      <PencilIcon className="w-4 h-4" />
    </button>
  </Dialog.Trigger>
</div>
```

### 2. StoreyManagementModal Component (`StoreyManagementModal.tsx`)

**Modal Pattern:** Uses Radix UI Dialog (like `RingBeamConstructionModal`)

```tsx
<Dialog.Content className="fixed inset-4 bg-white rounded-lg shadow-xl z-[100] flex flex-col max-w-lg mx-auto">
  {/* Header */}
  <div className="flex items-center justify-between p-4 border-b border-gray-200">
    <Dialog.Title className="text-base font-medium text-gray-900">Manage Floors</Dialog.Title>
    <Dialog.Close asChild>
      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
        <Cross2Icon className="w-5 h-5" />
      </button>
    </Dialog.Close>
  </div>

  {/* Main Content */}
  <div className="flex-1 p-4 space-y-3 max-h-96 overflow-y-auto">
    {/* Add new floor button */}
    <button
      onClick={handleAddEmptyFloor}
      className="w-full p-3 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-gray-400 transition-colors"
    >
      + Add New Floor
    </button>

    {/* Storey list (ordered by level, highest first for intuitive display) */}
    {storeysOrderedByLevel
      .slice()
      .reverse()
      .map(storey => (
        <StoreyListItem
          key={storey.id}
          storey={storey}
          isOnlyStorey={storeysOrderedByLevel.length === 1}
          lowestStorey={storeysOrderedByLevel[0]}
          highestStorey={storeysOrderedByLevel[storeysOrderedByLevel.length - 1]}
        />
      ))}
  </div>

  {/* Footer */}
  <div className="flex justify-end p-4 border-t border-gray-200">
    <Dialog.Close asChild>
      <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Done</button>
    </Dialog.Close>
  </div>
</Dialog.Content>
```

### 3. StoreyListItem Component (`StoreyListItem.tsx`)

**Features:**

- Level indicator with visual distinction
- Inline editable name
- Action buttons (up/down/duplicate/delete)
- Smart button disable states

```tsx
<div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
  {/* Level indicator */}
  <div className="w-16 text-center text-sm font-mono">
    <div
      className={`font-semibold ${
        storey.level === 0 ? 'text-green-600' : storey.level > 0 ? 'text-blue-600' : 'text-orange-600'
      }`}
    >
      L{storey.level}
    </div>
    <div className="text-xs text-gray-500">
      {storey.level === 0 ? 'Ground' : storey.level > 0 ? `Floor ${storey.level}` : `B${Math.abs(storey.level)}`}
    </div>
  </div>

  {/* Editable name */}
  <input
    value={editName}
    onChange={handleNameChange}
    onBlur={handleNameSave}
    onKeyDown={handleKeyDown} // Save on Enter, cancel on Escape
    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="Floor name"
  />

  {/* Action buttons */}
  <div className="flex gap-1">
    <button
      onClick={() => moveStoreyUp(storey.id)}
      disabled={!canMoveUp}
      className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
      title="Move up"
    >
      <ChevronUpIcon className="w-4 h-4" />
    </button>

    <button
      onClick={() => moveStoreyDown(storey.id)}
      disabled={!canMoveDown}
      className="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
      title="Move down"
    >
      <ChevronDownIcon className="w-4 h-4" />
    </button>

    <button
      onClick={() => duplicateStorey(storey.id)}
      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
      title="Duplicate floor"
    >
      <CopyIcon className="w-4 h-4" />
    </button>

    <button
      onClick={() => handleDeleteStorey(storey.id)}
      disabled={isOnlyStorey}
      className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
      title="Delete floor"
    >
      <TrashIcon className="w-4 h-4" />
    </button>
  </div>
</div>
```

## Button State Logic

```typescript
const getButtonStates = (storey: Storey, storeysOrdered: Storey[]) => {
  const lowestStorey = storeysOrdered[0]
  const highestStorey = storeysOrdered[storeysOrdered.length - 1]
  const isOnlyStorey = storeysOrdered.length === 1
  const isLowest = storey.id === lowestStorey.id
  const isHighest = storey.id === highestStorey.id

  return {
    // Up button disabled if:
    // - Only one storey, OR
    // - Is highest floor AND moving up would make lowest > 0
    canMoveUp: !isOnlyStorey && !(isHighest && lowestStorey.level === 0),

    // Down button disabled if:
    // - Only one storey, OR
    // - Is lowest floor AND moving down would make highest < 0
    canMoveDown: !isOnlyStorey && !(isLowest && highestStorey.level === 0),

    canDelete: !isOnlyStorey,
    canDuplicate: true
  }
}
```

## Example Scenarios

### Scenario 1: Floors at levels [0, 1, 2]

- **Floor 0**: ↑ enabled, ↓ enabled (can create basement)
- **Floor 1**: ↑ enabled, ↓ enabled
- **Floor 2**: ↑ disabled (would make lowest = 1 > 0), ↓ enabled

### Scenario 2: Floors at levels [-1, 0, 1]

- **Floor -1**: ↑ enabled, ↓ enabled (can go deeper)
- **Floor 0**: ↑ enabled, ↓ enabled
- **Floor 1**: ↑ enabled, ↓ enabled

### Scenario 3: Single floor at level [0]

- **Floor 0**: ↑ disabled, ↓ disabled (only floor)

### Scenario 4: Floors at levels [-2, -1, 0]

- **Floor -2**: ↑ enabled, ↓ enabled
- **Floor -1**: ↑ enabled, ↓ enabled
- **Floor 0**: ↑ enabled, ↓ disabled (would make highest = -1 < 0)

## Integration Points

### 1. FloorPlanEditor Integration

- Add `<StoreySelector />` to canvas area after `<GridSizeDisplay />` (line 118)
- Import and include modal portal rendering

### 2. Store Integration

- Use existing `useModelStore` for storeys data
- Use existing `useEditorStore` for active storey state
- Hook into `getStoreysOrderedByLevel()` for display order

### 3. Default Data Handling

- Create default ground floor (Level 0) if no storeys exist
- Sync `activeStoreyId` with first available storey
- Handle empty state gracefully

## Implementation Order

1. **Extend StoreysSlice** - Add new actions for level management
   - `swapStoreyLevels`
   - `adjustAllLevels`
   - `duplicateStorey`
   - `moveStoreyUp`
   - `moveStoreyDown`

2. **StoreyListItem** - Individual storey component with buttons
   - Level display with visual distinction
   - Inline name editing
   - Action buttons with proper disable states

3. **StoreyManagementModal** - Modal container with list
   - Add new floor functionality
   - List of StoreyListItem components
   - Modal layout and styling

4. **StoreySelector** - Bottom-left selector component
   - Dropdown for active storey selection
   - Edit button to open modal

5. **Integration** - Add to FloorPlanEditor
   - Position in canvas area
   - Wire up store connections

6. **Polish** - Styling, transitions, error states
   - Consistent styling with existing components
   - Smooth transitions
   - Error handling and user feedback

## Technical Considerations

### Dependencies

- `@radix-ui/react-dialog` (already available)
- `@radix-ui/react-icons` for UI icons
- No additional dependencies needed

### Styling

- Follow existing TailwindCSS patterns
- Match `GridSizeDisplay` positioning approach
- Use existing modal styling from `RingBeamConstructionModal`
- Consistent color scheme and spacing

### Error Handling

- Validation for movement constraints (handled by store)
- Prevent deletion of last storey
- Graceful handling of missing storeys
- User-friendly error messages

### Performance

- Optimized re-renders with proper selectors
- Efficient level calculations
- Minimal DOM updates during reordering

## Benefits

### User Experience

- ✅ **Intuitive floor selection** - Clear dropdown in canvas area
- ✅ **Simple management** - Modal with all operations in one place
- ✅ **Clear visual feedback** - Level indicators and button states
- ✅ **Logical constraints** - Prevents invalid floor configurations

### Technical Benefits

- ✅ **Consistent with existing patterns** - Uses established UI components
- ✅ **Separation of concerns** - Clear business logic in store
- ✅ **Maintainable code** - Well-structured components
- ✅ **Testable logic** - Individual operations can be unit tested
- ✅ **Scalable approach** - Works for 1-10+ floors equally well

This implementation provides a comprehensive storey management system that integrates seamlessly with the existing codebase while maintaining intuitive user experience and robust data consistency.

TODOs:

- Radix UI select
- Fix levels when deleting storey (in store)
- Duplicate perimeters when duplicating floor
