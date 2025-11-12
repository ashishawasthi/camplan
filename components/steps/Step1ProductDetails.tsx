import React, { useState, useRef } from 'react';
import { Campaign, SupportingDocument } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';

interface Props {
  onNext: (details: Omit<Campaign, 'audienceSegments'>) => void;
}

const COUNTRIES = ['Singapore', 'Hong Kong', 'India', 'Indonesia', 'Taiwan'];
const SUPPORTED_FILE_TYPES = "image/*,text/plain,text/markdown,.md,.txt,application/pdf";
const SUPPORTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";


const Step1ProductDetails: React.FC<Props> = ({ onNext }) => {
  const getInitialDates = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const twoMonthsLater = new Date(tomorrow);
    twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

    return {
      start: tomorrow.toISOString().split('T')[0],
      end: twoMonthsLater.toISOString().split('T')[0],
    };
  };
  
  const initialDates = getInitialDates();

  const [campaignName, setCampaignName] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [landingPageUrl, setLandingPageUrl] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [targetingGuidelines, setTargetingGuidelines] = useState('');
  const [brandGuidelines, setBrandGuidelines] = useState('');
  const [performanceGuidelines, setPerformanceGuidelines] = useState('');
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files!)]);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };
  
  const handleProductImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProductImageFile(event.target.files[0]);
    }
  };
  
  const removeProductImage = () => {
    setProductImageFile(null);
    if (productImageInputRef.current) {
      productImageInputRef.current.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (campaignName && country && startDate && endDate && totalBudget && landingPageUrl) {
      setIsProcessing(true);
      try {
        const supportingDocuments: SupportingDocument[] = await Promise.all(
          selectedFiles.map(async (file) => ({
            name: file.name,
            mimeType: file.type,
            data: await fileToBase64(file),
          }))
        );
        
        let productImage: SupportingDocument | undefined = undefined;
        if (productImageFile) {
          productImage = {
            name: productImageFile.name,
            mimeType: productImageFile.type,
            data: await fileToBase64(productImageFile),
          };
        }

        onNext({
          campaignName,
          country,
          startDate,
          endDate,
          landingPageUrl: landingPageUrl,
          totalBudget: parseFloat(totalBudget),
          productImage,
          targetingGuidelines: targetingGuidelines || undefined,
          brandGuidelines: brandGuidelines || undefined,
          performanceGuidelines: performanceGuidelines || undefined,
          supportingDocuments: supportingDocuments.length > 0 ? supportingDocuments : undefined,
        });
      } catch (error) {
        console.error("Error processing files:", error);
        // Here you might want to set an error state to show the user
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200">Campaign Details</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Let's start by defining the basics of your new campaign.</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* -- Basic Details -- */}
        <div>
          <label htmlFor="campaignName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Campaign Name
          </label>
          <input
            type="text"
            id="campaignName"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
            placeholder="e.g., '5% cashback on selected restaurents during holiday season'"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Country
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
              required
            >
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="totalBudget" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Total Budget (S$)
            </label>
            <input
              type="number"
              id="totalBudget"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
              placeholder="e.g., 50000"
              required
              min="100"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
              required
              min={startDate}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="landingPageUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Landing Page URL
          </label>
          <input
            type="url"
            id="landingPageUrl"
            value={landingPageUrl}
            onChange={(e) => setLandingPageUrl(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
            placeholder="https://yourbank.com/promo/cashback-offer"
            required
          />
        </div>
        
        {/* -- Optional Context -- */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-6">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Guidelines & Context (Optional)</h3>
            <div>
              <label htmlFor="targetingGuidelines" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Targeting Guidelines
              </label>
              <textarea
                id="targetingGuidelines"
                rows={4}
                value={targetingGuidelines}
                onChange={(e) => setTargetingGuidelines(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                placeholder={`e.g.,\n- Focus on young professionals aged 25-35.\n- Exclude existing customers who already have a credit card with us.\n- Prioritize users interested in travel and dining.`}
              />
            </div>
            <div>
              <label htmlFor="brandGuidelines" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Brand Guidelines
              </label>
              <textarea
                id="brandGuidelines"
                rows={4}
                value={brandGuidelines}
                onChange={(e) => setBrandGuidelines(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                placeholder={`e.g.,\n- Tone: friendly, reassuring, and professional.\n- Visuals: Use warm colors, avoid stock photos of models.\n- Exclude imagery related to gambling or alcohol.`}
              />
            </div>
            <div>
              <label htmlFor="performanceGuidelines" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Spend Guidelines
              </label>
              <textarea
                id="performanceGuidelines"
                rows={4}
                value={performanceGuidelines}
                onChange={(e) => setPerformanceGuidelines(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                placeholder={`e.g.,\n- Primary KPI is new account sign-ups.\n- Prioritize segments with high engagement on Instagram.\n- Allocate more budget towards the end of the campaign period.`}
              />
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Product Image
                </label>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Upload an image of your product to feature it in the generated ad creatives.</p>
                {productImageFile ? (
                    <div className="mt-2 relative w-48">
                        <img src={URL.createObjectURL(productImageFile)} alt="Product preview" className="w-full rounded-md shadow-sm"/>
                        <button type="button" onClick={removeProductImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center font-bold text-sm">&times;</button>
                    </div>
                ) : (
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-slate-600 dark:text-slate-400">
                                <button type="button" onClick={() => productImageInputRef.current?.click()} className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                <span>Upload an image</span>
                                </button>
                                <input ref={productImageInputRef} id="product-image-upload" name="product-image-upload" type="file" className="sr-only" onChange={handleProductImageChange} accept={SUPPORTED_IMAGE_TYPES} />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-500">PNG, JPG up to 10MB</p>
                        </div>
                    </div>
                )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Supporting Documents
              </label>
               <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Provide any extra documents (e.g., creative briefs, product descriptions) for context.</p>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  <div className="flex text-sm text-slate-600 dark:text-slate-400">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Upload files</span>
                    </button>
                    <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept={SUPPORTED_FILE_TYPES} />
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">PDF, TXT, MD, images etc.</p>
                </div>
              </div>
               {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md">
                       <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{file.name}</span>
                       <button type="button" onClick={() => removeFile(file)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isProcessing}>
            {isProcessing ? 'Processing...' : 'Define Audience'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default Step1ProductDetails;