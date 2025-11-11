import { GoogleGenAI, Type, Modality } from '@google/genai';
import { AudienceSegment } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder. Please provide a valid API key for the application to function.");
}

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY ?? 'MISSING_API_KEY' });

export const getAudienceSegments = async (
  campaignName: string,
  totalBudget: number,
  durationDays: number,
  country: string
): Promise<AudienceSegment[]> => {
  const ai = getAiClient();
  const prompt = `
    As a marketing expert for a consumer bank in ${country}, identify 3-5 distinct target audience segments for a new ad campaign titled "${campaignName}".
    The campaign has a total budget of $${totalBudget} and will run for ${durationDays} days.
    For each segment, provide a name, a detailed description, a list of key motivations, and a creative, detailed prompt for generating a compelling ad image.
    The image prompt should be visually descriptive, culturally relevant to ${country}, and emotionally resonant with the target segment.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
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
    return parsed.segments;

  } catch (error) {
    console.error("Error fetching audience segments:", error);
    throw new Error("Failed to generate audience segments. The model may be unavailable or the request was invalid.");
  }
};

export const generateImage = async (prompt: string): Promise<{ base64: string; mimeType: string }> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
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
  const ai = getAiClient();
  const imagePart = {
    inlineData: { data: base64Image, mimeType },
  };
  const textPart = { text: prompt };

  try {
    const response = await ai.models.generateContent({
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

export const getBudgetSplit = async (segments: AudienceSegment[], totalBudget: number): Promise<{ segmentName: string; allocatedBudget: number; mediaSplit: { channel: string; budget: number }[] }[]> => {
  const ai = getAiClient();
  const segmentDetails = segments.map(s => `Segment "${s.name}": ${s.description}`).join('\n');
  const prompt = `
    Given a total advertising budget of $${totalBudget} and the following target audience segments:
    ${segmentDetails}

    Please propose a strategic budget split. First, allocate the total budget across the segments based on their likely potential and reach.
    Second, for each segment's allocated budget, further split it across these specific paid media channels: Facebook, Instagram, Google, and TikTok.
    The split should be logical for the segment's demographic and motivations. For example, younger audiences might be better reached on TikTok and Instagram.

    Provide the output as a JSON object with a list of budget splits. Each item should contain the segment name, its total allocated budget, and a breakdown by media channel.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
          required: ['budgetSplits']
        }
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed.budgetSplits;

  } catch (error) {
    console.error("Error fetching budget split:", error);
    throw new Error("Failed to generate a budget split. Please try again.");
  }
};