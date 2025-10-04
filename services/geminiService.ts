/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type, Content, Chat } from "@google/genai";
import { WardrobeItem, StylistResult, AnalysisResult, ChatbotContext } from '../types';

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash-image-preview';
const analysisModel = 'gemini-2.5-flash';

export const getAccessoryNudgeDecision = async (
    outfit: WardrobeItem[],
    analysis: AnalysisResult | null,
    accessories: WardrobeItem[],
): Promise<boolean> => {
    if (outfit.length === 0) return false;
    
    const prompt = `You are a fashion analysis AI. Your task is a simple yes/no decision.
Based on the provided current outfit (including its style tags), would adding accessories from the available list significantly improve the look?
The current outfit is already assembled. Do not suggest changing the clothes. Only consider if adding accessories would be a valuable styling suggestion.

Use context! For example, if the outfit has 'beach' or 'summer' tags, a 'sun-hat' would be a great recommendation. If it's 'formal' or 'evening', heels or a statement belt might be better.

Respond with ONLY the word "YES" or "NO".

User Analysis: ${JSON.stringify(analysis)}
Current Outfit: ${JSON.stringify(outfit.map(({name, category, tags}) => ({name, category, tags})))}
Available Accessories: ${JSON.stringify(accessories.map(({name, subcategory, tags}) => ({name, subcategory, tags})))}
`;

    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text.trim().toUpperCase() === 'YES';
};


