import { GoogleGenAI, Type, Modality } from '@google/genai';
import { AudienceSegment, SupportingDocument, GroundingSource } from '../types';
import { runGenerateContent } from './geminiClient';

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY ?? 'MISSING_API_KEY' });


export const getAudienceSegments = async (
  campaignName: string,
  totalBudget: number,
  durationDays: number,
  country: string,
  landingPageUrl: string,
  targetingGuidelines?: string,
  brandGuidelines?: string,
  supportingDocuments?: SupportingDocument[],
  productImage?: SupportingDocument
): Promise<{ segments: AudienceSegment[], sources: GroundingSource[] }> => {
  let prompt = `
    As a marketing expert for a consumer bank in ${country}, your task is to identify 3-5 distinct target audience segments for a new ad campaign titled "${campaignName}".
    The campaign has a total budget of $${totalBudget} and will run for ${durationDays} days.
    
    First, use Google Search to research the current market for this type of product/service in ${country}. Look for consumer trends, competitor strategies, and relevant demographic/psychographic data.

    Second, analyze the content of the campaign's landing page, which contains the core offer and details: ${landingPageUrl}.
    
    Based on your combined analysis of the search results and the landing page content, define each audience segment with the following properties:
    1. A short, descriptive name.
    2. A detailed description of the segment's demographics, lifestyle, and psychographics.
    3. A "rationale" explaining your reasoning. This rationale MUST explicitly reference specific facts, features, or language from the landing page content AND insights gathered from your web search to justify why this segment is a valuable target.
    4. A list of their key motivations for banking products.
    5. A creative, detailed prompt for generating a compelling ad image (the 'imagePrompt'). This image prompt must be visually descriptive, culturally relevant to ${country}, and emotionally resonant.
    IMPORTANT: The image prompt must NOT depict any specific real-world products or brand logos unless a product image is provided below or they are explicitly mentioned in the brand guidelines. Instead, use generic representations (e.g., a generic credit card, not a Visa).
    ${productImage ? 'A product image has been provided. The imagePrompt for each segment should describe a scene that naturally features the provided product.' : 'Since no specific product image is provided, the imagePrompt should not attempt to render a specific product.'}
    6. A separate, short prompt for generating a concise and compelling mobile push notification text for that segment.
  `;

  if (targetingGuidelines) {
    prompt += `\n\nYour segmentation must be guided by these specific targeting guidelines:\n${targetingGuidelines}`;
  }

  if (brandGuidelines) {
    prompt += `\n\nAdditionally, adhere to these brand guidelines for all generated content and prompts:\n${brandGuidelines}`;
  }
  
  const contextInstructions: string[] = [];
  if (productImage) {
      contextInstructions.push("a product image");
  }
  if (supportingDocuments && supportingDocuments.length > 0) {
      contextInstructions.push("the attached document(s)");
  }

  if (contextInstructions.length > 0) {
    prompt += `\n\nUse the content of ${contextInstructions.join(' and ')} as context and reference for your analysis.`;
  }

  const parts: Part[] = [{ text: prompt }];
  
  if (productImage) {
    parts.push({
      inlineData: {
        mimeType: productImage.mimeType,
        data: productImage.data,
      },
    });
  }

  if (supportingDocuments) {
    for (const doc of supportingDocuments) {
      parts.push({
        inlineData: {
          mimeType: doc.mimeType,
          data: doc.data,
        },
      });
    }
  }

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-pro',
      contents: { parts },
      tools: [{googleSearch: {}}],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  rationale: { 
                    type: Type.STRING,
                    description: "Justification for selecting this segment, citing landing page content and search results."
                  },
                  keyMotivations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imagePrompt: { type: Type.STRING },
                  notificationTextPrompt: { type: Type.STRING }
                },
                required: ['name', 'description', 'rationale', 'keyMotivations', 'imagePrompt', 'notificationTextPrompt']
              }
            }
          },
          required: ['segments']
        }
      }
    });

    const parsed = JSON.parse(response.text);
    const segmentsWithSelection: AudienceSegment[] = parsed.segments.map((segment: Omit<AudienceSegment, 'isSelected'>) => ({
      ...segment,
      isSelected: true,
    }));

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = groundingChunks
      .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
      .map(chunk => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title!,
      }))
      .filter((source, index, self) => 
        index === self.findIndex((s) => s.uri === source.uri)
      );

    return { segments: segmentsWithSelection, sources };

  } catch (error) {
    console.error("Error fetching audience segments:", error);
    throw new Error("Failed to generate audience segments. The model may be unavailable or the request was invalid.");
  }
};

export const generateImagenImage = async (prompt: string): Promise<{ base64: string; mimeType: string }> => {
  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
    throw new Error('No image data received from API for prompt-based generation.');
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image. Please try a different prompt.');
  }
};

