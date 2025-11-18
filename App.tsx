import React, { useState, useEffect, useCallback } from 'react';
import { AppState, AppStatus, QuizConfig, Question, ConfidenceLevel, Flashcard } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import FileUploadScreen from './components/FileUploadScreen';
import QuizConfigScreen from './components/QuizConfigScreen';
import LoadingScreen from './components/LoadingScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import ChatScreen from './components/ChatScreen';
import FlashcardScreen from './components/FlashcardScreen';
import { generateQuiz, generateHint, generatePerformanceSummary, generateFlashcards } from './services/geminiService';
import { Header } from './components/common/Header';

const initialConfig: QuizConfig = {
  numQuestions: 10,
  negativeMarking: false,
  penalty: 0.25,
  timerType: 'overall',
  time: 30, // in minutes
  complexity: 'Medium',
  tone: 'Accurate',
  feedbackMode: 'end-of-quiz',
  questionVariety: 'MCQ Only',
};

const initialAppState: AppState = {
    status: AppStatus.INITIAL,
    fileContents: null,
    quizConfig: initialConfig,
    quizData: null,
    userAnswers: {},
    userConfidence: {},
    currentQuestionIndex: 0,
    startTime: null,
    endTime: null,
    chatContext: null,
    hints: {},
    loadingHints: {},
    performanceSummary: null,
    isGeneratingSummary: false,
    error: null,
    flashcards: null,
    isGeneratingFlashcards: false,
};


