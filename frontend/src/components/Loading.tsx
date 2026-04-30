import React from 'react';
import { motion } from 'motion/react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ message = 'Loading...', fullScreen = true }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen bg-bg' : 'w-full py-12 bg-transparent'}`}>
      <div className="relative mb-6">
        {/* Outer Ring */}
        <motion.div
          className="w-16 h-16 border-4 border-accent/20 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
        {/* Spinning Ring */}
        <motion.div
          className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-accent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
        {/* Inner Pulse */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-4 h-4 bg-accent rounded-full -mt-2 -ml-2"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-text text-[11px] font-bold tracking-[0.2em] uppercase"
      >
        {message}
      </motion.div>
    </div>
  );
};

export default Loading;
