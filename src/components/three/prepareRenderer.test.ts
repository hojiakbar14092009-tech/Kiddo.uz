import type { WebGLRenderer } from 'three'
import { describe, expect, it } from 'vitest'
import { prepareRenderer } from './prepareRenderer'

describe('prepareRenderer', () => {
  it('keeps the shader check outside production builds (tests run as development)', () => {
    const gl = { debug: { checkShaderErrors: false } } as unknown as WebGLRenderer
    prepareRenderer(gl)
    expect(gl.debug.checkShaderErrors).toBe(!import.meta.env.PROD)
  })
})
