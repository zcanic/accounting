import { motion } from 'framer-motion';

const GrainBackground = ({ sanityLevel = 0 }) => {
  // Calculate brightness based on sanity level (0-10)
  const brightness = Math.min(100 + sanityLevel * 3, 130);
  const glowIntensity = Math.min(sanityLevel * 0.05, 0.4);

  return (
    <>
      {/* Base background with dynamic brightness */}
      <div 
        className="fixed inset-0 -z-20 transition-all duration-1000"
        style={{
          background: `linear-gradient(
            180deg, 
            hsl(40, 20%, ${brightness * 0.95}%) 0%, 
            hsl(40, 15%, ${brightness * 0.9}%) 50%,
            hsl(40, 18%, ${brightness * 0.88}%) 100%
          )`
        }}
      />

      {/* Divine glow overlay - appears as sanity increases */}
      <motion.div
        className="fixed inset-0 -z-15 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: glowIntensity }}
        transition={{ duration: 1.5 }}
        style={{
          background: `radial-gradient(
            ellipse at 50% 0%,
            rgba(244, 229, 178, 0.6) 0%,
            rgba(244, 229, 178, 0.2) 30%,
            transparent 70%
          )`
        }}
      />

      {/* Animated grain texture */}
      <div className="grain-overlay animate-grain" />

      {/* Subtle vignette */}
      <div 
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 40%,
            rgba(61, 56, 48, 0.08) 100%
          )`
        }}
      />
    </>
  );
};

export default GrainBackground;
