import React from 'react';
import { QuizConfig } from '../types';
import { AlertTriangleIcon } from './common/icons/AlertTriangleIcon';

interface QuizConfigScreenProps {
  config: QuizConfig;
  onConfigChange: (newConfig: Partial<QuizConfig>) => void;
  onStartQuiz: () => void;
  error: string | null;
}

const QuizConfigScreen: React.FC<QuizConfigScreenProps> = ({ config, onConfigChange, onStartQuiz, error }) => {
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onConfigChange({ [name]: Number(value) });
  };

  const handleStringChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onConfigChange({ [name]: value });
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onConfigChange({ [name]: checked });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-3xl font-extrabold text-on-surface mb-2 text-center">Customize Your Quiz</h2>
      <p className="text-lg text-on-surface-secondary mb-8 text-center">
        Fine-tune the settings to create the perfect learning experience.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertTriangleIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">An Error Occurred</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-surface p-8 rounded-2xl shadow-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <ConfigItem label="Number of Questions" help="Choose between 5 and 150 questions.">
            <div className="flex items-center gap-4">
              <input
                type="range"
                name="numQuestions"
                min="5"
                max="150"
                value={config.numQuestions}
                onChange={handleNumericChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-md">{config.numQuestions}</span>
            </div>
          </ConfigItem>

          <ConfigItem label="Question Variety" help="Choose between standard MCQs or a mix of question types.">
            <select
              name="questionVariety"
              value={config.questionVariety}
              onChange={handleStringChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface"
            >
              <option value="MCQ Only">MCQs Only</option>
              <option value="Varied">Varied (MCQ, T/F, Fill-in-the-blank)</option>
            </select>
          </ConfigItem>
          
          <ConfigItem label="Complexity" help="Set the difficulty of the questions.">
            <select
              name="complexity"
              value={config.complexity}
              onChange={handleStringChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
              <option>Mixed</option>
            </select>
          </ConfigItem>

          <ConfigItem label="AI Tone" help="Define the AI's style for questions and explanations.">
            <select
              name="tone"
              value={config.tone}
              onChange={handleStringChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface"
            >
              <option value="Accurate">Accurate (strict to source)</option>
              <option value="Creative">Creative (engaging phrasing)</option>
              <option value="Expanded">Expanded (uses external knowledge)</option>
            </select>
          </ConfigItem>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ConfigItem label="Timer" help="Set an overall quiz timer or a per-question timer.">
            <div className="flex items-center gap-2">
              <select
                name="timerType"
                value={config.timerType}
                onChange={handleStringChange}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface"
              >
                <option value="overall">Overall</option>
                <option value="per-question">Per Question</option>
              </select>
              <input
                type="number"
                name="time"
                value={config.time}
                onChange={handleNumericChange}
                className="w-24 p-2 border border-gray-300 rounded-lg text-center bg-surface text-on-surface"
                min="1"
              />
              <span>{config.timerType === 'overall' ? 'minutes' : 'seconds'}</span>
            </div>
          </ConfigItem>

          <ConfigItem label="Negative Marking" help="Deduct points for incorrect answers.">
            <div className="flex items-center gap-4">
              <label htmlFor="negativeMarking" className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="negativeMarking"
                  name="negativeMarking"
                  checked={config.negativeMarking}
                  onChange={handleToggleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              {config.negativeMarking && (
                <div className="flex items-center gap-2">
                  <label htmlFor="penalty" className="text-sm">Penalty:</label>
                  <input
                    type="number"
                    id="penalty"
                    name="penalty"
                    value={config.penalty}
                    onChange={handleNumericChange}
                    step="0.05"
                    min="0"
                    className="w-20 p-2 border border-gray-300 rounded-lg text-center bg-surface text-on-surface"
                  />
                </div>
              )}
            </div>
          </ConfigItem>

          <ConfigItem label="Feedback Mode" help="Choose when to see correct answers.">
            <select
              name="feedbackMode"
              value={config.feedbackMode}
              onChange={handleStringChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface text-on-surface"
            >
              <option value="end-of-quiz">End of Quiz</option>
              <option value="instant">Instant</option>
            </select>
          </ConfigItem>
        </div>

        {/* Button */}
        <div className="md:col-span-2 mt-4">
          <button
            onClick={onStartQuiz}
            className="w-full bg-primary text-white font-bold py-4 px-4 rounded-lg hover:bg-primary-dark transition-transform transform hover:scale-105 shadow-lg"
          >
            Generate Quiz & Start
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfigItem: React.FC<{ label: string; help: string; children: React.ReactNode }> = ({ label, help, children }) => (
  <div>
    <label className="block text-md font-semibold text-on-surface mb-1">{label}</label>
    <p className="text-sm text-on-surface-secondary mb-2">{help}</p>
    {children}
  </div>
);

export default QuizConfigScreen;