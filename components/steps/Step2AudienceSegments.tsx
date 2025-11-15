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
      const { segments, sources, competitorAnalysis, marketAnalysis } = await getAudienceSegments(
        campaign.campaignName,
        campaign.totalBudget,
        durationDays,
        campaign.country,
        campaign.landingPageUrl,
        campaign.productDetailsUrl,
        campaign.importantCustomers,
        campaign.customerSegment,
        campaign.whatToTell,
        campaign.customerAction,
        campaign.productBenefits,
        campaign.customerJob,
        campaign.brandValues,
        campaign.supportingDocuments,
        campaign.productImage
      );
      setCampaign({ ...campaign, audienceSegments: segments, segmentSources: sources, competitorAnalysis, marketAnalysis });
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
    // Keep other campaign properties like sources and competitor analysis
    setCampaign({ ...campaign, audienceSegments: selectedSegments });
    onNext();
  };

  const hasSegments = campaign.audienceSegments.length > 0;
  const isAnySegmentSelected = campaign.audienceSegments.some(s => s.isSelected);

  return (
    <div>
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
        <>
          {campaign.competitorAnalysis && (
            <Card className="mb-8 max-w-5xl mx-auto">
              <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">Competitor Analysis</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{campaign.competitorAnalysis.summary}</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Key Features</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Audience</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {campaign.competitorAnalysis.comparisonTable.map((product, index) => (
                      <tr key={index} className={product.brand === 'Our Bank' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}>
                        <td className="px-6 py-4 align-top">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{product.productName}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{product.brand}</div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                            {product.keyFeatures.map((feature, i) => <li key={i}>{feature}</li>)}
                          </ul>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-slate-600 dark:text-slate-300">{product.targetAudience}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {campaign.marketAnalysis && (
            <Card className="mb-8 max-w-5xl mx-auto">
              <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">Market & Product Analysis</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{campaign.marketAnalysis}</p>
            </Card>
          )}

          <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200 text-center">Target Audience Segments</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">Review, edit, and select the segments you want to target for this campaign.</p>

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
                  className="text-sm text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 w-full resize-none"
                  rows={6}
                  aria-label={`Description for ${segment.name}`}
                />
                
                {segment.rationale && (
                  <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Rationale
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">{segment.rationale}</p>
                  </div>
                )}

                <div className="mt-4 flex-grow">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Key Motivations:</h4>
                  <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                    {segment.keyMotivations.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {!isLoading && hasSegments && campaign.segmentSources && campaign.segmentSources.length > 0 && (
          <Card className="mt-8 max-w-4xl mx-auto">
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Sources</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">The following web pages were used to inform the analysis and segmentation.</p>
              <ul className="list-disc list-inside space-y-1">
                  {campaign.segmentSources.map((source, index) => (
                      <li key={index} className="text-sm truncate">
                          <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                              {source.title}
                          </a>
                      </li>
                  ))}
              </ul>
          </Card>
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