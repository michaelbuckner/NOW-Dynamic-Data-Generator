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
  // sys_user
  sys_user: [
    { sys_id: 'f5826bf03710200044e0bfc8bcbe5d23', display_value: 'Owen Sparacino' },
    { sys_id: '82826bf03710200044e0bfc8bcbe5d92', display_value: 'Claire Moyerman' },
    { sys_id: 'f2826bf03710200044e0bfc8bcbe5df2', display_value: 'Benjamin Schkade' },
    { sys_id: '7a826bf03710200044e0bfc8bcbe5dfe', display_value: 'Reina Wolchesky' },
    { sys_id: '46c32549a9fe198101a84f3c2036e26b', display_value: 'Ted Keppel' },
    { sys_id: '3282abf03710200044e0bfc8bcbe5d30', display_value: 'Lana Keels' },
    { sys_id: '31826bf03710200044e0bfc8bcbe5d24', display_value: 'Misty Ericksen' },
    { sys_id: 'b282abf03710200044e0bfc8bcbe5d1f', display_value: 'Rosemarie Fifield' },
    { sys_id: '800b174138d089c868d09de320f9833b', display_value: 'Andrew Och' },
    { sys_id: '0802b90dc3313000bac1addbdfba8fdb', display_value: 'Suresh Yekollu' }
  ],
  
  // sys_user_group
  sys_user_group: [
    { sys_id: 'c1edeb7ab7232300e64c9489de11a9e3', display_value: 'Recommendation Admin' },
    { sys_id: '8a5055c9c61122780043563ef53438e3', display_value: 'Hardware' },
    { sys_id: '58851c2353322010a480ddeeff7b12b0', display_value: 'Report Access Request Approvers' },
    { sys_id: '1c590685c0a8018b2a473a7159ff5d9a', display_value: 'RMA Approvers' },
    { sys_id: 'cfcbad03d711110050f5edcb9e61038f', display_value: 'Team Development Code Reviewers' },
    { sys_id: '477a05d153013010b846ddeeff7b1225', display_value: 'App Engine Admins' },
    { sys_id: '679434f053231300e321ddeeff7b12d8', display_value: 'Help Desk' },
    { sys_id: '12a586cd0bb23200ecfd818393673a30', display_value: 'Incident Management' },
    { sys_id: '74ad1ff3c611227d01d25feac2af603f', display_value: 'Field Services' },
    { sys_id: '205f1e0753333300c722ddeeff7b1235', display_value: 'Mobile Analytics Settings Managers' }
  ],
  
  // cmdb_ci_service
  cmdb_ci_service: [
    { sys_id: '28c2c50cc0a8000b001c50f77c1cdf47', display_value: 'E-Commerce' },
    { sys_id: 'd278f28f933a31003b4bb095e57ffb8a', display_value: 'Jobvite Enterprise Recruitment Services' },
    { sys_id: '0e7a06157f10310016181ccebefa91ce', display_value: 'All' },
    { sys_id: 'd4e69e230a0a3c152e3a0cd4c1ef2107', display_value: 'This Service-now instance' },
    { sys_id: '6a78f28f933a31003b4bb095e57ffb8a', display_value: 'Workday Enterprise Services' },
    { sys_id: '26e494480a0a0bb400ad175538708ad9', display_value: 'SAP Sales and Distribution' },
    { sys_id: '2fd114e10a0a0bb400f07732a4131e72', display_value: 'PeopleSoft Reporting' },
    { sys_id: '26e540d80a0a0bb400660482030d04d8', display_value: 'SAP Payroll' },
    { sys_id: '26da329f0a0a0bb400f69d8159bc753d', display_value: 'SAP Enterprise Services' },
    { sys_id: '28c1db1dc0a8000b001224d1cdaf1425', display_value: 'Retail POS (Point of Sale)' }
  ],
  
  // service_offering
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
  
  // cmdb_ci
  cmdb_ci: [
    { sys_id: 'daa9a80d3790200044e0bfc8bcbe5dbe', display_value: 'MacBook Pro 17"' },
    { sys_id: '46a70267a9fe19810109a8dffd60058c', display_value: 'HP Photo & Imaging' },
    { sys_id: '46ce8025a9fe19810183e7122bbd3663', display_value: 'MSXML' },
    { sys_id: '46be1d13a9fe19810092d1d9d7a11c75', display_value: 'Windows 2000 Hotfix - KB896727' },
    { sys_id: '46d152dca9fe198101ab2e5f93fc8bd6', display_value: 'LiveReg (Symantec Corporation)' },
    { sys_id: 'c6a9e40d3790200044e0bfc8bcbe5df6', display_value: 'MacBook Air 13"' },
    { sys_id: '22a9604d3790200044e0bfc8bcbe5dae', display_value: 'Precision T5500 Workstation' },
    { sys_id: '46c9e271a9fe198101940c1433d93192', display_value: 'Exchange 2000 Hotfix (SP4) [See 811853 for more information]' },
    { sys_id: '46b67608a9fe1981018b3b74ac16dfad', display_value: 'ATI - Software Uninstall Utility' },
    { sys_id: '46c326dfa9fe198101581448c3cca849', display_value: 'HP Image Zone' },
    { sys_id: '106c5c13c61122750194a1e96cfde951', display_value: 'Service-now Production Sacramento' },
    { sys_id: '1072335fc611227500c0267a21be5dc5', display_value: 'Service-now Production San Diego' },
    { sys_id: '14a9e27bc61122750037b90c4d34da38', display_value: 'DatabaseServer2' },
    { sys_id: '27e52cc8c0a8000b0067d0b66b8a66de', display_value: 'VMWARE-SD-04' },
    { sys_id: '27e59e75c0a8000b003b3fab4211d2c2', display_value: 'VMWARE-SD-07' },
    { sys_id: '27eabc4bc0a8000b0089fd512b3e8934', display_value: 'INSIGHT-NY-03' },
    { sys_id: '3a63d606c611222500487ae00a5bf3b8', display_value: 'AS400' },
    { sys_id: '6cabe993c611222500bb025775ec8732', display_value: 'Car-1' },
    { sys_id: '6cb10db5c611222500bf34f43d2ff189', display_value: 'Car-2' },
    { sys_id: '6ccab11cc611222500e1549797d1c1e5', display_value: 'Car-3' },
    { sys_id: '827b692d0ad337021abb72d3737ff401', display_value: 'Webserver FLX' },
    { sys_id: '8d6916edc611222501dbb12bd683e36f', display_value: 'Car-4' },
    { sys_id: 'a9c68505c6112276017ee7d52f43e7c6', display_value: 'SD1' },
    { sys_id: 'b0c25d1bc0a800090168be1bfcdcd759', display_value: 'FileServerFloor2' },
    { sys_id: 'b0c3437ac0a8000900433b8a412966aa', display_value: 'FileServerFloor1' },
    { sys_id: 'b0c4030ac0a800090152e7a4564ca36c', display_value: 'MailServerUS' },
    { sys_id: 'b0cb50c3c0a8000900893e69d3c5885e', display_value: 'ApplicationServerPeopleSoft' },
    { sys_id: 'b0cbf176c0a80009002b452bc33e2fc3', display_value: 'DatabaseServer1' },
    { sys_id: 'b0ccabf1c0a80009001f14fd151d8df0', display_value: 'ApplicationServerHelpdesk' },
    { sys_id: '27e3a47cc0a8000b001d28ab291fa65b', display_value: 'OWA-SD-01' },
    { sys_id: '3a172e820a0a0bb40034228e9f65f1be', display_value: 'PS LoadBal01' },
    { sys_id: '3a6b9e16c0a8ce0100e154dd7e6353c2', display_value: 'SAP LoadBal01' },
    { sys_id: '3a6bc0d9c0a8ce01004a1b154049d4d2', display_value: 'SAP LoadBal02' },
    { sys_id: '4014825d0a0a0b9b00c4db61928034b9', display_value: 'SAP-SD-01' },
    { sys_id: '4014a3010a0a0b9b007e8c84ff4d4abe', display_value: 'SAP-SD-02' },
    { sys_id: '4014bc1c0a0a0b9b008781123ff5a5e3', display_value: 'SAP-SD-03' },
    { sys_id: '4014e8100a0a0b9b001e4215e2ee505e', display_value: 'SAP-NY-02' },
    { sys_id: '5397819bc0a8016400e2f02aa9444989', display_value: 'unix200' },
    { sys_id: '53979c53c0a801640116ad2044643fb2', display_value: 'unix201' },
    { sys_id: '5f7dfd9cc0a8010e00ab58006f14bdc5', display_value: 'dbaix900nyc' },
    { sys_id: '5f9b83bfc0a8010e005a2b3212c9dc07', display_value: 'dbaix901nyc' },
    { sys_id: '5f9ba346c0a8010e00158183aaa1eb24', display_value: 'dbaix902nyc' },
    { sys_id: '60ca3062c0a8010e0145c47fe9f3dc12', display_value: 'lawson_db_100' },
    { sys_id: '60cbab5ec0a8010e00b68ab75d1caa93', display_value: 'lawson_app_100' },
    { sys_id: '3a70f789c0a8ce010091b0ea635b982a', display_value: 'SAP AppSRV01' },
    { sys_id: '3a726a31c0a8ce0100902bd28760693f', display_value: 'SAP AppSRV02' },
    { sys_id: '3a290cc60a0a0bb400000bdb386af1cf', display_value: 'PS LinuxApp01' },
    { sys_id: '3a5dd3dbc0a8ce0100655f1ec66ed42c', display_value: 'PS LinuxApp02' },
    { sys_id: '53958ff0c0a801640171ec76aa0c8f86', display_value: 'lnux100' },
    { sys_id: '539747cac0a801640163e60735fbbf6e', display_value: 'lnux101' }
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
        { id: 'number', title: 'Number' },
        { id: 'caller_id', title: 'Caller' },
        { id: 'category', title: 'Category' },
        { id: 'subcategory', title: 'Subcategory' },
        { id: 'business_service', title: 'Service' },
        { id: 'service_offering', title: 'Service offering' },
        { id: 'cmdb_ci', title: 'Configuration item' },
        { id: 'short_description', title: 'Short description' },
        { id: 'description', title: 'Description' },
        { id: 'contact_type', title: 'Channel' },
        { id: 'state', title: 'State' },
        { id: 'impact', title: 'Impact' },
        { id: 'urgency', title: 'Urgency' },
        { id: 'priority', title: 'Priority' },
        { id: 'assignment_group', title: 'Assignment group' },
        { id: 'assigned_to', title: 'Assigned to' }
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
   * @returns {Object} - Random reference record or a default record if the table is empty
   */
  getRandomReference(tableName) {
    const records = referenceData[tableName];
    
    // Check if the reference table exists and has records
    if (!records || records.length === 0) {
      console.warn(`Warning: Reference table '${tableName}' is empty or undefined. Using a default value.`);
      // Return a default record with a placeholder sys_id and display_value
      return {
        sys_id: '00000000000000000000000000000000',
        display_value: `Default ${tableName} value`
      };
    }
    
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
