/**
 * 集成测试：App 组件交互
 * 测试完整的用户交互流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createMockUseQuestionQueue } from './__mocks__/hooks';

// 在模块级别 Mock useQuestionQueue
const mockQuestionQueue = createMockUseQuestionQueue();

vi.mock('../hooks/useQuestionQueue', () => ({
  useQuestionQueue: () => mockQuestionQueue
}));

describe('App 组件交互测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 mock 函数
    mockQuestionQueue.nextQuestion.mockClear();
    mockQuestionQueue.resetQueue.mockClear();
  });

  describe('页面渲染', () => {
    it('应该渲染标题', () => {
      render(<App />);
      expect(screen.getByText(/Sanctuary of Ledger/i)).toBeInTheDocument();
    });

    it('应该显示当前题目进度', () => {
      render(<App />);
      expect(screen.getByText(/Scenario 1 \/ 10/i)).toBeInTheDocument();
    });

    it('应该显示题目文本', () => {
      render(<App />);
      expect(screen.getByText('企业用银行存款购买原材料入库。')).toBeInTheDocument();
    });

    it('应该渲染借方和贷方区域', () => {
      render(<App />);
      expect(screen.getByText(/借方 Debit/i)).toBeInTheDocument();
      expect(screen.getByText(/贷方 Credit/i)).toBeInTheDocument();
    });

    it('应该显示所有科目选项按钮', () => {
      render(<App />);
      expect(screen.getByText('原材料')).toBeInTheDocument();
      expect(screen.getByText('银行存款')).toBeInTheDocument();
      expect(screen.getByText('应付账款')).toBeInTheDocument();
      expect(screen.getByText('库存商品')).toBeInTheDocument();
      expect(screen.getByText('预付账款')).toBeInTheDocument();
    });
  });

  describe('科目选择交互', () => {
    it('点击科目按钮应该选中该科目', async () => {
      const user = userEvent.setup();
      render(<App />);

      const accountButton = screen.getByText('原材料');
      await user.click(accountButton);

      // 应该显示选中提示
      expect(screen.getByText(/已选:/)).toBeInTheDocument();
      expect(screen.getByText('原材料', { selector: '.font-bold' })).toBeInTheDocument();
    });

    it('再次点击已选中的科目应该取消选中', async () => {
      const user = userEvent.setup();
      render(<App />);

      const accountButton = screen.getByText('原材料');

      // 第一次点击 - 选中
      await user.click(accountButton);
      expect(screen.getByText(/已选:/)).toBeInTheDocument();

      // 第二次点击 - 取消选中
      await user.click(accountButton);
      expect(screen.queryByText(/已选:/)).not.toBeInTheDocument();
    });

    it('点击不同科目应该切换选中项', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 选中第一个科目
      await user.click(screen.getByText('原材料'));
      expect(screen.getByText('原材料', { selector: '.font-bold' })).toBeInTheDocument();

      // 选中第二个科目
      await user.click(screen.getByText('银行存款'));
      expect(screen.getByText('银行存款', { selector: '.font-bold' })).toBeInTheDocument();
    });
  });

  describe('借贷方放置交互', () => {
    it('选中科目后点击借方区域应该将科目放入借方', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 1. 选中科目
      await user.click(screen.getByText('原材料'));

      // 2. 点击借方区域
      const debitSection = screen.getByText(/借方 Debit/i).closest('div');
      await user.click(debitSection);

      // 3. 应该在借方区域看到该科目
      const debitArea = screen.getByText(/借方 Debit/i).closest('div');
      expect(within(debitArea).getByText('原材料')).toBeInTheDocument();
    });

    it('选中科目后点击贷方区域应该将科目放入贷方', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 1. 选中科目
      await user.click(screen.getByText('银行存款'));

      // 2. 点击贷方区域
      const creditSection = screen.getByText(/贷方 Credit/i).closest('div');
      await user.click(creditSection);

      // 3. 应该在贷方区域看到该科目
      const creditArea = screen.getByText(/贷方 Credit/i).closest('div');
      expect(within(creditArea).getByText('银行存款')).toBeInTheDocument();
    });

    it('未选中科目时点击借贷方区域不应该有变化', async () => {
      const user = userEvent.setup();
      render(<App />);

      const debitSection = screen.getByText(/借方 Debit/i).closest('div');
      await user.click(debitSection);

      // 借方区域应该仍然是空的
      expect(screen.queryByText('原材料')).not.toBeInTheDocument();
    });

    it('已放置的科目应该从选项中禁用', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 放置一个科目到借方
      await user.click(screen.getByText('原材料'));
      const debitSection = screen.getByText(/借方 Debit/i).closest('div');
      await user.click(debitSection);

      // 该科目按钮应该被禁用
      const accountButton = screen.getByText('原材料', { selector: 'button *' }).closest('button');
      expect(accountButton).toBeDisabled();
    });
  });

  describe('移除科目交互', () => {
    it('点击借方科目的 X 按钮应该移除该科目', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 1. 放置科目到借方
      await user.click(screen.getByText('原材料'));
      const debitSection = screen.getByText(/借方 Debit/i).closest('div');
      await user.click(debitSection);

      // 2. 找到并点击 X 按钮
      const debitArea = screen.getByText(/借方 Debit/i).closest('div');
      const removeButtons = within(debitArea).getAllByRole('button');
      const xButton = removeButtons.find(btn => btn.querySelector('svg')); // 找到包含 icon 的按钮

      await user.click(xButton);

      // 3. 科目应该被移除
      expect(within(debitArea).queryByText('原材料')).not.toBeInTheDocument();
    });

    it('移除科目后该科目应该重新可选', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 1. 放置并移除
      await user.click(screen.getByText('原材料'));
      const debitSection = screen.getByText(/借方 Debit/i).closest('div');
      await user.click(debitSection);

      const debitArea = screen.getByText(/借方 Debit/i).closest('div');
      const removeButtons = within(debitArea).getAllByRole('button');
      const xButton = removeButtons.find(btn => btn.querySelector('svg'));
      await user.click(xButton);

      // 2. 按钮应该重新可用
      const accountButton = screen.getAllByText('原材料')[0].closest('button');
      expect(accountButton).not.toBeDisabled();
    });
  });

  describe('答案提交', () => {
    it('未放置任何科目时提交按钮应该禁用', () => {
      render(<App />);

      const submitButton = screen.getByText(/提交答案/i);
      expect(submitButton).toBeDisabled();
    });

    it('放置至少一个科目后提交按钮应该启用', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText('原材料'));
      const debitSection = screen.getByText(/借方 Debit/i).closest('div');
      await user.click(debitSection);

      const submitButton = screen.getByText(/提交答案/i);
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('重置功能', () => {
    it('点击重置按钮应该清空所有选择', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 1. 放置一些科目
      await user.click(screen.getByText('原材料'));
      const debitSection = screen.getByText(/借方 Debit/i).closest('div');
      await user.click(debitSection);

      await user.click(screen.getByText('银行存款'));
      const creditSection = screen.getByText(/贷方 Credit/i).closest('div');
      await user.click(creditSection);

      // 2. 点击重置
      const resetButton = screen.getByText(/重置/i);
      await user.click(resetButton);

      // 3. 借贷方应该都为空
      const debitArea = screen.getByText(/借方 Debit/i).closest('div');
      const creditArea = screen.getByText(/贷方 Credit/i).closest('div');

      expect(within(debitArea).queryByText('原材料')).not.toBeInTheDocument();
      expect(within(creditArea).queryByText('银行存款')).not.toBeInTheDocument();
    });
  });

  describe('连胜显示', () => {
    it('初始状态不应该显示连胜', () => {
      render(<App />);
      expect(screen.queryByText(/Streak/i)).not.toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('加载中时应该显示加载提示', () => {
      // Mock loading state
      vi.mock('../hooks/useQuestionQueue', () => ({
        useQuestionQueue: () => ({
          isLoading: true,
          currentQuestion: null,
          currentIndex: 0,
          totalQuestions: 0,
          isFetchingMore: false,
          isAwaitingNext: false,
          hasCheckedRemote: false,
          hasRemoteData: false,
          error: null,
          nextQuestion: vi.fn(),
          getAccountOptions: () => []
        })
      }));

      render(<App />);
      expect(screen.getByText(/LOADING SANCTUARY/i)).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该能连续放置多个科目到借方', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 放置两个科目到借方
      await user.click(screen.getByText('原材料'));
      const debitSection = screen.getByText(/借方 Debit/i).closest('div');
      await user.click(debitSection);

      await user.click(screen.getByText('应付账款'));
      await user.click(debitSection);

      const debitArea = screen.getByText(/借方 Debit/i).closest('div');
      expect(within(debitArea).getByText('原材料')).toBeInTheDocument();
      expect(within(debitArea).getByText('应付账款')).toBeInTheDocument();
    });

    it('应该能连续放置多个科目到贷方', async () => {
      const user = userEvent.setup();
      render(<App />);

      const creditSection = screen.getByText(/贷方 Credit/i).closest('div');

      await user.click(screen.getByText('银行存款'));
      await user.click(creditSection);

      await user.click(screen.getByText('库存商品'));
      await user.click(creditSection);

      const creditArea = screen.getByText(/贷方 Credit/i).closest('div');
      expect(within(creditArea).getByText('银行存款')).toBeInTheDocument();
      expect(within(creditArea).getByText('库存商品')).toBeInTheDocument();
    });
  });

  describe('状态提示', () => {
    it('应该显示远程题库状态', () => {
      render(<App />);
      // 由于 mock 了 hasRemoteData: true 和 hasCheckedRemote: true
      // 应该不显示状态提示（只在异常时显示）
    });
  });
});
