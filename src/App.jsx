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
    isFetchingMore,
    isAwaitingNext,
    hasCheckedRemote,
    hasRemoteData,
    error,
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
      // Auto-advance after a short delay for speed (only when未在补货)
      if (!isAwaitingNext && !isFetchingMore) {
        setTimeout(() => {
          nextQuestion();
          setDebitItems([]);
          setCreditItems([]);
          setSelectedAccount(null);
          setResult(null);
        }, 1200);
      }
    } else {
      setResult('failure');
      setStreak(0);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
    }
  }, [currentQuestion, debitItems, creditItems, nextQuestion, isAwaitingNext, isFetchingMore]);

  // Handle next question
  const handleNext = useCallback(() => {
    nextQuestion();
    setDebitItems([]);
    setCreditItems([]);
    setSelectedAccount(null);
    setResult(null);
  }, [nextQuestion]);

  // Reset current question
  const handleReset = useCallback(() => {
    setDebitItems([]);
    setCreditItems([]);
    setSelectedAccount(null);
    setResult(null);
  }, []);

  const canJudge = debitItems.length > 0 || creditItems.length > 0;
  const isRefilling = isAwaitingNext || isFetchingMore;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-600 via-sky-400 to-sky-200">
        <motion.div
          className="text-center bg-white/90 rounded-2xl px-12 py-8 shadow-2xl border-4 border-double border-stone-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <BookOpen size={48} className="mx-auto mb-6 text-sky-700 animate-pulse" />
          <p className="text-stone-800 text-xl font-serif tracking-widest">LOADING SANCTUARY...</p>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-600 via-sky-400 to-sky-200">
        <motion.div
          className="text-center p-12 bg-white/95 rounded-lg shadow-2xl border-4 border-double border-stone-200 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-6xl mb-6">🏛️</div>
          <h2 className="text-3xl font-serif text-stone-800 mb-4">JOURNEY COMPLETE</h2>
          <p className="text-stone-600 font-serif italic">The ledger is balanced.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${isShaking ? 'animate-shake' : ''}`}>
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 bg-stone-300">
        <img
          src="/bg.jpg"
          alt="Background"
          className="w-full h-full object-cover md:object-cover object-center"
          style={{ objectPosition: 'center 40%' }}
          onError={(e) => {
            console.error("Background image failed to load");
            e.target.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Main Content */}
      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-3 py-3 md:px-4 md:py-8">
        {(() => {
          const statusMessage = (() => {
            if (isRefilling) return '正在加载新题目...';
            if (!hasCheckedRemote) return '正在检查远端题库...';
            if (error && hasRemoteData) return '远端加载异常，稍后重试';
            // 只有在检查完成且确认没有远端数据时才显示"远端不可用"
            if (hasCheckedRemote && !hasRemoteData) return '当前使用本地题库，远端不可用';
            return null;
          })();

          if (!statusMessage) return null;

          const statusColor = (() => {
            if (isRefilling) return 'bg-amber-500';
            if (error && hasRemoteData) return 'bg-rose-500';
            if (!hasCheckedRemote) return 'bg-sky-500';
            return hasRemoteData ? 'bg-emerald-500' : 'bg-stone-400';
          })();

          return (
            <div className="mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-stone-700 bg-white/85 border border-stone-200 px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm">
              <motion.span
                className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${statusColor}`}
                animate={isRefilling ? { opacity: [0.3, 1, 0.3] } : { opacity: 1 }}
                transition={{ repeat: isRefilling ? Infinity : 0, duration: 1.2 }}
              />
              <span className="font-serif text-xs md:text-sm">{statusMessage}</span>
            </div>
          );
        })()}
        <motion.div 
          className="w-full max-w-4xl bg-[#FDFBEB] rounded-lg border border-stone-300 overflow-hidden relative"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >

          {/* Header Area */}
          <div className="pt-4 pb-3 px-4 md:pt-8 md:pb-4 md:px-6 text-center border-b border-stone-200">
            <h1 className="text-xl md:text-3xl font-serif font-bold text-stone-800 tracking-[0.1em] md:tracking-[0.15em] uppercase">
              Sanctuary of Ledger
            </h1>
            <div className="mt-1.5 md:mt-2 flex items-center justify-center gap-3 md:gap-6 text-sm md:text-base font-serif text-stone-500">
              <span>Scenario {currentIndex + 1} / {totalQuestions}</span>
              {streak > 0 && (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  🔥 Streak {streak}
                </span>
              )}
            </div>
          </div>

          {/* Question Display */}
          <div className="px-4 py-4 md:px-8 md:py-6 border-b border-stone-200">
            <motion.p
              className="text-base md:text-2xl text-stone-800 text-center font-serif leading-relaxed"
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentQuestion.text || currentQuestion.scenario}
            </motion.p>
          </div>

          {/* Debit / Credit Entry Area */}
          <div className="px-3 py-4 md:px-6 md:py-6">
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              {/* Debit Column */}
              <motion.div
                className={`bg-[#FDFBEB] rounded-lg border-2 p-3 md:p-5 min-h-[140px] md:min-h-[160px] transition-all cursor-pointer
                  ${selectedAccount ? 'ring-2 ring-rose-200 border-rose-400' : 'border-stone-300 hover:border-stone-400'}`}
                onClick={handleAddToDebit}
                whileHover={selectedAccount ? { scale: 1.02 } : {}}
                whileTap={selectedAccount ? { scale: 0.98 } : {}}
              >
                <div className="text-center text-base md:text-lg font-bold text-rose-600 uppercase tracking-wider mb-3 md:mb-4 pb-1.5 md:pb-2 border-b-2 border-rose-100">
                  借方 Debit
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <AnimatePresence>
                    {debitItems.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, scale: 0.8 }}
                        className="bg-rose-50 border border-rose-200 px-3 py-2 md:px-4 md:py-2.5 rounded-lg text-sm md:text-lg font-serif flex justify-between items-center"
                      >
                        <span className="text-stone-800">{item.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveDebit(item.id); }}
                          className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-white border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          <X size={12} className="text-rose-500 md:hidden" />
                          <X size={14} className="text-rose-500 hidden md:block" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {debitItems.length === 0 && (
                  <div className={`text-center py-4 md:py-6 ${selectedAccount ? 'text-rose-400' : 'text-stone-300'}`}>
                    {selectedAccount ? (
                      <motion.div
                        className="text-sm md:text-lg font-medium"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        + 点击放入借方
                      </motion.div>
                    ) : (
                      <div className="text-sm md:text-base">—</div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Credit Column */}
              <motion.div
                className={`bg-[#FDFBEB] rounded-lg border-2 p-3 md:p-5 min-h-[140px] md:min-h-[160px] transition-all cursor-pointer
                  ${selectedAccount ? 'ring-2 ring-sky-200 border-sky-400' : 'border-stone-300 hover:border-stone-400'}`}
                onClick={handleAddToCredit}
                whileHover={selectedAccount ? { scale: 1.02 } : {}}
                whileTap={selectedAccount ? { scale: 0.98 } : {}}
              >
                <div className="text-center text-base md:text-lg font-bold text-sky-600 uppercase tracking-wider mb-3 md:mb-4 pb-1.5 md:pb-2 border-b-2 border-sky-100">
                  贷方 Credit
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <AnimatePresence>
                    {creditItems.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.8 }}
                        className="bg-sky-50 border border-sky-200 px-3 py-2 md:px-4 md:py-2.5 rounded-lg text-sm md:text-lg font-serif flex justify-between items-center"
                      >
                        <span className="text-stone-800">{item.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveCredit(item.id); }}
                          className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-white border border-sky-200 hover:bg-sky-100 transition-colors"
                        >
                          <X size={12} className="text-sky-500 md:hidden" />
                          <X size={14} className="text-sky-500 hidden md:block" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {creditItems.length === 0 && (
                  <div className={`text-center py-4 md:py-6 ${selectedAccount ? 'text-sky-400' : 'text-stone-300'}`}>
                    {selectedAccount ? (
                      <motion.div
                        className="text-sm md:text-lg font-medium"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        + 点击放入贷方
                      </motion.div>
                    ) : (
                      <div className="text-sm md:text-base">—</div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Account Selection Area */}
          <div className="p-4 md:p-6 border-t border-stone-200">
            {/* Selection Hint */}
            <div className="h-7 md:h-8 mb-3 md:mb-4 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {selectedAccount ? (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm md:text-lg font-serif text-stone-700 bg-amber-100 px-4 py-1.5 md:px-6 md:py-2 rounded-full border border-amber-300"
                  >
                    已选: <span className="font-bold text-amber-800">{selectedAccount.name}</span>
                    <span className="text-stone-500 ml-1 md:ml-2 hidden sm:inline">→ 点击上方借方或贷方区域放入</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm md:text-base text-stone-400"
                  >
                    ↓ 选择科目 ↓
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Account Buttons */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-4 md:mb-6">
              {accounts.map(account => {
                const isPlaced = placedIds.includes(account.id);
                const isSelected = selectedAccount?.id === account.id;
                return (
                  <motion.button
                    key={account.id}
                    onClick={() => handleSelectAccount(account)}
                    disabled={isPlaced}
                    className={`px-3 py-2 md:px-5 md:py-2.5 rounded-lg font-serif text-sm md:text-lg transition-all border-2
                      ${isPlaced
                        ? 'bg-stone-200 text-stone-400 border-stone-200 cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-amber-500 text-white border-amber-500 transform -translate-y-1'
                          : 'bg-[#FDFBEB] text-stone-700 border-stone-300 hover:border-amber-400'
                      }`}
                    whileHover={!isPlaced ? { y: -2 } : {}}
                    whileTap={!isPlaced ? { scale: 0.95 } : {}}
                  >
                    {account.name}
                  </motion.button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 md:gap-6 pt-3 md:pt-4 border-t border-stone-200">
              <button
                onClick={handleReset}
                disabled={isRefilling}
                className={`px-4 py-2 md:px-5 md:py-2.5 text-stone-500 font-serif text-sm md:text-base transition-colors flex items-center gap-1.5 md:gap-2 rounded-lg ${isRefilling ? 'opacity-60 cursor-not-allowed' : 'hover:text-stone-800 hover:bg-stone-100'}`}
              >
                <RotateCcw size={16} className="md:hidden" />
                <RotateCcw size={18} className="hidden md:block" />
                重置
              </button>

              {result === 'success' ? (
                <motion.button
                  onClick={handleNext}
                  disabled={isRefilling}
                  className={`px-6 py-2 md:px-8 md:py-2.5 bg-emerald-600 text-white rounded-lg font-serif text-base md:text-lg flex items-center gap-1.5 md:gap-2 ${isRefilling ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-700'}`}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  下一题
                  <ChevronRight size={18} className="md:hidden" />
                  <ChevronRight size={20} className="hidden md:block" />
                </motion.button>
              ) : result === 'failure' ? (
                <motion.button
                  onClick={handleNext}
                  disabled={isRefilling}
                  className={`px-6 py-2 md:px-8 md:py-2.5 bg-stone-700 text-white rounded-lg font-serif text-base md:text-lg flex items-center gap-1.5 md:gap-2 ${isRefilling ? 'opacity-60 cursor-not-allowed' : 'hover:bg-stone-800'}`}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  下一题
                  <ChevronRight size={18} className="md:hidden" />
                  <ChevronRight size={20} className="hidden md:block" />
                </motion.button>
              ) : (
                <button
                  onClick={handleJudge}
                  disabled={!canJudge}
                  className={`px-6 py-2 md:px-8 md:py-2.5 rounded-lg shadow-lg font-serif text-base md:text-lg flex items-center gap-1.5 md:gap-2 transition-all
                    ${canJudge && !isRefilling
                      ? 'bg-stone-800 text-white hover:bg-stone-900'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                >
                  <Check size={18} className="md:hidden" />
                  <Check size={20} className="hidden md:block" />
                  提交答案
                </button>
              )}
            </div>
          </div>

          {/* Result Overlay */}
          <AnimatePresence>
            {result && (
              <motion.div
                className="fixed inset-0 flex items-center justify-center bg-black/60 px-4 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className={`p-6 md:p-10 rounded-2xl border text-center max-w-md w-full mx-auto ${
                    result === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  }`}
                  initial={{ scale: 0.9, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                >
                  {result === 'success' ? (
                    <>
                      <div className="text-5xl md:text-7xl mb-3 md:mb-4">✓</div>
                      <h3 className="text-2xl md:text-3xl font-serif font-bold text-emerald-800 mb-1.5 md:mb-2">正确</h3>
                      <p className="text-emerald-700 font-serif text-base md:text-lg">分录完全正确</p>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl md:text-7xl mb-3 md:mb-4">✗</div>
                      <h3 className="text-2xl md:text-3xl font-serif font-bold text-rose-700 mb-3 md:mb-4">错误</h3>
                      <div className="text-left bg-white/80 p-4 md:p-5 rounded-xl border border-rose-200 mb-4 md:mb-6">
                        <div className="font-bold text-stone-700 mb-2 md:mb-3 text-base md:text-lg border-b border-stone-200 pb-1.5 md:pb-2">正确答案</div>
                        <div className="mb-1.5 md:mb-2 text-base md:text-lg">
                          <span className="font-semibold text-rose-600">借:</span>
                          <span className="ml-2 text-stone-800">{currentQuestion.debit.join('、')}</span>
                        </div>
                        <div className="text-base md:text-lg">
                          <span className="font-semibold text-sky-600">贷:</span>
                          <span className="ml-2 text-stone-800">{currentQuestion.credit.join('、')}</span>
                        </div>
                      </div>
                      <div className="flex justify-center gap-2 md:gap-3">
                        <button
                          onClick={handleNext}
                          className="px-4 py-1.5 md:px-5 md:py-2 rounded-lg bg-stone-800 text-white hover:bg-stone-900 transition-colors text-sm md:text-base"
                        >
                          下一题
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-4 py-1.5 md:px-5 md:py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors text-sm md:text-base"
                        >
                          再试一次
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default App;
