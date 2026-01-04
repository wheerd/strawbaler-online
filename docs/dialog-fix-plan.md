# Plan: Fix Dialog Sizing Issues (Minimal Approach)

**Date:** 2026-01-04  
**Status:** Planning  
**Estimated Time:** 4-6 hours  
**Scope:** Replace Radix Themes Dialog with custom Radix Primitive Dialog + Tailwind styling

---

## Problem Statement

**Current Issues:**

1. ConstructionPlanModal: SVG doesn't take full available height, unwanted scrolling
2. ConstructionViewer3DModal: Canvas flickers/jumps between sizes
3. Radix Themes Dialog.Content adds automatic scroll wrapper that interferes with flex layouts
4. Limited control over Dialog sizing behavior

**Root Cause:**

- Radix Themes Dialog.Content wraps content in a scroll container by default
- This breaks flex layouts that need explicit height constraints (`min-height: 0`, `flex: 1`)
- The auto-scroll behavior conflicts with components that want to manage their own scrolling (like the SVG container)

---

## Solution: Custom Dialog Component

**Approach:**

- Replace Radix Themes Dialog with Radix Primitives Dialog (`@radix-ui/react-dialog`)
- Use Tailwind for styling (already in the project)
- Keep all other Radix Themes components unchanged
- Preserve BaseModal API for backward compatibility

**Why This Works:**

- Radix Primitive Dialog.Content is unstyled - we have full control
- No automatic scroll wrapper - we explicitly control layout with flex/Tailwind
- Same accessibility features as Radix Themes (same primitive underneath)
- Minimal changes to existing code (just BaseModal and CSS)

---

## Key Insight

The Radix **Primitive** (`@radix-ui/react-dialog`) doesn't have the scrolling issues - it's completely unstyled. The problem is Radix **Themes** Dialog.Content which adds opinionated styling including scroll containers.

