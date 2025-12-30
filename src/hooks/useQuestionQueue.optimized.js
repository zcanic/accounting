/**
 * 题库队列管理 Hook（优化版）
 * @module hooks/useQuestionQueue
 *
 * 主要改进：
 * 1. 使用独立的工具函数模块
 * 2. 提取 API 调用逻辑
 * 3. 优化代码结构和可读性
 * 4. 增强类型注释和文档
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import initialScenarios from '../data/scenarios.json';
import {
  generateQuestionKey,
  extractScenarios,
  normalizeQuestion,
  getAccountOptions as getOptionsFromQuestion
} from '../utils/questionUtils';

// ==================== 配置常量 ====================

/** n8n Production webhook URL */
const N8N_WEBHOOK_URL = 'http://8.138.47.26:5678/webhook/get-accounting-scenarios';

/** 每次请求的题目数量 */
const FETCH_BATCH_SIZE = 5;

/** 剩余题目低于此数量时触发自动补货 */
const LOW_STOCK_THRESHOLD = 2;

/** 连续空响应的最大重试次数 */
const MAX_EMPTY_FETCH_RETRIES = 3;

/** 是否启用缓存破坏符 */
const CACHE_BUSTER = true;

/** 是否启用调试日志 */
const DEBUG_MODE = true;

/** 请求超时时间（毫秒） */
const FETCH_TIMEOUT = 10000;

/** 请求节流间隔（毫秒） */
const THROTTLE_INTERVAL = 3000;

// ==================== 工具函数 ====================

/**
 * 调试日志输出
 * @param {string} message - 日志消息
 * @param {*} [data] - 附加数据
 */
const debugLog = (message, data) => {
  if (DEBUG_MODE) {
    if (data !== undefined) {
      console.log(`[useQuestionQueue] ${message}`, data);
    } else {
      console.log(`[useQuestionQueue] ${message}`);
    }
  }
};

/**
 * 从 n8n webhook 获取题目
 * @param {AbortSignal} [abortSignal] - 外部取消信号
 * @returns {Promise<Array>} 题目数组
 */
const fetchQuestionsFromN8n = async (abortSignal = null) => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
    debugLog(`Request timed out after ${FETCH_TIMEOUT}ms`);
  }, FETCH_TIMEOUT);

  try {
    const url = new URL(N8N_WEBHOOK_URL);
    url.searchParams.set('count', FETCH_BATCH_SIZE);
    if (CACHE_BUSTER) {
      url.searchParams.set('_', Date.now().toString());
    }

    debugLog(`Fetching questions from: ${url.toString()}`);

    // 合并外部和超时信号
    const combinedSignal = abortSignal
      ? AbortSignal.any([abortSignal, timeoutController.signal])
      : timeoutController.signal;

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[useQuestionQueue] HTTP error! status: ${response.status}, url: ${url.toString()}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const scenarios = extractScenarios(data);

    debugLog('Received response:', {
      hasData: !!data,
      scenariosCount: scenarios.length,
      dataStructure: Object.keys(data || {})
    });

    return scenarios;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      debugLog('Fetch aborted (timeout or component unmount)');
      return [];
    }

    console.error('[useQuestionQueue] Error fetching from n8n:', error);
    return [];
  }
};

// ==================== 主 Hook ====================

/**
 * 题库队列管理 Hook
 *
 * 功能：
 * - 自动加载本地和远程题目
 * - 智能去重（基于内容哈希）
 * - 自动补货（剩余题目不足时）
 * - 请求节流和超时保护
 * - 组件卸载清理
 *
 * @returns {Object} Hook 返回对象
 */
