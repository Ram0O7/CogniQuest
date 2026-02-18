
import React from 'react';
import { BrainCircuitIcon } from './icons/BrainCircuitIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { AppStatus } from '../../types';

interface HeaderProps {
  onRestart: () => void;
  onGoHome: () => void;
  appStatus: AppStatus;
  theme: any;
  toggleTheme: () => void;
  showRestart: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRestart, onGoHome, appStatus, theme, toggleTheme, showRestart }) => {
  const isDashboard = appStatus === AppStatus.DASHBOARD || appStatus === AppStatus.INITIAL;

  return (
    <header className="sticky top-0 z-50 bg-surface shadow-md transition-colors duration-300 dark:shadow-gray-900">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onGoHome}
        >
          <BrainCircuitIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-on-surface tracking-tight">
            CogniQuest
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-on-surface-secondary transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
          
          {!isDashboard && (
            <button
                onClick={onGoHome}
                className="hidden sm:block text-on-surface font-semibold hover:text-primary transition-colors"
            >
                Dashboard
            </button>
          )}

          {showRestart && (
            <button
              onClick={onRestart}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold"
            >
              Start New Quiz
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
