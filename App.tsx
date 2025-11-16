import React, { useState, useCallback } from 'react';
import { Campaign } from './types';
import Step1ProductDetails from './components/steps/Step1ProductDetails';
import Step2AudienceSegments from './components/steps/Step2AudienceSegments';
import Step3CreativeGeneration from './components/steps/Step3CreativeGeneration';
import Step4BudgetSplit from './components/steps/Step4BudgetSplit';
import Button from './components/common/Button';

// Assuming JSZip is available globally from the script tag in index.html
declare var JSZip: any;

const App: React.FC = () => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isDetailsSubmitted, setIsDetailsSubmitted] = useState(false);
  const [isAudienceCompleted, setIsAudienceCompleted] = useState(false);
  const [isCreativeCompleted, setIsCreativeCompleted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const updateCampaign = useCallback((updatedCampaign: Campaign) => {
    setCampaign(updatedCampaign);
  }, []);

  const handleDetailsSubmit = (details: Omit<Campaign, 'audienceSegments'>) => {
    setError(null);
    setCampaign({ ...details, audienceSegments: [] });
    setIsDetailsSubmitted(true);
    // Reset subsequent steps if details are re-submitted
    setIsAudienceCompleted(false);
    setIsCreativeCompleted(false);
    // Scroll to the next section
    setTimeout(() => {
        document.getElementById('step-2-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  const handleAudienceComplete = () => {
    setError(null);
    setIsAudienceCompleted(true);
    setTimeout(() => {
        document.getElementById('step-3-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCreativeComplete = () => {
    setError(null);
    setIsCreativeCompleted(true);
    setTimeout(() => {
        document.getElementById('step-4-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  const handleExport = async () => {
    if (!campaign) return;
    setIsExporting(true);
    try {
        const zip = new JSZip();

        // 1. Create Markdown content
        let markdownContent = `# Campaign Plan: ${campaign.campaignName}\n\n`;
        markdownContent += `## 1. Campaign Overview\n`;
        markdownContent += `- **Country:** ${campaign.country}\n`;
        markdownContent += `- **Total Budget:** $${campaign.totalBudget.toLocaleString()}\n`;
        markdownContent += `- **Duration:** ${campaign.startDate} to ${campaign.endDate}\n`;
        markdownContent += `- **Landing Page:** ${campaign.landingPageUrl}\n\n---\n\n`;

        markdownContent += `## 2. Strategic Insights\n`;
        if (campaign.competitorAnalysis?.summary) {
            markdownContent += `### Competitor Analysis Summary\n${campaign.competitorAnalysis.summary}\n\n`;
        }
        if (campaign.marketAnalysis) {
            markdownContent += `### Market & Product Analysis\n${campaign.marketAnalysis}\n\n`;
        }
        if (campaign.budgetAnalysis) {
            markdownContent += `### Budget Strategy Rationale\n${campaign.budgetAnalysis}\n\n`;
        }
        if (campaign.budgetSources && campaign.budgetSources.length > 0) {
            markdownContent += `**Sources:**\n`;
            campaign.budgetSources.forEach(source => {
                markdownContent += `- [${source.title}](${source.uri})\n`;
            });
            markdownContent += `\n`;
        }
        markdownContent += `\n---\n\n`;
        
        if (campaign.audienceSegments.length > 0) {
            markdownContent += `## 3. Audience Segments & Creatives\n\n`;

            // 2. Loop through segments
            for (const segment of campaign.audienceSegments) {
                const segmentFolderName = segment.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                const segmentFolder = zip.folder(segmentFolderName);

                markdownContent += `### Segment: ${segment.name}\n`;
                markdownContent += `- **Description:** ${segment.description}\n`;
                if (segment.rationale) {
                    markdownContent += `- **Rationale:** ${segment.rationale}\n`;
                }
                markdownContent += `- **Key Motivations:**\n`;
                segment.keyMotivations.forEach(m => {
                    markdownContent += `    - ${m}\n`;
                });
                if (segment.budget) {
                    markdownContent += `- **Allocated Budget:** $${(segment.budget || 0).toLocaleString()}\n`;
                }
                if (segment.creative?.notificationText) {
                    markdownContent += `- **Push Notification Text:** "${segment.creative.notificationText}"\n`;
                }
                if (segment.mediaSplit && segment.mediaSplit.length > 0) {
                     markdownContent += `- **Media Split:**\n\n`;
                     markdownContent += `| Channel   | Budget      |\n`;
                     markdownContent += `|-----------|-------------|\n`;
                     segment.mediaSplit.forEach(media => {
                         markdownContent += `| ${media.channel} | $${media.budget.toLocaleString()} |\n`;
                     });
                     markdownContent += `\n`;
                }
                markdownContent += `\n---\n\n`;

                if (segment.creative?.imageUrl) {
                    const imageData = segment.creative.imageUrl.split('base64,')[1];
                    if (imageData) {
                        segmentFolder.file('creative.jpeg', imageData, { base64: true });
                    }
                }
            }
        }
        
        zip.file('summary.md', markdownContent);

        // 3. Generate and download zip
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeCampaignName = campaign.campaignName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        a.download = `${safeCampaignName}-campaign-plan.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error("Failed to export campaign plan:", error);
        alert("An error occurred while trying to export the plan. Please check the console for details.");
    } finally {
        setIsExporting(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <header className="bg-white dark:bg-slate-800/50 shadow-sm sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Ad Campaign Planner
              {campaign?.campaignName && <span className="text-indigo-600 dark:text-indigo-400 font-medium text-xl ml-2">: {campaign.campaignName}</span>}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your AI-powered assistant for creating impactful marketing campaigns.</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        <div id="step-1-container" className="printable-section">
          <Step1ProductDetails onNext={handleDetailsSubmit} />
        </div>
        
        {isDetailsSubmitted && campaign && (
            <div id="step-2-container" className="printable-section mt-12 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                <Step2AudienceSegments campaign={campaign} setCampaign={updateCampaign} onNext={handleAudienceComplete} error={error} setError={setError} />
            </div>
        )}

        {isAudienceCompleted && campaign && (
             <div id="step-3-container" className="printable-section mt-12 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                <Step3CreativeGeneration campaign={campaign} setCampaign={updateCampaign} onNext={handleCreativeComplete} error={error} setError={setError} />
            </div>
        )}

        {isCreativeCompleted && campaign && (
            <div id="step-4-container" className="printable-section mt-12 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                <Step4BudgetSplit campaign={campaign} setCampaign={updateCampaign} error={error} setError={setError} />
            </div>
        )}
        
      </main>
      
      {isDetailsSubmitted && campaign && (
         <footer className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-[0_-2px_5px_rgba(0,0,0,0.05)] border-t border-slate-200 dark:border-slate-700 p-4 no-print">
            <div className="max-w-7xl mx-auto flex justify-end items-center gap-4">
                 <Button variant="secondary" onClick={() => window.print()}>
                    Print to PDF
                 </Button>
                 <Button onClick={handleExport} isLoading={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export as ZIP'}
                </Button>
            </div>
         </footer>
      )}
    </div>
  );
};

export default App;