**We already have the primitive installed** (it's a dependency of Radix Themes), so no new packages needed!

---

## Implementation Plan

### Step 1: Create Custom Dialog Component (2-3 hours)

**File:** `src/components/ui/dialog.tsx` (new file)

**Purpose:**

- Wrap Radix Primitive Dialog with Tailwind styling
- Match Radix Themes Dialog appearance (roughly)
- Give us full layout control

**Implementation:**

```tsx
// src/components/ui/dialog.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import * as React from 'react'

import { cn } from '@/shared/utils/cn'

// You'll need to add this utility

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  // Custom props for our dialog
  width?: string
  maxWidth?: string
  height?: string
  maxHeight?: string
  showCloseButton?: boolean
  onCloseClick?: () => void
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Fixed backdrop
      'fixed inset-0 z-50',
      // Background with blur
      'bg-black/50 backdrop-blur-sm',
      // Animation
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = 'DialogOverlay'

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  (
    {
      className,
      children,
      width,
      maxWidth = '90vw',
      height,
      maxHeight = '90vh',
      showCloseButton = true,
      onCloseClick,
      style,
      ...props
    },
    ref
  ) => (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Positioning
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          // Sizing - CRITICAL: No max-height here unless explicitly needed
          'w-full',
          // Visual
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-800',
          'rounded-lg shadow-lg',
          // Padding
          'p-6',
          // Animation
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
          'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          // Focus
          'focus:outline-none',
          className
        )}
        style={{
          width: width,
          maxWidth: maxWidth,
          height: height,
          maxHeight: maxHeight,
          ...style
        }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            onClick={onCloseClick}
            className={cn(
              'absolute right-4 top-4',
              'rounded-sm opacity-70 ring-offset-white',
              'transition-opacity hover:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
              'disabled:pointer-events-none',
              'dark:ring-offset-gray-950 dark:focus:ring-gray-800',
              'h-8 w-8 inline-flex items-center justify-center',
              'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <Cross2Icon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', 'text-gray-900 dark:text-gray-100', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

export { DialogPrimitive as Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogDescription }
```

**Also need:** `src/shared/utils/cn.ts` (className utility)

```ts
// src/shared/utils/cn.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Dependencies to add:**

```bash
pnpm add clsx tailwind-merge
```

### Step 2: Update BaseModal to Use Custom Dialog (1-2 hours)

**File:** `src/shared/components/BaseModal/BaseModal.tsx`

**Changes:**

1. Import custom Dialog instead of Radix Themes Dialog
2. Use explicit layout structure
3. Remove reliance on Radix Themes Dialog.Content's automatic sizing

**Updated BaseModal:**

```tsx
import { Cross2Icon } from '@radix-ui/react-icons'
import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { FeatureErrorFallback } from '@/shared/components/ErrorBoundary'
import { cn } from '@/shared/utils/cn'

// Keep same interface for backward compatibility
export interface BaseModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: React.ReactNode
  titleIcon?: React.ReactNode
  children: React.ReactNode
  trigger?: React.ReactNode
  size?: '1' | '2' | '3' | '4'
  width?: string
  maxWidth?: string
  height?: string
  maxHeight?: string
  showCloseButton?: boolean
  onEscapeKeyDown?: (e: Event) => void
  'aria-describedby'?: string
  resetKeys?: unknown[]
  className?: string
  style?: React.CSSProperties
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  titleIcon,
  children,
  trigger,
  size,
  width,
  maxWidth,
  height,
  maxHeight,
  showCloseButton = true,
  onEscapeKeyDown,
  'aria-describedby': ariaDescribedBy,
  resetKeys = [],
  className,
  style
}: BaseModalProps): React.JSX.Element {
  // Map Radix Themes size to width (if no explicit width provided)
  const sizeToWidth = {
    '1': '448px', // Small
    '2': '580px', // Medium
    '3': '768px', // Large
    '4': '1024px' // Extra large
  }

  const computedWidth = width || (size ? sizeToWidth[size] : undefined)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <DialogContent
        aria-describedby={ariaDescribedBy}
        width={computedWidth}
        maxWidth={maxWidth}
        height={height}
        maxHeight={maxHeight}
        showCloseButton={showCloseButton}
        onEscapeKeyDown={onEscapeKeyDown}
        className={cn(
          // CRITICAL: Allow children to control their own layout
          'flex flex-col',
          className
        )}
        style={style}
      >
        {/* Title with icon */}
        <DialogTitle className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {titleIcon}
            <span>{title}</span>
          </div>
          {/* Close button is rendered by DialogContent */}
        </DialogTitle>

        {/* Content with error boundary */}
        <ErrorBoundary FallbackComponent={FeatureErrorFallback} resetKeys={[open, ...resetKeys]}>
          {/* 
            CRITICAL: Don't add any wrapper that constrains layout
            Let children manage their own flex/overflow behavior
          */}
          {children}
        </ErrorBoundary>
      </DialogContent>
    </Dialog.Root>
  )
}
```

**Key differences from current implementation:**

- ✅ No automatic scroll wrapper
- ✅ Dialog.Content uses `flex flex-col` for proper layout
- ✅ Children can use `flex-1 min-h-0` to get proper sizing
- ✅ Explicit width/height/maxHeight support
- ✅ Same API, so no changes needed in consuming components

### Step 3: Fix ConstructionPlanModal Layout (1 hour)

**File:** `src/construction/components/ConstructionPlanModal.tsx`

**Current issue:** Tabs and SVG container don't get proper sizing

**Fix:** Ensure proper flex hierarchy

**Changes needed:**

```tsx
// In ConstructionPlanModal component
;<BaseModal
  open={isOpen}
  onOpenChange={handleOpenChange}
  title={title}
  trigger={trigger}
  size="2"
  width="calc(100vw - 2 * var(--space-4))"
  maxWidth="calc(100vw - 2 * var(--space-4))"
  height="calc(100vh - 2 * var(--space-6))"
  maxHeight="calc(100vh - 2 * var(--space-6))"
  resetKeys={[refreshKey]}
  className="overflow-hidden" // CRITICAL: Prevent BaseModal from scrolling
  style={{ padding: '1.5rem' }} // Control padding explicitly
