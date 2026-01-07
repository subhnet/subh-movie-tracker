
require('dotenv').config({ path: '.env' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env');
        return;
    }

    console.log(`Checking models for API key: ${apiKey.substring(0, 8)}...`);

    try {
        // Direct REST call to ensure we see exactly what the API returns
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.models) {
            console.log('\n✅ AVAILABLE MODELS (supporting generateContent):');
            const contentModels = data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));

            contentModels.forEach(m => {
                console.log(`- ${m.name.replace('models/', '')}`);
            });

            console.log('\n(Copy one of the above names into lib/ai-service.ts)');
        } else {
            console.log('No models found:', data);
        }

    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
