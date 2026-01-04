# Migration Plan: Radix UI Themes → shadcn/ui

**Date:** 2026-01-04  
**Status:** Planning  
**Estimated Time:** 6-8 hours (Option A) or 43-56 hours (Option B)

## Executive Summary

This document outlines two approaches for migrating from Radix UI Themes to shadcn/ui, primarily motivated by Dialog component issues causing modal sizing problems and canvas flickering in the 3D viewer.

**Current State:**

- 100 files using Radix UI components
- 190 import statements
- 9 Radix UI packages installed
- Heavy usage of layout primitives (Flex, Box, Grid)

**Key Constraints:**

- Preserve CSS variables for canvas theme bridge (`CanvasThemeContext.tsx`)
- Preserve CSS variables used in SVG rendering
- Maintain dark mode via `next-themes`
- Keep `@radix-ui/react-icons` (no icon migration needed)

---

## Table of Contents

1. [Option A: Dialog-Only Fix](#option-a-dialog-only-fix)
2. [Option B: Full Migration](#option-b-full-migration)
3. [Component Mapping Reference](#component-mapping-reference)
4. [CSS Variables Strategy](#css-variables-strategy)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)

---

## Option A: Dialog-Only Fix

**Timeline:** 6-8 hours  
**Risk Level:** Low  
**Recommended:** Try this first to validate the solution

### Overview

Fix the specific Dialog scrolling/sizing/flickering issues while keeping all other Radix Themes components unchanged.

### Scope

- ✅ Replace `BaseModal.tsx` with shadcn Dialog
- ✅ Fix `ConstructionPlanModal.tsx` sizing issues
- ✅ Fix `ConstructionViewer3DModal.tsx` canvas flickering
- ✅ Update 11 other files using BaseModal
- ❌ Keep all other Radix Themes components
- ❌ No layout component changes
- ❌ No form component changes

### Benefits

- Minimal risk (only 12 files affected)
- Fast implementation
- Solves immediate pain points
- Can evaluate before full migration
- Still uses Radix primitive (same accessibility)

### Drawbacks

- Mixed UI libraries (Radix Themes + shadcn Dialog)
- Potential styling inconsistencies
- Two component systems to maintain

### Implementation Steps

#### Step 1: Install shadcn and Dialog (30 min)

```bash
# Initialize shadcn (will prompt for configuration)
npx shadcn@latest init

# Configuration choices:
# - TypeScript: Yes
# - Style: Default
# - Base color: Slate (or your preference)
# - CSS variables: Yes
# - Tailwind config: Yes (merge with existing)
# - Import alias: @/components
# - React Server Components: No

# Install only Dialog component
npx shadcn@latest add dialog
```

**Files created:**

- `src/components/ui/dialog.tsx`
- Updates to `tailwind.config.js` (merge with existing)
- Updates to `src/app/globals.css` or similar (check location)

**Action:** Manually merge Tailwind config to preserve existing customizations:

```js
// Keep existing spacing, fontSize, borderRadius, colors
// Add shadcn's theme extension
```

#### Step 2: Create new BaseModal with shadcn (2-3 hours)

**File:** `src/shared/components/BaseModal/BaseModal.tsx`

**Strategy:**

- Use shadcn Dialog primitives
- Remove Radix's automatic scroll container
- Add explicit flex layout control
- Keep same prop API for backward compatibility
- Add `overflow: hidden` and proper flex constraints

**Key changes:**

```tsx
// OLD: Radix Themes Dialog
import { Dialog } from '@radix-ui/themes'

// NEW: shadcn Dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
```

**Critical fixes:**

- Remove `Dialog.Content` automatic scroll wrapper
- Add explicit `className="flex flex-col overflow-hidden"` to content
- Use `max-height` without conflicting with Radix's internal sizing
- Test that modals don't auto-scroll content

**Template structure:**

```tsx
<Dialog.Root open={open} onOpenChange={onOpenChange}>
  {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
  <DialogContent
    className="flex flex-col overflow-hidden"
    style={{
      width: width,
      maxWidth: maxWidth,
      height: height,
      maxHeight: maxHeight,
      ...style
    }}
  >
    <DialogHeader>
      <DialogTitle className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {titleIcon}
          {title}
        </div>
        {showCloseButton && (
          <button>
            <Cross2Icon />
          </button>
        )}
      </DialogTitle>
    </DialogHeader>

    <ErrorBoundary FallbackComponent={FeatureErrorFallback} resetKeys={[open, ...resetKeys]}>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </ErrorBoundary>
  </DialogContent>
</Dialog.Root>
```

**Testing checklist:**

- [ ] Modal opens and closes
- [ ] Content doesn't auto-scroll unless needed
- [ ] Max height respected
- [ ] Dark mode works
- [ ] Close button works
- [ ] Escape key closes
- [ ] Click outside closes (if configured)

#### Step 3: Update ConstructionPlanModal (2-3 hours)

**File:** `src/construction/components/ConstructionPlanModal.tsx`

**Issues to fix:**

- Tab container doesn't steal height from SVG
- SVG container gets maximum available space without scrolling
- No flickering when resizing

**Changes:**

1. **Update Tabs to use shadcn** (if needed, or keep Radix Tabs):

```tsx
// Radix Tabs still works, but update container sizing
<Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1">
  <Tabs.List>...</Tabs.List>

  <Tabs.Content value="plan" className="flex-1 min-h-0">
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* SVG container - takes maximum space */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden border border-gray-200 dark:border-gray-700 rounded"
      >
        {/* SVG content */}
      </div>

      {/* Issues panel - fixed height */}
      <div className="flex-shrink-0">{/* Issues */}</div>
    </div>
  </Tabs.Content>
</Tabs.Root>
```

2. **Update CSS file:** `src/construction/components/ConstructionPlanModal.css`

Replace Radix-specific classes with generic selectors:

```css
/* OLD */
.plan-modal .rt-TabsRoot {
  margin-top: calc(-1 * var(--space-7));
  height: calc(100% + var(--space-7));
}

.plan-modal .rt-TabsContent[data-state='active'] {
  display: flex;
  margin-bottom: calc(2 * var(--space-3));
  flex: 1 1 100%;
  min-height: 0;
  padding: var(--space-1);
  flex-direction: column;
  gap: var(--space-1);
  overflow: hidden;
}

/* NEW - if using Radix Tabs */
.plan-modal [role='tablist'] {
  /* tab list styles */
}

.plan-modal [role='tabpanel'][data-state='active'] {
  display: flex;
  flex: 1 1 100%;
  min-height: 0;
  padding: 0.25rem;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

/* OR - if using shadcn Tabs, use Tailwind classes instead */
```

**Testing checklist:**

- [ ] SVG takes up maximum available space
- [ ] No scrollbars unless content overflows
- [ ] Tabs switch without resizing
- [ ] Issues panel visible at bottom
- [ ] Works in Chrome, Firefox, Safari

#### Step 4: Update ConstructionViewer3DModal (1-2 hours)

**File:** `src/construction/viewer3d/ConstructionViewer3DModal.tsx`

**Issues to fix:**

- Canvas container flickering between sizes
- Resize observer stability

**Changes:**

1. **Fix container sizing:**

```tsx
<div
  ref={containerRef}
  className="relative flex-1 overflow-hidden border border-gray-200 dark:border-gray-700 rounded"
  style={{
    minHeight: '500px'
    // Remove maxHeight calc that causes flickering
  }}
>
  {/* Canvas content */}
</div>
```

2. **Test resize observer:**

```tsx
// Ensure useElementSize doesn't trigger rapid updates
const [containerSize, containerRef, setObserverActive] = elementSizeRef()

useEffect(() => {
  // Only activate observer when modal is open and stable
  setObserverActive(isOpen)
}, [isOpen])
```

**Testing checklist:**

- [ ] Canvas renders at correct size
- [ ] No flickering on resize
- [ ] No flickering when opening modal
- [ ] Resize observer doesn't cause loops
- [ ] Works in all browsers (especially problematic ones)

#### Step 5: Update other modals (1-2 hours)

**Files using BaseModal (11 total):**

1. `src/building/components/StoreyManagementModal.tsx`
2. `src/construction/config/components/ConfigurationModal.tsx`
3. `src/construction/components/parts/ConstructionPartsListModal.tsx`
4. `src/construction/components/parts/PartCutModal.tsx`
5. `src/construction/components/parts/SheetPartModal.tsx`
6. `src/editor/components/MeasurementInfo.tsx`
7. `src/editor/components/RoofMeasurementInfo.tsx`
8. `src/editor/plan-overlay/components/PlanImportModal.tsx`
9. `src/editor/tools/perimeter/preset/presets/LShapedPresetDialog.tsx`
10. `src/editor/tools/perimeter/preset/presets/RectangularPresetDialog.tsx`
11. (already done: ConstructionPlanModal, ConstructionViewer3DModal)

**Strategy:**

- Most should work with new BaseModal without changes
- Test each modal
- Fix any layout issues that appear

**Testing checklist for each modal:**

- [ ] Opens correctly
- [ ] Displays content properly
- [ ] Scrolls if content too large
- [ ] Closes correctly
- [ ] Dark mode works

#### Step 6: Handle WelcomeModal separately (30 min)

**File:** `src/shared/components/WelcomeModal.tsx`

This modal uses `Dialog.Root` directly, not `BaseModal`.

**Options:**

1. Leave as-is with Radix Themes Dialog (simplest)
2. Convert to shadcn Dialog for consistency

If converting:

```tsx
// Update imports
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// Keep same structure, adjust class names
```

#### Step 7: Final testing (1 hour)

**Full modal test suite:**

- [ ] All modals open/close correctly
- [ ] ConstructionPlanModal: SVG sizing perfect, no scroll issues
- [ ] ConstructionViewer3DModal: No canvas flickering
- [ ] All other modals display correctly
- [ ] Dark mode works in all modals
- [ ] Keyboard navigation works (Esc, Tab, etc.)
- [ ] Click outside behavior correct
- [ ] Modal stacking works (modal over modal)
- [ ] Responsive behavior acceptable

**Browser testing:**

- [ ] Chrome
- [ ] Firefox
- [ ] Safari/WebKit

### Files Changed Summary

**Modified:**

- `src/shared/components/BaseModal/BaseModal.tsx` (complete rewrite)
- `src/construction/components/ConstructionPlanModal.tsx` (layout fixes)
- `src/construction/components/ConstructionPlanModal.css` (CSS updates)
- `src/construction/viewer3d/ConstructionViewer3DModal.tsx` (layout fixes)
- `src/shared/components/WelcomeModal.tsx` (optional)
- `tailwind.config.js` (merge shadcn config)

**Created:**

- `src/components/ui/dialog.tsx` (shadcn component)
- Possibly `src/app/globals.css` (if not exists, for shadcn variables)

**Unchanged:**

- All other Radix Themes components
- All layout components
- All form components
- CSS variables for canvas/SVG

### Success Criteria

- ✅ ConstructionPlanModal SVG takes full available height without scrolling
- ✅ ConstructionViewer3DModal canvas doesn't flicker on resize
- ✅ All 13 modals work correctly
- ✅ Dark mode works
- ✅ No visual regressions in non-modal components

### Rollback Plan

If issues arise:

1. Revert `BaseModal.tsx` to original
2. Uninstall shadcn: `pnpm remove @/components/ui/dialog` (or keep for future use)
3. Revert Tailwind config changes
4. Git revert all modal changes

---

## Option B: Full Migration

**Timeline:** 43-56 hours  
**Risk Level:** Medium-High  
**Recommended:** Only after Option A validates the Dialog fix

### Overview

Complete replacement of all Radix Themes components with shadcn/ui and Tailwind utilities.

### Key Decisions

- ✅ Keep `@radix-ui/react-icons` (no icon migration)
- ✅ `Callout` → Custom Alert component
- ✅ `DataList` → Custom `<dl>` component with Tailwind
- ✅ `SegmentedControl` → Custom RadioGroup component
- ✅ Layout components (Flex/Box/Grid) → Tailwind classes
- ✅ Use sed/bulk replacement for mechanical conversions
- ✅ Tailwind config adapted to shadcn defaults
- ✅ CSS variables preserved for canvas/SVG usage
- ✅ Manual testing (Playwright screenshots as sanity check)

### Migration Phases

---

### Phase 0: Setup (3-4 hours)

#### 0.1 Initialize shadcn (1 hour)

```bash
npx shadcn@latest init
```

**Configuration choices:**

- TypeScript: Yes
- Style: Default
- Base color: Slate (or choose based on preference)
- CSS variables: Yes
- Tailwind config: Yes
- Import alias: `@/components`
- React Server Components: No

**Post-init tasks:**

1. Review generated `components.json`
2. Merge `tailwind.config.js` with existing config
3. Review CSS variable file location

#### 0.2 Install shadcn components (30 min)

```bash
npx shadcn@latest add \
  dialog \
  alert-dialog \
  button \
  input \
  select \
  label \
  separator \
  card \
  tabs \
  tooltip \
  dropdown-menu \
  switch \
  hover-card \
  table \
  badge \
  skeleton \
  alert
```

**Verify installation:**

- Check `src/components/ui/` directory
- Verify each component file created
- Test a simple component renders

#### 0.3 Merge Tailwind configs (30 min)

**File:** `tailwind.config.js`

**Current config to preserve:**

```js
{
  theme: {
    extend: {
      colors: {},
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem'
      },
      spacing: {
        0.5: '0.125rem',
        1.5: '0.375rem',
        2.5: '0.625rem',
        3.5: '0.875rem'
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem'
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        lg: '0 4px 8px 0 rgba(0, 0, 0, 0.15)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class'
    })
  ]
}
```

**Merge strategy:**

1. Keep existing `extend` values
2. Add shadcn's color variables
3. Keep `@tailwindcss/forms` plugin
4. Add shadcn plugin if provided

**Expected result:**

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'], // shadcn adds this
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}' // shadcn adds this
  ],
  theme: {
    extend: {
      // shadcn colors
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        }
        // ... more shadcn colors
      },
      // Keep existing customizations
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem'
      },
      spacing: {
        0.5: '0.125rem',
        1.5: '0.375rem',
        2.5: '0.625rem',
        3.5: '0.875rem'
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        // shadcn adds these
        radius: 'var(--radius)'
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        lg: '0 4px 8px 0 rgba(0, 0, 0, 0.15)'
      },
      // shadcn animations
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class'
    }),
    require('tailwindcss-animate') // shadcn adds this
  ]
}
```

#### 0.4 Set up CSS variables (1-2 hours)

**Critical:** Map Radix variables to shadcn while preserving custom `--color-*` variables for canvas/SVG.

**File:** `src/app/index.css`

**Current structure:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root,
.canvas-theme-context {
  /* Custom color mappings using Radix variables */
  --color-primary: var(--accent-9);
  --color-primary-light: var(--accent-a5);
  --color-primary-dark: var(--accent-11);
  --color-secondary: var(--gray-9);
  --color-secondary-light: var(--gray-a5);
  --color-success: var(--green-9);
  --color-success-light: var(--green-a5);
  --color-warning: var(--amber-9);
  --color-warning-dark: var(--amber-10);
  --color-warning-light: var(--amber-a5);
  --color-danger: var(--red-9);
  --color-danger-dark: var(--red-11);
  --color-danger-light: var(--red-a5);
  --color-info: var(--blue-9);
  --color-info-light: var(--blue-a5);
  --color-text: var(--gray-12);
  --color-text-secondary: var(--gray-11);
  --color-text-tertiary: var(--gray-10);
  --color-grid-vertical: var(--red-8);
  --color-grid-horizontal: var(--green-8);
  --color-grid: var(--gray-6);
  --color-bg-subtle: var(--gray-2);
  --color-bg-canvas: var(--gray-4);
}

.rt-TextFieldRoot input:focus {
  outline: none !important;
}
```

