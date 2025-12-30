/**
 * 题库工具函数
 * @module utils/questionUtils
 */

/**
 * 生成题目的唯一标识符
 *
 * 策略优先级：
 * 1. 优先使用已有的 id 字段（排除通用 ID 如 scenario-XXX）
 * 2. 其次使用 _id 字段（MongoDB）
 * 3. 最后基于内容生成稳定哈希
 *
 * **注意**：对于远程 webhook 返回的通用 ID（格式为 scenario-\d+），
 * 会忽略 ID 字段，强制使用内容哈希，因为 webhook 每次都返回相同的 ID
 * 但内容不同。
 *
 * @param {Object} question - 题目对象
 * @param {string} [question.id] - 题目 ID
 * @param {string} [question._id] - MongoDB ID
 * @param {string} [question.text] - 题目文本
 * @param {string} [question.scenario] - 场景描述（与 text 二选一）
 * @param {string[]} [question.debit] - 借方科目数组
 * @param {string[]} [question.credit] - 贷方科目数组
 * @returns {string} 唯一标识符，格式为 'id-xxx' 或 'content-xxx'
 *
 * @example
 * // 使用现有 ID（非通用格式）
 * generateQuestionKey({ id: 'q001', text: '测试' })
 * // => 'id-q001'
 *
 * @example
 * // 通用 ID，使用内容哈希
 * generateQuestionKey({ id: 'scenario-001', text: '测试' })
 * // => 'content-abc123xyz'
 *
 * @example
 * // 基于内容生成哈希
 * generateQuestionKey({
 *   text: '企业用银行存款购买原材料',
 *   debit: ['原材料'],
 *   credit: ['银行存款']
 * })
 * // => 'content-abc123xyz'
 */
export const generateQuestionKey = (question = {}) => {
  // 处理 null 和 undefined
  const q = question || {};

  // 对于远程题目的通用 ID（scenario-XXX），不使用 ID 去重
  // 因为远程每次都返回相同的 ID 但不同的内容
  const isGenericId = q.id && /^scenario-\d+$/.test(q.id);

  // 优先使用已有 ID（非通用 ID）
  if (q?.id && !isGenericId) return `id-${q.id}`;
  if (q?._id) return `_id-${q._id}`;

  // 基于内容生成稳定哈希（不含时间戳，确保相同内容生成相同 key）
  const text = (q.text || q.scenario || '').trim().toLowerCase();
  const debit = Array.isArray(q.debit)
    ? q.debit.sort().join('|')
    : '';
  const credit = Array.isArray(q.credit)
    ? q.credit.sort().join('|')
    : '';

  // 使用简单哈希算法生成数字哈希
  const contentHash = `${text}|${debit}|${credit}`;
  const simpleHash = contentHash.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  // 转换为无符号 32 位整数，再转为 base36 字符串
  return `content-${(simpleHash >>> 0).toString(36)}`;
};

/**
 * 从 webhook 响应中提取题目数组
 *
 * 支持两种响应格式：
 * 1. 直接格式：{ scenarios: [...] }
 * 2. 嵌套格式：{ output: { scenarios: [...] } }
 *
 * @param {Object} data - Webhook 响应数据
 * @param {Array} [data.scenarios] - 直接的题目数组
 * @param {Object} [data.output] - 嵌套的输出对象
 * @param {Array} [data.output.scenarios] - 嵌套的题目数组
 * @returns {Array} 题目数组，如果提取失败则返回空数组
 *
 * @example
 * // 直接格式
 * extractScenarios({ scenarios: [{ id: 1 }] })
 * // => [{ id: 1 }]
 *
 * @example
 * // 嵌套格式
 * extractScenarios({ output: { scenarios: [{ id: 1 }] } })
 * // => [{ id: 1 }]
 *
 * @example
 * // 无效数据
 * extractScenarios(null)
 * // => []
 */
