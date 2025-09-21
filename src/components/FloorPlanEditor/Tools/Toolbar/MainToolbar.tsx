import { useCallback } from 'react'
import { Box, Flex, Separator, Tooltip, Kbd, IconButton } from '@radix-ui/themes'
import {
  useToolContext,
  useToolManager,
  useToolManagerState
} from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolContext'
import { Logo } from '@/components/Logo'

export function MainToolbar(): React.JSX.Element {
  const toolManager = useToolManager()
  const toolManagerState = useToolManagerState()
  const context = useToolContext()

  const handleToolSelect = useCallback(
    (toolId: string) => {
      toolManager.activateTool(toolId, context)
    },
    [toolManager, context]
  )

  // Group tools by category
  const toolGroups = Array.from(toolManagerState.toolGroups.values())

  return (
    <Box style={{ borderBottom: '1px solid var(--gray-6)' }} data-testid="main-toolbar">
      <Box p="3">
        <Flex align="center" gap="4">
          {/* Logo - Compact version */}
          <Logo className="flex-shrink-0" />

          {/* Tools positioned next to logo on the left */}
          <Flex align="center" gap="1">
            {toolGroups.map((group, groupIndex) => (
              <Flex key={group.id} align="center">
                {groupIndex > 0 && <Separator orientation="vertical" size="2" mx="2" />}

                {/* Group of tools */}
                <Flex align="center" gap="1">
                  {group.tools.map(tool => (
                    <Tooltip
                      key={tool.id}
                      content={
                        <Flex align="center" justify="between" gap="2">
                          <span>{tool.name}</span>
                          {tool.hotkey && <Kbd>{tool.hotkey.toUpperCase()}</Kbd>}
                        </Flex>
                      }
                    >
                      <IconButton
                        size="2"
                        variant={toolManagerState.activeTool?.id === tool.id ? 'solid' : 'surface'}
                        onClick={() => handleToolSelect(tool.id)}
                      >
                        {tool.iconComponent ? <tool.iconComponent /> : <span>{tool.icon}</span>}
                      </IconButton>
                    </Tooltip>
                  ))}
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Box>
    </Box>
  )
}