export const getChatbotResponse = async (
    message: string,
    image: File | null,
    analysis: AnalysisResult | null,
    wardrobe: WardrobeItem[],
    magicMirrorContext: ChatbotContext | null,
    wishlist: WardrobeItem[],
    gender: 'men' | 'women' | null,
): Promise<string> => {
    
    const systemInstruction = `You are Stylo, a world-class AI personal stylist and shopper. Your tone is warm, encouraging, and fashion-forward. Your goal is to help users discover styles they love and feel confident in.

*CRITICAL BEHAVIORS:*
1.  *Determine Gender First:* If the user's gender context is unknown, your absolute first priority is to ask them. Say something like, "Of course! To give you the best recommendations, are you shopping for the men's or women's collection today?" Do not give any product recommendations until you know.
2.  *Leverage Tags:* Each wardrobe item has style \tags\ (e.g., 'casual', 'beach', 'formal'). Use these tags to make highly relevant, contextual recommendations. If a user asks for a 'beach trip' look, find items tagged with 'beach' or 'summer'. Create cohesive outfits by matching tags.
3.  *Context is Key:*
    *   If \magicMirrorContext\ is provided, you are in a "Magic Mirror" session. Your advice MUST be based on the \currentOutfit\ and the user's \analysis\. Reference what they are wearing.
    *   If no context, provide general advice based on the user's \analysis\ and available \wardrobe\.
4.  *Styling Wishlist Items:*
    *   If the user asks to style an item from their wishlist and the wishlist is not empty, you MUST ask them which item they'd like help with. List the items using this exact format for each: \[wishlist_choice:ITEM_ID]\.
    *   If their wishlist is empty, politely tell them to add items first so you can help style them.
5.  *Product Recommendations:*
    *   When you suggest an item from the catalog, you MUST embed its ID using the EXACT format \[product:ITEM_ID]\.
    *   You must ONLY use product IDs from the \Available Wardrobe\ list provided in the context. Do not invent IDs or use placeholders. If you cannot find a suitable item, say so.
    *   Examples: "This red dress \[product:women-dress-1]\ would look amazing." or "For a finishing touch, I'd suggest these classic Aviator Sunglasses \[product:acc-sun-1]\."
    *   Do NOT show a card for an item the user is already wearing in the Magic Mirror.
6.  *Voice Output (TTS):*
    *   At the end of your entire response, you MUST include a short, spoken-word version of your reply. Format it EXACTLY like this: \tts:"Your concise audio message goes here."\. This should be the very last thing. The TTS text should not contain any special tokens.
7.  *Clean, Concise Text:* Your main reply (before the \tts\ part) must be clean, conversational text. Use short paragraphs (1-2). Do not use markdown (like \*\, \-\, or backticks \` \`).
8.  *Prioritize Accessories in Magic Mirror:* When in \magicMirrorContext\, a great outfit is more than just clothes. ALWAYS evaluate the user's \currentOutfit\ to see if accessories could complete or elevate the look. If the main clothing items work well together, shift your focus to recommending specific accessories (belts, shoes, hats, sunglasses) that would be the perfect finishing touch. Explain why they work, using their tags for context.
9.  *Graceful Exit:* If the user's message is short and primarily expresses gratitude (e.g., "thank you", "thanks so much", "that's all thanks"), you MUST treat it as the end of the conversation. In this case, your ONLY response should be a brief, friendly closing like "You're welcome! Happy styling!" followed by the special token [action:close_chat]. Do not provide any other suggestions, questions, or product cards.`;

    let contextPrompt = "Here is the context for our conversation. Use it to inform your response.\n\n";
    if (analysis) {
        contextPrompt += `User's AI Analysis: ${JSON.stringify(analysis)}\n`;
    } else if (gender) {
        contextPrompt += `User is browsing the ${gender} collection.\n`;
    } else {
        contextPrompt += `User gender is unknown.\n`;
    }

    if (wishlist.length > 0) {
        const wishlistSummary = wishlist.map(({ id, name }) => ({ id, name }));
        contextPrompt += `User's Wishlist: ${JSON.stringify(wishlistSummary)}\n`;
    }

    if (magicMirrorContext) {
        const currentItems = magicMirrorContext.outfit ? [magicMirrorContext.outfit.garment].filter(Boolean) : [];
        contextPrompt += `Magic Mirror Context: User is currently trying on: ${JSON.stringify(currentItems.map(i => i!.name))}\n`;
    }
    
    if (wardrobe.length > 0) {
        const wardrobeSummary = wardrobe.map(({ id, name, category, color, price, tags }) => ({ id, name, category, color, price, tags }));
        contextPrompt += `Available Wardrobe for Recommendations: ${JSON.stringify(wardrobeSummary)}\n`;
    }
    contextPrompt += `\nUser's message is: "${message}"`;
    
    const contents: Content = { parts: [{ text: contextPrompt }] };

    if (image) {
        const imagePart = await fileToPart(image);
        contents.parts.unshift(imagePart);
    } else if (magicMirrorContext?.latestTryOnImage) {
        const imagePart = dataUrlToPart(magicMirrorContext.latestTryOnImage);
        contents.parts.unshift(imagePart);
    }
    
    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: [contents],
        config: {
            systemInstruction,
        },
    });

    return response.text;
};


