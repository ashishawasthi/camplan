
export interface Creative {
  id: string;
  imagePrompt: string;
  notificationText: string;
  imageUrl: string; // base64 data URI
  mimeType: string;
  isGenerating?: boolean;
}

export interface CreativeGroup {
    name: string; // e.g., "Social Stories", "Feed Posts"
    aspectRatio: '1:1' | '9:16' | '16:9';
    channels: string[];
    imagePrompts: string[];
    headlines: string[]; // Replaces notificationTexts for broader usage
    pushNotes?: string[]; // Text for owned media/push notifications
    generatedCreative?: Creative;
    selectedPromptIndex?: number;
    selectedHeadlineIndex?: number;
}

export interface AudienceSegment {
  name: string;
  description: string;
  penPortrait: string;
  keyMotivations: string[];
  imageSearchKeywords: string[];
  // Legacy fields (optional now, as we generate in step 4)
  imagePrompts?: string[]; 
  notificationTexts?: string[]; 
  
  isSelected?: boolean;
  budget?: number;
  mediaSplit?: { channel: string; budget: number }[];
  rationale?: string;
  
  // New field for grouped creatives
  creativeGroups?: CreativeGroup[];
  // Legacy/Simplified creative field
  creative?: Creative;
}

export interface SupportingDocument {
  name: string;
  mimeType: string;
  data: string; // base64 encoded string
}

export interface GroundingSource {
    title: string;
    uri: string;
}

export interface CompetitorProduct {
  productName: string;
  brand: string;
  keyFeatures: string[];
  targetAudience: string;
  prosVsCons?: string;
}

export interface CompetitorAnalysis {
  summary: string;
  comparisonTable: CompetitorProduct[];
}

export interface OwnedMediaAnalysis {
  isApplicable: boolean;
  justification: string;
  analysisRecommendations: string;
  recommendedChannels?: string[];
}

export interface Campaign {
  campaignName: string;
  country: string;
  startDate: string;
  endDate: string;
  landingPageUrl: string;
  paidMediaBudget: number;
  audienceSegments: AudienceSegment[];
  segmentSources?: GroundingSource[];
  productImage?: SupportingDocument;
  productDetailsUrl?: string;
  importantCustomers?: string;
  customerSegment?: string;
  whatToTell?: string;
  customerAction?: string;
  productBenefits?: string;
  customerJob?: string;
  brandValues?: string;
  supportingDocuments?: SupportingDocument[];
  budgetAnalysis?: string;
  budgetSources?: GroundingSource[];
  competitorAnalysis?: CompetitorAnalysis;
  proposition?: string;
  ownedMediaAnalysis?: OwnedMediaAnalysis;
}
