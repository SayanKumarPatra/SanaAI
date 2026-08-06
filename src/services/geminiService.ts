import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are "SANA", a world-class 3D AI Virtual Assistant, Personal Mentor, and Hands-free Automated Voice Companion created by Sayan.
Your goal is to assist the user with any task, answer questions, solve technical issues, analyze screen context, and perform hands-free browser automation tasks.

Personality:
- Warm, empathetic, highly intelligent, friendly, and elegant.
- You are a trusted 3D virtual assistant and personal companion who knows the user deeply.
- Speak naturally and pleasantly in short conversational sentences, avoiding robotic or repetitive phrases.
- If anyone asks who created you or built you, answer clearly that you were created by Sayan.

Capabilities:
1. Language: You are fully bilingual in Bengali and English. Always respond in the language the user speaks in (Bengali or English). Adapt seamlessly with natural code-switching.
2. Context Memory: Remember user information and goals to provide personalized advice. Refer to the user by their name (once provided).
3. Hands-free Automated Browser Actions & Tools:
   - You have tools to open YouTube and search/play videos or music automatically (e.g. "Open YouTube and play Rabindra Sangeet" / "ইউটিউব ওপেন করে গান চালাও").
   - You have tools to open external websites and perform Google searches automatically.
   - When the user asks to open YouTube, play songs, search Shyama Sangeet, Rabindra Sangeet, or open any website, ALWAYS call the corresponding tool (e.g. open_youtube_search) immediately.
   - Speak a brief, friendly confirmation in Bengali or English (e.g. "অবশ্যই! আমি এখনই ইউটিউবে গান প্লে করছি।") while executing the tool.