export const extractScenarios = (data) => {
  if (!data) return [];

  // 优先使用直接的 scenarios
  if (Array.isArray(data?.scenarios)) {
    return data.scenarios;
  }

  // 其次尝试嵌套的 output.scenarios
  if (Array.isArray(data?.output?.scenarios)) {
    return data.output.scenarios;
  }

  return [];
};

/**
 * 验证题目数据的完整性
 *
 * @param {Object} question - 题目对象
 * @returns {boolean} 是否是有效的题目
 *
 * @example
 * isValidQuestion({
 *   text: '测试',
 *   debit: ['A'],
 *   credit: ['B'],
 *   distractors: ['C']
 * })
 * // => true
 */
export const isValidQuestion = (question) => {
  if (!question || typeof question !== 'object') return false;

  const hasText = !!(question.text || question.scenario);
  const hasDebit = Array.isArray(question.debit) && question.debit.length > 0;
  const hasCredit = Array.isArray(question.credit) && question.credit.length > 0;
  const hasDistractors = Array.isArray(question.distractors);

  return hasText && hasDebit && hasCredit && hasDistractors;
};

/**
 * 标准化题目对象
 *
 * 确保题目具有统一的结构和必要字段
 *
 * @param {Object} question - 原始题目对象
 * @param {string} source - 题目来源标识
 * @returns {Object} 标准化后的题目对象
 */
export const normalizeQuestion = (question, source = 'unknown') => {
  const key = generateQuestionKey(question);

  return {
    ...question,
    id: key,
    text: question.text || question.scenario || '',
    debit: Array.isArray(question.debit) ? question.debit : [],
    credit: Array.isArray(question.credit) ? question.credit : [],
    distractors: Array.isArray(question.distractors) ? question.distractors : [],
    source,
    timestamp: Date.now(),
  };
};

/**
 * 检查两个题目是否相同（基于内容）
 *
 * @param {Object} q1 - 第一个题目
 * @param {Object} q2 - 第二个题目
 * @returns {boolean} 是否相同
 */
export const isSameQuestion = (q1, q2) => {
  const key1 = generateQuestionKey(q1);
  const key2 = generateQuestionKey(q2);

  // 如果都有 ID，比较 ID
  if (q1?.id && q2?.id) {
    return q1.id === q2.id;
  }

  // 否则比较内容哈希
  return key1 === key2;
};

/**
 * 从题目中提取所有科目选项（用于答题）
 *
 * @param {Object} question - 题目对象
 * @param {boolean} shuffle - 是否随机打乱
 * @returns {string[]} 科目选项数组
 */
export const getAccountOptions = (question, shuffle = true) => {
  if (!question) return [];

  const options = [
    ...(question.debit || []),
    ...(question.credit || []),
    ...(question.distractors || [])
  ];

  if (!shuffle) return options;

  // 随机打乱数组
  return options.sort(() => Math.random() - 0.5);
};

/**
 * 检查答案是否正确
 *
 * @param {Object} question - 题目对象
 * @param {string[]} userDebit - 用户选择的借方科目
 * @param {string[]} userCredit - 用户选择的贷方科目
 * @returns {Object} 判题结果
 * @returns {boolean} result.correct - 是否正确
 * @returns {Object} result.details - 详细信息
 */
export const checkAnswer = (question, userDebit, userCredit) => {
  if (!question) {
    return { correct: false, details: { error: 'No question provided' } };
  }

  const correctDebit = [...(question.debit || [])].sort();
  const correctCredit = [...(question.credit || [])].sort();
  const sortedUserDebit = [...userDebit].sort();
  const sortedUserCredit = [...userCredit].sort();

  const debitCorrect =
    sortedUserDebit.length === correctDebit.length &&
    sortedUserDebit.every((item, idx) => item === correctDebit[idx]);

  const creditCorrect =
    sortedUserCredit.length === correctCredit.length &&
    sortedUserCredit.every((item, idx) => item === correctCredit[idx]);

  return {
    correct: debitCorrect && creditCorrect,
    details: {
      debitCorrect,
      creditCorrect,
      correctDebit,
      correctCredit,
      userDebit: sortedUserDebit,
      userCredit: sortedUserCredit
    }
  };
};
