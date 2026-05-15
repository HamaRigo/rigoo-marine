/**
 * Vitest setup. Runs once before any test file in the project.
 *
 * Responsibilities:
 *  - Wire @testing-library/jest-dom matchers (toBeInTheDocument, etc).
 *  - Reset mocks between tests so state doesn't leak.
 *  - Provide a stable matchMedia shim — MUI's responsive hooks call this
 *    on render and JSDOM doesn't ship a default. Without it every
 *    component-under-test that touches useMediaQuery throws.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// MUI calls window.matchMedia for breakpoint hooks; JSDOM has no impl.
// Default to "not matching" — components fall back to their xs styles,
// which is what we want in a vanilla test environment.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),         // legacy API
    removeListener: vi.fn(),      // legacy API
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// IntersectionObserver — used by the motion primitives' Reveal/Stagger.
// JSDOM doesn't ship one; a no-op shim is enough for tests because we
// don't assert on visibility transitions.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();          // unmount any leftover React trees
  vi.clearAllMocks(); // reset call counts but keep implementations
});
