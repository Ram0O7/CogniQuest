
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStatus, QuizConfig, Question, ConfidenceLevel, Flashcard, QuizHistoryItem, SourceMaterial } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import FileUploadScreen from './components/FileUploadScreen';
import QuizConfigScreen from './components/QuizConfigScreen';
import LoadingScreen from './components/LoadingScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import ChatScreen from './components/ChatScreen';
import FlashcardScreen from './components/FlashcardScreen';
import DashboardScreen from './components/DashboardScreen';
import { generateQuiz, generateHint, generatePerformanceSummary, generateFlashcards } from './services/geminiService';
import { saveSession, getSession, saveQuizHistory, updateQuizHistory, clearSession } from './services/db';
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
    status: AppStatus.INITIAL, // Will be overridden by DB check
    sourceMaterials: null,
    quizConfig: initialConfig,
    quizTitle: null,
    currentHistoryId: undefined,
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
    isReviewingHistory: false,
};

const App: React.FC = () => {
  // Theme State (Preference, can stay in LocalStorage)
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  
  // App State
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const appStateRef = useRef(appState);

  // Update ref whenever state changes for use in unmount/effects if needed
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // --- Theme Effect ---
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

  // --- IndexedDB Initialization ---
  useEffect(() => {
    const initSession = async () => {
        const storedSession = await getSession();
        if (storedSession && storedSession.sourceMaterials) { // Basic validation for new schema
            setAppState(storedSession);
        } else {
            // If no active session or old schema, go to Dashboard
            setAppState(prev => ({ ...prev, status: AppStatus.DASHBOARD }));
        }
        setIsDbLoaded(true);
    };
    initSession();
  }, []);

  // --- Save Session Logic ---
  // Save to DB whenever key state changes, but debounce slightly or check for critical changes
  useEffect(() => {
    if (!isDbLoaded) return;
    saveSession(appState);
  }, [appState, isDbLoaded]);


  // --- History Logic ---
  const saveToHistory = useCallback(async () => {
    const { quizData, userAnswers, userConfidence, quizConfig, sourceMaterials, performanceSummary, quizTitle, currentHistoryId } = appStateRef.current;
    
    if (!quizData || appStateRef.current.isReviewingHistory) return;

    // Calculate score for summary
    let correctCount = 0;
    quizData.forEach((q, i) => {
        if (q.type === 'Fill-in-the-Blank') {
            if (userAnswers[i]?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) correctCount++;
        } else {
            if (userAnswers[i] === q.correctAnswer) correctCount++;
        }
    });

    // Derive a Topic Name if quizTitle is missing for some reason
    let topic = quizTitle || "Generated Quiz";
    if (!quizTitle && sourceMaterials && sourceMaterials.length > 0) {
        if (sourceMaterials[0].fileName && sourceMaterials[0].fileName !== 'User Prompt') {
             topic = sourceMaterials[0].fileName;
             if (sourceMaterials.length > 1) topic += ` + ${sourceMaterials.length - 1} more`;
        } else if (sourceMaterials[0].type === 'text') {
             topic = sourceMaterials[0].content.split('\n')[0].substring(0, 50);
        }
    }

    const historyItem: Omit<QuizHistoryItem, 'id'> = {
        timestamp: Date.now(),
        topic: topic,
        score: correctCount, // Raw score
        totalQuestions: quizData.length,
        quizData,
        userAnswers,
        userConfidence,
        quizConfig,
        sourceMaterials,
        performanceSummary
    };

    if (currentHistoryId) {
        // Update existing record (overwrite logic)
        await updateQuizHistory(currentHistoryId, historyItem);
    } else {
        // Create new record and track its ID
        const newId = await saveQuizHistory(historyItem);
        setAppState(prev => ({ ...prev, currentHistoryId: newId }));
    }

  }, []); // Dependencies accessed via ref


  // --- Event Handlers ---

  const handleGoToDashboard = useCallback(() => {
      if (appState.status === AppStatus.IN_PROGRESS) {
          if(!window.confirm("You are currently taking a quiz. Leaving now will save your progress but pausing the timer. Continue?")) {
              return;
          }
      }
      setAppState(prev => ({ ...prev, status: AppStatus.DASHBOARD }));
  }, [appState.status]);

  const handleStartNewConfig = () => {
      setAppState({
          ...initialAppState,
          status: AppStatus.INITIAL
      });
  };

  const handleReviewHistory = (item: QuizHistoryItem) => {
      setAppState({
          ...initialAppState,
          status: AppStatus.COMPLETED,
          quizData: item.quizData,
          userAnswers: item.userAnswers,
          userConfidence: item.userConfidence,
          quizConfig: item.quizConfig,
          sourceMaterials: item.sourceMaterials,
          quizTitle: item.topic,
          currentHistoryId: item.id, // IMPORTANT: Set ID so retakes update this record
          performanceSummary: item.performanceSummary,
          startTime: item.timestamp, // approximate
          endTime: item.timestamp,
          isReviewingHistory: true, // Read-only mode flag for initial view
      });
  };

  const handleFileUploaded = (materials: SourceMaterial[]) => {
    setAppState(prev => ({ ...prev, status: AppStatus.CONFIGURING, sourceMaterials: materials, error: null, currentHistoryId: undefined, quizTitle: null }));
  };

  const handleConfigChange = (newConfig: Partial<QuizConfig>) => {
    setAppState(prev => ({
      ...prev,
      quizConfig: { ...prev.quizConfig, ...newConfig },
    }));
  };

  const handleStartQuiz = async () => {
    if (!appState.sourceMaterials || appState.sourceMaterials.length === 0) return;
    setAppState(prev => ({ ...prev, status: AppStatus.GENERATING, error: null }));
    try {
      const { title, questions } = await generateQuiz(appState.sourceMaterials, appState.quizConfig);
      if (questions && questions.length > 0) {
        setAppState(prev => ({
          ...prev,
          status: AppStatus.IN_PROGRESS,
          quizTitle: title,
          quizData: questions,
          startTime: Date.now(),
          userAnswers: {},
          userConfidence: {},
          currentQuestionIndex: 0,
          hints: {},
          loadingHints: {},
          performanceSummary: null,
          isGeneratingSummary: false,
          isReviewingHistory: false,
          currentHistoryId: undefined // New quiz means new history ID (until saved)
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
    if (!appState.sourceMaterials || !appState.quizData) return;
    
    setAppState(prev => ({
      ...prev,
      loadingHints: { ...prev.loadingHints, [questionIndex]: true },
    }));

    try {
      const question = appState.quizData[questionIndex];
      const hint = await generateHint(appState.sourceMaterials, question);
      if (hint) {
        setAppState(prev => ({
          ...prev,
          hints: { ...prev.hints, [questionIndex]: hint },
        }));
      }
    } catch (error) {
      console.error("Failed to generate hint:", error);
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
    // Trigger save to history immediately after state update
    setTimeout(saveToHistory, 100);
  }, [saveToHistory]);

  const handleGenerateSummary = useCallback(() => {
      if (appState.status === AppStatus.COMPLETED) {
          setAppState(prev => ({...prev, isGeneratingSummary: true }));
      }
  }, [appState.status]);

  // Restarting means configuring a new quiz with SAME content
  const handleRestart = () => {
    setAppState(prev => ({
        ...initialAppState,
        status: AppStatus.CONFIGURING,
        sourceMaterials: prev.sourceMaterials, // Keep files
        currentHistoryId: undefined, // New quiz generation -> New history ID
    }));
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
      isReviewingHistory: false, // New attempt
      // IMPORTANT: Keep prev.currentHistoryId so we overwrite the existing record
    }));
  }, []);

  const handleStartChat = useCallback((question: Question) => {
    if (!appState.quizData || !appState.sourceMaterials) return;
    const userAnswer = appState.userAnswers[appState.quizData.findIndex(q => q.question === question.question)];
    setAppState(prev => ({
      ...prev,
      status: AppStatus.CHATTING,
      chatContext: {
        question,
        userAnswer,
        sourceMaterials: prev.sourceMaterials!,
      }
    }));
  }, [appState.sourceMaterials, appState.quizData, appState.userAnswers]);

  const handleExitChat = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      status: AppStatus.COMPLETED,
      chatContext: null,
    }));
  }, []);

  const handleStartFlashcards = async () => {
    const { quizData, userAnswers, sourceMaterials } = appState;
    if (!quizData || !sourceMaterials) return;

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
      
      const generatedFlashcards = await generateFlashcards(incorrectQuestions, sourceMaterials);
      
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
    if (!isDbLoaded) return <LoadingScreen text="Loading your session..." />;

    switch (appState.status) {
      case AppStatus.DASHBOARD:
        return <DashboardScreen onStartNew={handleStartNewConfig} onReview={handleReviewHistory} />;
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
        return <ResultsScreen key="completed" appState={appState} onRestart={handleStartNewConfig} onRetake={handleRetakeQuiz} onStartChat={handleStartChat} onGenerateSummary={handleGenerateSummary} onStartFlashcards={handleStartFlashcards} />;
      case AppStatus.CHATTING:
        if (!appState.chatContext) return <ResultsScreen key="chat-fallback" appState={appState} onRestart={handleStartNewConfig} onRetake={handleRetakeQuiz} onStartChat={handleStartChat} onGenerateSummary={handleGenerateSummary} onStartFlashcards={handleStartFlashcards} />;
        return <ChatScreen key="chatting" chatContext={appState.chatContext} onExitChat={handleExitChat} />;
      case AppStatus.FLASHCARDS:
        if (!appState.flashcards) return <ResultsScreen key="flashcard-fallback" appState={appState} onRestart={handleStartNewConfig} onRetake={handleRetakeQuiz} onStartChat={handleStartChat} onGenerateSummary={handleGenerateSummary} onStartFlashcards={handleStartFlashcards} />;
        return <FlashcardScreen key="flashcards" flashcards={appState.flashcards} onExit={handleExitFlashcards} />;
      default:
        return <DashboardScreen onStartNew={handleStartNewConfig} onReview={handleReviewHistory} />;
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header 
        onRestart={handleStartNewConfig} 
        onGoHome={handleGoToDashboard}
        showRestart={appState.status !== AppStatus.INITIAL && appState.status !== AppStatus.DASHBOARD && appState.status !== AppStatus.CHATTING} 
        appStatus={appState.status}
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
