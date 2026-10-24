import type { WebGLRenderer } from 'three'

/**
 * Settings every Kiddo canvas gets when its renderer is created.
 *
 * In production three.js does not read back each shader's compile log: that
 * check makes the browser finish compiling right there, on the main thread
 * (it was most of the 0.9 s a lesson page froze while its robot appeared, in
 * the Phase 12 profile). Without it the driver can compile in parallel. The
 * check stays on in development, where a broken shader should be loud.
 */
export function prepareRenderer(gl: WebGLRenderer): void {
  gl.debug.checkShaderErrors = !import.meta.env.PROD
}
