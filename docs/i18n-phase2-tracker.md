# Phase 2 i18n Translation Implementation Tracker

**Status:** In Progress  
**Started:** December 29, 2024  
**Target Completion:** TBD

## Summary Statistics

- **Total Components:** ~65 files
- **Total Estimated Strings:** ~800-1,000
- **Estimated Effort:** 10-15 days
- **Completion:** 1% (1/65 components)

---

## Progress Tracking

| Category                                    | Component                        | Strings        | Status         | Notes                       |
| ------------------------------------------- | -------------------------------- | -------------- | -------------- | --------------------------- |
| **Priority 1: High-Visibility UI**          |                                  |                |                |                             |
| Welcome                                     | WelcomeModal.tsx                 | 60             | ✅ Complete    | Includes language switcher  |
| Toolbar                                     | MainToolbar.tsx                  | 10             | ⬜ Not Started |                             |
| Status Bar                                  | AutoSaveIndicator.tsx            | 25             | ⬜ Not Started | Import/export, save states  |
| Status Bar                                  | StoreySelector.tsx               | 2              | ⬜ Not Started |                             |
| **Priority 2: Inspector Panels (Building)** |                                  |                |                |                             |
| Inspector                                   | StoreyInspector.tsx              | 25             | ⬜ Not Started | Measurements, statistics    |
| Inspector                                   | PerimeterInspector.tsx           | 40             | ⬜ Not Started | Wall config, measurements   |
| Inspector                                   | PerimeterWallInspector.tsx       | 35             | ⬜ Not Started | Wall details, openings      |
| Inspector                                   | OpeningInspector.tsx             | 30             | ⬜ Not Started | Opening configuration       |
| Inspector                                   | RoofInspector.tsx                | 20             | ⬜ Not Started | Roof configuration          |
| Inspector                                   | FloorAreaInspector.tsx           | 5              | ⬜ Not Started |                             |
| Inspector                                   | FloorOpeningInspector.tsx        | 5              | ⬜ Not Started |                             |
| Inspector                                   | WallPostInspector.tsx            | 20             | ⬜ Not Started | Post configuration          |
| Inspector                                   | PerimeterCornerInspector.tsx     | 20             | ⬜ Not Started | Corner details              |
| Inspector                                   | RoofOverhangInspector.tsx        | 5              | ⬜ Not Started |                             |
| **Priority 3: Tool Inspectors (Perimeter)** |                                  |                |                |                             |
| Tool                                        | PerimeterToolInspector.tsx       | 25             | ⬜ Not Started | Draw perimeter              |
| Tool                                        | AddPostToolInspector.tsx         | 30             | ⬜ Not Started | Add post to wall            |
| Tool                                        | AddOpeningToolInspector.tsx      | 35             | ⬜ Not Started | Add opening to wall         |
| Tool                                        | SplitWallToolInspector.tsx       | 15             | ⬜ Not Started | Split wall                  |
| Tool                                        | PerimeterPresetToolInspector.tsx | 5              | ⬜ Not Started |                             |
| **Priority 3: Tool Inspectors (Other)**     |                                  |                |                |                             |
| Tool                                        | RoofToolInspector.tsx            | 20             | ⬜ Not Started | Draw roof                   |
| Tool                                        | FloorAreaToolInspector.tsx       | 5              | ⬜ Not Started |                             |
| Tool                                        | FloorOpeningToolInspector.tsx    | 5              | ⬜ Not Started |                             |
| Tool                                        | SelectToolInspector.tsx          | 5              | ⬜ Not Started |                             |
| Tool                                        | MoveToolInspector.tsx            | 10             | ⬜ Not Started |                             |
| Tool                                        | TestDataToolInspector.tsx        | 15             | ⬜ Not Started |                             |
| Tool                                        | SimplePolygonToolInspector.tsx   | 15             | ⬜ Not Started | Shared component            |
| **Priority 4: Preset Dialogs**              |                                  |                |                |                             |
| Dialog                                      | RectangularPresetDialog.tsx      | 20             | ⬜ Not Started |                             |
| Dialog                                      | LShapedPresetDialog.tsx          | 30             | ⬜ Not Started |                             |
| **Priority 5: Configuration Modals**        |                                  |                |                |                             |
| Config                                      | ConfigurationModal.tsx           | 10             | ⬜ Not Started | Tab labels                  |
| Config                                      | MaterialsConfigContent.tsx       | 60             | ⬜ Not Started | Material management         |
| Config                                      | WallAssemblyContent.tsx          | 80             | ⬜ Not Started | Wall assembly config        |
| Config                                      | RoofAssemblyConfigContent.tsx    | 50             | ⬜ Not Started | Roof assembly config        |
| Config                                      | FloorAssemblyConfigContent.tsx   | 50             | ⬜ Not Started | Floor assembly config       |
| Config                                      | OpeningAssemblyContent.tsx       | 40             | ⬜ Not Started | Opening assembly config     |
| Config                                      | RingBeamAssemblyContent.tsx      | 40             | ⬜ Not Started | Ring beam config            |
| **Priority 6: Plan Overlay**                |                                  |                |                |                             |
| Overlay                                     | PlanImportModal.tsx              | 35             | ⬜ Not Started | Import/calibrate plan image |
| Overlay                                     | PlanOverlayControls.tsx          | 10             | ⬜ Not Started |                             |
| **Priority 7: Construction Components**     |                                  |                |                |                             |
| Construction                                | ConstructionPartsListModal.tsx   | 10             | ⬜ Not Started |                             |
| Construction                                | ConstructionPartsList.tsx        | 80             | ⬜ Not Started | Parts table, categories     |
| Construction                                | ConstructionVirtualPartsList.tsx | 10             | ⬜ Not Started |                             |
| Construction                                | ConstructionPlanModal.tsx        | 10             | ⬜ Not Started |                             |
| Construction                                | TopDownPlanModal.tsx             | 10             | ⬜ Not Started |                             |
| Construction                                | TagVisibilityMenu.tsx            | 10             | ⬜ Not Started |                             |
| Construction                                | IssueDescriptionPanel.tsx        | 5              | ⬜ Not Started | Already uses t() for issues |
| **Priority 8: 3D Viewer**                   |                                  |                |                |                             |
| Viewer3D                                    | GridToggleButton.tsx             | 3              | ⬜ Not Started |                             |
| Viewer3D                                    | TagOpacityMenu.tsx               | 5              | ⬜ Not Started |                             |
| Viewer3D                                    | ExportButton.tsx                 | 3              | ⬜ Not Started |                             |
| **Priority 9: Error Handling**              |                                  |                |                |                             |
| Error                                       | ErrorFallback.tsx                | 15             | ⬜ Not Started |                             |
| Error                                       | FeatureErrorFallback.tsx         | 8              | ⬜ Not Started |                             |
| Error                                       | ModalErrorFallback.tsx           | 7              | ⬜ Not Started |                             |
| **Priority 10: Misc Components**            |                                  |                |                |                             |
| Editor                                      | MeasurementInfo.tsx              | 5              | ⬜ Not Started |                             |
| Editor                                      | RoofMeasurementInfo.tsx          | 5              | ⬜ Not Started |                             |
| Status                                      | GridSizeDisplay.tsx              | 3              | ⬜ Not Started |                             |
| Status                                      | PointerPositionDisplay.tsx       | 2              | ⬜ Not Started |                             |
| Status                                      | ThemeToggle.tsx                  | 2              | ⬜ Not Started |                             |
| Status                                      | OfflineStatusIndicator.tsx       | 3              | ⬜ Not Started |                             |
| **TOTAL**                                   | **~65 components**               | **~800-1,000** | **1%**         |                             |

