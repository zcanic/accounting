import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock global fetch
global.fetch = vi.fn();

// Mock AbortController
global.AbortController = class AbortController {
  constructor() {
    this.signal = { aborted: false };
  }
  abort() {
    this.signal.aborted = true;
  }
};

// Mock AbortSignal.any (ES2024 feature, may not be available in test env)
if (!global.AbortSignal.any) {
  global.AbortSignal.any = (signals) => {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
    }
    return controller.signal;
  };
}
