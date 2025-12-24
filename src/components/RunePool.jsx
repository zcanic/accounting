import { motion, AnimatePresence } from 'framer-motion';

const RunePool = ({ accounts = [], placedIds = [] }) => {
  const availableAccounts = accounts.filter(acc => !placedIds.includes(acc.id));

  return (
    <div className="mt-6">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-ink/10" />
        <span className="text-xs text-ink-muted font-medium">可用科目</span>
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      {/* 科目卡片 */}
      <div className="flex flex-wrap justify-center gap-2">
        <AnimatePresence mode="popLayout">
          {availableAccounts.map((account, index) => (
            <motion.div
              key={account.id}
              layout
              className="cursor-grab active:cursor-grabbing select-none bg-white border border-ink/10 px-4 py-2 rounded-lg hover:border-peach hover:shadow-card-hover transition-all"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify(account));
                e.dataTransfer.effectAllowed = 'move';
                e.currentTarget.style.opacity = '0.5';
              }}
              onDragEnd={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: { delay: index * 0.02 }
              }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-sm font-medium text-ink">{account.name}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {availableAccounts.length === 0 && (
          <p className="text-ink-muted text-sm py-4">
            已全部放置
          </p>
        )}
      </div>
    </div>
  );
};

export default RunePool;