---

## Translation File Structure

```
src/shared/i18n/locales/
├── en/
│   ├── common.json          # Common UI (buttons, states, confirmations, dialogs)
│   ├── toolbar.json         # Toolbar, main actions
│   ├── tools.json           # Tool inspectors and tool-related UI
│   ├── inspector.json       # All building inspector panels
│   ├── config.json          # Configuration modals (materials, assemblies)
│   ├── construction.json    # Parts list, construction terms, plan UI
│   ├── errors.json          # Error messages, validation, error boundaries
│   ├── overlay.json         # Plan overlay, calibration
│   └── welcome.json         # Welcome modal content ✅
└── de/
    └── [same structure]
```

---

## Implementation Strategy

### Recommended Order

**Week 1: High-Visibility Core (Days 1-3)**

1. ✅ WelcomeModal (DONE)
2. MainToolbar + Status Bar essentials
3. Most-used inspectors (Storey, Perimeter, Wall)

**Week 2: Inspectors & Tools (Days 4-7)** 4. Remaining building inspectors 5. Perimeter tool inspectors 6. Other tool inspectors

**Week 3: Configuration (Days 8-10)** 7. Materials configuration 8. Assembly configurations (Wall, Roof, Floor, Opening, RingBeam)

**Week 4: Construction & Overlay (Days 11-13)** 9. Parts list and construction components 10. Plan overlay 11. Preset dialogs

