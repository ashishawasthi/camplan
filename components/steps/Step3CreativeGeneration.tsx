import React, { useState, useEffect } from 'react';
import { Campaign, Creative } from '../../types';
import { generateImagenImage, generateImageFromProduct } from '../../services/geminiService';
import Button from '../common/Button';
import Card from '../common/Card';
import ImageEditorModal from '../ImageEditorModal';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PencilIcon } from '../icons/PencilIcon';
import RegenerateModal from '../common/RegenerateModal';

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
  const [regenState, setRegenState] = useState<{ segmentIndex: number } | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: { imgIndex: number, notifIndex: number }}>({});

  useEffect(() => {
    const initialOptions: { [key: number]: { imgIndex: number, notifIndex: number }} = {};
    campaign.audienceSegments.forEach((_, index) => {
        initialOptions[index] = { imgIndex: 0, notifIndex: 0 };
    });
    setSelectedOptions(initialOptions);
  }, [campaign.audienceSegments]);
  
  const handleOptionChange = (segmentIndex: number, type: 'imgIndex' | 'notifIndex', value: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      [segmentIndex]: {
        ...(prev[segmentIndex] || { imgIndex: 0, notifIndex: 0 }),
        [type]: value,
      }
    }));
  };
  
  const handleGenerateCreative = async (segmentIndex: number, instructions?: string) => {
    setError(null);
    const segment = campaign.audienceSegments[segmentIndex];
    const imagePrompt = segment.imagePrompts[selectedOptions[segmentIndex]?.imgIndex ?? 0];
    const notificationText = segment.notificationTexts[selectedOptions[segmentIndex]?.notifIndex ?? 0];
    
    // Set loading state
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    const segmentToUpdate = newCampaign.audienceSegments[segmentIndex];
    const existingCreative = segmentToUpdate.creative;
    segmentToUpdate.creative = {
        ...(existingCreative || { id: '', imagePrompt: '', notificationText: '', imageUrl: '', mimeType: ''}),
        isGenerating: true,
    };
    setCampaign(newCampaign);

    try {
      const imageGenerationPromise = campaign.productImage
        ? generateImageFromProduct(campaign.productImage, imagePrompt, instructions)
        : generateImagenImage(imagePrompt, instructions);

      const imageResult = await Promise.race([
          imageGenerationPromise,
          timeout(90000, 'Image generation timed out after 90 seconds. Please try again.')
      ]) as { base64: string; mimeType: string };
      
      const newCreative: Creative = {
        id: new Date().toISOString(),
        imagePrompt,
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
  
  const handleGenerateWithInstructions = (instructions: string) => {
    if (regenState) {
        handleGenerateCreative(regenState.segmentIndex, instructions);
        setRegenState(null);
    }
  };

  const isAnyGenerationInProgress = campaign.audienceSegments.some(s => s.creative?.isGenerating);
  const selectedSegments = campaign.audienceSegments.filter(s => s.isSelected);
  const atLeastOneSelected = selectedSegments.length > 0;
  const canProceed = !isAnyGenerationInProgress && atLeastOneSelected;

  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200 text-center">Ad Creatives</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
        Select your preferred creative direction for each segment, then generate the ad image.
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Prompts */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Image Prompt Options
                    </label>
                    <div className="space-y-2">
                        {segment.imagePrompts?.map((prompt, promptIndex) => (
                            <div key={promptIndex} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedOptions[index]?.imgIndex === promptIndex ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                <label className="flex items-start cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`image-prompt-${index}`}
                                        checked={selectedOptions[index]?.imgIndex === promptIndex}
                                        onChange={() => handleOptionChange(index, 'imgIndex', promptIndex)}
                                        className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="ml-3 text-sm text-slate-600 dark:text-slate-300">{prompt}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notification Texts */}
                <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Push Notification Options
                    </label>
                    <div className="space-y-2">
                        {segment.notificationTexts?.map((text, notifIndex) => (
                            <div key={notifIndex} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedOptions[index]?.notifIndex === notifIndex ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                <label className="flex items-start cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`notification-text-${index}`}
                                        checked={selectedOptions[index]?.notifIndex === notifIndex}
                                        onChange={() => handleOptionChange(index, 'notifIndex', notifIndex)}
                                        className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="ml-3 text-sm text-slate-700 dark:text-slate-200 font-medium">"{text}"</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
              
               <div className="mt-4 flex justify-end">
                    <button 
                        onClick={() => setRegenState({ segmentIndex: index })} 
                        className="inline-flex items-center justify-center p-2 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed no-print shadow-sm"
                        title={creative?.imageUrl ? 'Regenerate creative' : 'Generate creative'}
                        disabled={creative?.isGenerating}
                    >
                         {creative?.isGenerating 
                            ? <div className="animate-spin h-5 w-5 border-2 border-indigo-700/50 border-t-indigo-700 rounded-full" />
                            : <SparklesIcon className="h-5 w-5" />
                        }
                    </button>
                </div>


              {creative?.isGenerating && (
                <div className="mt-4 flex flex-col items-center justify-center p-10 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <SparklesIcon className="h-10 w-10 text-indigo-500 animate-pulse" />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Generating creative...</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">This can take up to 90 seconds.</p>
                </div>
              )}

              {creative && !creative.isGenerating && creative.imageUrl && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 text-center">Image Preview</h4>
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-2 relative group w-full max-w-md mx-auto flex items-center justify-center transition-all duration-300 aspect-square">
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
      
      {regenState && (
        <RegenerateModal
            title="Generate Creative"
            onClose={() => setRegenState(null)}
            onGenerate={handleGenerateWithInstructions}
            isLoading={campaign.audienceSegments[regenState.segmentIndex].creative?.isGenerating || false}
        />
      )}

    </div>
  );
};

export default Step3CreativeGeneration;
