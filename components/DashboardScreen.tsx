
import React, { useEffect, useState } from 'react';
import { QuizHistoryItem } from '../types';
import { getQuizHistory, deleteQuizHistory, updateQuizHistory } from '../services/db';
import { BrainCircuitIcon } from './common/icons/BrainCircuitIcon';
import { BookOpenIcon } from './common/icons/BookOpenIcon';

interface DashboardScreenProps {
  onStartNew: () => void;
  onReview: (historyItem: QuizHistoryItem) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onStartNew, onReview }) => {
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getQuizHistory();
      setHistory(data);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this quiz result?")) {
      await deleteQuizHistory(id);
      loadHistory();
    }
  };
  
  const handleEditClick = (e: React.MouseEvent, item: QuizHistoryItem) => {
    e.stopPropagation();
    setEditingId(item.id!);
    setEditTitle(item.topic);
  };

  const handleSaveTitle = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (editTitle.trim()) {
        await updateQuizHistory(id, { topic: editTitle.trim() });
        setEditingId(null);
        loadHistory();
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-on-surface mb-2">Dashboard</h1>
          <p className="text-on-surface-secondary text-lg">Your learning journey at a glance.</p>
        </div>
        <button
          onClick={onStartNew}
          className="flex items-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-primary-dark transition-all transform hover:scale-105 shadow-lg w-full md:w-auto justify-center"
        >
          <BrainCircuitIcon className="w-5 h-5" />
          Create New Quiz
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <BookOpenIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-on-surface mb-2">No quizzes taken yet</h3>
          <p className="text-on-surface-secondary mb-6">Upload a file or describe a topic to get started!</p>
          <button
            onClick={onStartNew}
            className="text-primary font-bold hover:underline"
          >
            Start your first quiz &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => {
            const percentage = Math.round((item.score / item.totalQuestions) * 100);
            return (
              <div 
                key={item.id}
                onClick={() => onReview(item)}
                className="bg-surface rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group relative flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    percentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    percentage >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {percentage}% Score
                  </span>
                  <span className="text-xs text-on-surface-secondary font-medium">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
                
                {editingId === item.id ? (
                    <div className="mb-2 z-20" onClick={(e) => e.stopPropagation()}>
                        <input 
                            type="text" 
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full p-1 border rounded text-sm mb-1 bg-white dark:bg-slate-800 text-on-surface"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button onClick={(e) => handleSaveTitle(e, item.id!)} className="px-2 py-1 bg-green-500 text-white text-xs rounded">Save</button>
                            <button onClick={handleCancelEdit} className="px-2 py-1 bg-gray-400 text-white text-xs rounded">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <h3 className="text-lg font-bold text-on-surface mb-2 line-clamp-2 min-h-[3.5rem] group/title relative" title={item.topic}>
                      {item.topic}
                      <button 
                        onClick={(e) => handleEditClick(e, item)}
                        className="absolute top-0 right-0 p-1 text-gray-400 hover:text-primary opacity-0 group-hover/title:opacity-100 transition-opacity"
                        title="Edit Title"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                         </svg>
                      </button>
                    </h3>
                )}
                
                <div className="flex items-center text-sm text-on-surface-secondary mb-6">
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs mr-2">{item.quizConfig.complexity}</span>
                  <span>{item.totalQuestions} Questions</span>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-primary font-bold text-sm group-hover:underline">Review Results &rarr;</span>
                    <button
                        onClick={(e) => item.id !== undefined && handleDelete(e, item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors z-20 relative"
                        title="Delete Result"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardScreen;
