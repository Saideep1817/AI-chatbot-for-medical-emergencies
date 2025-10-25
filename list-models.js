// List available Gemini models
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyAWy_tnvw1SotL5U7__2SF2vza04u9SGe8';
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    console.log('Fetching available models...\n');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.models) {
      console.log('Available models that support generateContent:\n');
      data.models
        .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        .forEach(model => {
          console.log(`✅ ${model.name.replace('models/', '')}`);
          console.log(`   Display Name: ${model.displayName}`);
          console.log(`   Description: ${model.description}`);
          console.log('');
        });
    } else {
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

listModels();
