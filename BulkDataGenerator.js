/**
 * BulkDataGenerator.js
 * 
 * A Node.js utility to generate bulk data for ServiceNow tables.
 * This version specifically focuses on generating incident records.
 * 
 * Usage:
 * node BulkDataGenerator.js --output=bulk-data.csv --count=10000 --apiKey=your-openrouter-api-key
 */

const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const { faker } = require('@faker-js/faker');
const OpenRouterLLM = require('./OpenRouterLLMIntegration');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace('--', '')] = value;
  return acc;
}, {});

// Default values
const outputFile = args.output || 'bulk-data.csv';
const recordCount = parseInt(args.count || '10000', 10);
const batchSize = parseInt(args.batch || '1000', 10);
const tableName = args.table || 'incident'; // Default to incident table

// Command line arguments for LLM
const model = args.model || 'openai/gpt-3.5-turbo'; // Default model
const apiKey = args.apiKey || process.env.OPENROUTER_API_KEY; // API key from args or env var

// Hard-coded reference data for ServiceNow tables
const referenceData = {
  // Users for caller_id and assigned_to
  sys_user: [
    { sys_id: '6816f79cc0a8016401c5a33be04be441', display_value: 'Abel Tuter' },
    { sys_id: '681b365ec0a80164000fb0b05854a0cd', display_value: 'Beth Anglin' },
    { sys_id: '681ccaf9c0a80164018f77b8b091c3c6', display_value: 'Carmen Ortiz' },
    { sys_id: '681ccb21c0a80164018ff207c31f0af1', display_value: 'David Miller' },
    { sys_id: '681ccb53c0a80164018ff20746dd9f5e', display_value: 'Eric Schroeder' },
    { sys_id: '681ccb9bc0a80164018ff20700871c5b', display_value: 'Fred Luddy' },
    { sys_id: '681ccbe5c0a80164018ff207f9f2672e', display_value: 'Gregg Alderson' },
    { sys_id: '681ccca5c0a80164018ff207c2a80121', display_value: 'Holly Higgins' },
    { sys_id: '681ccce5c0a80164018ff207f0f2673e', display_value: 'Itzel Hernandez' },
    { sys_id: '681cd31cc0a80164018ff207dffb6567', display_value: 'Joe Employee' }
  ],
  
  // Assignment groups
  sys_user_group: [
    { sys_id: '8a4dde73c6112278017a6a4baf547aa7', display_value: 'Service Desk' },
    { sys_id: '8a5055c9c61122780043563ef53438e3', display_value: 'Hardware' },
    { sys_id: '8a5836310a0a0b3c00a290c008c1956a', display_value: 'Network' },
    { sys_id: '8a58370ac61122780066c1583d30dd8c', display_value: 'Software' },
    { sys_id: '8a588e13c611227801202b3ee144f7a6', display_value: 'Database' },
    { sys_id: '8a589c03c61122780195801f9c17f6f4', display_value: 'Security' },
    { sys_id: '8a78b7c1c61122780121df4c57a60f3d', display_value: 'Change Management' },
    { sys_id: '8a78bf03c61122780043563ef53438e7', display_value: 'Facilities' },
    { sys_id: '8a78c040c61122780195801f9c17f6fa', display_value: 'Application Development' },
    { sys_id: '8a78c710c61122780121df4c57a60f42', display_value: 'Server Administration' }
  ],
  
  // Business services
  cmdb_ci_service: [
    { sys_id: '27d32778c0a8000b00db970eeaa60b16', display_value: 'Email' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b17', display_value: 'VPN' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b18', display_value: 'CRM' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b19', display_value: 'ERP' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b20', display_value: 'HR System' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b21', display_value: 'Intranet' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b22', display_value: 'File Sharing' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b23', display_value: 'Printing' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b24', display_value: 'Telephony' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b25', display_value: 'Video Conferencing' }
  ],
  
  // Service offerings
  service_offering: [
    { sys_id: '46fb0230a9fe198101a23f6712475e11', display_value: 'Standard Email' },
    { sys_id: '46fb0230a9fe198101a23f6712475e12', display_value: 'Premium Email' },
    { sys_id: '46fb0230a9fe198101a23f6712475e13', display_value: 'Basic VPN' },
    { sys_id: '46fb0230a9fe198101a23f6712475e14', display_value: 'Secure VPN' },
    { sys_id: '46fb0230a9fe198101a23f6712475e15', display_value: 'CRM Basic' },
    { sys_id: '46fb0230a9fe198101a23f6712475e16', display_value: 'CRM Premium' },
    { sys_id: '46fb0230a9fe198101a23f6712475e17', display_value: 'ERP Core' },
    { sys_id: '46fb0230a9fe198101a23f6712475e18', display_value: 'ERP Advanced' },
    { sys_id: '46fb0230a9fe198101a23f6712475e19', display_value: 'HR Self-Service' },
    { sys_id: '46fb0230a9fe198101a23f6712475e20', display_value: 'HR Full Service' }
  ],
  
  // Configuration items
  cmdb_ci: [
    { sys_id: '26da329f0a0a0bb400f69d8159bc9c5b', display_value: 'SAP Server' },
    { sys_id: '00a96c0d3790200044e0bfc8bcbe5dc3', display_value: 'Email Server' },
    { sys_id: '001a7f6b3b0313002b83d6a543990e98', display_value: 'Web Server' },
    { sys_id: '27d32778c0a8000b00db970eeaa60b16', display_value: 'Database Server' },
    { sys_id: '001a7f6b3b0313002b83d6a543990e99', display_value: 'Application Server' },
    { sys_id: '001a7f6b3b0313002b83d6a543990e9a', display_value: 'Network Switch' },
    { sys_id: '001a7f6b3b0313002b83d6a543990e9b', display_value: 'Firewall' },
    { sys_id: '001a7f6b3b0313002b83d6a543990e9c', display_value: 'Load Balancer' },
    { sys_id: '001a7f6b3b0313002b83d6a543990e9d', display_value: 'Storage Array' },
    { sys_id: '001a7f6b3b0313002b83d6a543990e9e', display_value: 'VPN Gateway' }
  ]
};

// Hard-coded choice values
const choiceValues = {
  // Category values
  category: [
    'Network', 'Hardware', 'Software', 'Database', 'Security', 
    'Email', 'Telephony', 'Authentication', 'Storage', 'Web'
  ],
  
  // Subcategory values (mapped to categories)
  subcategory: {
    'Network': ['Connectivity', 'VPN', 'Wireless', 'DNS', 'DHCP'],
    'Hardware': ['Desktop', 'Laptop', 'Printer', 'Mobile Device', 'Server'],
    'Software': ['Operating System', 'Application', 'Update', 'License', 'Installation'],
    'Database': ['Performance', 'Backup', 'Recovery', 'Query', 'Permissions'],
    'Security': ['Access', 'Virus', 'Firewall', 'Encryption', 'Policy'],
    'Email': ['Delivery', 'Spam', 'Configuration', 'Mailbox', 'Distribution List'],
    'Telephony': ['Desk Phone', 'Voicemail', 'Conference', 'Mobile', 'Fax'],
    'Authentication': ['Password Reset', 'Account Lockout', 'MFA', 'SSO', 'Permissions'],
    'Storage': ['File Share', 'Quota', 'Backup', 'Recovery', 'Performance'],
    'Web': ['Access', 'Performance', 'Functionality', 'Error', 'Content']
  },
  
  // Contact type values
  contact_type: [
    'Email', 'Phone', 'Self-service', 'Walk-in', 'Chat', 
    'Automated', 'Virtual Agent', 'Social Media', 'Video', 'Other'
  ],
  
  // State values (integer backend)
  state: [
    { value: 1, display: 'New' },
    { value: 2, display: 'In Progress' },
    { value: 3, display: 'On Hold' },
    { value: 4, display: 'Resolved' },
    { value: 5, display: 'Closed' },
    { value: 6, display: 'Canceled' }
  ],
  
  // Impact values (integer backend)
  impact: [
    { value: 1, display: 'High' },
    { value: 2, display: 'Medium' },
    { value: 3, display: 'Low' }
  ],
  
  // Urgency values (integer backend)
  urgency: [
    { value: 1, display: 'High' },
    { value: 2, display: 'Medium' },
    { value: 3, display: 'Low' }
  ]
};

class BulkDataGenerator {
  constructor(options = {}) {
    this.recordCount = options.recordCount || 10000;
    this.batchSize = options.batchSize || 1000;
    this.outputFile = options.outputFile || 'bulk-data.csv';
    this.tableName = options.tableName || 'incident';
    
    // Initialize OpenRouter LLM
    this.llm = new OpenRouterLLM({
      model: options.model || 'openai/gpt-3.5-turbo',
      apiKey: options.apiKey,
      temperature: 0.7,
      maxTokens: 500
    });
    
    console.log(`Using OpenRouter with model: ${options.model || 'openai/gpt-3.5-turbo'}`);
  }

  /**
   * Generate bulk data and write to CSV
   */
  async generate() {
    console.time('Data generation');
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: this.outputFile,
      header: this.createCsvHeader()
    });

    // Generate data in batches to avoid memory issues
    let recordsGenerated = 0;
    const totalBatches = Math.ceil(this.recordCount / this.batchSize);
    
    console.log(`Generating ${this.recordCount} records in ${totalBatches} batches of ${this.batchSize}...`);
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchSize = Math.min(this.batchSize, this.recordCount - recordsGenerated);
      const records = await this.generateBatch(batchSize);
      
      await csvWriter.writeRecords(records);
      
      recordsGenerated += batchSize;
      console.log(`Batch ${batchNum + 1}/${totalBatches} complete. ${recordsGenerated}/${this.recordCount} records generated.`);
    }
    
    console.timeEnd('Data generation');
    console.log(`Data generation complete. ${recordsGenerated} records written to ${this.outputFile}`);
  }

  /**
   * Create CSV header based on the table
   */
  createCsvHeader() {
    if (this.tableName === 'incident') {
      return [
        { id: 'number', title: 'number' },
        { id: 'caller_id', title: 'caller_id' },
        { id: 'category', title: 'category' },
        { id: 'subcategory', title: 'subcategory' },
        { id: 'business_service', title: 'business_service' },
        { id: 'service_offering', title: 'service_offering' },
        { id: 'cmdb_ci', title: 'cmdb_ci' },
        { id: 'short_description', title: 'short_description' },
        { id: 'description', title: 'description' },
        { id: 'contact_type', title: 'contact_type' },
        { id: 'state', title: 'state' },
        { id: 'impact', title: 'impact' },
        { id: 'urgency', title: 'urgency' },
        { id: 'priority', title: 'priority' },
        { id: 'assignment_group', title: 'assignment_group' },
        { id: 'assigned_to', title: 'assigned_to' }
      ];
    } else if (this.tableName === 'case') {
      // TODO: Implement case table headers
      return [];
    }
    
    return [];
  }

  /**
   * Generate a batch of records with concurrent processing
   * @param {number} batchSize - Number of records to generate in this batch
   * @returns {Promise<Array>} - Array of generated records
   */
  async generateBatch(batchSize) {
    console.log(`Generating batch of ${batchSize} records with concurrent processing...`);
    
    // Create record generation promises for all records in the batch
    const recordPromises = [];
    
    for (let i = 0; i < batchSize; i++) {
      if (this.tableName === 'incident') {
        recordPromises.push(this.generateIncidentRecord(i));
      } else if (this.tableName === 'case') {
        // TODO: Implement case record generation
        recordPromises.push(Promise.resolve({}));
      } else {
        recordPromises.push(Promise.resolve({}));
      }
    }
    
    // Process promises in groups to control concurrency
    const concurrencyLimit = 10; // Adjust based on API rate limits
    const records = [];
    
    for (let i = 0; i < recordPromises.length; i += concurrencyLimit) {
      const startTime = Date.now();
      const batchPromises = recordPromises.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(batchPromises);
      records.push(...batchResults);
      
      const endTime = Date.now();
      const timePerRecord = (endTime - startTime) / batchPromises.length;
      
      // Log progress
      console.log(`Generated records ${i + 1} to ${i + batchResults.length} of ${batchSize} (${timePerRecord.toFixed(2)}ms per record)`);
      
      // Optional: Add a small delay between batches to avoid rate limiting
      if (i + concurrencyLimit < recordPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return records;
  }

  /**
   * Generate an incident record
   * @param {number} index - Index of the record in the batch
   * @returns {Promise<Object>} - Generated incident record
   */
  async generateIncidentRecord(index) {
    try {
      // Generate a random incident number
      const incidentNumber = `INC${String(10000000 + index).padStart(7, '0')}`;
      
      // Select random values for reference fields
      const callerId = this.getRandomReference('sys_user');
      const assignmentGroup = this.getRandomReference('sys_user_group');
      const assignedTo = this.getRandomReference('sys_user');
      const businessService = this.getRandomReference('cmdb_ci_service');
      const serviceOffering = this.getRandomReference('service_offering');
      const cmdbCi = this.getRandomReference('cmdb_ci');
      
      // Select random values for choice fields
      const category = this.getRandomChoice('category');
      const subcategory = this.getRandomSubcategory(category);
      const contactType = this.getRandomChoice('contact_type');
      const state = this.getRandomChoice('state');
      const impact = this.getRandomChoice('impact');
      const urgency = this.getRandomChoice('urgency');
      
      // Calculate priority based on impact and urgency
      const priority = this.calculatePriority(impact.value, urgency.value);
      
      // Generate both descriptions in a single API call for efficiency
      const descriptions = await this.generateDescriptions(category, subcategory, cmdbCi.display_value);
      
      return {
        number: incidentNumber,
        caller_id: callerId.sys_id,
        category: category,
        subcategory: subcategory,
        business_service: businessService.sys_id,
        service_offering: serviceOffering.sys_id,
        cmdb_ci: cmdbCi.sys_id,
        short_description: descriptions.shortDescription,
        description: descriptions.description,
        contact_type: contactType,
        state: state.value,
        impact: impact.value,
        urgency: urgency.value,
        priority: priority,
        assignment_group: assignmentGroup.sys_id,
        assigned_to: assignedTo.sys_id
      };
    } catch (error) {
      console.error(`Error generating incident record ${index}:`, error.message);
      // Return a basic record with error information in case of failure
      return {
        number: `INC${String(10000000 + index).padStart(7, '0')}`,
        short_description: `Error generating record: ${error.message}`,
        description: 'An error occurred while generating this record.',
        state: 1,
        impact: 3,
        urgency: 3,
        priority: 5
      };
    }
  }

  /**
   * Get a random reference value from the reference data
   * @param {string} tableName - Name of the reference table
   * @returns {Object} - Random reference record
   */
  getRandomReference(tableName) {
    const records = referenceData[tableName];
    return records[Math.floor(Math.random() * records.length)];
  }

  /**
   * Get a random choice value
   * @param {string} fieldName - Name of the choice field
   * @returns {string|Object} - Random choice value
   */
  getRandomChoice(fieldName) {
    const choices = choiceValues[fieldName];
    return choices[Math.floor(Math.random() * choices.length)];
  }

  /**
   * Get a random subcategory based on the category
   * @param {string} category - The category
   * @returns {string} - Random subcategory
   */
  getRandomSubcategory(category) {
    const subcategories = choiceValues.subcategory[category];
    return subcategories[Math.floor(Math.random() * subcategories.length)];
  }

  /**
   * Calculate priority based on impact and urgency
   * @param {number} impact - Impact value (1-3)
   * @param {number} urgency - Urgency value (1-3)
   * @returns {number} - Priority value (1-5)
   */
  calculatePriority(impact, urgency) {
    // ServiceNow priority matrix:
    // 1 - Critical (1,1)
    // 2 - High (1,2 or 2,1)
    // 3 - Moderate (1,3 or 2,2 or 3,1)
    // 4 - Low (2,3 or 3,2)
    // 5 - Planning (3,3)
    
    if (impact === 1 && urgency === 1) return 1;
    if ((impact === 1 && urgency === 2) || (impact === 2 && urgency === 1)) return 2;
    if ((impact === 1 && urgency === 3) || (impact === 2 && urgency === 2) || (impact === 3 && urgency === 1)) return 3;
    if ((impact === 2 && urgency === 3) || (impact === 3 && urgency === 2)) return 4;
    if (impact === 3 && urgency === 3) return 5;
    
    // Default to moderate priority
    return 3;
  }

  /**
   * Generate both short description and detailed description in a single API call
   * @param {string} category - The incident category
   * @param {string} subcategory - The incident subcategory
   * @param {string} ciName - The name of the configuration item
   * @returns {Promise<Object>} - Object containing shortDescription and description
   */
  async generateDescriptions(category, subcategory, ciName) {
    const prompt = `Generate both a short description (under 100 characters) and a detailed description (200-400 characters) for a ServiceNow incident with category "${category}", subcategory "${subcategory}", and configuration item "${ciName}".
    
Format your response as JSON with the following structure:
{
  "shortDescription": "Concise description of the issue",
  "description": "Detailed explanation including symptoms, error messages, and impact on the user's work"
}

Make both descriptions specific, realistic, and business-relevant. Do not include markdown formatting or code block markers.`;
    
    try {
      let response = await this.llm.generateText(prompt, 600);
      
      // Clean up the response - remove any markdown code block markers
      response = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      
      // Try to parse the response as JSON
      try {
        // Find the first { and the last } to extract the JSON object
        const firstBrace = response.indexOf('{');
        const lastBrace = response.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
          const jsonStr = response.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.shortDescription && parsed.description) {
            return {
              shortDescription: parsed.shortDescription.substring(0, 100),
              description: parsed.description.substring(0, 400)
            };
          }
        }
        
        // If we couldn't extract a valid JSON object, try parsing the whole response
        const parsed = JSON.parse(response);
        if (parsed.shortDescription && parsed.description) {
          return {
            shortDescription: parsed.shortDescription.substring(0, 100),
            description: parsed.description.substring(0, 400)
          };
        }
      } catch (parseError) {
        // If parsing fails, try to extract the descriptions using regex
        const shortDescMatch = response.match(/"shortDescription"\s*:\s*"([^"]+)"/);
        const descMatch = response.match(/"description"\s*:\s*"([^"]+)"/);
        
        if (shortDescMatch && descMatch) {
          return {
            shortDescription: shortDescMatch[1].substring(0, 100),
            description: descMatch[1].substring(0, 400)
          };
        }
      }
      
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
            let shortDesc = response.substring(shortDescValueStart, shortDescValueEnd).trim();
            
            // Remove quotes if present
            shortDesc = shortDesc.replace(/^"/, '').replace(/"$/, '');
            
            // Extract description
            const descValueStart = response.indexOf(':', descStart) + 1;
            const descValueEnd = response.indexOf(',', descValueStart);
            let desc = response.substring(descValueStart, descValueEnd !== -1 ? descValueEnd : response.length).trim();
            
            // Remove quotes if present
            desc = desc.replace(/^"/, '').replace(/"$/, '');
            
            return {
              shortDescription: shortDesc.substring(0, 100),
              description: desc.substring(0, 400)
            };
          }
        }
      }
      
      // If all parsing attempts fail, split the response
      const lines = response.split('\n');
      let shortDesc = '';
      let desc = '';
      
      if (lines.length >= 2) {
        // Check if the first line might be a title or header
        if (lines[0].length < 100 && !lines[0].includes('{') && !lines[0].includes(':')) {
          shortDesc = lines[0];
          desc = lines.slice(1).join(' ');
        } else {
          // Try to find a line that looks like a short description
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].length < 100 && !lines[i].includes('{') && !lines[i].includes(':')) {
              shortDesc = lines[i];
              desc = lines.slice(i + 1).join(' ');
              break;
            }
          }
          
          // If we couldn't find a good short description, use the default approach
          if (!shortDesc) {
            shortDesc = lines[0];
            desc = lines.slice(1).join(' ');
          }
        }
      } else {
        // Last resort: split the response in half
        const halfway = Math.floor(response.length / 3);
        shortDesc = response.substring(0, halfway);
        desc = response.substring(halfway);
      }
      
      return {
        shortDescription: shortDesc.substring(0, 100),
        description: desc.substring(0, 400)
      };
    } catch (error) {
      console.error('Error generating descriptions:', error.message);
      return {
        shortDescription: `${category} - ${subcategory} issue with ${ciName}`,
        description: `Detailed information about the ${category} - ${subcategory} issue with ${ciName}. The configuration item is affected. User is unable to perform normal work functions.`
      };
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting bulk data generation...');
    console.log(`Output file: ${outputFile}`);
    console.log(`Record count: ${recordCount}`);
    console.log(`Table: ${tableName}`);
    console.log(`Using OpenRouter model: ${model}`);
    
    if (!apiKey) {
      console.warn('Warning: No OpenRouter API key provided. Set OPENROUTER_API_KEY environment variable or use --apiKey parameter.');
      process.exit(1);
    }
    
    // Create generator
    const generator = new BulkDataGenerator({
      recordCount,
      batchSize,
      outputFile,
      tableName,
      model,
      apiKey
    });
    
    // Generate data
    await generator.generate();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
