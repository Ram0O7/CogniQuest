
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './common/icons/UploadIcon';
import { XMarkIcon } from './common/icons/XMarkIcon';
import { BrainCircuitIcon } from './common/icons/BrainCircuitIcon';
import { extractTextFromPdf } from '../utils/pdfUtils';
import { SourceMaterial } from '../types';


interface FileUploadScreenProps {
  onFileUploaded: (materials: SourceMaterial[]) => void;
}

const FileUploadScreen: React.FC<FileUploadScreenProps> = ({ onFileUploaded }) => {
  const [mode, setMode] = useState<'upload' | 'prompt'>('upload');
  const [prompt, setPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addFiles = useCallback((files: FileList) => {
    setError(null);
    const newFiles = Array.from(files).filter(file => 
      (file.type.startsWith('text/') || 
       file.type === 'application/json' || 
       file.type === 'application/pdf' ||
       file.type.startsWith('image/')) &&
      !selectedFiles.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)
    );

    if (newFiles.length !== files.length) {
      setError('Some files were duplicates or not supported (Text, PDF, Images only).');
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [selectedFiles]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = ''; // Reset input to allow re-uploading the same file
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleCreateQuiz = async () => {
    setError(null);
    setIsProcessing(true);

    if (mode === 'upload') {
      if (selectedFiles.length === 0) {
        setError("Please select at least one file.");
        setIsProcessing(false);
        return;
      }
      try {
        const materials: SourceMaterial[] = await Promise.all(
          selectedFiles.map(async (file) => {
            if (file.type === 'application/pdf') {
              const text = await extractTextFromPdf(file);
              return { type: 'text', content: text, fileName: file.name };
            } else if (file.type.startsWith('image/')) {
              return new Promise<SourceMaterial>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const result = e.target?.result as string;
                  // Strip the Data URL prefix to get raw Base64
                  const base64Content = result.split(',')[1]; 
                  resolve({
                    type: 'image',
                    content: base64Content,
                    mimeType: file.type,
                    fileName: file.name
                  });
                };
                reader.onerror = () => reject(new Error(`Error reading image ${file.name}`));
                reader.readAsDataURL(file);
              });
            } else {
              return new Promise<SourceMaterial>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({
                    type: 'text',
                    content: e.target?.result as string,
                    fileName: file.name
                });
                reader.onerror = (e) => reject(new Error(`Error reading ${file.name}`));
                reader.readAsText(file);
              });
            }
          })
        );
        onFileUploaded(materials);
      } catch (err: any) {
        setError(err.message);
        setIsProcessing(false);
      }
    } else { // mode === 'prompt'
      if (prompt.trim().length === 0) {
        setError("Please enter a topic or concept.");
        setIsProcessing(false);
        return;
      }
      // The content passed is a specific instruction for the AI
      const promptContent = `Generate a quiz based on the following topic: "${prompt}".`;
      onFileUploaded([{ type: 'text', content: promptContent, fileName: 'User Prompt' }]);
    }
  };

  const isButtonDisabled = isProcessing || (mode === 'upload' && selectedFiles.length === 0) || (mode === 'prompt' && prompt.trim().length === 0);

  const getButtonText = () => {
    if (isProcessing) return mode === 'upload' ? 'Processing Files...' : 'Generating...';
    if (mode === 'upload') {
        return selectedFiles.length > 0 ? `Create Quiz from ${selectedFiles.length} File(s)` : 'Select Files to Start';
    }
    return 'Create Quiz from Prompt';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
    if (file.type === 'application/pdf') return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
    );
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    );
  };

  return (
    <div className="animate-fade-in text-center max-w-2xl mx-auto">
      <h2 className="text-3xl font-extrabold text-on-surface mb-2">Create Your Quiz</h2>
      <p className="text-lg text-on-surface-secondary mb-8">
        {mode === 'upload'
            ? 'Provide files (PDF, Text, Images) to generate a quiz from your content.'
            : 'Describe a topic, subject, or concept, and let AI generate a quiz for you.'
        }
      </p>
      
      <div className="flex justify-center mb-6 border border-gray-200 dark:border-gray-600 rounded-lg p-1 bg-gray-100 dark:bg-slate-800 max-w-sm mx-auto transition-colors">
        <button
            onClick={() => setMode('upload')}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold transition-colors w-1/2 ${mode === 'upload' ? 'bg-surface text-primary shadow' : 'text-on-surface-secondary'}`}
        >
            <UploadIcon className="w-5 h-5" />
            Upload Files
        </button>
        <button
            onClick={() => setMode('prompt')}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold transition-colors w-1/2 ${mode === 'prompt' ? 'bg-surface text-primary shadow' : 'text-on-surface-secondary'}`}
        >
            <BrainCircuitIcon className="w-5 h-5" />
            Use Prompt
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="animate-fade-in">
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 transition-colors duration-300 ${
              isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-600 bg-surface hover:border-primary dark:hover:border-primary'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept=".pdf,.txt,.json,.md,.csv,image/png,image/jpeg,image/webp,image/heic,text/*"
              multiple
            />
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
              <UploadIcon className={`w-16 h-16 transition-colors ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
              <p className="text-on-surface font-semibold">
                <span className="text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-on-surface-secondary">PDFs, Text Docs, or Images (Diagrams/Charts)</p>
            </label>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="mt-8 text-left">
              <h3 className="font-semibold text-lg mb-2 text-on-surface">Selected Files:</h3>
              <ul className="bg-surface border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {getFileIcon(file)}
                        <span className="text-sm font-medium truncate text-on-surface">{file.name}</span>
                    </div>
                    <button onClick={() => handleRemoveFile(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'The basics of photosynthesis', 'Key events of World War II', 'JavaScript promises'"
            className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface"
            aria-label="Quiz topic prompt"
          />
          <div className="mt-4 text-sm text-on-surface-secondary">
            <p>Let AI generate a quiz on any topic you can imagine. Be as specific as you like!</p>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 p-3 rounded-lg">{error}</p>}
      
      <div className="mt-8">
        <button
          onClick={handleCreateQuiz}
          disabled={isButtonDisabled}
          className="w-full bg-primary text-white font-bold py-4 px-4 rounded-lg hover:bg-primary-dark transition-transform transform hover:scale-105 shadow-lg disabled:bg-primary/50 disabled:cursor-not-allowed"
        >
          {getButtonText()}
        </button>
      </div>

    </div>
  );
};

export default FileUploadScreen;
