import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X } from 'lucide-react';

const BalanceScale = ({ 
  debitItems = [], 
  creditItems = [], 
  onDropDebit, 
  onDropCredit, 
  onRemoveDebit, 
  onRemoveCredit,
  result = null
}) => {
  // Calculate tilt based on items or result
  const getTilt = () => {
    if (result === 'failure') return 12;
    if (result === 'success') return 0;
    
    const diff = debitItems.length - creditItems.length;
    return Math.max(-6, Math.min(6, diff * 3));
  };

  const tilt = getTilt();

  // 根据结果确定边框颜色
  const getResultStyle = (side) => {
    if (result === 'success') return 'border-mint bg-mint/5';
    if (result === 'failure') return 'border-error/50 bg-error-light/30';
    return side === 'debit' 
      ? (debitItems.length > 0 ? 'border-peach bg-peach/5' : 'border-ink/10 bg-white/50')
      : (creditItems.length > 0 ? 'border-mint bg-mint/5' : 'border-ink/10 bg-white/50');
  };

  return (
    <div className="relative w-full py-4 mb-4">
      {/* 天平横梁容器 */}
      <motion.div
        className="relative mx-auto"
        style={{ maxWidth: '100%' }}
        animate={{ 
          rotate: tilt,
          transition: { type: "spring", stiffness: 120, damping: 20 }
        }}
      >
        {/* 中心支点 */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-10">
          <div className="w-8 h-8 rounded-full bg-white border-2 border-ink/10 flex items-center justify-center shadow-card">
            <Scale size={16} className="text-ink-light" />
          </div>
        </div>

        {/* 横梁 */}
        <div className="h-1 bg-gradient-to-r from-peach via-ink/20 to-mint rounded-full mx-8" />

        {/* 两侧托盘 */}
        <div className="flex gap-4 mt-4">
          {/* 借方 (左) */}
          <motion.div
            className="flex-1"
            animate={{ rotate: -tilt * 0.3 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-peach" />
              <span className="text-sm font-medium text-ink">借方</span>
              <span className="text-xs text-ink-muted font-mono">Debit</span>
            </div>

            <div
              className={`min-h-[100px] p-3 rounded-xl border-2 border-dashed transition-all duration-150 flex flex-wrap gap-2 content-start ${getResultStyle('debit')}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-peach', 'bg-peach/10');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-peach', 'bg-peach/10');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-peach', 'bg-peach/10');
                const data = e.dataTransfer.getData('text/plain');
                if (data) onDropDebit(JSON.parse(data));
              }}
            >
              <AnimatePresence mode="popLayout">
                {debitItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="group relative px-3 py-1.5 bg-white border border-peach rounded-lg cursor-pointer hover:shadow-rune-hover transition-shadow"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => onRemoveDebit(item.id)}
                  >
                    <span className="text-sm font-medium text-ink">{item.name}</span>
                    <button className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ink-light text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {debitItems.length === 0 && (
                <p className="w-full text-center text-ink-muted text-sm py-6">
                  拖拽科目至此
                </p>
              )}
            </div>
          </motion.div>

          {/* 贷方 (右) */}
          <motion.div
            className="flex-1"
            animate={{ rotate: -tilt * 0.3 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <div className="flex items-center justify-end gap-2 mb-2">
              <span className="text-xs text-ink-muted font-mono">Credit</span>
              <span className="text-sm font-medium text-ink">贷方</span>
              <div className="w-2 h-2 rounded-full bg-mint" />
            </div>

            <div
              className={`min-h-[100px] p-3 rounded-xl border-2 border-dashed transition-all duration-150 flex flex-wrap gap-2 content-start ${getResultStyle('credit')}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-mint', 'bg-mint/10');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-mint', 'bg-mint/10');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-mint', 'bg-mint/10');
                const data = e.dataTransfer.getData('text/plain');
                if (data) onDropCredit(JSON.parse(data));
              }}
            >
              <AnimatePresence mode="popLayout">
                {creditItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="group relative px-3 py-1.5 bg-white border border-mint rounded-lg cursor-pointer hover:shadow-rune-hover transition-shadow"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => onRemoveCredit(item.id)}
                  >
                    <span className="text-sm font-medium text-ink">{item.name}</span>
                    <button className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ink-light text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {creditItems.length === 0 && (
                <p className="w-full text-center text-ink-muted text-sm py-6">
                  拖拽科目至此
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default BalanceScale;
