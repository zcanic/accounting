import { useState, useEffect, useCallback } from 'react';
import initialScenarios from '../data/scenarios.json';

// n8n Production webhook
const N8N_WEBHOOK_URL = 'http://8.138.47.26:5678/webhook/get-accounting-scenarios';
const FETCH_BATCH_SIZE = 5;           // 每次期望获取的题目数量
const LOW_STOCK_THRESHOLD = 2;        // 低于该数量时触发补货
const MAX_EMPTY_FETCH_RETRIES = 3;    // 连续拿到空结果后不再打扰用户
const CACHE_BUSTER = true;            // 避免上游缓存返回重复

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

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return extractScenarios(data);
  } catch (error) {
    console.error('Error fetching from n8n:', error);
    // Return empty on error, will use local data
    return [];
  }
};

export const useQuestionQueue = () => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);
  const [emptyFetchCount, setEmptyFetchCount] = useState(0);
  const [pendingAdvance, setPendingAdvance] = useState(false); // 已到末尾，等待补货
  const [hasRemoteData, setHasRemoteData] = useState(false);    // 已成功获取远端题

  const canFetchMore = !isFetchingMore && emptyFetchCount <= MAX_EMPTY_FETCH_RETRIES;

  // 将新题目去重后并入队列，返回新增数量
  const mergeQuestions = useCallback((incoming = []) => {
    if (!incoming.length) return 0;
    let added = 0;
    setQuestions(prev => {
      const existingIds = new Set(prev.map(q => q.id));
      const deduped = incoming.filter(q => q?.id && !existingIds.has(q.id));
      added = deduped.length;
      if (added === 0) return prev;
      return [...prev, ...deduped];
    });
    return added;
  }, []);

  // 从本地立即显示种子题，同时后台抓远端并合并
  useEffect(() => {
    setIsLoading(true);
    const localSeed = initialScenarios.scenarios.slice(0, FETCH_BATCH_SIZE);
    setQuestions(localSeed);
    setCurrentIndex(0);
    setEmptyFetchCount(0);
    setHasRemoteData(false);
    setIsLoading(false);

    // background remote fetch; do not block first paint
    (async () => {
      try {
        const remoteScenarios = await fetchQuestionsFromN8n();
        if (remoteScenarios.length > 0) {
          const added = mergeQuestions(remoteScenarios);
          if (added > 0) setHasRemoteData(true);
          setEmptyFetchCount(0);
        } else {
          setEmptyFetchCount(prev => prev + 1);
        }
      } catch (err) {
        console.error('Init error:', err);
        setError(err);
      }
    })();
  }, [mergeQuestions]);

  // 本地补货：当远端不可用时，把本地题重新混入（去重）
  const replenishFromLocal = useCallback(() => {
    const added = mergeQuestions(initialScenarios.scenarios);
    if (added > 0) {
      setHasRemoteData(false);
      setEmptyFetchCount(0);
    }
    return added;
  }, [mergeQuestions]);

  // Fetch more questions from webhook (dedup, batch expectation)
  const fetchMoreQuestions = useCallback(async () => {
    if (!canFetchMore) return;
    setIsFetchingMore(true);
    try {
      const scenarios = await fetchQuestionsFromN8n();
      if (scenarios && scenarios.length > 0) {
        const added = mergeQuestions(scenarios);
        if (added > 0) {
          setEmptyFetchCount(0);
          setHasRemoteData(true);
          if (pendingAdvance) {
            setCurrentIndex(prev => Math.min(prev + 1, prev + added));
            setPendingAdvance(false);
          }
        } else {
          // 收到重复题，视为无新增，避免死循环
          setEmptyFetchCount(prev => prev + 1);
          setPendingAdvance(false);
          // 远端没有新题，尝试本地补货一次
          replenishFromLocal();
        }
      } else {
        setEmptyFetchCount(prev => prev + 1);
        setPendingAdvance(false);
        // 远端空返回，尝试本地补货一次
        replenishFromLocal();
      }
    } catch (err) {
      setError('Failed to fetch more questions');
      console.error('Error fetching questions:', err);
      replenishFromLocal();
    } finally {
      setIsFetchingMore(false);
    }
  }, [canFetchMore, mergeQuestions, emptyFetchCount, pendingAdvance, replenishFromLocal]);

  // Auto-fetch when remaining stock <= LOW_STOCK_THRESHOLD
  useEffect(() => {
    const remaining = questions.length - currentIndex - 1;
    if (isLoading) return;
    if (!canFetchMore) return;
    if (pendingAdvance) return; // 正在等待上一轮补货，不重复请求
    if (questions.length === 0) return;
    if (remaining <= LOW_STOCK_THRESHOLD) {
      fetchMoreQuestions();
    }
  }, [currentIndex, questions.length, canFetchMore, pendingAdvance, fetchMoreQuestions, isLoading]);

  const currentQuestion = questions[currentIndex] || null;

  const nextQuestion = useCallback(() => {
    // 如果已到末尾，尝试触发补货
    if (currentIndex >= questions.length - 1) {
      if (canFetchMore) {
        setPendingAdvance(true);
        fetchMoreQuestions();
        // 如果远端不可取且本地有库存，直接补货并前进
        const addedLocal = replenishFromLocal();
        if (addedLocal > 0) {
          setPendingAdvance(false);
          setCurrentIndex(prev => Math.min(prev + 1, prev + addedLocal));
          return true;
        }
      } else {
        setPendingAdvance(false);
      }
      return false;
    }
    setCurrentIndex(prev => prev + 1);
    return true;
  }, [currentIndex, questions.length, fetchMoreQuestions, canFetchMore, replenishFromLocal]);

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
    
    // Shuffle the array
    return allAccounts.sort(() => Math.random() - 0.5);
  }, [currentQuestion]);

  return {
    currentQuestion,
    currentIndex,
    totalQuestions: questions.length,
    isLoading,
    isFetchingMore,
    isAwaitingNext: pendingAdvance || isFetchingMore,
    hasRemoteData,
    error,
    nextQuestion,
    resetQueue,
    getAccountOptions,
    fetchMoreQuestions
  };
};

export default useQuestionQueue;
