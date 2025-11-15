import React, { useState } from 'react';
import { Flashcard } from '../types';
import { ArrowLeftIcon } from './common/icons/ArrowLeftIcon';
import { DownloadIcon } from './common/icons/DownloadIcon';

interface FlashcardScreenProps {
  flashcards: Flashcard[];
  onExit: () => void;
}

const FlashcardScreen: React.FC<FlashcardScreenProps> = ({ flashcards, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      // Add a small delay for the flip back animation to be visible before changing card
      setTimeout(() => {
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prevIndex) => prevIndex - 1);
        }, 150);
    }
  };
  
  const handleDownload = () => {
    const dataStr = JSON.stringify(flashcards, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'cogniquest_flashcards.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onExit} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Results
        </button>
        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">
            <DownloadIcon className="w-5 h-5" />
            Download Deck
        </button>
      </div>
      
      <div className="perspective-1000 h-80 md:h-96">
        <div 
            className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            {/* Front of card */}
            <div className="absolute w-full h-full backface-hidden bg-surface border border-gray-200 rounded-2xl shadow-lg flex items-center justify-center p-8 text-center cursor-pointer">
                <p className="text-xl md:text-3xl font-bold text-on-surface">{currentCard.front}</p>
            </div>
            {/* Back of card */}
            <div className="absolute w-full h-full backface-hidden bg-primary text-white rounded-2xl shadow-lg flex items-center justify-center p-8 text-center cursor-pointer rotate-y-180">
                <p className="text-lg md:text-2xl">{currentCard.back}</p>
            </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-between items-center">
        <button 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          className="px-6 py-3 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="font-semibold text-on-surface-secondary">
          Card {currentIndex + 1} of {flashcards.length}
        </div>
        <button 
          onClick={handleNext} 
          disabled={currentIndex === flashcards.length - 1}
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
      `}</style>
    </div>
  );
};

export default FlashcardScreen;
