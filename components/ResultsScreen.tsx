
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, Question } from '../types';
import { CheckCircleIcon } from './common/icons/CheckCircleIcon';
import { XCircleIcon } from './common/icons/XCircleIcon';
import { ChevronDownIcon } from './common/icons/ChevronDownIcon';
import { BrainCircuitIcon } from './common/icons/BrainCircuitIcon';
import { BookOpenIcon } from './common/icons/BookOpenIcon';
import { DownloadIcon } from './common/icons/DownloadIcon';

// To satisfy TypeScript for the CDN-loaded libraries
declare const marked: any;
declare const DOMPurify: any;

interface ResultsScreenProps {
  appState: AppState;
  onRestart: () => void;
  onRetake: () => void;
  onStartChat: (question: Question) => void;
  onGenerateSummary: () => void;
  onStartFlashcards: () => void;
}

const AISummary: React.FC<{ summary: string | null, isLoading: boolean, onGenerate: () => void, hasGenerated: boolean }> = ({ summary, isLoading, onGenerate, hasGenerated }) => {
  
  if (!hasGenerated) {
    return (
      <div className="text-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <p className="mb-4 text-on-surface-secondary">Get deeper insights into your performance and actionable study tips.</p>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="bg-primary text-white font-bold py-2 px-5 rounded-lg hover:bg-primary-dark transition-transform transform hover:scale-105 shadow disabled:bg-primary/50 disabled:cursor-wait"
        >
          {isLoading ? 'Generating...' : 'Generate AI Analysis'}
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse-faint p-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  if (!summary) return null;

  const sanitizedHtml = DOMPurify.sanitize(marked.parse(summary));
  return (
      <div className="prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-4 prose-ul:my-2 prose-li:my-1 break-words text-on-surface" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  );
};

const ReviewItem: React.FC<{
  question: Question;
  userAnswer: string | null | undefined;
  confidence: string;
  index: number;
  isExpanded: boolean;
  toggleExpand: () => void;
  onChat: (q: Question) => void;
  autoReveal: boolean;
}> = ({ question, userAnswer, confidence, index, isExpanded, toggleExpand, onChat, autoReveal }) => {
  const [isRevealed, setIsRevealed] = useState(autoReveal);

  // Sync reveal state with expansion and auto-reveal setting
  useEffect(() => {
    if (!isExpanded) {
      setIsRevealed(autoReveal); // Reset when collapsed
    } else if (autoReveal) {
      setIsRevealed(true);
    }
  }, [isExpanded, autoReveal]);

  let isCorrect = false;
  const isSkipped = userAnswer === null || userAnswer === undefined;

  if (!isSkipped) {
    if (question.type === 'Fill-in-the-Blank') {
      isCorrect = userAnswer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    } else {
      isCorrect = userAnswer === question.correctAnswer;
    }
  }

  return (
    <div className="bg-surface border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-colors">
      <button
        onClick={toggleExpand}
        className="w-full flex justify-between items-center p-4 text-left text-on-surface hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center">
          {isSkipped ? (
             <span className="w-6 h-6 text-gray-400 font-bold mr-3 flex-shrink-0 text-center">-</span>
          ) : isCorrect ? (
             <CheckCircleIcon className="w-6 h-6 text-correct mr-3 flex-shrink-0" />
          ) : (
             <XCircleIcon className="w-6 h-6 text-incorrect mr-3 flex-shrink-0" />
          )}
          <span className="font-semibold flex-1">{index + 1}. {question.question}</span>
        </div>
        <div className="flex items-center gap-4">
          {confidence && <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              confidence === 'Confident' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' :
              confidence === 'Not Sure' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200' :
              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
          }`}>{confidence}</span>}
          <ChevronDownIcon
              className={`w-6 h-6 text-gray-500 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
              }`}
          />
          </div>
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 text-on-surface">
          <p className="mb-2"><strong>Your Answer:</strong> 
              {isSkipped ? <span className="text-gray-500 font-semibold"> Skipped</span> : 
              <span className={isCorrect ? 'text-correct' : 'text-incorrect'}> {userAnswer}</span>}
          </p>
          
          {!isRevealed && !isCorrect ? (
            <button 
              onClick={() => setIsRevealed(true)}
              className="mt-2 mb-4 text-sm font-bold text-primary hover:text-primary-dark underline"
            >
              Show Correct Answer & Explanation
            </button>
          ) : (
            <div className="animate-fade-in">
               {(!isCorrect || isSkipped) && <p className="mb-2"><strong>Correct Answer:</strong> <span className="text-correct">{question.correctAnswer}</span></p>}
               <p className="mb-4"><strong>Explanation:</strong> {question.explanation}</p>
            </div>
          )}
          
          <button onClick={() => onChat(question)} className="block mt-2 text-sm text-primary font-semibold hover:underline">
            Discuss with AI Tutor
          </button>
        </div>
      )}
    </div>
  );
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ appState, onRestart, onRetake, onStartChat, onGenerateSummary, onStartFlashcards }) => {
  const { quizData, userAnswers, userConfidence, startTime, endTime, quizConfig, performanceSummary, isGeneratingSummary, isGeneratingFlashcards, error, quizTitle } = appState;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [autoReveal, setAutoReveal] = useState(false);
  
  const results = useMemo(() => {
    if (!quizData) return null;

    const totalQuestions = quizData.length;
    
    const attemptedEntries = Object.entries(userAnswers).filter(([, answer]) => answer !== null && answer !== undefined);
    const attemptedQuestions = attemptedEntries.length;
    const skippedQuestions = totalQuestions - attemptedQuestions;

    let correctAnswers = 0;
    let confidentlyIncorrect = 0;
    const incorrectQuestionsList: Question[] = [];
    const categoryPerformance: { [key: string]: { correct: number; total: number } } = {};

    attemptedEntries.forEach(([indexStr, userAnswer]) => {
      const index = parseInt(indexStr, 10);
      const q = quizData[index];
      
      const category = q.category || 'Uncategorized';
      if (!categoryPerformance[category]) {
        categoryPerformance[category] = { correct: 0, total: 0 };
      }
      categoryPerformance[category].total++;
      
      let isCorrect = false;
      if (q.type === 'Fill-in-the-Blank') {
        isCorrect = (userAnswer as string)?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      } else {
        isCorrect = userAnswer === q.correctAnswer;
      }

      if (isCorrect) {
        correctAnswers++;
        categoryPerformance[category].correct++;
      } else {
        incorrectQuestionsList.push(q);
        if (userConfidence[index] === 'Confident') {
          confidentlyIncorrect++;
        }
      }
    });
    
    const incorrectAnswers = attemptedQuestions - correctAnswers;
    const penalty = quizConfig.negativeMarking ? incorrectAnswers * quizConfig.penalty : 0;
    const score = Math.max(0, correctAnswers - penalty);
    const percentage = attemptedQuestions > 0 ? (correctAnswers / attemptedQuestions) * 100 : 0;
    const timeTaken = endTime && startTime ? Math.round((endTime - startTime) / 1000) : 0;

    return { score, totalQuestions, percentage, timeTaken, categoryPerformance, confidentlyIncorrect, attemptedQuestions, correctAnswers, incorrectAnswers, skippedQuestions, incorrectQuestionsCount: incorrectQuestionsList.length };
  }, [quizData, userAnswers, userConfidence, startTime, endTime, quizConfig]);

  if (!results || !quizData) return <div>Loading results...</div>;

  const { score, totalQuestions, percentage, timeTaken, confidentlyIncorrect, attemptedQuestions, correctAnswers, incorrectAnswers, skippedQuestions, incorrectQuestionsCount } = results;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };
  
  const handleOpenChat = (question: Question) => {
    onStartChat(question);
  };

  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(quizData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cogniquest_quiz_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTXT = () => {
    const txtContent = quizData.map((q, i) => {
      let text = `Q${i + 1}: ${q.question}\n`;
      if (q.type !== 'Fill-in-the-Blank' && q.options) {
        q.options.forEach((opt, idx) => {
          text += `   ${String.fromCharCode(65 + idx)}) ${opt}\n`;
        });
      }
      text += `\n   Correct Answer: ${q.correctAnswer}\n`;
      text += `   Explanation: ${q.explanation}\n`;
      return text;
    }).join('\n' + '-'.repeat(40) + '\n\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cogniquest_quiz_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-surface p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
        <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-on-surface mb-1">Quiz Completed!</h2>
            {quizTitle && <h3 className="text-xl font-semibold text-primary">{quizTitle}</h3>}
            <p className="text-lg text-on-surface-secondary mt-2">Here's your performance breakdown.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-xl">
            <div className="text-3xl font-bold text-primary">{score.toFixed(2)}</div>
            <div className="text-sm text-on-surface font-semibold mt-1">Score</div>
          </div>
          <div className="bg-secondary/10 dark:bg-secondary/20 p-4 rounded-xl">
            <div className="text-3xl font-bold text-secondary">{percentage.toFixed(1)}%</div>
            <div className="text-sm text-on-surface font-semibold mt-1">Accuracy</div>
          </div>
          <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-xl">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{attemptedQuestions}/{totalQuestions}</div>
            <div className="text-sm text-on-surface font-semibold mt-1">Attempted</div>
          </div>
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-xl">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
            </div>
            <div className="text-sm text-on-surface font-semibold mt-1">Time Taken</div>
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-6 text-on-surface-secondary">
            <div className="text-center"><span className="font-bold text-correct">{correctAnswers}</span> Correct</div>
            <div className="text-center"><span className="font-bold text-incorrect">{incorrectAnswers}</span> Incorrect</div>
            <div className="text-center"><span className="font-bold text-on-surface">{skippedQuestions}</span> Skipped</div>
        </div>
      </div>
      
       <div className="bg-surface p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-on-surface">
            <BrainCircuitIcon className="w-6 h-6 text-primary" />
            AI-Powered Analysis
          </h3>
          <AISummary 
            summary={performanceSummary} 
            isLoading={isGeneratingSummary} 
            onGenerate={onGenerateSummary}
            hasGenerated={!!performanceSummary || isGeneratingSummary}
          />
       </div>

      <div className="bg-surface p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 flex flex-col md:flex-row justify-center items-center gap-6 transition-colors">
        <div className="text-center md:text-left flex-1">
             <h3 className="font-bold text-xl mb-2 text-on-surface">Continue Your Journey</h3>
             {confidentlyIncorrect > 0 && (
                <p className="text-red-600 dark:text-red-400 text-sm mb-2">
                   <strong>Note:</strong> You had {confidentlyIncorrect} "blind spots" (incorrect answers with high confidence).
                </p>
             )}
        </div>
        <div className="flex gap-4 w-full md:w-auto">
             <button onClick={onRetake} className="flex-1 md:flex-none text-lg bg-secondary text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 transition-transform transform hover:scale-105">
                Retake This Quiz
             </button>
             <button onClick={onRestart} className="flex-1 md:flex-none text-lg bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-dark transition-transform transform hover:scale-105">
                Create New Quiz
             </button>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 transition-colors">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-on-surface">
              <DownloadIcon className="w-6 h-6 text-primary" />
              Save & Export Quiz
          </h3>
          <p className="text-on-surface-secondary mb-6">Download the generated quiz questions, answers, and explanations for future practice.</p>
          <div className="flex gap-4 flex-wrap">
              <button onClick={handleDownloadJSON} className="flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 text-on-surface transition-colors w-full sm:w-auto">
                  <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">JSON</span> Download JSON
              </button>
              <button onClick={handleDownloadTXT} className="flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 text-on-surface transition-colors w-full sm:w-auto">
                  <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">TXT</span> Download Text
              </button>
          </div>
      </div>
      
      <div className="bg-surface p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8 text-center transition-colors">
          <h3 className="font-bold text-xl mb-2 text-on-surface">Turn Weaknesses into Strengths</h3>
          <p className="text-on-surface-secondary mb-4 max-w-xl mx-auto">Instantly create and study flashcards based on the questions you answered incorrectly to reinforce your learning.</p>
          <button 
            onClick={onStartFlashcards}
            disabled={isGeneratingFlashcards || incorrectQuestionsCount === 0}
            className="inline-flex items-center justify-center text-lg bg-gray-700 dark:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-wait"
          >
              <BookOpenIcon className="w-6 h-6 mr-2" />
              {isGeneratingFlashcards ? 'Generating...' : `Study ${incorrectQuestionsCount} Flashcard(s)`}
          </button>
          {error && error.includes('Flashcard') && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {!isGeneratingFlashcards && incorrectQuestionsCount === 0 && <p className="mt-4 text-sm text-green-600 dark:text-green-400 font-semibold">No incorrect answers to study. Great job!</p>}
      </div>


      <div>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h3 className="text-2xl font-bold text-on-surface">Question-by-Question Review</h3>
            
            <div className="flex items-center gap-3 bg-surface p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-on-surface">Auto-reveal Solutions</span>
                <label htmlFor="auto-reveal-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        id="auto-reveal-toggle"
                        checked={autoReveal}
                        onChange={() => setAutoReveal(!autoReveal)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
        </div>

        <div className="space-y-4">
          {quizData.map((q, index) => (
            <ReviewItem
                key={index}
                question={q}
                userAnswer={userAnswers[index]}
                confidence={userConfidence[index]}
                index={index}
                isExpanded={expandedIndex === index}
                toggleExpand={() => toggleExpand(index)}
                onChat={handleOpenChat}
                autoReveal={autoReveal}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
