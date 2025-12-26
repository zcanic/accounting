import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import initialScenarios from '../data/scenarios.json';

// n8n Production webhook
const N8N_WEBHOOK_URL = 'http://8.138.47.26:5678/webhook/get-accounting-scenarios';
const FETCH_BATCH_SIZE = 5;           // 每次期望获取的题目数量
const LOW_STOCK_THRESHOLD = 2;        // 低于该数量时触发补货
const MAX_EMPTY_FETCH_RETRIES = 3;    // 连续拿到空结果后不再打扰用户
const CACHE_BUSTER = true;            // 避免上游缓存返回重复
const DEBUG_MODE = true;              // 启用调试日志
const FETCH_TIMEOUT = 10000;          // 请求超时时间（10秒）
const THROTTLE_INTERVAL = 3000;       // 统一节流间隔（3秒）

// 改进的 key 生成函数：仅基于内容哈希，确保相同内容生成相同 key
const generateQuestionKey = (q = {}) => {
  // 优先使用已有的 id
  if (q?.id) return `id-${q.id}`;
  if (q?._id) return `_id-${q._id}`;

  // 如果没有 id，使用内容生成稳定的 key（不包含时间戳）
  const text = (q.text || q.scenario || '').trim().toLowerCase();
  const debit = Array.isArray(q.debit) ? q.debit.sort().join('|') : '';
  const credit = Array.isArray(q.credit) ? q.credit.sort().join('|') : '';

  // 使用哈希生成稳定的 key
  const contentHash = `${text}|${debit}|${credit}`;
  const simpleHash = contentHash.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  // 转换为无符号整数再转36进制，确保一致性
  return `content-${(simpleHash >>> 0).toString(36)}`;
};

// Extract scenarios from webhook payload (supports both {scenarios} and {output:{scenarios}})
const extractScenarios = (data) => {
  if (!data) return [];
  if (Array.isArray(data?.scenarios)) return data.scenarios;
  if (Array.isArray(data?.output?.scenarios)) return data.output.scenarios;
  return [];
};

// Fetch questions from webhook with AbortController and timeout support
const fetchQuestionsFromN8n = async (abortSignal = null) => {
  // 创建内部 AbortController 用于超时
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Request timed out after ${FETCH_TIMEOUT}ms`);
    }
  }, FETCH_TIMEOUT);

  try {
    const url = new URL(N8N_WEBHOOK_URL);
    url.searchParams.set('count', FETCH_BATCH_SIZE);
    if (CACHE_BUSTER) url.searchParams.set('_', Date.now().toString());

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Fetching questions from: ${url.toString()}`);
    }

    // 合并外部和超时的 abort signal
    const combinedSignal = abortSignal
      ? AbortSignal.any([abortSignal, timeoutController.signal])
      : timeoutController.signal;

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[useQuestionQueue] HTTP error! status: ${response.status}, url: ${url.toString()}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Received response:`, {
        hasData: !!data,
        scenariosCount: extractScenarios(data).length,
        dataStructure: Object.keys(data || {})
      });
    }

    const scenarios = extractScenarios(data);

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Extracted ${scenarios.length} scenarios`);
    }

    return scenarios;
  } catch (error) {
    clearTimeout(timeoutId);

    // 区分取消和其他错误
    if (error.name === 'AbortError') {
      if (DEBUG_MODE) {
        console.log('[useQuestionQueue] Fetch aborted (timeout or component unmount)');
      }
      return [];
    }

    console.error('[useQuestionQueue] Error fetching from n8n:', error);
    // Return empty on error, will use local data
    return [];
  }
};