export const useQuestionQueueFixed = () => {
  // ========== 状态管理 ==========
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);
  const [emptyFetchCount, setEmptyFetchCount] = useState(0);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [hasRemoteData, setHasRemoteData] = useState(false);
  const [hasCheckedRemote, setHasCheckedRemote] = useState(false);

  // ========== Refs（稳定引用） ==========
  const questionsRef = useRef(questions);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const fetchAttemptsRef = useRef(0);
  const emptyFetchCountRef = useRef(0);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // 同步 refs
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    emptyFetchCountRef.current = emptyFetchCount;
  }, [emptyFetchCount]);

  // 组件卸载时清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // ========== 计算属性 ==========
  const canFetchMore = useMemo(() => {
    return !isFetchingMore && emptyFetchCount <= MAX_EMPTY_FETCH_RETRIES;
  }, [isFetchingMore, emptyFetchCount]);

  // ========== 核心功能函数 ==========

  /**
   * 统一节流检查
   */
  const shouldThrottle = useCallback(() => {
    const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
    if (timeSinceLastFetch < THROTTLE_INTERVAL) {
      debugLog(`Throttled: ${timeSinceLastFetch}ms since last fetch (need ${THROTTLE_INTERVAL}ms)`);
      return true;
    }
    return false;
  }, []);

  /**
   * 合并新题目到队列
   * @param {Array} incoming - 新题目数组
   * @param {string} source - 题目来源
   * @returns {number} 新增题目数量
   */
  const mergeQuestions = useCallback((incoming = [], source = 'remote') => {
    if (!incoming.length) {
      debugLog(`mergeQuestions: incoming array is empty from ${source}`);
      return 0;
    }

    debugLog(`mergeQuestions: processing ${incoming.length} questions from ${source}`);

    // 标准化题目并生成 key
    const normalized = incoming.map((q, idx) => {
      const question = normalizeQuestion(q, source);
      debugLog(`Question ${idx}: key=${question.id}, text="${(q.text || q.scenario || '').substring(0, 50)}..."`);
      return question;
    });

    // 基于内容哈希去重
    const currentQuestions = questionsRef.current;
    const existingIds = new Set(currentQuestions.map(q => q.id));
    const deduped = normalized.filter(q => {
      if (existingIds.has(q.id)) {
        debugLog(`Skipping duplicate: ${q.id}`);
        return false;
      }
      return true;
    });

    debugLog(`mergeQuestions: ${deduped.length} new questions after deduplication (${normalized.length - deduped.length} filtered out)`);

    if (deduped.length > 0 && isMountedRef.current) {
      setQuestions(prev => {
        const newQuestions = [...prev, ...deduped];
        debugLog(`Questions updated: ${prev.length} -> ${newQuestions.length} total`);
        return newQuestions;
      });
    } else {
      debugLog(`mergeQuestions: no new questions added from ${source}`);
    }

    return deduped.length;
  }, []);

  /**
   * 从本地数据补货
   */
  const replenishFromLocal = useCallback(() => {
    if (!isMountedRef.current) return 0;

    debugLog('Replenishing from local');
    const added = mergeQuestions(initialScenarios.scenarios, 'local-replenish');

    if (added > 0) {
      setEmptyFetchCount(0);
    }

    return added;
  }, [mergeQuestions]);

  /**
   * 从远程获取更多题目
   */
  const fetchMoreQuestions = useCallback(async () => {
    // 节流检查
    if (shouldThrottle()) return;

    // 状态检查（使用 ref 获取最新值）
    const currentEmptyCount = emptyFetchCountRef.current;
    const canFetch = !isFetchingRef.current && currentEmptyCount <= MAX_EMPTY_FETCH_RETRIES;

    if (!canFetch) {
      debugLog('fetchMoreQuestions: skipping', {
        isFetching: isFetchingRef.current,
        emptyCount: currentEmptyCount
      });
      if (isMountedRef.current) {
        setPendingAdvance(false);
      }
      return;
    }

    // 锁定请求
    isFetchingRef.current = true;
    lastFetchTimeRef.current = Date.now();
    fetchAttemptsRef.current += 1;

    const attemptNumber = fetchAttemptsRef.current;
    abortControllerRef.current = new AbortController();

    debugLog(`fetchMoreQuestions #${attemptNumber}: starting`, {
      emptyFetchCount: currentEmptyCount,
      currentQuestions: questionsRef.current.length,
    });

    if (isMountedRef.current) {
      setIsFetchingMore(true);
    }

    try {
      const scenarios = await fetchQuestionsFromN8n(abortControllerRef.current.signal);

      if (!isMountedRef.current) return;

      if (scenarios && scenarios.length > 0) {
        const added = mergeQuestions(scenarios, `remote-attempt-${attemptNumber}`);
        setHasRemoteData(true);

        if (added > 0) {
          setEmptyFetchCount(0);

          // 处理等待前进的状态
          setPendingAdvance(prev => {
            if (prev) {
              debugLog(`fetchMoreQuestions #${attemptNumber}: advancing index after adding ${added} questions`);
              setCurrentIndex(idx => idx + 1);
            }
            return false;
          });
        } else {
          // 全部重复
          setEmptyFetchCount(prev => {
            const newCount = prev + 1;
            debugLog(`fetchMoreQuestions #${attemptNumber}: no new questions, emptyCount: ${newCount}`);

            if (newCount >= MAX_EMPTY_FETCH_RETRIES) {
              setTimeout(() => replenishFromLocal(), 0);
            }

            return newCount;
          });
          setPendingAdvance(false);
        }
      } else {
        // 空响应
        debugLog(`fetchMoreQuestions #${attemptNumber}: received empty scenarios array`);
        setEmptyFetchCount(prev => prev + 1);
        setPendingAdvance(false);
        replenishFromLocal();
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      console.error(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: error:`, err);
      setError('Failed to fetch more questions');
      setPendingAdvance(false);
      replenishFromLocal();
    } finally {
      isFetchingRef.current = false;
      abortControllerRef.current = null;

      if (isMountedRef.current) {
        setIsFetchingMore(false);
        setHasCheckedRemote(true);
      }

      debugLog(`fetchMoreQuestions #${attemptNumber}: completed`);
    }
  }, [shouldThrottle, mergeQuestions, replenishFromLocal]);

  // ========== 初始化加载 ==========
  useEffect(() => {
    debugLog('Initial load starting');

    const initAbortController = new AbortController();
    setIsLoading(true);

    // 加载本地种子数据
    const localSeed = initialScenarios.scenarios.slice(0, FETCH_BATCH_SIZE);
    debugLog(`Loaded ${localSeed.length} local questions`);

    mergeQuestions(localSeed, 'local');
    setCurrentIndex(0);
    setIsLoading(false);

    // 后台获取远程题目
    (async () => {
      try {
        const remoteScenarios = await fetchQuestionsFromN8n(initAbortController.signal);

        if (!isMountedRef.current) return;

        if (remoteScenarios.length > 0) {
          const addedRemote = mergeQuestions(remoteScenarios, 'remote');
          if (addedRemote > 0) {
            setHasRemoteData(true);
            setEmptyFetchCount(0);
          }
        } else {
          setEmptyFetchCount(prev => prev + 1);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('[useQuestionQueue] Init error:', err);
        setError(err);
      } finally {
        if (isMountedRef.current) {
          setHasCheckedRemote(true);
        }
      }
    })();

    return () => {
      initAbortController.abort();
    };
  }, [mergeQuestions]);

  // ========== 自动补货 ==========
  useEffect(() => {
    const questionsLen = questionsRef.current.length;
    const remaining = questionsLen - currentIndex - 1;

    debugLog(`Auto-fetch check: remaining=${remaining}, isLoading=${isLoading}`);

    if (isLoading) return;
    if (isFetchingRef.current) return;
    if (questionsLen === 0) return;
    if (emptyFetchCountRef.current > MAX_EMPTY_FETCH_RETRIES) {
      debugLog('Auto-fetch: exceeded retry limit');
      return;
    }

    if (remaining <= LOW_STOCK_THRESHOLD) {
      debugLog(`Triggering auto-fetch: remaining=${remaining} <= ${LOW_STOCK_THRESHOLD}`);
      fetchMoreQuestions();
    }
  }, [currentIndex, isLoading, fetchMoreQuestions]);

  // ========== 导出的 API ==========

  const currentQuestion = questions[currentIndex] || null;

  const nextQuestion = useCallback(() => {
    const questionsLen = questionsRef.current.length;
    const currentEmptyCount = emptyFetchCountRef.current;
    const canFetch = !isFetchingRef.current && currentEmptyCount <= MAX_EMPTY_FETCH_RETRIES;

    debugLog(`nextQuestion called: currentIndex=${currentIndex}, total=${questionsLen}`);

    if (currentIndex >= questionsLen - 1) {
      debugLog('nextQuestion: at end of questions');

      if (canFetch) {
        debugLog('nextQuestion: setting pendingAdvance and fetching more');
        setPendingAdvance(true);
        fetchMoreQuestions();
        return false;
      } else {
        debugLog('nextQuestion: cannot fetch more, trying local replenish');
        const addedLocal = replenishFromLocal();
        if (addedLocal > 0) {
          setCurrentIndex(prev => prev + 1);
          return true;
        }
        return false;
      }
    }

    setCurrentIndex(prev => prev + 1);
    return true;
  }, [currentIndex, fetchMoreQuestions, replenishFromLocal]);

  const resetQueue = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const getAccountOptions = useCallback(() => {
    if (!currentQuestion) return [];
    return getOptionsFromQuestion(currentQuestion, true);
  }, [currentQuestion]);

  const manualFetchMore = useCallback(() => {
    debugLog('Manual fetch triggered');
    fetchMoreQuestions();
  }, [fetchMoreQuestions]);

  return {
    currentQuestion,
    currentIndex,
    totalQuestions: questions.length,
    isLoading,
    isFetchingMore,
    isAwaitingNext: pendingAdvance || isFetchingMore,
    hasCheckedRemote,
    hasRemoteData,
    error,
    nextQuestion,
    resetQueue,
    getAccountOptions,
    fetchMoreQuestions: manualFetchMore,
    _debug: DEBUG_MODE ? {
      emptyFetchCount,
      pendingAdvance,
      canFetchMore,
      fetchAttempts: fetchAttemptsRef.current,
    } : undefined
  };
};

export default useQuestionQueueFixed;

// 别名导出，保持向后兼容
export { useQuestionQueueFixed as useQuestionQueue };
