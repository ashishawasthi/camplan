
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { AudienceSegment, SupportingDocument, GroundingSource, CompetitorAnalysis, OwnedMediaAnalysis, CreativeGroup } from '../types';
import { runGenerateContent } from './geminiClient';

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY ?? 'MISSING_API_KEY' });

export const getAudienceSegments = async (
  campaignName: string,
  paidMediaBudget: number,
  durationDays: number,
  country: string,
  landingPageUrl: string,
  productDetailsUrl?: string,
  importantCustomers?: string,
  customerSegment?: string,
  whatToTell?: string,
  customerAction?: string,
  productBenefits?: string,
  customerJob?: string,
  brandValues?: string,
  supportingDocuments?: SupportingDocument[],
  productImage?: SupportingDocument,
  instructions?: string,
): Promise<{ segments: AudienceSegment[], sources: GroundingSource[], competitorAnalysis?: CompetitorAnalysis, proposition?: string }> => {
  let prompt = `
    As a marketing expert for a consumer bank in ${country}, your task is to identify 3-5 distinct target audience segments for a new ad campaign titled "${campaignName}".
    The campaign has a paid media budget of $${paidMediaBudget} and will run for ${durationDays} days.
  `;

  if (productDetailsUrl) {
      prompt += `
      First, analyze the provided product details page for our product: ${productDetailsUrl}.
      Second, use Google Search to identify 2-3 key competitors for this product in ${country}.
      Third, create a competitor comparison table. For your product (labeled with brand 'Our Bank') and each competitor, include: Product Name, Brand, Key Features (as a list of strings), and a description of their primary Target Audience.
      Fourth, provide a brief summary of your findings from this competitive analysis, highlighting our product's key differentiators or weaknesses.
      `;
  }

  prompt += `
    Next, use Google Search to research the current market for this type of product/service in ${country}. Look for consumer trends, competitor strategies, and relevant demographic/psychographic data.
    Then, analyze the content of the campaign's landing page, which contains the core offer and details: ${landingPageUrl}.
    After that, provide a "Proposition" section. This should be a concise summary of your key findings from the web search and the product/landing page content. It should discuss why customers should choose our product or service, focusing on the unique benefits and value it delivers.
    
    Finally, based on ALL your analysis, define each audience segment with the following properties:
    1. A short, descriptive name.
    2. A "Pen Portrait": A short, narrative description of a fictional individual who represents this segment. Give them a name, age, occupation, and briefly describe a day in their life.
    3. A detailed description of the segment's demographics, lifestyle, and psychographics.
    4. A "rationale" explaining your reasoning, referencing specific insights.
    5. A list of their key motivations for banking products.
    6. A list of 5-7 concise keywords for searching an existing internal ad image repository (as 'imageSearchKeywords').
    
    Note: We will generate specific creative prompts in a later step, so focus here on the deep understanding of the audience.
  `;

  // ... Context injection logic (same as before) ...
  const creativeBriefParts: string[] = [];
  if (importantCustomers) creativeBriefParts.push(`- Who is the most important group of customers you want to say this to? ${importantCustomers}`);
  if (customerSegment) creativeBriefParts.push(`- Which segment does this group of customers belongs to? ${customerSegment}`);
  if (whatToTell) creativeBriefParts.push(`- What do you want to tell them? ${whatToTell}`);
  if (customerAction) creativeBriefParts.push(`- What do you want your customers to do / think / feel? ${customerAction}`);
  if (productBenefits) creativeBriefParts.push(`- What are your product benefits or promotion mechanics? ${productBenefits}`);
  if (customerJob) creativeBriefParts.push(`- What is the customer job to be done? ${customerJob}`);
  if (brandValues) creativeBriefParts.push(`- Your campaign demonstrates the following brand values: ${brandValues}`);
  
  if (creativeBriefParts.length > 0) {
    prompt += `\n\nYour segmentation must be guided by this creative brief:\n${creativeBriefParts.join('\n')}`;
  }
  
  const contextInstructions: string[] = [];
  if (productImage) contextInstructions.push("a product image");
  if (supportingDocuments && supportingDocuments.length > 0) contextInstructions.push("the attached document(s)");

  if (contextInstructions.length > 0) {
    prompt += `\n\nUse the content of ${contextInstructions.join(' and ')} as context.`;
  }
  
  if (instructions) {
    prompt += `\n\nAn additional instruction was provided by the user: "${instructions}"`;
  }
  
  prompt += `\n\nYour final output MUST be a single, valid JSON object. No markdown formatting. Structure:
{`;
  if (productDetailsUrl) {
      prompt += `
  "competitorAnalysis": {
    "summary": "string",
    "comparisonTable": [{ "productName": "string", "brand": "string", "keyFeatures": ["string"], "targetAudience": "string" }]
  },`;
  }
  prompt += `
  "proposition": "string",
  "segments": [
    {
      "name": "string",
      "penPortrait": "string",
      "description": "string",
      "rationale": "string",
      "keyMotivations": ["string"],
      "imageSearchKeywords": ["string"]
    }
  ]
}`;

  const parts: Part[] = [{ text: prompt }];
  if (productImage) parts.push({ inlineData: { mimeType: productImage.mimeType, data: productImage.data } });
  if (supportingDocuments) {
    for (const doc of supportingDocuments) {
      parts.push({ inlineData: { mimeType: doc.mimeType, data: doc.data } });
    }
  }

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-pro',
      contents: { parts },
      config: { tools: [{googleSearch: {}}] }
    });
    
    const jsonText = response.text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText);
    const segmentsWithSelection: AudienceSegment[] = parsed.segments.map((segment: Omit<AudienceSegment, 'isSelected'>) => ({
      ...segment,
      isSelected: true,
    }));

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = groundingChunks
      .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
      .map(chunk => ({ uri: chunk.web!.uri!, title: chunk.web!.title! }));

    return { 
        segments: segmentsWithSelection, 
        sources,
        competitorAnalysis: parsed.competitorAnalysis,
        proposition: parsed.proposition,
    };

  } catch (error) {
    console.error("Error fetching audience segments:", error);
    throw new Error("Failed to generate target audience.");
  }
};

