import React, { useState } from 'react';
import { Creative } from '../types';
import Button from './common/Button';
import { editImage } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';

type PreviewMode = 'desktop' | 'mobile';
interface Props {
  creative: Creative;
  imageKey: PreviewMode;
  onClose: () => void;
  onSave: (creative: Creative) => void;
  setError: (error: string | null) => void;
}

const ImageEditorModal: React.FC<Props> = ({ creative, imageKey, onClose, onSave, setError }) => {
  const [prompt, setPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [editedMimeType, setEditedMimeType] = useState<string | null>(null);

  const originalImageUrl = creative.imageUrls[imageKey];

  const handleEdit = async () => {
    if (!prompt) return;
    setIsEditing(true);
    setError(null);
    setEditedImageUrl(null);
    try {
      const base64Data = originalImageUrl.split(',')[1];
      const { base64, mimeType } = await editImage(base64Data, creative.mimeType, prompt);
      setEditedImageUrl(`data:${mimeType};base64,${base64}`);
      setEditedMimeType(mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    if (editedImageUrl && editedMimeType) {
      const newCreative = { ...creative, imageUrls: { ...creative.imageUrls } };
      newCreative.imageUrls[imageKey] = editedImageUrl;
      newCreative.mimeType = editedMimeType; // Assuming mime type could change
      newCreative.imagePrompt = `${creative.imagePrompt} (Edited [${imageKey}]: ${prompt})`;
      onSave(newCreative);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Edit {imageKey.charAt(0).toUpperCase() + imageKey.slice(1)} Image</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Original</h3>
              <img src={originalImageUrl} alt="Original Creative" className="w-full rounded-lg" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Edited</h3>
              <div className="w-full aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                {isEditing ? (
                  <div className="flex flex-col items-center">
                    <SparklesIcon className="h-8 w-8 text-indigo-500 animate-pulse" />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Applying edit...</p>
                  </div>
                ) : editedImageUrl ? (
                  <img src={editedImageUrl} alt="Edited Creative" className="w-full rounded-lg" />
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm p-4 text-center">Your edited image will appear here.</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Add a retro filter' or 'Make the background a cityscape'"
              className="flex-grow block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 resize-none"
            />
            <Button onClick={handleEdit} isLoading={isEditing} disabled={!prompt}>
              Apply Edit
            </Button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!editedImageUrl || isEditing}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;