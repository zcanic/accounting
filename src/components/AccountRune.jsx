import { motion } from 'framer-motion';
import { useDraggable } from './DragContext';

const AccountRune = ({ id, name, isPlaced = false, onRemove }) => {
  const { isDragging, setIsDragging, setDraggedItem } = useDraggable();

  const handleDragStart = () => {
    setIsDragging(true);
    setDraggedItem({ id, name });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
  };

  return (
    <motion.div
      layout
      layoutId={`rune-${id}`}
      className={`
        relative cursor-grab active:cursor-grabbing select-none
        stone-texture rounded-sm
        ${isPlaced ? 'px-4 py-2' : 'px-6 py-4'}
      `}
      style={{
        boxShadow: isPlaced 
          ? '4px 4px 12px rgba(107, 99, 90, 0.25), -2px -2px 8px rgba(255, 255, 255, 0.7)'
          : '8px 8px 20px rgba(107, 99, 90, 0.3), -4px -4px 12px rgba(255, 255, 255, 0.8)',
      }}
      drag
      dragSnapToOrigin={!isPlaced}
      dragElastic={0.1}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: '12px 12px 24px rgba(107, 99, 90, 0.35), -6px -6px 16px rgba(255, 255, 255, 0.85)'
      }}
      whileDrag={{ 
        scale: 1.05,
        boxShadow: '16px 16px 32px rgba(107, 99, 90, 0.4), -8px -8px 20px rgba(255, 255, 255, 0.9)',
        zIndex: 100
      }}
      whileTap={{ scale: 0.98 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        layout: { type: "spring", stiffness: 400, damping: 30 }
      }}
    >
      {/* Chiseled border effect */}
      <div className="absolute inset-0 rounded-sm border border-sanctuary-stone/20" />
      <div className="absolute inset-[2px] rounded-sm border border-white/30" />

      {/* Rune text */}
      <span className={`
        chiseled-text font-mono font-medium
        ${isPlaced ? 'text-sm' : 'text-base'}
      `}>
        {name}
      </span>

      {/* Remove button when placed */}
      {isPlaced && onRemove && (
        <motion.button
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-sanctuary-stone/80 text-white text-xs flex items-center justify-center hover:bg-sanctuary-error transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ×
        </motion.button>
      )}
    </motion.div>
  );
};

export default AccountRune;
