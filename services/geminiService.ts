import { GoogleGenAI, Type, Modality } from '@google/genai';
import { AudienceSegment, SupportingDocument, GroundingSource, CompetitorAnalysis } from '../types';
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

    After that, provide a "Proposition" section. This should be a concise summary of your key findings from the web search and the product/landing page content. It should discuss why customers should choose our product or service, focusing on the unique benefits and value it delivers. Highlight consumer trends, key value propositions from the landing page, and any other insights that will directly inform the audience segmentation that follows.
    
    Finally, based on ALL your analysis (the competitor analysis if conducted, the market research, and the product/landing page analysis), define each audience segment with the following properties:
    1. A short, descriptive name.
    2. A "Pen Portrait": A short, narrative description of a fictional individual who represents this segment. Give them a name, age, occupation, and briefly describe a day in their life or a specific scenario where they would interact with or benefit from our product. This should bring the segment to life.
    3. A detailed description of the segment's demographics, lifestyle, and psychographics.
    4. A "rationale" explaining your reasoning. This rationale MUST explicitly reference specific facts, features, or language from the landing page content AND insights gathered from your web search to justify why this segment is a valuable target.
    5. A list of their key motivations for banking products.
    6. A list of 3 distinct, highly detailed, creative prompts for generating a compelling ad image using a text-to-image model (as 'imagePrompts'). Each prompt must be a rich, descriptive paragraph and should offer a different creative direction. Each prompt should specify:
    - **Subject:** What is the main focus of the image? (e.g., a person, an object, a scene)
    - **Scene/Setting:** Where is the subject? (e.g., a modern cafe, a family home, an outdoor market)
    - **Action/Mood:** What is happening? What is the emotional tone? (e.g., joyful, serene, ambitious, secure)
    - **Style:** What is the artistic style? (e.g., photorealistic, cinematic, vibrant illustration, warm and friendly)
    - **Composition:** How should the image be framed? (e.g., close-up, wide shot, rule of thirds)
    - **Lighting:** Describe the lighting. (e.g., soft natural light, dramatic studio lighting, golden hour)
    - **Colors:** What is the color palette? (e.g., warm and earthy tones, cool and professional blues, vibrant and energetic colors)
    - **Cultural Relevance:** Ensure the scene, people, and objects are culturally relevant to ${country}.
    - **IMPORTANT:** The prompt must NOT depict any specific real-world products or brand logos unless a product image is provided below or they are explicitly mentioned in the brand guidelines. Instead, use generic representations (e.g., a generic credit card, not a Visa).
    ${productImage ? "A product image has been provided. The imagePrompt for each segment should describe a scene that naturally features the provided product, paying attention to its realistic integration." : "Since no specific product image is provided, the imagePrompt should not attempt to render a specific product."}
    7. A list of 3 distinct, short, and compelling mobile push notification texts for that segment (as 'notificationTexts'). These should be ready-to-use marketing messages, not prompts to generate text. Each should have a clear call to action.
  `;

  const creativeBriefParts: string[] = [];
  if (importantCustomers) creativeBriefParts.push(`- Who is the most important group of customers you want to say this to? ${importantCustomers}`);
  if (customerSegment) creativeBriefParts.push(`- Which segment does this group of customers belongs to? ${customerSegment}`);
  if (whatToTell) creativeBriefParts.push(`- What do you want to tell them? ${whatToTell}`);
  if (customerAction) creativeBriefParts.push(`- What do you want your customers to do / think / feel? ${customerAction}`);
  if (productBenefits) creativeBriefParts.push(`- What are your product benefits or promotion mechanics? ${productBenefits}`);
  if (customerJob) creativeBriefParts.push(`- What is the customer job to be done? ${customerJob}`);
  if (brandValues) creativeBriefParts.push(`- Your campaign demonstrates the following brand values: ${brandValues}`);
  
  if (creativeBriefParts.length > 0) {
    prompt += `\n\nYour segmentation and all generated content must be guided by this creative brief:\n${creativeBriefParts.join('\n')}`;
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
  
  if (instructions) {
    prompt += `\n\nAn additional instruction was provided by the user, please adhere to it: "${instructions}"`;
  }
  
  prompt += `\n\nYour final output MUST be a single, valid JSON object. Do not include any introductory text, markdown formatting like \`\`\`json, or any explanations outside of the JSON object itself. The JSON object must have the following structure:
{`;
  if (productDetailsUrl) {
      prompt += `
  "competitorAnalysis": {
    "summary": "string",
    "comparisonTable": [
      {
        "productName": "string",
        "brand": "string",
        "keyFeatures": ["string"],
        "targetAudience": "string"
      }
    ]
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
      "imagePrompts": ["string", "string", "string"],
      "notificationTexts": ["string", "string", "string"]
    }
  ]
}`;


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
      config: {
        tools: [{googleSearch: {}}],
      }
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
      .map(chunk => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title!,
      }))
      .filter((source, index, self) => 
        index === self.findIndex((s) => s.uri === source.uri)
      );

    return { 
        segments: segmentsWithSelection, 
        sources,
        competitorAnalysis: parsed.competitorAnalysis,
        proposition: parsed.proposition,
    };

  } catch (error) {
    console.error("Error fetching audience segments:", error);
    throw new Error("Failed to generate audience segments. The model may be unavailable or the request was invalid.");
  }
};