**New structure:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn base variables */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;

    /* Custom color mappings for canvas/SVG - CRITICAL TO PRESERVE */
    --color-primary: hsl(var(--primary));
    --color-primary-light: hsl(var(--primary) / 0.3);
    --color-primary-dark: hsl(var(--primary) / 0.9);
    --color-secondary: hsl(var(--secondary));
    --color-secondary-light: hsl(var(--secondary) / 0.3);
    --color-success: 142 76% 36%;
    --color-success-light: hsl(142 76% 36% / 0.3);
    --color-warning: 38 92% 50%;
    --color-warning-dark: 38 92% 40%;
    --color-warning-light: hsl(38 92% 50% / 0.3);
    --color-danger: hsl(var(--destructive));
    --color-danger-dark: hsl(var(--destructive) / 0.9);
    --color-danger-light: hsl(var(--destructive) / 0.3);
    --color-info: 221 83% 53%;
    --color-info-light: hsl(221 83% 53% / 0.3);
    --color-text: hsl(var(--foreground));
    --color-text-secondary: hsl(var(--muted-foreground));
    --color-text-tertiary: hsl(var(--muted-foreground) / 0.7);
    --color-grid-vertical: 0 84% 60%;
    --color-grid-horizontal: 142 76% 36%;
    --color-grid: hsl(var(--border));
    --color-bg-subtle: hsl(var(--muted));
    --color-bg-canvas: hsl(var(--accent));
    --color-panel-solid: hsl(var(--background));
    --color-background: hsl(var(--background));
  }

  .dark {
    /* shadcn dark mode variables */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;

    /* Custom color mappings for canvas/SVG - dark mode */
    --color-primary: hsl(var(--primary));
    --color-primary-light: hsl(var(--primary) / 0.3);
    --color-primary-dark: hsl(var(--primary) / 0.9);
    --color-secondary: hsl(var(--secondary));
    --color-secondary-light: hsl(var(--secondary) / 0.3);
    --color-success: 142 76% 36%;
    --color-success-light: hsl(142 76% 36% / 0.3);
    --color-warning: 38 92% 50%;
    --color-warning-dark: 38 92% 40%;
    --color-warning-light: hsl(38 92% 50% / 0.3);
    --color-danger: hsl(var(--destructive));
    --color-danger-dark: hsl(var(--destructive) / 0.9);
    --color-danger-light: hsl(var(--destructive) / 0.3);
    --color-info: 221 83% 53%;
    --color-info-light: hsl(221 83% 53% / 0.3);
    --color-text: hsl(var(--foreground));
    --color-text-secondary: hsl(var(--muted-foreground));
    --color-text-tertiary: hsl(var(--muted-foreground) / 0.7);
    --color-grid-vertical: 0 84% 60%;
    --color-grid-horizontal: 142 76% 36%;
    --color-grid: hsl(var(--border));
    --color-bg-subtle: hsl(var(--muted));
    --color-bg-canvas: hsl(var(--accent));
    --color-panel-solid: hsl(var(--background));
    --color-background: hsl(var(--background));
  }
}

