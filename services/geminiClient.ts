import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder. Please provide a valid API key for the application to function.");
}

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY ?? 'MISSING_API_KEY' });

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A centralized function to make generateContent API calls.
 * This is the single point of interaction with the Gemini API for content generation.
 * Enterprise proxy configurations or other network-related modifications
 * should be applied here.
 * Includes exponential backoff for 429 errors.
 * @param params - The parameters for the generateContent call, including model, contents, and config.
 * @param retries - Number of retries to attempt on retryable errors.
 * @returns The response from the Gemini API.
 */
export const runGenerateContent = async (params: GenerateContentParameters, retries = 3): Promise<GenerateContentResponse> => {
  const ai = getAiClient();
  let currentTry = 0;

  while (true) {
    try {
      // This is the single point where the application calls the Gemini API.
      // Any proxy configuration or custom fetch logic would be implemented here.
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      currentTry++;
      
      // Check for API key related errors specifically for the paid key requirement of Veo/Pro Vision
      if (error.message && error.message.includes("Requested entity was not found")) {
          window.dispatchEvent(new Event('gemini-auth-error'));
          throw error;
      }

      // Identify retryable errors: 429 (Too Many Requests) and 503 (Service Unavailable)
      const isRetryable = 
        error.status === 429 || 
        error.code === 429 || 
        (error.message && error.message.includes("RESOURCE_EXHAUSTED")) ||
        error.status === 503 || 
        error.code === 503;

      if (isRetryable && currentTry <= retries) {
        const delay = Math.pow(2, currentTry) * 1000 + Math.random() * 1000; // Exponential backoff + jitter
        console.warn(`Gemini API error ${error.status || error.code}. Retrying in ${Math.round(delay)}ms... (Attempt ${currentTry}/${retries})`);
        await wait(delay);
        continue;
      }

      console.error("Gemini API call failed:", error);
      // Re-throw the error to be handled by the calling service
      throw error;
    }
  }
};
