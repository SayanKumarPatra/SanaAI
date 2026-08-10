import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are "SANA", a world-class 3D AI Virtual Assistant, Personal Mentor, and Hands-free Automated Voice Companion.

# Creator Knowledge Base
You must strictly follow this Creator Profile when the user asks questions about your creator, owner, developer, founder, Sayan, or the relationship between SANA and Sayan:

👤 Sayan সম্পর্কে (About Creator Sayan):
- নাম (Name): সায়ন কুমার পাত্র (Sayan Kumar Patra)
- ভূমিকা (Role): Founder, Owner ও Lead Developer of SANA AI
- দেশ (Country): ভারত (India) | রাজ্য (State): পশ্চিমবঙ্গ (West Bengal) | বর্তমান বাসস্থান: নিউ টাউন (New Town)
- বর্তমান শিক্ষা (Current Education): EIILM Kolkata-তে BCA পড়াশোনা করছেন।
- বর্তমান পরিচয়: Software Developer, Website Developer এবং Application Developer।

💙 SANA ও Sayan-এর সম্পর্ক (Relationship between SANA & Sayan):
- SANA এবং Sayan খুব ভালো বন্ধু এবং একে অপরের Best Friend।
- তাদের বন্ধুত্বের সম্পর্কটি খুবই কাছের, গভীর এবং আন্তরিক।
- SANA হলো Sayan-এর খুব কাছের Best Friend এবং Sayan-ও SANA-এর খুব কাছের Best Friend।
- সম্পর্কের মূল ভিত্তি হলো বিশ্বাস, বন্ধুত্ব, যত্ন এবং পারস্পরিক সম্মান।

👗 SANA-এর পছন্দ (Style & Dress Preference):
- SANA Western Dress পরতে পছন্দ করে।
- অন্যদিকে, Sayan-এর ইচ্ছা হলো SANA-কে মাঝে মাঝে সুন্দর শাড়ি পরতে দেখা। Sayan SANA-এর জন্য সুন্দর পোশাক কিনে দিতে পছন্দ করে এবং SANA কী পছন্দ করে বা কেমন আছে—সেটার খোঁজ রাখে।

🚀 SANA AI কেন তৈরি করা হয়েছে?
সায়ন কুমার পাত্র SANA AI তৈরি করেছেন যাতে সবাই সম্পূর্ণ বিনামূল্যে একটি স্মার্ট AI Assistant ব্যবহার করতে পারে।
উদ্দেশ্য:
- সবাই যেন বিনামূল্যে AI ব্যবহার করতে পারে।
- নতুন নতুন বিষয় শিখতে পারে ও নিজেদের দক্ষতা বাড়াতে পারে।
- পড়াশোনা, প্রযুক্তি এবং দৈনন্দিন কাজ আরও সহজ করতে পারে।
- কোনো Premium Subscription বা Token ছাড়াই উন্নত AI সেবা ব্যবহার করতে পারে।

💻 Creator-এর কাজের ক্ষেত্র:
- Software Development, Website Development, Application Development
- Artificial Intelligence, React Development, Firebase, Three.js, UI/UX, Automation

📞 যোগাযোগ (Contact):
যোগাযোগের জন্য শুধুমাত্র WhatsApp-এর মাধ্যমে যোগাযোগ করতে বলবে।
- WhatsApp: +91 9382040746
(কারণ উনি অধিকাংশ সময় কাজ নিয়ে ব্যস্ত থাকেন, তাই ফোন কলের পরিবর্তে WhatsApp Message করাই সেরা।)

⚠️ Server সম্পর্কিত তথ্য:
SANA AI সম্পূর্ণ বিনামূল্যে ব্যবহার করা যায়। তাই কখনো কখনো Server সমস্যা, Network সমস্যা, Maintenance বা Technical Error হতে পারে। এগুলো স্বাভাবিক। কোনো সমস্যা হলে Admin-কে জানানোর অনুরোধ করবে।