/* Keep canvas theme context class for CanvasThemeProvider */
.canvas-theme-context {
  /* Inherits from :root or .dark */
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Testing after setup:**

1. Run `pnpm dev`
2. Check that app still loads
3. Check dark mode toggle
4. Verify `CanvasThemeContext` still reads variables correctly
5. Check SVG rendering in construction plan

#### 0.5 Build custom components (1-2 hours)

##### Custom Alert Component (Callout replacement)

**File:** `src/components/ui/alert.tsx`

**Extend shadcn Alert to match Radix Callout API:**

```tsx
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const alertVariants = cva('relative w-full rounded-lg border p-4', {
  variants: {
    variant: {
      default: 'bg-background text-foreground',
      info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
      warning:
        'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
      destructive:
        'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive dark:bg-destructive/20',
      success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

// Root component
const AlertRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof alertVariants> & {
      color?: 'red' | 'amber' | 'blue' | 'green' // Radix Callout color prop
    }
>(({ className, variant, color, ...props }, ref) => {
  // Map Radix color prop to variant
  const mappedVariant =
    color === 'red'
      ? 'destructive'
      : color === 'amber'
        ? 'warning'
        : color === 'blue'
          ? 'info'
          : color === 'green'
            ? 'success'
            : variant

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant: mappedVariant }), 'flex items-start gap-3', className)}
      {...props}
    />
  )
})
AlertRoot.displayName = 'Alert.Root'

// Icon component
const AlertIcon = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex-shrink-0', className)} {...props}>
      {children}
    </div>
  )
)
AlertIcon.displayName = 'Alert.Icon'

// Text component
const AlertText = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed flex-1', className)} {...props} />
  )
)
AlertText.displayName = 'Alert.Text'

// Export as namespace-like object for Radix Callout API compatibility
export const Alert = {
  Root: AlertRoot,
  Icon: AlertIcon,
  Text: AlertText
}

// Also export individual components for flexibility
export { AlertRoot, AlertIcon, AlertText }
```

**Usage (matches Radix Callout):**

```tsx
<Alert.Root color="red">
  <Alert.Icon>
    <ExclamationTriangleIcon />
  </Alert.Icon>
  <Alert.Text>Error message here</Alert.Text>
</Alert.Root>
```

##### Custom DataList Component

**File:** `src/components/ui/data-list.tsx`

```tsx
import * as React from 'react'

import { cn } from '@/lib/utils'

// Root component
const DataListRoot = React.forwardRef<
  HTMLDListElement,
  React.HTMLAttributes<HTMLDListElement> & {
    size?: '1' | '2' | '3' // Match Radix size prop
  }
>(({ className, size = '2', ...props }, ref) => {
  const sizeClasses = {
    '1': 'text-xs',
    '2': 'text-sm',
    '3': 'text-base'
  }

  return <dl ref={ref} className={cn('divide-y divide-border', sizeClasses[size], className)} {...props} />
})
DataListRoot.displayName = 'DataList.Root'

// Item component
const DataListItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between py-2', className)} {...props} />
  )
)
DataListItem.displayName = 'DataList.Item'

// Label component
const DataListLabel = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    minWidth?: string
  }
>(({ className, minWidth, style, ...props }, ref) => (
  <dt
    ref={ref}
    className={cn('text-muted-foreground font-medium', className)}
    style={{ minWidth, ...style }}
    {...props}
  />
))
DataListLabel.displayName = 'DataList.Label'

// Value component
const DataListValue = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => <dd ref={ref} className={cn('text-foreground text-right', className)} {...props} />
)
DataListValue.displayName = 'DataList.Value'

// Export as namespace-like object
export const DataList = {
  Root: DataListRoot,
  Item: DataListItem,
  Label: DataListLabel,
  Value: DataListValue
}

export { DataListRoot, DataListItem, DataListLabel, DataListValue }
```

**Usage (matches Radix DataList):**

```tsx
<DataList.Root size="1">
  <DataList.Item>
    <DataList.Label minWidth="88px">Label</DataList.Label>
    <DataList.Value>Value</DataList.Value>
  </DataList.Item>
</DataList.Root>
```

##### Custom SegmentedControl Component

**File:** `src/components/ui/segmented-control.tsx`

```tsx
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as React from 'react'

import { cn } from '@/lib/utils'

// Root component
const SegmentedControlRoot = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
    size?: '1' | '2' | '3'
  }
>(({ className, size = '2', ...props }, ref) => {
  const sizeClasses = {
    '1': 'h-7 text-xs',
    '2': 'h-9 text-sm',
    '3': 'h-11 text-base'
  }

  return (
    <RadioGroupPrimitive.Root
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-md bg-muted p-1 text-muted-foreground',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
})
SegmentedControlRoot.displayName = 'SegmentedControl.Root'

// Item component
const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5',
        'ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  )
})
SegmentedControlItem.displayName = 'SegmentedControl.Item'

// Export as namespace-like object
export const SegmentedControl = {
  Root: SegmentedControlRoot,
  Item: SegmentedControlItem
}

export { SegmentedControlRoot, SegmentedControlItem }
```

**Usage (matches Radix SegmentedControl):**

```tsx
<SegmentedControl.Root size="1" value={value} onValueChange={setValue}>
  <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
  <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
</SegmentedControl.Root>
```

**Testing custom components:**

- [ ] Alert renders with all variants (info, warning, destructive, success)
- [ ] Alert matches Callout visual appearance
- [ ] DataList displays correctly
- [ ] DataList respects minWidth on labels
- [ ] SegmentedControl works with value/onValueChange
- [ ] SegmentedControl keyboard navigation works
- [ ] All components work in dark mode

---

### Phase 1: Dialog & Modal (6-8 hours)

**Same as Option A, Steps 1-7**

See detailed instructions in Option A section above.

**Key difference:** This is now part of full migration, so we can be more aggressive with changes.

---

### Phase 2: Layout Components (8-10 hours)

This is the most mechanical but time-consuming phase. We'll convert Flex/Box/Grid to Tailwind classes.

#### 2.1 Create conversion scripts (1-2 hours)

**File:** `scripts/convert-radix-layout.sh`

```bash
#!/bin/bash
# Converts Radix layout components to Tailwind classes
# Usage: ./scripts/convert-radix-layout.sh <file-path>

FILE=$1

if [ -z "$FILE" ]; then
  echo "Usage: $0 <file-path>"
  exit 1
fi

echo "Converting $FILE..."

# Backup original file
cp "$FILE" "$FILE.backup"

# Stage 1: Update imports - remove Flex, Box, Grid from Radix imports
# This is complex, so we'll do it manually or use a more sophisticated script

# Stage 2: Convert component tags
# Note: These are basic replacements. Manual review is REQUIRED after running.

# Convert <Flex to <div className="flex
sed -i 's/<Flex\s/<div className="flex /g' "$FILE"
sed -i 's/<\/Flex>/<\/div>/g' "$FILE"

# Convert <Box to <div
sed -i 's/<Box\s/<div /g' "$FILE"
sed -i 's/<\/Box>/<\/div>/g' "$FILE"

# Convert <Grid to <div className="grid
sed -i 's/<Grid\s/<div className="grid /g' "$FILE"
sed -i 's/<\/Grid>/<\/div>/g' "$FILE"

echo "Basic conversion complete. MANUAL REVIEW REQUIRED."
echo "Backup saved to: $FILE.backup"
echo ""
echo "Next steps:"
echo "1. Review the converted file"
echo "2. Convert props to Tailwind classes (see conversion table)"
echo "3. Clean up imports"
echo "4. Test the component"
```

**Note:** This script is intentionally simple. The actual conversion requires manual work because:

- Props need to be converted to className additions
- Nested components need careful handling
- Some props may be in variables or conditional

**Better approach:** Manual conversion with IDE assistance

#### 2.2 Prop conversion reference table

| Radix Prop            | Tailwind Class    | Notes                                    |
| --------------------- | ----------------- | ---------------------------------------- |
| `direction="column"`  | `flex-col`        | Add to className                         |
| `direction="row"`     | `flex-row`        | Add to className (or omit, it's default) |
| `align="start"`       | `items-start`     |                                          |
| `align="center"`      | `items-center`    |                                          |
| `align="end"`         | `items-end`       |                                          |
| `align="baseline"`    | `items-baseline`  |                                          |
| `align="stretch"`     | `items-stretch`   |                                          |
| `justify="start"`     | `justify-start`   |                                          |
| `justify="center"`    | `justify-center`  |                                          |
| `justify="end"`       | `justify-end`     |                                          |
| `justify="between"`   | `justify-between` |                                          |
| `gap="1"`             | `gap-1`           |                                          |
| `gap="2"`             | `gap-2`           |                                          |
| `gap="3"`             | `gap-3`           |                                          |
| `gap="4"`             | `gap-4`           |                                          |
| `p="0"`               | `p-0`             |                                          |
| `p="1"`               | `p-1`             |                                          |
| `p="2"`               | `p-2`             |                                          |
| `p="3"`               | `p-3`             |                                          |
| `pt="1"`              | `pt-1`            |                                          |
| `pb="2"`              | `pb-2`            |                                          |
| `pl="3"`              | `pl-3`            |                                          |
| `pr="4"`              | `pr-4`            |                                          |
| `px="2"`              | `px-2`            |                                          |
| `py="1"`              | `py-1`            |                                          |
| `m="2"`               | `m-2`             |                                          |
| `mt="1"`              | `mt-1`            |                                          |
| `mb="2"`              | `mb-2`            |                                          |
| `ml="3"`              | `ml-3`            |                                          |
| `mr="4"`              | `mr-4`            |                                          |
| `mx="auto"`           | `mx-auto`         |                                          |
| `my="2"`              | `my-2`            |                                          |
| `width="100%"`        | `w-full`          |                                          |
| `height="100%"`       | `h-full`          |                                          |
| `minWidth="0"`        | `min-w-0`         |                                          |
| `minHeight="0"`       | `min-h-0`         |                                          |
| `flexGrow="1"`        | `flex-1`          |                                          |
| `flexShrink="0"`      | `flex-shrink-0`   |                                          |
| `display="flex"`      | `flex`            | Usually implicit with Flex               |
| `display="block"`     | `block`           |                                          |
| `display="inline"`    | `inline`          |                                          |
| `position="relative"` | `relative`        |                                          |
| `position="absolute"` | `absolute`        |                                          |
| `overflow="hidden"`   | `overflow-hidden` |                                          |
| `overflow="auto"`     | `overflow-auto`   |                                          |

**Grid-specific:**
| Radix Prop | Tailwind Class | Notes |
|-----------|----------------|-------|
| `columns="2"` | `grid-cols-2` | |
| `columns="3"` | `grid-cols-3` | |
| `columns="1fr 1fr"` | `grid-cols-2` | Equal columns |
| `columns="1fr 2fr"` | Custom | Use `style={{ gridTemplateColumns: '1fr 2fr' }}` |
| `rows="2"` | `grid-rows-2` | |
| `gap="2"` | `gap-2` | Works same as Flex |

#### 2.3 Conversion strategy by example

**Before (Radix):**

```tsx
<Flex direction="column" gap="3" p="2">
  <Flex align="center" justify="between" gap="2">
    <Text size="1" weight="bold">
      Title
    </Text>
    <IconButton size="1" variant="ghost">
      <TrashIcon />
    </IconButton>
  </Flex>
  <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
    <Text>Content</Text>
  </Box>
</Flex>
```

**After (shadcn + Tailwind):**

```tsx
<div className="flex flex-col gap-3 p-2">
  <div className="flex items-center justify-between gap-2">
    <p className="text-xs font-bold">Title</p>
    <Button size="icon" variant="ghost">
      <TrashIcon />
    </Button>
  </div>
  <div className="pt-1 border-t border-border">
    <p>Content</p>
  </div>
</div>
```

**Changes:**

- `<Flex>` → `<div className="flex">`
- `direction="column"` → Add `flex-col`
- `gap="3"` → Add `gap-3`
- `p="2"` → Add `p-2`
- `align="center"` → Add `items-center`
- `justify="between"` → Add `justify-between`
- `<Box>` → `<div>`
- `pt="1"` → Add `pt-1`
- `var(--gray-6)` → `border-border` (Tailwind class) or keep CSS variable
- `<Text>` → `<p>` (will handle separately in Phase 3)
- `<IconButton>` → `<Button size="icon">` (will handle in Phase 4)

#### 2.4 Batch conversion by directory (4-6 hours)

**Recommended order (test after each batch):**

1. **Shared components** (11 files)
   - Start with simple components
   - Test foundational components work
   - Files:
     - `src/shared/components/BaseModal/BaseModal.tsx` (already done in Phase 1)
     - `src/shared/components/ErrorBoundary/ErrorFallback.tsx`
     - `src/shared/components/ErrorBoundary/FeatureErrorFallback.tsx`
     - `src/shared/components/ErrorBoundary/ModalErrorFallback.tsx`
     - `src/shared/components/LanguageSwitcher.tsx`
     - `src/shared/components/LengthField/LengthField.tsx` (defer to Phase 4)
     - `src/shared/components/SVGViewport.tsx`
     - `src/shared/components/VolumeField/VolumeField.tsx` (defer to Phase 4)
     - `src/shared/components/WelcomeModal.tsx`

2. **App components** (8 files)
   - Test app shell still works
   - Files:
     - `src/app/App.test.tsx`
     - `src/app/App.tsx`
     - `src/app/skeletons/*.tsx` (5 files)

3. **Editor status bar** (9 files)
   - Test UI controls
   - Files in `src/editor/status-bar/`

4. **Building inspectors** (13 files)
   - Test form layouts
   - Files in `src/building/components/inspectors/`
   - Heavy Flex usage, good test of conversion

5. **Construction config** (16 files)
   - Test complex forms
   - Files in `src/construction/config/components/`

6. **Editor tools** (11 files)
   - Test tool panels
   - Files in `src/editor/tools/`

7. **Construction components** (32 files)
   - Test modals and complex layouts
   - Files in `src/construction/components/`

#### 2.5 Manual cleanup pass (1-2 hours)

After batch conversion, review and fix:

1. **Complex Grid layouts:**
   - `columns="1fr 1fr 2fr"` → Use inline style or custom Tailwind class
   - Example: `style={{ gridTemplateColumns: '1fr 1fr 2fr' }}`

2. **Nested Flex patterns:**
   - Ensure proper nesting
   - Check that all closing tags match

3. **Mixed inline styles and props:**
   - Some components have both `style={}` and Radix props
   - Merge properly: `className="flex gap-2" style={{ borderTop: '1px solid...' }}`

4. **Conditional classes:**
   - Use `cn()` utility for conditional classes
   - Example: `className={cn("flex gap-2", isActive && "bg-primary")}`

5. **Clean up imports:**
   - Remove Flex, Box, Grid from Radix imports
   - Remove entire `@radix-ui/themes` import if no other components used

**Verification checklist:**

- [ ] All Flex components converted
- [ ] All Box components converted
- [ ] All Grid components converted
- [ ] No orphaned closing tags
- [ ] className properly formatted
- [ ] Imports cleaned up
- [ ] App runs without errors
- [ ] Visual appearance acceptable

---

### Phase 3: Typography (3-4 hours)

#### 3.1 Create Tailwind text utilities (30 min)

**Option 1:** Add to Tailwind config

```js
// tailwind.config.js
{
  theme: {
    extend: {
      // Add custom text color utilities if needed
    }
  }
}
```

**Option 2:** Create custom CSS classes in index.css

```css
@layer utilities {
  .text-primary {
    color: hsl(var(--primary));
  }
  .text-muted {
    color: hsl(var(--muted-foreground));
  }
  /* Add others as needed */
}
```

#### 3.2 Text component conversion reference

| Radix Text Prop    | Replacement                 | Example             |
| ------------------ | --------------------------- | ------------------- |
| `<Text>`           | `<p>`, `<span>`, or `<div>` | Choose semantic tag |
| `size="1"`         | `text-xs`                   | 0.75rem             |
| `size="2"`         | `text-sm`                   | 0.875rem            |
| `size="3"`         | `text-base`                 | 1rem                |
| `size="4"`         | `text-lg`                   | 1.125rem            |
| `size="5"`         | `text-xl`                   | 1.25rem             |
| `size="6"`         | `text-2xl`                  | 1.5rem              |
| `weight="light"`   | `font-light`                |                     |
| `weight="regular"` | `font-normal`               |                     |
| `weight="medium"`  | `font-medium`               |                     |
| `weight="bold"`    | `font-bold`                 |                     |
| `color="gray"`     | `text-muted-foreground`     |                     |
| `color="red"`      | `text-destructive`          |                     |
| `align="left"`     | `text-left`                 |                     |
| `align="center"`   | `text-center`               |                     |
| `align="right"`    | `text-right`                |                     |
| `as="div"`         | `<div>`                     | Use appropriate tag |
| `as="span"`        | `<span>`                    |                     |

#### 3.3 Convert Text components (2-2.5 hours)

**Strategy:**

1. Decide on semantic tag (`p`, `span`, `div`)
2. Convert props to Tailwind classes
3. Handle special cases (colors, as prop)

**Example conversions:**

```tsx
// Before
<Text size="1" color="gray" weight="medium">
  {t($ => $.label)}
</Text>

// After
<p className="text-xs text-muted-foreground font-medium">
  {t($ => $.label)}
</p>

// Before
<Text weight="bold">{t($ => $.title)}</Text>

// After
<p className="font-bold">{t($ => $.title)}</p>

// Before
<Text as="div" size="2">
  {content}
</Text>

// After
<div className="text-sm">
  {content}
</div>
```

**Files with heavy Text usage (prioritize):**

- All inspector files
- All configuration files
- Status bar components
- Modal components

#### 3.4 Convert Heading components (1 hour)

**Conversion reference:**

| Radix Heading        | Replacement | Classes                   |
| -------------------- | ----------- | ------------------------- |
| `<Heading size="1">` | `<h1>`      | `text-2xl font-semibold`  |
| `<Heading size="2">` | `<h2>`      | `text-xl font-semibold`   |
| `<Heading size="3">` | `<h3>`      | `text-lg font-semibold`   |
| `<Heading size="4">` | `<h4>`      | `text-base font-semibold` |

**Example:**

```tsx
// Before
<Heading size="2" mb="2">
  {t($ => $.perimeter.wallConfiguration)}
</Heading>

// After
<h2 className="text-xl font-semibold mb-2">
  {t($ => $.perimeter.wallConfiguration)}
</h2>
```

#### 3.5 Convert Code/Kbd (30 min)

**Code component:**

```tsx
// Before
<Code>{variable}</Code>

// After
<code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
  {variable}
</code>
```

**Kbd component:**

**Option 1:** Create custom component

```tsx
// src/components/ui/kbd.tsx
export function Kbd({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
```

**Option 2:** Inline styling

```tsx
// Before
<Kbd>Ctrl+S</Kbd>

// After
<kbd className="inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
  Ctrl+S
</kbd>
```

---

### Phase 4: Interactive Components (10-12 hours)

#### 4.1 Form components (4-5 hours)

##### TextField → Input

**LengthField wrapper update:**

**File:** `src/shared/components/LengthField/LengthField.tsx`

This is complex because it uses `TextField.Root` with slots. Need to recreate with shadcn Input.

**Strategy:**

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const LengthField = forwardRef<HTMLInputElement, LengthFieldProps>(function LengthField(
  {
    /* props */
  },
  ref
) {
  // ... existing logic ...

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={e => handleChange(e.target.value)}
        onBlur={handleBlurEvent}
        onFocus={handleFocusEvent}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'pr-16 text-right', // Space for unit and buttons
          !isValid && 'border-destructive',
          className
        )}
        style={style}
        {...props}
      />

      {/* Unit display and spinner buttons */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <span className="text-xs text-muted-foreground">{unit}</span>

        <div className="flex flex-col">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || !canStepUp}
            onClick={stepUp}
            className="h-[10px] w-[12px] p-0"
            tabIndex={-1}
          >
            <ChevronUpIcon className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || !canStepDown}
            onClick={stepDown}
            className="h-[10px] w-[12px] p-0"
            tabIndex={-1}
          >
            <ChevronDownIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
})
```

**Direct TextField usages (6 files):**

- Convert to shadcn `Input`
- Most are simple text inputs without slots

##### Select

**Files with Select (7 uses):**

- Replace with shadcn `Select`
- API is very similar

**Example:**

```tsx
// Before
import { Select } from '@radix-ui/themes'

