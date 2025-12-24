import { motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';

const OracleVoice = ({ text, questionNumber, totalQuestions }) => {
  return (
    <motion.div
      className="w-full max-w-3xl mx-auto mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Oracle header */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <motion.div
          className="w-12 h-[2px] bg-gradient-to-r from-transparent to-sanctuary-stone"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <div className="flex items-center gap-2 text-sanctuary-stone">
          <ScrollText size={18} />
          <span className="font-mono text-xs tracking-widest uppercase">
            神谕 {questionNumber}/{totalQuestions}
          </span>
        </div>
        <motion.div
          className="w-12 h-[2px] bg-gradient-to-l from-transparent to-sanctuary-stone"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      </div>

      {/* Oracle text container */}
      <motion.div
        key={text}
        className="relative p-8 rounded-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(235, 231, 223, 0.8) 0%, rgba(212, 207, 196, 0.4) 100%)',
          boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(107, 99, 90, 0.1)'
        }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative corners */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-sanctuary-stone/30" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-sanctuary-stone/30" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-sanctuary-stone/30" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-sanctuary-stone/30" />

        {/* Main oracle text */}
        <p className="font-oracle text-2xl md:text-3xl text-center text-sanctuary-dark leading-relaxed">
          「{text}」
        </p>
      </motion.div>
    </motion.div>
  );
};

export default OracleVoice;
