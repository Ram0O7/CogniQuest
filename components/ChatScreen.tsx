import React, { useState, useRef, useEffect } from 'react';
import { ChatContext, ChatMessage } from '../types';
import { getChatResponse } from '../services/geminiService';
import { PaperAirplaneIcon } from './common/icons/PaperAirplaneIcon';
import { ArrowLeftIcon } from './common/icons/ArrowLeftIcon';

// To satisfy TypeScript for the CDN-loaded libraries
declare const marked: any;
declare const DOMPurify: any;

interface ChatScreenProps {
  chatContext: ChatContext;
  onExitChat: () => void;
}

const AIMessageContent: React.FC<{ fullText: string; isStreaming: boolean }> = ({ fullText, isStreaming }) => {
  const cleanText = fullText.replace(/\[SUGGESTION\].*/g, '').trim();
  const sanitizedHtml = DOMPurify.sanitize(marked.parse(cleanText));

  return (
    <div className="prose dark:prose-invert max-w-none prose-p:my-2 prose-li:my-1 break-words">
      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
      {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-bottom"></span>}
    </div>
  );
};


const ChatScreen: React.FC<ChatScreenProps> = ({ chatContext, onExitChat }) => {
  const { question, userAnswer, originalContexts } = chatContext;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSocraticMode, setIsSocraticMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      { sender: 'ai', text: `Hi! Let's talk about this question: **"${question.question}"**. You answered "${userAnswer || 'N/A'}". How can I help you understand it better?` }
    ]);
    setSuggestions(['Why was my answer wrong?', 'Explain the correct answer.', 'Give me a similar example.']);
  }, [question, userAnswer]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: textToSend };
    const currentMessages = [...messages, userMessage];
    
    setMessages([...currentMessages, { sender: 'ai', text: '' }]);
    setInput('');
    setSuggestions([]);
    setIsLoading(true);

    try {
      const responseGenerator = getChatResponse(question, userAnswer, currentMessages, originalContexts, isSocraticMode);
      let fullResponse = '';
      for await (const chunk of responseGenerator) {
        fullResponse += chunk;
        setMessages(prev => {
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = { ...updatedMessages[updatedMessages.length - 1], text: fullResponse };
          return updatedMessages;
        });
      }

      const suggestionRegex = /\[SUGGESTION\]\s*(.*)/g;
      const foundSuggestions: string[] = [];
      const matches = [...fullResponse.matchAll(suggestionRegex)];

      if (matches.length > 0) {
        matches.forEach(match => foundSuggestions.push(match[1].trim()));
      }
      setSuggestions(foundSuggestions);

    } catch (error) {
      console.error(error);
      setMessages(prev => {
        const updatedMessages = [...prev];
        updatedMessages[updatedMessages.length - 1].text = "Sorry, I encountered an error. Please try again.";
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  return (
    <div className="w-full h-[calc(100vh-120px)] bg-surface rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col animate-fade-in transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onExitChat} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <ArrowLeftIcon className="w-6 h-6 text-on-surface-secondary" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-on-surface">AI Tutor</h3>
              <p className="text-sm text-on-surface-secondary truncate max-w-md sm:max-w-lg md:max-w-xl">{question.question}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-2">
            <label htmlFor="socratic-toggle" className="text-sm font-medium text-on-surface-secondary cursor-pointer">
              Socratic Mode
            </label>
            <label htmlFor="socratic-toggle" className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="socratic-toggle"
                checked={isSocraticMode}
                onChange={() => setIsSocraticMode(!isSocraticMode)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const isLastMessage = index === messages.length - 1;
              const isStreamingAi = isLastMessage && msg.sender === 'ai' && isLoading;

              return (
              <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">AI</div>}
                <div className={`max-w-xl p-3 rounded-lg shadow-sm ${msg.sender === 'ai' ? 'bg-gray-100 dark:bg-slate-700 text-on-surface' : 'bg-primary text-white'}`}>
                  {msg.sender === 'user' 
                    ? msg.text
                    : <AIMessageContent fullText={msg.text} isStreaming={isStreamingAi} />
                  }
                </div>
              </div>
            )})}
            {isLoading && messages[messages.length-1].sender === 'user' && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">AI</div>
                <div className="max-w-md p-3 rounded-lg bg-gray-100 dark:bg-slate-700 shadow-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-surface rounded-b-2xl transition-colors">
           {suggestions.length > 0 && !isLoading && (
            <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleSuggestionClick(s)}
                            className="px-3 py-1.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-full text-sm hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a follow-up question..."
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface"
              disabled={isLoading}
            />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="bg-primary text-white p-3 rounded-lg disabled:bg-primary/50 transition-colors">
              <PaperAirplaneIcon className="w-6 h-6"/>
            </button>
          </div>
        </div>
    </div>
  );
};

export default ChatScreen;