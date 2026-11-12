import { describe, expect, it } from 'vitest'
import { shellOnly } from './pwaShell'

describe('shellOnly', () => {
  it('keeps the scripts index.html loads and every non-script file, drops section chunks', () => {
    const html =
      '<script type="module" crossorigin src="/assets/index-A.js"></script>' +
      '<link rel="modulepreload" crossorigin href="/assets/react-B.js">' +
      '<link rel="stylesheet" href="/assets/index-C.css"><script src="/lang-preload.js"></script>'
    const entries = [
      'assets/index-A.js',
      'assets/react-B.js',
      'assets/MathLab-D.js',
      'assets/index-C.css',
      'index.html',
      'lang-preload.js',
    ]
    expect(
      shellOnly(
        entries.map((url) => ({ url })),
        html,
      ).map((e) => e.url),
    ).toEqual([
      'assets/index-A.js',
      'assets/react-B.js',
      'assets/index-C.css',
      'index.html',
      'lang-preload.js',
    ])
  })
})
