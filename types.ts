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
  targetingGuidelines?: string;
  brandGuidelines?: string;
  performanceGuidelines?: string;
  supportingDocuments?: SupportingDocument[];
  budgetAnalysis?: string;
  budgetSources?: GroundingSource[];
}