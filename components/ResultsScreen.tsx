import React, { useMemo, useState } from 'react';
import { AppState, Question, Flashcard } from '../types';
import { generateFlashcards } from '../services/geminiService';
import { CheckCircleIcon } from './common/icons/CheckCircleIcon';
import { XCircleIcon } from './common/icons/XCircleIcon';
import { ChevronDownIcon } from './common/icons/ChevronDownIcon';
import { AlertTriangleIcon } from './common/icons/AlertTriangleIcon';
import { BrainCircuitIcon } from './common/icons/BrainCircuitIcon';

// To satisfy TypeScript for the CDN-loaded libraries
declare const marked: any;
declare const DOMPurify: any;

interface ResultsScreenProps {
  appState: AppState;
  onRestart: () => void;
  onRetake: () => void;
  onStartChat: (question: Question) => void;
  onGenerateSummary: () => void;
}

const AISummary: React.FC<{ summary: string | null, isLoading: boolean, onGenerate: () => void, hasGenerated: boolean }> = ({ summary, isLoading, onGenerate, hasGenerated }) => {
  
  if (!hasGenerated) {
    return (
      <div className="text-center p-4 border-2 border-dashed rounded-lg">
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
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!summary) return null;

  const sanitizedHtml = DOMPurify.sanitize(marked.parse(summary));
  return (
      <div className="prose max-w-none prose-p:my-2 prose-headings:my-4 prose-ul:my-2 prose-li:my-1 break-words" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  );
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ appState, onRestart, onRetake, onStartChat, onGenerateSummary }) => {
  const { quizData, userAnswers, userConfidence, startTime, endTime, quizConfig, performanceSummary, isGeneratingSummary, fileContents } = appState;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  // FIX: Added 'info' to the possible types for flashcard messages to support informational messages.
  const [flashcardMessage, setFlashcardMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  const results = useMemo(() => {
    if (!quizData) return null;

    const totalQuestions = quizData.length;
    
    const attemptedEntries = Object.entries(userAnswers).filter(([, answer]) => answer !== null && answer !== undefined);
    const attemptedQuestions = attemptedEntries.length;
    const skippedQuestions = totalQuestions - attemptedQuestions;

    let correctAnswers = 0;
    let confidentlyIncorrect = 0;
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
      } else if (userConfidence[index] === 'Confident') {
        confidentlyIncorrect++;
      }
    });
    
    const incorrectAnswers = attemptedQuestions - correctAnswers;
    const penalty = quizConfig.negativeMarking ? incorrectAnswers * quizConfig.penalty : 0;
    const score = Math.max(0, correctAnswers - penalty);
    const percentage = attemptedQuestions > 0 ? (correctAnswers / attemptedQuestions) * 100 : 0;
    const timeTaken = endTime && startTime ? Math.round((endTime - startTime) / 1000) : 0;

    return { score, totalQuestions, percentage, timeTaken, categoryPerformance, confidentlyIncorrect, attemptedQuestions, correctAnswers, incorrectAnswers, skippedQuestions };
  }, [quizData, userAnswers, userConfidence, startTime, endTime, quizConfig]);

  if (!results || !quizData) return <div>Loading results...</div>;

  const { score, totalQuestions, percentage, timeTaken, categoryPerformance, confidentlyIncorrect, attemptedQuestions, correctAnswers, incorrectAnswers, skippedQuestions } = results;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };
  
  const handleOpenChat = (question: Question) => {
    onStartChat(question);
  };

  const handleGenerateFlashcards = async () => {
    if (!quizData || !fileContents) return;
    setIsGeneratingFlashcards(true);
    setFlashcardMessage(null);
    
    const incorrectQuestions = quizData.filter((q, index) => {
        const userAnswer = userAnswers[index];
        if (userAnswer === null || userAnswer === undefined) return false; // Exclude skipped/unanswered
        if (q.type === 'Fill-in-the-Blank') {
            return userAnswer.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase();
        }
        return userAnswer !== q.correctAnswer;
    });

    try {
        if (incorrectQuestions.length > 0) {
            const flashcards = await generateFlashcards(incorrectQuestions, fileContents);
            if (flashcards && flashcards.length > 0) {
                const dataStr = JSON.stringify(flashcards, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = 'cogniquest_flashcards.json';
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
                setFlashcardMessage({type: 'success', text: 'Flashcard deck downloaded successfully!'});
            } else {
                setFlashcardMessage({type: 'error', text: 'Could not generate flashcards from incorrect answers.'});
            }
        } else {
            setFlashcardMessage({type: 'info', text: "No incorrect answers found to generate flashcards from. Great job!"});
        }
    } catch (error: any) {
        console.error("Flashcard generation failed:", error);
        setFlashcardMessage({type: 'error', text: `Error: ${error.message}`});
    } finally {
        setIsGeneratingFlashcards(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-surface p-8 rounded-2xl shadow-lg border border-gray-200 mb-8">
        <h2 className="text-3xl font-extrabold text-center mb-2">Quiz Completed!</h2>
        <p className="text-center text-lg text-on-surface-secondary mb-8">Here's your performance breakdown.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-primary/10 p-4 rounded-xl">
            <div className="text-3xl font-bold text-primary">{score.toFixed(2)}</div>
            <div className="text-sm text-on-surface font-semibold mt-1">Score</div>
          </div>
          <div className="bg-secondary/10 p-4 rounded-xl">
            <div className="text-3xl font-bold text-secondary">{percentage.toFixed(1)}%</div>
            <div className="text-sm text-on-surface font-semibold mt-1">Accuracy</div>
          </div>
          <div className="bg-amber-100 p-4 rounded-xl">
            <div className="text-3xl font-bold text-amber-600">{attemptedQuestions}/{totalQuestions}</div>
            <div className="text-sm text-on-surface font-semibold mt-1">Attempted</div>
          </div>
          <div className="bg-indigo-100 p-4 rounded-xl">
            <div className="text-3xl font-bold text-indigo-600">
              {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
            </div>
            <div className="text-sm text-on-surface font-semibold mt-1">Time Taken</div>
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-6 text-on-surface-secondary">
            <div className="text-center"><span className="font-bold text-correct">{correctAnswers}</span> Correct</div>
            <div className="text-center"><span className="font-bold text-incorrect">{incorrectAnswers}</span> Incorrect</div>
            <div className="text-center"><span className="font-bold">{skippedQuestions}</span> Skipped</div>
        </div>
      </div>
      
       <div className="bg-surface p-6 rounded-2xl shadow-lg border border-gray-200 mb-8">
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-surface p-6 rounded-2xl shadow-lg border border-gray-200">
            <h3 className="font-bold text-xl mb-4">Performance Analytics</h3>
            {confidentlyIncorrect > 0 && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 mb-4">
                    <p><strong><span className="text-2xl">{confidentlyIncorrect}</span> blind spot(s) found.</strong></p>
                    <p className="text-sm">These are questions you answered incorrectly with high confidence. It's a good idea to review these topics thoroughly.</p>
                </div>
            )}
            <div className="space-y-4">
              {Object.entries(categoryPerformance).map(([category, data]) => {
                const categoryPercentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-on-surface">{category}</span>
                      <span className="text-sm font-medium text-on-surface-secondary">{data.correct}/{data.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${categoryPercentage}%` }}
                        ></div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
        <div className="bg-surface p-6 rounded-2xl shadow-lg border border-gray-200 flex flex-col justify-center items-center gap-4">
          <h3 className="font-bold text-xl mb-2">Continue Your Journey</h3>
          <button onClick={onRetake} className="w-full text-lg bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-transform transform hover:scale-105">
            Retake This Quiz
          </button>
          <button onClick={onRestart} className="w-full text-lg bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-dark transition-transform transform hover:scale-105">
            Create New Quiz
          </button>
          <button 
            onClick={handleGenerateFlashcards} 
            disabled={isGeneratingFlashcards}
            className="w-full text-lg bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-wait">
            {isGeneratingFlashcards ? 'Generating...' : 'Create Flashcard Deck'}
          </button>
           {flashcardMessage && (
            <div className={`w-full mt-2 p-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                flashcardMessage.type === 'success' ? 'bg-green-50 text-green-800' : 
                flashcardMessage.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'
            }`}>
                {/* FIX: Displays a checkmark for 'success' and 'info' messages, and a warning triangle for 'error' messages. */}
                {flashcardMessage.type === 'error' ? <AlertTriangleIcon className="w-5 h-5"/> : <CheckCircleIcon className="w-5 h-5"/>}
                {flashcardMessage.text}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-4">Question-by-Question Review</h3>
        <div className="space-y-4">
          {quizData.map((q, index) => {
            const userAnswer = userAnswers[index];
            const confidence = userConfidence[index];
            
            let isCorrect = false;
            let isSkipped = userAnswer === null || userAnswer === undefined;

            if (!isSkipped) {
              if (q.type === 'Fill-in-the-Blank') {
                isCorrect = userAnswer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
              } else {
                isCorrect = userAnswer === q.correctAnswer;
              }
            }
            
            return (
              <div key={index} className="bg-surface border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full flex justify-between items-center p-4 text-left"
                >
                  <div className="flex items-center">
                    {isSkipped ? (
                      <span className="w-6 h-6 text-gray-400 font-bold mr-3 flex-shrink-0 text-center">-</span>
                    ) : isCorrect ? (
                      <CheckCircleIcon className="w-6 h-6 text-correct mr-3 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="w-6 h-6 text-incorrect mr-3 flex-shrink-0" />
                    )}
                    <span className="font-semibold flex-1">{index + 1}. {q.question}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {confidence && <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        confidence === 'Confident' ? 'bg-emerald-100 text-emerald-800' :
                        confidence === 'Not Sure' ? 'bg-sky-100 text-sky-800' :
                        'bg-amber-100 text-amber-800'
                    }`}>{confidence}</span>}
                    <ChevronDownIcon
                        className={`w-6 h-6 text-gray-500 transform transition-transform ${
                        expandedIndex === index ? 'rotate-180' : ''
                        }`}
                    />
                   </div>
                </button>
                {expandedIndex === index && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <p className="mb-2"><strong>Your Answer:</strong> 
                        {isSkipped ? <span className="text-gray-500 font-semibold"> Skipped</span> : 
                        <span className={isCorrect ? 'text-correct' : 'text-incorrect'}> {userAnswer}</span>}
                    </p>
                    {!isCorrect && !isSkipped && <p className="mb-2"><strong>Correct Answer:</strong> <span className="text-correct">{q.correctAnswer}</span></p>}
                     {isSkipped && <p className="mb-2"><strong>Correct Answer:</strong> <span className="text-correct">{q.correctAnswer}</span></p>}
                    <p className="mb-4"><strong>Explanation:</strong> {q.explanation}</p>
                    <button onClick={() => handleOpenChat(q)} className="text-sm text-primary font-semibold hover:underline">
                      Discuss with AI Tutor
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;