import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const SuccessEffect = ({ show, type = 'success', onNext, message }) => {
  const isSuccess = type === 'success';

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Divine light beam for success */}
          {isSuccess && (
            <motion.div
              className="divine-beam"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scaleY: [0, 1, 1, 1]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2,
                times: [0, 0.2, 0.7, 1]
              }}
            />
          )}

          {/* Crack overlay for failure */}
          {!isSuccess && (
            <motion.div
              className="crack-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          )}

          {/* Result modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal content */}
            <motion.div
              className={`
                relative p-8 rounded-sm max-w-md w-full text-center
                ${isSuccess ? 'bg-sanctuary-cream' : 'bg-sanctuary-light'}
              `}
              style={{
                boxShadow: isSuccess 
                  ? '0 0 60px rgba(201, 169, 98, 0.4), 0 20px 40px rgba(61, 56, 48, 0.2)'
                  : '0 20px 40px rgba(139, 58, 58, 0.2), 0 0 30px rgba(139, 58, 58, 0.1)'
              }}
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Icon */}
              <motion.div
                className={`
                  w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center
                  ${isSuccess ? 'bg-sanctuary-gold/20' : 'bg-sanctuary-error/10'}
                `}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                {isSuccess ? (
                  <CheckCircle size={40} className="text-sanctuary-gold" />
                ) : (
                  <XCircle size={40} className="text-sanctuary-error" />
                )}
              </motion.div>

              {/* Title */}
              <motion.h2
                className={`
                  font-oracle text-2xl mb-3
                  ${isSuccess ? 'text-sanctuary-gold' : 'text-sanctuary-error'}
                `}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {isSuccess ? '账目平衡' : '账目失衡'}
              </motion.h2>

              {/* Message */}
              <motion.p
                className="font-mono text-sm text-sanctuary-shadow mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {message || (isSuccess 
                  ? '你的分录完美无瑕，如同晨曦照耀神殿。' 
                  : '借贷不平衡，账目之道尚需修炼。')}
              </motion.p>

              {/* Next button */}
              <motion.button
                className={`
                  px-8 py-3 rounded-sm font-mono text-sm tracking-wider uppercase
                  flex items-center justify-center gap-2 mx-auto
                  transition-all duration-300
                  ${isSuccess 
                    ? 'bg-sanctuary-gold text-sanctuary-dark hover:bg-sanctuary-divine' 
                    : 'bg-sanctuary-stone text-white hover:bg-sanctuary-shadow'}
                `}
                style={{
                  boxShadow: '4px 4px 16px rgba(0, 0, 0, 0.15)'
                }}
                onClick={onNext}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{isSuccess ? '继续修行' : '重新审判'}</span>
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SuccessEffect;
