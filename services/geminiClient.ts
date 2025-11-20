import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder. Please provide a valid API key for the application to function.");
}

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY ?? 'MISSING_API_KEY' });

/**
 * A centralized function to make generateContent API calls.
 * This is the single point of interaction with the Gemini API for content generation.
 * Enterprise proxy configurations or other network-related modifications
 * should be applied here.
 * @param params - The parameters for the generateContent call, including model, contents, and config.
 * @returns The response from the Gemini API.
 */
export const runGenerateContent = async (params: GenerateContentParameters): Promise<GenerateContentResponse> => {
  const ai = getAiClient();
  try {
    // This is the single point where the application calls the Gemini API.
    // Any proxy configuration or custom fetch logic would be implemented here.
    const response = await ai.models.generateContent(params);
    return response;
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    
    // Check for API key related errors specifically for the paid key requirement of Veo/Pro Vision
    if (error.message && error.message.includes("Requested entity was not found")) {
        window.dispatchEvent(new Event('gemini-auth-error'));
    }

    // Re-throw the error to be handled by the calling service, which can
    // provide a more user-friendly message.
    throw error;
  }
};
