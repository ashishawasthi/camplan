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
    if (campaignName && country && startDate && endDate && paidMediaBudget && landingPageUrl) {
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

        const campaignDetails: CampaignDetails = {
          campaignName,
          country,
          startDate,
          endDate,
          landingPageUrl: landingPageUrl,
          paidMediaBudget: parseFloat(paidMediaBudget),
          productImage,
          productDetailsUrl: productDetailsUrl || undefined,
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
        // Here you might want to set an error state to show the user
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const renderSummaryValue = (value?: string | string[] | number | SupportingDocument | SupportingDocument[]) => {
      if (!value) return <span className="text-slate-400 italic">Not provided</span>;
      if (typeof value === 'string' || typeof value === 'number') return value;
      if (Array.isArray(value)) {
          if (value.length === 0) return <span className="text-slate-400 italic">None</span>;
          return (
              <ul className="list-disc list-inside">
                  {value.map((item: any, index: number) => <li key={index}>{item.name || item}</li>)}
              </ul>
          );
      }
      if (typeof value === 'object' && 'name' in value) return value.name;
      return <span className="text-slate-400 italic">Invalid data</span>;
  };

  if (isSubmitted && submittedData) {
    const hasCreativeBrief =
      submittedData.importantCustomers ||
      submittedData.customerSegment ||
      submittedData.whatToTell ||
      submittedData.customerAction ||
      submittedData.productBenefits ||
      submittedData.customerJob ||
      submittedData.brandValues;

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
            <div className="md:col-span-2"><strong className="font-medium text-slate-500 dark:text-slate-400">Landing Page URL:</strong> <a href={submittedData.landingPageUrl} className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">{submittedData.landingPageUrl}</a></div>
            
            {submittedData.productDetailsUrl && (
              <div className="md:col-span-2"><strong className="font-medium text-slate-500 dark:text-slate-400">Product Details URL:</strong> <a href={submittedData.productDetailsUrl} className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">{submittedData.productDetailsUrl}</a></div>
            )}
            
            {hasCreativeBrief && (
              <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                  <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Creative Brief</h3>
                  <div className="space-y-2">
                      {submittedData.importantCustomers && <div><strong className="font-medium text-slate-500 dark:text-slate-400">1. Target Customers:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.importantCustomers}</span></div>}
                      {submittedData.customerSegment && <div><strong className="font-medium text-slate-500 dark:text-slate-400">2. Customer Segment:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.customerSegment}</span></div>}
                      {submittedData.whatToTell && <div><strong className="font-medium text-slate-500 dark:text-slate-400">3. Key Message:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.whatToTell}</span></div>}
                      {submittedData.customerAction && <div><strong className="font-medium text-slate-500 dark:text-slate-400">4. Desired Action/Feeling:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.customerAction}</span></div>}
                      {submittedData.productBenefits && <div><strong className="font-medium text-slate-500 dark:text-slate-400">5. Product Benefits/Promotions:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.productBenefits}</span></div>}
                      {submittedData.customerJob && <div><strong className="font-medium text-slate-500 dark:text-slate-400">6. Customer Job-to-be-done:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.customerJob}</span></div>}
                      {submittedData.brandValues && <div><strong className="font-medium text-slate-500 dark:text-slate-400">7. Brand Values:</strong> <span className="text-slate-800 dark:text-slate-200">{submittedData.brandValues}</span></div>}
                  </div>
              </div>
            )}
            
            {(submittedData.productImage || (submittedData.supportingDocuments && submittedData.supportingDocuments.length > 0)) && (
              <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                  <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Assets</h3>
                  <div className="space-y-2">
                      {submittedData.productImage && <div><strong className="font-medium text-slate-500 dark:text-slate-400">Product Image:</strong> <span className="text-slate-800 dark:text-slate-200">{renderSummaryValue(submittedData.productImage)}</span></div>}
                      {submittedData.supportingDocuments && submittedData.supportingDocuments.length > 0 && <div><strong className="font-medium text-slate-500 dark:text-slate-400">Supporting Documents:</strong> <span className="text-slate-800 dark:text-slate-200">{renderSummaryValue(submittedData.supportingDocuments)}</span></div>}
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
              <label htmlFor="paidMediaBudget" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Paid Media Budget (S$)
              </label>
              <input
                type="number"
                id="paidMediaBudget"
                value={paidMediaBudget}
                onChange={(e) => setPaidMediaBudget(e.target.value)}
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
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Creative Brief (Optional)</h3>
              <div>
                <label htmlFor="importantCustomers" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  1. Who is the most important group of customers you want to say this to?
                </label>
                <textarea
                  id="importantCustomers"
                  rows={2}
                  value={importantCustomers}
                  onChange={(e) => setImportantCustomers(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                  placeholder="e.g., Young professionals aged 25-35"
                />
              </div>
               <div>
                <label htmlFor="customerSegment" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  2. Which segment does this group of customers belongs to?
                </label>
                <textarea
                  id="customerSegment"
                  rows={2}
                  value={customerSegment}
                  onChange={(e) => setCustomerSegment(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                  placeholder="e.g., 'Ambitious Achievers', 'Travel Enthusiasts', existing affluent customers."
                />
              </div>
               <div>
                <label htmlFor="whatToTell" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  3. What do you want to tell them?
                </label>
                <textarea
                  id="whatToTell"
                  rows={2}
                  value={whatToTell}
                  onChange={(e) => setWhatToTell(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                  placeholder="e.g., Our new credit card offers the best travel rewards and exclusive dining perks."
                />
              </div>
               <div>
                <label htmlFor="customerAction" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  4. What do you want your customers to do / think / feel?
                </label>
                <textarea
                  id="customerAction"
                  rows={2}
                  value={customerAction}
                  onChange={(e) => setCustomerAction(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                  placeholder="e.g., Sign up for the new card, feel excited about their next trip, feel smart about their finances."
                />
              </div>
               <div>
                <label htmlFor="productBenefits" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  5. What are your product benefits or promotion mechanics?
                </label>
                <textarea
                  id="productBenefits"
                  rows={2}
                  value={productBenefits}
                  onChange={(e) => setProductBenefits(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                  placeholder="e.g., 5% cashback on flights, no annual fee for the first year, complimentary lounge access."
                />
              </div>
               <div>
                <label htmlFor="customerJob" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  6. What is the customer job to be done?
                </label>
                <textarea
                  id="customerJob"
                  rows={2}
                  value={customerJob}
                  onChange={(e) => setCustomerJob(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                  placeholder="e.g., To save money on their next vacation, to simplify their expense tracking."
                />
              </div>
               <div>
                <label htmlFor="brandValues" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  7. Your campaign demonstrates the following brand values:
                </label>
                <textarea
                  id="brandValues"
                  rows={2}
                  value={brandValues}
                  onChange={(e) => setBrandValues(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                  placeholder="e.g., Empowerment, reliability, innovation, customer-centric."
                />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-6">
                   <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Additional Context (Optional)</h3>
                  <div>
                    <label htmlFor="productDetailsUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Product Details URL
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Provide a link to the product page for more detailed analysis and competitor research.</p>
                    <input
                      type="url"
                      id="productDetailsUrl"
                      value={productDetailsUrl}
                      onChange={(e) => setProductDetailsUrl(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-600"
                      placeholder="https://yourbank.com/products/your-credit-card"
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
                              <button type="button" onClick={removeProductImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center font-bold text-sm no-print">&times;</button>
                          </div>
                      ) : (
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                              <div className="space-y-1 text-center">
                                  <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  <div className="flex text-sm text-slate-600 dark:text-slate-400">
                                      <button type="button" onClick={() => productImageInputRef.current?.click()} className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 no-print">
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
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 no-print">
                            <span>Upload files</span>
                          </button>
                          <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept={SUPPORTED_FILE_TYPES} />
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-500">JPG, PNG, WEBP, PDF, TXT</p>
                      </div>
                    </div>
                     {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between text-sm bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md">
                             <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{file.name}</span>
                             <button type="button" onClick={() => removeFile(file)} className="text-red-500 hover:text-red-700 font-bold no-print">&times;</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isProcessing}>
              {isProcessing ? 'Processing...' : 'Generate Audience Segments'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default Step1ProductDetails;