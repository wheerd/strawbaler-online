import { useCallback } from 'react'
import { Button, Flex, Text, Box, Separator } from '@radix-ui/themes'
import { createLength } from '@/types/geometry'
import type { ToolInspectorProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { PerimeterPresetTool } from '@/components/FloorPlanEditor/Tools/Categories/PerimeterTools/PerimeterPresetTool'
import type { RectangularPresetConfig } from '@/components/FloorPlanEditor/Tools/Categories/PerimeterTools/presets'
import { RectangularPresetDialog } from '@/components/FloorPlanEditor/Tools/Categories/PerimeterTools/presets/RectangularPresetDialog'
import { useReactiveTool } from '@/components/FloorPlanEditor/Tools/hooks/useReactiveTool'
import { usePerimeterConstructionMethods, useConfigStore } from '@/config/store'

export function PerimeterPresetToolInspector({ tool }: ToolInspectorProps<PerimeterPresetTool>): React.JSX.Element {
  const { state } = useReactiveTool(tool)
  const allPerimeterMethods = usePerimeterConstructionMethods()
  const configStore = useConfigStore()

  // Get available presets
  const availablePresets = tool.getAvailablePresets()
  const rectangularPreset = availablePresets.find(p => p.type === 'rectangular')

  // Handle rectangular preset configuration
  const handleRectangularPresetConfirm = useCallback(
    (config: RectangularPresetConfig) => {
      if (rectangularPreset) {
        tool.setActivePreset(rectangularPreset, config)
      }
    },
    [tool, rectangularPreset]
  )

  // Get current config for display
  const currentConfig = tool.getCurrentConfig()
  const isPlacing = tool.isPlacing()

  return (
    <Box p="2">
      <Flex direction="column" gap="3">
        {/* Preset Buttons */}
        <Box>
          <Text size="1" weight="medium" color="gray" mb="2">
            Room Presets
          </Text>

          {/* Rectangular Preset Dialog */}
          <RectangularPresetDialog
            onConfirm={handleRectangularPresetConfirm}
            initialConfig={{
              width: createLength(4000),
              length: createLength(6000),
              thickness: createLength(440),
              constructionMethodId: configStore.getDefaultPerimeterMethodId()
            }}
            trigger={
              <Button className="w-full" size="2">
                <span>⬜</span>
                Rectangular Room
              </Button>
            }
          />
        </Box>

        {/* Current Configuration Display */}
        {currentConfig && (
          <>
            <Separator size="4" />
            <Box>
              <Text size="1" weight="medium" color="gray" mb="2">
                Current Configuration
              </Text>

              <Flex direction="column" gap="1">
                {/* Show preset-specific details */}
                {state.activePreset?.type === 'rectangular' && (
                  <Flex justify="between">
                    <Text size="1" color="gray">
                      Dimensions:
                    </Text>
                    <Text size="1" className="font-mono">
                      {((currentConfig as RectangularPresetConfig).width / 1000).toFixed(1)}m ×{' '}
                      {((currentConfig as RectangularPresetConfig).length / 1000).toFixed(1)}m
                    </Text>
                  </Flex>
                )}

                <Flex justify="between">
                  <Text size="1" color="gray">
                    Thickness:
                  </Text>
                  <Text size="1" className="font-mono">
                    {currentConfig.thickness}mm
                  </Text>
                </Flex>

                <Flex justify="between">
                  <Text size="1" color="gray">
                    Method:
                  </Text>
                  <Text size="1">
                    {allPerimeterMethods.find(m => m.id === currentConfig.constructionMethodId)?.name || 'Unknown'}
                  </Text>
                </Flex>
              </Flex>
            </Box>
          </>
        )}

        {/* Placement Instructions */}
        {isPlacing && (
          <>
            <Separator size="4" />
            <Box>
              <Text size="1" weight="medium" color="gray" mb="1">
                Placement
              </Text>
              <Text size="1" color="gray">
                Click on the plan to place the room. Press{' '}
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">Esc</kbd> to cancel.
              </Text>
            </Box>
          </>
        )}

        {/* Actions */}
        {isPlacing && (
          <Button color="red" variant="solid" className="w-full" onClick={() => tool.clearActivePreset()}>
            <span>✕</span>
            Cancel Placement
          </Button>
        )}
      </Flex>
    </Box>
  )
}
