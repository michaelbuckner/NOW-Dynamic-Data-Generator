/**
 * test-openrouter.js
 * 
 * A simple script to test the OpenRouter integration for generating incident descriptions.
 * This script will attempt to connect to OpenRouter and generate sample incident data.
 * 
 * Usage:
 * node test-openrouter.js [model] [apiKey]
 * 
 * Example:
 * node test-openrouter.js openai/gpt-3.5-turbo your-api-key
 * node test-openrouter.js anthropic/claude-3-haiku-20240307
 * 
 * If apiKey is not provided, it will use the OPENROUTER_API_KEY environment variable.
 */

const OpenRouterLLM = require('./OpenRouterLLMIntegration');

// Get model and API key from command line arguments or use defaults
const model = process.argv[2] || 'openai/gpt-3.5-turbo';
const apiKey = process.argv[3] || process.env.OPENROUTER_API_KEY;

// Sample incident data for testing
const testIncidents = [
  {
    category: 'Network',
    subcategory: 'VPN',
    ciName: 'VPN Gateway'
  },
  {
    category: 'Hardware',
    subcategory: 'Laptop',
    ciName: 'Dell XPS 15'
  },
  {
    category: 'Software',
    subcategory: 'Application',
    ciName: 'SAP Server'
  },
  {
    category: 'Email',
    subcategory: 'Delivery',
    ciName: 'Email Server'
  }
];

