import React, { useState } from 'react';
import { Campaign, Creative } from '../../types';
import { generateImagenImage, generateNotificationText } from '../../services/geminiService';
import Button from '../common/Button';
import Card from '../common/Card';
import ImageEditorModal from '../ImageEditorModal';
import { SparklesIcon } from '../icons/SparklesIcon';

interface Props {
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
  onNext: () => void;
  onBack: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

type PreviewMode = 'desktop' | 'mobile';

const timeout = (ms: number, message: string) => new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error(message));
  }, ms);
});

const Step3CreativeGeneration: React.FC<Props> = ({ campaign, setCampaign, onNext, onBack, error, setError }) => {
  const [editingCreative, setEditingCreative] = useState<{ segmentIndex: number; creative: Creative, imageKey: PreviewMode } | null>(null);
  const [activePreviews, setActivePreviews] = useState<{ [key: number]: PreviewMode }>(
    () => Object.fromEntries(campaign.audienceSegments.map((_, i) => [i, 'desktop']))
  );
  
  const handleGenerateCreative = async (segmentIndex: number) => {
    setError(null);
    const segment = campaign.audienceSegments[segmentIndex];
    
    // Set loading state
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    const segmentToUpdate = newCampaign.audienceSegments[segmentIndex];
    const existingCreative = segmentToUpdate.creative;
    // Provide a full creative object structure for the loading state to avoid type issues
    segmentToUpdate.creative = {
        ...(existingCreative || { id: '', imagePrompt: '', notificationText: '', imageUrls: { mobile: '', desktop: ''}, mimeType: ''}),
        isGenerating: true,
    };
    setCampaign(newCampaign);

    try {
      const generationPromise = Promise.all([
        generateImagenImage(segment.imagePrompt, '16:9'),
        generateImagenImage(segment.imagePrompt, '9:16'),
        generateNotificationText(segment.notificationTextPrompt, campaign.landingPageUrl, campaign.brandGuidelines)
      ]);
      
      const [desktopResult, mobileResult, notificationText] = await Promise.race([
          generationPromise,
          timeout(60000, 'Creative generation timed out after 60 seconds. Please try again.')
      ]) as [{ base64: string; mimeType: string }, { base64: string; mimeType: string }, string];
      
      const newCreative: Creative = {
        id: new Date().toISOString(),
        imagePrompt: segment.imagePrompt,
        notificationText,
        imageUrls: {
          desktop: `data:${desktopResult.mimeType};base64,${desktopResult.base64}`,
          mobile: `data:${mobileResult.mimeType};base64,${mobileResult.base64}`,
        },
        mimeType: desktopResult.mimeType,
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
  
  const handleSaveEdit = (segmentIndex: number, newCreative: Creative) => {
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    newCampaign.audienceSegments[segmentIndex].creative = newCreative;
    setCampaign(newCampaign);
    setEditingCreative(null);
  };
  
  const setActivePreview = (index: number, mode: PreviewMode) => {
    setActivePreviews(prev => ({ ...prev, [index]: mode }));
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
      <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200 text-center">Creative Generation</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">Generate a unique ad visual for each segment, then select the ones to include in your final plan.</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4 max-w-4xl mx-auto" role="alert">
            <strong className="font-bold">An error occurred: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Dismiss error">
                <span className="font-bold text-xl">&times;</span>
            </button>
        </div>
      )}

      <div className="space-y-8">
        {campaign.audienceSegments.map((segment, index) => (
          <Card key={index}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 pr-4">{segment.name}</h3>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <label htmlFor={`segment-${index}-selected`} className="text-sm font-medium text-slate-600 dark:text-slate-400 select-none">Include</label>
                <input
                    id={`segment-${index}-selected`}
                    type="checkbox"
                    checked={segment.isSelected ?? true}
                    onChange={() => handleToggleSegment(index)}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    aria-label={`Include segment ${segment.name} in campaign`}
                />
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4 italic">Image Prompt: "{segment.imagePrompt}"</p>
            
            <div className="w-full aspect-video bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-600 relative">
              {segment.creative?.isGenerating ? (
                 <div className="flex flex-col items-center">
                    <SparklesIcon className="h-8 w-8 text-indigo-500 animate-pulse" />
                    <p className="mt-2 text-sm text-slate-500">Generating creatives...</p>
                 </div>
              ) : segment.creative?.imageUrls ? (
                <>
                  <img src={segment.creative.imageUrls[activePreviews[index]]} alt={`${segment.name} - ${activePreviews[index]} preview`} className="object-contain h-full w-full rounded-md" />
                  <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md flex gap-1">
                    <button onClick={() => setActivePreview(index, 'desktop')} className={`px-2 py-1 text-xs rounded ${activePreviews[index] === 'desktop' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-black'}`}>Desktop</button>
                    <button onClick={() => setActivePreview(index, 'mobile')} className={`px-2 py-1 text-xs rounded ${activePreviews[index] === 'mobile' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-black'}`}>Mobile</button>
                  </div>
                </>
              ) : (
                <Button 
                  onClick={() => handleGenerateCreative(index)}
                  isLoading={segment.creative?.isGenerating}
                  variant="secondary"
                >
                  <SparklesIcon className="mr-2 h-5 w-5" />
                  Generate Creatives
                </Button>
              )}
            </div>

            {segment.creative?.notificationText && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Push Notification Text</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">"{segment.creative.notificationText}"</p>
                </div>
            )}


            {segment.creative?.imageUrls && !segment.creative.isGenerating && (
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => handleGenerateCreative(index)}>Regenerate All</Button>
                <Button variant="secondary" onClick={() => setEditingCreative({ segmentIndex: index, creative: segment.creative!, imageKey: activePreviews[index] })}>Edit {activePreviews[index]} Image</Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNextWithSelection} disabled={!canProceed}>
          Allocate Budget
        </Button>
      </div>

      {editingCreative && (
        <ImageEditorModal
          creative={editingCreative.creative}
          imageKey={editingCreative.imageKey}
          onClose={() => setEditingCreative(null)}
          onSave={(newCreative) => handleSaveEdit(editingCreative.segmentIndex, newCreative)}
          setError={setError}
        />
      )}
    </div>
  );
};

export default Step3CreativeGeneration;
