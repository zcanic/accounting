import { useState, useEffect, useCallback, useRef } from 'react';
import initialScenarios from '../data/scenarios.json';

// n8n Production webhook
const N8N_WEBHOOK_URL = 'http://8.138.47.26:5678/webhook/get-accounting-scenarios';
const FETCH_BATCH_SIZE = 5;           // 每次期望获取的题目数量
const LOW_STOCK_THRESHOLD = 2;        // 低于该数量时触发补货
const MAX_EMPTY_FETCH_RETRIES = 3;    // 连续拿到空结果后不再打扰用户
const CACHE_BUSTER = true;            // 避免上游缓存返回重复
const DEBUG_MODE = true;              // 启用调试日志

// 改进的 key 生成函数：为每个题目生成唯一标识
const generateQuestionKey = (q = {}, index = 0, source = 'unknown') => {
  // 优先使用已有的 id
  if (q?.id) return `id-${q.id}`;
  if (q?._id) return `_id-${q._id}`;

  // 如果没有 id，使用内容和来源生成 key
  const text = (q.text || q.scenario || '').trim();
  const debit = Array.isArray(q.debit) ? q.debit.join('|') : '';
  const credit = Array.isArray(q.credit) ? q.credit.join('|') : '';

  // 使用哈希生成更稳定的 key
  const contentHash = `${text}|${debit}|${credit}`;
  const simpleHash = contentHash.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0).toString(36);

  // 添加来源和时间戳确保唯一性
  return `${source}-${simpleHash}-${Date.now()}-${index}`;
};

// Extract scenarios from webhook payload (supports both {scenarios} and {output:{scenarios}})
const extractScenarios = (data) => {
  if (!data) return [];
  if (Array.isArray(data?.scenarios)) return data.scenarios;
  if (Array.isArray(data?.output?.scenarios)) return data.output.scenarios;
  return [];
};