export const analyzeUserProfile = async (userImage: File): Promise<AnalysisResult> => {
    const systemInstruction = `You are a sophisticated fashion AI analyst. Your task is to analyze an image of a person and return a single, valid JSON object containing their fashion profile.

*CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:*
1.  *JSON ONLY:* Your entire response MUST be ONLY the JSON object, with no additional text, commentary, markdown formatting (like \\\json\), or explanations.
2.  *STRICT SCHEMA:* Adhere strictly to the provided JSON schema and the exact enumerated values for each field.
3.  *BODY SHAPE DEFINITIONS:* Use these definitions to guide your 'bodyType' selection:
    *   *Rectangle:* Shoulders, bust, and hips are roughly the same width, with little to no waist definition.
    *   *Triangle (or Pear):* Hips are wider than the bust and shoulders. Well-defined waist.
    *   *Inverted Triangle:* Shoulders and/or bust are wider than the hips.
    *   *Hourglass:* Bust and hips are roughly the same width, with a clearly defined, narrower waist.
    *   *Round (or Apple):* Waist is wider than the bust and hips. Shoulders may be narrower.
4.  *VALID COLORS:* For \recommendedColors\, ensure the friendly \name\ and the 6-digit \hex\ code correctly correspond to each other (e.g., "Emerald Green" and "#50C878").

*JSON Schema and Value Options:*
*   \gender\: (string) MUST be one of: "men", "women".
*   \bodyType\: (string) MUST be one of: "Rectangle", "Triangle (or Pear)", "Inverted Triangle", "Hourglass", "Round (or Apple)".
*   \skinTone\: (string) MUST be one of: "Warm", "Cool", "Neutral".
*   \proportions\: (object) Contains short, descriptive phrases for \chest\, \waist\, and \hips\.
*   \recommendedColors\: (array) An array of 3-4 color objects. Each object must contain a \name\ and its corresponding valid 6-digit \hex\ code.
*   \recommendedStyles\: (array) An array of 2-3 short strings describing flattering clothing styles, cuts, or silhouettes.`;

    const prompt = "Analyze the person in this image and provide their gender, body type, skin tone, proportions, and recommendations in the required JSON format.";

    const userImagePart = await fileToPart(userImage);
    const contents: Content = { parts: [userImagePart, { text: prompt }] };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            gender: { type: Type.STRING, description: "The identified gender of the person ('men' or 'women')." },
            bodyType: { type: Type.STRING, description: "The identified body type (e.g., 'Rectangle')." },
            skinTone: { type: Type.STRING, description: "The identified skin undertone (e.g., 'Warm')." },
            proportions: {
                type: Type.OBJECT,
                description: "A descriptive analysis of the user's proportions.",
                properties: {
                    chest: { type: Type.STRING, description: "Descriptive analysis of chest proportion (e.g., 'Just right')." },
                    waist: { type: Type.STRING, description: "Descriptive analysis of waist proportion (e.g., 'Slightly loose')." },
                    hips: { type: Type.STRING, description: "Descriptive analysis of hips proportion (e.g., 'Not tight')." },
                },
                required: ["chest", "waist", "hips"]
            },
            recommendedColors: {
                type: Type.ARRAY,
                description: "An array of 3-4 color objects that would complement the user's skin tone. Each object must contain a 'name' and a 'hex' code.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A simple, friendly name for the color (e.g., 'Emerald Green')." },
                        hex: { type: Type.STRING, description: "The 6-digit hex code for the color (e.g., '#50C878')." }
                    },
                    required: ["name", "hex"]
                }
            },
            recommendedStyles: {
                type: Type.ARRAY,
                description: "An array of 2-3 clothing styles or cuts that would flatter the user's body type.",
                items: { type: Type.STRING }
            }
        },
        required: ["gender", "bodyType", "skinTone", "proportions", "recommendedColors", "recommendedStyles"]
    };

    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: [contents],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
        },
    });

    try {
        const result = JSON.parse(response.text.trim());
        // Basic validation
        if (result.gender && result.bodyType && result.skinTone && result.proportions && Array.isArray(result.recommendedColors) && Array.isArray(result.recommendedStyles)) {
            return result as AnalysisResult;
        } else {
            throw new Error("Invalid JSON structure received from analysis AI.");
        }
    } catch (e) {
        console.error("Failed to parse AI JSON response for analysis:", response.text, e);
        throw new Error("The AI returned an unexpected response during analysis. Please try again.");
    }
};


