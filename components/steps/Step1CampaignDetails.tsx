
import React, { useState, useRef } from 'react';
import { Campaign, SupportingDocument } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';
import { PencilIcon } from '../icons/PencilIcon';

interface Props {
  onNext: (details: Omit<Campaign, 'audienceSegments'>) => void;
}

type CampaignDetails = Omit<Campaign, 'audienceSegments'>;

const COUNTRIES = ['Singapore', 'Hong Kong', 'India', 'Indonesia', 'Taiwan'];
const SUPPORTED_FILE_TYPES = "image/jpeg,image/png,image/webp,application/pdf,text/plain,.txt";
const SUPPORTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const SUPPORTED_DOC_TYPES = "application/pdf,text/plain,.txt";


const Step1CampaignDetails: React.FC<Props> = ({ onNext }) => {
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
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<CampaignDetails | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [landingPageUrl, setLandingPageUrl] = useState('');
  const [paidMediaBudget, setPaidMediaBudget] = useState('10000');
  const [productDetailsUrl, setProductDetailsUrl] = useState('');
  const [importantCustomers, setImportantCustomers] = useState('');
  const [customerSegment, setCustomerSegment] = useState('');
  const [whatToTell, setWhatToTell] = useState('');
  const [customerAction, setCustomerAction] = useState('');
  const [productBenefits, setProductBenefits] = useState('');
  const [customerJob, setCustomerJob] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productDetailsDocFile, setProductDetailsDocFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const productDetailsDocInputRef = useRef<HTMLInputElement>(null);


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

  const handleProductDetailsDocChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProductDetailsDocFile(event.target.files[0]);
    }
  };
  
  const removeProductDetailsDoc = () => {
    setProductDetailsDocFile(null);
    if (productDetailsDocInputRef.current) {
      productDetailsDocInputRef.current.value = "";
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
    setError(null);

    const hasProductDetails = productDetailsUrl || productDetailsDocFile;
    if (!hasProductDetails) {
        setError("Please provide either a Product Details URL or a Product Details Document.");
        return;
    }

    if (campaignName && country && startDate && endDate && paidMediaBudget) {
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

        let productDetailsDocument: SupportingDocument | undefined = undefined;
        if (productDetailsDocFile) {
          productDetailsDocument = {
            name: productDetailsDocFile.name,
            mimeType: productDetailsDocFile.type,
            data: await fileToBase64(productDetailsDocFile),
          };
        }

        const campaignDetails: CampaignDetails = {
          campaignName,
          country,
          startDate,
          endDate,
          landingPageUrl: landingPageUrl || undefined,
          paidMediaBudget: parseFloat(paidMediaBudget),
          productImage,
          productDetailsUrl: productDetailsUrl || undefined,
          productDetailsDocument,
          importantCustomers: importantCustomers || undefined,
          customerSegment: customerSegment || undefined,
          whatToTell: whatToTell || undefined,
          customerAction: customerAction || undefined,
          productBenefits: productBenefits || undefined,
          customerJob: customerJob || undefined,
          brandValues: brandValues || undefined,
          supportingDocuments: supportingDocuments.length > 0 ? supportingDocuments : undefined,
        };
        
        setSubmittedData(campaignDetails);
        setIsSubmitted(true);
        onNext(campaignDetails);

      } catch (error) {
        console.error("Error processing files:", error);
        setError("An error occurred while processing your files. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    } else {
        setError("Please fill in all mandatory fields.");
    }
  };

  if (isSubmitted && submittedData) {
    const hasCreativeBrief = submittedData.importantCustomers || submittedData.customerSegment || submittedData.whatToTell;

    return (
      <Card className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Campaign Details</h2>
            <Button variant="ghost" onClick={() => setIsSubmitted(false)} className="no-print">
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div><strong className="font-medium text-slate-500 dark:text-slate-400">Campaign Name:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.campaignName}</span></div>
            <div><strong className="font-medium text-slate-500 dark:text-slate-400">Country:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.country}</span></div>
            <div><strong className="font-medium text-slate-500 dark:text-slate-400">Paid Media Budget:</strong> <span className="text-slate-800 dark:text-slate-200">${submittedData.paidMediaBudget.toLocaleString()}</span></div>
            <div><strong className="font-medium text-slate-500 dark:text-slate-400">Duration:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.startDate} to {submittedData.endDate}</span></div>
            
            {submittedData.landingPageUrl && (
               <div className="md:col-span-2"><strong className="font-medium text-slate-500 dark:text-slate-400">Landing Page URL:</strong> <a href={submittedData.landingPageUrl} className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">{submittedData.landingPageUrl}</a></div>
            )}
            
            {submittedData.productDetailsUrl && (
              <div className="md:col-span-2"><strong className="font-medium text-slate-500 dark:text-slate-400">Product Details URL:</strong> <a href={submittedData.productDetailsUrl} className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">{submittedData.productDetailsUrl}</a></div>
            )}
            {submittedData.productDetailsDocument && (
              <div className="md:col-span-2"><strong className="font-medium text-slate-500 dark:text-slate-400">Product Details Doc:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.productDetailsDocument.name}</span></div>
            )}
            
            {hasCreativeBrief && (
              <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                  <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Creative Brief</h3>
                  <div className="space-y-2">
                      {submittedData.importantCustomers && <div><strong className="font-medium text-slate-500 dark:text-slate-400">Target Customers:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.importantCustomers}</span></div>}
                      {submittedData.whatToTell && <div><strong className="font-medium text-slate-500 dark:text-slate-400">Key Message:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.whatToTell}</span></div>}
                  </div>
              </div>
            )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <div className="no-print">
        <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-200">Campaign Details</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Let's start by defining the basics of your new campaign.</p>
        
        {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="campaignName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Campaign Name</label>
              <input type="text" id="campaignName" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" required />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country</label>
              <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" required>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
              <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" required />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
              <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" required />
            </div>
          </div>
          
           <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="paidMediaBudget" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Paid Media Budget (S$)</label>
              <input type="number" id="paidMediaBudget" value={paidMediaBudget} onChange={(e) => setPaidMediaBudget(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" required min="100" />
            </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
             <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">Product & Destination</h3>
             <div className="space-y-6">
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Product Information (Required)</p>
                    <p className="text-xs text-slate-500 mb-4">Please provide either a product URL or upload a document describing your product. This is essential for analyzing competitors and defining audience segments.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Details URL</label>
                            <input type="url" value={productDetailsUrl} onChange={(e) => setProductDetailsUrl(e.target.value)} placeholder="https://..." className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Details Document (PDF/TXT)</label>
                              <div className="mt-1 flex items-center gap-2">
                                <input ref={productDetailsDocInputRef} type="file" onChange={handleProductDetailsDocChange} accept={SUPPORTED_DOC_TYPES} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                {productDetailsDocFile && (
                                    <button type="button" onClick={removeProductDetailsDoc} className="text-red-500 hover:text-red-700" title="Remove file">
                                      &times;
                                    </button>
                                )}
                              </div>
                          </div>
                     </div>
                 </div>

                 <div>
                    <label htmlFor="landingPageUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Landing Page URL (Optional)</label>
                    <input type="url" id="landingPageUrl" value={landingPageUrl} onChange={(e) => setLandingPageUrl(e.target.value)} placeholder="https://..." className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" />
                    <p className="mt-1 text-xs text-slate-500">If provided, this will be used for content generation.</p>
                 </div>
             </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-6">
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Creative Brief (Optional)</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">1. Who is the most important group of customers?</label>
                <textarea rows={2} value={importantCustomers} onChange={(e) => setImportantCustomers(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">2. What do you want to tell them?</label>
                <textarea rows={2} value={whatToTell} onChange={(e) => setWhatToTell(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">3. What do you want them to do?</label>
                <textarea rows={2} value={customerAction} onChange={(e) => setCustomerAction(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">4. Brand Values</label>
                <textarea rows={2} value={brandValues} onChange={(e) => setBrandValues(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600" />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-6">
                   <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Additional Assets (Optional)</h3>
                   
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Image</label>
                      <input ref={productImageInputRef} type="file" onChange={handleProductImageChange} accept={SUPPORTED_IMAGE_TYPES} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Supporting Documents</label>
                    <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} accept={SUPPORTED_FILE_TYPES} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-700 p-1 rounded">
                             <span>{file.name}</span>
                             <button type="button" onClick={() => removeFile(file)} className="text-red-500">&times;</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isProcessing}>{isProcessing ? 'Processing...' : 'Target Audience'}</Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default Step1CampaignDetails;