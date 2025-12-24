import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, RotateCcw, Check, X, ChevronRight, Plus, Minus } from 'lucide-react';

import { useQuestionQueue } from './hooks/useQuestionQueue';

function App() {
  const {
    currentQuestion,
    currentIndex,
    totalQuestions,
    isLoading,
    nextQuestion,
    getAccountOptions
  } = useQuestionQueue();

  // Game state
  const [debitItems, setDebitItems] = useState([]);
  const [creditItems, setCreditItems] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  // Get available accounts for current question
  const accounts = useMemo(() => {
    if (!currentQuestion) return [];
    return getAccountOptions().map((name, idx) => ({
      id: `${currentQuestion.id}-${idx}`,
      name
    }));
  }, [currentQuestion, getAccountOptions]);

  // Get IDs of placed items
  const placedIds = useMemo(() => {
    return [...debitItems.map(i => i.id), ...creditItems.map(i => i.id)];
  }, [debitItems, creditItems]);

  // Reset state when question changes
  useEffect(() => {
    setDebitItems([]);
    setCreditItems([]);
    setSelectedAccount(null);
    setResult(null);
  }, [currentQuestion?.id]);

  // 点击科目选项
  const handleSelectAccount = useCallback((account) => {
    if (placedIds.includes(account.id)) return;
    setSelectedAccount(prev => prev?.id === account.id ? null : account);
  }, [placedIds]);

  // 点击借方按钮 - 将选中科目放入借方
  const handleAddToDebit = useCallback(() => {
    if (!selectedAccount || placedIds.includes(selectedAccount.id)) return;
    setDebitItems(prev => [...prev, selectedAccount]);
    setSelectedAccount(null);
  }, [selectedAccount, placedIds]);

  // 点击贷方按钮 - 将选中科目放入贷方
  const handleAddToCredit = useCallback(() => {
    if (!selectedAccount || placedIds.includes(selectedAccount.id)) return;
    setCreditItems(prev => [...prev, selectedAccount]);
    setSelectedAccount(null);
  }, [selectedAccount, placedIds]);

  // Handle remove from debit
  const handleRemoveDebit = useCallback((id) => {
    setDebitItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Handle remove from credit
  const handleRemoveCredit = useCallback((id) => {
    setCreditItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // 判断答案
  const handleJudge = useCallback(() => {
    if (!currentQuestion) return;
    if (debitItems.length === 0 && creditItems.length === 0) return;

    const userDebitNames = debitItems.map(i => i.name).sort();
    const userCreditNames = creditItems.map(i => i.name).sort();
    
    const correctDebitNames = [...currentQuestion.debit].sort();
    const correctCreditNames = [...currentQuestion.credit].sort();

    const debitCorrect = 
      userDebitNames.length === correctDebitNames.length &&
      userDebitNames.every((name, idx) => name === correctDebitNames[idx]);
    
    const creditCorrect = 
      userCreditNames.length === correctCreditNames.length &&
      userCreditNames.every((name, idx) => name === correctCreditNames[idx]);

    const isCorrect = debitCorrect && creditCorrect;

    if (isCorrect) {
      setResult('success');
      setStreak(prev => prev + 1);
    } else {
      setResult('failure');
      setStreak(0);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  }, [currentQuestion, debitItems, creditItems]);

  // Handle next question
  const handleNext = useCallback(() => {
    if (result === 'success') {
      nextQuestion();
    }
    setDebitItems([]);
    setCreditItems([]);
    setSelectedAccount(null);
    setResult(null);
  }, [result, nextQuestion]);

  // Reset current question
  const handleReset = useCallback(() => {
    setDebitItems([]);
    setCreditItems([]);
    setSelectedAccount(null);
    setResult(null);
  }, []);

  const canJudge = debitItems.length > 0 || creditItems.length > 0;

  // 计算天平倾斜角度
  const getScaleTilt = () => {
    if (result === 'success') return 0;
    const diff = debitItems.length - creditItems.length;
    if (result === 'failure') {
      return diff > 0 ? 12 : (diff < 0 ? -12 : 0);
    }
    return Math.max(-8, Math.min(8, diff * 4));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200">
        <motion.div
          className="text-center bg-white/80 rounded-2xl px-8 py-6 shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <BookOpen size={40} className="mx-auto mb-4 text-sky-600 animate-pulse" />
          <p className="text-sky-800 text-lg">加载中...</p>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200">
        <motion.div
          className="text-center p-8 bg-white/90 rounded-2xl shadow-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">全部完成！</h2>
          <p className="text-gray-600">已完成所有题目</p>
        </motion.div>
      </div>
    );
  }

  const scaleTilt = getScaleTilt();

  return (
    <div className={`min-h-screen relative overflow-hidden ${isShaking ? 'animate-shake' : ''}`}>
      {/* 背景层 - 蓝色天空渐变 */}
      <div className="fixed inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200">
        {/* 云朵装饰 */}
        <div className="absolute top-[10%] left-[10%] w-40 h-20 bg-white/40 rounded-full blur-xl" />
        <div className="absolute top-[15%] left-[25%] w-32 h-16 bg-white/30 rounded-full blur-xl" />
        <div className="absolute top-[8%] right-[20%] w-48 h-24 bg-white/35 rounded-full blur-xl" />
        <div className="absolute top-[20%] right-[10%] w-28 h-14 bg-white/25 rounded-full blur-xl" />
      </div>

      {/* 左侧立柱 */}
      <div className="fixed left-0 top-0 h-full w-16 md:w-24 flex flex-col items-center justify-end z-10">
        <div className="w-12 md:w-20 h-[75%] bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 rounded-t-lg shadow-xl">
          <div className="w-full h-6 bg-stone-300 rounded-t-lg border-b-2 border-stone-400" />
          <div className="flex justify-around px-1 h-full opacity-30">
            <div className="w-0.5 bg-stone-400 h-full" />
            <div className="w-0.5 bg-stone-400 h-full" />
            <div className="w-0.5 bg-stone-400 h-full" />
          </div>
        </div>
      </div>

      {/* 右侧立柱 */}
      <div className="fixed right-0 top-0 h-full w-16 md:w-24 flex flex-col items-center justify-end z-10">
        <div className="w-12 md:w-20 h-[75%] bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 rounded-t-lg shadow-xl">
          <div className="w-full h-6 bg-stone-300 rounded-t-lg border-b-2 border-stone-400" />
          <div className="flex justify-around px-1 h-full opacity-30">
            <div className="w-0.5 bg-stone-400 h-full" />
            <div className="w-0.5 bg-stone-400 h-full" />
            <div className="w-0.5 bg-stone-400 h-full" />
          </div>
        </div>
      </div>

      {/* 中央象牙白窗口 */}
      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-20 md:px-32 py-6">
        <motion.div 
          className="w-full max-w-2xl bg-[#FDFBEB]/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/60 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="bg-white/60 px-5 py-3 border-b border-stone-200/50 flex items-center justify-between">
            <h1 className="text-base font-medium text-stone-700 flex items-center gap-2">
              <BookOpen size={18} className="text-sky-600" />
              会计殿堂
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-500">
                {currentIndex + 1} / {totalQuestions}
              </span>
              {streak > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                  🔥 {streak}
                </span>
              )}
            </div>
          </div>

          {/* Question */}
          <div className="px-5 py-4 border-b border-stone-100">
            <motion.p 
              className="text-stone-700 text-center leading-relaxed"
              key={currentQuestion.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {currentQuestion.scenario}
            </motion.p>
          </div>

          {/* Balance Scale */}
          <div className="px-5 py-5">
            <div className="relative">
              {/* 天平支架 */}
              <div className="flex justify-center mb-1">
                <div className="w-0.5 h-5 bg-stone-400 rounded" />
              </div>
              
              {/* 天平横梁 */}
              <motion.div 
                className="relative"
                animate={{ rotate: scaleTilt }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
              >
                <div className="h-0.5 bg-stone-400 rounded-full mx-6" />
                
                {/* 借方和贷方容器 */}
                <div className="flex justify-between -mt-0.5">
                  {/* 借方 */}
                  <div className="w-[46%]">
                    <div className="w-px h-3 bg-stone-400 mx-auto" />
                    <motion.div 
                      className={`min-h-[72px] rounded-lg border-2 cursor-pointer transition-colors
                        ${result === 'success' 
                          ? 'bg-green-50 border-green-300' 
                          : result === 'failure'
                            ? 'bg-red-50 border-red-300'
                            : selectedAccount 
                              ? 'bg-rose-50 border-rose-400 shadow-md' 
                              : 'bg-rose-50/50 border-rose-200 hover:border-rose-300'}`}
                      onClick={handleAddToDebit}
                      whileHover={selectedAccount ? { scale: 1.01 } : {}}
                      whileTap={selectedAccount ? { scale: 0.99 } : {}}
                    >
                      <div className="text-center text-rose-600 text-xs font-medium py-1.5 border-b border-rose-200/50 flex items-center justify-center gap-1">
                        借方 (Debit)
                        {selectedAccount && <Plus size={12} className="text-rose-500" />}
                      </div>
                      <div className="p-1.5 space-y-1">
                        <AnimatePresence>
                          {debitItems.map(item => (
                            <motion.div
                              key={item.id}
                              className="px-2 py-1 bg-white rounded text-xs text-stone-700 
                                       flex justify-between items-center shadow-sm border border-stone-100"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                            >
                              <span>{item.name}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveDebit(item.id); }}
                                className="text-stone-300 hover:text-red-500 ml-1"
                              >
                                <Minus size={12} />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {debitItems.length === 0 && (
                          <div className="text-center text-stone-300 text-xs py-2">
                            {selectedAccount ? '点击放置' : '空'}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* 贷方 */}
                  <div className="w-[46%]">
                    <div className="w-px h-3 bg-stone-400 mx-auto" />
                    <motion.div 
                      className={`min-h-[72px] rounded-lg border-2 cursor-pointer transition-colors
                        ${result === 'success' 
                          ? 'bg-green-50 border-green-300' 
                          : result === 'failure'
                            ? 'bg-red-50 border-red-300'
                            : selectedAccount 
                              ? 'bg-sky-50 border-sky-400 shadow-md' 
                              : 'bg-sky-50/50 border-sky-200 hover:border-sky-300'}`}
                      onClick={handleAddToCredit}
                      whileHover={selectedAccount ? { scale: 1.01 } : {}}
                      whileTap={selectedAccount ? { scale: 0.99 } : {}}
                    >
                      <div className="text-center text-sky-600 text-xs font-medium py-1.5 border-b border-sky-200/50 flex items-center justify-center gap-1">
                        贷方 (Credit)
                        {selectedAccount && <Plus size={12} className="text-sky-500" />}
                      </div>
                      <div className="p-1.5 space-y-1">
                        <AnimatePresence>
                          {creditItems.map(item => (
                            <motion.div
                              key={item.id}
                              className="px-2 py-1 bg-white rounded text-xs text-stone-700 
                                       flex justify-between items-center shadow-sm border border-stone-100"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                            >
                              <span>{item.name}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveCredit(item.id); }}
                                className="text-stone-300 hover:text-red-500 ml-1"
                              >
                                <Minus size={12} />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {creditItems.length === 0 && (
                          <div className="text-center text-stone-300 text-xs py-2">
                            {selectedAccount ? '点击放置' : '空'}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* 选中提示 */}
          <AnimatePresence>
            {selectedAccount && (
              <motion.div 
                className="mx-5 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-700"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                已选择「<span className="font-medium">{selectedAccount.name}</span>」→ 点击上方借方或贷方放置
              </motion.div>
            )}
          </AnimatePresence>

          {/* Account Options */}
          <div className="px-5 pb-3">
            <div className="text-xs text-stone-400 text-center mb-2">选择科目</div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {accounts.map(account => {
                const isPlaced = placedIds.includes(account.id);
                const isSelected = selectedAccount?.id === account.id;
                return (
                  <motion.button
                    key={account.id}
                    onClick={() => handleSelectAccount(account)}
                    disabled={isPlaced}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                      ${isPlaced 
                        ? 'bg-stone-100 text-stone-300 cursor-not-allowed line-through' 
                        : isSelected
                          ? 'bg-amber-400 text-white shadow-md ring-2 ring-amber-300 ring-offset-1'
                          : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400 hover:shadow-sm'
                      }`}
                    whileHover={!isPlaced ? { scale: 1.02 } : {}}
                    whileTap={!isPlaced ? { scale: 0.98 } : {}}
                  >
                    {account.name}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                className={`mx-5 mb-3 px-4 py-2.5 rounded-lg text-center text-sm ${
                  result === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {result === 'success' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check size={16} />
                    <span className="font-medium">正确！</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <X size={16} />
                      <span className="font-medium">答案有误</span>
                    </div>
                    <div className="text-xs text-red-600/70">
                      正确：借方 [{currentQuestion.debit.join(', ')}] / 贷方 [{currentQuestion.credit.join(', ')}]
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="px-5 pb-5 flex items-center justify-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-stone-400 hover:text-stone-600 border border-stone-200 rounded-lg 
                       hover:border-stone-300 transition-all flex items-center gap-1.5 text-sm"
            >
              <RotateCcw size={14} />
              重置
            </button>

            {result === 'success' ? (
              <motion.button
                onClick={handleNext}
                className="px-5 py-1.5 bg-sky-500 text-white rounded-lg text-sm
                         hover:bg-sky-600 transition-all flex items-center gap-1.5 shadow-md"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
              >
                下一题
                <ChevronRight size={16} />
              </motion.button>
            ) : (
              <button
                onClick={handleJudge}
                disabled={!canJudge}
                className={`px-5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm
                  ${canJudge 
                    ? 'bg-amber-400 text-white hover:bg-amber-500 shadow-md' 
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
              >
                <Check size={14} />
                判定
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default App;