**Week 5: Polish (Days 14-15)** 12. 3D viewer components 13. Error boundaries 14. Misc components 15. Final review and testing

---

## Implementation Guidelines

### Process for Each Component

1. **Prepare Translation Keys**
   - Add keys to appropriate JSON file(s)
   - Include both EN and DE translations (informal "Du")
   - Use nested structure for organization

2. **Update Component**
   - Import `useTranslation` hook
   - Extract hardcoded strings
   - Replace with `t('key')` calls
   - Handle dynamic interpolation with params

3. **Test Manually**
   - Verify in English
   - Switch to German and verify
   - Check for layout issues

4. **Commit**
   - One commit per logical group
   - Clear commit message

### Common Patterns

**Simple text:**

```tsx
const { t } = useTranslation('namespace')
<Text>{t('key')}</Text>
```

**With interpolation:**

```tsx
<Text>{t('message', { name: value })}</Text>
```

**Arrays:**

```tsx
{(t('list', { returnObjects: true }) as string[]).map(item => ...)}
```

**Tooltips:**

```tsx
<IconButton title={t('tooltip')}>
```

**Buttons:**

```tsx
<Button>{t('actions.save')}</Button>
```

**Placeholders:**

```tsx
<TextField placeholder={t('placeholders.selectMaterial')} />
```

### Quality Checklist

For each completed component:

- [ ] All visible text uses translation keys
- [ ] Dynamic content uses interpolation
- [ ] Pluralization handled (if needed)
- [ ] Both EN and DE translations provided (informal "Du")
- [ ] Layout works with longer German text
- [ ] Tooltips and aria-labels translated
- [ ] No hardcoded strings remain
- [ ] Consistent key naming across similar components

---

## Key Statistics

### By Priority Level

- **Priority 1 (High-Viz):** 4 components, ~100 strings
- **Priority 2 (Inspectors):** 9 components, ~205 strings
- **Priority 3 (Tools):** 11 components, ~180 strings
- **Priority 4 (Dialogs):** 2 components, ~50 strings
- **Priority 5 (Config):** 6 components, ~330 strings
- **Priority 6 (Overlay):** 2 components, ~45 strings
- **Priority 7 (Construction):** 7 components, ~135 strings
- **Priority 8 (3D):** 3 components, ~11 strings
- **Priority 9 (Errors):** 3 components, ~30 strings
- **Priority 10 (Misc):** 6 components, ~20 strings

### Translation Complexity

- **Simple (text only):** ~30 components
- **Medium (tooltips, lists):** ~25 components
- **Complex (dialogs, config):** ~10 components

---

## Notes

- Number formatting already implemented and working
- Construction issues already i18n-enabled
- WelcomeModal complete - serves as reference pattern
- German translations use informal "Du" form
- Language switcher available in status bar and WelcomeModal
- Infrastructure is solid and tested

---

**Last Updated:** December 29, 2024  
**Next Target:** MainToolbar.tsx + AutoSaveIndicator.tsx
