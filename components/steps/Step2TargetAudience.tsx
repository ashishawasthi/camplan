
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

const UserCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const renderTextWithCitations = (text: string | undefined, sources: GroundingSource[] | undefined) => {
    if (!text) return null;
    if (!sources || sources.length === 0) return text;

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
        campaign.productDetailsDocument,
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
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Competitor Insight</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 whitespace-pre-wrap">
                  {renderTextWithCitations(campaign.competitorAnalysis.summary, campaign.segmentSources)}
              </p>
              
              {campaign.competitorAnalysis.comparisonTable && campaign.competitorAnalysis.comparisonTable.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                              <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Brand</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Key Features</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Audience</th>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pros vs Cons</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                              {campaign.competitorAnalysis.comparisonTable.map((product, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/30'}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{product.productName}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{product.brand}</td>
                                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                          <ul className="list-disc list-inside">
                                              {product.keyFeatures.slice(0, 3).map((feature, fIdx) => (
                                                  <li key={fIdx} className="truncate max-w-xs" title={feature}>{feature}</li>
                                              ))}
                                              {product.keyFeatures.length > 3 && <li className="italic text-xs">+{product.keyFeatures.length - 3} more</li>}
                                          </ul>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{product.targetAudience}</td>
                                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 min-w-[200px]">{product.prosVsCons || '-'}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
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
              <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200">Target Audience Personas</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Select the key segments to target for this campaign.</p>
              <Button variant="secondary" onClick={() => setShowRegenModal(true)} className="mb-6 no-print">
                  <SparklesIcon className="w-4 h-4 mr-2" /> Regenerate Audience
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {campaign.audienceSegments.map((segment, index) => (
                <Card key={index} className={`flex flex-col relative transition-all duration-200 ${segment.isSelected ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'}`}>
                   <div className="absolute top-4 right-4 z-10 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={segment.isSelected ?? false} 
                      onChange={() => handleToggleSegment(index)} 
                      className="h-6 w-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                    />
                  </div>
                  
                  <div className="mb-6 pr-10">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{segment.name}</h3>
                    <div className="relative group inline-block w-full">
                       <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{segment.description}</p>
                       <button onClick={() => setEditingState({ index, field: 'description', value: segment.description })} className="absolute top-0 right-0 p-1 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon className="h-3 w-3" /></button>
                    </div>
                  </div>
                  
                  <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Left Col: Narrative - Persona Style */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800 relative group h-full flex flex-col">
                       <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-3">
                                <UserCircleIcon className="w-6 h-6" />
                            </div>
                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Pen Portrait
                            </h4>
                       </div>
                       
                       <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed flex-grow">
                         "{segment.penPortrait}"
                       </p>
                       <button onClick={() => setEditingState({ index, field: 'penPortrait', value: segment.penPortrait })} className="absolute top-2 right-2 p-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon className="h-4 w-4" /></button>
                    </div>

                    {/* Right Col: Structured Data */}
                    <div className="space-y-4">
                       {segment.targeting && (
                         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">Targeting Criteria</h4>
                            <div className="space-y-3">
                                <div>
                                  <span className="block text-[10px] uppercase text-slate-400 font-semibold">Demographics</span>
                                  <div className="flex gap-2 mt-0.5">
                                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                        {segment.targeting.ageRange}
                                     </span>
                                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-50 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 capitalize">
                                        {segment.targeting.genders.join(', ')}
                                     </span>
                                  </div>
                                </div>
                                
                                <div>
                                   <span className="block text-[10px] uppercase text-slate-400 font-semibold">Interests</span>
                                   <div className="flex flex-wrap gap-1 mt-1">
                                     {segment.targeting.interests.slice(0, 4).map((interest, i) => (
                                        <span key={i} className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                            {interest}
                                        </span>
                                     ))}
                                     {segment.targeting.interests.length > 4 && (
                                         <span className="text-xs text-slate-400 px-1 py-0.5">+{segment.targeting.interests.length - 4}</span>
                                     )}
                                   </div>
                                </div>
                            </div>
                         </div>
                       )}

                       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Key Motivations</h4>
                          <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1">
                             {segment.keyMotivations.slice(0, 3).map((m, i) => <li key={i} className="truncate" title={m}>{m}</li>)}
                          </ul>
                       </div>
                    </div>
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
