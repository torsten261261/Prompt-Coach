import { GoogleGenAI, Type } from "@google/genai";
import { ClarifyingQuestion, Message, NextStep, QnaHistoryItem } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const model = 'gemini-2.5-flash';

/**
 * Extracts and parses JSON from a string, handling markdown code blocks.
 * @param text The raw text from the API response.
 * @returns The parsed JSON object.
 */
const extractAndParseJson = <T>(text: string): T => {
  // Find JSON within a markdown block or use the whole string
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  const jsonString = match ? match[1] : text;

  try {
    return JSON.parse(jsonString.trim()) as T;
  } catch (error) {
    console.error("Failed to parse JSON from API response. Raw string:", jsonString);
    throw new Error("Could not parse the JSON response from the API.");
  }
};


export const getFirstQuestion = async (initialPrompt: string): Promise<ClarifyingQuestion> => {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Ein Nutzer möchte einen Prompt für eine generative KI erstellen. Seine ursprüngliche Idee ist: "${initialPrompt}". Generiere die allererste, wichtigste klärende Frage, um die Absicht des Nutzers besser zu verstehen. Sprich den Nutzer direkt mit "Du" an. Stelle auch 3-4 kurze, hilfreiche Beispielantworten als Optionen zur Verfügung.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
      },
    });
    
    const result = extractAndParseJson<ClarifyingQuestion>(response.text);

    if (result && result.question && Array.isArray(result.options)) {
      return result;
    }
    throw new Error('Invalid response format from API for the first question.');
  } catch (error) {
    console.error("Error getting first question:", error);
    throw new Error("Could not generate the first question.");
  }
};

export const getNextStep = async (
  conversationHistory: Message[],
  currentQuestion: string,
  userAnswer: string
): Promise<NextStep> => {
  const formattedHistory = conversationHistory
    .map(msg => `${msg.sender === 'user' ? 'Nutzer' : 'Coach'}: ${msg.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Du bist ein "Prompt-Coach". Deine Aufgabe ist es, einem Nutzer zu helfen, eine vage Idee in einen hervorragenden, detaillierten KI-Prompt zu verwandeln. Du tust dies, indem du eine Reihe von klärenden Fragen stellst. Sprich den Nutzer immer mit "Du" an.

Hier ist der bisherige Gesprächsverlauf:
${formattedHistory}

Die letzte Frage, die du gestellt hast, war: "${currentQuestion}"
Die Antwort des Nutzers darauf war: "${userAnswer}"

Analysiere die Antwort des Nutzers und entscheide den nächsten Schritt:

1.  **ERKLÄRUNG GEBEN:** Wenn die Antwort des Nutzers eine Gegenfrage ist (z.B. "Was meinst du mit 'Struktur'?", "Kannst du das erklären?"), ist der Nutzer unsicher. Gib eine kurze, hilfreiche Erklärung zu deiner Frage. **Antworte mit JSON:** \`{ "type": "explanation", "text": "Deine Erklärung..." }\`

2.  **NÄCHSTE FRAGE STELLEN:** Wenn der Nutzer eine klare Antwort gegeben hat, stelle die nächste logische Frage, um den Prompt weiter zu verfeinern. Decke schrittweise Aspekte wie Zielgruppe, Format, Stil, Tonalität, Persona der KI etc. ab. Stelle auch immer 3-4 hilfreiche Beispiel-Optionen zur Verfügung. **Antworte mit JSON:** \`{ "type": "next_question", "question": { "question": "Deine nächste Frage...", "options": ["Option A", "Option B", "Option C"] } }\`

3.  **PROMPT GENERIEREN:** Wenn du glaubst, genügend Informationen gesammelt zu haben (typischerweise nach 3-5 sinnvollen Antworten des Nutzers), ist es an der Zeit, das Fragen zu beenden. **Antworte mit JSON:** \`{ "type": "generate_prompt" }\`

Wähle EINEN der oben genannten Schritte und gib NUR das entsprechende JSON-Objekt zurück. Deine Antwort darf absolut keinen Text vor oder nach dem JSON-Codeblock enthalten.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            text: { type: Type.STRING, nullable: true },
            question: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              nullable: true
            }
          },
        },
      },
    });

    const result = extractAndParseJson<NextStep>(response.text);

    if (result && result.type) {
      return result;
    }
    throw new Error('Invalid response format from API for next step.');

  } catch (error) {
    console.error("Error getting next step:", error);
    throw new Error("Could not determine the next step.");
  }
};


export const generateOptimizedPrompt = async (
  initialPrompt: string,
  qnaHistory: QnaHistoryItem[],
): Promise<string> => {
  const conversation = qnaHistory.map(item => `Frage: ${item.question}\nAntwort: ${item.answer}`).join('\n\n');

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Erstelle basierend auf der ursprünglichen Idee des Nutzers und dem folgenden Frage-Antwort-Verlauf einen neuen, optimierten Prompt.
        
        **Grundstruktur:** Verwende das "Rolle, Aufgabe, Ziel" (Role, Task, Goal) Prinzip. Berücksichtige dabei auch die folgenden Aspekte: Kontext (wer ist die KI, wer bin ich?), Format (wie soll die Ausgabe aussehen?), Stil (in welchem Ton?), Begrenzung (was soll vermieden werden?) und Reflexion (bitte die KI, ihre Antwort zu überprüfen).
        
        **Deine ursprüngliche Idee:** "${initialPrompt}"
        
        **Klärende Fragen und deine Antworten:**
        ${conversation}
        
        Formuliere den finalen, optimierten Prompt als eine einzige, direkt verwendbare Anweisung. Formatiere den Prompt klar und strukturiert mit Markdown (z.B. Überschriften, Listen).`,
      config: {
        temperature: 0.7,
      },
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error generating optimized prompt:", error);
    throw new Error("Could not generate the optimized prompt.");
  }
};

export const refinePrompt = async (currentPrompt: string, feedback: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Überarbeite den folgenden Prompt basierend auf dem Feedback des Benutzers. Behalte dabei die Grundstruktur ("Rolle, Aufgabe, Ziel") bei und achte auf die Aspekte Kontext, Format, Stil, Begrenzung und Reflexion.

        **Aktueller Prompt:**
        ---
        ${currentPrompt}
        ---
        
        **Dein Feedback (was fehlt oder verbessert werden soll):**
        ---
        ${feedback}
        ---
        
        Gib nur den neuen, überarbeiteten Prompt als Antwort aus.`,
      config: {
        temperature: 0.6,
      },
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error refining prompt:", error);
    throw new Error("Could not refine the prompt.");
  }
};