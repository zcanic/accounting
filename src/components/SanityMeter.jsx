import { motion } from 'framer-motion';
import { Flame, Zap } from 'lucide-react';

const SanityMeter = ({ streak = 0 }) => {
  return (
    <div className="flex items-center gap-2">
      {/* 连胜图标 */}
      <div className={`flex items-center gap-1.5 ${streak > 0 ? 'text-peach-dark' : 'text-ink-muted'}`}>
        {streak >= 5 ? <Zap size={16} /> : <Flame size={16} />}
        <span className="text-sm font-medium">
          {streak > 0 ? `${streak} 连胜` : '0'}
        </span>
      </div>

      {/* 进度条 */}
      {streak > 0 && (
        <div className="w-16 h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-peach to-mint"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(streak * 10, 100)}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />
        </div>
      )}
    </div>
  );
};

export default SanityMeter;
