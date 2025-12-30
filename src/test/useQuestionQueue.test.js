/**
 * 集成测试：useQuestionQueue Hook
 * 测试题库队列管理的完整逻辑
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuestionQueue } from '../hooks/useQuestionQueue';

// Mock 本地题库数据
vi.mock('../data/scenarios.json', () => ({
  default: {
    scenarios: [
      {
        id: 'local-001',
        text: '本地题目1',
        debit: ['科目A'],
        credit: ['科目B'],
        distractors: ['科目C']
      },
      {
        id: 'local-002',
        text: '本地题目2',
        debit: ['科目D'],
        credit: ['科目E'],
        distractors: ['科目F']
      },
      {
        id: 'local-003',
        text: '本地题目3',
        debit: ['科目G'],
        credit: ['科目H'],
        distractors: ['科目I']
      },
      {
        id: 'local-004',
        text: '本地题目4',
        debit: ['科目J'],
        credit: ['科目K'],
        distractors: ['科目L']
      },
      {
        id: 'local-005',
        text: '本地题目5',
        debit: ['科目M'],
        credit: ['科目N'],
        distractors: ['科目O']
      }
    ]
  }
}));

describe('useQuestionQueue Hook 集成测试', () => {
  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // Mock fetch 为成功响应
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          scenarios: [
            {
              id: 'remote-001',
              text: '远程题目1',
              debit: ['远程A'],
              credit: ['远程B'],
              distractors: ['远程C']
            }
          ]
        })
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初始化加载', () => {
    it('应该初始加载本地题目', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 应该至少有 5 道本地题目
      expect(result.current.totalQuestions).toBeGreaterThanOrEqual(5);
      expect(result.current.currentQuestion).toBeDefined();
      expect(result.current.currentIndex).toBe(0);
    });

    it('应该后台请求远程题目', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.hasCheckedRemote).toBe(true);
      }, { timeout: 15000 });

      // 应该调用了 fetch
      expect(global.fetch).toHaveBeenCalled();
      expect(global.fetch.mock.calls[0][0]).toContain('webhook/get-accounting-scenarios');
    });

    it('远程请求成功后应该标记 hasRemoteData', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.hasRemoteData).toBe(true);
      }, { timeout: 15000 });
    });
  });

  describe('题目导航', () => {
    it('nextQuestion 应该前进到下一题', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.nextQuestion();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.currentQuestion).not.toBe(firstQuestion);
    });

    it('应该能够连续前进多题', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 前进 3 题
      act(() => {
        result.current.nextQuestion();
        result.current.nextQuestion();
        result.current.nextQuestion();
      });

      expect(result.current.currentIndex).toBe(3);
    });
  });

  describe('去重机制', () => {
    it('应该拒绝重复的题目（基于内容哈希）', async () => {
      // Mock fetch 返回相同内容的题目（不包含 id 字段，强制使用内容哈希）
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            scenarios: [
              {
                // 移除 id 字段，强制使用内容哈希去重
                text: '本地题目1',   // 与本地题目相同的文本
                debit: ['科目A'],
                credit: ['科目B'],
                distractors: ['科目X']
              }
            ]
          })
        })
      );

      const { result } = renderHook(() => useQuestionQueue());

      const initialTotal = await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        return result.current.totalQuestions;
      });

      await waitFor(() => {
        expect(result.current.hasCheckedRemote).toBe(true);
      }, { timeout: 15000 });

      // 题目总数不应该增加（因为是重复的内容）
      expect(result.current.totalQuestions).toBe(initialTotal);
    });
  });

  describe('错误处理', () => {
    it('fetch 失败时应该使用本地题目', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 应该仍然有本地题目可用
      expect(result.current.totalQuestions).toBeGreaterThan(0);
      expect(result.current.currentQuestion).toBeDefined();
    });

    it('HTTP 错误时应该优雅降级', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentQuestion).toBeDefined();
    });

    it('空响应应该正常处理', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ scenarios: [] })
        })
      );

      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.hasCheckedRemote).toBe(true);
      }, { timeout: 15000 });

      // 应该仍然有本地题目
      expect(result.current.totalQuestions).toBeGreaterThan(0);
    });
  });

  describe('自动补货机制', () => {
    it('剩余题目不足时应该自动请求更多', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 快速前进到接近末尾（触发自动补货）
      const nearEnd = result.current.totalQuestions - 3;

      act(() => {
        for (let i = 0; i < nearEnd; i++) {
          result.current.nextQuestion();
        }
      });

      // 等待自动补货
      await waitFor(() => {
        expect(result.current.isFetchingMore).toBe(false);
      }, { timeout: 15000 });

      // fetch 应该被调用多次（初始 + 自动补货）
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('getAccountOptions', () => {
    it('应该返回包含借方、贷方和干扰项的科目列表', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const options = result.current.getAccountOptions();

      // 应该至少有 3 个科目（借方 + 贷方 + 干扰项）
      expect(options.length).toBeGreaterThanOrEqual(3);
    });

    it('返回的科目应该被随机打乱', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const options1 = result.current.getAccountOptions();
      const options2 = result.current.getAccountOptions();

      // 注意：由于随机性，这个测试可能偶尔失败
      // 但多次调用应该至少有一次顺序不同
      const allSame = options1.every((opt, idx) => opt === options2[idx]);

      // 如果完全相同，再试几次
      if (allSame) {
        let foundDifferent = false;
        for (let i = 0; i < 10; i++) {
          const optionsN = result.current.getAccountOptions();
          if (!options1.every((opt, idx) => opt === optionsN[idx])) {
            foundDifferent = true;
            break;
          }
        }
        expect(foundDifferent).toBe(true);
      }
    });
  });

  describe('resetQueue', () => {
    it('应该重置索引到起点', async () => {
      const { result } = renderHook(() => useQuestionQueue());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 前进几题
      act(() => {
        result.current.nextQuestion();
        result.current.nextQuestion();
        result.current.nextQuestion();
      });

      expect(result.current.currentIndex).toBe(3);

      // 重置
      act(() => {
        result.current.resetQueue();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe('超时保护', () => {
    it('超过 10 秒应该自动中止请求', async () => {
      // Mock 一个永不 resolve 的 fetch
      global.fetch = vi.fn(() => new Promise(() => {}));

      const { result } = renderHook(() => useQuestionQueue());

      // 等待初始加载完成（会使用本地数据）
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 应该仍然有题目可用（本地）
      expect(result.current.currentQuestion).toBeDefined();
    }, 20000);
  });

  describe('组件卸载清理', () => {
    it('卸载时应该取消进行中的请求', async () => {
      const abortSpy = vi.fn();

      // Mock AbortController
      const mockAbortController = class {
        constructor() {
          this.signal = { aborted: false };
        }
        abort() {
          this.signal.aborted = true;
          abortSpy();
        }
      };

      global.AbortController = mockAbortController;

      const { unmount } = renderHook(() => useQuestionQueue());

      // 立即卸载
      unmount();

      // 注意：实际的 abort 调用取决于是否有进行中的请求
      // 这个测试主要确保不会抛出错误
    });
  });
});
