
import React, { useState, useEffect } from 'react';
import { Question, UserAnswer, QuizConfig, ConfidenceLevel, UserConfidence } from '../types';
import Timer from './common/Timer';
import ProgressBar from './common/ProgressBar';
import { LightbulbIcon } from './common/icons/LightbulbIcon';

interface QuizScreenProps {
  quizData: Question[];
  userAnswers: UserAnswer;
  userConfidence: UserConfidence;
  currentQuestionIndex: number;
  onAnswerSelect: (questionIndex: number, answer: string) => void;
  onSkip: (questionIndex: number) => void;
  onConfidenceSelect: (questionIndex: number, confidence: ConfidenceLevel) => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  config: QuizConfig;
  startTime: number | null;
  onGetHint: (questionIndex: number) => void;
  hints: { [questionIndex: number]: string };
  loadingHints: { [questionIndex: number]: boolean };
}

const ConfidenceSelector: React.FC<{
  selectedIndex: number;
  onSelect: (confidence: ConfidenceLevel) => void;
  disabled: boolean;
}> = ({ selectedIndex, onSelect, disabled }) => {
  const levels: ConfidenceLevel[] = ['Guessing', 'Not Sure', 'Confident'];
  const colors = [
    'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-amber-300', // Guessing
    'bg-sky-100 text-sky-800 hover:bg-sky-200 ring-sky-300', // Not Sure
    'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 ring-emerald-300', // Confident
  ];
  
  const darkColors = [
      'dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50 dark:ring-amber-700',
      'dark:bg-sky-900/30 dark:text-sky-200 dark:hover:bg-sky-900/50 dark:ring-sky-700',
      'dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50 dark:ring-emerald-700'
  ];

  return (
    <div className="mt-8">
      <p className="text-sm font-semibold text-on-surface-secondary text-center mb-3">How confident are you in this answer?</p>
      <div className="flex justify-center gap-2 md:gap-4">
        {levels.map((level, index) => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedIndex === index ? `ring-2 ${colors[index]} ${darkColors[index]}` : `bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700`
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
};

const QuizScreen: React.FC<QuizScreenProps> = ({
  quizData,
  userAnswers,
  userConfidence,
  currentQuestionIndex,
  onAnswerSelect,
  onSkip,
  onConfidenceSelect,
  onNext,
  onPrev,
  onSubmit,
  config,
  startTime,
  onGetHint,
  hints,
  loadingHints,
}) => {
  const currentQuestion = quizData[currentQuestionIndex];
  const selectedAnswer = userAnswers[currentQuestionIndex];
  const isSkipped = selectedAnswer === null;
  const selectedConfidence = userConfidence[currentQuestionIndex];
  const isInstantFeedback = config.feedbackMode === 'instant';
  const [showFeedback, setShowFeedback] = useState(false);
  
  const currentHint = hints[currentQuestionIndex];
  const isLoadingHint = loadingHints[currentQuestionIndex];
  
  const confidenceLevels: ConfidenceLevel[] = ['Guessing', 'Not Sure', 'Confident'];
  const selectedConfidenceIndex = confidenceLevels.findIndex(l => l === selectedConfidence);


  useEffect(() => {
    setShowFeedback(false);
  }, [currentQuestionIndex]);

  const handleOptionClick = (option: string) => {
    if (showFeedback || isSkipped) return;
    onAnswerSelect(currentQuestionIndex, option);
    if (isInstantFeedback) {
      setShowFeedback(true);
    }
  };

  const handleNextClick = () => {
    if (isInstantFeedback && currentQuestion.type === 'Fill-in-the-Blank' && !showFeedback && !!selectedAnswer) {
      setShowFeedback(true);
      // Delay moving to next question to allow user to see feedback
      setTimeout(() => {
        onNext();
      }, 1500);
    } else {
      onNext();
    }
  };

  const handleSkipClick = () => {
    onSkip(currentQuestionIndex);
    if (currentQuestionIndex === quizData.length - 1) {
      // Allow the state update to process before submitting
      setTimeout(onSubmit, 100);
    } else {
      onNext();
    }
  };
  
  const handleGetHintClick = () => {
    if (currentHint || isLoadingHint) return;
    onGetHint(currentQuestionIndex);
  };

  const getOptionClass = (option: string) => {
    if (isSkipped) {
      return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-500';
    }
    if (!showFeedback && selectedAnswer === option) {
      return 'ring-2 ring-primary bg-primary/10 dark:bg-primary/20';
    }
    if (showFeedback && selectedAnswer) {
      if (option === currentQuestion.correctAnswer) {
        return 'bg-correct/20 text-green-800 dark:text-green-200 ring-2 ring-correct';
      }
      if (option === selectedAnswer && option !== currentQuestion.correctAnswer) {
        return 'bg-incorrect/20 text-red-800 dark:text-red-200 ring-2 ring-incorrect';
      }
    }
    return 'bg-surface hover:bg-gray-100 dark:hover:bg-slate-800';
  };

  // Helper to strip "A. ", "1. ", "a) " from the start of the string to avoid duplication
  const cleanOptionText = (text: string) => {
    return text.replace(/^([A-Z]|[a-z]|\d+)[.)\]]\s+/, '');
  };

  const renderAnswerInput = () => {
    // Fallback for old data without a 'type'
    const type = currentQuestion.type || 'MCQ';

    switch (type) {
      case 'MCQ':
      case 'True/False':
        return (
          <div className="mt-6 space-y-4">
            {currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                disabled={showFeedback || isSkipped}
                className={`w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 text-on-surface ${getOptionClass(option)} disabled:cursor-not-allowed`}
              >
                <span className="font-semibold">{type === 'MCQ' ? `${String.fromCharCode(65 + index)}. ` : ''}</span> {cleanOptionText(option)}
              </button>
            ))}
          </div>
        );
      case 'Fill-in-the-Blank':
        return (
          <div className="mt-6">
            <input
              type="text"
              value={isSkipped ? 'Skipped' : selectedAnswer || ''}
              onChange={(e) => onAnswerSelect(currentQuestionIndex, e.target.value)}
              disabled={showFeedback || isSkipped}
              placeholder="Type your answer here..."
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500"
            />
          </div>
        );
      default:
        return <p className="mt-6 text-red-600">Error: Unsupported question type.</p>;
    }
  };

  const isFillInTheBlankCorrect = () => {
    if (currentQuestion.type !== 'Fill-in-the-Blank' || isSkipped) return false;
    return selectedAnswer?.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-surface p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-on-surface-secondary font-medium">
            Question {currentQuestionIndex + 1} of {quizData.length}
          </div>
          {startTime && config.timerType === 'overall' && (
            <Timer
              durationInMinutes={config.time}
              onTimeUp={onSubmit}
              startTime={startTime}
            />
          )}
        </div>
        <ProgressBar current={currentQuestionIndex + 1} total={quizData.length} />

        <div className="mt-8">
            <div className="flex justify-between items-start gap-4">
                <h3 className="text-xl md:text-2xl font-bold text-on-surface leading-tight flex-1">
                    {isSkipped && <span className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md mr-2">SKIPPED</span>}
                    {currentQuestion.question}
                </h3>
                <button 
                    onClick={handleGetHintClick} 
                    disabled={!!currentHint || isLoadingHint}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <LightbulbIcon className={`w-5 h-5 ${isLoadingHint ? 'animate-pulse' : ''}`}/>
                    {isLoadingHint ? 'Getting...' : (currentHint ? 'Hint Used' : 'Get Hint')}
                </button>
            </div>
          
          {currentHint && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200 animate-fade-in">
              <strong>Hint:</strong> {currentHint}
            </div>
          )}
          
          {renderAnswerInput()}

          {showFeedback && (
            <div className={`mt-6 p-4 rounded-lg animate-fade-in ${
              (currentQuestion.type !== 'Fill-in-the-Blank' && selectedAnswer === currentQuestion.correctAnswer) || (currentQuestion.type === 'Fill-in-the-Blank' && isFillInTheBlankCorrect())
                ? 'bg-correct/10' 
                : 'bg-incorrect/10'
            }`}>
              <h4 className="font-bold text-lg mb-2">Explanation</h4>
              {currentQuestion.type === 'Fill-in-the-Blank' && !isFillInTheBlankCorrect() && (
                 <p className="mb-2"><strong>Correct Answer:</strong> <span className="font-semibold">{currentQuestion.correctAnswer}</span></p>
              )}
              <p className="text-on-surface">{currentQuestion.explanation}</p>
            </div>
          )}

          <ConfidenceSelector
            selectedIndex={selectedConfidenceIndex}
            onSelect={(confidence) => onConfidenceSelect(currentQuestionIndex, confidence)}
            disabled={isSkipped || showFeedback}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={onPrev}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 bg-surface border border-gray-300 dark:border-gray-600 text-on-surface rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
            onClick={handleSkipClick}
            className="px-6 py-3 bg-surface border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Skip
          </button>
        {currentQuestionIndex === quizData.length - 1 ? (
          <button
            onClick={onSubmit}
            className="px-8 py-3 bg-secondary text-white rounded-lg font-bold hover:bg-green-600 transition-transform transform hover:scale-105"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={handleNextClick}
            className="px-8 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-transform transform hover:scale-105"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizScreen;
