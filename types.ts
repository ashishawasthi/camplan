export interface AudienceSegment {
  name: string;
  description: string;
  keyMotivations: string[];
  imagePrompt: string;
  isSelected?: boolean;
  creative?: Creative;
  budget?: number;
  mediaSplit?: { channel: string; budget: number }[];
}

export interface Creative {
  id: string;
  prompt: string;
  imageUrl: string; // base64 data URI
  mimeType: string;
  isGenerating?: boolean;
  isEditing?: boolean;
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
  totalBudget: number;
  audienceSegments: AudienceSegment[];
  audienceInstructions?: string;
  supportingDocuments?: SupportingDocument[];
  budgetAnalysis?: string;
  budgetSources?: GroundingSource[];
}