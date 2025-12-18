import { GoogleGenAI } from "@google/genai";
import { JobConfig, ModelType, InputType } from "../types";

// Helper to wait
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateVideoJob = async (config: JobConfig): Promise<string> => {
  // Ensure we have an API key from the selection environment
  if (!process.env.API_KEY) {
    throw new Error("API Key not found. Please select a project.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare payload
  let operation;

  try {
    if (config.inputType === InputType.IMAGE && config.imageBase64) {
        // Image-to-Video
        operation = await ai.models.generateVideos({
            model: config.model,
            prompt: config.prompt, // Prompt is mandatory or optional depending on model, but usually good to have
            image: {
                imageBytes: config.imageBase64,
                mimeType: config.imageMimeType || 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: config.resolution,
                aspectRatio: config.aspectRatio,
            }
        });
    } else {
        // Text-to-Video
        operation = await ai.models.generateVideos({
            model: config.model,
            prompt: config.prompt,
            config: {
                numberOfVideos: 1,
                resolution: config.resolution,
                aspectRatio: config.aspectRatio,
            }
        });
    }

    // Polling logic
    while (!operation.done) {
        await delay(5000); // Check every 5 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // Extract Result
    if (operation.error) {
        throw new Error(operation.error.message || "Unknown generation error");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
        throw new Error("No video URI returned in response");
    }

    return videoUri;

  } catch (error: any) {
    console.error("Gemini Video Gen Error:", error);
    throw new Error(error.message || "Failed to generate video");
  }
};

export const fetchVideoBlob = async (uri: string): Promise<string> => {
    // We need to fetch the video with the API key and convert to a local blob URL
    // so the video tag can play it without CORS/Auth issues.
    const urlWithKey = `${uri}&key=${process.env.API_KEY}`;
    const response = await fetch(urlWithKey);
    if (!response.ok) throw new Error("Failed to download video file");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