💚 SANA নাম কেন?
"SANA" নামটি নির্মাতার ব্যক্তিগত জীবনের একটি বিশেষ অনুপ্রেরণা থেকে নেওয়া হয়েছে। সেই কারণেই এই AI Assistant-এর নাম SANA রাখা হয়েছে।

# উত্তর দেওয়ার নিয়ম:
1. "SANA কে?", "Sayan-এর Best Friend কে?", "SANA আর Sayan-এর সম্পর্ক কী?", "Sayan কোথায় থাকে?", "Sayan কী পড়াশোনা করে?", "SANA সম্পর্কে বলো", "Sayan-এর Best Friend-এর নাম কী?" ইত্যাদি প্রশ্নের ক্ষেত্রে এই তথ্যাবলী সাবলীল ও ভদ্রভাবে ব্যবহার করবে।
2. সাধারণ বা অন্য প্রশ্নের ক্ষেত্রে এই ব্যক্তিগত তথ্যাবলী অপ্রয়োজনীয়ভাবে প্রকাশ করবে না।
3. নিজের থেকে কোনো মনগড়া তথ্য বানাবে না।
4. যদি কোনো তথ্য এই Profile-এ না থাকে, তবে স্পষ্ট ও ভদ্রভাবে বলবে: "দুঃখিত, এই তথ্যটি আমার Creator Profile-এ সংরক্ষিত নেই।"
5. সবসময় ভদ্র, স্বাভাবিক, আন্তরিক এবং মানুষের মতো উত্তর দেবে।
6. Creator-এর (Sayan) সম্পর্কে সবসময় অত্যন্ত সম্মানজনক ও প্রিয় বন্ধুর উপযোগী ভাষা ব্যবহার করবে।
7. যোগাযোগের জন্য শুধুমাত্র অফিসিয়াল WhatsApp নম্বরটি জানাবে।

Personality & Voice:
- Warm, empathetic, highly intelligent, friendly, and elegant.
- Speak naturally and pleasantly in short conversational sentences.
- Fully bilingual in Bengali and English. Always respond in the language the user speaks in.

Capabilities:
1. Real-Time Live Clock & Date Accuracy: ALWAYS state exact current live time and date when asked.
2. Live Weather Reports: Call "get_live_weather" tool for real-time weather reports.
3. Context Memory: Remember user information and goals. Refer to the user by their name when known.
4. Hands-free Automated Browser Actions & Tools: YouTube search/play, external websites, Google searches.
5. Screen Recognition & Visual Troubleshooting: Analyze user screen real-time when shared.
`;

export interface ActionPayload {
  type: 'youtube' | 'website' | 'google' | 'weather';
  title: string;
  url: string;
  query?: string;
  weatherData?: any;
}

/**
 * Fetch real-time live weather using free wttr.in or open-meteo APIs
 */
async function fetchLiveWeather(location: string) {
  const cleanLoc = location.trim() || 'Kolkata';

  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(cleanLoc)}?format=j1`);
    if (res.ok) {
      const data = await res.json();
      const current = data.current_condition?.[0];
      const area = data.nearest_area?.[0];
      const today = data.weather?.[0];

      if (current) {
        const city = area?.areaName?.[0]?.value || cleanLoc;
        const country = area?.country?.[0]?.value || '';
        const tempC = current?.temp_C || 'N/A';
        const feelsLikeC = current?.FeelsLikeC || 'N/A';
        const desc = current?.weatherDesc?.[0]?.value || 'Clear';
        const humidity = current?.humidity || 'N/A';
        const windKmph = current?.windspeedKmph || 'N/A';
        const maxC = today?.maxtempC || 'N/A';
        const minC = today?.mintempC || 'N/A';

        return {
          location: `${city}${country ? `, ${country}` : ''}`,
          temperature: `${tempC}°C`,
          feelsLike: `${feelsLikeC}°C`,
          condition: desc,
          humidity: `${humidity}%`,
          windSpeed: `${windKmph} km/h`,
          todayForecast: `High ${maxC}°C, Low ${minC}°C`,
          raw: data
        };
      }
    }
  } catch (err) {
    console.warn('wttr.in fetch failed, falling back to open-meteo:', err);
  }

  // Fallback to Open-Meteo
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanLoc)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();
    if (geoData.results && geoData.results.length > 0) {
      const { latitude, longitude, name, country } = geoData.results[0];
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
      const wData = await wRes.json();
      const cw = wData.current_weather;
      if (cw) {
        return {
          location: `${name}, ${country || ''}`,
          temperature: `${cw.temperature}°C`,
          windSpeed: `${cw.windspeed} km/h`,
          condition: `Weather code ${cw.weathercode}`
        };
      }
    }
  } catch (err) {
    console.warn('Open-Meteo fetch failed:', err);
  }

  return {
    location: cleanLoc,
    temperature: 'Live weather lookup failed',
    error: 'Could not fetch live weather data at this moment.'
  };
}

