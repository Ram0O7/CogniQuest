
import React from 'react';
import { BrainCircuitIcon } from './common/icons/BrainCircuitIcon';

interface LoadingScreenProps {
  text: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center h-96 animate-fade-in">
      <BrainCircuitIcon className="w-20 h-20 text-primary animate-pulse-faint" />
      <h2 className="mt-6 text-2xl font-bold text-on-surface">{text}</h2>
      <p className="mt-2 text-on-surface-secondary">The AI is working its magic. Please wait a moment.</p>
    </div>
  );
};

export default LoadingScreen;
