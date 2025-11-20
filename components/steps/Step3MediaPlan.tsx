
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Campaign } from '../../types';
import { getBudgetSplit, getOwnedMediaAnalysis } from '../../services/geminiService';
import Button from '../common/Button';
import Loader from '../common/Loader';
import Card from '../common/Card';
import RegenerateModal from '../common/RegenerateModal';
import { SparklesIcon } from '../icons/SparklesIcon';
import MarkdownRenderer from '../common/MarkdownRenderer';

interface Props {
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
  onNext: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const SUPPORTED_CHANNELS = ['Facebook', 'Instagram', 'Google Search', 'Google Display', 'TikTok', 'YouTube', 'LinkedIn'];

const Step3MediaPlan: React.FC<Props> = ({ campaign, setCampaign, onNext, error, setError }) => {
  const [isLoadingPaid, setIsLoadingPaid] = useState(false);
  const [isLoadingOwned, setIsLoadingOwned] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [ownedMediaError, setOwnedMediaError] = useState<string | null>(null);

  // Refs for accessing latest props in async callbacks
  const campaignRef = useRef(campaign);
  const errorRef = useRef(error);

  useEffect(() => {
    campaignRef.current = campaign;
    errorRef.current = error;
  }, [campaign, error]);

  const fetchBudgetSplit = useCallback(async (instructions?: string) => {
    setIsLoadingPaid(true);
    setError(null);
    try {
      // Capture request context for the API call
      const requestCampaign = campaignRef.current;
      
      const { analysis, splits, sources } = await getBudgetSplit(
        requestCampaign.audienceSegments, 
        requestCampaign.paidMediaBudget,
        requestCampaign.country,
        requestCampaign.campaignName,
        requestCampaign.landingPageUrl,
        requestCampaign.customerAction,
        requestCampaign.productBenefits,
        instructions
      );

      // CRITICAL FIX: Fetch the latest state *after* the await to ensure we don't overwrite 
      // concurrent updates (like Owned Media Analysis which finishes faster).
      const latestCampaign = campaignRef.current;

      let totalAllocated = 0;
      const updatedSegments = latestCampaign.audienceSegments.map(segment => {
        const splitData = splits.find(s => s.segmentName === segment.name);
        if (!splitData) return { ...segment, budget: 0, mediaSplit: [] };
        totalAllocated += splitData.allocatedBudget;
        return { ...segment, budget: splitData.allocatedBudget, mediaSplit: splitData.mediaSplit };
      });
      
      // Normalization logic (ensure total equals budget)
      if (totalAllocated > 0 && Math.abs(totalAllocated - latestCampaign.paidMediaBudget) > 1) { 
        const ratio = latestCampaign.paidMediaBudget / totalAllocated;
        let runningTotal = 0;
        updatedSegments.forEach((segment, index) => {
          if (index === updatedSegments.length - 1) {
             segment.budget = latestCampaign.paidMediaBudget - runningTotal;
          } else {
            const newBudget = Math.round((segment.budget || 0) * ratio);
            segment.budget = newBudget;
            runningTotal += newBudget;
          }
          
          // Also scale the inner media splits to match new segment budget
          if (segment.mediaSplit) {
             const currentSplitTotal = segment.mediaSplit.reduce((sum, s) => sum + s.budget, 0);
             if (currentSplitTotal > 0) {
                 const splitRatio = segment.budget! / currentSplitTotal;
                 segment.mediaSplit.forEach(m => m.budget = Math.round(m.budget * splitRatio));
                 // Fix simple rounding on the first element
                 const newSplitTotal = segment.mediaSplit.reduce((sum, s) => sum + s.budget, 0);
                 if (segment.mediaSplit.length > 0) {
                     segment.mediaSplit[0].budget += (segment.budget! - newSplitTotal);
                 }
             }
          }
        });
      }

      setCampaign({ ...latestCampaign, audienceSegments: updatedSegments, budgetAnalysis: analysis, budgetSources: sources });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const currentError = errorRef.current;
      setError((currentError ? `${currentError}\n` : '') + `Paid Media analysis failed: ${message}`);
    } finally {
      setIsLoadingPaid(false);
    }
  }, [setCampaign, setError]);

  const fetchOwnedMedia = useCallback(async () => {
    setIsLoadingOwned(true);
    setOwnedMediaError(null);
    try {
        const currentCampaign = campaignRef.current;
        const analysis = await getOwnedMediaAnalysis(
            currentCampaign.campaignName,
            currentCampaign.audienceSegments,
            currentCampaign.importantCustomers,
            currentCampaign.customerSegment,
        );
        // Access ref again after await to ensure we are merging into latest state
        setCampaign({ ...campaignRef.current, ownedMediaAnalysis: analysis});
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setOwnedMediaError(`Owned Media analysis failed: ${message}`);
    } finally {
        setIsLoadingOwned(false);
    }
  }, [setCampaign]);

  useEffect(() => {
    if (!campaign.audienceSegments.some(s => s.budget)) fetchBudgetSplit();
    if (!campaign.ownedMediaAnalysis) fetchOwnedMedia();
  }, []);
  
  const handleRegenerate = async (instructions: string) => {
    setShowRegenModal(false);
    fetchBudgetSplit(instructions);
    fetchOwnedMedia();
  };

  const handleUpdateSplit = (segmentIndex: number, channelName: string, newPercentage: number) => {
      const newSegments = [...campaign.audienceSegments];
      const segment = newSegments[segmentIndex];
      const segmentBudget = segment.budget || 0;
      
      // Deep copy mediaSplit or create new
      let currentSplit = segment.mediaSplit ? segment.mediaSplit.map(m => ({ ...m })) : [];
      
      // Find or create the channel entry
      let splitItemIndex = currentSplit.findIndex(m => m.channel === channelName);
      if (splitItemIndex === -1) {
          currentSplit.push({ channel: channelName, budget: 0 });
          splitItemIndex = currentSplit.length - 1;
      }

      // Calculate available budget from OTHER channels
      const otherChannelsBudget = currentSplit.reduce((sum, m, idx) => idx !== splitItemIndex ? sum + m.budget : sum, 0);
      const maxAvailable = segmentBudget - otherChannelsBudget;
      
      // Calculate requested budget
      let targetBudget = Math.round(segmentBudget * (newPercentage / 100));
      
      // Clamp to max available (Prevent affecting other channels)
      if (targetBudget > maxAvailable) {
          targetBudget = maxAvailable;
      }

      currentSplit[splitItemIndex].budget = targetBudget;

      newSegments[segmentIndex] = { ...segment, mediaSplit: currentSplit };
      setCampaign({ ...campaign, audienceSegments: newSegments });
  };

  const distributeRemaining = (segmentIndex: number) => {
      const newSegments = [...campaign.audienceSegments];
      const segment = newSegments[segmentIndex];
      const segmentBudget = segment.budget || 0;
      const currentSplit = segment.mediaSplit ? segment.mediaSplit.map(m => ({ ...m })) : [];
      
      const currentAllocated = currentSplit.reduce((sum, m) => sum + m.budget, 0);
      const remaining = segmentBudget - currentAllocated;
      
      if (remaining > 0) {
          // Distribute remaining proportionally among active channels (budget > 0)
          // If no active channels, distribute among all existing in split, or if empty, do nothing.
          const activeItems = currentSplit.filter(m => m.budget > 0);
          const itemsToDistribute = activeItems.length > 0 ? activeItems : currentSplit;

          if (itemsToDistribute.length > 0) {
             const distributeBase = itemsToDistribute.reduce((sum, item) => sum + item.budget, 0);
             
             itemsToDistribute.forEach(item => {
                  const ratio = distributeBase > 0 ? item.budget / distributeBase : 1 / itemsToDistribute.length;
                  item.budget += Math.round(remaining * ratio);
             });

             // Fix rounding on the first item to ensure total matches exact budget
             const newTotal = currentSplit.reduce((sum, item) => sum + item.budget, 0);
             const diff = segmentBudget - newTotal;
             if (diff !== 0 && itemsToDistribute.length > 0) {
                 itemsToDistribute[0].budget += diff;
             }
             
             newSegments[segmentIndex] = { ...segment, mediaSplit: currentSplit };
             setCampaign({ ...campaign, audienceSegments: newSegments });
          }
      }
  };
  
  const budgetIsSet = campaign.audienceSegments.every(s => typeof s.budget === 'number');

  return (
    <Card className="max-w-6xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200">Media Plan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Strategic budget allocation based on market data.</p>
        {budgetIsSet && !isLoadingPaid && (
            <Button variant="secondary" onClick={() => setShowRegenModal(true)} className="mb-6 no-print">
                <SparklesIcon className="w-4 h-4 mr-2" /> Regenerate Plan
            </Button>
        )}
      </div>

      {isLoadingPaid ? <Loader text="Strategizing budget allocation..." /> : error && !budgetIsSet ? (
        <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-red-600 mt-4">Media Plan Failed</h3>
            <p className="text-slate-500 mb-6">{error}</p>
            <Button onClick={() => fetchBudgetSplit()} isLoading={isLoadingPaid}>Try Again</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {campaign.budgetAnalysis && (
            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">Paid Media: Strategic Rationale</h3>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                    <MarkdownRenderer content={campaign.budgetAnalysis} sources={campaign.budgetSources} />
                </div>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">Paid Media: Budget Allocation</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaign.audienceSegments.map((segment, index) => {
                 const colors = ['border-indigo-500', 'border-purple-500', 'border-pink-500', 'border-teal-500', 'border-sky-500'];
                 const segmentBudget = segment.budget || 0;
                 const currentAllocated = segment.mediaSplit?.reduce((sum, m) => sum + m.budget, 0) || 0;
                 const unallocated = segmentBudget - currentAllocated;
                 
                 return (
                  <div key={index} className={`p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-4 ${colors[index % colors.length]}`}>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">{segment.name}</h4>
                      <div className="text-right">
                          <div className="font-bold text-slate-800 dark:text-slate-200">${segmentBudget.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-1">
                        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(currentAllocated / segmentBudget) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center mb-4 text-xs">
                         <span className="text-slate-500">Allocated: ${(currentAllocated).toLocaleString()}</span>
                         {unallocated > 5 ? (
                             <span className="text-amber-600 font-medium">Remaining: ${unallocated.toLocaleString()}</span>
                         ) : (
                             <span className="text-green-600 font-medium">Fully Allocated</span>
                         )}
                    </div>

                    <div className="space-y-4">
                        {SUPPORTED_CHANNELS.map((channel) => {
                            const mediaItem = segment.mediaSplit?.find(m => m.channel === channel);
                            const budget = mediaItem ? mediaItem.budget : 0;
                            const percent = segmentBudget > 0 ? Math.round((budget / segmentBudget) * 100) : 0;
                            const isActive = budget > 0;

                            return (
                                <div key={channel} className="group">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className={`font-medium ${isActive ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {channel}
                                        </span>
                                        <span className={`font-mono text-xs ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}`}>
                                            {percent}%
                                        </span>
                                    </div>
                                    
                                    <div className="relative h-4 flex items-center">
                                        <div className="absolute w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg overflow-hidden">
                                            <div 
                                                className={`h-full ${isActive ? 'bg-indigo-500' : 'bg-transparent'}`} 
                                                style={{ width: `${percent}%` }}
                                            ></div>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            step="1"
                                            value={percent} 
                                            onChange={(e) => handleUpdateSplit(index, channel, parseInt(e.target.value))} 
                                            className="absolute w-full h-full opacity-0 cursor-pointer z-10" 
                                            title={unallocated <= 0 && !isActive ? "Reduce other channels to increase" : "Adjust allocation"}
                                        />
                                         {/* Thumb simulation */}
                                        <div 
                                            className={`absolute h-3 w-3 rounded-full shadow pointer-events-none transition-colors ${isActive ? 'bg-white border-2 border-indigo-600' : 'bg-slate-300 border border-slate-400'}`}
                                            style={{ left: `calc(${percent}% - 6px)` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {unallocated > 5 && (
                        <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
                            <button 
                                onClick={() => distributeRemaining(index)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                            >
                                Distribute Remaining Budget (${unallocated.toLocaleString()})
                            </button>
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Owned Media Analysis</h3>
                {campaign.ownedMediaAnalysis && !isLoadingOwned && (
                     <Button variant="ghost" onClick={fetchOwnedMedia} className="!py-1 !px-2 text-xs"><SparklesIcon className="w-3 h-3 mr-1" /> Regenerate</Button>
                )}
              </div>
                {isLoadingOwned ? <Loader text="Analyzing owned media..." /> : ownedMediaError ? (
                     <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-red-600 mb-2">Analysis Failed: {ownedMediaError}</p>
                        <Button variant="secondary" onClick={fetchOwnedMedia}>Retry</Button>
                     </div>
                ) : campaign.ownedMediaAnalysis && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className={`text-sm font-semibold p-3 rounded-md mb-3 ${campaign.ownedMediaAnalysis.isApplicable ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            <span className="block font-bold mb-1">{campaign.ownedMediaAnalysis.isApplicable ? 'Recommendation: Use Owned Media' : 'Recommendation: Do Not Use Owned Media'}</span>
                            <span className="font-normal">{campaign.ownedMediaAnalysis.justification}</span>
                        </div>
                        {campaign.ownedMediaAnalysis.analysisRecommendations && (
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                <MarkdownRenderer content={campaign.ownedMediaAnalysis.analysisRecommendations} />
                            </div>
                        )}
                    </div>
                )}
          </div>
        </div>
      )}
      
      {showRegenModal && <RegenerateModal title="Regenerate Media Plan" onClose={() => setShowRegenModal(false)} onGenerate={handleRegenerate} isLoading={isLoadingPaid} />}
      {!isLoadingPaid && budgetIsSet && <div className="mt-8 flex justify-end"><Button onClick={onNext}>Content Strategy</Button></div>}
    </Card>
  );
};

export default Step3MediaPlan;
