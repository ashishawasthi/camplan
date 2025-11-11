
import React, { useState } from 'react';
import { Campaign, Creative } from '../../types';
import { generateImage } from '../../services/geminiService';
import Button from '../common/Button';
import Card from '../common/Card';
import ImageEditorModal from '../ImageEditorModal';
import { SparklesIcon } from '../icons/SparklesIcon';

interface Props {
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
  onNext: () => void;
  onBack: () => void;
  setError: (error: string | null) => void;
}

const Step3CreativeGeneration: React.FC<Props> = ({ campaign, setCampaign, onNext, onBack, setError }) => {
  const [editingCreative, setEditingCreative] = useState<{ segmentIndex: number; creative: Creative } | null>(null);

  const handleGenerateImage = async (segmentIndex: number) => {
    setError(null);
    const segment = campaign.audienceSegments[segmentIndex];
    
    // Set loading state
    const newCampaign = { ...campaign, audienceSegments: [...campaign.audienceSegments] };
    newCampaign.audienceSegments[segmentIndex] = { ...segment, creative: { ...segment.creative, isGenerating: true } as Creative };
    setCampaign(newCampaign);

    try {
      const { base64, mimeType } = await generateImage(segment.imagePrompt);
      const newCreative: Creative = {
        id: new Date().toISOString(),
        prompt: segment.imagePrompt,
        imageUrl: `data:${mimeType};base64,${base64}`,
        mimeType,
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

  const allCreativesGenerated = campaign.audienceSegments.every(s => s.creative && !s.creative.isGenerating);

  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-slate-800 text-center">Creative Generation</h2>
      <p className="text-sm text-slate-500 mb-6 text-center">Let's generate a unique ad visual for each audience segment.</p>
      
      <div className="space-y-8">
        {campaign.audienceSegments.map((segment, index) => (
          <Card key={index}>
            <h3 className="text-lg font-bold text-indigo-700">{segment.name}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4 italic">"{segment.imagePrompt}"</p>
            
            <div className="w-full aspect-video bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-200">
              {segment.creative?.isGenerating ? (
                 <div className="flex flex-col items-center">
                    <SparklesIcon className="h-8 w-8 text-indigo-500 animate-pulse" />
                    <p className="mt-2 text-sm text-slate-500">Generating image...</p>
                 </div>
              ) : segment.creative?.imageUrl ? (
                <img src={segment.creative.imageUrl} alt={segment.name} className="object-contain h-full w-full rounded-md" />
              ) : (
                <Button 
                  onClick={() => handleGenerateImage(index)}
                  isLoading={segment.creative?.isGenerating}
                  variant="secondary"
                >
                  <SparklesIcon className="mr-2 h-5 w-5" />
                  Generate Image
                </Button>
              )}
            </div>
            {segment.creative?.imageUrl && (
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => handleGenerateImage(index)}>Regenerate</Button>
                <Button variant="secondary" onClick={() => setEditingCreative({ segmentIndex: index, creative: segment.creative! })}>Edit Image</Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!allCreativesGenerated}>
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
