export interface AudienceSegment {
  name: string;
  description: string;
  keyMotivations: string[];
  imagePrompt: string;
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

export interface Campaign {
  campaignName: string;
  country: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  audienceSegments: AudienceSegment[];
}