import React, { useState, useCallback } from 'react';
import { Campaign, Creative, AudienceSegment } from './types';
import StepIndicator from './components/StepIndicator';
import Step1ProductDetails from './components/steps/Step1ProductDetails';
import Step2AudienceSegments from './components/steps/Step2AudienceSegments';
import Step3CreativeGeneration from './components/steps/Step3CreativeGeneration';
import Step4BudgetSplit from './components/steps/Step4BudgetSplit';
import Step5CampaignSummary from './components/steps/Step5CampaignSummary';

const STEPS = [
  { id: 1, name: 'Campaign Details' },
  { id: 2, name: 'Audience Segments' },
  { id: 3, name: 'Creative Generation' },
  { id: 4, name: 'Budget Allocation' },
  { id: 5, name: 'Campaign Summary' },
];

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startCampaign = (details: Omit<Campaign, 'audienceSegments'>) => {
    setCampaign({ ...details, audienceSegments: [] });
    handleNext();
  };

  const updateCampaign = useCallback((updatedCampaign: Campaign) => {
    setCampaign(updatedCampaign);
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ProductDetails onNext={startCampaign} />;
      case 2:
        if (!campaign) return null;
        return <Step2AudienceSegments campaign={campaign} setCampaign={updateCampaign} onNext={handleNext} onBack={handleBack} error={error} setError={setError} />;
      case 3:
        if (!campaign) return null;
        return <Step3CreativeGeneration campaign={campaign} setCampaign={updateCampaign} onNext={handleNext} onBack={handleBack} setError={setError} />;
      case 4:
        if (!campaign) return null;
        return <Step4BudgetSplit campaign={campaign} setCampaign={updateCampaign} onNext={handleNext} onBack={handleBack} error={error} setError={setError} />;
      case 5:
        if (!campaign) return null;
        return <Step5CampaignSummary campaign={campaign} onBack={handleBack} />;
      default:
        return <div>Unknown Step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ad Campaign Planner</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your AI-powered assistant for creating impactful marketing campaigns.</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <StepIndicator steps={STEPS} currentStep={currentStep} />
        {error && currentStep !== 2 && currentStep !== 4 && ( // Hide global error for steps with local error handling
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <div className="mt-8">{renderStep()}</div>
      </main>
    </div>
  );
};

export default App;