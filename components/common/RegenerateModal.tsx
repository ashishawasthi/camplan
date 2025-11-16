import React, { useState } from 'react';
import Button from './Button';
import { SparklesIcon } from '../icons/SparklesIcon';

interface Props {
  title: string;
  onClose: () => void;
  onGenerate: (instructions: string) => void;
  isLoading: boolean;
}

const RegenerateModal: React.FC<Props> = ({ title, onClose, onGenerate, isLoading }) => {
  const [instructions, setInstructions] = useState('');

  const handleGenerate = () => {
    onGenerate(instructions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 no-print">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
          </div>
          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Additional Instructions (Optional)
            </label>
            <textarea
              id="instructions"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., 'Make it more professional' or 'Focus on young families'"
              className="mt-1 w-full block p-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 resize-y"
            />
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGenerate} isLoading={isLoading}>
            <SparklesIcon className="h-4 w-4 mr-1.5" />
            {isLoading ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegenerateModal;
