/**
 * Mock hooks for testing
 * 用于测试的 Hook Mocks
 */

import { vi } from 'vitest';

/**
 * 创建 useQuestionQueue hook 的 mock
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object} Mock hook 返回值
 */
export const createMockUseQuestionQueue = (overrides = {}) => {
  const defaultMock = {
    currentQuestion: {
      id: 'test-001',
      text: '企业用银行存款购买原材料入库。',
      debit: ['原材料'],
      credit: ['银行存款'],
      distractors: ['应付账款', '库存商品', '预付账款']
    },
    currentIndex: 0,
    totalQuestions: 10,
    isLoading: false,
    isFetchingMore: false,
    isAwaitingNext: false,
    hasCheckedRemote: true,
    hasRemoteData: true,
    error: null,
    nextQuestion: vi.fn(),
    resetQueue: vi.fn(),
    getAccountOptions: vi.fn(() => [
      '原材料',
      '银行存款',
      '应付账款',
      '库存商品',
      '预付账款'
    ]),
    fetchMoreQuestions: vi.fn(),
    _debug: undefined
  };

  return {
    ...defaultMock,
    ...overrides
  };
};

/**
 * Mock useQuestionQueue 模块
 * 在测试文件开头调用：
 * vi.mock('../hooks/useQuestionQueue', () => mockUseQuestionQueue());
 */
export const mockUseQuestionQueue = (customMock = null) => {
  return {
    useQuestionQueue: vi.fn(() => customMock || createMockUseQuestionQueue()),
    useQuestionQueueFixed: vi.fn(() => customMock || createMockUseQuestionQueue()),
  };
};