const App: React.FC = () => {
  const [storedState, setStoredState] = useLocalStorage<AppState | null>('quiz-session', null);
  const [appState, setAppState] = useState<AppState>(
    storedState || initialAppState
  );

  // Theme State
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (appState.status === AppStatus.INITIAL && storedState !== null) {
      setStoredState(null);
    } else if (appState.status !== AppStatus.INITIAL) {
      setStoredState(appState);
    }
  }, [appState, setStoredState, storedState]);
  
  useEffect(() => {
    if (appState.status === AppStatus.COMPLETED && appState.isGeneratingSummary) {
        const fetchSummary = async () => {
            const { quizData, userAnswers, userConfidence, quizConfig } = appState;
            if (!quizData) {
                setAppState(prev => ({ ...prev, isGeneratingSummary: false }));
                return;
            }
            try {
              const summary = await generatePerformanceSummary(quizData, userAnswers, userConfidence, quizConfig);
              setAppState(prev => ({ ...prev, performanceSummary: summary, isGeneratingSummary: false }));
            } catch (error: any) {
              setAppState(prev => ({ ...prev, error: "Failed to generate AI performance summary.", isGeneratingSummary: false }));
            }
        };
        fetchSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.status, appState.isGeneratingSummary]);

  const handleFileUploaded = (contents: string[]) => {
    setAppState(prev => ({ ...prev, status: AppStatus.CONFIGURING, fileContents: contents, error: null }));
  };

  const handleConfigChange = (newConfig: Partial<QuizConfig>) => {
    setAppState(prev => ({
      ...prev,
      quizConfig: { ...prev.quizConfig, ...newConfig },
    }));
  };

  const handleStartQuiz = async () => {
    if (!appState.fileContents || appState.fileContents.length === 0) return;
    setAppState(prev => ({ ...prev, status: AppStatus.GENERATING, error: null }));
    try {
      const combinedContent = appState.fileContents.join('\n\n--- (New Document) ---\n\n');
      const quizQuestions = await generateQuiz(combinedContent, appState.quizConfig);
      if (quizQuestions && quizQuestions.length > 0) {
        setAppState(prev => ({
          ...prev,
          status: AppStatus.IN_PROGRESS,
          quizData: quizQuestions,
          startTime: Date.now(),
          userAnswers: {},
          userConfidence: {},
          currentQuestionIndex: 0,
          hints: {},
          loadingHints: {},
          performanceSummary: null,
          isGeneratingSummary: false,
        }));
      } else {
        throw new Error("The generated quiz was empty or invalid. The source material may not have been suitable.");
      }
    } catch (error: any) {
      console.error("Quiz generation failed:", error);
      setAppState(prev => ({ ...prev, status: AppStatus.CONFIGURING, error: `Quiz Generation Failed: ${error.message}` }));
    }
  };
  
  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setAppState(prev => ({
      ...prev,
      userAnswers: { ...prev.userAnswers, [questionIndex]: answer },
    }));
  };
  
  const handleSkipAnswer = (questionIndex: number) => {
    setAppState(prev => ({
        ...prev,
        userAnswers: { ...prev.userAnswers, [questionIndex]: null },
    }));
  };

  const handleConfidenceSelect = (questionIndex: number, confidence: ConfidenceLevel) => {
    setAppState(prev => ({
      ...prev,
      userConfidence: { ...prev.userConfidence, [questionIndex]: confidence },
    }));
  };

  const handleGetHint = async (questionIndex: number) => {
    if (!appState.fileContents || !appState.quizData) return;
    
    setAppState(prev => ({
      ...prev,
      loadingHints: { ...prev.loadingHints, [questionIndex]: true },
    }));

    try {
      const combinedContent = appState.fileContents.join('\n\n--- (New Document) ---\n\n');
      const question = appState.quizData[questionIndex];
      const hint = await generateHint(combinedContent, question);
      if (hint) {
        setAppState(prev => ({
          ...prev,
          hints: { ...prev.hints, [questionIndex]: hint },
        }));
      }
    } catch (error) {
      console.error("Failed to generate hint:", error);
      // Optionally show an error to the user
    } finally {
      setAppState(prev => ({
        ...prev,
        loadingHints: { ...prev.loadingHints, [questionIndex]: false },
      }));
    }
  };

  const handleNextQuestion = () => {
    if (appState.quizData && appState.currentQuestionIndex < appState.quizData.length - 1) {
      setAppState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    }
  };

  const handlePrevQuestion = () => {
    if (appState.currentQuestionIndex > 0) {
      setAppState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }));
    }
  };
  
  const handleSubmitQuiz = useCallback(() => {
    setAppState(prev => ({ 
      ...prev, 
      status: AppStatus.COMPLETED, 
      endTime: Date.now(),
      isGeneratingSummary: false,
      performanceSummary: null,
      error: null,
    }));
  }, []);

  const handleGenerateSummary = useCallback(() => {
      if (appState.status === AppStatus.COMPLETED) {
          setAppState(prev => ({...prev, isGeneratingSummary: true }));
      }
  }, [appState.status]);

  const handleRestart = () => {
    setAppState(initialAppState);
  };

  const handleRetakeQuiz = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      status: AppStatus.IN_PROGRESS,
      userAnswers: {},
      userConfidence: {},
      currentQuestionIndex: 0,
      startTime: Date.now(),
      endTime: null,
      hints: {},
      loadingHints: {},
      performanceSummary: null,
      isGeneratingSummary: false,
      error: null,
    }));
  }, []);

  const handleStartChat = useCallback((question: Question) => {
    if (!appState.quizData || !appState.fileContents) return;
    const userAnswer = appState.userAnswers[appState.quizData.findIndex(q => q.question === question.question)];
    setAppState(prev => ({
      ...prev,
      status: AppStatus.CHATTING,
      chatContext: {
        question,
        userAnswer,
        originalContexts: prev.fileContents!,
      }
    }));
  }, [appState.fileContents, appState.quizData, appState.userAnswers]);

  const handleExitChat = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      status: AppStatus.COMPLETED,
      chatContext: null,
    }));
  }, []);

  const handleStartFlashcards = async () => {
    const { quizData, userAnswers, fileContents } = appState;
    if (!quizData || !fileContents) return;

    setAppState(prev => ({ ...prev, isGeneratingFlashcards: true, error: null }));

    try {
      const incorrectQuestions = quizData.filter((q, index) => {
        const userAnswer = userAnswers[index];
        if (userAnswer === null || userAnswer === undefined) return false;
        if (q.type === 'Fill-in-the-Blank') {
          return userAnswer.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase();
        }
        return userAnswer !== q.correctAnswer;
      });

      if (incorrectQuestions.length === 0) {
        setAppState(prev => ({ ...prev, isGeneratingFlashcards: false }));
        return; // This case is handled in ResultsScreen UI.
      }
      
      const generatedFlashcards = await generateFlashcards(incorrectQuestions, fileContents);
      
      if (generatedFlashcards && generatedFlashcards.length > 0) {
        setAppState(prev => ({
          ...prev,
          status: AppStatus.FLASHCARDS,
          flashcards: generatedFlashcards,
          isGeneratingFlashcards: false,
        }));
      } else {
        throw new Error("AI could not generate flashcards from the incorrect answers.");
      }
    } catch (error: any) {
      setAppState(prev => ({
        ...prev,
        isGeneratingFlashcards: false,
        error: `Flashcard Generation Failed: ${error.message}`
      }));
    }
  };

  const handleExitFlashcards = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      status: AppStatus.COMPLETED,
      flashcards: null,
    }));
  }, []);


  const renderContent = () => {
    // Add a unique key to each top-level component to ensure it re-mounts with a fresh state on status change
    switch (appState.status) {
      case AppStatus.INITIAL:
        return <FileUploadScreen key="initial" onFileUploaded={handleFileUploaded} />;
      case AppStatus.CONFIGURING:
        return (
          <QuizConfigScreen
            key="configuring"
            config={appState.quizConfig}
            onConfigChange={handleConfigChange}
            onStartQuiz={handleStartQuiz}
            error={appState.error}
          />
        );
      case AppStatus.GENERATING:
        return <LoadingScreen key="generating" text="Generating your personalized quiz..." />;
      case AppStatus.IN_PROGRESS:
        if (!appState.quizData) return null;
        return (
          <QuizScreen
            key="in-progress"
            quizData={appState.quizData}
            userAnswers={appState.userAnswers}
            userConfidence={appState.userConfidence}
            currentQuestionIndex={appState.currentQuestionIndex}
            onAnswerSelect={handleAnswerSelect}
            onSkip={handleSkipAnswer}
            onConfidenceSelect={handleConfidenceSelect}
            onNext={handleNextQuestion}
            onPrev={handlePrevQuestion}
            onSubmit={handleSubmitQuiz}
            config={appState.quizConfig}
            startTime={appState.startTime}
            onGetHint={handleGetHint}
            hints={appState.hints}
            loadingHints={appState.loadingHints}
          />
        );
      case AppStatus.COMPLETED:
        return <ResultsScreen key="completed" appState={appState} onRestart={handleRestart} onRetake={handleRetakeQuiz} onStartChat={handleStartChat} onGenerateSummary={handleGenerateSummary} onStartFlashcards={handleStartFlashcards} />;
      case AppStatus.CHATTING:
        if (!appState.chatContext) return <ResultsScreen key="chat-fallback" appState={appState} onRestart={handleRestart} onRetake={handleRetakeQuiz} onStartChat={handleStartChat} onGenerateSummary={handleGenerateSummary} onStartFlashcards={handleStartFlashcards} />;
        return <ChatScreen key="chatting" chatContext={appState.chatContext} onExitChat={handleExitChat} />;
      case AppStatus.FLASHCARDS:
        if (!appState.flashcards) return <ResultsScreen key="flashcard-fallback" appState={appState} onRestart={handleRestart} onRetake={handleRetakeQuiz} onStartChat={handleStartChat} onGenerateSummary={handleGenerateSummary} onStartFlashcards={handleStartFlashcards} />;
        return <FlashcardScreen key="flashcards" flashcards={appState.flashcards} onExit={handleExitFlashcards} />;
      default:
        return <FileUploadScreen key="default" onFileUploaded={handleFileUploaded} />;
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header 
        onRestart={handleRestart} 
        showRestart={appState.status !== AppStatus.INITIAL && appState.status !== AppStatus.CHATTING} 
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="container mx-auto p-4 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;