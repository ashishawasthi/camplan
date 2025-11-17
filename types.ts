export interface AudienceSegment {
  name: string;
  description: string;
  penPortrait: string;
  keyMotivations: string[];
  imagePrompts: string[];
  notificationTexts: string[];
  isSelected?: boolean;
  creative?: Creative;
  budget?: number;
  mediaSplit?: { channel: string; budget: number }[];
  rationale?: string;
}

export interface Creative {
  id: string;
  imagePrompt: string;
  notificationText: string;
  imageUrl: string; // 1024x1024, base64 data URI
  mimeType: string;
  isGenerating?: boolean;
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
}

export interface CompetitorAnalysis {
  summary: string;
  comparisonTable: CompetitorProduct[];
}

export interface Campaign {
  campaignName: string;
  country: string;
  startDate: string;
  endDate: string;
  landingPageUrl: string;
  totalBudget: number;
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
  marketAnalysis?: string;
}