export const generateImageFromProduct = async (
  productImage: SupportingDocument, 
  prompt: string
): Promise<{ base64: string; mimeType: string }> => {
  const imagePart = {
    inlineData: { data: productImage.data, mimeType: productImage.mimeType },
  };
  const textPart = { text: `Using the provided product image, create a new photorealistic image that places the product in the following scene: "${prompt}". It is crucial that the product's size is realistic and in natural proportion to other objects and elements within the scene. The final generated image should be a square image with 1024x1024 resolution. Do not add any text or logos to the image that were not in the original product image.` };

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
    throw new Error('No image data received from API for product image generation.');
  } catch (error) {
    console.error('Error generating image from product:', error);
    throw new Error('Failed to generate image from product. The model may not have been able to fulfill the request.');
  }
};

export const generateNotificationText = async (prompt: string, landingPageUrl: string, brandGuidelines?: string): Promise<string> => {
    let fullPrompt = `Generate a concise and compelling mobile push notification text based on the following creative direction: "${prompt}". The notification should entice users to visit the landing page: ${landingPageUrl}.`;
    if (brandGuidelines) {
      fullPrompt += `\n\nAdhere to these brand guidelines:\n${brandGuidelines}`;
    }
    fullPrompt += "\n\nThe notification should be short, engaging, and have a clear call to action. Return only the text of the notification, with no extra formatting or labels.";

    try {
      const response = await runGenerateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });
      return response.text.trim().replace(/^"|"$/g, ''); // Trim and remove quotes
    } catch (error) {
      console.error("Error generating notification text:", error);
      throw new Error("Failed to generate notification text.");
    }
};


export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<{ base64: string; mimeType: string }> => {
  const imagePart = {
    inlineData: { data: base64Image, mimeType },
  };
  const textPart = { text: prompt };

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
    throw new Error('No edited image data received from API.');
  } catch (error) {
    console.error('Error editing image:', error);
    throw new Error('Failed to edit image. The model may not have been able to apply the edit.');
  }
};

export const getBudgetSplit = async (
  segments: AudienceSegment[], 
  totalBudget: number,
  country: string,
  campaignName: string,
  landingPageUrl: string,
  performanceGuidelines?: string
): Promise<{ 
  analysis: string; 
  splits: { segmentName: string; allocatedBudget: number; mediaSplit: { channel: string; budget: number }[] }[];
  sources: GroundingSource[];
}> => {
  const segmentDetails = segments.map(s => `Segment "${s.name}": ${s.description}`).join('\n');
  let prompt = `
    As a digital marketing strategist for a consumer bank in ${country}, your task is to propose a budget allocation for an ad campaign titled "${campaignName}".
    The total budget is $${totalBudget}. The campaign directs users to this landing page: ${landingPageUrl}. The strategy should aim to drive relevant traffic to this page.
    The target audience segments are:
    ${segmentDetails}
  `;

  if (performanceGuidelines) {
    prompt += `\n\nCrucially, your strategy must be informed by these performance guidelines: ${performanceGuidelines}`;
  }

  prompt += `
    First, conduct a brief analysis of the current digital marketing landscape and consumer media consumption habits in ${country}, particularly for financial products. Use real-time search to gather recent data and trends. This analysis should justify your budget allocation strategy.

    Second, based on your analysis and the provided guidelines, propose a strategic budget split. Allocate the total budget across the identified segments based on their potential ROI. Then, for each segment, break down their allocated budget across these paid media channels: Facebook, Instagram, Google (Search & Display), and TikTok.

    Provide the output as a single JSON object with two keys: "analysis" and "budgetSplits".
    - The "analysis" key should contain your market analysis as a string.
    - The "budgetSplits" key should contain an array of objects, where each object represents a segment and includes its name, total allocated budget, and the media channel breakdown.
  `;

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      tools: [{googleSearch: {}}],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.STRING,
              description: "Market analysis and strategic rationale for the budget split."
            },
            budgetSplits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  segmentName: { type: Type.STRING },
                  allocatedBudget: { type: Type.NUMBER },
                  mediaSplit: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        channel: { type: Type.STRING },
                        budget: { type: Type.NUMBER }
                      },
                      required: ['channel', 'budget']
                    }
                  }
                },
                required: ['segmentName', 'allocatedBudget', 'mediaSplit']
              }
            }
          },
          required: ['analysis', 'budgetSplits']
        }
      }
    });

    const parsed = JSON.parse(response.text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    
    const sources = groundingChunks
      .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
      .map(chunk => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title!,
      }))
      .filter((source, index, self) => 
        index === self.findIndex((s) => s.uri === source.uri)
      );

    return {
      analysis: parsed.analysis,
      splits: parsed.budgetSplits,
      sources: sources
    };

  } catch (error) {
    console.error("Error fetching budget split:", error);
    throw new Error("Failed to generate a budget split. Please try again.");
  }
};