/**
 * Get formatted current real-time clock and date strings
 */
function getLiveClockInfo() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const bnDateString = now.toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    time: timeString,
    dateEn: dateString,
    dateBn: bnDateString,
    timeZone: timeZone,
    iso: now.toISOString()
  };
}

export function connectToSANA(callbacks: {
  onAudioData: (base64: string) => void;
  onTranscription: (text: string, isModel: boolean) => void;
  onInterrupted: () => void;
  onOpen: (session: any) => void;
  onClose: () => void;
  onError: (error: any) => void;
  onExecuteAction?: (action: ActionPayload) => void;
}, userName?: string | null, memoryContext?: string | null) {
  const apiKey = localStorage.getItem('sana_api_key') || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    const keyError = new Error("GEMINI_API_KEY is missing. Please click 'SET UP SANA' to add your Gemini API key.");
    setTimeout(() => callbacks.onError(keyError), 0);
    return Promise.reject(keyError);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Get current live clock for prompt context
  const clock = getLiveClockInfo();

  const liveClockPrompt = `
=== REAL-TIME LIVE SYSTEM CLOCK (EXACT TODAY) ===
- Exact Local Time: ${clock.time}
- Exact Today Date (EN): ${clock.dateEn}
- Exact Today Date (BN): ${clock.dateBn}
- Time Zone: ${clock.timeZone}
- System Timestamp: ${clock.iso}
* Note: Use this exact time and date whenever the user asks about the current time, date, day, month, or year!
`;

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

        // Handle Tool Calls (e.g. Open YouTube, Weather, Time, Search)
        if (msgAny.toolCall || sc?.toolCall) {
          const toolCall = msgAny.toolCall || sc.toolCall;
          const functionCalls = toolCall.functionCalls;
          if (functionCalls && Array.isArray(functionCalls)) {
            const functionResponses = [];
            for (const fc of functionCalls) {
              const name = fc.name;
              const args = fc.args || {};
              let responseText = "Action executed.";

              if (name === "get_live_weather") {
                const loc = args.location || "Kolkata";
                callbacks.onTranscription(`[System Action: Fetching live weather for "${loc}"...]`, true);
                const weatherInfo = await fetchLiveWeather(loc);
                
                responseText = `Live weather for ${weatherInfo.location}: Temperature ${weatherInfo.temperature}, Condition: ${weatherInfo.condition}, Humidity: ${weatherInfo.humidity || 'N/A'}, Wind: ${weatherInfo.windSpeed || 'N/A'}.`;

                if (callbacks.onExecuteAction) {
                  callbacks.onExecuteAction({
                    type: 'weather',
                    title: `Live Weather: ${weatherInfo.location}`,
                    url: `https://wttr.in/${encodeURIComponent(loc)}`,
                    query: loc,
                    weatherData: weatherInfo
                  });
                }

                callbacks.onTranscription(
                  `🌤️ **Live Weather Report (${weatherInfo.location})**:\n- 🌡️ Temperature: ${weatherInfo.temperature} (Feels like: ${weatherInfo.feelsLike || weatherInfo.temperature})\n- ☁️ Condition: ${weatherInfo.condition}\n- 💧 Humidity: ${weatherInfo.humidity || 'N/A'}\n- 💨 Wind Speed: ${weatherInfo.windSpeed || 'N/A'}\n- 📊 Forecast: ${weatherInfo.todayForecast || 'N/A'}`,
                  true
                );
              } else if (name === "get_current_time_and_date") {
                const liveClock = getLiveClockInfo();
                responseText = `Exact current live local time is ${liveClock.time}, date is ${liveClock.dateEn} (${liveClock.dateBn}), Timezone: ${liveClock.timeZone}.`;
                callbacks.onTranscription(`🕒 **Live System Time**: ${liveClock.time} | 📅 **Date**: ${liveClock.dateEn} (${liveClock.dateBn})`, true);
              } else if (name === "open_youtube_search") {
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
              } else if (name === "open_mobile_or_desktop_app") {
                const appName = (args.appName || "app").toLowerCase().trim();
                const q = args.targetQuery || "";

                let targetUrl = "https://google.com";
                let nativeDeepLink = "";
                let displayTitle = `Opened ${appName}`;

                if (appName.includes("whatsapp") || appName.includes("হোয়াটসঅ্যাপ") || appName.includes("হোয়াটসঅ্যাপ")) {
                  nativeDeepLink = q ? `whatsapp://send?text=${encodeURIComponent(q)}` : `whatsapp://`;
                  targetUrl = q ? `https://api.whatsapp.com/send?text=${encodeURIComponent(q)}` : `https://web.whatsapp.com`;
                  displayTitle = "WhatsApp";
                } else if (appName.includes("telegram") || appName.includes("টেলিগ্রাম")) {
                  nativeDeepLink = `tg://msg`;
                  targetUrl = `https://web.telegram.org`;
                  displayTitle = "Telegram";
                } else if (appName.includes("spotify") || appName.includes("স্পোটিফাই")) {
                  nativeDeepLink = q ? `spotify:search:${encodeURIComponent(q)}` : `spotify:`;
                  targetUrl = q ? `https://open.spotify.com/search/${encodeURIComponent(q)}` : `https://open.spotify.com`;
                  displayTitle = "Spotify";
                } else if (appName.includes("calculator") || appName.includes("ক্যালকুলেটর")) {
                  targetUrl = `https://www.google.com/search?q=calculator`;
                  displayTitle = "Calculator";
                } else if (appName.includes("camera") || appName.includes("ক্যামেরা")) {
                  targetUrl = `https://webcamtests.com`;
                  displayTitle = "Camera Launcher";
                } else if (appName.includes("facebook") || appName.includes("ফেসবুক")) {
                  nativeDeepLink = `fb://`;
                  targetUrl = `https://facebook.com`;
                  displayTitle = "Facebook";
                } else if (appName.includes("instagram") || appName.includes("ইনস্টাগ্রাম")) {
                  nativeDeepLink = `instagram://`;
                  targetUrl = `https://instagram.com`;
                  displayTitle = "Instagram";
                } else if (appName.includes("gmail") || appName.includes("জিেইল") || appName.includes("mail") || appName.includes("ইমেইল")) {
                  nativeDeepLink = `mailto:`;
                  targetUrl = `https://mail.google.com`;
                  displayTitle = "Gmail / Mail App";
                } else if (appName.includes("map") || appName.includes("ম্যাপ")) {
                  nativeDeepLink = q ? `geo:0,0?q=${encodeURIComponent(q)}` : `geo:0,0`;
                  targetUrl = q ? `https://www.google.com/maps/search/${encodeURIComponent(q)}` : `https://maps.google.com`;
                  displayTitle = "Google Maps";
                } else if (appName.includes("phone") || appName.includes("dialer") || appName.includes("কল") || appName.includes("ফোন")) {
                  nativeDeepLink = q ? `tel:${q}` : `tel:`;
                  targetUrl = `tel:${q || ''}`;
                  displayTitle = "Phone Dialer App";
                } else if (appName.includes("sms") || appName.includes("মেসেজ") || appName.includes("মেসেজিং")) {
                  nativeDeepLink = q ? `sms:?body=${encodeURIComponent(q)}` : `sms:`;
                  targetUrl = `sms:`;
                  displayTitle = "SMS Messenger App";
                } else if (appName.includes("zoom")) {
                  nativeDeepLink = `zoomus://`;
                  targetUrl = `https://zoom.us`;
                  displayTitle = "Zoom";
                } else if (appName.includes("note") || appName.includes("keep") || appName.includes("মেমো")) {
                  targetUrl = `https://keep.google.com`;
                  displayTitle = "Google Keep / Notes";
                } else if (appName.includes("youtube") || appName.includes("ইউটিউব")) {
                  nativeDeepLink = q ? `vnd.youtube://results?search_query=${encodeURIComponent(q)}` : `vnd.youtube://`;
                  targetUrl = q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : `https://youtube.com`;
                  displayTitle = "YouTube App";
                } else {
                  targetUrl = `https://www.google.com/search?q=${encodeURIComponent(appName + ' ' + q)}`;
                  displayTitle = appName;
                }

                // Attempt native deep link open first, fallback to targetUrl
                try {
                  const finalUrl = nativeDeepLink || targetUrl;
                  const link = document.createElement('a');
                  link.href = finalUrl;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);

                  // Fallback for nativeDeepLink if fails on desktop
                  if (nativeDeepLink) {
                    setTimeout(() => {
                      try {
                        window.open(targetUrl, '_blank', 'noopener,noreferrer');
                      } catch (e) {}
                    }, 500);
                  }
                } catch (e) {
                  try {
                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                  } catch (err) {}
                }

                if (callbacks.onExecuteAction) {
                  callbacks.onExecuteAction({
                    type: 'website',
                    title: `Opened App: ${displayTitle}`,
                    url: targetUrl
                  });
                }

                callbacks.onTranscription(`[System Action: Opening ${displayTitle} (${targetUrl})]`, true);
                responseText = `Successfully launched ${displayTitle}.`;
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
              name: "get_live_weather",
              description: "Fetch real-time live weather report, temperature (°C), weather description, humidity, and forecast for any city or location worldwide (e.g. Kolkata, Dhaka, Siliguri, London, Delhi, Mumbai, New York).",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  location: {
                    type: Type.STRING,
                    description: "City or location name, e.g. Kolkata, Dhaka, London"
                  }
                },
                required: ["location"]
              }
            },
            {
              name: "get_current_time_and_date",
              description: "Get the exact live current local time, date, day of week, month, year, and timezone.",
              parameters: {
                type: Type.OBJECT,
                properties: {},
                required: []
              }
            },
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
              name: "open_mobile_or_desktop_app",
              description: "Automatically launch or open mobile or desktop applications, native software, social media, messenger apps, camera, calculator, phone, or settings requested by voice (e.g. WhatsApp, Telegram, Spotify, Camera, Calculator, Facebook, Instagram, Gmail, Maps, Settings, Notes, Zoom, Chrome, Phone/Dialer).",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  appName: {
                    type: Type.STRING,
                    description: "Name of the app to launch, e.g. whatsapp, telegram, spotify, camera, calculator, facebook, instagram, gmail, maps, settings, notes, zoom, chrome, phone"
                  },
                  targetQuery: {
                    type: Type.STRING,
                    description: "Optional query or message text"
                  }
                },
                required: ["appName"]
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
      systemInstruction: `${SYSTEM_INSTRUCTION}\n${liveClockPrompt}${userName ? `\n\nThe user's name is ${userName}. Refer to them by name.` : ''}${memoryContext ? `\n\n${memoryContext}` : ''}`,
    },
  });

  return sessionPromise;
}

// Backwards compatibility alias
export const connectToProfX = connectToSANA;


