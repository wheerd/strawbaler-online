# TAA (Temporal Anti-Aliasing) Improvements

## Problem

When using `alphaHash: true` for transparent materials, TAA accumulation (`accumulate: true`) was causing the renderer to freeze. Users couldn't move the camera or toggle opacity because TAA was continuously accumulating frames without ever resetting.

## Solution

Implemented automatic TAA reset on:

1. **Camera movement** - Detects position/rotation changes and resets accumulation
2. **Opacity changes** - Resets when user toggles layer visibility
3. **Viewport resize** - Resets when window/canvas size changes

## Changes Made

### 1. Enhanced `useTAA.ts` Hook

**New Features:**

- Tracks camera position and quaternion to detect movement
- Automatically resets `accumulateIndex = -1` when camera moves
- Subscribes to global TAA reset events (for opacity changes)
- Added TypeScript interface for `accumulateIndex` (exists in implementation but not in @types)

**Key Code:**

```typescript
// Check if camera has moved
const cameraMoved =
  !camera.position.equals(prevCameraState.current.position) ||
  !camera.quaternion.equals(prevCameraState.current.quaternion)

// Reset accumulation on camera movement
if (cameraMoved && taaPass.accumulate) {
  taaPass.accumulateIndex = -1
  prevCameraState.current.position.copy(camera.position)
  prevCameraState.current.quaternion.copy(camera.quaternion)
}
```

### 2. Global TAA Reset Emitter

**Purpose:** Coordinate TAA resets across the application when scene changes occur.

**Implementation:**

```typescript
class TAAResetEmitter {
  private listeners = new Set<() => void>()

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(): void {
    this.listeners.forEach(listener => listener())
  }
}

export const taaResetEmitter = new TAAResetEmitter()
```

### 3. Integrated with Tag Opacity Store

**Modified:** `tagOpacityStore.ts`

When opacity changes (via `setOpacity()` or `cycleOpacity()`), the store now emits a TAA reset event:

```typescript
function notifyListeners(id: TagOrCategory): void {
  // ... existing code ...

  // Reset TAA accumulation when opacity changes
  taaResetEmitter.emit()
}
```

## How It Works

### Camera Movement Flow:

1. User moves camera (orbit controls)
2. `useFrame` detects position/quaternion change
3. TAA accumulation resets to frame 0
4. New jittered samples start accumulating
5. After ~16-32 frames, image converges to smooth result

### Opacity Change Flow:

1. User toggles layer visibility
2. `tagOpacityStore` calls `setOpacity()`
3. `notifyListeners()` emits TAA reset event
4. `useTAA` subscription receives reset signal
5. TAA accumulation resets to frame 0
6. Scene re-renders with new opacity and accumulates

## Benefits

✅ **No more freezing** - Camera movement works smoothly
✅ **Smooth anti-aliasing** - TAA still smooths alphaHash grain when static
✅ **Responsive opacity changes** - Layer visibility updates immediately
✅ **Automatic reset** - No manual intervention needed
✅ **Optimal quality** - Full accumulation when scene is static

## Configuration

Current TAA settings in `ConstructionViewer3D.tsx`:

```typescript
useTAA(true, 0) // enabled=true, sampleLevel=0 (unlimited accumulation)
```

**Options:**

- `sampleLevel: 0` - Unlimited accumulation (best quality, current setting)
- `sampleLevel: 2` - ~4 samples (faster convergence, slight quality loss)
- `sampleLevel: 3` - ~8 samples (balance between speed and quality)
- `sampleLevel: 4` - ~16 samples (good for moving scenes)

## Testing

Test the following scenarios:

1. ✅ Camera orbiting - should render smoothly without freezing
2. ✅ Camera static - grain should disappear after 1-2 seconds
3. ✅ Toggle layer opacity - should update immediately and re-accumulate
4. ✅ Resize window - should reset and re-accumulate
5. ✅ Multiple quick opacity changes - should handle gracefully

## Performance Impact

- **Minimal overhead** - Reset detection is lightweight (vector comparison)
- **No extra renders** - Only resets when actually needed
- **Accumulation speed** - ~16-32 frames to full quality (0.5-1 second at 60fps)

## Future Improvements

Potential enhancements if needed:

1. Expose `sampleLevel` as user preference
2. Add "accumulation complete" indicator
3. Implement adaptive sample levels based on scene complexity
4. Add pause/resume accumulation API
