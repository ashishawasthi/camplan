
import React, { useState, useEffect, useCallback } from 'react';
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

const Step4BudgetSplit: React.FC<Props> = ({ campaign, setCampaign, onNext, error, setError }) => {
  const [isLoadingPaid, setIsLoadingPaid] = useState(false);
  const [isLoadingOwned, setIsLoadingOwned] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [ownedMediaError, setOwnedMediaError] = useState<string | null>(null);

  const fetchBudgetSplit = useCallback(async (instructions?: string) => {
    setIsLoadingPaid(true);
    setError(null);
    try {
      const { analysis, splits, sources } = await getBudgetSplit(
        campaign.audienceSegments, 
        campaign.paidMediaBudget,
        campaign.country,
        campaign.campaignName,
        campaign.landingPageUrl,
        campaign.customerAction,
        campaign.productBenefits,
        instructions
      );

      let totalAllocated = 0;
      const updatedSegments = campaign.audienceSegments.map(segment => {
        const splitData = splits.find(s => s.segmentName === segment.name);
        if (!splitData) {
          return { ...segment, budget: 0, mediaSplit: [] };
        }
        
        totalAllocated += splitData.allocatedBudget;
        return { 
          ...segment, 
          budget: splitData.allocatedBudget,
          mediaSplit: splitData.mediaSplit
        };
      });
      
      if (totalAllocated > 0 && Math.abs(totalAllocated - campaign.paidMediaBudget) > 1) { 
        const ratio = campaign.paidMediaBudget / totalAllocated;
        let runningTotal = 0;
        updatedSegments.forEach((segment, index) => {
          if (index === updatedSegments.length - 1) {
             segment.budget = campaign.paidMediaBudget - runningTotal;
          } else {
            const newBudget = Math.round((segment.budget || 0) * ratio);
            segment.budget = newBudget;
            runningTotal += newBudget;
          }

          const segmentTotal = segment.budget || 0;
          if (segment.mediaSplit && segment.mediaSplit.length > 0) {
            const mediaTotal = segment.mediaSplit.reduce((acc, curr) => acc + curr.budget, 0);
            if (mediaTotal > 0) {
                const mediaRatio = segmentTotal / mediaTotal;
                let runningMediaTotal = 0;
                segment.mediaSplit.forEach((mediaItem, mediaIndex) => {
                  if (mediaIndex === segment.mediaSplit.length - 1) {
                    mediaItem.budget = segmentTotal - runningMediaTotal;
                  } else {
                     const newMediaBudget = Math.round(mediaItem.budget * mediaRatio);
                     mediaItem.budget = newMediaBudget;
                     runningMediaTotal += newMediaBudget;
                  }
                });
            }
          }
        });
      }

      setCampaign({ ...campaign, audienceSegments: updatedSegments, budgetAnalysis: analysis, budgetSources: sources });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(e => (e ? `${e}\n` : '') + `Paid Media analysis failed: ${message}`);
    } finally {
      setIsLoadingPaid(false);
    }
  }, [campaign.audienceSegments, campaign.paidMediaBudget, campaign.country, campaign.campaignName, campaign.landingPageUrl, campaign.customerAction, campaign.productBenefits, campaign, setCampaign, setError]);

  const fetchOwnedMedia = useCallback(async () => {
    setIsLoadingOwned(true);
    setOwnedMediaError(null);
    try {
        const analysis = await getOwnedMediaAnalysis(
            campaign.campaignName,
            campaign.audienceSegments,
            campaign.importantCustomers,
            campaign.customerSegment,
        );
        // Must use function update to avoid stale closure on 'campaign' from previous fetchBudgetSplit
        setCampaign(c => ({ ...c, ownedMediaAnalysis: analysis}));
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setOwnedMediaError(`Owned Media analysis failed: ${message}`);
    } finally {
        setIsLoadingOwned(false);
    }
  }, [campaign.campaignName, campaign.audienceSegments, campaign.importantCustomers, campaign.customerSegment, setCampaign]);

  useEffect(() => {
    if (!campaign.audienceSegments.some(s => s.budget)) {
      fetchBudgetSplit();
    }
    if (!campaign.ownedMediaAnalysis) {
        fetchOwnedMedia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleRegenerate = async (instructions: string) => {
    setShowRegenModal(false);
    fetchBudgetSplit(instructions);
    // Regenerate owned media as well if user requests global regeneration
    fetchOwnedMedia();
  };

  const handleUpdateSplit = (segmentIndex: number, channelName: string, newPercentage: number, isChecked: boolean) => {
      const newSegments = [...campaign.audienceSegments];
      // Create a deep copy of the segment and its mediaSplit
      const oldSegment = newSegments[segmentIndex];
      const newSegment = {
        ...oldSegment,
        mediaSplit: oldSegment.mediaSplit ? oldSegment.mediaSplit.map(m => ({ ...m })) : []
      };
      newSegments[segmentIndex] = newSegment;
      
      const segmentBudget = newSegment.budget || 0;
      const currentSplit = newSegment.mediaSplit!;
      
      const existingChannelIndex = currentSplit.findIndex(m => m.channel === channelName);

      if (!isChecked) {
          // Case: Unchecking (Removing) a channel
          if (existingChannelIndex !== -1) {
              const removedBudget = currentSplit[existingChannelIndex].budget;
              currentSplit.splice(existingChannelIndex, 1);
              
              // Distribute removed budget among remaining channels
              if (currentSplit.length > 0 && removedBudget > 0) {
                  const remainingTotal = currentSplit.reduce((sum, item) => sum + item.budget, 0);
                  
                  currentSplit.forEach(item => {
                      // Proportional distribution
                      const ratio = remainingTotal > 0 ? item.budget / remainingTotal : 1 / currentSplit.length;
                      item.budget += Math.round(removedBudget * ratio);
                  });
                  
                  // Fix rounding errors to ensure total matches segmentBudget
                  const newTotal = currentSplit.reduce((sum, item) => sum + item.budget, 0);
                  const diff = segmentBudget - newTotal;
                  if (diff !== 0) {
                      currentSplit[0].budget += diff;
                  }
              }
          }
      } else {
          // Case: Checking (Adding) or Sliding (Updating)
          let targetBudget = 0;
          
          // If adding a new channel, default to 10% if no specific percentage provided
          // (Checkbox click passes 0 as percentage initially)
          const effectivePercent = (existingChannelIndex === -1 && newPercentage === 0) ? 10 : newPercentage;
          targetBudget = Math.round(segmentBudget * (effectivePercent / 100));
          
          if (existingChannelIndex === -1) {
              currentSplit.push({ channel: channelName, budget: targetBudget });
          } else {
              currentSplit[existingChannelIndex].budget = targetBudget;
          }
          
          // Normalize other channels
          // Find index again as it might be newly added
          const targetIdx = currentSplit.findIndex(m => m.channel === channelName);
          const others = currentSplit.filter((_, i) => i !== targetIdx);
          
          const othersCurrentTotal = others.reduce((sum, m) => sum + m.budget, 0);
          const desiredOthersTotal = segmentBudget - targetBudget;
          
          if (desiredOthersTotal <= 0) {
              // Target takes all
              currentSplit[targetIdx].budget = segmentBudget;
              others.forEach(m => m.budget = 0);
          } else {
              // Scale others proportionally
              others.forEach(m => {
                  const ratio = othersCurrentTotal > 0 ? m.budget / othersCurrentTotal : 1 / others.length;
                  m.budget = Math.round(desiredOthersTotal * ratio);
              });
          }
          
          // Fix rounding errors
          const newTotal = currentSplit.reduce((sum, m) => sum + m.budget, 0);
          const diff = segmentBudget - newTotal;
          if (diff !== 0) {
              // Adjust a non-target channel if possible to avoid jumping slider
              const adjIdx = currentSplit.findIndex(m => m.channel !== channelName);
              if (adjIdx !== -1) currentSplit[adjIdx].budget += diff;
              else currentSplit[targetIdx].budget += diff;
          }
      }

      setCampaign({ ...campaign, audienceSegments: newSegments });
  };
  
  const budgetIsSet = campaign.audienceSegments.every(s => typeof s.budget === 'number');

  return (
    <Card className="max-w-6xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200">Media Plan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Here's a suggested media plan for your campaign, based on market and customer analysis.</p>
        {budgetIsSet && !isLoadingPaid && (
            <Button variant="secondary" onClick={() => setShowRegenModal(true)} className="mb-6 no-print">
                <SparklesIcon className="w-4 h-4 mr-2" />
                Regenerate Media Plan
            </Button>
        )}
      </div>

      {isLoadingPaid ? (
        <Loader text="Strategizing budget allocation with real-time data..." />
      ) : error && !budgetIsSet ? (
        <div className="text-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-600 mt-4">Media Plan Failed</h3>
            <p className="text-slate-500 mt-2 mb-6 whitespace-pre-wrap">{error}</p>
            <Button onClick={() => fetchBudgetSplit()} isLoading={isLoadingPaid}>
                Try Again
            </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {campaign.budgetAnalysis && (
            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">Paid Media: Strategic Rationale</h3>
                <div className="text-sm text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-white dark:bg-slate-800">
                    <MarkdownRenderer content={campaign.budgetAnalysis} sources={campaign.budgetSources} />
                </div>
                {campaign.budgetSources && campaign.budgetSources.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">References</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-slate-500 dark:text-slate-400">
                          {campaign.budgetSources.map((source, index) => (
                              <li key={index} className="truncate">
                                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                      {source.title}
                                  </a>
                              </li>
                          ))}
                      </ol>
                  </div>
                )}
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Paid Media: Total Budget Allocation by Segment</h3>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-8 flex overflow-hidden mb-6">
              {campaign.audienceSegments.map((segment, index) => {
                const percentage = ((segment.budget || 0) / campaign.paidMediaBudget) * 100;
                const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-sky-500'];
                return (
                  <div
                    key={index}
                    className={`h-full ${colors[index % colors.length]} transition-all duration-500 flex items-center justify-center text-white text-xs font-bold`}
                    style={{ width: `${percentage}%` }}
                    title={`${segment.name}: ${percentage.toFixed(1)}%`}
                  >
                   {percentage > 10 && `${segment.name}`}
                  </div>
                );
              })}
            </div>

            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">Paid Media: Channel Allocation Editor</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaign.audienceSegments.map((segment, index) => {
                 const colors = ['border-indigo-500', 'border-purple-500', 'border-pink-500', 'border-teal-500', 'border-sky-500'];
                 const segmentBudget = segment.budget || 0;
                 const segmentPercentage = (segmentBudget / campaign.paidMediaBudget) * 100;
                 
                 return (
                  <div key={index} className={`p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-4 ${colors[index % colors.length]}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2" title={segment.name}>{segment.name}</h4>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">${segmentBudget.toLocaleString()}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">({segmentPercentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                        {SUPPORTED_CHANNELS.map((channel) => {
                            const mediaItem = segment.mediaSplit?.find(m => m.channel === channel);
                            const isActive = !!mediaItem;
                            const budget = mediaItem ? mediaItem.budget : 0;
                            const percent = segmentBudget > 0 ? Math.round((budget / segmentBudget) * 100) : 0;
                            
                            return (
                                <div key={channel} className="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => handleUpdateSplit(index, channel, percent, e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                                    />
                                    <div className="w-28 shrink-0 text-slate-700 dark:text-slate-300 truncate" title={channel}>{channel}</div>
                                    <input 
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={percent}
                                        disabled={!isActive}
                                        onChange={(e) => handleUpdateSplit(index, channel, parseInt(e.target.value), true)}
                                        className="grow mx-3 h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-indigo-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600"
                                    />
                                    <div className="w-20 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                                        {isActive ? `$${budget.toLocaleString()}` : '-'}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Show total check */}
                        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                             <span className="text-xs text-slate-400">
                                Allocated: {segment.mediaSplit?.reduce((sum, item) => sum + item.budget, 0).toLocaleString() ?? 0} / {segmentBudget.toLocaleString()}
                             </span>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Owned Media Analysis</h3>
                {campaign.ownedMediaAnalysis && !isLoadingOwned && (
                     <Button variant="ghost" onClick={fetchOwnedMedia} className="!py-1 !px-2 text-xs">
                        <SparklesIcon className="w-3 h-3 mr-1" /> Regenerate
                    </Button>
                )}
              </div>
              
                {isLoadingOwned ? (
                    <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <Loader text="Analyzing owned media potential..." />
                    </div>
                ) : ownedMediaError ? (
                     <div className="text-center p-6 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-red-600 mb-3 font-medium">Analysis Failed</p>
                        <p className="text-red-500 text-sm mb-4">{ownedMediaError}</p>
                         <Button variant="secondary" onClick={fetchOwnedMedia}>Retry Analysis</Button>
                     </div>
                ) : !campaign.ownedMediaAnalysis ? (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <p className="text-slate-500 mb-4">Owned media analysis is not available.</p>
                        <Button variant="secondary" onClick={fetchOwnedMedia}>Generate Analysis</Button>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className={`text-sm font-semibold p-3 rounded-md ${campaign.ownedMediaAnalysis.isApplicable 
                            ? 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/30' 
                            : 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30'}`
                        }>
                            <span className="font-bold block mb-1">{campaign.ownedMediaAnalysis.isApplicable ? 'Recommendation: Use Owned Media.' : 'Recommendation: Do Not Use Owned Media.'}</span>
                            <span className="block font-normal">{campaign.ownedMediaAnalysis.justification}</span>
                        </div>
                        
                         {campaign.ownedMediaAnalysis.isApplicable && campaign.ownedMediaAnalysis.recommendedChannels && campaign.ownedMediaAnalysis.recommendedChannels.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Suggested Channels:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {campaign.ownedMediaAnalysis.recommendedChannels.map((channel, i) => (
                                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                            {channel}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {campaign.ownedMediaAnalysis.isApplicable && campaign.ownedMediaAnalysis.analysisRecommendations && (
                            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Customer Data Analysis Recommendations:</h4>
                            <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-white dark:bg-slate-800">
                                <MarkdownRenderer content={campaign.ownedMediaAnalysis.analysisRecommendations} />
                            </div>
                            </div>
                        )}
                    </div>
                )}
          </div>
        </div>
      )}
      
      {showRegenModal && (
        <RegenerateModal 
            title="Regenerate Media Plan"
            onClose={() => setShowRegenModal(false)}
            onGenerate={handleRegenerate}
            isLoading={isLoadingPaid || isLoadingOwned}
        />
      )}
      {!isLoadingPaid && budgetIsSet && (
        <div className="mt-8 flex justify-end">
          <Button onClick={onNext}>
            Content Strategy
          </Button>
        </div>
      )}
    </Card>
  );
};

export default Step4BudgetSplit;
