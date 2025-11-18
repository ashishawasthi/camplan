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

const Step4BudgetSplit: React.FC<Props> = ({ campaign, setCampaign, onNext, error, setError }) => {
  const [isLoadingPaid, setIsLoadingPaid] = useState(false);
  const [isLoadingOwned, setIsLoadingOwned] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);

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

      setCampaign(c => ({ ...c, audienceSegments: updatedSegments, budgetAnalysis: analysis, budgetSources: sources }));

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(e => (e ? `${e}\n` : '') + `Paid Media analysis failed: ${message}`);
    } finally {
      setIsLoadingPaid(false);
    }
  }, [campaign.audienceSegments, campaign.paidMediaBudget, campaign.country, campaign.campaignName, campaign.landingPageUrl, campaign.customerAction, campaign.productBenefits, setCampaign, setError]);

  const fetchOwnedMedia = useCallback(async () => {
    setIsLoadingOwned(true);
    try {
        const analysis = await getOwnedMediaAnalysis(
            campaign.campaignName,
            campaign.audienceSegments,
            campaign.importantCustomers,
            campaign.customerSegment,
        );
        setCampaign(c => ({ ...c, ownedMediaAnalysis: analysis}));
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(e => (e ? `${e}\n` : '') + `Owned Media analysis failed: ${message}`);
    } finally {
        setIsLoadingOwned(false);
    }
  }, [campaign.campaignName, campaign.audienceSegments, campaign.importantCustomers, campaign.customerSegment, setCampaign, setError]);

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
    fetchOwnedMedia();
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
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Owned Media Analysis</h3>
                {isLoadingOwned ? (
                    <Loader text="Analyzing owned media potential..." />
                ) : campaign.ownedMediaAnalysis ? (
                    <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className={`text-sm font-semibold p-3 rounded-md ${campaign.ownedMediaAnalysis.isApplicable 
                            ? 'text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/30' 
                            : 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/30'}`
                        }>
                            <span className="font-bold">{campaign.ownedMediaAnalysis.isApplicable ? 'Recommendation: Use Owned Media.' : 'Recommendation: Do Not Use Owned Media.'}</span>
                            <span className="block font-normal mt-1">{campaign.ownedMediaAnalysis.justification}</span>
                        </p>
                        {campaign.ownedMediaAnalysis.isApplicable && campaign.ownedMediaAnalysis.analysisRecommendations && (
                            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Customer Data Analysis Recommendations:</h4>
                            <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-white dark:bg-slate-800">
                                <MarkdownRenderer content={campaign.ownedMediaAnalysis.analysisRecommendations} />
                            </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">Owned media analysis could not be loaded.</p>
                )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Paid Media: Total Budget Allocation by Segment</h3>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-8 flex overflow-hidden">
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
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">Paid Media: Channel Breakdown</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaign.audienceSegments.map((segment, index) => {
                 const colors = ['border-indigo-500', 'border-purple-500', 'border-pink-500', 'border-teal-500', 'border-sky-500'];
                 const percentage = ((segment.budget || 0) / campaign.paidMediaBudget) * 100;
                 return (
                  <div key={index} className={`p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-4 ${colors[index % colors.length]}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">{segment.name}</h4>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">${(segment.budget || 0).toLocaleString()}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {segment.mediaSplit?.map((media, mediaIndex) => (
                        <li key={mediaIndex} className="flex justify-between items-center">
                          <span className="text-slate-600 dark:text-slate-300">{media.channel}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">${media.budget.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
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