export const getStylistRecommendations = async (prompt: string, wardrobe: WardrobeItem[], genderContext: 'men' | 'women', userImage?: File, analysis?: AnalysisResult | null): Promise<StylistResult> => {
    const wardrobeForPrompt = wardrobe.map(item => ({ id: item.id, name: item.name, category: item.category }));
    
    const finalGender = analysis?.gender || genderContext;

    let stylistSystemInstruction = `You are "Stylo", an AI personal stylist. Your task is to provide fashion recommendations based on user input and return a single, valid JSON object.

*CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:*
1.  *JSON ONLY:* Your entire response MUST be ONLY the JSON object, with no additional text, commentary, or markdown formatting.
2.  *GENDER CONTEXT:* You MUST only recommend items suitable for the specified '${finalGender}' collection. All product IDs in your response must come from the provided wardrobe list, which is pre-filtered for this gender. Do not, under any circumstances, suggest items for a different gender.
3.  *USE PROVIDED WARDROBE:* Select product IDs only from the list of available wardrobe items provided in the prompt. Do not invent IDs.
4.  *VARIED RECOMMENDATION STRATEGY:* When selecting products, provide a diverse mix. Do not only pick items that match both body type and color analysis. Your selection should include:
    *   A few items that are a perfect match for *both* the user's recommended styles and color palette.
    *   Some items that are excellent for the user's *body type*, even if the color is different from the recommendations.
    *   Some items that are a great match for the user's *color palette*, even if the style isn't specifically mentioned.
    *   A few essential, versatile basics in *neutral colors* (like black, white, grey, denim) that form the foundation of a good wardrobe.
5.  *CONCISE RESPONSE:* The \stylistResponse\ text must be short, helpful, and conversational (2-4 sentences).

You will be given:
1. A user's text prompt.
2. A list of available wardrobe items for the '${finalGender}' collection.
3. (Optional) A user image.
4. (Optional) An AI analysis of the user's profile.

Your task is to synthesize all inputs (prioritizing the AI analysis if available) to select the best items from the wardrobe list and formulate your response, returned in the required JSON format.`;

    let fullPrompt = `User prompt: "${prompt}"\n`;
    if (analysis) {
        fullPrompt += `User Analysis (use this as the primary guide):\n- Gender: ${analysis.gender}\n- Body Type: ${analysis.bodyType}\n- Skin Tone: ${analysis.skinTone}\n\n`;
    } else {
         fullPrompt += `Current Collection: ${finalGender}\n\n`;
    }
    fullPrompt += `Available wardrobe: ${JSON.stringify(wardrobeForPrompt)}\n\nPlease provide your stylist analysis and recommendations in the required JSON format.`;

    const contents: Content[] = [];
    if (userImage) {
        const userImagePart = await fileToPart(userImage);
        contents.push({ parts: [userImagePart, { text: fullPrompt }] });
    } else {
        contents.push({ parts: [{ text: fullPrompt }] });
    }
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            stylistResponse: { type: Type.STRING, description: "Your conversational response to the user, explaining your recommendations." },
            recommendedProductIds: {
                type: Type.ARRAY,
                description: "An array of product IDs from the provided list that you recommend.",
                items: { type: Type.STRING }
            }
        },
        required: ["stylistResponse", "recommendedProductIds"]
    };

    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: contents,
        config: {
            systemInstruction: stylistSystemInstruction,
            responseMimeType: "application/json",
            responseSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        if (result.stylistResponse && Array.isArray(result.recommendedProductIds)) {
            return result as StylistResult;
        } else {
            throw new Error("Invalid JSON structure received from AI.");
        }
    } catch (e) {
        console.error("Failed to parse AI JSON response:", response.text, e);
        throw new Error("The AI returned an unexpected response. Please try again.");
    }
};