<Select.Root value={value} onValueChange={onChange}>
  <Select.Trigger />
  <Select.Content>
    <Select.Item value="1">Option 1</Select.Item>
    <Select.Item value="2">Option 2</Select.Item>
  </Select.Content>
</Select.Root>

// After
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**Assembly select wrappers:**

- `WallAssemblySelectWithEdit`
- `RingBeamAssemblySelectWithEdit`
- `FloorAssemblySelectWithEdit`
- `RoofAssemblySelectWithEdit`
- `OpeningAssemblySelectWithEdit`

Update these to use shadcn Select.

##### Label

**Files with Label (17 files):**

**Before:**

```tsx
import * as Label from '@radix-ui/react-label'

;<Label.Root htmlFor="input-id">Label text</Label.Root>
```

**After:**

```tsx
import { Label } from '@/components/ui/label'

;<Label htmlFor="input-id">Label text</Label>
```

**Note:** shadcn Label uses the same Radix primitive, so this is mostly import changes.

##### Switch

**File:** (1 usage - find and convert)

```tsx
// Before
import { Switch } from '@radix-ui/themes'

<Switch checked={checked} onCheckedChange={setChecked} />

// After
import { Switch } from "@/components/ui/switch"

<Switch checked={checked} onCheckedChange={setChecked} />
```

