import React, { useState } from 'react';
import Button from './Button';

interface Props {
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (newValue: string) => void;
  rows?: number;
}

const TextEditorModal: React.FC<Props> = ({ title, initialValue, onClose, onSave, rows = 8 }) => {
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 no-print">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
          </div>
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full block p-2.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 resize-y"
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

export default TextEditorModal;