async function testOpenRouter() {
  console.log(`Testing OpenRouter integration with model: ${model}`);
  
  if (!apiKey) {
    console.error('Error: No OpenRouter API key provided.');
    console.error('Please provide an API key as a command line argument or set the OPENROUTER_API_KEY environment variable.');
    process.exit(1);
  }
  
  console.log('Connecting to OpenRouter API...');
  
  try {
    // Initialize OpenRouter LLM
    const llm = new OpenRouterLLM({
      model: model,
      apiKey: apiKey,
      temperature: 0.7,
      maxTokens: 500
    });
    
    console.log('\nGenerating sample incident descriptions:');
    console.log('---------------------------------------');
    
    for (const incident of testIncidents) {
      console.log(`\nCategory: ${incident.category}, Subcategory: ${incident.subcategory}, CI: ${incident.ciName}`);
      
      // Generate both descriptions in a single API call (optimized approach)
      const combinedPrompt = `Generate both a short description (under 100 characters) and a detailed description (200-400 characters) for a ServiceNow incident with category "${incident.category}", subcategory "${incident.subcategory}", and configuration item "${incident.ciName}".
    
Format your response as JSON with the following structure:
{
  "shortDescription": "Concise description of the issue",
  "description": "Detailed explanation including symptoms, error messages, and impact on the user's work"
}

Make both descriptions specific, realistic, and business-relevant. Do not include markdown formatting or code block markers.`;
      
      console.log('Generating both descriptions in a single API call...');
      const startTime = Date.now();
      let response = await llm.generateText(combinedPrompt, 600);
      const endTime = Date.now();
      
      console.log(`Combined API response (${endTime - startTime}ms):`);
      console.log(response);
      
      // Clean up the response - remove any markdown code block markers
      response = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      
      // Try to parse the response as JSON
      let shortDesc = '';
      let desc = '';
      let parseMethod = '';
      
      try {
        // Find the first { and the last } to extract the JSON object
        const firstBrace = response.indexOf('{');
        const lastBrace = response.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          const jsonStr = response.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.shortDescription && parsed.description) {
            shortDesc = parsed.shortDescription;
            desc = parsed.description;
            parseMethod = 'JSON substring extraction';
          } else {
            throw new Error('Invalid JSON structure in substring');
          }
        } else {
          // If we couldn't extract a valid JSON object, try parsing the whole response
          const parsed = JSON.parse(response);
          if (parsed.shortDescription && parsed.description) {
            shortDesc = parsed.shortDescription;
            desc = parsed.description;
            parseMethod = 'Full JSON parsing';
          } else {
            throw new Error('Invalid JSON structure in full response');
          }
        }
      } catch (parseError) {
        console.log(`\nJSON parsing error: ${parseError.message}`);
        console.log('Attempting to extract using regex...');
        
        // Try to extract the descriptions using regex
        const shortDescMatch = response.match(/"shortDescription"\s*:\s*"([^"]+)"/);
        const descMatch = response.match(/"description"\s*:\s*"([^"]+)"/);
        
        if (shortDescMatch && descMatch) {
          shortDesc = shortDescMatch[1];
          desc = descMatch[1];
          parseMethod = 'Regex extraction';
        } else {
          console.log('Regex extraction failed, checking for JSON-like structure...');
          
          // If all parsing attempts fail, check if the response contains any JSON-like structure
          if (response.includes('"shortDescription"') && response.includes('"description"')) {
            // Try to manually extract the values
            const shortDescStart = response.indexOf('"shortDescription"');
            const descStart = response.indexOf('"description"');
            
            if (shortDescStart !== -1 && descStart !== -1) {
              // Determine which comes first
              if (shortDescStart < descStart) {
                // Extract shortDescription
                const shortDescValueStart = response.indexOf(':', shortDescStart) + 1;
                const shortDescValueEnd = response.indexOf(',', shortDescValueStart);
                shortDesc = response.substring(shortDescValueStart, shortDescValueEnd).trim();
                
                // Remove quotes if present
                shortDesc = shortDesc.replace(/^"/, '').replace(/"$/, '');
                
                // Extract description
                const descValueStart = response.indexOf(':', descStart) + 1;
                const descValueEnd = response.indexOf(',', descValueStart);
                desc = response.substring(descValueStart, descValueEnd !== -1 ? descValueEnd : response.length).trim();
                
                // Remove quotes if present
                desc = desc.replace(/^"/, '').replace(/"$/, '');
                
                parseMethod = 'Manual JSON extraction';
              }
            }
          }
          
          if (!shortDesc || !desc) {
            console.log('All JSON parsing methods failed, using line-based fallback...');
            
            // If all parsing attempts fail, split the response
            const lines = response.split('\n');
            
            if (lines.length >= 2) {
              // Check if the first line might be a title or header
              if (lines[0].length < 100 && !lines[0].includes('{') && !lines[0].includes(':')) {
                shortDesc = lines[0];
                desc = lines.slice(1).join(' ');
                parseMethod = 'Line-based extraction (title format)';
              } else {
                // Try to find a line that looks like a short description
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].length < 100 && !lines[i].includes('{') && !lines[i].includes(':')) {
                    shortDesc = lines[i];
                    desc = lines.slice(i + 1).join(' ');
                    parseMethod = 'Line-based extraction (search)';
                    break;
                  }
                }
                
                // If we couldn't find a good short description, use the default approach
                if (!shortDesc) {
                  shortDesc = lines[0];
                  desc = lines.slice(1).join(' ');
                  parseMethod = 'Line-based extraction (default)';
                }
              }
            } else {
              // Last resort: split the response in half
              const halfway = Math.floor(response.length / 3);
              shortDesc = response.substring(0, halfway);
              desc = response.substring(halfway);
              parseMethod = 'Content splitting';
            }
          }
        }
      }
      
      console.log(`\nParsing method used: ${parseMethod}`);
      console.log(`Short Description: ${shortDesc.substring(0, 100)}`);
      console.log(`Detailed Description: ${desc.substring(0, 200)}...`);
      console.log('\n---');
    }
    
    console.log('\n✅ OpenRouter integration test completed successfully!');
    console.log('You can now use the Bulk Data Generator with OpenRouter for generating realistic incident data.');
    
  } catch (error) {
    console.error('\n❌ Error testing OpenRouter integration:');
    console.error(error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Ensure your OpenRouter API key is valid');
    console.error('2. Check your internet connection');
    console.error('3. Verify the model name is correct: ' + model);
    console.error('4. Check OpenRouter status at https://status.openrouter.ai/');
    process.exit(1);
  }
}

// Run the test
testOpenRouter().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
