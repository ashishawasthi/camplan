import React, { useState, useEffect, useCallback } from 'react';
import { Campaign } from '../../types';
import { getBudgetSplit } from '../../services/geminiService';
import Button from '../common/Button';
import Loader from '../common/Loader';
import Card from '../common/Card';

interface Props {
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
  onNext: () => void;
  onBack: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const Step4BudgetSplit: React.FC<Props> = ({ campaign, setCampaign, onNext, onBack, error, setError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchBudgetSplit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const splits = await getBudgetSplit(campaign.audienceSegments, campaign.totalBudget);
      const newCampaign = { ...campaign };
      
      let totalAllocated = 0;
      const updatedSegments = newCampaign.audienceSegments.map(segment => {
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
      
      // Normalize segment budgets if total allocated doesn't match total budget
      if (totalAllocated > 0) {
        const ratio = campaign.totalBudget / totalAllocated;
        let runningTotal = 0;
        updatedSegments.forEach((segment, index) => {
          if (index === updatedSegments.length - 1) {
             segment.budget = campaign.totalBudget - runningTotal;
          } else {
            const newBudget = Math.round((segment.budget || 0) * ratio);
            segment.budget = newBudget;
            runningTotal += newBudget;
          }

          // Normalize media split within the segment
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


      setCampaign({ ...newCampaign, audienceSegments: updatedSegments });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [campaign, setCampaign, setError]);

  useEffect(() => {
    if (!campaign.audienceSegments.some(s => s.budget)) {
      fetchBudgetSplit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const budgetIsSet = campaign.audienceSegments.every(s => typeof s.budget === 'number');

  return (
    <Card className="max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-1 text-slate-800 text-center">Budget Allocation</h2>
      <p className="text-sm text-slate-500 mb-6 text-center">Here's a suggested budget split for your campaign, broken down by audience segment and media channel.</p>

      {isLoading ? (
        <Loader text="Strategizing budget allocation..." />
      ) : error && !budgetIsSet ? (
        <div className="text-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-600 mt-4">Budget Allocation Failed</h3>
            <p className="text-slate-500 mt-2 mb-6">{error}</p>
            <Button onClick={fetchBudgetSplit} isLoading={isLoading}>
                Try Again
            </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-700 mb-2">Total Budget Allocation by Segment</h3>
            <div className="w-full bg-slate-200 rounded-full h-8 flex overflow-hidden">
              {campaign.audienceSegments.map((segment, index) => {
                const percentage = ((segment.budget || 0) / campaign.totalBudget) * 100;
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
          
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-base font-semibold text-slate-700 mb-4">Paid Media Channel Breakdown</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaign.audienceSegments.map((segment, index) => {
                 const colors = ['border-indigo-500', 'border-purple-500', 'border-pink-500', 'border-teal-500', 'border-sky-500'];
                 const percentage = ((segment.budget || 0) / campaign.totalBudget) * 100;
                 return (
                  <div key={index} className={`p-4 bg-slate-50 rounded-lg border-l-4 ${colors[index % colors.length]}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-800">{segment.name}</h4>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800">${(segment.budget || 0).toLocaleString()}</span>
                        <span className="text-sm text-slate-500 ml-2">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {segment.mediaSplit?.map((media, mediaIndex) => (
                        <li key={mediaIndex} className="flex justify-between items-center">
                          <span className="text-slate-600">{media.channel}</span>
                          <span className="font-medium text-slate-700">${media.budget.toLocaleString()}</span>
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

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={isLoading || !budgetIsSet}>
          Review Campaign
        </Button>
      </div>
    </Card>
  );
};

export default Step4BudgetSplit;