export const useQuestionQueueFixed = () => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);
  const [emptyFetchCount, setEmptyFetchCount] = useState(0);
  const [pendingAdvance, setPendingAdvance] = useState(false); // 已到末尾，等待补货
  const [hasRemoteData, setHasRemoteData] = useState(false);    // 已成功获取远端题
  const [hasCheckedRemote, setHasCheckedRemote] = useState(false); // 完成首轮远端探测

  // Refs for stable state management (避免闭包陈旧值问题)
  const questionsRef = useRef(questions);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const fetchAttemptsRef = useRef(0);
  const emptyFetchCountRef = useRef(0);  // 使用 ref 追踪最新值
  const abortControllerRef = useRef(null);  // 用于取消请求
  const isMountedRef = useRef(true);  // 追踪组件是否已挂载

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
      // 取消任何进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 使用 useMemo 缓存 canFetchMore，避免每次渲染创建新引用
  const canFetchMore = useMemo(() => {
    return !isFetchingMore && emptyFetchCount <= MAX_EMPTY_FETCH_RETRIES;
  }, [isFetchingMore, emptyFetchCount]);

  // 统一节流检查函数
  const shouldThrottle = useCallback(() => {
    const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
    if (timeSinceLastFetch < THROTTLE_INTERVAL) {
      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] Throttled: ${timeSinceLastFetch}ms since last fetch (need ${THROTTLE_INTERVAL}ms)`);
      }
      return true;
    }
    return false;
  }, []);

  // 改进的合并函数：基于内容哈希去重
  const mergeQuestions = useCallback((incoming = [], source = 'remote') => {
    if (!incoming.length) {
      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] mergeQuestions: incoming array is empty from ${source}`);
      }
      return 0;
    }

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] mergeQuestions: processing ${incoming.length} questions from ${source}`);
    }

    // 为每个题目生成稳定的 key（基于内容，不含时间戳）
    const normalized = incoming.map((q, idx) => {
      const key = generateQuestionKey(q);
      const normalizedQuestion = {
        ...q,
        id: key,
        source, // 记录题目来源
        timestamp: Date.now(), // 记录添加时间
      };

      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] Question ${idx}: key=${key}, text="${(q.text || q.scenario || '').substring(0, 50)}..."`);
      }
      return normalizedQuestion;
    });

    const currentQuestions = questionsRef.current;

    // 严格去重：基于内容哈希，相同内容不重复添加
    const existingIds = new Set(currentQuestions.map(q => q.id));
    const deduped = normalized.filter(q => {
      if (existingIds.has(q.id)) {
        if (DEBUG_MODE) {
          console.log(`[useQuestionQueue] Skipping duplicate: ${q.id}`);
        }
        return false;
      }
      return true;
    });

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] mergeQuestions: ${deduped.length} new questions after deduplication (${normalized.length - deduped.length} filtered out)`);
    }

    if (deduped.length > 0 && isMountedRef.current) {
      setQuestions(prev => {
        const newQuestions = [...prev, ...deduped];
        if (DEBUG_MODE) {
          console.log(`[useQuestionQueue] Questions updated: ${prev.length} -> ${newQuestions.length} total`);
        }
        return newQuestions;
      });
    } else if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] mergeQuestions: no new questions added from ${source}`);
    }

    return deduped.length;
  }, []);

  // 初始加载（带请求取消支持）
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log('[useQuestionQueue] Initial load starting');
    }

    // 创建 AbortController 用于取消初始请求
    const initAbortController = new AbortController();

    setIsLoading(true);

    // 加载本地题目
    const localSeed = initialScenarios.scenarios.slice(0, FETCH_BATCH_SIZE);
    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Loaded ${localSeed.length} local questions`);
    }

    // 使用改进的合并函数
    mergeQuestions(localSeed, 'local');
    setCurrentIndex(0);
    setIsLoading(false);

    // 后台获取远程题目
    (async () => {
      try {
        const remoteScenarios = await fetchQuestionsFromN8n(initAbortController.signal);

        // 检查组件是否已卸载
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

    // 清理函数：取消请求
    return () => {
      initAbortController.abort();
    };
  }, [mergeQuestions]);

  // 本地补货
  const replenishFromLocal = useCallback(() => {
    if (!isMountedRef.current) return 0;

    if (DEBUG_MODE) {
      console.log('[useQuestionQueue] Replenishing from local');
    }

    const added = mergeQuestions(initialScenarios.scenarios, 'local-replenish');
    if (added > 0) {
      setEmptyFetchCount(0);
    }
    return added;
  }, [mergeQuestions]);

  // 获取更多题目 - 完全重构版本
  const fetchMoreQuestions = useCallback(async () => {
    // 1. 统一节流检查（在所有调用路径都生效）
    if (shouldThrottle()) {
      return;
    }

    // 2. 使用 ref 获取最新值进行检查（避免闭包陈旧值）
    const currentEmptyCount = emptyFetchCountRef.current;
    const canFetch = !isFetchingRef.current && currentEmptyCount <= MAX_EMPTY_FETCH_RETRIES;

    if (!canFetch) {
      if (DEBUG_MODE) {
        console.log('[useQuestionQueue] fetchMoreQuestions: skipping - isFetching:', isFetchingRef.current, 'emptyCount:', currentEmptyCount);
      }
      if (isMountedRef.current) {
        setPendingAdvance(false);
      }
      return;
    }

    // 3. 立即锁定，防止并发请求
    isFetchingRef.current = true;
    lastFetchTimeRef.current = Date.now();

    fetchAttemptsRef.current += 1;
    const attemptNumber = fetchAttemptsRef.current;

    // 创建 AbortController 用于本次请求
    abortControllerRef.current = new AbortController();

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: starting`, {
        emptyFetchCount: currentEmptyCount,
        currentQuestions: questionsRef.current.length,
      });
    }

    if (isMountedRef.current) {
      setIsFetchingMore(true);
    }

    try {
      const scenarios = await fetchQuestionsFromN8n(abortControllerRef.current.signal);

      // 检查组件是否已卸载
      if (!isMountedRef.current) return;

      if (scenarios && scenarios.length > 0) {
        const added = mergeQuestions(scenarios, `remote-attempt-${attemptNumber}`);
        setHasRemoteData(true);

        if (added > 0) {
          // 成功获取新题目，重置计数
          setEmptyFetchCount(0);

          // 如果有等待前进的状态，现在可以前进了
          setPendingAdvance(prev => {
            if (prev) {
              if (DEBUG_MODE) {
                console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: advancing index after adding ${added} questions`);
              }
              setCurrentIndex(idx => idx + 1);
            }
            return false;
          });
        } else {
          // 没有新增题目（全部重复）- 使用函数式更新
          setEmptyFetchCount(prev => {
            const newCount = prev + 1;
            if (DEBUG_MODE) {
              console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: no new questions, emptyCount: ${newCount}`);
            }
            // 达到上限时触发本地补货
            if (newCount >= MAX_EMPTY_FETCH_RETRIES) {
              setTimeout(() => replenishFromLocal(), 0);
            }
            return newCount;
          });
          setPendingAdvance(false);
        }
      } else {
        // 远程返回空数组 - 使用函数式更新
        if (DEBUG_MODE) {
          console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: received empty scenarios array`);
        }

        setEmptyFetchCount(prev => prev + 1);
        setPendingAdvance(false);

        // 立即尝试本地补货
        replenishFromLocal();
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      if (DEBUG_MODE) {
        console.error(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: error:`, err);
      }
      setError('Failed to fetch more questions');
      setPendingAdvance(false);

      // 错误时立即尝试本地补货
      replenishFromLocal();
    } finally {
      isFetchingRef.current = false;
      abortControllerRef.current = null;

      if (isMountedRef.current) {
        setIsFetchingMore(false);
        setHasCheckedRemote(true);
      }

      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: completed`);
      }
    }
  }, [shouldThrottle, mergeQuestions, replenishFromLocal]);

  // 自动获取更多题目 - 精简依赖项，避免无限循环
  useEffect(() => {
    // 使用 ref 获取最新状态，避免将这些值加入依赖项
    const questionsLen = questionsRef.current.length;
    const remaining = questionsLen - currentIndex - 1;

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Auto-fetch check: remaining=${remaining}, isLoading=${isLoading}`);
    }

    // 基本检查
    if (isLoading) return;
    if (isFetchingRef.current) return;
    if (questionsLen === 0) return;

    // 使用 ref 检查是否超出重试限制
    if (emptyFetchCountRef.current > MAX_EMPTY_FETCH_RETRIES) {
      if (DEBUG_MODE) {
        console.log('[useQuestionQueue] Auto-fetch: exceeded retry limit');
      }
      return;
    }

    if (remaining <= LOW_STOCK_THRESHOLD) {
      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] Triggering auto-fetch: remaining=${remaining} <= ${LOW_STOCK_THRESHOLD}`);
      }
      // fetchMoreQuestions 内部会处理节流
      fetchMoreQuestions();
    }
  }, [currentIndex, isLoading, fetchMoreQuestions]);  // 仅保留必要依赖

  const currentQuestion = questions[currentIndex] || null;

  // 改进的 nextQuestion 函数 - 使用 ref 获取最新状态
  const nextQuestion = useCallback(() => {
    const questionsLen = questionsRef.current.length;
    const currentEmptyCount = emptyFetchCountRef.current;
    const canFetch = !isFetchingRef.current && currentEmptyCount <= MAX_EMPTY_FETCH_RETRIES;

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] nextQuestion called: currentIndex=${currentIndex}, total=${questionsLen}`);
    }

    // 如果已到末尾
    if (currentIndex >= questionsLen - 1) {
      if (DEBUG_MODE) {
        console.log('[useQuestionQueue] nextQuestion: at end of questions');
      }

      if (canFetch) {
        // 可以获取更多题目
        if (DEBUG_MODE) {
          console.log('[useQuestionQueue] nextQuestion: setting pendingAdvance and fetching more');
        }
        setPendingAdvance(true);
        fetchMoreQuestions();
        return false; // 等待补货完成
      } else {
        // 不能获取更多题目，尝试本地补货
        if (DEBUG_MODE) {
          console.log('[useQuestionQueue] nextQuestion: cannot fetch more, trying local replenish');
        }
        const addedLocal = replenishFromLocal();
        if (addedLocal > 0) {
          setCurrentIndex(prev => prev + 1);
          return true;
        }
        return false;
      }
    }

    // 正常前进到下一题
    setCurrentIndex(prev => prev + 1);
    return true;
  }, [currentIndex, fetchMoreQuestions, replenishFromLocal]);

  const resetQueue = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  // Get all available account options for current question
  const getAccountOptions = useCallback(() => {
    if (!currentQuestion) return [];

    const allAccounts = [
      ...currentQuestion.debit,
      ...currentQuestion.credit,
      ...currentQuestion.distractors
    ];

    return allAccounts.sort(() => Math.random() - 0.5);
  }, [currentQuestion]);

  // 手动触发获取更多题目（用于调试）
  const manualFetchMore = useCallback(() => {
    if (DEBUG_MODE) {
      console.log('[useQuestionQueue] Manual fetch triggered');
    }
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
    fetchMoreQuestions: manualFetchMore, // 重命名为更清晰的名称
    // 调试信息
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