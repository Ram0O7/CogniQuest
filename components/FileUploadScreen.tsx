import React, { useState, useCallback } from 'react';
import { UploadIcon } from './common/icons/UploadIcon';
import { XMarkIcon } from './common/icons/XMarkIcon';
import { BrainCircuitIcon } from './common/icons/BrainCircuitIcon';


interface FileUploadScreenProps {
  onFileUploaded: (contents: string[]) => void;
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
      (file.type.startsWith('text/') || file.type === 'application/json') &&
      !selectedFiles.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)
    );

    if (newFiles.length !== files.length) {
      setError('Some files were duplicates or not valid text files and were ignored.');
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
        const fileContents = await Promise.all(
          selectedFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = (e) => reject(new Error(`Error reading ${file.name}`));
              reader.readAsText(file);
            });
          })
        );
        onFileUploaded(fileContents);
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
      onFileUploaded([promptContent]);
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

  return (
    <div className="animate-fade-in text-center max-w-2xl mx-auto">
      <h2 className="text-3xl font-extrabold text-on-surface mb-2">Create Your Quiz</h2>
      <p className="text-lg text-on-surface-secondary mb-8">
        {mode === 'upload'
            ? 'Provide one or more text files (TXT, JSON, MD, etc.) to generate a quiz from your content.'
            : 'Describe a topic, subject, or concept, and let AI generate a quiz for you.'
        }
      </p>
      
      <div className="flex justify-center mb-6 border border-gray-200 rounded-lg p-1 bg-gray-100 max-w-sm mx-auto">
        <button
            onClick={() => setMode('upload')}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold transition-colors w-1/2 ${mode === 'upload' ? 'bg-white text-primary shadow' : 'text-on-surface-secondary'}`}
        >
            <UploadIcon className="w-5 h-5" />
            Upload Files
        </button>
        <button
            onClick={() => setMode('prompt')}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold transition-colors w-1/2 ${mode === 'prompt' ? 'bg-white text-primary shadow' : 'text-on-surface-secondary'}`}
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
              isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-surface hover:border-primary'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept=".txt,.json,.md,.csv,text/*"
              multiple
            />
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
              <UploadIcon className={`w-16 h-16 transition-colors ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
              <p className="text-on-surface font-semibold">
                <span className="text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-on-surface-secondary">TXT, JSON, MD, or any text files</p>
            </label>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="mt-8 text-left">
              <h3 className="font-semibold text-lg mb-2">Selected Files:</h3>
              <ul className="bg-surface border border-gray-200 rounded-lg divide-y divide-gray-200">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="px-4 py-3 flex justify-between items-center">
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <button onClick={() => handleRemoveFile(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100">
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
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface"
            aria-label="Quiz topic prompt"
          />
          <div className="mt-4 text-sm text-on-surface-secondary">
            <p>Let AI generate a quiz on any topic you can imagine. Be as specific as you like!</p>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
      
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