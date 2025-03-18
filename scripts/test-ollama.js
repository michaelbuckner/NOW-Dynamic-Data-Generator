/**
 * test-ollama.js
 * 
 * A simple script to test the Ollama integration before generating bulk data.
 * This script will attempt to connect to Ollama and generate a sample text.
 * 
 * Usage:
 * node test-ollama.js [model]
 * 
 * Example:
 * node test-ollama.js llama3.3
 * node test-ollama.js mistral
 */

const OllamaLLM = require('../src/llm/OllamaLLMIntegration');

// Get model from command line argument or use default
const model = process.argv[2] || 'llama3.3';

async function testOllama() {
  console.log(`Testing Ollama integration with model: ${model}`);
  console.log('Connecting to Ollama at localhost:11434...');
  
  try {
    // Initialize Ollama LLM
    const llm = new OllamaLLM({
      model: model,
      temperature: 0.7,
      maxTokens: 100
    });
    
    // Test prompts for different field types
    const testPrompts = [
      {
        name: 'short_description',
        prompt: 'Generate a realistic, concise short description for an incident record. Make it specific and business-relevant.'
      },
      {
        name: 'category',
        prompt: 'Generate a single IT service category name (like Network, Hardware, Software, Security, etc.)'
      },
      {
        name: 'description',
        prompt: 'Generate a brief detailed description for an incident record. Include specific details that would be found in a real incident.'
      }
    ];
    
    console.log('\nGenerating sample text for different field types:');
    console.log('------------------------------------------------');
    
    for (const test of testPrompts) {
      console.log(`\nField: ${test.name}`);
      console.log(`Prompt: ${test.prompt}`);
      
      const startTime = Date.now();
      const result = await llm.generateText(test.prompt, 100);
      const endTime = Date.now();
      
      console.log(`Result: ${result}`);
      console.log(`Time taken: ${endTime - startTime}ms`);
    }
    
    console.log('\n✅ Ollama integration test completed successfully!');
    console.log('You can now use the Bulk Data Generator with Ollama for generating realistic data.');
    
  } catch (error) {
    console.error('\n❌ Error testing Ollama integration:');
    console.error(error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Ensure Ollama is installed and running (ollama serve)');
    console.error(`2. Ensure you have pulled the model: ollama pull ${model}`);
    console.error('3. Check that Ollama is accessible at localhost:11434');
    process.exit(1);
  }
}

// Run the test
testOllama().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
