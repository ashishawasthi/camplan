export interface AudienceSegment {
  name: string;
  description: string;
  keyMotivations: string[];
  imagePrompt: string;
  notificationTextPrompt: string;
  isSelected?: boolean;
  creative?: Creative;
  budget?: number;
  mediaSplit?: { channel: string; budget: number }[];
}

export interface Creative {
  id: string;
  imagePrompt: string;
  notificationText: string;
  imageUrls: {
    square: string; // 1080x1080, base64 data URI
    website: string; // 1920x1080, base64 data URI
  };
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

export interface Campaign {
  campaignName: string;
  country: string;
  startDate: string;
  endDate: string;
  landingPageUrl: string;
  totalBudget: number;
  audienceSegments: AudienceSegment[];
  productImage?: SupportingDocument;
  targetingGuidelines?: string;
  brandGuidelines?: string;
  performanceGuidelines?: string;
  supportingDocuments?: SupportingDocument[];
  budgetAnalysis?: string;
  budgetSources?: GroundingSource[];
}