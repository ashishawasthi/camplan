import React, { useState } from 'react';
import { Campaign, Creative } from '../../types';
import { generateImagenImage, generateNotificationText, generateImageFromProduct } from '../../services/geminiService';
import Button from '../common/Button';
import Card from '../common/Card';
import ImageEditorModal from '../ImageEditorModal';
import NotificationEditorModal from '../NotificationEditorModal';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PencilIcon } from '../icons/PencilIcon';

interface Props {
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
  onNext: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const timeout = (ms: number, message: string) => new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error(message));
  }, ms);
});

const Step3CreativeGeneration: React.FC<Props> = ({ campaign, setCampaign, onNext, error, setError }) => {
  const [editingCreative, setEditingCreative] = useState<{ segmentIndex: number; creative: Creative } | null>(null);
  const [editingNotification, setEditingNotification] = useState<{ segmentIndex: number; creative: Creative } | null>(null);
  
  const handleGenerateCreative = async (segmentIndex: number) => {
    setError(null);
    const segment = campaign.audienceSegments[segmentIndex];
    
    // Set loading state
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    const segmentToUpdate = newCampaign.audienceSegments[segmentIndex];
    const existingCreative = segmentToUpdate.creative;
    // Provide a full creative object structure for the loading state to avoid type issues
    segmentToUpdate.creative = {
        ...(existingCreative || { id: '', imagePrompt: '', notificationText: '', imageUrl: '', mimeType: ''}),
        isGenerating: true,
    };
    setCampaign(newCampaign);

    try {
      const imageGenerationPromise = campaign.productImage
        ? generateImageFromProduct(campaign.productImage, segment.imagePrompt)
        : generateImagenImage(segment.imagePrompt);

      const generationPromise = Promise.all([
        imageGenerationPromise,
        generateNotificationText(segment.notificationTextPrompt, campaign.landingPageUrl, campaign.brandValues)
      ]);
      
      const [imageResult, notificationText] = await Promise.race([
          generationPromise,
          timeout(90000, 'Creative generation timed out after 90 seconds. Please try again.')
      ]) as [{ base64: string; mimeType: string }, string];
      
      const newCreative: Creative = {
        id: new Date().toISOString(),
        imagePrompt: segment.imagePrompt,
        notificationText,
        imageUrl: `data:${imageResult.mimeType};base64,${imageResult.base64}`,
        mimeType: imageResult.mimeType,
        isGenerating: false,
      };
      
      const finalCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
      finalCampaign.audienceSegments[segmentIndex] = { ...segment, creative: newCreative };
      setCampaign(finalCampaign);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      const finalCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
      finalCampaign.audienceSegments[segmentIndex] = { ...segment, creative: undefined };
      setCampaign(finalCampaign);
    }
  };
  
  const handleImagePromptChange = (segmentIndex: number, newPrompt: string) => {
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    const segmentToUpdate = newCampaign.audienceSegments[segmentIndex];
    segmentToUpdate.imagePrompt = newPrompt;
    setCampaign(newCampaign);
  };

  const handleSaveEdit = (segmentIndex: number, newCreative: Creative) => {
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    newCampaign.audienceSegments[segmentIndex].creative = newCreative;
    setCampaign(newCampaign);
    setEditingCreative(null);
  };
  
  const handleSaveNotificationEdit = (segmentIndex: number, newCreative: Creative) => {
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    newCampaign.audienceSegments[segmentIndex].creative = newCreative;
    setCampaign(newCampaign);
    setEditingNotification(null);
  };

  const handleToggleSegment = (index: number) => {
    const newSegments = [...campaign.audienceSegments];
    const segment = newSegments[index];
    segment.isSelected = !segment.isSelected; 
    setCampaign({ ...campaign, audienceSegments: newSegments });
  };
  
  const handleNextWithSelection = () => {
    const selectedSegments = campaign.audienceSegments.filter(s => s.isSelected);
    setCampaign({ ...campaign, audienceSegments: selectedSegments });
    onNext();
  };

  const isAnyGenerationInProgress = campaign.audienceSegments.some(s => s.creative?.isGenerating);
  const selectedSegments = campaign.audienceSegments.filter(s => s.isSelected);
  const allSelectedHaveCreatives = selectedSegments.every(s => s.creative && !s.creative.isGenerating);
  const atLeastOneSelected = selectedSegments.length > 0;
  const canProceed = !isAnyGenerationInProgress && atLeastOneSelected && allSelectedHaveCreatives;

  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200 text-center">Generate Ad Creatives</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
        For each selected segment, generate a unique ad creative. You can then edit the images if needed.
      </p>

      {error && (
        <Card className="text-center p-8 max-w-md mx-auto mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mt-4">Creative Generation Failed</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">{error}</p>
        </Card>
      )}

      <div className="space-y-8">
        {campaign.audienceSegments.map((segment, index) => {
          const creative = segment.creative;
          
          return (
            <Card key={index} className="flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{segment.name}</h3>
                </div>
                <input
                  type="checkbox"
                  checked={segment.isSelected ?? false}
                  onChange={() => handleToggleSegment(index)}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer no-print"
                  aria-label={`Select segment ${segment.name}`}
                />
              </div>

              <div className="mt-4">
                <label htmlFor={`image-prompt-${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Image Prompt
                </label>
                <div className="relative mt-1">
                  <textarea
                    id={`image-prompt-${index}`}
                    rows={5}
                    value={segment.imagePrompt}
                    onChange={(e) => handleImagePromptChange(index, e.target.value)}
                    className="w-full block p-2.5 pr-32 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 dark:border-slate-600 resize-y"
                    aria-label={`Image prompt for ${segment.name}`}
                  />
                  <div className="absolute bottom-2.5 right-2.5">
                    <Button 
                        variant="secondary" 
                        onClick={() => handleGenerateCreative(index)} 
                        isLoading={creative?.isGenerating}
                        className="!py-1.5 !px-3"
                        aria-label={creative?.imageUrl ? 'Regenerate creative' : 'Generate creative'}
                    >
                        <SparklesIcon className="h-4 w-4 mr-1.5" />
                        {creative?.imageUrl ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>
                </div>
              </div>

              {creative?.isGenerating && (
                <div className="mt-4 flex flex-col items-center justify-center p-10 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <SparklesIcon className="h-10 w-10 text-indigo-500 animate-pulse" />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Generating creative...</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">This can take up to 90 seconds.</p>
                </div>
              )}

              {creative && !creative.isGenerating && creative.imageUrl && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-2 relative group w-full flex items-center justify-center transition-all duration-300 aspect-square">
                      <img
                        src={creative.imageUrl}
                        alt={`Generated creative for ${segment.name}`}
                        className="object-contain max-h-full max-w-full rounded"
                      />
                       <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                          <button onClick={() => setEditingCreative({ segmentIndex: index, creative })} className="p-1.5 rounded bg-white/80 text-black hover:bg-white shadow-md">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                      </div>
                    </div>
                    
                   <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 h-full">
                      <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Push Notification Text</h4>
                          <button onClick={() => setEditingNotification({ segmentIndex: index, creative })} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors no-print">
                              <PencilIcon className="h-4 w-4" />
                          </button>
                      </div>
                      <p 
                        className="w-full text-sm text-slate-600 dark:text-slate-300 bg-transparent p-0"
                        aria-label={`Notification text for ${segment.name}`}
                      >
                        {creative.notificationText}
                      </p>
                   </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleNextWithSelection} disabled={!canProceed}>
          Allocate Budget
        </Button>
      </div>
      
      {editingCreative && (
        <ImageEditorModal
          creative={editingCreative.creative}
          onClose={() => setEditingCreative(null)}
          onSave={(newCreative) => handleSaveEdit(editingCreative.segmentIndex, newCreative)}
          setError={setError}
        />
      )}

      {editingNotification && (
        <NotificationEditorModal
          creative={editingNotification.creative}
          campaign={campaign}
          onClose={() => setEditingNotification(null)}
          onSave={(newCreative) => handleSaveNotificationEdit(editingNotification.segmentIndex, newCreative)}
          setError={setError}
        />
      )}
    </div>
  );
};

export default Step3CreativeGeneration;