import { GoogleGenAI, Modality } from '@google/genai';
import { AudienceSegment, SupportingDocument, GroundingSource, CompetitorAnalysis, OwnedMediaAnalysis, CreativeGroup } from '../types';
import { runGenerateContent } from './geminiClient';

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

// Helper to robustly extract JSON from markdown code blocks or raw text
const extractJson = (text: string) => {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
        return match[1];
    }
    return text.trim();
};

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
      Third, create a DETAILED competitor comparison table. For your product (labeled with brand 'Our Bank') and each competitor, include:
        - Product Name
        - Brand
        - Key Features (as a list of strings)
        - Target Audience (who is this for?)
        - 'prosVsCons': A detailed string text comparing it to our product (Our Pros vs Their Cons).
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
    "comparisonTable": [{ "productName": "string", "brand": "string", "keyFeatures": ["string"], "targetAudience": "string", "prosVsCons": "string" }]
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
    // Do NOT use responseMimeType with tools, as it is often unsupported/conflicts.
    const response = await runGenerateContent({
      model: 'gemini-2.5-pro',
      contents: { parts },
      config: { tools: [{googleSearch: {}}] }
    });
    
    const jsonText = extractJson(response.text);
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

        Based on the active channels, categorize them into appropriate Creative Groups (e.g., "Social Stories" for TikTok/Instagram, "Feed Ads" for Facebook/LinkedIn/Display, "Owned" for Email/Push).
        
        For EACH group, provide:
        1. A Group Name.
        2. The Aspect Ratio. You MUST select one of the following exactly: "1:1", "9:16", or "16:9".
        3. The channels belonging to this group.
        4. 3 distinct, highly descriptive Image Prompts suitable for generating a high-quality ad image in that format.
           - IMPORTANT: If the ad concept does not strictly require showing the physical product (e.g. a specific credit card design), describe a LIFESTYLE scene, human emotion, or atmospheric setting instead. Avoid describing generic "credit cards" or "bank apps" in the prompt unless essential, as these often look fake. Focus on the benefit, the feeling, or the outcome.
           - If product imagery is NOT required to convey the message, do NOT include it in the prompt.
           - Ensure the prompt describes the composition to fit the aspect ratio (e.g. "vertical shot" for 9:16).
           - Include specific details about the subject, lighting (e.g., "soft daylight", "cinematic neon"), mood (e.g., "energetic", "trustworthy"), and style (e.g., "candid lifestyle", "studio editorial").
           - Do NOT use real brand names.
        5. 3 distinct Headlines or Notification Texts (short, punchy copy) suitable for these channels.
        6. 3 distinct Push Notification texts (short, engaging, action-oriented) suitable for mobile app notifications or SMS owned media channels (as 'pushNotes').

        ${instructions ? `Additional User Instructions: ${instructions}` : ''}

        Output ONLY valid JSON:
        [
            {
                "name": "string",
                "aspectRatio": "1:1" | "9:16" | "16:9",
                "channels": ["string"],
                "imagePrompts": ["string", "string", "string"],
                "headlines": ["string", "string", "string"],
                "pushNotes": ["string", "string", "string"]
            }
        ]
    `;

    try {
        // No tools here, so responseMimeType is safe and recommended for strict JSON.
        const response = await runGenerateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        
        const jsonText = extractJson(response.text);
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating creative strategy:", error);
        throw new Error("Failed to generate creative strategy.");
    }
}

export const generateImage = async (prompt: string, aspectRatio: '1:1' | '9:16' | '16:9' = '1:1', instructions?: string): Promise<{ base64: string; mimeType: string }> => {
  let fullPrompt = `${prompt}. High resolution, photorealistic, professional advertising photography, highly detailed, cinematic lighting.`;
  if (instructions) fullPrompt += `\n\nAdditional instructions: "${instructions}"`;

  try {
      // Using gemini-3-pro-image-preview for high quality image generation
      // Upgraded to 4K resolution
      const response = await runGenerateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: fullPrompt }] },
          config: {
              imageConfig: {
                  aspectRatio: aspectRatio,
                  imageSize: '4K'
              }
          },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
        }
      }
      throw new Error('No image data received from API.');

  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image.');
  }
};

export const generateImageFromProduct = async (
  productImage: SupportingDocument, 
  prompt: string,
  instructions?: string,
  aspectRatio: '1:1' | '9:16' | '16:9' = '1:1'
): Promise<{ base64: string; mimeType: string }> => {
  // Using gemini-3-pro-image-preview for product editing/placement
  let fullPrompt = `Using the provided product image, create a new photorealistic image: "${prompt}". Maintain realistic scale. High quality, professional lighting.`;
  if (instructions) fullPrompt += `\n\nInstruction: "${instructions}"`;
  
  const imagePart = { inlineData: { data: productImage.data, mimeType: productImage.mimeType } };
  const textPart = { text: fullPrompt };

  try {
    const response = await runGenerateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [imagePart, textPart] },
      config: { 
          imageConfig: {
              aspectRatio: aspectRatio, 
              imageSize: '4K'
          }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
        }
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
      return response.text.trim();
    } catch (error) {
        console.error("Error generating text:", error);
        throw new Error("Failed to generate text.");
    }
};

export const editImage = async (originalBase64: string, mimeType: string, instructions: string, aspectRatio: '1:1' | '9:16' | '16:9' = '1:1'): Promise<{ base64: string; mimeType: string }> => {
    let prompt = `Edit this image: ${instructions}. Return the edited image. High quality.`;
    
    const imagePart = { inlineData: { data: originalBase64, mimeType: mimeType } };
    const textPart = { text: prompt };

    try {
        const response = await runGenerateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: '4K'
                }
            }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
            }
        }
        throw new Error('No image data received for edit.');
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image.");
    }
}

export const editNotificationText = async (originalText: string, instructions: string, landingPageUrl: string, brandValues?: string): Promise<string> => {
    let prompt = `Rewrite the following marketing copy: "${originalText}".\nInstructions: ${instructions}.\nKeep it concise.`;
    
    try {
      const response = await runGenerateContent({ model: 'gemini-2.5-flash', contents: prompt });
      return response.text.trim();
    } catch (error) {
        console.error("Error editing text:", error);
        throw new Error("Failed to edit text.");
    }
}

export const getBudgetSplit = async (
    segments: AudienceSegment[],
    totalBudget: number,
    country: string,
    campaignName: string,
    landingPageUrl: string,
    customerAction?: string,
    productBenefits?: string,
    instructions?: string
): Promise<{ analysis: string; splits: { segmentName: string; allocatedBudget: number; mediaSplit: { channel: string; budget: number }[] }[], sources: GroundingSource[] }> => {
    
    const segmentSummaries = segments.map(s => `- ${s.name}: ${s.description} (Rationale: ${s.rationale})`).join('\n');

    let prompt = `
        Act as a Media Planner for a consumer bank in ${country}.
        Campaign: "${campaignName}".
        Total Budget: $${totalBudget}.
        Objective: ${customerAction || 'Acquisition'}.
        Product Benefits: ${productBenefits || 'N/A'}.
        Landing Page: ${landingPageUrl}.

        Target Audience Segments:
        ${segmentSummaries}

        Task:
        1. Analyze the segments and recommend a strategic budget allocation across Paid Media channels (Facebook, Instagram, Google Search, Google Display, TikTok, YouTube, LinkedIn).
        2. Provide a "Budget Analysis" (markdown format) explaining the strategy. Why did you prioritize certain segments or channels? Use Google Search to ground your strategy in current media consumption trends in ${country}.
        3. Output a JSON structure for the budget split.

        ${instructions ? `Additional Instructions: ${instructions}` : ''}
        
        The JSON output must strictly follow this schema:
        {
            "analysis": "string (markdown)",
            "splits": [
                {
                    "segmentName": "string (must match input name exactly)",
                    "allocatedBudget": number,
                    "mediaSplit": [
                        { "channel": "string", "budget": number }
                    ]
                }
            ]
        }
        
        Ensure the sum of all 'allocatedBudget' equals $${totalBudget}.
        Ensure the sum of 'mediaSplit' budgets equals the 'allocatedBudget' for that segment.
    `;

    try {
        // Do NOT use responseMimeType with tools, as it is often unsupported/conflicts.
        const response = await runGenerateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { 
                tools: [{googleSearch: {}}] 
            }
        });

        const jsonText = extractJson(response.text);
        const parsed = JSON.parse(jsonText);
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const sources = groundingChunks
        .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
        .map(chunk => ({ uri: chunk.web!.uri!, title: chunk.web!.title! }));

        return { analysis: parsed.analysis, splits: parsed.splits, sources };

    } catch (error) {
        console.error("Error fetching budget split:", error);
        throw new Error("Failed to generate media plan.");
    }
}

export const getOwnedMediaAnalysis = async (
    campaignName: string,
    segments: AudienceSegment[],
    importantCustomers?: string,
    customerSegment?: string,
): Promise<OwnedMediaAnalysis> => {
    const segmentNames = segments.map(s => s.name).join(', ');
    let prompt = `
        As a CRM and Owned Media specialist, analyze if "Owned Media" (Email, SMS, In-App Push, Direct Mail) is a suitable channel for the campaign "${campaignName}".
        Target Segments: ${segmentNames}.
        Important Customers: ${importantCustomers || 'N/A'}.
        Customer Segment: ${customerSegment || 'N/A'}.

        Determine if we should use owned channels to reach existing customers within these segments.
        Provide a recommendation, justification, and specific tactical ideas.

        Output JSON:
        {
            "isApplicable": boolean,
            "justification": "string",
            "analysisRecommendations": "string (markdown, suggesting specific messages or flows)",
            "recommendedChannels": ["string"] (e.g. ["Email", "SMS", "Push"])
        }
    `;
    
    try {
        const response = await runGenerateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const jsonText = extractJson(response.text);
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error fetching owned media analysis:", error);
        // Return a default fallback instead of failing the whole flow
        return { isApplicable: false, justification: "Analysis failed.", analysisRecommendations: "Could not generate recommendations." };
    }
}