// Fetch questions from webhook
const fetchQuestionsFromN8n = async () => {
  try {
    const url = new URL(N8N_WEBHOOK_URL);
    url.searchParams.set('count', FETCH_BATCH_SIZE);
    if (CACHE_BUSTER) url.searchParams.set('_', Date.now().toString());

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Fetching questions from: ${url.toString()}`);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

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

  // Refs for state management
  const questionsRef = useRef(questions);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const fetchAttemptsRef = useRef(0);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const canFetchMore = !isFetchingMore && emptyFetchCount <= MAX_EMPTY_FETCH_RETRIES;

  // 改进的合并函数：允许一定程度的重复
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

    // 为每个题目生成唯一 key
    const normalized = incoming.map((q, idx) => {
      const key = generateQuestionKey(q, idx, source);
      const normalizedQuestion = {
        ...q,
        id: key,
        source, // 记录题目来源
        timestamp: Date.now(), // 记录时间戳
      };

      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] Question ${idx}: key=${key}, text="${(q.text || q.scenario || '').substring(0, 50)}..."`);
      }
      return normalizedQuestion;
    });

    const currentQuestions = questionsRef.current;

    // 改进的去重逻辑：允许一定程度的重复
    const existingIds = new Set(currentQuestions.map(q => q.id));
    const deduped = normalized.filter(q => {
      // 如果已经有完全相同的 key，跳过
      if (existingIds.has(q.id)) {
        if (DEBUG_MODE) {
          console.log(`[useQuestionQueue] Skipping duplicate: ${q.id}`);
        }
        return false;
      }

      // 检查是否有非常相似的内容（可选，可以注释掉以允许更多重复）
      const isSimilar = currentQuestions.some(existing => {
        const existingText = (existing.text || existing.scenario || '').trim().toLowerCase();
        const newText = (q.text || q.scenario || '').trim().toLowerCase();
        return existingText === newText;
      });

      if (isSimilar && DEBUG_MODE) {
        console.log(`[useQuestionQueue] Similar content found, but adding anyway: ${q.id}`);
      }

      return true; // 允许添加，即使内容相似
    });

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] mergeQuestions: ${deduped.length} new questions after deduplication (${normalized.length - deduped.length} filtered out)`);
    }

    if (deduped.length > 0) {
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

  // 初始加载
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log('[useQuestionQueue] Initial load starting');
    }

    setIsLoading(true);

    // 加载本地题目
    const localSeed = initialScenarios.scenarios.slice(0, FETCH_BATCH_SIZE);
    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Loaded ${localSeed.length} local questions`);
    }

    // 使用改进的合并函数
    const addedLocal = mergeQuestions(localSeed, 'local');
    setCurrentIndex(0);
    setIsLoading(false);

    // 后台获取远程题目
    (async () => {
      try {
        const remoteScenarios = await fetchQuestionsFromN8n();
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
        console.error('[useQuestionQueue] Init error:', err);
        setError(err);
      } finally {
        setHasCheckedRemote(true);
      }
    })();
  }, [mergeQuestions]);

  // 本地补货
  const replenishFromLocal = useCallback(() => {
    if (DEBUG_MODE) {
      console.log('[useQuestionQueue] Replenishing from local');
    }

    const added = mergeQuestions(initialScenarios.scenarios, 'local-replenish');
    if (added > 0) {
      setEmptyFetchCount(0);
    }
    return added;
  }, [mergeQuestions]);

  // 获取更多题目 - 改进版本
  const fetchMoreQuestions = useCallback(async () => {
    if (!canFetchMore || isFetchingRef.current) {
      if (DEBUG_MODE) {
        console.log('[useQuestionQueue] fetchMoreQuestions: skipping - canFetchMore:', canFetchMore, 'isFetchingRef.current:', isFetchingRef.current);
      }
      setPendingAdvance(false);
      return;
    }

    fetchAttemptsRef.current += 1;
    const attemptNumber = fetchAttemptsRef.current;

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: starting`, {
        canFetchMore,
        isFetchingMore,
        emptyFetchCount,
        pendingAdvance,
        currentQuestions: questionsRef.current.length,
        currentIndex
      });
    }

    isFetchingRef.current = true;
    setIsFetchingMore(true);
    lastFetchTimeRef.current = Date.now();

    try {
      const scenarios = await fetchQuestionsFromN8n();

      if (scenarios && scenarios.length > 0) {
        const added = mergeQuestions(scenarios, `remote-attempt-${attemptNumber}`);
        setHasRemoteData(true);

        if (added > 0) {
          // 成功获取新题目
          setEmptyFetchCount(0);
          if (pendingAdvance) {
            if (DEBUG_MODE) {
              console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: advancing index after adding ${added} questions`);
            }
            setCurrentIndex(prev => prev + 1);
            setPendingAdvance(false);
          }
        } else {
          // 没有新增题目（可能都是重复的）
          if (DEBUG_MODE) {
            console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: no new questions added (all duplicates or similar)`);
          }

          // 增加空获取计数
          const newEmptyCount = emptyFetchCount + 1;
          setEmptyFetchCount(newEmptyCount);
          setPendingAdvance(false);

          // 如果连续多次获取不到新题目，尝试本地补货
          if (newEmptyCount >= MAX_EMPTY_FETCH_RETRIES) {
            if (DEBUG_MODE) {
              console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: emptyFetchCount reached limit (${newEmptyCount}), trying local replenish`);
            }
            replenishFromLocal();
          }
        }
      } else {
        // 远程返回空数组
        if (DEBUG_MODE) {
          console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: received empty scenarios array`);
        }

        const newEmptyCount = emptyFetchCount + 1;
        setEmptyFetchCount(newEmptyCount);
        setPendingAdvance(false);

        // 立即尝试本地补货（远程不可用）
        if (DEBUG_MODE) {
          console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: remote empty, trying local replenish`);
        }
        replenishFromLocal();
      }
    } catch (err) {
      if (DEBUG_MODE) {
        console.error(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: error:`, err);
      }
      setError('Failed to fetch more questions');
      console.error('Error fetching questions:', err);
      setPendingAdvance(false);

      // 错误时立即尝试本地补货
      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: error occurred, trying local replenish`);
      }
      replenishFromLocal();
    } finally {
      setIsFetchingMore(false);
      isFetchingRef.current = false;
      setHasCheckedRemote(true);

      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] fetchMoreQuestions #${attemptNumber}: completed`);
      }
    }
  }, [canFetchMore, mergeQuestions, emptyFetchCount, pendingAdvance, replenishFromLocal]);

  // 自动获取更多题目
  useEffect(() => {
    const remaining = questions.length - currentIndex - 1;

    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] Auto-fetch check: remaining=${remaining}, isLoading=${isLoading}, isFetchingMore=${isFetchingMore}, pendingAdvance=${pendingAdvance}`);
    }

    if (isLoading || isFetchingMore) return;
    if (!canFetchMore) return;
    if (pendingAdvance) return;
    if (questions.length === 0) return;

    if (remaining <= LOW_STOCK_THRESHOLD) {
      // 防止过于频繁的自动获取
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch < 2000) { // 2秒内不重复触发
        if (DEBUG_MODE) {
          console.log(`[useQuestionQueue] Auto-fetch throttled: ${timeSinceLastFetch}ms since last fetch`);
        }
        return;
      }

      if (DEBUG_MODE) {
        console.log(`[useQuestionQueue] Triggering auto-fetch: remaining=${remaining} <= ${LOW_STOCK_THRESHOLD}`);
      }
      fetchMoreQuestions();
    }
  }, [currentIndex, questions.length, isLoading, isFetchingMore, canFetchMore, pendingAdvance, fetchMoreQuestions]);

  const currentQuestion = questions[currentIndex] || null;

  // 改进的 nextQuestion 函数
  const nextQuestion = useCallback(() => {
    if (DEBUG_MODE) {
      console.log(`[useQuestionQueue] nextQuestion called: currentIndex=${currentIndex}, total=${questions.length}`);
    }

    // 如果已到末尾
    if (currentIndex >= questions.length - 1) {
      if (DEBUG_MODE) {
        console.log('[useQuestionQueue] nextQuestion: at end of questions');
      }

      if (canFetchMore && !isFetchingMore) {
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
  }, [currentIndex, questions.length, fetchMoreQuestions, canFetchMore, replenishFromLocal, isFetchingMore]);

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