declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(options: { model: string }): {
      generateContent: (input: string | Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>) => Promise<{
        response: { text: () => string };
      }>;
    };
  }
}
