# Depth Peeling Testing Guide

## Quick Test Checklist

### 1. Basic Rendering

- [ ] Open the app and navigate to 3D view
- [ ] Verify you can see the building model
- [ ] Check that opaque objects render correctly
- [ ] Confirm camera controls (orbit, pan, zoom) work

### 2. Wall Layer Transparency

- [ ] Toggle wall layers to semi-transparent (opacity 0.5)
- [ ] Verify wall layers are visible and transparent
- [ ] Check for **no grain/dither artifacts** (should be smooth)
- [ ] Verify **crisp, clean edges** on wall layers
- [ ] Check **correct depth ordering** (front layers in front, back layers behind)

### 3. Multiple Layers

- [ ] Toggle transparency on walls with 2-4 layers
- [ ] Verify all layers visible through each other
- [ ] Check for **no z-fighting** between thin layers
- [ ] Confirm **smooth alpha blending** between layers

### 4. Performance

- [ ] Monitor FPS (should be 50-60fps)
- [ ] Move camera while wall layers are transparent
- [ ] Check for smooth performance during interaction
- [ ] Test with complex buildings (multiple walls)

### 5. Mixed Transparency

- [ ] Make some walls transparent, keep others opaque
- [ ] Verify correct rendering of both types
- [ ] Test with transparent non-wall objects (if any)
- [ ] Confirm proper blending between all object types

## Debugging Steps

### If Nothing Renders:

1. Check browser console for errors
2. Verify `useDepthPeeling` is called in `ConstructionViewer3D`
3. Check that `DepthPeelingRenderer` component exists
4. Verify render targets are being created (check console logs)

### If Wall Layers Have Artifacts:

1. Check that elements have `category: 'wall-layer'` tag
2. Verify `renderMode === 'depth-peeling'` in console
3. Check depth peeling material is being used
4. Adjust epsilon in shader if needed (line 99 of DepthPeelingMaterial.ts)

### If Performance Is Slow:

1. Check number of visible wall layers
2. Consider reducing `layerCount` from 6 to 4
3. Test with simpler building models
4. Profile with Chrome DevTools Performance tab

## Expected Results

### Before (alphaHash):

![alpha-layers.png](./screenshots/alpha-layers.png)

- Visible grain/dither pattern
- Noisy edges
- Acceptable but not ideal

### After (Depth Peeling):

- **Smooth, clean transparency**
- **Crisp edges** with no grain
- **Correct ordering** of all layers
- **Professional quality** rendering

## Performance Targets

| Scenario               | Expected FPS | Notes                |
| ---------------------- | ------------ | -------------------- |
| No transparent walls   | 60fps        | Baseline performance |
| 2-4 transparent layers | 55-60fps     | Typical use case     |
| 6+ transparent layers  | 50-60fps     | Complex walls        |
| Camera movement        | 50-60fps     | Should stay smooth   |

## Known Limitations

1. **Maximum 6 layers**: More than 6 overlapping transparent layers may not all render
2. **Wall layers only**: Only objects with `wall-layer` category use depth peeling
3. **Performance cost**: ~10-12ms per frame when transparent walls are visible
4. **No refraction**: Pure alpha blending, no physically-based transparency effects

## Fallback Behavior

If depth peeling is disabled or unavailable:

- System falls back to normal Three.js rendering
- Wall layers will use standard `transparent: true`
- May see sorting artifacts but app will still function

## Success Criteria

✅ **Visual Quality**:

- No visible grain or dithering on transparent wall layers
- Clean, crisp edges
- Correct depth ordering of all layers
- Professional architectural visualization quality

✅ **Performance**:

- Maintains 50+ FPS with transparent walls
- Smooth camera controls
- No stuttering or frame drops

✅ **Functionality**:

- Opacity toggle works correctly
- All wall layer configurations render properly (2-6 layers)
- Non-wall transparent objects still work
- Export functionality unaffected
