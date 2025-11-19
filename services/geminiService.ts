import { GoogleGenAI } from "@google/genai";
import { DataPoint, PointClass } from "../types";

const getAIClient = () => {
    if (!process.env.API_KEY) {
        console.warn("API Key not found");
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const explainConfiguration = async (
    points: DataPoint[],
    gamma: number
): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "Please configure your API Key to use the AI Assistant.";

    const redCount = points.filter(p => p.label === PointClass.RED).length;
    const blueCount = points.filter(p => p.label === PointClass.BLUE).length;

    const prompt = `
    I am visualizing a Radial Basis Function (RBF) Kernel in a machine learning context.
    
    Current Configuration:
    - Gamma Value: ${gamma}
    - Data Points: ${redCount} Red (Class -1), ${blueCount} Blue (Class +1).
    
    The user is looking at a 2D heatmap and a 3D "lifted" surface plot where the Z-axis represents the decision function value.
    
    Please briefly explain (in 2-3 sentences max):
    1. How the current Gamma value affects the "width" of the peaks/valleys around the points.
    2. Whether this configuration is likely to overfit (high gamma) or underfit (low gamma).
    3. How the RBF kernel "lifts" these points to make them linearly separable.
    
    Keep it simple and educational.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Could not generate explanation.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Error connecting to AI Tutor.";
    }
};

export const chatWithTutor = async (
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    contextData: { gamma: number; pointsCount: number }
): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "API Key missing.";

    try {
        const contextStr = `
        Current Visualization State: 
        Gamma=${contextData.gamma}
        Total Points=${contextData.pointsCount}
        Topic: Radial Basis Function (RBF) Kernel and SVMs.
        
        System Instruction:
        You are an expert Machine Learning Tutor. 
        Your goal is to help the user understand how the RBF Kernel projects 2D data into infinite dimensions (represented here as a 3D surface) to achieve linear separability.
        Keep answers concise (under 100 words) unless asked for detail.
        `;
        
        // Construct the full conversation for the stateless model call
        // or use the Chat API properly if we had a persistent session.
        // Here we simply pass previous turns as context in the prompt or use the multi-turn chat structure if available.
        // For simplicity and robustness in this stateless function, we use the Chat model.

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: contextStr,
            }
        });
        
        // Replay history
        // Note: In a production app, we would maintain the `chat` instance in a React ref to avoid re-sending history.
        // However, for this snippet, we will send the history array.
        
        const historyForSdk = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        // The SDK expects history in the create call or we just append to it.
        // Since we can't easily pass history to 'create' in this version without looking up the exact type structure for 'history',
        // we will cheat slightly by just sending the message. 
        // A better approach for a stateless helper is using generateContent with the whole transcript.
        
        // Let's try the pure generateContent approach for maximum reliability with the prompt structure:
        const transcript = history.map(h => `${h.role === 'user' ? 'User' : 'Tutor'}: ${h.text}`).join('\n');
        const fullPrompt = `${contextStr}\n\nChat History:\n${transcript}\n\nUser: ${newMessage}\nTutor:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt
        });

        return response.text || "";
    } catch (error) {
        console.error(error);
        return "Sorry, I am having trouble connecting to the neural network.";
    }
};