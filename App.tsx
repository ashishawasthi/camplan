
import React, { useState, useCallback } from 'react';
import { Campaign } from './types';
import Step1CampaignDetails from './components/steps/Step1CampaignDetails';
import Step2TargetAudience from './components/steps/Step2TargetAudience';
import Step3MediaPlan from './components/steps/Step3MediaPlan';
import Step4ContentStrategy from './components/steps/Step4ContentStrategy';
import Button from './components/common/Button';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { PrintIcon } from './components/icons/PrintIcon';
import StepIndicator from './components/StepIndicator';

// Assuming JSZip is available globally from the script tag in index.html
declare var JSZip: any;

const App: React.FC = () => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [isDetailsSubmitted, setIsDetailsSubmitted] = useState(false);
  const [isAudienceCompleted, setIsAudienceCompleted] = useState(false);
  const [isMediaPlanCompleted, setIsMediaPlanCompleted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const updateCampaign = useCallback((updatedCampaign: Campaign) => {
    setCampaign(updatedCampaign);
  }, []);

  const handleDetailsSubmit = (details: Omit<Campaign, 'audienceSegments'>) => {
    setError(null);
    setCampaign({ ...details, audienceSegments: [] });
    setIsDetailsSubmitted(true);
    setIsAudienceCompleted(false);
    setIsMediaPlanCompleted(false);
    setCurrentStep(2);
    setTimeout(() => document.getElementById('step-2-container')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  
  const handleAudienceComplete = () => {
    setError(null);
    setIsAudienceCompleted(true);
    setIsMediaPlanCompleted(false);
    setCurrentStep(3);
    setTimeout(() => document.getElementById('step-3-container')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleMediaPlanComplete = () => {
    setError(null);
    setIsMediaPlanCompleted(true);
    setCurrentStep(4);
    setTimeout(() => document.getElementById('step-4-container')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  
  const handleExport = async () => {
    if (!campaign) return;
    setIsExporting(true);
    try {
        const zip = new JSZip();
        let markdownContent = `# Campaign Plan: ${campaign.campaignName}\n\n`;
        // ... (Export logic logic simplified for brevity, assumes mostly similar structure but adapted for creative groups)
        // Detailed export logic would need to iterate over creativeGroups instead of single creative
        
        // Basic Metadata
        markdownContent += `## Overview\nBudget: $${campaign.paidMediaBudget}\nDates: ${campaign.startDate} - ${campaign.endDate}\n\n`;

        // Segments & Creatives
        const segmentsToExport = campaign.audienceSegments.filter(s => s.isSelected);
        for (const segment of segmentsToExport) {
            const segmentFolderName = segment.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const segmentFolder = zip.folder(segmentFolderName);
            
            markdownContent += `### Segment: ${segment.name}\n${segment.description}\n\n`;
            
            if (segment.creativeGroups) {
                for (const group of segment.creativeGroups) {
                    markdownContent += `#### Group: ${group.name} (${group.channels.join(', ')})\n`;
                    if (group.generatedCreative?.imageUrl) {
                         const imageData = group.generatedCreative.imageUrl.split('base64,')[1];
                         const fileName = `${group.name.replace(/\s+/g,'-')}.jpg`;
                         segmentFolder.file(fileName, imageData, { base64: true });
                         markdownContent += `Image saved as ${fileName}\n`;
                         markdownContent += `Headline: "${group.generatedCreative.notificationText}"\n\n`;
                    }
                }
            }
        }
        
        zip.file('campaign_plan.md', markdownContent);
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign-plan.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed.");
    } finally {
        setIsExporting(false);
    }
  };

  const steps = [
      { id: 1, name: 'Campaign Details' },
      { id: 2, name: 'Target Audience' },
      { id: 3, name: 'Media Plan' },
      { id: 4, name: 'Content Strategy' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      <header className="bg-white dark:bg-slate-800/50 shadow-sm sticky top-0 z-10 no-print">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Campaign Planner
              {campaign?.campaignName && <span className="text-indigo-600 dark:text-indigo-400 font-medium text-xl ml-2">: {campaign.campaignName}</span>}
            </h1>
          </div>
          {isDetailsSubmitted && campaign && (
            <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={handleExport} disabled={isExporting} className="!p-2">
                    {isExporting ? <div className="animate-spin h-5 w-5 border-2 border-slate-500 border-t-transparent rounded-full"></div> : <DownloadIcon className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" onClick={() => window.print()} className="!p-2"><PrintIcon className="h-5 w-5" /></Button>
            </div>
          )}
        </div>
        <div className="max-w-3xl mx-auto pb-4 px-4">
             <StepIndicator steps={steps} currentStep={currentStep} />
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        <div id="step-1-container" className="printable-section">
          <Step1CampaignDetails onNext={handleDetailsSubmit} />
        </div>
        
        {isDetailsSubmitted && campaign && (
            <div id="step-2-container" className="printable-section mt-12 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                <Step2TargetAudience campaign={campaign} setCampaign={updateCampaign} onNext={handleAudienceComplete} error={error} setError={setError} />
            </div>
        )}

        {isAudienceCompleted && campaign && (
             <div id="step-3-container" className="printable-section mt-12 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                <Step3MediaPlan campaign={campaign} setCampaign={updateCampaign} onNext={handleMediaPlanComplete} error={error} setError={setError} />
            </div>
        )}

        {isMediaPlanCompleted && campaign && (
            <div id="step-4-container" className="printable-section mt-12 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                <Step4ContentStrategy campaign={campaign} setCampaign={updateCampaign} error={error} setError={setError} />
            </div>
        )}
        
      </main>
    </div>
  );
};

export default App;
