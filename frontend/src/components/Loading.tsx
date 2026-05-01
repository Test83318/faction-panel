import React from 'react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ message = 'Loading...', fullScreen = true }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen bg-bg' : 'w-full py-12 bg-transparent'}`}>
      <div className="flex flex-col items-center space-y-4">
        <div className="w-48 h-1 bg-accent/10 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-accent animate-progress origin-left" />
        </div>
        <div className="text-muted font-bold uppercase tracking-[0.2em] text-[10px] animate-pulse">
          {message}
        </div>
      </div>
    </div>
  );
};

export default Loading;
