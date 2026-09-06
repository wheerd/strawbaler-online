import { describe, expect, it } from 'vitest'

import { findEditorEntityAt, isEditorOverlayTarget } from './editorHitTesting'

describe('editorHitTesting', () => {
  it('recognizes measurement overlay targets', () => {
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    overlay.dataset.layer = 'measurements'
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    overlay.append(label)

    expect(isEditorOverlayTarget(label)).toBe(true)
    expect(isEditorOverlayTarget(document.createElement('div'))).toBe(false)
  })

  it('does not resolve an entity for measurement overlay events', () => {
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    overlay.dataset.layer = 'measurements'
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    overlay.append(label)

    expect(findEditorEntityAt({ clientX: 10, clientY: 20, target: label })).toBeNull()
  })
})
