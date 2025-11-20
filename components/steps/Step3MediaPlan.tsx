
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

const Step3MediaPlan: React.FC<Props> = ({ campaign, setCampaign, onNext, error, setError }) => {
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
        if (!splitData) return { ...segment, budget: 0, mediaSplit: [] };
        totalAllocated += splitData.allocatedBudget;
        return { ...segment, budget: splitData.allocatedBudget, mediaSplit: splitData.mediaSplit };
      });
      
      // Normalization logic (ensure total equals budget)
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
        });
      }

      setCampaign({ ...campaign, audienceSegments: updatedSegments, budgetAnalysis: analysis, budgetSources: sources });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(e => (e ? `${e}\n` : '') + `Paid Media analysis failed: ${message}`);
    } finally {
      setIsLoadingPaid(false);
    }
  }, [campaign, setCampaign, setError]);

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
        setCampaign(c => ({ ...c, ownedMediaAnalysis: analysis}));
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setOwnedMediaError(`Owned Media analysis failed: ${message}`);
    } finally {
        setIsLoadingOwned(false);
    }
  }, [campaign.campaignName, campaign.audienceSegments, campaign.importantCustomers, campaign.customerSegment, setCampaign]);

  useEffect(() => {
    if (!campaign.audienceSegments.some(s => s.budget)) fetchBudgetSplit();
    if (!campaign.ownedMediaAnalysis) fetchOwnedMedia();
  }, []);
  
  const handleRegenerate = async (instructions: string) => {
    setShowRegenModal(false);
    fetchBudgetSplit(instructions);
    fetchOwnedMedia();
  };

  const handleUpdateSplit = (segmentIndex: number, channelName: string, newPercentage: number, isChecked: boolean) => {
      const newSegments = [...campaign.audienceSegments];
      const oldSegment = newSegments[segmentIndex];
      const newSegment = { ...oldSegment, mediaSplit: oldSegment.mediaSplit ? oldSegment.mediaSplit.map(m => ({ ...m })) : [] };
      newSegments[segmentIndex] = newSegment;
      
      const segmentBudget = newSegment.budget || 0;
      const currentSplit = newSegment.mediaSplit!;
      const existingChannelIndex = currentSplit.findIndex(m => m.channel === channelName);

      if (!isChecked) {
          if (existingChannelIndex !== -1) {
              const removedBudget = currentSplit[existingChannelIndex].budget;
              currentSplit.splice(existingChannelIndex, 1);
              // Redistribute
              if (currentSplit.length > 0 && removedBudget > 0) {
                  const remainingTotal = currentSplit.reduce((sum, item) => sum + item.budget, 0);
                  currentSplit.forEach(item => {
                      const ratio = remainingTotal > 0 ? item.budget / remainingTotal : 1 / currentSplit.length;
                      item.budget += Math.round(removedBudget * ratio);
                  });
                  // Fix rounding
                  const newTotal = currentSplit.reduce((sum, item) => sum + item.budget, 0);
                  if (segmentBudget - newTotal !== 0) currentSplit[0].budget += (segmentBudget - newTotal);
              }
          }
      } else {
          const effectivePercent = (existingChannelIndex === -1 && newPercentage === 0) ? 10 : newPercentage;
          const targetBudget = Math.round(segmentBudget * (effectivePercent / 100));
          
          if (existingChannelIndex === -1) {
              currentSplit.push({ channel: channelName, budget: targetBudget });
          } else {
              currentSplit[existingChannelIndex].budget = targetBudget;
          }
          
          // Normalize others
          const targetIdx = currentSplit.findIndex(m => m.channel === channelName);
          const others = currentSplit.filter((_, i) => i !== targetIdx);
          const desiredOthersTotal = segmentBudget - targetBudget;
          
          if (desiredOthersTotal <= 0) {
              currentSplit[targetIdx].budget = segmentBudget;
              others.forEach(m => m.budget = 0);
          } else {
              const othersCurrentTotal = others.reduce((sum, m) => sum + m.budget, 0);
              others.forEach(m => {
                  const ratio = othersCurrentTotal > 0 ? m.budget / othersCurrentTotal : 1 / others.length;
                  m.budget = Math.round(desiredOthersTotal * ratio);
              });
          }
           // Fix rounding
           const newTotal = currentSplit.reduce((sum, item) => sum + item.budget, 0);
           if (segmentBudget - newTotal !== 0) {
               if (others.length > 0) currentSplit.find(m => m.channel !== channelName)!.budget += (segmentBudget - newTotal);
               else currentSplit[targetIdx].budget += (segmentBudget - newTotal);
           }
      }
      setCampaign({ ...campaign, audienceSegments: newSegments });
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
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Paid Media: Total Budget Allocation</h3>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-8 flex overflow-hidden mb-6">
              {campaign.audienceSegments.map((segment, index) => {
                const percentage = ((segment.budget || 0) / campaign.paidMediaBudget) * 100;
                const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-sky-500'];
                return (
                  <div key={index} className={`h-full ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-bold`} style={{ width: `${percentage}%` }}>
                   {percentage > 10 && segment.name}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaign.audienceSegments.map((segment, index) => {
                 const colors = ['border-indigo-500', 'border-purple-500', 'border-pink-500', 'border-teal-500', 'border-sky-500'];
                 const segmentBudget = segment.budget || 0;
                 return (
                  <div key={index} className={`p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-4 ${colors[index % colors.length]}`}>
                    <div className="flex justify-between mb-4 font-bold text-slate-800 dark:text-slate-200">
                      <h4>{segment.name}</h4>
                      <span>${segmentBudget.toLocaleString()}</span>
                    </div>
                    <div className="space-y-4">
                        {SUPPORTED_CHANNELS.map((channel) => {
                            const mediaItem = segment.mediaSplit?.find(m => m.channel === channel);
                            const isActive = !!mediaItem;
                            const budget = mediaItem ? mediaItem.budget : 0;
                            const percent = segmentBudget > 0 ? Math.round((budget / segmentBudget) * 100) : 0;
                            return (
                                <div key={channel} className="flex items-center text-sm">
                                    <input type="checkbox" checked={isActive} onChange={(e) => handleUpdateSplit(index, channel, percent, e.target.checked)} className="h-4 w-4 text-indigo-600 rounded mr-3" />
                                    <div className="w-28 shrink-0 text-slate-700 dark:text-slate-300 truncate">{channel}</div>
                                    <input type="range" min="0" max="100" value={percent} disabled={!isActive} onChange={(e) => handleUpdateSplit(index, channel, parseInt(e.target.value), true)} 
                                        className="grow mx-3 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50" />
                                    <div className="w-20 text-right font-mono text-xs text-slate-600">${isActive ? budget.toLocaleString() : '-'}</div>
                                </div>
                            );
                        })}
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
