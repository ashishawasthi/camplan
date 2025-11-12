import React, { useState, useEffect, useCallback } from 'react';
import { Campaign } from '../../types';
import { getAudienceSegments } from '../../services/geminiService';
import Button from '../common/Button';
import Card from '../common/Card';
import Loader from '../common/Loader';

interface Props {
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
  onNext: () => void;
  onBack: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const Step2AudienceSegments: React.FC<Props> = ({ campaign, setCampaign, onNext, onBack, error, setError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchSegments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const start = new Date(campaign.startDate);
      const end = new Date(campaign.endDate);
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
      const segments = await getAudienceSegments(
        campaign.campaignName, 
        campaign.totalBudget, 
        durationDays, 
        campaign.country,
        campaign.landingPageUrl,
        campaign.targetingGuidelines,
        campaign.brandGuidelines,
        campaign.supportingDocuments
      );
      setCampaign({ ...campaign, audienceSegments: segments });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [campaign, setCampaign, setError]);

  useEffect(() => {
    if (campaign.audienceSegments.length === 0) {
      fetchSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSegment = (index: number) => {
    const newSegments = [...campaign.audienceSegments];
    newSegments[index] = { ...newSegments[index], isSelected: !newSegments[index].isSelected };
    setCampaign({ ...campaign, audienceSegments: newSegments });
  };

  const handleDescriptionChange = (index: number, newDescription: string) => {
      const newSegments = [...campaign.audienceSegments];
      newSegments[index] = { ...newSegments[index], description: newDescription };
      setCampaign({ ...campaign, audienceSegments: newSegments });
  };
  
  const handleNextWithSelection = () => {
    // We update the campaign state with only the selected segments before moving on
    const selectedSegments = campaign.audienceSegments.filter(s => s.isSelected);
    setCampaign({ ...campaign, audienceSegments: selectedSegments });
    onNext();
  };

  const hasSegments = campaign.audienceSegments.length > 0;
  const isAnySegmentSelected = campaign.audienceSegments.some(s => s.isSelected);

  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200 text-center">Target Audience Segments</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">Review, edit, and select the segments you want to target for this campaign.</p>
      
      {isLoading ? (
        <Loader text="Analyzing market and identifying audience segments..." />
      ) : error && !hasSegments ? (
        <Card className="text-center p-8 max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-600 mt-4">Failed to Get Segments</h3>
            <p className="text-slate-500 mt-2 mb-6">{error}</p>
            <Button onClick={fetchSegments} isLoading={isLoading}>
                Try Again
            </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaign.audienceSegments.map((segment, index) => (
            <Card key={index} className="flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 pr-2">{segment.name}</h3>
                <input
                  type="checkbox"
                  checked={segment.isSelected ?? false}
                  onChange={() => handleToggleSegment(index)}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  aria-label={`Select segment ${segment.name}`}
                />
              </div>

              <textarea
                value={segment.description}
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                className="text-sm text-slate-600 dark:text-slate-300 mt-2 flex-grow bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 w-full resize-none"
                rows={4}
                aria-label={`Description for ${segment.name}`}
              />
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Key Motivations:</h4>
                <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                  {segment.keyMotivations.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNextWithSelection} disabled={isLoading || !isAnySegmentSelected}>
          Generate Creatives
        </Button>
      </div>
    </div>
  );
};

export default Step2AudienceSegments;