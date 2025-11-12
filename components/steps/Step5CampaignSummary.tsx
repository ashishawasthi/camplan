import React, { useState } from 'react';
import { Campaign } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';

declare var JSZip: any;

interface Props {
  campaign: Campaign;
  onBack: () => void;
}

type PreviewMode = 'website' | 'square';

const Step5CampaignSummary: React.FC<Props> = ({ campaign, onBack }) => {
  const [activePreviews, setActivePreviews] = useState<{ [key: number]: PreviewMode }>(
    () => Object.fromEntries(campaign.audienceSegments.map((_, i) => [i, 'website']))
  );
  const [isExporting, setIsExporting] = useState(false);
  
  const setActivePreview = (index: number, mode: PreviewMode) => {
    setActivePreviews(prev => ({ ...prev, [index]: mode }));
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

        if (campaign.budgetAnalysis) {
            markdownContent += `## 2. Strategic Analysis\n`;
            markdownContent += `${campaign.budgetAnalysis}\n\n`;
        }

        if (campaign.budgetSources && campaign.budgetSources.length > 0) {
            markdownContent += `**Sources:**\n`;
            campaign.budgetSources.forEach(source => {
                markdownContent += `- [${source.title}](${source.uri})\n`;
            });
            markdownContent += `\n`;
        }
        
        markdownContent += `## 3. Audience Segments & Creatives\n\n`;

        // 2. Loop through segments
        for (const segment of campaign.audienceSegments) {
            const segmentFolderName = segment.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            const segmentFolder = zip.folder(segmentFolderName);

            markdownContent += `### Segment: ${segment.name}\n`;
            markdownContent += `- **Description:** ${segment.description}\n`;
            markdownContent += `- **Key Motivations:**\n`;
            segment.keyMotivations.forEach(m => {
                markdownContent += `    - ${m}\n`;
            });
            markdownContent += `- **Allocated Budget:** $${(segment.budget || 0).toLocaleString()}\n`;
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

            if (segment.creative) {
                // Hero image
                const websiteImgData = segment.creative.imageUrls.website.split('base64,')[1];
                if (websiteImgData) {
                    segmentFolder.file('hero.jpeg', websiteImgData, { base64: true });
                }
                
                // Square image
                const squareImgData = segment.creative.imageUrls.square.split('base64,')[1];
                if (squareImgData) {
                    segmentFolder.file('square.jpeg', squareImgData, { base64: true });
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
        {campaign.audienceSegments.map((segment, index) => {
           const previewMode = activePreviews[index] || 'website';
           return (
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
                    <div className={`w-full bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center justify-center relative ${previewMode === 'square' ? 'aspect-square' : 'aspect-video'}`}>
                      <img src={segment.creative.imageUrls[activePreviews[index]]} alt={`Ad for ${segment.name}`} className="object-contain w-full h-full rounded-lg" />
                      <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-md flex gap-1">
                        <button onClick={() => setActivePreview(index, 'website')} className={`px-2 py-1 text-xs rounded ${activePreviews[index] === 'website' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-black'}`}>Hero</button>
                        <button onClick={() => setActivePreview(index, 'square')} className={`px-2 py-1 text-xs rounded ${activePreviews[index] === 'square' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-black'}`}>Square</button>
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
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleExport} isLoading={isExporting}>
          {isExporting ? 'Exporting...' : 'Finalize & Export Plan'}
        </Button>
      </div>
    </div>
  );
};

export default Step5CampaignSummary;