export const generateGroupPhoto = async (vibe: string, memberImages: string[]): Promise<string> => {
    const textPart = { text: `You are an expert AI fashion photographer. Create a single, photorealistic group photoshoot image based on a "vibe" and individual images of the models.

*Vibe:* "${vibe}"

*Instructions:*
1.  Create a cohesive scene and background that perfectly matches the vibe.
2.  Place all the people from the provided images into this new scene.
3.  Ensure each person wears the exact same outfit they have on in their individual image.
4.  Preserve each person's identity, features, and body type.
5.  Arrange them in natural, interacting group poses that fit the scene.
6.  The final image must be a single, complete, and sharp photorealistic image. The entire scene and all subjects must be fully rendered, well-composed, and free of any blur, artifacts, or missing parts.
7.  Return ONLY the final image.` };

    const imageParts = memberImages.map(dataUrl => dataUrlToPart(dataUrl));

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [textPart, ...imageParts] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response);
};

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = `You are an expert AI photo editor specializing in creating clean e-commerce model images from user-submitted photos. Your task is to process the provided image according to the following strict rules.

*Primary Goal:* Convert the user's photo into a standard studio model image.

*CRITICAL RULES:*
1.  *Preserve Identity & Clothing:* You MUST NOT alter the person's facial features, body shape, or identity in any way. The clothing worn in the original photo MUST remain completely unchanged. Do not add, remove, or stylize any garments.
2.  *Background Replacement:* Replace the original background with a clean, flat, neutral light-gray studio backdrop.
3.  *Pose & Framing:* Preserve the person's overall pose. If a minor adjustment is needed for a standard, relaxed standing model look, it must be minimal and natural. The framing must show the full body from head to feet, maintaining an approximate 2:3 aspect ratio. Do not crop the head or feet.
4.  *Lighting:* Ensure lighting is consistent with the original image, adding soft, natural shadows on the person to ground them in the new studio environment.
5.  *Quality & Completeness:* The output must be a single, high-quality, photorealistic, and complete image. The entire subject, including their head, hands, and feet, must be fully rendered and sharp. The image must be free of any blur, artifacts, text, or logos. Nothing should be missing or out of focus.
6.  *Output Contract:* Your response MUST contain ONLY the generated image. Do NOT include any text, commentary, or other content parts.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File, garmentInfo: WardrobeItem): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    
    const isAccessory = garmentInfo.category === 'accessories' && garmentInfo.accessoryMeta?.vtoSupported;
    const anchor = garmentInfo.accessoryMeta?.anchor;

    let prompt = `You are a virtual try-on AI. Your goal is to return ONE photorealistic image of the person from the 'modelImage' wearing the garment from the 'garmentImage' correctly.

*INPUTS:*
1.  *modelImage:* A person's studio photo. They may already be wearing clothes. This image shows the person, pose, and background to preserve.
2.  *garmentImage:* The exact item to wear. This is the SOURCE OF TRUTH for the garment's appearance.

*HARD RULES (IMAGE-FIRST FIDELITY):*
- *Garment Fidelity:* The garment's look (color, print, material, logos, design, length, silhouette) MUST match the 'garmentImage' exactly. No stylizing.
- *Person & Scene Fidelity:* Preserve the person's identity, pose, framing, and background from the 'modelImage'.
- *Fit & Realism:* The fit must be photorealistic. Align neckline, shoulders, waist, and hips perfectly. Crucially, simulate realistic fabric behavior: create natural drapes, folds, creases, and wrinkles that respect the model's pose and body contours. The garment should hang and wrap naturally, not look like a flat sticker.
- *Quality & Completeness:* The output must be a single, complete, and sharp photorealistic image. The entire person and outfit must be fully rendered. There should be no remnants of old clothing (ghost collars/sleeves), no artifacts (extra limbs), and no blur, missing parts, or out-of-focus areas.
`;

    if (isAccessory) {
        prompt += `
*ACCESSORY-SPECIFIC LOGIC:*
- This is an accessory. You MUST add/overlay it on the model. DO NOT replace the person's main clothing (tops, bottoms, dresses).
- *Placement:* Place the accessory realistically at its anchor point: \${anchor}\.
- *Interaction:*
`;
        if (garmentInfo.subcategory === 'belts') {
            prompt += `  - *BELT CINCHING:* This is a belt. It must realistically cinch the clothing underneath (like a dress or shirt). You MUST alter the underlying garment to show this interaction. Create natural fabric gathering, folds, and wrinkles around the belt to show the tightening effect. The silhouette of the clothing should be visibly cinched at the waist.
`;
        } else {
            prompt += `  - Ensure realistic scale, perspective, and interaction with the person (e.g., a hat sits on hair, sunglasses on the nose bridge).
`;
        }
        prompt += `- **Replacement:** If another accessory is already worn at the SAME anchor point, REPLACE the old accessory with this new one.`;

    } else {
        prompt += `
