import { useCallback } from 'react'
import { useToolManager, useToolManagerState } from '../ToolSystem/ToolContext'
import type { ToolGroup, Tool } from '../ToolSystem/types'

export function MainToolbar(): React.JSX.Element {
  const toolManager = useToolManager()
  const toolManagerState = useToolManagerState()

  const handleToolSelect = useCallback(
    (toolId: string) => {
      toolManager.activateTool(toolId)
    },
    [toolManager]
  )

  const handleToolGroupSelect = useCallback(
    (groupId: string) => {
      toolManager.activateDefaultToolForGroup(groupId)
    },
    [toolManager]
  )

  // Group tools by category
  const toolGroups = Array.from(toolManagerState.toolGroups.values())

  return (
    <div className="main-toolbar">
      <div className="toolbar-section">
        <h3>Tools</h3>

        {toolGroups.map(group => (
          <ToolGroupButton
            key={group.id}
            group={group}
            activeTool={toolManagerState.activeTool}
            onToolSelect={handleToolSelect}
            onGroupSelect={handleToolGroupSelect}
          />
        ))}
      </div>
    </div>
  )
}

interface ToolGroupButtonProps {
  group: ToolGroup
  activeTool: Tool | null
  onToolSelect: (toolId: string) => void
  onGroupSelect: (groupId: string) => void
}

function ToolGroupButton({ group, activeTool, onToolSelect, onGroupSelect }: ToolGroupButtonProps): React.JSX.Element {
  const isGroupActive = activeTool && group.tools.some(tool => tool.id === activeTool.id)
  const activeToolInGroup = activeTool && group.tools.find(tool => tool.id === activeTool.id)

  return (
    <div className={`tool-group ${isGroupActive ? 'active' : ''}`}>
      <button className="tool-group-button" onClick={() => onGroupSelect(group.id)} title={group.name}>
        <span className="tool-icon">{group.icon}</span>
        <span className="tool-name">{group.name}</span>
        {activeToolInGroup && <span className="active-tool-indicator">({activeToolInGroup.name})</span>}
      </button>

      {isGroupActive && group.tools.length > 1 && (
        <div className="tool-dropdown">
          {group.tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-option ${activeTool?.id === tool.id ? 'active' : ''}`}
              onClick={() => onToolSelect(tool.id)}
              title={tool.name}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-name">{tool.name}</span>
              {tool.hotkey && <span className="tool-hotkey">{tool.hotkey}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
