import React, { useState } from 'react';
import { Campaign, Creative } from '../types';
import Button from './common/Button';
import { editNotificationText } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';

interface Props {
  creative: Creative;
  campaign: Campaign;
  onClose: () => void;
  onSave: (creative: Creative) => void;
  setError: (error: string | null) => void;
}

const NotificationEditorModal: React.FC<Props> = ({ creative, campaign, onClose, onSave, setError }) => {
  const [prompt, setPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null);

  const originalText = creative.notificationText;

  const handleEdit = async () => {
    if (!prompt) return;
    setIsEditing(true);
    setError(null);
    setEditedText(null);
    try {
      const newText = await editNotificationText(
        originalText, 
        prompt, 
        campaign.landingPageUrl,
        campaign.brandGuidelines
      );
      setEditedText(newText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    if (editedText) {
      const newCreative = { ...creative };
      newCreative.notificationText = editedText;
      onSave(newCreative);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Edit Notification Text</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Original</h3>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md text-sm text-slate-700 dark:text-slate-300 min-h-[100px]">
                {originalText}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Edited</h3>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md text-sm text-slate-700 dark:text-slate-300 min-h-[100px] flex items-center justify-center">
                {isEditing ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <SparklesIcon className="h-6 w-6 text-indigo-500 animate-pulse" />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Revising text...</p>
                  </div>
                ) : editedText ? (
                  editedText
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-xs p-4 text-center">Your edited text will appear here.</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Make it more urgent' or 'Add an emoji'"
              className="flex-grow block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 resize-none"
            />
            <Button onClick={handleEdit} isLoading={isEditing} disabled={!prompt}>
              Apply Edit
            </Button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!editedText || isEditing}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationEditorModal;