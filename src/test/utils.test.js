/**
 * 单元测试：核心工具函数
 * 测试 questionUtils.js 中的工具函数
 */

import { describe, it, expect } from 'vitest';
import {
  generateQuestionKey,
  extractScenarios,
  isValidQuestion,
  normalizeQuestion,
  isSameQuestion,
  getAccountOptions,
  checkAnswer
} from '../utils/questionUtils';

// ============ 测试套件 ============

describe('generateQuestionKey', () => {
  describe('使用现有 ID', () => {
    it('应该优先使用 id 字段', () => {
      const question = {
        id: 'existing-id-123',
        text: '测试题目',
        debit: ['科目A'],
        credit: ['科目B']
      };

      expect(generateQuestionKey(question)).toBe('id-existing-id-123');
    });

    it('应该使用 _id 字段当 id 不存在时', () => {
      const question = {
        _id: 'mongo-id-456',
        text: '测试题目',
        debit: ['科目A'],
        credit: ['科目B']
      };

      expect(generateQuestionKey(question)).toBe('_id-mongo-id-456');
    });

    it('id 应该优先于 _id', () => {
      const question = {
        id: 'regular-id',
        _id: 'mongo-id',
        text: '测试题目',
        debit: ['科目A'],
        credit: ['科目B']
      };

      expect(generateQuestionKey(question)).toBe('id-regular-id');
    });
  });

  describe('基于内容生成哈希 key', () => {
    it('相同内容应该生成相同的 key', () => {
      const question1 = {
        text: '企业用银行存款购买原材料',
        debit: ['原材料'],
        credit: ['银行存款'],
        distractors: ['应付账款']
      };

      const question2 = {
        text: '企业用银行存款购买原材料',
        debit: ['原材料'],
        credit: ['银行存款'],
        distractors: ['库存商品'] // 干扰项不影响 key
      };

      const key1 = generateQuestionKey(question1);
      const key2 = generateQuestionKey(question2);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^content-[a-z0-9]+$/);
    });

    it('不同文本应该生成不同的 key', () => {
      const question1 = {
        text: '企业用银行存款购买原材料',
        debit: ['原材料'],
        credit: ['银行存款']
      };

      const question2 = {
        text: '企业销售商品收到货款',
        debit: ['原材料'],
        credit: ['银行存款']
      };

      expect(generateQuestionKey(question1)).not.toBe(generateQuestionKey(question2));
    });

    it('不同借方科目应该生成不同的 key', () => {
      const question1 = {
        text: '相同文本',
        debit: ['制造费用'],
        credit: ['银行存款']
      };

      const question2 = {
        text: '相同文本',
        debit: ['管理费用'],
        credit: ['银行存款']
      };

      expect(generateQuestionKey(question1)).not.toBe(generateQuestionKey(question2));
    });

    it('不同贷方科目应该生成不同的 key', () => {
      const question1 = {
        text: '相同文本',
        debit: ['原材料'],
        credit: ['银行存款']
      };

      const question2 = {
        text: '相同文本',
        debit: ['原材料'],
        credit: ['应付账款']
      };

      expect(generateQuestionKey(question1)).not.toBe(generateQuestionKey(question2));
    });

    it('借贷方科目顺序不影响 key（因为会排序）', () => {
      const question1 = {
        text: '测试',
        debit: ['科目A', '科目B', '科目C'],
        credit: ['科目X', '科目Y']
      };

      const question2 = {
        text: '测试',
        debit: ['科目C', '科目A', '科目B'], // 不同顺序
        credit: ['科目Y', '科目X'] // 不同顺序
      };

      expect(generateQuestionKey(question1)).toBe(generateQuestionKey(question2));
    });

    it('文本大小写不影响 key', () => {
      const question1 = {
        text: '企业用银行存款购买原材料',
        debit: ['原材料'],
        credit: ['银行存款']
      };

      const question2 = {
        text: '企业用银行存款购买原材料', // 同样的文本
        debit: ['原材料'],
        credit: ['银行存款']
      };

      expect(generateQuestionKey(question1)).toBe(generateQuestionKey(question2));
    });

    it('支持使用 scenario 字段替代 text', () => {
      const question = {
        scenario: '企业计提折旧',
        debit: ['制造费用'],
        credit: ['累计折旧']
      };

      const key = generateQuestionKey(question);
      expect(key).toMatch(/^content-[a-z0-9]+$/);
    });
  });

  describe('边界情况处理', () => {
    it('空对象应该生成有效 key', () => {
      const key = generateQuestionKey({});
      expect(key).toMatch(/^content-[a-z0-9]+$/);
    });

    it('undefined 参数应该生成有效 key', () => {
      const key = generateQuestionKey(undefined);
      expect(key).toMatch(/^content-[a-z0-9]+$/);
    });

    it('null 参数应该生成有效 key', () => {
      const key = generateQuestionKey(null);
      expect(key).toMatch(/^content-[a-z0-9]+$/);
    });

    it('缺少 debit/credit 字段应该正常处理', () => {
      const question = {
        text: '仅有文本'
      };
      const key = generateQuestionKey(question);
      expect(key).toMatch(/^content-[a-z0-9]+$/);
    });

    it('debit/credit 为非数组应该正常处理', () => {
      const question = {
        text: '测试',
        debit: '不是数组',
        credit: null
      };
      const key = generateQuestionKey(question);
      expect(key).toMatch(/^content-[a-z0-9]+$/);
    });

    it('空白文本应该被 trim 处理', () => {
      const question1 = {
        text: '  测试文本  ',
        debit: ['A'],
        credit: ['B']
      };

      const question2 = {
        text: '测试文本',
        debit: ['A'],
        credit: ['B']
      };

      expect(generateQuestionKey(question1)).toBe(generateQuestionKey(question2));
    });
  });

  describe('哈希稳定性', () => {
    it('同一题目多次调用应该返回完全相同的 key', () => {
      const question = {
        text: '企业用银行存款购买原材料',
        debit: ['原材料'],
        credit: ['银行存款']
      };

      const keys = Array.from({ length: 100 }, () => generateQuestionKey(question));
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(1);
    });

    it('生成的 key 应该是无符号 32 位整数的 base36 表示', () => {
      const question = {
        text: '测试',
        debit: ['A'],
        credit: ['B']
      };

      const key = generateQuestionKey(question);
      const hashPart = key.replace('content-', '');

      // base36 应该只包含 0-9 和 a-z
      expect(hashPart).toMatch(/^[0-9a-z]+$/);
    });
  });
});

