import React from 'react';
import { Campaign } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';

interface Props {
  campaign: Campaign;
  onBack: () => void;
}

const Step5CampaignSummary: React.FC<Props> = ({ campaign, onBack }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-slate-800 text-center">Campaign Plan Summary</h2>
      <p className="text-md text-slate-500 mb-8 text-center">Your AI-generated campaign plan for "{campaign.campaignName}" is ready!</p>
      
      <Card className="mb-8">
        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Campaign Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="font-medium text-slate-500">Campaign</p>
            <p className="font-semibold text-slate-900">{campaign.campaignName}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Country</p>
            <p className="font-semibold text-slate-900">{campaign.country}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Total Budget</p>
            <p className="font-semibold text-slate-900">${campaign.totalBudget.toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Start Date</p>
            <p className="font-semibold text-slate-900">{campaign.startDate}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">End Date</p>
            <p className="font-semibold text-slate-900">{campaign.endDate}</p>
          </div>
        </div>
      </Card>
      
      <div className="space-y-6">
        {campaign.audienceSegments.map((segment, index) => (
          <Card key={index}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h4 className="text-lg font-bold text-indigo-700">{segment.name}</h4>
                <p className="text-sm text-slate-600 mt-2">{segment.description}</p>
                <div className="mt-4">
                  <h5 className="text-sm font-semibold text-slate-800">Key Motivations:</h5>
                  <ul className="list-disc list-inside text-sm text-slate-500 mt-1 space-y-1">
                    {segment.keyMotivations.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-1 bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Budget Allocation</h4>
                <p className="text-lg font-bold text-slate-800 mb-3">
                  ${(segment.budget || 0).toLocaleString()}
                  <span className="text-sm font-medium text-slate-500 ml-2">Total for Segment</span>
                </p>
                <h5 className="text-sm font-semibold text-slate-800">Media Channel Split:</h5>
                <ul className="text-sm text-slate-600 mt-1 space-y-2">
                  {segment.mediaSplit?.map((media, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{media.channel}</span>
                      <span className="font-medium text-slate-700">${media.budget.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-1 flex flex-col">
                 <h4 className="text-sm font-semibold text-slate-800 mb-2">Ad Creative</h4>
                {segment.creative?.imageUrl ? (
                  <img src={segment.creative.imageUrl} alt={`Ad for ${segment.name}`} className="object-contain w-full h-full rounded-lg bg-slate-100" />
                ) : (
                  <div className="w-full aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
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