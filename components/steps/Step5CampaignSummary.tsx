import React, { useState } from 'react';
import { Campaign } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';

interface Props {
  campaign: Campaign;
  onBack: () => void;
}

type PreviewMode = 'desktop' | 'mobile';

const Step5CampaignSummary: React.FC<Props> = ({ campaign, onBack }) => {
  const [activePreviews, setActivePreviews] = useState<{ [key: number]: PreviewMode }>(
    () => Object.fromEntries(campaign.audienceSegments.map((_, i) => [i, 'desktop']))
  );
  
  const setActivePreview = (index: number, mode: PreviewMode) => {
    setActivePreviews(prev => ({ ...prev, [index]: mode }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-200 text-center">Campaign Plan Summary</h2>
      <p className="text-md text-slate-500 dark:text-slate-400 mb-8 text-center">Your AI-generated campaign plan for "{campaign.campaignName}" is ready!</p>
      
      <Card className="mb-8 dark:bg-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Campaign Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="font-medium text-slate-500 dark:text-slate-400">Campaign</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{campaign.campaignName}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500 dark:text-slate-400">Country</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{campaign.country}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500 dark:text-slate-400">Total Budget</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">${campaign.totalBudget.toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500 dark:text-slate-400">Start Date</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{campaign.startDate}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500 dark:text-slate-400">End Date</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{campaign.endDate}</p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="font-medium text-slate-500 dark:text-slate-400">Landing Page</p>
            <a href={campaign.landingPageUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline truncate block">{campaign.landingPageUrl}</a>
          </div>
        </div>
      </Card>
      
      <div className="space-y-6">
        {campaign.audienceSegments.map((segment, index) => (
          <Card key={index} className="dark:bg-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{segment.name}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{segment.description}</p>
                <div className="mt-4">
                  <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Key Motivations:</h5>
                  <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                    {segment.keyMotivations.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
                 {segment.creative?.notificationText && (
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Push Notification Text</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">"{segment.creative.notificationText}"</p>
                    </div>
                )}
              </div>

              <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Budget Allocation</h4>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">
                  ${(segment.budget || 0).toLocaleString()}
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-2">Total for Segment</span>
                </p>
                <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Media Channel Split:</h5>
                <ul className="text-sm text-slate-600 dark:text-slate-300 mt-1 space-y-2">
                  {segment.mediaSplit?.map((media, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{media.channel}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">${media.budget.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-1 flex flex-col">
                 <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Ad Creative</h4>
                {segment.creative?.imageUrls ? (
                  <div className="w-full aspect-video bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center justify-center relative">
                    <img src={segment.creative.imageUrls[activePreviews[index]]} alt={`Ad for ${segment.name}`} className="object-contain w-full h-full rounded-lg" />
                    <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md flex gap-1">
                      <button onClick={() => setActivePreview(index, 'desktop')} className={`px-2 py-1 text-xs rounded ${activePreviews[index] === 'desktop' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-black'}`}>Desktop</button>
                      <button onClick={() => setActivePreview(index, 'mobile')} className={`px-2 py-1 text-xs rounded ${activePreviews[index] === 'mobile' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-black'}`}>Mobile</button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center justify-center">
                    <p className="text-slate-500">No creative generated.</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => alert('Campaign plan finalized!')}>
          Finalize & Export Plan
        </Button>
      </div>
    </div>
  );
};

export default Step5CampaignSummary;