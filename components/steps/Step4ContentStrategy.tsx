
import React, { useState, useEffect } from 'react';
import { Campaign, Creative, CreativeGroup } from '../../types';
import { generateImage, generateImageFromProduct, generateCreativeStrategy } from '../../services/geminiService';
import Button from '../common/Button';
import Card from '../common/Card';
import Loader from '../common/Loader';
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
  const [editingCreative, setEditingCreative] = useState<{ segmentIndex: number; groupIndex: number; creative: Creative; aspectRatio: '1:1' | '9:16' | '16:9' } | null>(null);
  const [regenState, setRegenState] = useState<{ segmentIndex: number; groupIndex: number } | null>(null);
  const [strategyRegenIndex, setStrategyRegenIndex] = useState<number | null>(null);

  // On mount, check if strategies exist. If not, generate them.
  useEffect(() => {
    const generateStrategies = async () => {
      const needsGeneration = campaign.audienceSegments.some(s => !s.creativeGroups || s.creativeGroups.length === 0);
      if (needsGeneration && !isAnalyzing) {
        setIsAnalyzing(true);
        try {
          // Process segments sequentially to avoid hitting API rate limits (429 errors)
          const updatedSegments = [...campaign.audienceSegments];
          
          for (let i = 0; i < updatedSegments.length; i++) {
             const segment = updatedSegments[i];
             
             // Skip if already generated
             if (segment.creativeGroups && segment.creativeGroups.length > 0) continue;

             // Determine active channels from Media Plan
             const activeChannels = segment.mediaSplit?.filter(m => m.budget > 0).map(m => m.channel) || [];
             // Add owned media channels if applicable
             if (campaign.ownedMediaAnalysis?.isApplicable && campaign.ownedMediaAnalysis.recommendedChannels) {
                 activeChannels.push(...campaign.ownedMediaAnalysis.recommendedChannels);
             }

             if (activeChannels.length === 0) continue; // No channels, no strategy

             // Generate strategy for this segment
             const groups = await generateCreativeStrategy(
                 segment, 
                 activeChannels, 
                 `Product: ${campaign.campaignName}. Values: ${campaign.brandValues || 'N/A'}. Target Country: ${campaign.country}.`
             );
             
             // Initialize selection state
             const initializedGroups = groups.map(g => ({ ...g, selectedPromptIndex: 0, selectedHeadlineIndex: 0 }));
             updatedSegments[i] = { ...segment, creativeGroups: initializedGroups };
             
             // Optional: Update state progressively so user sees progress
             // setCampaign({ ...campaign, audienceSegments: [...updatedSegments] });
          }
          
          setCampaign({ ...campaign, audienceSegments: updatedSegments });
        } catch (e) {
            console.error(e);
            setError("Failed to generate content strategy. Please try again or check your API quota.");
        } finally {
            setIsAnalyzing(false);
        }
      }
    };
    generateStrategies();
  }, []); // Run once on mount

  const handleRegenerateStrategy = async (instructions: string) => {
      if (strategyRegenIndex === null) return;
      
      const segmentIndex = strategyRegenIndex;
      setStrategyRegenIndex(null);
      setIsAnalyzing(true);
      setError(null);

      try {
          const updatedSegments = [...campaign.audienceSegments];
          const segment = updatedSegments[segmentIndex];

          const activeChannels = segment.mediaSplit?.filter(m => m.budget > 0).map(m => m.channel) || [];
          if (campaign.ownedMediaAnalysis?.isApplicable && campaign.ownedMediaAnalysis.recommendedChannels) {
               activeChannels.push(...campaign.ownedMediaAnalysis.recommendedChannels);
          }

          // Force regeneration even if groups exist
          const groups = await generateCreativeStrategy(
                 segment, 
                 activeChannels, 
                 `Product: ${campaign.campaignName}. Values: ${campaign.brandValues || 'N/A'}. Target Country: ${campaign.country}.`,
                 instructions
          );
          
          const initializedGroups = groups.map(g => ({ ...g, selectedPromptIndex: 0, selectedHeadlineIndex: 0 }));
          updatedSegments[segmentIndex] = { ...segment, creativeGroups: initializedGroups };
          
          setCampaign({ ...campaign, audienceSegments: updatedSegments });

      } catch (e) {
          setError("Failed to regenerate content strategy.");
      } finally {
          setIsAnalyzing(false);
      }
  }

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

      // Inject audience and country context for better representation
      const audienceContext = `Target Audience: ${segment.name}. ${segment.penPortrait || segment.description}.`;
      const countryContext = `Location: ${campaign.country}. The image must be culturally and visually appropriate for ${campaign.country}.`;
      const constraints = `Do not generate text, logos, or screen UI. Show the product only if strictly necessary; otherwise focus on the people and mood.`;
      
      const finalInstructions = instructions 
        ? `${instructions}. ${audienceContext} ${countryContext} ${constraints}`
        : `${audienceContext} ${countryContext} ${constraints}`;

      const result = campaign.productImage 
        ? await generateImageFromProduct(campaign.productImage, prompt, finalInstructions, aspectRatio)
        : await generateImage(prompt, aspectRatio, finalInstructions);
        
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

  const getAspectRatioClass = (ratio: string) => {
      switch (ratio) {
          case '9:16': return 'aspect-[9/16] w-full';
          case '16:9': return 'aspect-[16/9] w-full';
          case '1:1':
          default: return 'aspect-square w-full';
      }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Content Strategy</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tailored creative concepts for your specific media mix.</p>
      </div>

      {isAnalyzing ? (
          <Loader text="Developing creative strategy based on your media plan..." />
      ) : (
        <div className="space-y-12">
            {campaign.audienceSegments.map((segment, segmentIndex) => {
                if (!segment.creativeGroups || segment.creativeGroups.length === 0) return null;
                
                // Filter groups based on active budget from media plan
                const activeChannelSet = new Set(segment.mediaSplit?.filter(m => m.budget > 0).map(m => m.channel) || []);
                // Add owned media channels if applicable
                if (campaign.ownedMediaAnalysis?.isApplicable && campaign.ownedMediaAnalysis.recommendedChannels) {
                    campaign.ownedMediaAnalysis.recommendedChannels.forEach(c => activeChannelSet.add(c));
                }

                const visibleGroups = segment.creativeGroups.filter(group => 
                    group.channels.some(c => activeChannelSet.has(c))
                );
                
                if (visibleGroups.length === 0) return null;

                return (
                    <div key={segmentIndex} className="border-b border-slate-200 dark:border-slate-700 pb-12 last:border-0">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{segment.name}</h3>
                            <Button variant="ghost" onClick={() => setStrategyRegenIndex(segmentIndex)} className="text-sm">
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                Regenerate Concepts
                            </Button>
                        </div>
                        
                        {segment.imageSearchKeywords && segment.imageSearchKeywords.length > 0 && (
                            <div className="mb-6 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mr-2">Image Search Keywords:</span>
                                {segment.imageSearchKeywords.map((keyword, k) => (
                                    <span key={k} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 select-all font-mono hover:bg-slate-200 dark:hover:bg-slate-700 cursor-copy" title="Click to copy">
                                        #{keyword}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {visibleGroups.map((group) => {
                                // Find the real index of the group in the original array to ensure state updates target the correct item
                                const realIndex = segment.creativeGroups!.indexOf(group);
                                
                                return (
                                <Card key={realIndex} className="flex flex-col border border-slate-200 dark:border-slate-700 shadow-sm h-full">
                                    <div className="border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{group.name}</h4>
                                            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">{group.aspectRatio}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Channels: {group.channels.join(', ')}</p>
                                    </div>

                                    <div className="space-y-6 mb-6">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block tracking-wider">Image Concept</label>
                                            <div className="space-y-2">
                                                {group.imagePrompts.map((prompt, i) => (
                                                    <div key={i} onClick={() => handleOptionChange(segmentIndex, realIndex, 'prompt', i)}
                                                        className={`p-3 rounded border cursor-pointer text-sm transition-colors ${group.selectedPromptIndex === i ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500'}`}>
                                                        <div className="flex items-start">
                                                            <div className={`mt-0.5 w-3 h-3 rounded-full border flex-shrink-0 mr-2 ${group.selectedPromptIndex === i ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'}`}></div>
                                                            <span className="text-slate-700 dark:text-slate-300">{prompt}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block tracking-wider">Headline / Copy</label>
                                            <div className="space-y-2">
                                                {group.headlines.map((text, i) => (
                                                    <div key={i} onClick={() => handleOptionChange(segmentIndex, realIndex, 'headline', i)}
                                                        className={`p-3 rounded border cursor-pointer text-sm transition-colors ${group.selectedHeadlineIndex === i ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500'}`}>
                                                        <div className="flex items-start">
                                                            <div className={`mt-0.5 w-3 h-3 rounded-full border flex-shrink-0 mr-2 ${group.selectedHeadlineIndex === i ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'}`}></div>
                                                            <span className="text-slate-700 dark:text-slate-300">"{text}"</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {group.pushNotes && group.pushNotes.length > 0 && (
                                            <div>
                                                <label className="text-xs font-bold uppercase text-slate-500 mb-2 block tracking-wider">Push Notes (Owned Media)</label>
                                                <div className="space-y-2">
                                                    {group.pushNotes.map((note, i) => (
                                                        <div key={i} className="p-3 rounded border bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                                                            <div className="flex items-start gap-2">
                                                                <div className="mt-1">
                                                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                                    </svg>
                                                                </div>
                                                                <p className="text-sm text-slate-700 dark:text-slate-300">{note}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {group.generatedCreative?.isGenerating || group.generatedCreative?.imageUrl ? (
                                        <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-700 flex-grow flex flex-col justify-end">
                                            {group.generatedCreative?.isGenerating ? (
                                                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-indigo-100 dark:bg-slate-800/30 dark:border-slate-700">
                                                    <SparklesIcon className="h-8 w-8 text-indigo-500 animate-pulse mx-auto mb-2" />
                                                    <p className="text-sm text-slate-500">Generating preview...</p>
                                                </div>
                                            ) : (
                                                <div className="relative group w-full">
                                                    <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center ${getAspectRatioClass(group.aspectRatio)}`}>
                                                        <img 
                                                            src={group.generatedCreative?.imageUrl} 
                                                            alt="Generated" 
                                                            className="w-full h-full object-contain" 
                                                        />
                                                    </div>
                                                    <button onClick={() => setEditingCreative({ segmentIndex, groupIndex: realIndex, creative: group.generatedCreative!, aspectRatio: group.aspectRatio as any })} className="absolute top-2 right-2 p-2 bg-white rounded shadow hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <PencilIcon className="h-4 w-4 text-slate-700" />
                                                    </button>
                                                    <div className="mt-2 text-center">
                                                        <Button variant="ghost" onClick={() => setRegenState({ segmentIndex, groupIndex: realIndex })}>Regenerate</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex justify-end mt-2">
                                            <button 
                                                onClick={() => handleGenerateImage(segmentIndex, realIndex)} 
                                                className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                                                title="Generate Preview"
                                                aria-label="Generate Preview"
                                            >
                                                <SparklesIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </Card>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      )}
      
      {editingCreative && (
        <ImageEditorModal 
            creative={editingCreative.creative} 
            aspectRatio={editingCreative.aspectRatio}
            country={campaign.country}
            onClose={() => setEditingCreative(null)} 
            onSave={(newCreative) => {
                const newSegments = [...campaign.audienceSegments];
                const segment = newSegments[editingCreative.segmentIndex];
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
                handleGenerateImage(regenState.segmentIndex, regenState.groupIndex, instructions);
                setRegenState(null);
            }} 
          />
      )}
      {strategyRegenIndex !== null && (
         <RegenerateModal 
            title={`Regenerate Concepts: ${campaign.audienceSegments[strategyRegenIndex].name}`} 
            onClose={() => setStrategyRegenIndex(null)} 
            isLoading={isAnalyzing} 
            onGenerate={handleRegenerateStrategy} 
         />
      )}
    </div>
  );
};

export default Step4ContentStrategy;
