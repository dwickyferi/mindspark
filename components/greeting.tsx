import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  twinkle: number;
}

interface GreetingProps {
  userName?: string;
}

export const Greeting = ({ userName }: GreetingProps) => {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Create initial stars
    const initialStars: Star[] = [];
    for (let i = 0; i < 60; i++) {
      initialStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * -50, // Start above the screen
        size: Math.random() * 3 + 1,
        speed: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * 2 + 1,
      });
    }
    setStars(initialStars);

    // Animation loop
    const animateStars = () => {
      setStars((prev) =>
        prev.map((star) => {
          let newY = star.y + star.speed;
          let newOpacity = star.opacity + Math.sin(Date.now() * 0.001 * star.twinkle) * 0.3;

          // Reset star when it goes off screen
          if (newY > 110) {
            newY = -10;
            star.x = Math.random() * 100;
          }

          // Keep opacity within bounds
          newOpacity = Math.max(0.1, Math.min(1, newOpacity));

          return {
            ...star,
            y: newY,
            opacity: newOpacity,
          };
        })
      );
    };

    const interval = setInterval(animateStars, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col justify-center relative overflow-hidden"
    >
      {/* Star Rain Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              opacity: star.opacity,
              transform: `translate(-50%, -50%)`,
            }}
          >
            {/* Star Shape */}
            <div
              className="relative bg-yellow-400 dark:bg-yellow-300"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                filter: 'drop-shadow(0 0 2px rgba(255, 255, 0, 0.3))',
              }}
            />
          </div>
        ))}
      </div>

      {/* Greeting Text */}
      <div className="relative z-10 text-center space-y-6">
        {/* Main Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ 
            delay: 0.3,
            duration: 0.8,
            ease: [0.215, 0.610, 0.355, 1.000]
          }}
          className="space-y-2"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent leading-tight">
            Hello{userName ? `, ${userName}` : ''}!
          </h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto"
          />
        </motion.div>

        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ 
            delay: 0.6,
            duration: 0.8,
            ease: [0.215, 0.610, 0.355, 1.000]
          }}
          className="space-y-4"
        >
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-light leading-relaxed max-w-2xl mx-auto">
            How can I help you today?
          </p>
          
          {/* Animated suggestion text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-normal"
          >
            Ask me anything, and let's explore together ✨
          </motion.p>
        </motion.div>

        {/* Floating action hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="pt-4"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
          >
            <span className="text-sm text-gray-600 dark:text-gray-300">Start typing below</span>
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-blue-500"
            >
              ↓
            </motion.span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