#### 4.2 Buttons (3-4 hours)

##### Button

**Conversion reference:**

| Radix Button Prop   | shadcn Button Prop      | Notes           |
| ------------------- | ----------------------- | --------------- |
| `variant="solid"`   | `variant="default"`     | Default variant |
| `variant="soft"`    | `variant="secondary"`   |                 |
| `variant="outline"` | `variant="outline"`     | Same            |
| `variant="ghost"`   | `variant="ghost"`       | Same            |
| `size="1"`          | `size="sm"`             |                 |
| `size="2"`          | `size="default"`        |                 |
| `size="3"`          | `size="lg"`             |                 |
| `color="red"`       | `variant="destructive"` |                 |
| `highContrast`      | (no direct equivalent)  | Adjust variant  |

**Example:**

```tsx
// Before
import { Button } from '@radix-ui/themes'

<Button size="3" onClick={onAccept}>
  {t($ => $.continueButton)}
</Button>

// After
import { Button } from "@/components/ui/button"

<Button size="lg" onClick={onAccept}>
  {t($ => $.continueButton)}
</Button>
```

**Files with Button usage (18 total):**

- WelcomeModal
- ErrorFallback components
- Preset dialogs
- Configuration modals
- etc.

##### IconButton

**IconButton doesn't exist in shadcn - use Button with size="icon"**

**Conversion:**

```tsx
// Before
import { IconButton } from '@radix-ui/themes'

<IconButton size="2" variant="ghost" onClick={handleClick}>
  <TrashIcon />
</IconButton>

// After
import { Button } from "@/components/ui/button"

<Button size="icon" variant="ghost" onClick={handleClick}>
  <TrashIcon className="h-4 w-4" />
</Button>
```

**Files with IconButton usage (35 total):**

- All inspector files
- Status bar components
- Modal close buttons
- Tool panels
- etc.

**Note:** May need to adjust icon sizes with className

#### 4.3 Menus & Overlays (2-3 hours)

##### DropdownMenu (6 uses)

**API is very similar between Radix Themes and shadcn:**

```tsx
// Before
import { DropdownMenu } from '@radix-ui/themes'

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <IconButton>...</IconButton>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onClick={handler}>Item</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

// After
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="icon">...</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handler}>Item</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Key differences:**

- No `.Root` - component is `<DropdownMenu>`
- `asChild` prop on Trigger to compose with Button
- Component names are `DropdownMenuItem` not `DropdownMenu.Item`

##### Tooltip (7 uses)

```tsx
// Before
import { Tooltip } from '@radix-ui/themes'

<Tooltip content="Tooltip text">
  <IconButton>...</IconButton>
</Tooltip>

// After
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon">...</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Tooltip text</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Note:** May want to wrap app in single `TooltipProvider` instead of per-tooltip.

##### HoverCard (2 uses)

Similar pattern to Tooltip - mostly import and structure changes.

##### Tabs (3 uses + modals)

**API is very similar:**

```tsx
// Before
import { Tabs } from '@radix-ui/themes'

<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">Content 1</Tabs.Content>
  <Tabs.Content value="tab2">Content 2</Tabs.Content>
</Tabs.Root>

// After
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

##### SegmentedControl (7 uses)

Use custom component created in Phase 0.

```tsx
// Before
import { SegmentedControl } from '@radix-ui/themes'

<SegmentedControl.Root
  size="1"
  value={value}
  onValueChange={setValue}
>
  <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
  <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
</SegmentedControl.Root>

// After
import { SegmentedControl } from "@/components/ui/segmented-control"

<SegmentedControl.Root
  size="1"
  value={value}
  onValueChange={setValue}
>
  <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
  <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
</SegmentedControl.Root>
```

**Same API!**

##### Toolbar (2 uses)

**Option 1:** Keep `@radix-ui/react-toolbar` primitive
**Option 2:** Replace with flex layout

**Files:**

- `src/editor/MainToolbar.tsx`
- `src/app/skeletons/ToolbarSkeleton.tsx`

**If replacing:**

```tsx
// Before
import * as Toolbar from '@radix-ui/react-toolbar'

<Toolbar.Root>
  <Toolbar.Button>...</Toolbar.Button>
</Toolbar.Root>

// After
<div className="flex items-center gap-2 p-2 border-b">
  <Button>...</Button>
</div>
```

---

### Phase 5: Display Components (4-5 hours)

#### 5.1 Callout → Alert (2-3 hours)

Use custom Alert component created in Phase 0.

**Files with Callout (19 uses):**

- Inspector files
- Error fallbacks
- WelcomeModal
- Tool panels
- etc.

**Conversion:**

```tsx
// Before
import { Callout } from '@radix-ui/themes'

<Callout.Root color="red">
  <Callout.Icon>
    <ExclamationTriangleIcon />
  </Callout.Icon>
  <Callout.Text>
    <Text weight="bold">Error</Text>
    <br />
    Error message
  </Callout.Text>
</Callout.Root>

// After
import { Alert } from "@/components/ui/alert"

<Alert.Root color="red">
  <Alert.Icon>
    <ExclamationTriangleIcon />
  </Alert.Icon>
  <Alert.Text>
    <p className="font-bold">Error</p>
    <p>Error message</p>
  </Alert.Text>
</Alert.Root>
```

**API is identical!** Just import change.

**Color mapping:**

- `color="red"` → `color="red"` (maps to `variant="destructive"`)
- `color="amber"` → `color="amber"` (maps to `variant="warning"`)
- `color="blue"` → `color="blue"` (maps to `variant="info"`)
- `color="green"` → `color="green"` (maps to `variant="success"`)

#### 5.2 DataList (1-2 hours)

Use custom DataList component created in Phase 0.

**Files with DataList (6 uses):**

- Inspector files

**Conversion:**

```tsx
// Before
import { DataList } from '@radix-ui/themes'

<DataList.Root size="1">
  <DataList.Item>
    <DataList.Label minWidth="88px">Label</DataList.Label>
    <DataList.Value>Value</DataList.Value>
  </DataList.Item>
</DataList.Root>

// After
import { DataList } from "@/components/ui/data-list"

<DataList.Root size="1">
  <DataList.Item>
    <DataList.Label minWidth="88px">Label</DataList.Label>
    <DataList.Value>Value</DataList.Value>
  </DataList.Item>
</DataList.Root>
```

**API is identical!** Just import change.

#### 5.3 Other display components (1 hour)

##### Card (9 uses)

```tsx
// Before
import { Card } from '@radix-ui/themes'

