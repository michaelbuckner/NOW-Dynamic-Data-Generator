/**
 * BulkDataGenerator.js
 * 
 * A Node.js utility to generate bulk data for ServiceNow tables.
 * This version specifically focuses on generating incident records.
 * 
 * Usage:
 * node BulkDataGenerator.js --output=bulk-data.xlsx --count=10000 --apiKey=your-openrouter-api-key
 */

const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');
const { faker } = require('@faker-js/faker');
const OpenRouterLLM = require('../llm/OpenRouterLLMIntegration');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace('--', '')] = value;
  return acc;
}, {});

// Default values
const outputFile = args.output || 'bulk-data.xlsx';
const recordCount = parseInt(args.count || '10000', 10);
const batchSize = parseInt(args.batch || '1000', 10);
const tableName = args.table || 'incident'; // Default to incident table

// Command line arguments for LLM
const model = args.model || 'openai/gpt-3.5-turbo'; // Default model
const apiKey = args.apiKey || process.env.OPENROUTER_API_KEY; // API key from args or env var

// Hard-coded reference data for ServiceNow tables
const referenceData = {
  // sys_user_group
  sys_user_group: [
    { sys_id: '8a5055c9c61122780043563ef53438e3', display_value: 'Hardware' },
    { sys_id: '3ccb62b67fb30210674d91fadc8665c2', display_value: 'MFA Exempted User Group' },
    { sys_id: '0c4e7b573b331300ad3cc9bb34efc461', display_value: 'Problem Analyzers' },
    { sys_id: '5f74727dc0a8010e01efe33a251993f9', display_value: 'NY DB' },
    { sys_id: 'a715cd759f2002002920bde8132e7018', display_value: 'Change Management' },
    { sys_id: '36c741fa731313005754660c4cf6a70d', display_value: 'Openspace' },
    { sys_id: '0a52d3dcd7011200f2d224837e6103f2', display_value: 'Application Development' },
    { sys_id: 'aaccc971c0a8001500fe1ff4302de101', display_value: 'Capacity Mgmt' },
    { sys_id: '287ebd7da9fe198100f92cc8d1d2154e', display_value: 'Network' },
    { sys_id: 'aacb62e2c0a80015007f67f752c2b12c', display_value: 'Project Mgmt' }
  ],
  
  // sys_user
  sys_user: [
    { 
      sys_id: '5137153cc611227c000bbd1bd8cd2005', 
      display_value: 'Fred Luddy', 
      sys_user_group: 'Hardware|8a5055c9c61122780043563ef53438e3, Network|287ebd7da9fe198100f92cc8d1d2154e, Project Mgmt|aacb62e2c0a80015007f67f752c2b12c' 
    },
    { 
      sys_id: 'f8588956937002002dcef157b67ffb98', 
      display_value: 'Change Manager', 
      sys_user_group: 'Change Management|a715cd759f2002002920bde8132e7018' 
    },
    { 
      sys_id: '5137153cc611227c000bbd1bd8cd2007', 
      display_value: 'David Loo', 
      sys_user_group: 'Hardware|8a5055c9c61122780043563ef53438e3, NY DB|5f74727dc0a8010e01efe33a251993f9, Capacity Mgmt|aaccc971c0a8001500fe1ff4302de101, Network|287ebd7da9fe198100f92cc8d1d2154e' 
    },
    { 
      sys_id: '1832fbe1d701120035ae23c7ce610369', 
      display_value: 'Manifah Masood', 
      sys_user_group: 'Application Development|0a52d3dcd7011200f2d224837e6103f2' 
    },
    { 
      sys_id: '62526fa1d701120035ae23c7ce6103c6', 
      display_value: 'Guillermo Frohlich', 
      sys_user_group: 'Application Development|0a52d3dcd7011200f2d224837e6103f2' 
    },
    { 
      sys_id: 'f298d2d2c611227b0106c6be7f154bc8', 
      display_value: 'Bow Ruggeri', 
      sys_user_group: 'Hardware|8a5055c9c61122780043563ef53438e3, Network|287ebd7da9fe198100f92cc8d1d2154e' 
    },
    { 
      sys_id: '38cb3f173b331300ad3cc9bb34efc4d6', 
      display_value: 'Problem Coordinator B', 
      sys_user_group: 'Problem Analyzers|0c4e7b573b331300ad3cc9bb34efc461' 
    },
    { 
      sys_id: '73ab3f173b331300ad3cc9bb34efc4df', 
      display_value: 'Problem Coordinator A', 
      sys_user_group: 'Problem Analyzers|0c4e7b573b331300ad3cc9bb34efc461' 
    },
    { 
      sys_id: '7e3bbb173b331300ad3cc9bb34efc4a8', 
      display_value: 'Problem Task Analyst A', 
      sys_user_group: 'Problem Analyzers|0c4e7b573b331300ad3cc9bb34efc461' 
    },
    { 
      sys_id: '681b365ec0a80164000fb0b05854a0cd', 
      display_value: 'ITIL User', 
      sys_user_group: 'Hardware|8a5055c9c61122780043563ef53438e3, Network|287ebd7da9fe198100f92cc8d1d2154e' 
    }
  ],
  
  // cmdb_ci_service
  cmdb_ci_service: [
    { sys_id: '451047c6c0a8016400de0ae6df9b9d76', display_value: 'Bond Trading' },
    { sys_id: '26e540d80a0a0bb400660482030d04d8', display_value: 'SAP Payroll' },
    { sys_id: 'd278f28f933a31003b4bb095e57ffb8a', display_value: 'Jobvite Enterprise Recruitment Services' },
    { sys_id: '2fd0eab90a0a0bb40061cf732d32967c', display_value: 'PeopleSoft Governance' },
    { sys_id: '26e46e5b0a0a0bb4005d1146846c429c', display_value: 'SAP Controlling' },
    { sys_id: '26e494480a0a0bb400ad175538708ad9', display_value: 'SAP Sales and Distribution' },
    { sys_id: '6a78f28f933a31003b4bb095e57ffb8a', display_value: 'Workday Enterprise Services' },
    { sys_id: '28c2c50cc0a8000b001c50f77c1cdf47', display_value: 'E-Commerce' },
    { sys_id: '26e44e8a0a0a0bb40095ff953f9ee520', display_value: 'SAP Materials Management' },
    { sys_id: '28c273fcc0a8000b00a86416d360cc7d', display_value: 'Retail Adding Points' }
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
    { 
      sys_id: '3a6b9e16c0a8ce0100e154dd7e6353c2', 
      display_value: 'SAP LoadBal01', 
      cmdb_ci_service: 'SAP Materials Management|26e44e8a0a0a0bb40095ff953f9ee520' 
    },
    { 
      sys_id: '3a27f1520a0a0bb400ecd6ff7afcf036', 
      display_value: 'PS Apache02', 
      cmdb_ci_service: 'PeopleSoft Governance|2fd0eab90a0a0bb40061cf732d32967c' 
    },
    { 
      sys_id: '55c3578bc0a8010e0117f727897d0011', 
      display_value: 'bond_trade_ny', 
      cmdb_ci_service: 'Bond Trading|451047c6c0a8016400de0ae6df9b9d76' 
    },
    { 
      sys_id: '53958ff0c0a801640171ec76aa0c8f86', 
      display_value: 'lnux100', 
      cmdb_ci_service: 'Bond Trading|451047c6c0a8016400de0ae6df9b9d76' 
    },
    { 
      sys_id: '28c2131fc0a8000b0020787c5d6816f0', 
      display_value: 'Retail Client Registration', 
      cmdb_ci_service: 'E-Commerce|28c2c50cc0a8000b001c50f77c1cdf47' 
    },
    { 
      sys_id: '3a6bc0d9c0a8ce01004a1b154049d4d2', 
      display_value: 'SAP LoadBal02', 
      cmdb_ci_service: 'SAP Materials Management|26e44e8a0a0a0bb40095ff953f9ee520' 
    },
    { 
      sys_id: '63036c18c0a8010e01bac272daed2e2c', 
      display_value: 'Bond Trading - DR', 
      cmdb_ci_service: 'Bond Trading|451047c6c0a8016400de0ae6df9b9d76' 
    },
    { 
      sys_id: '3a172e820a0a0bb40034228e9f65f1be', 
      display_value: 'PS LoadBal01', 
      cmdb_ci_service: 'PeopleSoft Governance|2fd0eab90a0a0bb40061cf732d32967c' 
    },
    { 
      sys_id: '55c38564c0a8010e00596302eb0d26bc', 
      display_value: 'bond_trade_uk', 
      cmdb_ci_service: 'Bond Trading|451047c6c0a8016400de0ae6df9b9d76' 
    },
    { 
      sys_id: '26da329f0a0a0bb400f69d8159bc753d', 
      display_value: 'SAP Enterprise Services', 
      cmdb_ci_service: 'SAP Payroll|26e540d80a0a0bb400660482030d04d8, SAP Controlling|26e46e5b0a0a0bb4005d1146846c429c, SAP Sales and Distribution|26e494480a0a0bb400ad175538708ad9, SAP Materials Management|26e44e8a0a0a0bb40095ff953f9ee520' 
    },
    { 
      sys_id: '27eabc4bc0a8000b0089fd512b3e8934', 
      display_value: 'INSIGHT-NY-03', 
      cmdb_ci_service: 'Retail Adding Points|28c273fcc0a8000b00a86416d360cc7d' 
    },
    { 
      sys_id: '5397fa53c0a8016400f562cb29027855', 
      display_value: 'apache linux ny 100', 
      cmdb_ci_service: 'Bond Trading|451047c6c0a8016400de0ae6df9b9d76' 
    },
    { 
      sys_id: '2216daf0d7820200c1ed0fbc5e6103ca', 
      display_value: 'bond_trade_aus', 
      cmdb_ci_service: 'SAP Payroll|26e540d80a0a0bb400660482030d04d8' 
    },
    { 
      sys_id: '3a2810c20a0a0bb400268337d6e942ca', 
      display_value: 'PS Apache03', 
      cmdb_ci_service: 'PeopleSoft Governance|2fd0eab90a0a0bb40061cf732d32967c' 
    },
    { 
      sys_id: '281a4d5fc0a8000b00e4ba489a83eedc', 
      display_value: 'IT Services', 
      cmdb_ci_service: 'Bond Trading|451047c6c0a8016400de0ae6df9b9d76' 
    },
    { 
      sys_id: '28c1db1dc0a8000b001224d1cdaf1425', 
      display_value: 'Retail POS (Point of Sale)', 
      cmdb_ci_service: 'Retail Adding Points|28c273fcc0a8000b00a86416d360cc7d' 
    },
    { 
      sys_id: '2fc86c650a0a0bb4003698b5331640df', 
      display_value: 'PeopleSoft Enterprise Services', 
      cmdb_ci_service: 'PeopleSoft Governance|2fd0eab90a0a0bb40061cf732d32967c' 
    },
    { 
      sys_id: '5f9b83bfc0a8010e005a2b3212c9dc07', 
      display_value: 'dbaix901nyc', 
      cmdb_ci_service: 'Retail Adding Points|28c273fcc0a8000b00a86416d360cc7d' 
    },
    { 
      sys_id: '53979c53c0a801640116ad2044643fb2', 
      display_value: 'unix201', 
      cmdb_ci_service: 'Bond Trading|451047c6c0a8016400de0ae6df9b9d76' 
    },
    { 
      sys_id: '3a27d4370a0a0bb4006316812bf45439', 
      display_value: 'PS Apache01', 
      cmdb_ci_service: 'PeopleSoft Governance|2fd0eab90a0a0bb40061cf732d32967c' 
    }
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
    this.outputFile = options.outputFile || 'bulk-data.xlsx';
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
   * Generate bulk data and write to Excel or CSV
   */
  async generate() {
    console.time('Data generation');
    
    let workbook;
    let worksheet;
    
    // Determine if we should output as CSV based on file extension
    const isCSVOutput = this.outputFile.toLowerCase().endsWith('.csv');
    
    if (isCSVOutput) {
      console.log(`Output format is CSV: ${this.outputFile}`);
      // Create a new workbook and worksheet for generating data
      // (We'll convert to CSV at the end)
      workbook = new Excel.Workbook();
      worksheet = workbook.addWorksheet(this.tableName);
      
      // Add header row
      const headers = this.createExcelHeader();
      worksheet.columns = headers;
    } else {
      // Check if the output file exists
      const fileExists = fs.existsSync(this.outputFile);
      
      if (fileExists) {
        console.log(`Output file ${this.outputFile} exists. Reading existing file...`);
        // Read the existing workbook
        workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(this.outputFile);
        
        // Get the first worksheet or create it if it doesn't exist
        worksheet = workbook.getWorksheet(1) || workbook.addWorksheet(this.tableName);
        
        // If the worksheet has no rows, add headers
        if (worksheet.rowCount <= 1) {
          const headers = this.createExcelHeader();
          worksheet.columns = headers;
        }
      } else {
        console.log(`Creating new output file ${this.outputFile}...`);
        // Create a new workbook and worksheet
        workbook = new Excel.Workbook();
        worksheet = workbook.addWorksheet(this.tableName);
        
        // Add header row
        const headers = this.createExcelHeader();
        worksheet.columns = headers;
      }
    }
    
    // Generate data in batches to avoid memory issues
    let recordsGenerated = 0;
    const totalBatches = Math.ceil(this.recordCount / this.batchSize);
    
    console.log(`Generating ${this.recordCount} records in ${totalBatches} batches of ${this.batchSize}...`);
    
    // Determine the starting row (skip header row)
    const startRow = worksheet.rowCount > 0 ? worksheet.rowCount + 1 : 2;
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchSize = Math.min(this.batchSize, this.recordCount - recordsGenerated);
      const records = await this.generateBatch(batchSize);
      
      // Add records to worksheet
      worksheet.addRows(records.map(record => this.transformRecordForExcel(record)));
      
      recordsGenerated += batchSize;
      console.log(`Batch ${batchNum + 1}/${totalBatches} complete. ${recordsGenerated}/${this.recordCount} records generated.`);
    }
    
    // Save the data in the appropriate format
    if (isCSVOutput) {
      // Write to CSV file
      console.log(`Writing data to CSV file: ${this.outputFile}`);
      try {
        // Use the csv.writeFile method instead of writeBuffer
        await workbook.csv.writeFile(this.outputFile);
      } catch (error) {
        console.error(`Error writing CSV file: ${error.message}`);
        
        // Fallback approach: manually create CSV content
        console.log("Using fallback CSV generation approach...");
        const csvRows = [];
        
        // Add header row
        const headers = this.createExcelHeader();
        csvRows.push(headers.map(h => h.header).join(','));
        
        // Add data rows
        for (let i = 1; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          const rowData = [];
          
          // Skip header row (already added)
          if (i === 1) continue;
          
          // Get values for each column
          for (let j = 1; j <= headers.length; j++) {
            const cell = row.getCell(j);
            // Escape commas and quotes in cell values
            let value = cell.value || '';
            if (typeof value === 'string') {
              value = value.replace(/"/g, '""');
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value}"`;
              }
            }
            rowData.push(value);
          }
          
          csvRows.push(rowData.join(','));
        }
        
        // Write CSV content to file
        fs.writeFileSync(this.outputFile, csvRows.join('\n'));
      }
    } else {
      // Save as Excel file
      await workbook.xlsx.writeFile(this.outputFile);
    }
    
    console.timeEnd('Data generation');
    console.log(`Data generation complete. ${recordsGenerated} records written to ${this.outputFile}`);
  }
  
  /**
   * Transform a record to use display values instead of sys_ids
   * @param {Object} record - The record with sys_ids
   * @returns {Object} - The record with display values
   */
  transformRecordForExcel(record) {
    const transformed = { ...record };
    
    // Replace sys_ids with display values for reference fields
    if (record.caller_id) {
      const caller = referenceData.sys_user.find(user => user.sys_id === record.caller_id);
      transformed.caller_id = caller ? caller.display_value : record.caller_id;
    }
    
    if (record.business_service) {
      const service = referenceData.cmdb_ci_service.find(svc => svc.sys_id === record.business_service);
      transformed.business_service = service ? service.display_value : record.business_service;
    }
    
    if (record.service_offering) {
      const offering = referenceData.service_offering.find(off => off.sys_id === record.service_offering);
      transformed.service_offering = offering ? offering.display_value : record.service_offering;
    }
    
    if (record.cmdb_ci) {
      const ci = referenceData.cmdb_ci.find(item => item.sys_id === record.cmdb_ci);
      transformed.cmdb_ci = ci ? ci.display_value : record.cmdb_ci;
    }
    
    if (record.assignment_group) {
      const group = referenceData.sys_user_group.find(grp => grp.sys_id === record.assignment_group);
      transformed.assignment_group = group ? group.display_value : record.assignment_group;
    }
    
    if (record.assigned_to) {
      const assignee = referenceData.sys_user.find(user => user.sys_id === record.assigned_to);
      transformed.assigned_to = assignee ? assignee.display_value : record.assigned_to;
    }
    
    // Replace numeric values with display values for choice fields
    if (record.state) {
      const stateObj = choiceValues.state.find(s => s.value === record.state);
      transformed.state = stateObj ? stateObj.display : record.state;
    }
    
    if (record.impact) {
      const impactObj = choiceValues.impact.find(i => i.value === record.impact);
      transformed.impact = impactObj ? impactObj.display : record.impact;
    }
    
    if (record.urgency) {
      const urgencyObj = choiceValues.urgency.find(u => u.value === record.urgency);
      transformed.urgency = urgencyObj ? urgencyObj.display : record.urgency;
    }
    
    // Calculate priority display value
    if (record.priority) {
      const priorityMap = {
        1: 'Critical',
        2: 'High',
        3: 'Moderate',
        4: 'Low',
        5: 'Planning'
      };
      transformed.priority = priorityMap[record.priority] || record.priority;
    }
    
    return transformed;
  }

  /**
   * Create Excel header based on the table
   */
  createExcelHeader() {
    if (this.tableName === 'incident') {
      return [
        { header: 'Caller', key: 'caller_id', width: 20 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Subcategory', key: 'subcategory', width: 20 },
        { header: 'Service', key: 'business_service', width: 25 },
        { header: 'Service offering', key: 'service_offering', width: 25 },
        { header: 'Configuration item', key: 'cmdb_ci', width: 30 },
        { header: 'Short description', key: 'short_description', width: 40 },
        { header: 'Description', key: 'description', width: 60 },
        { header: 'Channel', key: 'contact_type', width: 15 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Impact', key: 'impact', width: 15 },
        { header: 'Urgency', key: 'urgency', width: 15 },
        { header: 'Priority', key: 'priority', width: 15 },
        { header: 'Assignment group', key: 'assignment_group', width: 25 },
        { header: 'Assigned to', key: 'assigned_to', width: 20 }
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
