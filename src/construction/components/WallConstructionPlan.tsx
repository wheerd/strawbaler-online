import { CheckCircledIcon, Cross2Icon, CrossCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Box, Button, Callout, Dialog, Flex, IconButton, SegmentedControl, Text } from '@radix-ui/themes'
import React, { useMemo, useState } from 'react'

import type { ConstructionModel } from '@/construction/model'
import type { ConstructionIssue } from '@/construction/results'
import { complementaryAxis } from '@/shared/geometry'
import { elementSizeRef } from '@/shared/hooks/useElementSize'
import { type ViewType } from '@/shared/utils/constructionCoordinates'

import { BACK_VIEW, ConstructionPlan, FRONT_VIEW } from './ConstructionPlan'

interface IssueDescriptionPanelProps {
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

const IssueDescriptionPanel = ({ errors, warnings }: IssueDescriptionPanelProps) => (
  <Box className="border-t border-gray-6">
    <Flex direction="column" gap="2" p="3" style={{ maxHeight: '120px', overflowY: 'auto' }}>
      {errors.length > 0 && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Flex direction="column" gap="2">
            <Text weight="medium" size="2">
              Errors ({errors.length})
            </Text>
            <Flex direction="column" gap="1">
              {errors.map((error, index) => (
                <Text key={index} size="1">
                  • {error.description}
                </Text>
              ))}
            </Flex>
          </Flex>
        </Callout.Root>
      )}

      {warnings.length > 0 && (
        <Callout.Root color="amber" size="1">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Flex direction="column" gap="2">
            <Text weight="medium" size="2">
              Warnings ({warnings.length})
            </Text>
            <Flex direction="column" gap="1">
              {warnings.map((warning, index) => (
                <Text key={index} size="1">
                  • {warning.description}
                </Text>
              ))}
            </Flex>
          </Flex>
        </Callout.Root>
      )}

      {errors.length === 0 && warnings.length === 0 && (
        <Callout.Root color="green" size="1">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Flex direction="column" gap="1">
            <Text weight="medium" size="2">
              No Issues Found
            </Text>
            <Text size="1">Construction plan is valid with no errors or warnings.</Text>
          </Flex>
        </Callout.Root>
      )}
    </Flex>
  </Box>
)

interface WallConstructionPlanModalProps {
  model: ConstructionModel
  children: React.ReactNode
}

export function WallConstructionPlanModal({ model, children }: WallConstructionPlanModalProps): React.JSX.Element {
  const [view, setView] = useState<ViewType>('outside')
  const [midCutEnabled, setMidCutEnabled] = useState(false)
  const [containerSize, containerRef] = elementSizeRef()

  const currentView = view === 'inside' ? BACK_VIEW : FRONT_VIEW

  // Calculate cut position when enabled
  const zCutOffset = useMemo(() => {
    if (!midCutEnabled) return undefined

    const axis = complementaryAxis(currentView.plane)
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2

    // Cut at middle of model depth
    return (model.bounds.min[axisIndex] + model.bounds.max[axisIndex]) / 2
  }, [midCutEnabled, view, model.bounds])

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>
      <Dialog.Content size="2" width="95%" maxWidth="95%" maxHeight="90vh" className="flex flex-col overflow-hidden">
        <Flex direction="column" gap="3" height="100%" className="overflow-hidden">
          <Dialog.Title>
            <Flex justify="between" align="center">
              Wall Construction Plan
              <Dialog.Close>
                <IconButton variant="ghost" size="1">
                  <Cross2Icon />
                </IconButton>
              </Dialog.Close>
            </Flex>
          </Dialog.Title>

          <div
            ref={containerRef}
            className={`relative flex-1 min-h-[300px] max-h-[calc(100vh-400px)] overflow-hidden border border-gray-6 rounded-2 ${midCutEnabled ? 'mid-cut-enabled' : ''}`}
          >
            <ConstructionPlan model={model} view={currentView} containerSize={containerSize} zCutOffset={zCutOffset} />

            {/* Overlay controls in top-left corner */}
            <Box position="absolute" top="3" left="3" p="1" className="z-10 shadow-md bg-panel rounded-2">
              <Flex direction="column" gap="2">
                <SegmentedControl.Root value={view} onValueChange={value => setView(value as ViewType)} size="1">
                  <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
                  <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
                </SegmentedControl.Root>

                <Button
                  variant={midCutEnabled ? 'solid' : 'outline'}
                  size="1"
                  onClick={() => setMidCutEnabled(!midCutEnabled)}
                >
                  Mid Cut
                </Button>
              </Flex>
            </Box>
          </div>

          <Box flexShrink="0">
            <IssueDescriptionPanel errors={model.errors} warnings={model.warnings} />
          </Box>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