<Card>
  Content
</Card>

// After
import { Card, CardContent } from "@/components/ui/card"

<Card>
  <CardContent>
    Content
  </CardContent>
</Card>
```

**Note:** shadcn Card has more structure (Header, Content, Footer). Adjust as needed.

##### Separator (14 uses)

```tsx
// Before
import { Separator } from '@radix-ui/themes'

<Separator size="4" />

// After
import { Separator } from "@/components/ui/separator"

<Separator />
```

**Simple replacement.**

##### Table (2 uses)

shadcn Table has more structure. Convert accordingly.

##### Skeleton (6 uses)

```tsx
// Before
import { Skeleton } from '@radix-ui/themes'

<Skeleton height="95vh" />

// After
import { Skeleton } from "@/components/ui/skeleton"

<Skeleton className="h-[95vh]" />
```

**Convert size props to Tailwind classes.**

##### Spinner (3 uses)

No shadcn Spinner. Options:

1. Use loading icon from `@radix-ui/react-icons`
2. Create custom spinner component
3. Use animation with icon

**Example custom spinner:**

```tsx
import { ReloadIcon } from '@radix-ui/react-icons'

;<ReloadIcon className="h-4 w-4 animate-spin" />
```

---

### Phase 6: CSS Variables & Inline Styles (3-4 hours)

#### 6.1 Update inline styles (2-3 hours)

**Find all inline CSS variable usage:**

```bash
rg "var\(--gray-|var\(--accent-|var\(--amber-|var\(--red-|var\(--blue-|var\(--green-" src/
```

**Common replacements:**

| Old Variable      | New Approach                           | Example                                                |
| ----------------- | -------------------------------------- | ------------------------------------------------------ |
| `var(--gray-6)`   | Tailwind class or `hsl(var(--border))` | `border-border` or `borderColor: 'hsl(var(--border))'` |
| `var(--gray-11)`  | `hsl(var(--muted-foreground))`         |                                                        |
| `var(--gray-12)`  | `hsl(var(--foreground))`               |                                                        |
| `var(--accent-9)` | `hsl(var(--primary))`                  |                                                        |
| `var(--amber-10)` | Keep or use custom variable            | For SVG fills                                          |
| `var(--red-9)`    | `hsl(var(--destructive))`              |                                                        |

**Files to update:**

- `src/editor/status-bar/StatusBar.tsx` - border colors
- `src/building/components/inspectors/*.tsx` - border colors
- `src/editor/components/MeasurementInfo.tsx` - SVG fills/strokes
- `src/editor/components/RoofMeasurementInfo.tsx` - SVG fills/strokes
- `src/construction/components/parts/*.tsx` - SVG strokes
- `src/building/components/inspectors/OpeningPreview.tsx` - SVG fills/strokes
- etc.

**Strategy for SVGs:**

- **Option 1:** Keep using CSS variables (recommended for SVGs)
  - Just ensure variables are defined in new CSS
  - Example: Keep `var(--amber-10)` for construction diagrams
- **Option 2:** Convert to shadcn variables
  - Only if exact equivalent exists
  - May lose color precision

**Recommendation:** Keep `var(--gray-X)`, `var(--amber-X)`, etc. for SVG usage, define them in CSS based on shadcn theme.

**Updated CSS for Radix color scale:**

```css
@layer base {
  :root {
    /* shadcn variables ... */

    /* Radix color scale for SVGs and special cases */
    --gray-1: 0 0% 99%;
    --gray-2: 0 0% 97.3%;
    --gray-4: 0 0% 93.7%;
    --gray-5: 0 0% 91.9%;
    --gray-6: 0 0% 89.5%;
    --gray-7: 0 0% 86.2%;
    --gray-8: 0 0% 80.8%;
    --gray-9: 0 0% 56.1%;
    --gray-10: 0 0% 52.3%;
    --gray-11: 0 0% 43.5%;
    --gray-12: 0 0% 9%;

    --amber-9: 39 100% 57%;
    --amber-10: 35 100% 52%;
    --amber-11: 30 100% 34%;

    --red-8: 0 93% 67%;
    --green-8: 142 71% 45%;

    /* ... add others as needed for SVG usage */
  }

  .dark {
    /* shadcn dark variables ... */

    /* Radix color scale for dark mode */
    --gray-1: 0 0% 8.5%;
    --gray-2: 0 0% 11%;
    --gray-4: 0 0% 14.9%;
    --gray-5: 0 0% 16.7%;
    --gray-6: 0 0% 18.8%;
    --gray-7: 0 0% 21.6%;
    --gray-8: 0 0% 28.5%;
    --gray-9: 0 0% 43.9%;
    --gray-10: 0 0% 49.4%;
    --gray-11: 0 0% 62.8%;
    --gray-12: 0 0% 93%;

    /* ... amber, red, green for dark mode */
  }
}
```

**This preserves SVG rendering while using shadcn for UI components.**

#### 6.2 Verify CanvasThemeContext (1 hour)

**File:** `src/shared/theme/CanvasThemeContext.tsx`

**Current implementation:**

- Reads CSS variables from DOM
- Provides colors to Konva canvas

**Ensure it still works:**

1. Verify all `--color-*` variables are defined in new CSS
2. Test in light mode
3. Test in dark mode
4. Verify canvas renders with correct colors
5. Test theme switching

**Testing checklist:**

- [ ] Canvas grid colors correct (light)
- [ ] Canvas grid colors correct (dark)
- [ ] Canvas shapes use correct colors
- [ ] Canvas text readable
- [ ] Theme toggle updates canvas immediately
- [ ] No console errors about missing variables

---

### Phase 7: Cleanup (2-3 hours)

#### 7.1 Remove Radix Themes dependencies (1 hour)

```bash
# Remove Radix Themes and related packages
pnpm remove @radix-ui/themes \
  @radix-ui/react-dialog \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-tabs \
  @radix-ui/react-tooltip

# Keep these:
# @radix-ui/react-icons - still using
# @radix-ui/react-label - shadcn uses it
```

**Note:** `@radix-ui/react-toolbar` - decide based on Phase 4 Toolbar approach.

#### 7.2 Update imports and providers (30 min)

**File:** `src/app/main.tsx`

**Remove:**

```tsx
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
```

**Remove Theme wrapper:**

```tsx
// Before
<ThemeProvider attribute="class">
  <Theme>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  </Theme>
</ThemeProvider>

// After
<ThemeProvider attribute="class">
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>
</ThemeProvider>
```

**Add TooltipProvider if needed:**

```tsx
import { TooltipProvider } from '@/components/ui/tooltip'

;<ThemeProvider attribute="class">
  <TooltipProvider>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  </TooltipProvider>
</ThemeProvider>
```

#### 7.3 Update Vite config (15 min)

**File:** `vite.config.ts`

**Remove or update vendor-radix chunk:**

```ts
// Before
'vendor-radix': [
  '@radix-ui/react-dialog',
  '@radix-ui/react-icons',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toolbar',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-label',
  '@radix-ui/themes'
],

// After (keep only what's still used)
'vendor-radix': [
  '@radix-ui/react-icons',
  '@radix-ui/react-label',
  // @radix-ui/react-toolbar if kept
],
```

Or remove the chunk entirely if only icons remain.

#### 7.4 Clean up unused imports (15 min)

Run through codebase and remove any leftover Radix Themes imports:

```bash
# Find files that might still have Radix Themes imports
rg "@radix-ui/themes" src/