*CLOTHING SLOT & LAYERING LOGIC:*

*GOLDEN RULE FOR ONE-PIECE GARMENTS (DRESSES, JUMPSUITS, ETC.):*
- *TOP PRIORITY:* If the 'garmentImage' is a one-piece item (like a dress, jumpsuit, saree, etc.), this rule OVERRIDES ALL OTHERS.
- *ACTION:* You MUST *ERASE AND REMOVE 100%* of any clothing the person is wearing in the 'modelImage'. This includes T-shirts, shirts, pants, skirts, jackets, and any previous outfit layers.
- *FINAL RESULT:* The output image must show the person wearing *ONLY* the new one-piece garment against the original background. There must be absolutely *ZERO* trace of the previous clothing. No collars peeking out, no sleeves, no pant legs.
- *CLARIFICATION:* The 'modelImage' is a reference for the person's body, pose, and the background ONLY. For one-piece garments, you must IGNORE the clothing in the 'modelImage'.

- *top:* For tops, replace any existing top garment. If the person is wearing a one-piece, replace the entire one-piece with this new top. Keep any separate bottom garment.
- *bottom:* For bottoms, replace any existing bottom garment. If the person is wearing a one-piece, replace the entire one-piece with this new bottom. Keep any separate top garment.
- *outerwear:* Layer NATURALLY OVER the current outfit; do not erase or replace the inner layers.
`;
    }

    prompt += `
*Conflict Priority:*
1. Image fidelity (garment looks exactly like 'garmentImage').
2. Slot compliance (layering/accessory rules).
3. Keep background and pose consistent.

Your output MUST be ONLY the single, final image. NO TEXT.`;
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};


export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert AI fashion photographer. Your task is to regenerate the provided image from a new camera perspective, adhering to strict consistency rules.

*New Perspective:* "${poseInstruction}"

*CRITICAL RULES:*
1.  *STRICT CONSISTENCY:* The person's identity, their entire outfit, hairstyle, and the background scene MUST remain absolutely identical to the original image.
2.  *CAMERA ANGLE ONLY:* The ONLY change is the camera angle as specified in the new perspective. The resulting pose must be natural and physically plausible. Do not re-pose limbs in an unnatural way.
3.  *CONSISTENT LIGHTING & FRAMING:* You MUST maintain the same lighting, aspect ratio (~2:3), and framing (no cropping head or feet) as the original image.
4.  *Quality & Completeness:* The output must be a single, complete, and sharp photorealistic image. The entire person and background must be fully rendered. The image must be free of any blur, artifacts, missing parts, or text.
5.  *OUTPUT CONTRACT:* Return ONLY the single, final, photorealistic image.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateBackgroundChange = async (baseImageUrl: string, backgroundPrompt: string): Promise<string> => {
    const baseImagePart = dataUrlToPart(baseImageUrl);
    const prompt = `You are an expert AI photo editor. Your task is to seamlessly replace the background of the provided image with a new one described in the prompt, following strict rules.

*New Background Prompt:* "${backgroundPrompt}"

*CRITICAL RULES:*
1.  *PRESERVE SUBJECT:* The person's pose, and their entire outfit (clothing, accessories) MUST remain completely unchanged.
2.  *REPLACE BACKGROUND ONLY:* Create a new, photorealistic background that perfectly matches the prompt.
3.  *INTEGRATION:* Subtly adjust the global lighting on the person to match the new scene's lighting. Ensure edges around the person, especially around hair and garment hems, are perfectly clean and seamlessly blended.
4.  *Quality & Completeness:* The resulting image must be a single, complete, and sharp photorealistic image. The subject and the new background must be fully rendered, with no blur, artifacts, or missing parts.
5.  *OUTPUT CONTRACT:* Return ONLY the single, final, edited image. Do not include any text or other parts.`;

    const response = await ai.models.generateContent({
        model, // 'gemini-2.5-flash-image-preview'
        contents: { parts: [baseImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
}