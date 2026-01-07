
import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardData, Page, Character } from "./types";

// Fix: Strictly follow initialization guidelines by using process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Develops a seed idea into a content-rich screenplay tailored to a specific panel count.
 * Focuses on cinematic detail and logical progression.
 */
export async function developStoryConcept(idea: string, targetPanels: number): Promise<{ story: string; screenplay: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `You are a world-class cinematic director and screenplay logic engine. 
    TASK:
    1. Expand the SEED IDEA into a compelling narrative summary.
    2. Write an EXHAUSTIVE SCREENPLAY containing exactly ${targetPanels} distinct, sequential beats. 
       CRITICAL: Each beat must be a specific visual action or camera moment. 
       The flow must be perfectly natural with no gaps in time or logic. 
       Keep actions simple but descriptive enough for visual drafting.
    
    SEED IDEA:
    ${idea}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          story: { type: Type.STRING },
          screenplay: { type: Type.STRING, description: "The sequential screenplay beats." },
        },
        required: ["story", "screenplay"],
      },
    },
  });

  // Fix: Access response.text as a property, not a method
  return JSON.parse(response.text || "{}");
}

/**
 * Groups screenplay into a specific number of pages and panels.
 * Strictly enforces Left-to-Right, Top-to-Bottom flow.
 */
export async function generateStoryboardFromText(
  text: string, 
  numPages: number, 
  numPanelsPerPage: number
): Promise<StoryboardData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `You are a professional storyboard layout artist.
    TASK:
    1. CHARACTER DESIGN: Use minimalist silhouettes or featureless mannequins with one identifier (e.g., "Silhouette A", "Mannequin with hat").
    2. STRUCTURE: Break the screenplay into EXACTLY ${numPages} PAGES.
    3. DENSITY: Each PAGE MUST contain EXACTLY ${numPanelsPerPage} sequential PANELS.
    4. GRID ORDER: Panels must be organized for a grid layout that reads strictly LEFT-TO-RIGHT then NEXT ROW. 
       - Panel 1 is top-left.
       - Panel 2 is to its right.
       - Continue until row end, then move down to the next row starting from the left.
    
    SCREENPLAY TEXT:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                appearance: { type: Type.STRING },
              },
              required: ["id", "name", "appearance"],
            },
          },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                pageNumber: { type: Type.INTEGER },
                pageLayoutDescription: { type: Type.STRING },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      sceneNumber: { type: Type.INTEGER },
                      location: { type: Type.STRING },
                      action: { type: Type.STRING },
                      dialogue: { type: Type.STRING },
                      visualPrompt: { type: Type.STRING },
                    },
                    required: ["id", "sceneNumber", "location", "action", "visualPrompt"],
                  },
                },
              },
              required: ["id", "pageNumber", "scenes", "pageLayoutDescription"],
            },
          },
        },
        required: ["title", "characters", "pages"],
      },
    },
  });

  // Fix: Access response.text as a property, not a method
  return JSON.parse(response.text || "{}");
}

/**
 * Generates a technical manga page image with a strict grid layout.
 */
export async function generatePageImage(
  page: Page, 
  allCharacters: Character[]
): Promise<string> {
  const characterContext = allCharacters
    .map(c => `${c.name}: ${c.appearance}`)
    .join(". ");

  const scenesPrompts = page.scenes
    .map(s => `Panel ${s.sceneNumber}: ${s.visualPrompt}. Beat: ${s.action}`)
    .join(". ");
    
  const fullPrompt = `Cinematic Technical Storyboard Page. 
  Vertical 3:4 Manga Layout. 
  GRID: ${page.scenes.length} panels, reading strictly LEFT-TO-RIGHT, TOP-TO-BOTTOM (row by row).
  CHARACTERS: ${characterContext} (Minimalist drafting mannequins). 
  PANEL CONTENT: ${scenesPrompts}. 
  STYLE: Rough director's ink sketch. Stark black lines on white paper. No colors, no gray tones. High technical contrast. 
  FOCUS: Anatomy blocking, camera perspective (Wide, Medium, Close-up), and environmental spatial logic.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: fullPrompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4", 
      }
    }
  });

  let imageUrl = "";
  // Fix: Iterate through all parts to find the inlineData part as per image generation guidelines
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageUrl) throw new Error("Drafting system error.");
  return imageUrl;
}
