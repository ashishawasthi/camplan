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
  setError: (error: string | null) => void;
}

const Step2AudienceSegments: React.FC<Props> = ({ campaign, setCampaign, onNext, onBack, setError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchSegments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const start = new Date(campaign.startDate);
      const end = new Date(campaign.endDate);
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
      const segments = await getAudienceSegments(campaign.campaignName, campaign.totalBudget, durationDays, campaign.country);
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-1 text-slate-800 text-center">Target Audience Segments</h2>
      <p className="text-sm text-slate-500 mb-6 text-center">Here are the audience segments AI has identified for your campaign in <span className="font-semibold">{campaign.country}</span>.</p>
      
      {isLoading ? (
        <Loader text="Analyzing market and identifying audience segments..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaign.audienceSegments.map((segment, index) => (
            <Card key={index} className="flex flex-col">
              <h3 className="text-lg font-bold text-indigo-700">{segment.name}</h3>
              <p className="text-sm text-slate-600 mt-2 flex-grow">{segment.description}</p>
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-800">Key Motivations:</h4>
                <ul className="list-disc list-inside text-sm text-slate-500 mt-1 space-y-1">
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
        <Button onClick={onNext} disabled={isLoading || campaign.audienceSegments.length === 0}>
          Generate Creatives
        </Button>
      </div>
    </div>
  );
};

export default Step2AudienceSegments;