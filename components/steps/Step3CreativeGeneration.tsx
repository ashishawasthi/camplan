import React, { useState } from 'react';
import { Campaign, Creative } from '../../types';
import { generateImagenImage, generateNotificationText, generateImageFromProduct } from '../../services/geminiService';
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

const timeout = (ms: number, message: string) => new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error(message));
  }, ms);
});

const Step3CreativeGeneration: React.FC<Props> = ({ campaign, setCampaign, onNext, onBack, error, setError }) => {
  const [editingCreative, setEditingCreative] = useState<{ segmentIndex: number; creative: Creative } | null>(null);
  
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
        generateNotificationText(segment.notificationTextPrompt, campaign.landingPageUrl, campaign.brandGuidelines)
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
  
  const handleSaveEdit = (segmentIndex: number, newCreative: Creative) => {
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    newCampaign.audienceSegments[segmentIndex].creative = newCreative;
    setCampaign(newCampaign);
    setEditingCreative(null);
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
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  aria-label={`Select segment ${segment.name}`}
                />
              </div>
              
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-2 relative group w-full flex items-center justify-center transition-all duration-300 aspect-square max-w-xl mx-auto">
                {creative?.isGenerating ? (
                  <div className="flex flex-col items-center">
                    <SparklesIcon className="h-10 w-10 text-indigo-500 animate-pulse" />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Generating creative...</p>
                  </div>
                ) : creative?.imageUrl ? (
                  <>
                    <img
                      src={creative.imageUrl}
                      alt={`Generated creative for ${segment.name}`}
                      className="object-contain max-h-full max-w-full rounded"
                    />
                     <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingCreative({ segmentIndex: index, creative })} className="px-2 py-1 text-xs rounded bg-white/80 text-black hover:bg-white shadow-md">Edit</button>
                    </div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 px-2 py-1 rounded-md text-center text-white/90 text-xs">
                      1024x1024
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <SparklesIcon className="h-10 w-10 text-slate-400 mx-auto" />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No creative yet.</p>
                     <Button variant="secondary" className="mt-4" onClick={() => handleGenerateCreative(index)} isLoading={creative?.isGenerating}>
                       Generate Creative
                    </Button>
                  </div>
                )}
              </div>
              {creative && !creative.isGenerating && creative.notificationText && (
                 <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Push Notification Text</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">"{creative.notificationText}"</p>
                 </div>
              )}
               {creative && !creative.isGenerating && !creative.imageUrl && (
                <div className="text-center mt-4">
                    <Button onClick={() => handleGenerateCreative(index)} isLoading={creative?.isGenerating}>
                        Regenerate Creative
                    </Button>
                </div>
              )}
            </Card>
          )
        })}
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
          onClose={() => setEditingCreative(null)}
          onSave={(newCreative) => handleSaveEdit(editingCreative.segmentIndex, newCreative)}
          setError={setError}
        />
      )}
    </div>
  );
};

export default Step3CreativeGeneration;