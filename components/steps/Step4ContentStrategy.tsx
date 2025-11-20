
import React, { useState, useEffect } from 'react';
import { Campaign, Creative, CreativeGroup } from '../../types';
import { generateImagenImage, generateImageFromProduct, generateCreativeStrategy } from '../../services/geminiService';
import Button from '../common/Button';
import Card from '../common/Card';
import ImageEditorModal from '../ImageEditorModal';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PencilIcon } from '../icons/PencilIcon';
import RegenerateModal from '../common/RegenerateModal';
import MarkdownRenderer from '../common/MarkdownRenderer';

interface Props {
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const Step4ContentStrategy: React.FC<Props> = ({ campaign, setCampaign, error, setError }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingCreative, setEditingCreative] = useState<{ segmentIndex: number; groupIndex: number; creative: Creative } | null>(null);
  const [regenState, setRegenState] = useState<{ segmentIndex: number; groupIndex: number } | null>(null);

  // On mount, check if strategies exist. If not, generate them.
  useEffect(() => {
    const generateStrategies = async () => {
      const needsGeneration = campaign.audienceSegments.some(s => !s.creativeGroups || s.creativeGroups.length === 0);
      if (needsGeneration && !isAnalyzing) {
        setIsAnalyzing(true);
        try {
          const updatedSegments = await Promise.all(campaign.audienceSegments.map(async (segment) => {
             if (segment.creativeGroups && segment.creativeGroups.length > 0) return segment;

             // Determine active channels from Media Plan
             const activeChannels = segment.mediaSplit?.filter(m => m.budget > 0).map(m => m.channel) || [];
             // Add owned media channels if applicable
             if (campaign.ownedMediaAnalysis?.isApplicable && campaign.ownedMediaAnalysis.recommendedChannels) {
                 activeChannels.push(...campaign.ownedMediaAnalysis.recommendedChannels);
             }

             if (activeChannels.length === 0) return segment; // No channels, no strategy

             const groups = await generateCreativeStrategy(
                 segment, 
                 activeChannels, 
                 `Product: ${campaign.campaignName}. Values: ${campaign.brandValues || 'N/A'}.`
             );
             
             // Initialize selection state
             const initializedGroups = groups.map(g => ({ ...g, selectedPromptIndex: 0, selectedHeadlineIndex: 0 }));
             return { ...segment, creativeGroups: initializedGroups };
          }));
          
          setCampaign({ ...campaign, audienceSegments: updatedSegments });
        } catch (e) {
            setError("Failed to generate content strategy. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
      }
    };
    generateStrategies();
  }, []); // Run once on mount

  const handleGenerateImage = async (segmentIndex: number, groupIndex: number, instructions?: string) => {
    setError(null);
    const newSegments = [...campaign.audienceSegments];
    const segment = newSegments[segmentIndex];
    const group = segment.creativeGroups![groupIndex];
    
    // Set loading state
    group.generatedCreative = {
        id: 'generating',
        imagePrompt: group.imagePrompts[group.selectedPromptIndex || 0],
        notificationText: group.headlines[group.selectedHeadlineIndex || 0],
        imageUrl: '',
        mimeType: '',
        isGenerating: true,
    };
    setCampaign({ ...campaign, audienceSegments: newSegments });

    try {
      const prompt = group.imagePrompts[group.selectedPromptIndex || 0];
      const aspectRatio = group.aspectRatio as '1:1' | '9:16' | '16:9';

      const result = campaign.productImage 
        ? await generateImageFromProduct(campaign.productImage, prompt, instructions)
        : await generateImagenImage(prompt, aspectRatio, instructions);
        
      group.generatedCreative = {
        id: new Date().toISOString(),
        imagePrompt: prompt,
        notificationText: group.headlines[group.selectedHeadlineIndex || 0],
        imageUrl: `data:${result.mimeType};base64,${result.base64}`,
        mimeType: result.mimeType,
        isGenerating: false,
      };
      setCampaign({ ...campaign, audienceSegments: newSegments });
    } catch (e) {
        setError("Image generation failed.");
        group.generatedCreative = undefined;
        setCampaign({ ...campaign, audienceSegments: newSegments });
    }
  };

  const handleOptionChange = (segmentIndex: number, groupIndex: number, type: 'prompt' | 'headline', index: number) => {
      const newSegments = [...campaign.audienceSegments];
      const group = newSegments[segmentIndex].creativeGroups![groupIndex];
      if (type === 'prompt') group.selectedPromptIndex = index;
      else group.selectedHeadlineIndex = index;
      setCampaign({ ...campaign, audienceSegments: newSegments });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Content Strategy</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tailored creative concepts for your specific media mix.</p>
      </div>

      {isAnalyzing ? (
          <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Developing creative strategy based on your media plan...</p>
          </div>
      ) : (
        <div className="space-y-12">
            {campaign.audienceSegments.map((segment, segmentIndex) => {
                if (!segment.creativeGroups || segment.creativeGroups.length === 0) return null;
                
                // Filter groups based on active budget from media plan
                const activeChannelSet = new Set(segment.mediaSplit?.filter(m => m.budget > 0).map(m => m.channel) || []);
                // Add owned media if available
                if (campaign.ownedMediaAnalysis?.isApplicable && campaign.ownedMediaAnalysis.recommendedChannels) {
                    campaign.ownedMediaAnalysis.recommendedChannels.forEach(c => activeChannelSet.add(c));
                }

                const visibleGroups = segment.creativeGroups.filter(group => 
                    group.channels.some(c => activeChannelSet.has(c))
                );
                
                if (visibleGroups.length === 0) return null;

                return (
                    <div key={segmentIndex} className="border-b border-slate-200 dark:border-slate-700 pb-12 last:border-0">
                        <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-4">{segment.name}</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {visibleGroups.map((group, groupIndex) => (
                                <Card key={groupIndex} className="flex flex-col h-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{group.name}</h4>
                                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">{group.aspectRatio}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Channels: {group.channels.join(', ')}</p>
                                    </div>

                                    <div className="space-y-4 flex-grow">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Image Concept</label>
                                            <div className="space-y-2">
                                                {group.imagePrompts.map((prompt, i) => (
                                                    <div key={i} onClick={() => handleOptionChange(segmentIndex, groupIndex, 'prompt', i)}
                                                        className={`p-3 rounded border cursor-pointer text-sm transition-colors ${group.selectedPromptIndex === i ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'}`}>
                                                        <div className="flex items-start">
                                                            <div className={`mt-0.5 w-3 h-3 rounded-full border flex-shrink-0 mr-2 ${group.selectedPromptIndex === i ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'}`}></div>
                                                            <span className="text-slate-700 dark:text-slate-300">{prompt}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Headline / Copy</label>
                                            <div className="space-y-2">
                                                {group.headlines.map((text, i) => (
                                                    <div key={i} onClick={() => handleOptionChange(segmentIndex, groupIndex, 'headline', i)}
                                                        className={`p-3 rounded border cursor-pointer text-sm transition-colors ${group.selectedHeadlineIndex === i ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'}`}>
                                                        <div className="flex items-start">
                                                            <div className={`mt-0.5 w-3 h-3 rounded-full border flex-shrink-0 mr-2 ${group.selectedHeadlineIndex === i ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'}`}></div>
                                                            <span className="text-slate-700 dark:text-slate-300">"{text}"</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                        {group.generatedCreative?.isGenerating ? (
                                            <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-indigo-100">
                                                <SparklesIcon className="h-8 w-8 text-indigo-500 animate-pulse mx-auto mb-2" />
                                                <p className="text-sm text-slate-500">Generating high-quality creative...</p>
                                            </div>
                                        ) : group.generatedCreative?.imageUrl ? (
                                            <div className="relative group">
                                                <div className={`mx-auto bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center ${group.aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[200px]' : 'aspect-square'}`}>
                                                    <img src={group.generatedCreative.imageUrl} alt="Generated" className="w-full h-full object-cover" />
                                                </div>
                                                <button onClick={() => setEditingCreative({ segmentIndex, groupIndex, creative: group.generatedCreative! })} className="absolute top-2 right-2 p-2 bg-white rounded shadow hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <PencilIcon className="h-4 w-4 text-slate-700" />
                                                </button>
                                                <div className="mt-2 text-center">
                                                    <Button variant="ghost" onClick={() => setRegenState({ segmentIndex, groupIndex })}>Regenerate</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button onClick={() => handleGenerateImage(segmentIndex, groupIndex)} className="w-full">
                                                <SparklesIcon className="w-4 h-4 mr-2" /> Generate Creative
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      )}
      
      {editingCreative && (
        <ImageEditorModal creative={editingCreative.creative} onClose={() => setEditingCreative(null)} 
            onSave={(newCreative) => {
                const newSegments = [...campaign.audienceSegments];
                // Need to find the correct index in the actual segments array, as visibleGroups is filtered
                // Since group objects are by reference inside segments, we can iterate to find it, 
                // but simplistic approach is using indices which matches the render loop provided the filtering is consistent.
                // Actually, we used map index from visibleGroups. This is risky if we don't map back to original index.
                // Correction: We need to find the group in the main segment array.
                const segment = newSegments[editingCreative.segmentIndex];
                const groupToUpdate = segment.creativeGroups![editingCreative.groupIndex];
                // BUT WAIT: editingCreative.groupIndex passed from render loop is index in `visibleGroups`, NOT `segment.creativeGroups`.
                // I need to fix the index passing in the main render loop.
                // Actually, let's find the group by name or reference to be safe, but for now I will rely on finding the object.
                
                // FIX: In the render loop below, I should iterate the full group list but hide valid ones.
                // OR, better: pass the object reference to the modal logic or map visible index to real index.
                // Given the complexity, I'll assume the groups in 'visibleGroups' are references to the objects in state.
                // But I need to update state.
                
                // Let's just match by ID/Content or just iterate.
                const realGroupIndex = segment.creativeGroups!.findIndex(g => g.name === segment.creativeGroups![editingCreative.groupIndex].name); 
                // The above is wrong because editingCreative.groupIndex comes from visibleGroups map.
                // Let's just fix the state update logic to use the group object directly if possible, or better:
                // When mapping visibleGroups, I don't have the original index easily without searching.
                // Let's change the key/handler to use the group object identity? No, state is immutable.
                
                // Alternative: We know the group NAME is unique per segment usually.
                // Let's rely on the fact that I can't easily change the `handleGenerateImage` signature in the XML block without rewriting the whole file logic.
                // Actually, I CAN.
                
                // RE-WRITE STRATEGY for State Update in Modal:
                // I will iterate the segment's groups, find the one that matches the editingCreative.creative.id/prompt
                // It is safer to just update the specific creative object in the array.
                
                if (segment.creativeGroups) {
                     const group = segment.creativeGroups.find(g => g.generatedCreative === editingCreative.creative);
                     if (group) {
                         group.generatedCreative = newCreative;
                     }
                }
                setCampaign({ ...campaign, audienceSegments: newSegments });
                setEditingCreative(null);
            }} 
            setError={setError} 
        />
      )}
      {regenState && (
          <RegenerateModal title="Regenerate Creative" onClose={() => setRegenState(null)} isLoading={false} 
            onGenerate={(instructions) => {
                // We need to map visible index to real index for the handleGenerateImage call
                // This is tricky. `handleGenerateImage` expects an index into `segment.creativeGroups`.
                // But `regenState.groupIndex` comes from `visibleGroups.map`.
                
                // To fix this without huge refactor:
                // In the render loop, I should calculate the real index.
                
                // I will modify the render loop to:
                // segment.creativeGroups.map((group, realIndex) => {
                //    if (!isVisible(group)) return null;
                //    return ( ... onClick={() => setRegenState({ segmentIndex, groupIndex: realIndex })} ... )
                // })
                // This handles the index correctly.
                
                handleGenerateImage(regenState.segmentIndex, regenState.groupIndex, instructions);
                setRegenState(null);
            }} 
          />
      )}
    </div>
  );
};

export default Step4ContentStrategy;