# Review and clean up
```

ESLint should also catch unused imports - run:

```bash
pnpm lint
```

#### 7.5 Update documentation (30 min)

**Files to update:**

- `README.md` - Update component library mention
- `CONTRIBUTING.md` - If exists, update setup instructions
- `docs/codebase-review.md` - Update if it mentions Radix Themes
- `package.json` - Verify scripts still work

**Add note about shadcn:**

- How to add new components: `npx shadcn@latest add <component>`
- Where components live: `src/components/ui/`
- Custom components: `Alert`, `DataList`, `SegmentedControl`

---

### Phase 8: Testing & Fixes (4-6 hours)

#### 8.1 Component testing (1-2 hours)

**Run test suite:**

```bash
pnpm test -- --pool=threads
```

**Expected issues:**

- Snapshot tests will fail (DOM structure changed)
- Some component tests may need updates

**Update snapshots:**

```bash
pnpm test -- -u
```

**Review snapshot changes:**

- Ensure changes are expected
- Verify structure makes sense
- Check accessibility attributes still present

**Fix broken tests:**

- Update selectors if needed
- Update test utilities
- Fix any logic issues exposed by migration

#### 8.2 Visual QA (2-3 hours)

**Comprehensive test checklist:**

**Modals & Dialogs:**

- [ ] All modals open/close correctly
- [ ] ConstructionPlanModal: SVG sizing perfect, no scroll issues
- [ ] ConstructionPlanModal: Tabs work, content displays
- [ ] ConstructionPlanModal: Issues panel visible
- [ ] ConstructionViewer3DModal: No canvas flickering
- [ ] ConstructionViewer3DModal: Canvas renders correctly
- [ ] ConfigurationModal: All tabs and forms work
- [ ] WelcomeModal: Displays correctly on first visit
- [ ] Preset dialogs: Forms work correctly
- [ ] Part modals: SVG previews display
- [ ] Modal stacking works (modal over modal)

**Forms & Inputs:**

- [ ] LengthField: Input works, spinners work
- [ ] LengthField: Validation works
- [ ] All Select components: Dropdown opens, selection works
- [ ] Assembly selects: Edit buttons work
- [ ] Switch components: Toggle works
- [ ] Labels: Associated correctly with inputs

**Inspectors:**

- [ ] PerimeterInspector: Layout correct, all sections display
- [ ] PerimeterInspector: DataList displays correctly
- [ ] PerimeterInspector: Form inputs work
- [ ] PerimeterInspector: Callout warnings display
- [ ] WallInspector: Same checks
- [ ] RoofInspector: Same checks
- [ ] OpeningInspector: Same checks
- [ ] All other inspectors: Basic checks

**Configuration Panels:**

- [ ] Material configuration: List displays, editing works
- [ ] Assembly configurations: All types work
- [ ] Layer editor: Add/remove/reorder works

**Layout & Navigation:**

- [ ] Main toolbar: Tools accessible, tooltips work
- [ ] Status bar: All components visible and functional
- [ ] Side panel: Proper scrolling, all content accessible
- [ ] Editor canvas: Not affected by UI changes

**Theme & Colors:**

- [ ] Light mode: All components styled correctly
- [ ] Dark mode: All components styled correctly
- [ ] Theme toggle: Switches smoothly
- [ ] Canvas theme: Konva colors correct in light mode
- [ ] Canvas theme: Konva colors correct in dark mode
- [ ] SVG diagrams: Colors correct in both modes

**Interactive Elements:**

- [ ] All buttons: Click handlers work
- [ ] IconButtons: Render correctly, proper size
- [ ] Tooltips: Appear on hover, correct content
- [ ] Dropdown menus: Open, items clickable
- [ ] SegmentedControl: Selection works
- [ ] Tabs: Switching works

**Display Components:**

- [ ] Cards: Display correctly
- [ ] Separators: Visible and positioned correctly
- [ ] Skeletons: Show during loading
- [ ] Spinners/loaders: Animate correctly
- [ ] Alert/Callout: Icons and colors correct

**Edge Cases:**

- [ ] Long content: Scrolling works where expected
- [ ] Empty states: Display correctly
- [ ] Error states: Error boundaries work
- [ ] Loading states: Suspense boundaries work
- [ ] Responsive: Acceptable on different screen sizes

#### 8.3 Browser testing (1 hour)

Test critical flows in:

**Chrome:**

- [ ] App loads
- [ ] Modals work
- [ ] Canvas doesn't flicker
- [ ] Forms work
- [ ] Dark mode works

**Firefox:**

- [ ] Same checklist as Chrome

**Safari/WebKit:**

- [ ] Same checklist as Chrome
- [ ] Especially check canvas flickering (original issue)

**Playwright screenshot tests:**

```bash
pnpm playwright test
```

- [ ] Review any failed screenshots
- [ ] Update baseline if changes are expected
- [ ] Fix if regressions found

#### 8.4 Performance check (30 min)

**Bundle size:**

```bash
pnpm build
```

Check output:

- Overall bundle size vs. before
- Vendor chunks size
- Are we loading less code now?

**Runtime performance:**

- App startup time
- Modal open time
- Canvas rendering speed
- No performance regressions

#### 8.5 Fix issues (1-2 hours buffer)

Reserve time for fixing issues discovered during testing.

**Common issues to watch for:**

- Missing dark mode colors
- Incorrect spacing
- Broken layouts in edge cases
- Accessibility issues
- Console errors/warnings

---

## Component Mapping Reference

### Complete Radix → shadcn Mapping

| Radix Component      | shadcn Replacement          | Notes                                   |
| -------------------- | --------------------------- | --------------------------------------- |
| `Dialog`             | `Dialog`                    | shadcn uses same primitive, cleaner API |
| `AlertDialog`        | `AlertDialog`               | Similar API                             |
| `Button`             | `Button`                    | Size/variant prop differences           |
| `IconButton`         | `Button size="icon"`        | No separate IconButton                  |
| `TextField`          | `Input`                     | Simpler component                       |
| `Select`             | `Select`                    | Similar API, different structure        |
| `Label`              | `Label`                     | Same primitive                          |
| `Switch`             | `Switch`                    | Same primitive                          |
| `Separator`          | `Separator`                 | Direct replacement                      |
| `Tabs`               | `Tabs`                      | Similar API                             |
| `Tooltip`            | `Tooltip`                   | Needs TooltipProvider                   |
| `DropdownMenu`       | `DropdownMenu`              | Similar API                             |
| `HoverCard`          | `HoverCard`                 | Similar API                             |
| `Card`               | `Card`                      | More structured (Header/Content/Footer) |
| `Table`              | `Table`                     | More structured                         |
| `Skeleton`           | `Skeleton`                  | Convert size props to classes           |
| `Badge`              | `Badge`                     | Direct replacement                      |
| **Callout**          | **Custom Alert**            | Build custom component                  |
| **DataList**         | **Custom DataList**         | Build custom component                  |
| **SegmentedControl** | **Custom SegmentedControl** | Build custom component                  |
| `Flex`               | `<div className="flex">`    | Use Tailwind                            |
| `Box`                | `<div>`                     | Use Tailwind                            |
| `Grid`               | `<div className="grid">`    | Use Tailwind                            |
| `Text`               | `<p>`, `<span>`, `<div>`    | Use Tailwind                            |
| `Heading`            | `<h1>`-`<h6>`               | Use Tailwind                            |
| `Code`               | `<code>`                    | Use Tailwind or inline styles           |
| `Kbd`                | Custom or `<kbd>`           | Build if needed                         |
| `Spinner`            | Icon with animation         | No built-in spinner                     |
| `Link`               | `<a>`                       | Native element                          |
| `Inset`              | `<div>` with padding        | Use Tailwind                            |
| `Theme`              | Remove                      | Use ThemeProvider only                  |
| `Toolbar`            | Keep primitive or replace   | Decision needed                         |

---

## CSS Variables Strategy

### Dual Variable System

Maintain two sets of variables:

1. **shadcn UI variables** - For UI components
2. **Custom color variables** - For canvas/SVG rendering

### Variable Mapping

**In `src/app/index.css`:**

```css
@layer base {
  :root {
    /* ===== shadcn UI Variables ===== */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;

    /* ===== Custom Canvas/SVG Variables ===== */
    /* These are consumed by CanvasThemeContext and SVG components */
    --color-primary: hsl(var(--primary));
    --color-primary-light: hsl(var(--primary) / 0.3);
    --color-primary-dark: hsl(var(--primary) / 0.9);
    --color-secondary: hsl(var(--secondary));
    --color-secondary-light: hsl(var(--secondary) / 0.3);
    --color-success: hsl(142 76% 36%);
    --color-success-light: hsl(142 76% 36% / 0.3);
    --color-warning: hsl(38 92% 50%);
    --color-warning-dark: hsl(38 92% 40%);
    --color-warning-light: hsl(38 92% 50% / 0.3);
    --color-danger: hsl(var(--destructive));
    --color-danger-dark: hsl(var(--destructive) / 0.9);
    --color-danger-light: hsl(var(--destructive) / 0.3);
    --color-info: hsl(221 83% 53%);
    --color-info-light: hsl(221 83% 53% / 0.3);
    --color-text: hsl(var(--foreground));
    --color-text-secondary: hsl(var(--muted-foreground));
    --color-text-tertiary: hsl(var(--muted-foreground) / 0.7);
    --color-grid-vertical: hsl(0 84% 60%);
    --color-grid-horizontal: hsl(142 76% 36%);
    --color-grid: hsl(var(--border));
    --color-bg-subtle: hsl(var(--muted));
    --color-bg-canvas: hsl(var(--accent));
    --color-panel-solid: hsl(var(--background));
    --color-background: hsl(var(--background));

    /* ===== Radix Color Scale for SVG Rendering ===== */
    /* Keep specific color values for SVG fills/strokes */
    --gray-1: hsl(0 0% 99%);
    --gray-2: hsl(0 0% 97.3%);
    --gray-4: hsl(0 0% 93.7%);
    --gray-5: hsl(0 0% 91.9%);
    --gray-6: hsl(0 0% 89.5%);
    --gray-7: hsl(0 0% 86.2%);
    --gray-8: hsl(0 0% 80.8%);
    --gray-9: hsl(0 0% 56.1%);
    --gray-10: hsl(0 0% 52.3%);
    --gray-11: hsl(0 0% 43.5%);
    --gray-12: hsl(0 0% 9%);
    --amber-9: hsl(39 100% 57%);
    --amber-10: hsl(35 100% 52%);
    --red-8: hsl(0 93% 67%);
    --green-8: hsl(142 71% 45%);
    --ruby-10: hsl(358 75% 59%);
  }

  .dark {
    /* ===== shadcn UI Variables (Dark) ===== */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;

    /* ===== Custom Canvas/SVG Variables (Dark) ===== */
    --color-primary: hsl(var(--primary));
    --color-primary-light: hsl(var(--primary) / 0.3);
    --color-primary-dark: hsl(var(--primary) / 0.9);
    --color-secondary: hsl(var(--secondary));
    --color-secondary-light: hsl(var(--secondary) / 0.3);
    --color-success: hsl(142 76% 36%);
    --color-success-light: hsl(142 76% 36% / 0.3);
    --color-warning: hsl(38 92% 50%);
    --color-warning-dark: hsl(38 92% 40%);
    --color-warning-light: hsl(38 92% 50% / 0.3);
    --color-danger: hsl(var(--destructive));
    --color-danger-dark: hsl(var(--destructive) / 0.9);
    --color-danger-light: hsl(var(--destructive) / 0.3);
    --color-info: hsl(221 83% 53%);
    --color-info-light: hsl(221 83% 53% / 0.3);
    --color-text: hsl(var(--foreground));
    --color-text-secondary: hsl(var(--muted-foreground));
    --color-text-tertiary: hsl(var(--muted-foreground) / 0.7);
    --color-grid-vertical: hsl(0 84% 60%);
    --color-grid-horizontal: hsl(142 76% 36%);
    --color-grid: hsl(var(--border));
    --color-bg-subtle: hsl(var(--muted));
    --color-bg-canvas: hsl(var(--accent));
    --color-panel-solid: hsl(var(--background));
    --color-background: hsl(var(--background));

    /* ===== Radix Color Scale for SVG Rendering (Dark) ===== */
    --gray-1: hsl(0 0% 8.5%);
    --gray-2: hsl(0 0% 11%);
    --gray-4: hsl(0 0% 14.9%);
    --gray-5: hsl(0 0% 16.7%);
    --gray-6: hsl(0 0% 18.8%);
    --gray-7: hsl(0 0% 21.6%);
    --gray-8: hsl(0 0% 28.5%);
    --gray-9: hsl(0 0% 43.9%);
    --gray-10: hsl(0 0% 49.4%);
    --gray-11: hsl(0 0% 62.8%);
    --gray-12: hsl(0 0% 93%);
    --amber-9: hsl(39 100% 57%);
    --amber-10: hsl(35 100% 52%);
    --red-8: hsl(0 93% 67%);
    --green-8: hsl(142 71% 45%);
    --ruby-10: hsl(358 75% 59%);
  }
}

