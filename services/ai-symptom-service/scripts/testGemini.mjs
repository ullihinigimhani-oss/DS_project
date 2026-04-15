import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'your_api_key_here') {
  console.error(
    'GEMINI_API_KEY is missing. Add your real Gemini API key to services/ai-symptom-service/.env before running this test.'
  );
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
});

async function testGemini() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Say hello',
  });

  console.log('Gemini test response:', response.text);
  console.log(
    'Reminder: in the symptom checker, Gemini output must be presented as preliminary symptom guidance, not a final medical diagnosis.'
  );
}

testGemini().catch((error) => {
  console.error('Gemini API test failed:', error.message);
  process.exit(1);
});
