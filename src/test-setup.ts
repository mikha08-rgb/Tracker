import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals are disabled, so testing-library can't register its
// automatic DOM cleanup — do it explicitly for every test file.
afterEach(() => {
  cleanup()
})