>
  {/* 
    Content should be flex column that fills available space
    BaseModal is already flex-col, so this will work
  */}
  <PlanHighlightProvider>
    <ModalContent
    // ... props
    // ModalContent will use flex-1 to fill available space
    />
  </PlanHighlightProvider>
</BaseModal>

// In ModalContent
function ModalContent(
  {
    /* props */
  }
) {
  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex flex-col flex-1 min-h-0" // CRITICAL: flex-1 min-h-0
    >
      <Tabs.List>{/* tabs */}</Tabs.List>

      <Tabs.Content
        value="plan"
        className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden" // CRITICAL
      >
        {/* SVG container */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-hidden border border-gray-200 dark:border-gray-700 rounded"
        >
          {/* SVG content */}
        </div>

        {/* Issues panel - fixed height */}
        <div className="flex-shrink-0">{/* Issues */}</div>
      </Tabs.Content>
    </Tabs.Root>
  )
}
```

**Update CSS file:** `src/construction/components/ConstructionPlanModal.css`

```css
/* Remove Radix Themes specific workarounds */
/* Keep only what's needed for custom styling */

.plan-modal [role='tabpanel'] {
  /* Ensure tab content uses available space */
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
}
```

### Step 4: Fix ConstructionViewer3DModal (30 min)

**File:** `src/construction/viewer3d/ConstructionViewer3DModal.tsx`

**Similar changes:**

```tsx
<BaseModal
  open={isOpen}
  onOpenChange={handleOpenChange}
  title={t($ => $.viewer3DModal.title)}
  trigger={trigger}
  size="2"
  width="95%"
  maxWidth="95%"
  maxHeight="90vh"
  className="overflow-hidden" // Prevent scrolling
  resetKeys={[refreshKey]}
>
  <div className="flex flex-col flex-1 min-h-0 gap-1">
    <div
      ref={containerRef}
      className="relative flex-1 min-h-[500px] overflow-hidden border border-gray-200 dark:border-gray-700 rounded"
    >
      {/* Canvas content - now has stable size */}
    </div>
  </div>
