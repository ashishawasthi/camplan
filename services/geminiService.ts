import { Type, Modality } from '@google/genai';
import { AudienceSegment, SupportingDocument, GroundingSource } from '../types';
import { runGenerateContent } from './geminiClient';

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export const getAudienceSegments = async (
  campaignName: string,
  totalBudget: number,
  durationDays: number,
  country: string,
  audienceInstructions?: string,
  supportingDocuments?: SupportingDocument[]
): Promise<AudienceSegment[]> => {
  let prompt = `
    As a marketing expert for a consumer bank in ${country}, identify 3-5 distinct target audience segments for a new ad campaign titled "${campaignName}".
    The campaign has a total budget of $${totalBudget} and will run for ${durationDays} days.
    For each segment, provide a name, a detailed description, a list of key motivations, and a creative, detailed prompt for generating a compelling ad image.
    The image prompt should be visually descriptive, culturally relevant to ${country}, and emotionally resonant with the target segment.
  `;

  if (audienceInstructions) {
    prompt += `\n\nAdditionally, follow these specific instructions when defining the audience:\n${audienceInstructions}`;
  }

  if (supportingDocuments && supportingDocuments.length > 0) {
    prompt += `\n\nUse the content of the attached document(s) as context and reference for your analysis.`;
  }

  const parts: Part[] = [{ text: prompt }];

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
                  keyMotivations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imagePrompt: { type: Type.STRING }
                },
                required: ['name', 'description', 'keyMotivations', 'imagePrompt']
              }
            }
          },
          required: ['segments']
        }
      }
    });

    const parsed = JSON.parse(response.text);
    // Add isSelected: true to each segment by default
    const segmentsWithSelection: AudienceSegment[] = parsed.segments.map((segment: Omit<AudienceSegment, 'isSelected'>) => ({
      ...segment,
      isSelected: true,
    }));
    return segmentsWithSelection;

  } catch (error) {
    console.error("Error fetching audience segments:", error);
    throw new Error("Failed to generate audience segments. The model may be unavailable or the request was invalid.");
  }
};

export const generateImage = async (prompt: string): Promise<{ base64: string; mimeType: string }> => {
  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
    throw new Error('No image data received from API.');
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image. Please try a different prompt.');
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
  campaignName: string
): Promise<{ 
  analysis: string; 
  splits: { segmentName: string; allocatedBudget: number; mediaSplit: { channel: string; budget: number }[] }[];
  sources: GroundingSource[];
}> => {
  const segmentDetails = segments.map(s => `Segment "${s.name}": ${s.description}`).join('\n');
  const prompt = `
    As a digital marketing strategist for a consumer bank in ${country}, your task is to propose a budget allocation for an ad campaign titled "${campaignName}".
    The total budget is $${totalBudget}. The target audience segments are:
    ${segmentDetails}

    First, conduct a brief analysis of the current digital marketing landscape and consumer media consumption habits in ${country}, particularly for financial products. Use real-time search to gather recent data and trends. This analysis should justify your budget allocation strategy.

    Second, based on your analysis, propose a strategic budget split. Allocate the total budget across the identified segments based on their potential ROI. Then, for each segment, break down their allocated budget across these paid media channels: Facebook, Instagram, Google (Search & Display), and TikTok.

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