describe('extractScenarios', () => {
  describe('直接 scenarios 结构', () => {
    it('应该提取 data.scenarios 数组', () => {
      const data = {
        scenarios: [
          { id: '1', text: '题目1' },
          { id: '2', text: '题目2' }
        ]
      };

      const result = extractScenarios(data);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('scenarios 为空数组应该返回空数组', () => {
      const data = { scenarios: [] };
      expect(extractScenarios(data)).toEqual([]);
    });
  });

  describe('嵌套 output.scenarios 结构', () => {
    it('应该提取 data.output.scenarios 数组', () => {
      const data = {
        output: {
          scenarios: [
            { id: '1', text: '题目1' },
            { id: '2', text: '题目2' },
            { id: '3', text: '题目3' }
          ]
        }
      };

      const result = extractScenarios(data);
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
    });

    it('同时存在两种结构时，优先使用直接的 scenarios', () => {
      const data = {
        scenarios: [{ id: 'direct', text: '直接' }],
        output: {
          scenarios: [{ id: 'nested', text: '嵌套' }]
        }
      };

      const result = extractScenarios(data);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('direct');
    });
  });

  describe('边界情况处理', () => {
    it('null 数据应该返回空数组', () => {
      expect(extractScenarios(null)).toEqual([]);
    });

    it('undefined 数据应该返回空数组', () => {
      expect(extractScenarios(undefined)).toEqual([]);
    });

    it('空对象应该返回空数组', () => {
      expect(extractScenarios({})).toEqual([]);
    });

    it('scenarios 不是数组应该返回空数组', () => {
      const data = { scenarios: 'not-an-array' };
      expect(extractScenarios(data)).toEqual([]);
    });

    it('output.scenarios 不是数组应该返回空数组', () => {
      const data = { output: { scenarios: null } };
      expect(extractScenarios(data)).toEqual([]);
    });

    it('仅有 output 但缺少 scenarios 应该返回空数组', () => {
      const data = { output: { other: 'data' } };
      expect(extractScenarios(data)).toEqual([]);
    });
  });

  describe('真实数据模拟', () => {
    it('应该处理真实的 n8n webhook 响应格式', () => {
      const webhookResponse = {
        scenarios: [
          {
            id: 'sample-001',
            text: '企业计提本月生产车间固定资产折旧。',
            debit: ['制造费用'],
            credit: ['累计折旧'],
            distractors: ['管理费用', '固定资产', '生产成本']
          },
          {
            id: 'sample-002',
            text: '企业用银行存款购买原材料入库。',
            debit: ['原材料'],
            credit: ['银行存款'],
            distractors: ['应付账款', '库存商品', '预付账款']
          }
        ]
      };

      const result = extractScenarios(webhookResponse);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('debit');
      expect(result[0]).toHaveProperty('credit');
      expect(result[0]).toHaveProperty('distractors');
    });
  });
});