</BaseModal>
```

**Key fix:** Canvas container gets predictable size without flicker

### Step 5: Update Tailwind Config (15 min)

**File:** `tailwind.config.js`

**Add animations for dialog:**

```js
module.exports = {
  // ... existing config
  theme: {
    extend: {
      // ... existing extend
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' }
        },
        'zoom-in': {
          from: { transform: 'scale(0.95)' },
          to: { transform: 'scale(1)' }
        },
        'zoom-out': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(0.95)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 200ms ease-in',
        'zoom-in': 'zoom-in 200ms ease-out',
        'zoom-out': 'zoom-out 200ms ease-in'
      }
    }
  }
  // ... rest
}
```

**Or** use `tailwindcss-animate` plugin:

```bash
pnpm add tailwindcss-animate
```

Then in config:

```js
plugins: [
  require('@tailwindcss/forms')({ strategy: 'class' }),
  require('tailwindcss-animate') // Add this
]
```

### Step 6: Test All Modals (1-2 hours)

**Test checklist:**

**ConstructionPlanModal:**

- [ ] Opens correctly
- [ ] SVG container takes full available height
- [ ] No unwanted scrollbars in SVG container
- [ ] Tabs switch properly
- [ ] Issues panel visible at bottom
- [ ] Resizing window works smoothly
- [ ] Dark mode works

**ConstructionViewer3DModal:**

- [ ] Opens correctly
- [ ] Canvas renders at correct size
- [ ] No flickering on open
- [ ] No flickering on resize
- [ ] Resize observer stable
- [ ] Dark mode works

**All other modals (11 files):**

- [ ] StoreyManagementModal
- [ ] ConfigurationModal
- [ ] ConstructionPartsListModal
- [ ] PartCutModal
- [ ] SheetPartModal
- [ ] MeasurementInfo modal
- [ ] RoofMeasurementInfo modal
- [ ] PlanImportModal
- [ ] LShapedPresetDialog
- [ ] RectangularPresetDialog
- [ ] WelcomeModal (uses Dialog.Root directly - may need separate fix)

**Browser testing:**

- [ ] Chrome
- [ ] Firefox
- [ ] Safari/WebKit (especially for flicker issue)

---

## Files to Create/Modify

### New Files:

1. `src/components/ui/dialog.tsx` - Custom Dialog component
2. `src/shared/utils/cn.ts` - className utility

### Modified Files:

1. `src/shared/components/BaseModal/BaseModal.tsx` - Use custom Dialog
2. `src/construction/components/ConstructionPlanModal.tsx` - Fix layout
3. `src/construction/components/ConstructionPlanModal.css` - Update CSS
4. `src/construction/viewer3d/ConstructionViewer3DModal.tsx` - Fix layout
5. `tailwind.config.js` - Add animations
6. `package.json` - Add dependencies (clsx, tailwind-merge, optionally tailwindcss-animate)

### Possibly Modified:

- `src/shared/components/WelcomeModal.tsx` - If it needs the same fix

---

## Dependencies

**Required:**

```bash
pnpm add clsx tailwind-merge
```

**Optional (for animations):**

```bash
pnpm add tailwindcss-animate
```

**Already installed:**

- `@radix-ui/react-dialog` (dependency of Radix Themes)
- `@radix-ui/react-icons`
- Tailwind CSS

---

## Advantages of This Approach

✅ **Minimal changes**

- Only 2 new files
- Only 5-6 files modified
- All other Radix Themes components stay the same

✅ **Solves the problem**

- Full control over Dialog layout
- No automatic scroll wrappers
- Explicit flex layout control
- Canvas gets stable sizing

✅ **Low risk**

- Radix Primitive is the same one Radix Themes uses
- Same accessibility features
- Same keyboard interactions
- Same API patterns

✅ **No new paradigm**

- Still using Radix (just primitive instead of themes)
- Already using Tailwind
- No learning curve

✅ **Easy to rollback**

- Only a few files changed
- Can revert easily if issues arise

✅ **Future-proof**

- If you want to migrate to shadcn later, this is 80% of the work
- Custom Dialog component can be enhanced over time
- Doesn't lock you into Radix Themes

---

## Comparison to Full shadcn Migration

| Aspect                    | This Approach                  | Full shadcn             |
| ------------------------- | ------------------------------ | ----------------------- |
| **Time**                  | 4-6 hours                      | 43-56 hours             |
| **Files changed**         | ~6 files                       | ~100 files              |
| **Risk**                  | Low                            | Medium-High             |
| **Solves Dialog issue**   | ✅ Yes                         | ✅ Yes                  |
| **Component consistency** | Mixed (Themes + custom Dialog) | ✅ All shadcn           |
| **Future flexibility**    | ✅ Can migrate later           | ✅ Full control         |
| **Learning curve**        | Low (same patterns)            | Medium (new components) |
| **Bundle size impact**    | Minimal                        | Potentially smaller     |

---

## Potential Issues & Solutions

### Issue 1: Dialog styling doesn't match Radix Themes exactly

**Solution:** Adjust Tailwind classes in DialogContent to match visual appearance

- Padding, border-radius, shadows, etc.
- Can use Chrome DevTools to inspect Radix Themes Dialog and copy values

### Issue 2: Dark mode colors slightly different

**Solution:** Use CSS variables that already exist

- `bg-white dark:bg-gray-900` → could use custom variables if needed
- Reference existing `--color-background` from index.css

### Issue 3: Animation feels different

**Solution:**

- Use `tailwindcss-animate` for consistent animations
- Or tweak animation durations/easings to match Radix Themes

### Issue 4: WelcomeModal uses Dialog.Root directly

**Solution:**

- Update it to use new Dialog primitive with same pattern
- Or create a second version of BaseModal specifically for it

### Issue 5: Missing some Radix Themes Dialog features

**Solution:**

- Identify which features are actually used
- Implement them in custom Dialog if needed
- Most modals use basic features only

---

## Alternative: Hybrid Approach

If the custom Dialog feels like too much work, consider:

**Option B: Use Radix Themes Dialog with CSS overrides**

```css
/* Force Dialog.Content to not add scroll wrapper */
.rt-DialogContent {
  overflow: visible !important;
  display: flex !important;
  flex-direction: column !important;
}

