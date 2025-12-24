import { motion } from 'framer-motion';
import { Scale, Loader2 } from 'lucide-react';

const JudgeButton = ({ onClick, disabled = false, isLoading = false }) => {
  return (
    <motion.button
      className={`
        relative px-12 py-4 rounded-sm font-mono text-lg tracking-widest uppercase
        transition-all duration-300 overflow-hidden
        ${disabled 
          ? 'bg-sanctuary-concrete text-sanctuary-stone/50 cursor-not-allowed' 
          : 'bg-sanctuary-dark text-sanctuary-cream hover:bg-sanctuary-shadow cursor-pointer'}
      `}
      style={{
        boxShadow: disabled 
          ? '4px 4px 12px rgba(107, 99, 90, 0.2)' 
          : '8px 8px 24px rgba(61, 56, 48, 0.4), -4px -4px 12px rgba(255, 255, 255, 0.1)'
      }}
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={!disabled ? { 
        scale: 1.02,
        boxShadow: '12px 12px 32px rgba(61, 56, 48, 0.5), -6px -6px 16px rgba(255, 255, 255, 0.15)'
      } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
    >
      {/* Inner glow effect */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(201, 169, 98, 0.3) 0%, transparent 70%)'
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* Button content */}
      <span className="relative flex items-center gap-3">
        {isLoading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Scale size={20} />
        )}
        <span>{isLoading ? '审判中...' : '⚖️ 审判'}</span>
      </span>

      {/* Border highlights */}
      <div className="absolute inset-0 rounded-sm border border-white/10 pointer-events-none" />
      <div className="absolute inset-[1px] rounded-sm border border-black/20 pointer-events-none" />
    </motion.button>
  );
};

export default JudgeButton;
