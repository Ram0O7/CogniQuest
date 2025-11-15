
import React from 'react';
import { BrainCircuitIcon } from './icons/BrainCircuitIcon';

interface HeaderProps {
  onRestart: () => void;
  showRestart: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRestart, showRestart }) => {
  return (
    <header className="bg-surface shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BrainCircuitIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-on-surface tracking-tight">
            CogniQuest
          </h1>
        </div>
        {showRestart && (
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold"
          >
            Start New Quiz
          </button>
        )}
      </div>
    </header>
  );
};