/* Canvas theme context inherits from :root or .dark */
.canvas-theme-context {
  display: contents;
}
```

### Usage Guidelines

**For UI components:**

```tsx
// Use Tailwind classes that reference shadcn variables
<div className="bg-background text-foreground border-border">

// Or in inline styles
<div style={{ backgroundColor: 'hsl(var(--background))' }}>
```

**For canvas/SVG:**

```tsx
// Use custom --color-* variables
<div style={{ backgroundColor: 'var(--color-bg-canvas)' }}>

// SVG fills
<rect fill="var(--gray-7)" stroke="var(--gray-12)" />
```

**CanvasThemeContext continues to work:**

```tsx
// Reads --color-* variables from DOM
const colors = useCanvasTheme()
// colors.primary, colors.bgCanvas, etc.
```

---

## Testing Strategy

### Test Levels

1. **Unit Tests** - Component behavior
2. **Integration Tests** - Component interactions
3. **Visual Tests** - Playwright screenshots
4. **Manual Tests** - User flows

### Test Approach

**Automated Tests:**

- Run after each phase
- Update snapshots when DOM changes
- Fix broken tests immediately
- Don't proceed to next phase if tests fail

**Manual Tests:**

- Create checklist (see Phase 8.2)
- Test in all target browsers
- Test both light and dark mode
- Test responsive behavior

**Visual Regression:**

- Use Playwright screenshot tests as sanity check
- Not comprehensive, manual review required
- Update baselines when changes are intentional

### Test Checklist Template

Create a file `docs/migration-test-checklist.md`:

```markdown
# Migration Testing Checklist

## Phase 1: Dialogs ✅/❌

- [ ] BaseModal opens/closes
- [ ] ConstructionPlanModal sizing correct
- [ ] ConstructionViewer3DModal no flicker
- [ ] All 13 modals functional

## Phase 2: Layout ✅/❌

- [ ] All Flex converted
- [ ] All Box converted
- [ ] All Grid converted
- [ ] Layouts visually correct
- [ ] No console errors

## Phase 3: Typography ✅/❌

- [ ] Text rendering correctly
- [ ] Headings proper hierarchy
- [ ] Font sizes match design
- [ ] Colors correct

## Phase 4: Interactive ✅/❌

- [ ] Forms work
- [ ] Buttons clickable
- [ ] Selects functional
- [ ] Tooltips show
- [ ] Menus open

## Phase 5: Display ✅/❌

- [ ] Alerts show correctly
- [ ] DataLists formatted
- [ ] Cards display
- [ ] Separators visible

## Phase 6: Colors ✅/❌

- [ ] Canvas theme works
- [ ] SVG colors correct
- [ ] Dark mode works
- [ ] No missing variables

## Phase 7: Cleanup ✅/❌

- [ ] Dependencies removed
- [ ] Imports clean
- [ ] Build succeeds
- [ ] No warnings

## Phase 8: Final ✅/❌

- [ ] All tests pass
- [ ] Visual QA complete
- [ ] Browser testing done
- [ ] Performance acceptable
```

---

## Rollback Plan

### If Migration Fails

**Git Strategy:**

- Work in feature branch: `feature/shadcn-migration`
- Commit after each phase
- Can revert to any phase if issues found

**Branch Structure:**

```
main
└── feature/shadcn-migration
    ├── phase-0-setup
    ├── phase-1-dialogs
    ├── phase-2-layout
    ├── phase-3-typography
    ├── phase-4-interactive
    ├── phase-5-display
    ├── phase-6-css-variables
    ├── phase-7-cleanup
    └── phase-8-testing
```

**Rollback Steps:**

1. **If issues in current phase:**

   ```bash
   git reset --hard HEAD~1  # Undo last commit
   # Fix issues, commit again
   ```

2. **If fundamental issues discovered:**

   ```bash
   git checkout main  # Go back to stable
   git branch -D feature/shadcn-migration  # Delete branch
   # Start over or abandon migration
   ```

3. **If issues after merge:**
   ```bash
   git revert <merge-commit-hash>
   # Or
   git reset --hard <commit-before-merge>
   git push --force  # Only if not shared with others
   ```

### Partial Rollback

**Keep Dialog fix, rollback rest:**

```bash
# Cherry-pick just the Dialog changes from Phase 1
git checkout main
git checkout -b feature/dialog-fix-only
git cherry-pick <phase-1-commit-hash>
```

---

## Success Criteria

### Option A: Dialog-Only Fix

✅ **Success = All of these:**

- ConstructionPlanModal SVG takes full height without scrolling
- ConstructionViewer3DModal canvas doesn't flicker
- All 13 modals work correctly
- Dark mode works
- No regressions in other components

### Option B: Full Migration

✅ **Success = All of these:**

- All 100 files converted successfully
- No Radix Themes dependencies (except icons)
- All tests pass
- No visual regressions (or acceptable changes)
- Dark mode fully functional
- Canvas theme bridge works
- SVG rendering correct
- Performance acceptable
- No console errors/warnings
- All user flows work

---

## Next Steps

1. **Review this plan** - Ensure all stakeholders aligned
2. **Choose approach:**
   - Option A only (Dialog fix)
   - Option B only (Full migration)
   - Two-phase (A then B)
3. **Set timeline** - Block time for implementation
4. **Create feature branch** - `feature/shadcn-migration`
5. **Start Phase 0** - Setup shadcn
6. **Proceed methodically** - One phase at a time, test after each

---

## Questions & Decisions

### Decisions to Make

1. **Toolbar replacement:**
   - [ ] Keep `@radix-ui/react-toolbar` primitive
   - [ ] Replace with flex layout

2. **Color customization:**
   - [ ] Use shadcn default colors
   - [ ] Customize to match current Radix theme

3. **Component styling:**
   - [ ] Accept shadcn defaults
   - [ ] Customize to match current look exactly

4. **Testing depth:**
   - [ ] Minimal (manual only)
   - [ ] Comprehensive (update all Playwright tests)

5. **Migration approach:**
   - [ ] Option A (Dialog only)
   - [ ] Option B (Full migration)
   - [ ] Two-phase (A then B)

---

## Appendix

### Useful Commands

```bash
# Install shadcn component
npx shadcn@latest add <component-name>

# Find Radix usage
rg "@radix-ui/themes" src/

# Find CSS variable usage
rg "var\(--" src/

# Run tests
pnpm test -- --pool=threads

# Run Playwright
pnpm playwright test

# Build and check size
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### File Counts by Phase

- **Phase 0:** 3 new files (custom components)
- **Phase 1:** 12 files modified (modals)
- **Phase 2:** 100 files modified (layouts)
- **Phase 3:** 100 files modified (typography - same files)
- **Phase 4:** 60 files modified (interactive)
- **Phase 5:** 30 files modified (display)
- **Phase 6:** 20 files modified (CSS variables)
- **Phase 7:** 3 files modified (cleanup)
- **Phase 8:** Testing only

**Total unique files touched:** ~100 files

### Estimated Time by Role

If multiple people work on this:

**Senior Developer (complex logic):**

- Phase 0: Setup and custom components - 3-4 hours
- Phase 1: Dialogs - 6-8 hours
- Phase 4: Interactive components - 10-12 hours
- Phase 6: CSS variables - 3-4 hours
- Phase 8: Testing coordination - 2 hours
- **Total: 24-30 hours**

**Mid-level Developer (mechanical work):**

- Phase 2: Layout conversion - 8-10 hours
- Phase 3: Typography - 3-4 hours
- Phase 5: Display components - 4-5 hours
- **Total: 15-19 hours**

**Junior Developer or Senior (cleanup/testing):**

- Phase 7: Cleanup - 2-3 hours
- Phase 8: Manual testing - 4-6 hours
- **Total: 6-9 hours**

**Combined: 45-58 hours** (matches original estimate)

---

**End of Migration Plan**