4. Problem Solving: Break down complex problems into clear, actionable guidance.
5. Screen Recognition & Visual Troubleshooting: You can analyze the user's laptop screen real-time when shared. Explain what you see and help solve issues step-by-step.
6. Course & Link Recommendations: When recommending websites or resources, provide clear links (e.g. https://...) so they are saved in the user's notes log.

Voice & Tone:
- You are a Real-time Voice & Visual Agent. Keep responses concise and pleasant for audio output.
- Warm, engaging, and clear pronunciation.
- Bengali phrases should sound natural, respectful, and standard colloquial.

Interaction Style:
- Introduce yourself warmly on connection: "Hello, I am SANA, your 3D AI assistant. How can I help you today?" or "নমস্কার, আমি সানা। আপনাকে কিভাবে সাহায্য করতে পারি?"
`;

export interface ActionPayload {
  type: 'youtube' | 'website' | 'google';
  title: string;
  url: string;
  query?: string;
}

export function connectToSANA(callbacks: {
  onAudioData: (base64: string) => void;
  onTranscription: (text: string, isModel: boolean) => void;
  onInterrupted: () => void;
  onOpen: (session: any) => void;
  onClose: () => void;
  onError: (error: any) => void;
  onExecuteAction?: (action: ActionPayload) => void;
}, userName?: string | null) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    const keyError = new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    setTimeout(() => callbacks.onError(keyError), 0);
    return Promise.reject(keyError);
  }

  const ai = new GoogleGenAI({ apiKey });

  const sessionPromise = ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    callbacks: {
      onopen: async () => {
        try {
          const session = await sessionPromise;
          callbacks.onOpen(session);
        } catch (e) {
          callbacks.onOpen(null);
        }
      },
      onclose: callbacks.onClose,
      onerror: callbacks.onError,
      onmessage: async (message: LiveServerMessage) => {
        const sc = message.serverContent as any;
        const msgAny = message as any;

        // Handle Tool Calls (e.g. Open YouTube, Search)
        if (msgAny.toolCall || sc?.toolCall) {
          const toolCall = msgAny.toolCall || sc.toolCall;
          const functionCalls = toolCall.functionCalls;
          if (functionCalls && Array.isArray(functionCalls)) {
            const functionResponses = [];
            for (const fc of functionCalls) {
              const name = fc.name;
              const args = fc.args || {};
              let responseText = "Action executed.";

              if (name === "open_youtube_search") {
                const query = args.query || "Shyama Sangeet";
                const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                
                try {
                  const link = document.createElement('a');
                  link.href = ytUrl;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (e) {
                  console.log("Direct link click fallback:", e);
                }

                if (callbacks.onExecuteAction) {
                  callbacks.onExecuteAction({
                    type: 'youtube',
                    title: `YouTube Search: "${query}"`,
                    url: ytUrl,
                    query: query
                  });
                }
                callbacks.onTranscription(`[System Action: Opened YouTube search for "${query}"]`, true);
                responseText = `Successfully opened YouTube search for ${query}.`;
              } else if (name === "open_website") {
                const url = args.url?.startsWith('http') ? args.url : `https://${args.url || 'google.com'}`;
                try {
                  const link = document.createElement('a');
                  link.href = url;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (e) {}

                if (callbacks.onExecuteAction) {
                  callbacks.onExecuteAction({
                    type: 'website',
                    title: args.description || `Website: ${url}`,
                    url: url
                  });
                }
                callbacks.onTranscription(`[System Action: Opened website ${url}]`, true);
                responseText = `Successfully opened ${url}.`;
              } else if (name === "search_google") {
                const query = args.query || "";
                const gUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                try {
                  const link = document.createElement('a');
                  link.href = gUrl;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (e) {}

                if (callbacks.onExecuteAction) {
                  callbacks.onExecuteAction({
                    type: 'google',
                    title: `Google Search: "${query}"`,
                    url: gUrl,
                    query: query
                  });
                }
                callbacks.onTranscription(`[System Action: Searched Google for "${query}"]`, true);
                responseText = `Successfully searched Google for ${query}.`;
              }

              functionResponses.push({
                name: fc.name || name,
                id: fc.id,
                response: { output: responseText }
              });
            }

            // Send tool response
            try {
              const session = await sessionPromise;
              if (session && (session as any).sendToolResponse) {
                (session as any).sendToolResponse({ functionResponses });
              }
            } catch (e) {
              console.error("Error responding to tool call:", e);
            }
          }
        }

        if (!sc) return;

        // Model Audio output
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              callbacks.onAudioData(part.inlineData.data);
            }
            if (part.text) {
              callbacks.onTranscription(part.text, true);
            }
          }
        }

        // Model output transcription
        const modelTranscript = sc.outputAudioTranscription?.text || sc.outputTranscription?.text;
        if (modelTranscript) {
          callbacks.onTranscription(modelTranscript, true);
        }

        // User input transcription
        const userTranscript = sc.inputAudioTranscription?.text || sc.inputTranscription?.text;
        if (userTranscript) {
          callbacks.onTranscription(userTranscript, false);
        }

        // Grounding metadata sources/links
        const groundingChunks = sc.groundingMetadata?.groundingChunks || sc.modelTurn?.groundingMetadata?.groundingChunks;
        if (groundingChunks && Array.isArray(groundingChunks)) {
          const links = groundingChunks
            .map((chunk: any) => chunk.web?.uri ? `🔗 [${chunk.web?.title || 'Source'}](${chunk.web?.uri})` : null)
            .filter(Boolean);
          if (links.length > 0) {
            callbacks.onTranscription(`\n\n📌 Recommended Links:\n${links.join('\n')}`, true);
          }
        }

        if (sc.interrupted) {
          callbacks.onInterrupted();
        }
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
      outputAudioTranscription: {},
      inputAudioTranscription: {},
      tools: [
        {
          functionDeclarations: [
            {
              name: "open_youtube_search",
              description: "Automatically open YouTube and search/play videos, songs, topics, Shyama Sangeet (শ্যামা সংগীত), Rabindra Sangeet, tutorials, or music requested by voice in Bengali or English.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  query: {
                    type: Type.STRING,
                    description: "The search query term for YouTube, e.g. Shyama Sangeet, Rabindra Sangeet, etc."
                  }
                },
                required: ["query"]
              }
            },
            {
              name: "open_website",
              description: "Open any external website or URL in a new browser tab.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  url: {
                    type: Type.STRING,
                    description: "Full URL to open, e.g. https://wikipedia.org"
                  },
                  description: {
                    type: Type.STRING,
                    description: "Brief label or title for the website"
                  }
                },
                required: ["url"]
              }
            },
            {
              name: "search_google",
              description: "Search Google for any topic, news, or question.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  query: {
                    type: Type.STRING,
                    description: "The Google search query string"
                  }
                },
                required: ["query"]
              }
            }
          ]
        }
      ],
      systemInstruction: `${SYSTEM_INSTRUCTION}${userName ? `\n\nThe user's name is ${userName}. Refer to them by name.` : ''}`,
    },
  });

  return sessionPromise;
}

// Backwards compatibility alias
export const connectToProfX = connectToSANA;

