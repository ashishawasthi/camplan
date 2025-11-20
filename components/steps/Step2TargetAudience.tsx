
import React, { useState, useEffect, useCallback } from 'react';
import { Campaign, GroundingSource } from '../../types';
import { getAudienceSegments } from '../../services/geminiService';
import Button from '../common/Button';
import Card from '../common/Card';
import Loader from '../common/Loader';
import TextEditorModal from '../common/TextEditorModal';
import RegenerateModal from '../common/RegenerateModal';
import { PencilIcon } from '../icons/PencilIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface Props {
  campaign: Campaign;
  setCampaign: (campaign: Campaign) => void;
  onNext: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

type EditingState = { index: number; field: 'description' | 'rationale' | 'penPortrait'; value: string; }

const renderTextWithCitations = (text: string | undefined, sources: GroundingSource[] | undefined) => {
    if (!text) return null;
    if (!sources || sources.length === 0) return text;

    // Simplified citation rendering logic for brevity
    return text.split(/(\[\d+(?:,\s*\d+)*\])/g).map((part, i) => {
        if (/^\[\d+.*\]$/.test(part)) {
             const indices = part.replace(/[\[\]]/g, '').split(',').map(s => parseInt(s.trim(), 10));
             return (
                <span key={i}>
                    {indices.map((idx, j) => {
                        const src = sources[idx - 1];
                        return src ? (
                            <sup key={j} className="mx-0.5 font-bold text-indigo-600 cursor-help" title={src.title}>[{idx}]</sup>
                        ) : null;
                    })}
                </span>
             );
        }
        return part;
    });
};

const Step2TargetAudience: React.FC<Props> = ({ campaign, setCampaign, onNext, error, setError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [showRegenModal, setShowRegenModal] = useState(false);

  const fetchSegments = useCallback(async (instructions?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const start = new Date(campaign.startDate);
      const end = new Date(campaign.endDate);
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
      const { segments, sources, competitorAnalysis, proposition } = await getAudienceSegments(
        campaign.campaignName,
        campaign.paidMediaBudget,
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
        campaign.productImage,
        instructions
      );
      setCampaign({ ...campaign, audienceSegments: segments, segmentSources: sources, competitorAnalysis, proposition });
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
  }, []);

  const handleToggleSegment = (index: number) => {
    const newSegments = [...campaign.audienceSegments];
    newSegments[index] = { ...newSegments[index], isSelected: !newSegments[index].isSelected };
    setCampaign({ ...campaign, audienceSegments: newSegments });
  };

  const handleTextChange = (index: number, field: 'description' | 'rationale' | 'penPortrait', newValue: string) => {
      const newSegments = [...campaign.audienceSegments];
      newSegments[index] = { ...newSegments[index], [field]: newValue };
      setCampaign({ ...campaign, audienceSegments: newSegments });
  };
  
  const handleNextWithSelection = () => {
    const selectedSegments = campaign.audienceSegments.filter(s => s.isSelected);
    setCampaign({ ...campaign, audienceSegments: selectedSegments });
    onNext();
  };
  
  const handleRegenerate = async (instructions: string) => {
    setShowRegenModal(false);
    await fetchSegments(instructions);
  };

  const hasSegments = campaign.audienceSegments.length > 0;
  const isAnySegmentSelected = campaign.audienceSegments.some(s => s.isSelected);

  return (
    <div>
      {isLoading ? (
        <Loader text="Analyzing market and identifying target audience..." />
      ) : error && !hasSegments ? (
        <Card className="text-center p-8 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-red-600 mt-4">Failed to Get Target Audience</h3>
            <p className="text-slate-500 mt-2 mb-6">{error}</p>
            <Button onClick={() => fetchSegments()} isLoading={isLoading}>Try Again</Button>
        </Card>
      ) : (
        <>
          {campaign.competitorAnalysis && (
            <Card className="mb-8 max-w-6xl mx-auto">
              <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">Competitor Insight</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-wrap">
                  {renderTextWithCitations(campaign.competitorAnalysis.summary, campaign.segmentSources)}
              </p>
            </Card>
          )}

          {campaign.proposition && (
            <Card className="mb-8 max-w-6xl mx-auto">
              <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">Proposition</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {renderTextWithCitations(campaign.proposition, campaign.segmentSources)}
              </p>
            </Card>
          )}
          
          <div className="max-w-6xl mx-auto">
            <div className="text-center print-break-before">
              <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200">Target Audience</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Review and select the audience you want to target.</p>
              <Button variant="secondary" onClick={() => setShowRegenModal(true)} className="mb-6 no-print">
                  <SparklesIcon className="w-4 h-4 mr-2" /> Regenerate Audience
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaign.audienceSegments.map((segment, index) => (
                <Card key={index} className="flex flex-col relative">
                   <div className="absolute top-4 right-4">
                    <input type="checkbox" checked={segment.isSelected ?? false} onChange={() => handleToggleSegment(index)} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </div>
                  <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 pr-8 mb-2">{segment.name}</h3>
                  
                  <div className="relative group mb-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300">{segment.description}</p>
                       <button onClick={() => setEditingState({ index, field: 'description', value: segment.description })} className="absolute top-0 right-0 p-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon className="h-4 w-4" /></button>
                  </div>
                  
                  {segment.penPortrait && (
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 relative group">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Pen Portrait</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{segment.penPortrait}</p>
                        <button onClick={() => setEditingState({ index, field: 'penPortrait', value: segment.penPortrait })} className="absolute top-2 right-2 p-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon className="h-4 w-4" /></button>
                    </div>
                  )}
                  
                   <div className="mt-4 flex-grow">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Key Motivations</h4>
                    <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 space-y-1">
                      {segment.keyMotivations.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
      
      {editingState && (
        <TextEditorModal title={`Edit ${editingState.field}`} initialValue={editingState.value} onClose={() => setEditingState(null)} onSave={(newValue) => { handleTextChange(editingState.index, editingState.field, newValue); setEditingState(null); }} />
      )}

      {showRegenModal && (
        <RegenerateModal title="Regenerate Target Audience" onClose={() => setShowRegenModal(false)} onGenerate={handleRegenerate} isLoading={isLoading} />
      )}

      {!isLoading && hasSegments && (
        <div className="mt-8 flex justify-end max-w-6xl mx-auto">
          <Button onClick={handleNextWithSelection} disabled={!isAnySegmentSelected}>Media Plan</Button>
        </div>
      )}
    </div>
  );
};

export default Step2TargetAudience;