export const generateCreativeStrategy = async (
    segment: AudienceSegment,
    channels: string[],
    campaignContext: string,
    instructions?: string
): Promise<CreativeGroup[]> => {
    let prompt = `
        As a Creative Director, develop a content strategy for the audience segment: "${segment.name}".
        Segment Description: ${segment.description}
        Pen Portrait: ${segment.penPortrait}
        Key Motivations: ${segment.keyMotivations.join(', ')}
        
        Campaign Context: ${campaignContext}
        
        Active Media Channels: ${channels.join(', ')}

        Based on the active channels, categorize them into appropriate Creative Groups (e.g., "Social Stories" for TikTok/Instagram, "Feed Ads" for Facebook/LinkedIn/Display, "Owned" for Email).
        
        For EACH group, provide:
        1. A Group Name.
        2. The Aspect Ratio (Use "9:16" for stories/vertical video, "1:1" for feeds/display, "16:9" for headers/banners).
        3. The channels belonging to this group.
        4. 3 distinct, highly descriptive Image Prompts suitable for generating a high-quality ad image in that format.
           - Ensure the prompt describes the composition to fit the aspect ratio (e.g. "vertical shot" for 9:16).
           - Do NOT use real brand names.
        5. 3 distinct Headlines or Notification Texts (short, punchy copy) suitable for these channels.

        ${instructions ? `Additional User Instructions: ${instructions}` : ''}

        Output ONLY valid JSON:
        [
            {
                "name": "string",
                "aspectRatio": "1:1" | "9:16" | "16:9",
                "channels": ["string"],
                "imagePrompts": ["string", "string", "string"],
                "headlines": ["string", "string", "string"]
            }
        ]
    `;

    try {
        const response = await runGenerateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        
        const jsonText = response.text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating creative strategy:", error);
        throw new Error("Failed to generate creative strategy.");
    }
}

export const generateImagenImage = async (prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1', instructions?: string): Promise<{ base64: string; mimeType: string }> => {
  let fullPrompt = prompt;
  if (instructions) fullPrompt += `\n\nAdditional instructions: "${instructions}"`;

  try {
      const ai = getAiClient();
      // Using Imagen 3 (via generateImages) for high quality and aspect ratio control
      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: fullPrompt,
          config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: aspectRatio,
          },
      });
      
      const image = response.generatedImages?.[0]?.image;
      if (image?.imageBytes) {
          return { base64: image.imageBytes, mimeType: 'image/jpeg' };
      }
       throw new Error('No image data received from API.');

  } catch (error) {
    console.error('Error generating image:', error);
    // Fallback or helpful error
    throw new Error('Failed to generate image with Imagen.');
  }
};

export const generateImageFromProduct = async (
  productImage: SupportingDocument, 
  prompt: string,
  instructions?: string,
): Promise<{ base64: string; mimeType: string }> => {
  // gemini-2.5-flash-image does not support aspect ratio config in the simple way. 
  // We will stick to 1:1 generation or rely on the model to interpret composition from prompt.
  let fullPrompt = `Using the provided product image, create a new photorealistic image: "${prompt}". Maintain realistic scale. Output a square 1:1 image.`;
  if (instructions) fullPrompt += `\n\nInstruction: "${instructions}"`;
  
  const imagePart = { inlineData: { data: productImage.data, mimeType: productImage.mimeType } };
  const textPart = { text: fullPrompt };

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
    throw new Error('No image data received.');
  } catch (error) {
    console.error('Error generating image from product:', error);
    throw new Error('Failed to generate product placement image.');
  }
};