/* Let children manage their own overflow */
.rt-DialogContent > * {
  min-height: 0;
}
```

**Pros:**

- Faster (just CSS changes)
- No new components
- Keeps Radix Themes

**Cons:**

- Hacky (using !important)
- Might break in Radix Themes updates
- Less control
- May not fully solve the issue

**Recommendation:** Try this first as an experiment. If it works, great! If not, proceed with custom Dialog component.

---

## Testing Strategy

### Phase 1: Verify Custom Dialog Works (30 min)

1. Create custom Dialog component
2. Create simple test modal
3. Verify it opens/closes
4. Verify styling looks acceptable
5. Test dark mode

### Phase 2: Update BaseModal (30 min)

1. Switch to custom Dialog
2. Test with a simple modal (e.g., StoreyManagementModal)
3. Verify no regressions

### Phase 3: Fix Problem Modals (1-2 hours)

1. Fix ConstructionPlanModal layout
2. Test thoroughly in all browsers
3. Fix ConstructionViewer3DModal
4. Test for flickering
5. Verify both work in dark mode

### Phase 4: Test All Other Modals (1-2 hours)

1. Open each of the 11 other modals
2. Quick smoke test (open, interact, close)
3. Fix any issues found
4. Document any known limitations

---

## Success Criteria

✅ **Must have:**

- ConstructionPlanModal: SVG takes full height, no unwanted scrolling
- ConstructionViewer3DModal: Canvas doesn't flicker
- All 13 modals open and close correctly
- Dark mode works
- Keyboard shortcuts work (Esc to close)
- Click outside to close works

✅ **Nice to have:**

- Visual appearance matches Radix Themes closely
- Animations smooth
- No console warnings/errors
- Performance equal or better

---

## Rollback Plan

If this doesn't work:

1. **Revert file changes:**

   ```bash
   git checkout src/shared/components/BaseModal/BaseModal.tsx
   git checkout src/construction/components/ConstructionPlanModal.tsx
   git checkout src/construction/viewer3d/ConstructionViewer3DModal.tsx
   # etc.
   ```

2. **Remove new files:**

   ```bash
   rm src/components/ui/dialog.tsx
   rm src/shared/utils/cn.ts
   ```

3. **Revert dependencies:**

   ```bash
   pnpm remove clsx tailwind-merge tailwindcss-animate
   ```

4. **Try Alternative Approach:**
   - CSS override approach (Option B above)
   - Or proceed with full shadcn migration

---

## Next Steps

**Decision points:**

1. **Try CSS override first?**
   - Quickest option (30 min)
   - If it works, great!
   - If not, proceed with custom Dialog

2. **Proceed with custom Dialog?**
   - More robust solution
   - Better long-term
   - Still minimal effort

3. **Want me to implement?**
   - I can create the custom Dialog component
   - I can update BaseModal
   - I can fix the problem modals
   - I can test with you

**What do you think?** Should we:

- A) Try CSS override first (quickest)
- B) Go straight to custom Dialog component (better solution)
- C) Something else?

Let me know and I can proceed with implementation!