export const generateImagenImage = async (prompt: string, instructions?: string): Promise<{ base64: string; mimeType: string }> => {
  let fullPrompt = prompt;
  if (instructions) {
    fullPrompt += `\n\nAn additional instruction was provided by the user for this image: "${instructions}"`;
  }

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }],
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
  prompt: string,
  instructions?: string,
): Promise<{ base64: string; mimeType: string }> => {
  let fullPrompt = `Using the provided product image, create a new photorealistic image that places the product in the following scene: "${prompt}". Pay close attention to the scale of the product. It is crucial that the product's size is realistic and in natural proportion to other objects and elements within the scene. For example, if the product is a credit card and the scene includes a person's hand, the card should be sized correctly to fit in the hand, not appear oversized. The final generated image should be a square image with 1024x1024 resolution. Do not add any text or logos to the image that were not in the original product image.`;
  if (instructions) {
    fullPrompt += `\n\nAn additional instruction was provided by the user for this image: "${instructions}"`;
  }
  
  const imagePart = {
    inlineData: { data: productImage.data, mimeType: productImage.mimeType },
  };
  const textPart = { text: fullPrompt };

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

export const generateNotificationText = async (prompt: string, landingPageUrl: string, brandValues?: string, instructions?: string): Promise<string> => {
    let fullPrompt = `Generate a concise and compelling mobile push notification text based on the following creative direction: "${prompt}". The notification should entice users to visit the landing page: ${landingPageUrl}.`;
    if (brandValues) {
      fullPrompt += `\n\nAdhere to these brand values: ${brandValues}`;
    }
    if (instructions) {
        fullPrompt += `\n\nAn additional instruction was provided by the user for this text: "${instructions}"`;
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

export const editNotificationText = async (originalText: string, editPrompt: string, landingPageUrl: string, brandValues?: string): Promise<string> => {
    let fullPrompt = `You are an expert copywriter. Your task is to revise a mobile push notification text based on a user's request.

Original notification text:
"${originalText}"

User's revision instruction:
"${editPrompt}"

The notification should entice users to visit the landing page: ${landingPageUrl}.`;

    if (brandValues) {
      fullPrompt += `\n\nAdhere to these brand values: ${brandValues}`;
    }
    
    fullPrompt += "\n\nBased on the instruction, provide the revised notification text. The notification should remain short, engaging, and have a clear call to action. Return only the revised text, with no extra formatting or labels.";

    try {
      const response = await runGenerateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });
      return response.text.trim().replace(/^"|"$/g, ''); // Trim and remove quotes
    } catch (error) {
      console.error("Error editing notification text:", error);
      throw new Error("Failed to edit notification text.");
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
    As a digital marketing strategist for a consumer bank in ${country}, your task is to propose a budget allocation for an ad campaign titled "${campaignName}".
    The total paid media budget is $${paidMediaBudget}. The campaign directs users to this landing page: ${landingPageUrl}. The strategy should aim to drive relevant traffic to this page.
    The target audience segments are:
    ${segmentDetails}
  `;

  let performanceGuidelines = '';
  if (customerAction) {
    performanceGuidelines += `\n- The primary goal is to make customers do/think/feel: "${customerAction}"`;
  }
  if (productBenefits) {
    performanceGuidelines += `\n- The key offer to drive this is: "${productBenefits}"`;
  }

  if (performanceGuidelines) {
    prompt += `\n\nCrucially, your strategy must be informed by these performance guidelines: ${performanceGuidelines}`;
  }


  prompt += `
    First, conduct a brief analysis of the current digital marketing landscape and consumer media consumption habits in ${country}, particularly for financial products. Use real-time search to gather recent data and trends. This analysis should justify your budget allocation strategy.

    Second, based on your analysis and the provided guidelines, propose a strategic budget split. Allocate the total budget across the identified segments based on their potential ROI. Then, for each segment, break down their allocated budget across these paid media channels: Facebook, Instagram, Google (Search & Display), and TikTok.

    Your final response must be ONLY a single, valid JSON object. Do not include any introductory text or markdown formatting. The structure should be:
    {
      "analysis": "string",
      "budgetSplits": [
        {
          "segmentName": "string",
          "allocatedBudget": number,
          "mediaSplit": [
            { "channel": "string", "budget": number }
          ]
        }
      ]
    }
  `;

  if (instructions) {
    prompt += `\n\nAn additional instruction was provided by the user, please adhere to it: "${instructions}"`;
  }

  try {
    const response = await runGenerateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      }
    });

    const jsonText = response.text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText);
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