export const generateNotificationText = async (prompt: string, landingPageUrl: string, brandValues?: string, instructions?: string): Promise<string> => {
    let fullPrompt = `Generate a concise marketing copy/headline based on: "${prompt}". Link: ${landingPageUrl}.`;
    if (brandValues) fullPrompt += `\nValues: ${brandValues}`;
    if (instructions) fullPrompt += `\nInstruction: "${instructions}"`;
    fullPrompt += "\nReturn only the text.";

    try {
      const response = await runGenerateContent({ model: 'gemini-2.5-flash', contents: fullPrompt });
      return response.text.trim().replace(/^"|"$/g, '');
    } catch (error) {
      console.error("Error generating text:", error);
      throw new Error("Failed to generate text.");
    }
};

export const editNotificationText = async (originalText: string, editPrompt: string, landingPageUrl: string, brandValues?: string): Promise<string> => {
    let fullPrompt = `Revise this marketing text: "${originalText}". Instruction: "${editPrompt}". Link: ${landingPageUrl}.`;
    if (brandValues) fullPrompt += `\nValues: ${brandValues}`;
    fullPrompt += "\nReturn only the revised text.";

    try {
      const response = await runGenerateContent({ model: 'gemini-2.5-flash', contents: fullPrompt });
      return response.text.trim().replace(/^"|"$/g, '');
    } catch (error) {
      throw new Error("Failed to edit text.");
    }
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<{ base64: string; mimeType: string }> => {
  const imagePart = { inlineData: { data: base64Image, mimeType } };
  const textPart = { text: prompt };
  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
      config: { responseModalities: [Modality.IMAGE] },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    throw new Error('No edited image data.');
  } catch (error) {
    throw new Error('Failed to edit image.');
  }
};

export const getBudgetSplit = async (
  segments: AudienceSegment[], 
  paidMediaBudget: number,
  country: string,
  campaignName: string,
  landingPageUrl: string,
  customerAction?: string,
  productBenefits?: string,
  instructions?: string
): Promise<{ 
  analysis: string; 
  splits: { segmentName: string; allocatedBudget: number; mediaSplit: { channel: string; budget: number }[] }[];
  sources: GroundingSource[];
}> => {
  const segmentDetails = segments.map(s => `Segment "${s.name}": ${s.description}`).join('\n');
  let prompt = `
    As a digital marketing strategist for a consumer bank in ${country}, propose a budget allocation for campaign "${campaignName}".
    Budget: $${paidMediaBudget}. Landing Page: ${landingPageUrl}.
    Segments:
    ${segmentDetails}
  `;

  if (customerAction) prompt += `\nGoal: "${customerAction}"`;
  if (productBenefits) prompt += `\nOffer: "${productBenefits}"`;
  
  prompt += `
    First, analyze the digital marketing landscape in ${country} for financial products using Search. Justify your strategy.
    Second, propose a budget split across segments, and then across channels (Facebook, Instagram, Google Search, Google Display, TikTok, YouTube, LinkedIn).

    Output ONLY valid JSON:
    {
      "analysis": "string (markdown)",
      "budgetSplits": [
        { "segmentName": "string", "allocatedBudget": number, "mediaSplit": [{ "channel": "string", "budget": number }] }
      ]
    }
  `;
  
  if (instructions) prompt += `\nInstruction: ${instructions}`;

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: { tools: [{googleSearch: {}}] }
    });

    const jsonText = response.text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = groundingChunks
      .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
      .map(chunk => ({ uri: chunk.web!.uri!, title: chunk.web!.title! }));

    return { analysis: parsed.analysis, splits: parsed.budgetSplits, sources };
  } catch (error) {
    throw new Error("Failed to generate budget split.");
  }
};

export const getOwnedMediaAnalysis = async (
  campaignName: string,
  segments: AudienceSegment[],
  importantCustomers?: string,
  customerSegment?: string,
): Promise<OwnedMediaAnalysis> => {
    let prompt = `
        Analyze if campaign "${campaignName}" is suitable for Owned Media targeting.
        Segments: ${segments.map(s => s.name).join(', ')}.
        ${importantCustomers ? `Target: ${importantCustomers}` : ''}
        
        Output ONLY valid JSON:
        {
          "isApplicable": boolean,
          "justification": "string",
          "analysisRecommendations": "string (markdown)",
          "recommendedChannels": ["string"]
        }
    `;

    try {
        const response = await runGenerateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
        });
        const jsonText = response.text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(jsonText);
    } catch (error) {
        throw new Error("Failed to generate owned media analysis.");
    }
};
