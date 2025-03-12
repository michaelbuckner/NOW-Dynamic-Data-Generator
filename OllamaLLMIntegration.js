/**
 * OllamaLLMIntegration.js
 * 
 * Example implementation of LLM integration with Ollama for the Bulk Data Generator.
 * This file demonstrates how to connect to Ollama for generating text fields.
 * 
 * To use this integration:
 * 1. Install Ollama (https://ollama.ai/)
 * 2. Pull a model (e.g., `ollama pull llama3.3` or `ollama pull mistral`)
 * 3. Replace the LLMStub class in BulkDataGenerator.js with this implementation
 */

const https = require('https');
const http = require('http');

class OllamaLLM {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 11434;
    this.model = options.model || 'llama3.3';
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 100;
    
    console.log(`Ollama LLM integration initialized with model: ${this.model}`);
  }

  /**
   * Generate text using Ollama
   * @param {string} prompt - The prompt to generate text from
   * @param {number} maxLength - Maximum length of the generated text
   * @returns {Promise<string>} - The generated text
   */
  async generateText(prompt, maxLength = 100) {
    try {
      const response = await this._callOllamaAPI(prompt, Math.min(maxLength, this.maxTokens));
      return response.substring(0, maxLength);
    } catch (error) {
      console.error('Error generating text with Ollama:', error.message);
      // Fallback to a simple text generation if Ollama fails
      return `Generated text for: ${prompt}`.substring(0, maxLength);
    }
  }

  /**
   * Call the Ollama API
   * @param {string} prompt - The prompt to generate text from
   * @param {number} maxTokens - Maximum number of tokens to generate
   * @returns {Promise<string>} - The generated text
   */
  _callOllamaAPI(prompt, maxTokens) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: this.model,
        prompt: prompt,
        temperature: this.temperature,
        max_tokens: maxTokens
      });

      const options = {
        hostname: this.host,
        port: this.port,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            // Ollama returns JSON objects for each token, so we need to parse them
            // and extract the generated text
            const lines = responseData.trim().split('\n');
            let fullText = '';
            
            for (const line of lines) {
              try {
                const parsedLine = JSON.parse(line);
                if (parsedLine.response) {
                  fullText += parsedLine.response;
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
            
            resolve(fullText.trim());
          } catch (error) {
            reject(new Error(`Failed to parse Ollama response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Ollama API request failed: ${error.message}`));
      });

      req.write(data);
      req.end();
    });
  }
}

// Example usage:
async function testOllamaLLM() {
  const llm = new OllamaLLM({
    model: 'llama3.3', // Change to the model you've pulled
    temperature: 0.7,
    maxTokens: 100
  });

  const prompt = 'Generate a short description for a network incident';
  console.log(`Prompt: ${prompt}`);
  
  const result = await llm.generateText(prompt, 100);
  console.log(`Generated text: ${result}`);
}

// Uncomment to test:
// testOllamaLLM().catch(console.error);

module.exports = OllamaLLM;
