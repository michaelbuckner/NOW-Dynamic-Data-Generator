/**
 * BulkDataGenerator.js
 * 
 * A Node.js utility to generate bulk data for ServiceNow tables.
 * This version supports generating incident and CSM case records.
 * 
 * Usage:
 * node BulkDataGenerator.js --output=bulk-data.xlsx --count=10000 --apiKey=your-openrouter-api-key --table=incident|case
 */

const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');
const { faker } = require('@faker-js/faker');
const OpenRouterLLM = require('../llm/OpenRouterLLMIntegration');
const { generateCaseRecord } = require('./generateCaseRecord');

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
const closedPercentage = parseInt(args.closed || '30', 10); // Default to 30% closed cases
const splitOutput = args.split === 'true'; // Whether to split output into separate files for closed and not closed cases

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
    { sys_id: 'aacb62e2c0a80015007f67f752c2b12c', display_value: 'Project Mgmt' },
    { sys_id: 'b1ff30ac0a0a0b2c00aad0c66d673aa8', display_value: 'Customer Service' },
    { sys_id: 'b2ff30ac0a0a0b2c00aad0c66d673aa9', display_value: 'Technical Support' },
    { sys_id: 'b3ff30ac0a0a0b2c00aad0c66d673aa0', display_value: 'Account Management' }
  ],
  
  // CSM accounts (customers)
  account: [
    { sys_id: 'c1c1c1c1c0a8016400b98a06818d5c11', display_value: 'Acme Corporation' },
    { sys_id: 'c2c2c2c2c0a8016400b98a06818d5c22', display_value: 'Globex Industries' },
    { sys_id: 'c3c3c3c3c0a8016400b98a06818d5c33', display_value: 'Initech Technologies' },
    { sys_id: 'c4c4c4c4c0a8016400b98a06818d5c44', display_value: 'Umbrella Corporation' },
    { sys_id: 'c5c5c5c5c0a8016400b98a06818d5c55', display_value: 'Stark Industries' },
    { sys_id: 'c6c6c6c6c0a8016400b98a06818d5c66', display_value: 'Wayne Enterprises' },
    { sys_id: 'c7c7c7c7c0a8016400b98a06818d5c77', display_value: 'Cyberdyne Systems' },
    { sys_id: 'c8c8c8c8c0a8016400b98a06818d5c88', display_value: 'Massive Dynamic' },
    { sys_id: 'c9c9c9c9c0a8016400b98a06818d5c99', display_value: 'Soylent Corp' },
    { sys_id: 'c0c0c0c0c0a8016400b98a06818d5c00', display_value: 'Weyland-Yutani Corp' }
  ],
  
  // CSM contacts (people at customer organizations)
  contact: [
    { sys_id: 'd1d1d1d1c0a8016400b98a06818d5d11', display_value: 'John Smith', account: 'c1c1c1c1c0a8016400b98a06818d5c11' },
    { sys_id: 'd2d2d2d2c0a8016400b98a06818d5d22', display_value: 'Jane Doe', account: 'c1c1c1c1c0a8016400b98a06818d5c11' },
    { sys_id: 'd3d3d3d3c0a8016400b98a06818d5d33', display_value: 'Robert Johnson', account: 'c2c2c2c2c0a8016400b98a06818d5c22' },
    { sys_id: 'd4d4d4d4c0a8016400b98a06818d5d44', display_value: 'Emily Williams', account: 'c2c2c2c2c0a8016400b98a06818d5c22' },
    { sys_id: 'd5d5d5d5c0a8016400b98a06818d5d55', display_value: 'Michael Brown', account: 'c3c3c3c3c0a8016400b98a06818d5c33' },
    { sys_id: 'd6d6d6d6c0a8016400b98a06818d5d66', display_value: 'Sarah Miller', account: 'c4c4c4c4c0a8016400b98a06818d5c44' },
    { sys_id: 'd7d7d7d7c0a8016400b98a06818d5d77', display_value: 'David Wilson', account: 'c5c5c5c5c0a8016400b98a06818d5c55' },
    { sys_id: 'd8d8d8d8c0a8016400b98a06818d5d88', display_value: 'Jennifer Taylor', account: 'c6c6c6c6c0a8016400b98a06818d5c66' },
    { sys_id: 'd9d9d9d9c0a8016400b98a06818d5d99', display_value: 'Thomas Anderson', account: 'c7c7c7c7c0a8016400b98a06818d5c77' },
    { sys_id: 'd0d0d0d0c0a8016400b98a06818d5d00', display_value: 'Lisa Martinez', account: 'c8c8c8c8c0a8016400b98a06818d5c88' }
  ],
  
  // sys_user
  sys_user: [
    { sys_id: '5137153cc611227c000bbd1bd8cd2005', display_value: 'Fred Luddy', sys_user_group: 'Hardware|8a5055c9c61122780043563ef53438e3, Network|287ebd7da9fe198100f92cc8d1d2154e, Project Mgmt|aacb62e2c0a80015007f67f752c2b12c' },
    { sys_id: 'f8588956937002002dcef157b67ffb98', display_value: 'Change Manager', sys_user_group: 'Change Management|a715cd759f2002002920bde8132e7018' },
    { sys_id: '5137153cc611227c000bbd1bd8cd2007', display_value: 'David Loo', sys_user_group: 'Hardware|8a5055c9c61122780043563ef53438e3, NY DB|5f74727dc0a8010e01efe33a251993f9, Capacity Mgmt|aaccc971c0a8001500fe1ff4302de101, Network|287ebd7da9fe198100f92cc8d1d2154e' },
    { sys_id: '1832fbe1d701120035ae23c7ce610369', display_value: 'Manifah Masood', sys_user_group: 'Application Development|0a52d3dcd7011200f2d224837e6103f2' },
    { sys_id: '62526fa1d701120035ae23c7ce6103c6', display_value: 'Guillermo Frohlich', sys_user_group: 'Application Development|0a52d3dcd7011200f2d224837e6103f2' },
    { sys_id: 'f298d2d2c611227b0106c6be7f154bc8', display_value: 'Bow Ruggeri', sys_user_group: 'Hardware|8a5055c9c61122780043563ef53438e3, Network|287ebd7da9fe198100f92cc8d1d2154e' },
    { sys_id: '38cb3f173b331300ad3cc9bb34efc4d6', display_value: 'Problem Coordinator B', sys_user_group: 'Problem Analyzers|0c4e7b573b331300ad3cc9bb34efc461' },
    { sys_id: '73ab3f173b331300ad3cc9bb34efc4df', display_value: 'Problem Coordinator A', sys_user_group: 'Problem Analyzers|0c4e7b573b331300ad3cc9bb34efc461' },
    { sys_id: '7e3bbb173b331300ad3cc9bb34efc4a8', display_value: 'Problem Task Analyst A', sys_user_group: 'Problem Analyzers|0c4e7b573b331300ad3cc9bb34efc461' },
    { sys_id: '681b365ec0a80164000fb0b05854a0cd', display_value: 'ITIL User', sys_user_group: 'Hardware|8a5055c9c61122780043563ef53438e3, Network|287ebd7da9fe198100f92cc8d1d2154e' }
  ],
  
  // cmdb_ci_service
  cmdb_ci_service: [
    { sys_id: '451047c6c0a8016400de0ae6df9b9d76', display_value: 'Bond Trading' },
    { sys_id: '26e540d80a0a0bb400660482030d04d8', display_value: 'SAP Payroll' },
    { sys_id: 'd278f28f933a31003b4bb095e57ffb8a', display_value: 'Jobvite Enterprise Recruitment Services' },
    { sys_id: '2fd0eab90a0a0bb40061cf732d32967c', display_value: 'PeopleSoft Governance' },
    { sys_id: '26e46e5b0a0a0bb4005d1146846c429c', display_value: 'SAP Controlling' }
  ],
  
  // cmdb_ci (simplified for brevity)
  cmdb_ci: [
    { sys_id: '3a6b9e16c0a8ce0100e154dd7e6353c2', display_value: 'SAP LoadBal01', cmdb_ci_service: 'SAP Materials Management|26e44e8a0a0a0bb40095ff953f9ee520' },
    { sys_id: '3a27f1520a0a0bb400ecd6ff7afcf036', display_value: 'PS Apache02', cmdb_ci_service: 'PeopleSoft Governance|2fd0eab90a0a0bb40061cf732d32967c' },
    { sys_id: '55c3578bc0a8010e0117f727897d0011', display_value: 'bond_trade_ny', cmdb_ci_service: 'Bond Trading|451047c6c0a8016400de0ae6df9b9d76' }
  ]
};

// Hard-coded choice values
const choiceValues = {
  // Category values
  category: ['Network', 'Hardware', 'Software', 'Database', 'Security', 'Email', 'Telephony', 'Authentication', 'Storage', 'Web'],
  
  // CSM case category values
  case_category: ['Account', 'Billing', 'Product', 'Service', 'Technical', 'Order', 'Shipping', 'Returns', 'Warranty', 'General'],
  
  // Subcategory values (mapped to categories)
  subcategory: {
    'Network': ['Connectivity', 'VPN', 'Wireless', 'DNS', 'DHCP'],
    'Hardware': ['Desktop', 'Laptop', 'Printer', 'Mobile Device', 'Server'],
    'Software': ['Operating System', 'Application', 'Update', 'License', 'Installation'],
    'Database': ['Performance', 'Backup', 'Recovery', 'Query', 'Permissions'],
    'Security': ['Access', 'Virus', 'Firewall', 'Encryption', 'Policy']
  },
  
  // CSM case subcategory values (mapped to case categories)
  case_subcategory: {
    'Account': ['Access', 'Creation', 'Modification', 'Deletion', 'Permissions'],
    'Billing': ['Invoice', 'Payment', 'Refund', 'Subscription', 'Pricing'],
    'Product': ['Defect', 'Feature Request', 'Documentation', 'Compatibility', 'Installation'],
    'Service': ['Availability', 'Quality', 'Modification', 'Cancellation', 'Upgrade'],
    'Technical': ['Error', 'Performance', 'Configuration', 'Integration', 'Security']
  },
  
  // Close code values
  close_code: [
    'Known error', 'Resolved by problem', 'User error', 'No resolution provided',
    'Resolved by request', 'Resolved by caller', 'Solution provided', 'Duplicate'
  ],
  
  // CSM case close code values
  case_close_code: [
    'Solved (Permanently)', 'Solved (Work Around)', 'Solved (Knowledge Article)', 
    'Not Solved (Not Reproducible)', 'Not Solved (Too Costly)', 'Not Solved (Not Supported)'
  ],
  
  // Contact type values
  contact_type: ['Email', 'Phone', 'Self-service', 'Walk-in', 'Chat', 'Automated', 'Virtual Agent', 'Social Media'],
  
  // State values (integer backend)
  state: [
    { value: 1, display: 'New' },
    { value: 2, display: 'In Progress' },
    { value: 3, display: 'On Hold' },
    { value: 4, display: 'Resolved' },
    { value: 5, display: 'Closed' },
    { value: 6, display: 'Canceled' }
  ],
  
  // CSM case state values (integer backend)
  case_state: [
    { value: 1, display: 'New' },
    { value: 2, display: 'In Progress' },
    { value: 3, display: 'On Hold' },
    { value: 4, display: 'Awaiting Customer' },
    { value: 5, display: 'Resolved' },
    { value: 6, display: 'Closed' },
    { value: 7, display: 'Canceled' }
  ],
  
  // CSM case type values
  case_type: ['Question', 'Issue', 'Feature Request', 'Complaint', 'Compliment', 'Service Request', 'Order', 'Return'],
  
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
    
    // Determine if we should output as CSV based on file extension
    const isCSVOutput = this.outputFile.toLowerCase().endsWith('.csv');
    
    // Initialize workbooks and worksheets
    let workbook, worksheet;
    let closedWorkbook, closedWorksheet;
    let openWorkbook, openWorksheet;
    
    // Get the headers for the table
    const headers = this.createExcelHeader();
    
    // If we're splitting the output, create separate workbooks for closed and open cases
    if (splitOutput) {
      // Get the base filename without extension
      const fileExt = path.extname(this.outputFile);
      const fileBase = this.outputFile.slice(0, -fileExt.length);
      
      // Create filenames for closed and open cases
      const closedFile = `${fileBase}-closed${fileExt}`;
      const openFile = `${fileBase}-open${fileExt}`;
      
      console.log(`Splitting output into separate files:`);
      console.log(`- Closed cases: ${closedFile}`);
      console.log(`- Open cases: ${openFile}`);
      
      // Create workbooks and worksheets for closed and open cases
      closedWorkbook = new Excel.Workbook();
      closedWorksheet = closedWorkbook.addWorksheet(this.tableName);
      closedWorksheet.columns = headers;
      
      openWorkbook = new Excel.Workbook();
      openWorksheet = openWorkbook.addWorksheet(this.tableName);
      openWorksheet.columns = headers;
    } else {
      // Create a single workbook and worksheet
      console.log(`Output format is ${isCSVOutput ? 'CSV' : 'Excel'}: ${this.outputFile}`);
      workbook = new Excel.Workbook();
      
      // Check if the output file exists
      const fileExists = !isCSVOutput && fs.existsSync(this.outputFile);
      
      if (fileExists) {
        console.log(`Output file ${this.outputFile} exists. Reading existing file...`);
        await workbook.xlsx.readFile(this.outputFile);
        worksheet = workbook.getWorksheet(1) || workbook.addWorksheet(this.tableName);
        if (worksheet.rowCount <= 1) {
          worksheet.columns = headers;
        }
      } else {
        console.log(`Creating new output file ${this.outputFile}...`);
        worksheet = workbook.addWorksheet(this.tableName);
        worksheet.columns = headers;
      }
    }
    
    // Generate data in batches to avoid memory issues
    let recordsGenerated = 0;
    let closedRecords = 0;
    let openRecords = 0;
    const totalBatches = Math.ceil(this.recordCount / this.batchSize);
    
    console.log(`Generating ${this.recordCount} records in ${totalBatches} batches of ${this.batchSize}...`);
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const currentBatchSize = Math.min(this.batchSize, this.recordCount - recordsGenerated);
      console.log(`Generating batch ${batchNum + 1}/${totalBatches} (${currentBatchSize} records)...`);
      
      // Generate the batch of records
      const records = await this.generateBatch(currentBatchSize);
      
      // Add the records to the appropriate worksheet
      for (const record of records) {
        if (splitOutput) {
          // Check if the record is closed or resolved
          const isClosed = record.state === 'Resolved' || record.state === 'Closed';
          
          if (isClosed) {
            closedWorksheet.addRow(record);
            closedRecords++;
          } else {
            openWorksheet.addRow(record);
            openRecords++;
          }
        } else {
          worksheet.addRow(record);
        }
      }
      
      recordsGenerated += currentBatchSize;
      console.log(`Progress: ${recordsGenerated}/${this.recordCount} records (${Math.round(recordsGenerated / this.recordCount * 100)}%)`);
    }
    
    // Save the workbooks
    if (splitOutput) {
      // Get the base filename without extension
      const fileExt = path.extname(this.outputFile);
      const fileBase = this.outputFile.slice(0, -fileExt.length);
      
      // Create filenames for closed and open cases
      const closedFile = `${fileBase}-closed${fileExt}`;
      const openFile = `${fileBase}-open${fileExt}`;
      
      if (isCSVOutput) {
        // Write closed cases to CSV
        const closedCsvData = [];
        closedWorksheet.eachRow((row, rowNumber) => {
          const rowData = [];
          row.eachCell((cell) => {
            // Escape values that contain commas by wrapping in quotes
            let value = String(cell.value || '');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              // Double any existing quotes
              value = value.replace(/"/g, '""');
              // Wrap in quotes
              value = `"${value}"`;
            }
            rowData.push(value);
          });
          closedCsvData.push(rowData.join(','));
        });
        
        fs.writeFileSync(closedFile, closedCsvData.join('\n'));
        console.log(`CSV data written to ${closedFile} (${closedRecords} closed records)`);
        
        // Write open cases to CSV
        const openCsvData = [];
        openWorksheet.eachRow((row, rowNumber) => {
          const rowData = [];
          row.eachCell((cell) => {
            // Escape values that contain commas by wrapping in quotes
            let value = String(cell.value || '');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              // Double any existing quotes
              value = value.replace(/"/g, '""');
              // Wrap in quotes
              value = `"${value}"`;
            }
            rowData.push(value);
          });
          openCsvData.push(rowData.join(','));
        });
        
        fs.writeFileSync(openFile, openCsvData.join('\n'));
        console.log(`CSV data written to ${openFile} (${openRecords} open records)`);
      } else {
        // Write to Excel
        await closedWorkbook.xlsx.writeFile(closedFile);
        console.log(`Excel data written to ${closedFile} (${closedRecords} closed records)`);
        
        await openWorkbook.xlsx.writeFile(openFile);
        console.log(`Excel data written to ${openFile} (${openRecords} open records)`);
      }
    } else {
      if (isCSVOutput) {
        // Write to CSV with proper escaping of values
        const csvData = [];
        worksheet.eachRow((row, rowNumber) => {
          const rowData = [];
          row.eachCell((cell) => {
            // Escape values that contain commas by wrapping in quotes
            let value = String(cell.value || '');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              // Double any existing quotes
              value = value.replace(/"/g, '""');
              // Wrap in quotes
              value = `"${value}"`;
            }
            rowData.push(value);
          });
          csvData.push(rowData.join(','));
        });
        
        fs.writeFileSync(this.outputFile, csvData.join('\n'));
        console.log(`CSV data written to ${this.outputFile}`);
      } else {
        // Write to Excel
        await workbook.xlsx.writeFile(this.outputFile);
        console.log(`Excel data written to ${this.outputFile}`);
      }
    }
    
    console.timeEnd('Data generation');
    console.log(`Generated ${recordsGenerated} records.`);
    
    if (splitOutput) {
      console.log(`- ${closedRecords} closed records`);
      console.log(`- ${openRecords} open records`);
    }
  }

  /**
   * Generate a batch of records
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
        // Use the imported generateCaseRecord function with the necessary parameters
        recordPromises.push(generateCaseRecord({
          referenceData,
          choiceValues,
          llm: this.llm,
          index: i,
          closedPercentage
        }));
      } else {
        recordPromises.push(Promise.resolve({}));
      }
    }
    
    // Wait for all records to be generated
    const records = await Promise.all(recordPromises);
    return records;
  }

  /**
   * Create Excel header based on table type
   * @returns {Array} - Array of column definitions
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
        { header: 'Assigned to', key: 'assigned_to', width: 20 },
        { header: 'Close code', key: 'close_code', width: 25 },
        { header: 'Close notes', key: 'close_notes', width: 60 }
      ];
    } else if (this.tableName === 'case') {
      return [
        { header: 'Number', key: 'number', width: 15 },
        { header: 'Channel', key: 'contact_type', width: 15 },
        { header: 'Account', key: 'account', width: 25 },
        { header: 'Contact', key: 'contact', width: 25 },
        { header: 'Consumer', key: 'consumer', width: 25 },
        { header: 'Requesting Service Organization', key: 'requesting_service_organization', width: 30 },
        { header: 'Product', key: 'product', width: 25 },
        { header: 'Asset', key: 'asset', width: 25 },
        { header: 'Install Base', key: 'install_base', width: 25 },
        { header: 'Partner Contact', key: 'partner_contact', width: 25 },
        { header: 'Parent', key: 'parent', width: 25 },
        { header: 'Short description', key: 'short_description', width: 40 },
        { header: 'Needs attention', key: 'needs_attention', width: 15 },
        { header: 'Opened', key: 'opened_at', width: 25 },
        { header: 'Priority', key: 'priority', width: 15 },
        { header: 'Assignment group', key: 'assignment_group', width: 25 },
        { header: 'Assigned to', key: 'assigned_to', width: 20 },
        { header: 'Service Organization', key: 'service_organization', width: 30 },
        { header: 'Contract', key: 'contract', width: 25 },
        { header: 'Entitlement', key: 'entitlement', width: 25 },
        { header: 'Partner', key: 'partner', width: 25 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Resolved by', key: 'resolved_by', width: 25 },
        { header: 'Resolved at', key: 'resolved_at', width: 25 },
        { header: 'Closed by', key: 'closed_by', width: 25 },
        { header: 'Closed at', key: 'closed_at', width: 25 },
        { header: 'Resolution code', key: 'resolution_code', width: 25 },
        { header: 'Cause', key: 'cause', width: 25 },
        { header: 'Close code', key: 'close_code', width: 25 },
        { header: 'Close notes', key: 'close_notes', width: 60 },
        { header: 'Notes to comments', key: 'notes_to_comments', width: 15 }
      ];
    }
    
    return [];
  }

  /**
   * Generate an incident record
   * @param {number} index - Index of the record in the batch
   * @returns {Promise<Object>} - Generated incident record
   */
  async generateIncidentRecord(index) {
    try {
      // Generate a random incident number
      const incidentNumber = `INC${String(Date.now()).substring(7)}${String(index).padStart(4, '0')}`;
      
      // Get random caller
      const caller = this.getRandomReference('sys_user');
      
      // Get random category
      const category = this.getRandomChoice('category');
      
      // Get random subcategory based on category
      const subcategories = choiceValues.subcategory[category] || [];
      const subcategory = subcategories.length > 0 ? subcategories[Math.floor(Math.random() * subcategories.length)] : '';
      
      // Get random business service
      const businessService = this.getRandomReference('cmdb_ci_service');
      
      // Get random CI
      const ci = this.getRandomReference('cmdb_ci');
      
      // Get random contact type
      const contactType = this.getRandomChoice('contact_type');
      
      // Get random state
      const stateObj = this.getRandomChoice('state');
      const state = stateObj.display;
      
      // Get random impact
      const impactObj = this.getRandomChoice('impact');
      const impact = impactObj.display;
      
      // Get random urgency
      const urgencyObj = this.getRandomChoice('urgency');
      const urgency = urgencyObj.display;
      
      // Calculate priority based on impact and urgency
      const priority = Math.min(Math.ceil((impactObj.value + urgencyObj.value) / 2), 5);
      
      // Get random assignment group
      const assignmentGroup = this.getRandomReference('sys_user_group');
      
      // Get random assigned to user
      const assignedTo = this.getRandomReference('sys_user');
      
      // Generate short description and description
      let shortDescription, description;
      try {
        const descriptions = await this.generateIncidentDescriptions(category, subcategory);
        shortDescription = descriptions.shortDescription;
        description = descriptions.description;
      } catch (error) {
        // Silently handle description generation errors
        shortDescription = `${category} - ${subcategory} issue`;
        description = `Incident regarding ${category} - ${subcategory}`;
      }
      
      // Generate close notes if the incident is closed or resolved
      let closeCode = '';
      let closeNotes = '';
      
      if (['Resolved', 'Closed'].includes(state)) {
        closeCode = this.getRandomChoice('close_code');
        
        try {
          closeNotes = await this.generateCloseNotes(shortDescription, description, closeCode);
        } catch (error) {
          // Silently handle close notes generation errors
          closeNotes = `Incident closed with code: ${closeCode}`;
        }
      }
      
      // Create the incident record
      const incidentRecord = {
        number: incidentNumber,
        caller_id: caller.display_value,
        category,
        subcategory,
        business_service: businessService.display_value,
        service_offering: '',
        cmdb_ci: ci.display_value,
        short_description: shortDescription,
        description,
        contact_type: contactType,
        state,
        impact,
        urgency,
        priority,
        assignment_group: assignmentGroup.display_value,
        assigned_to: assignedTo.display_value,
        close_code: closeCode,
        close_notes: closeNotes
      };
      
      return incidentRecord;
    } catch (error) {
      // Silently handle incident record generation errors
      return {
        number: `ERROR-${index}`,
        short_description: 'Error generating incident record',
        description: `Error: ${error.message}`
      };
    }
  }

  /**
   * Generate incident descriptions using LLM
   * @param {string} category - The category
   * @param {string} subcategory - The subcategory
   * @returns {Promise<Object>} - Generated descriptions
   */
  async generateIncidentDescriptions(category, subcategory) {
    try {
      const prompt = `Generate a realistic ServiceNow incident short description and detailed description for the following:
- Category: ${category}
- Subcategory: ${subcategory}

Format your response as JSON with 'shortDescription' and 'description' fields. 
The short description should be a brief summary (under 100 characters).
The description should be detailed (200-400 characters).`;

      const response = await this.llm.generateText(prompt);
      
      // Try to parse the response as JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
        
        // If we successfully parsed the JSON, return the values
        return {
          shortDescription: parsedResponse.shortDescription || `${category} - ${subcategory} issue`,
          description: parsedResponse.description || `Incident regarding ${category} - ${subcategory}`
        };
      } catch (jsonError) {
        // Silently handle JSON parsing errors
        
        // Try to fix common JSON issues
        let fixedJson = response;
        
        // Replace unescaped quotes in strings
        fixedJson = fixedJson.replace(/([^\\])"([^"]*)"/g, '$1\\"$2"');
        
        try {
          parsedResponse = JSON.parse(fixedJson);
          
          // If we successfully parsed the fixed JSON, return the values
          return {
            shortDescription: parsedResponse.shortDescription || `${category} - ${subcategory} issue`,
            description: parsedResponse.description || `Incident regarding ${category} - ${subcategory}`
          };
        } catch (fixedJsonError) {
          // Silently handle fixed JSON parsing errors
          
          // Try more advanced JSON extraction methods
          // Method 1: Find the first { and the last } to extract the JSON object
          try {
            const firstBrace = response.indexOf('{');
            const lastBrace = response.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1) {
              const jsonStr = response.substring(firstBrace, lastBrace + 1);
              parsedResponse = JSON.parse(jsonStr);
              
              if (parsedResponse.shortDescription || parsedResponse.description) {
                return {
                  shortDescription: parsedResponse.shortDescription || `${category} - ${subcategory} issue`,
                  description: parsedResponse.description || `Incident regarding ${category} - ${subcategory}`
                };
              }
            }
          } catch (extractError) {
            // Silently handle JSON extraction errors
          }
          
          // Method 2: Try to extract values using regex
          const shortDescMatch = response.match(/["']?shortDescription["']?\s*:\s*["']([^"']+)["']/i);
          const descMatch = response.match(/["']?description["']?\s*:\s*["']([^"']+)["']/i);
          
          if (shortDescMatch || descMatch) {
            return {
              shortDescription: shortDescMatch ? shortDescMatch[1].trim() : `${category} - ${subcategory} issue`,
              description: descMatch ? descMatch[1].trim() : `Incident regarding ${category} - ${subcategory}`
            };
          }
          
          // Method 3: Check for JSON-like structure and manually extract
          if (response.includes('"shortDescription"') && response.includes('"description"')) {
            try {
              // Try to manually extract the values
              const shortDescStart = response.indexOf('"shortDescription"');
              const descStart = response.indexOf('"description"');
              
              if (shortDescStart !== -1 && descStart !== -1) {
                // Determine which comes first
                if (shortDescStart < descStart) {
                  // Extract shortDescription
                  const shortDescValueStart = response.indexOf(':', shortDescStart) + 1;
                  const shortDescValueEnd = response.indexOf(',', shortDescValueStart);
                  let shortDesc = response.substring(shortDescValueStart, shortDescValueEnd !== -1 ? shortDescValueEnd : response.length).trim();
                  
                  // Remove quotes if present
                  shortDesc = shortDesc.replace(/^["']/, '').replace(/["']$/, '');
                  
                  // Extract description
                  const descValueStart = response.indexOf(':', descStart) + 1;
                  const descValueEnd = response.indexOf(',', descValueStart);
                  let desc = response.substring(descValueStart, descValueEnd !== -1 ? descValueEnd : response.length).trim();
                  
                  // Remove quotes if present
                  desc = desc.replace(/^["']/, '').replace(/["']$/, '');
                  
                  return {
                    shortDescription: shortDesc || `${category} - ${subcategory} issue`,
                    description: desc || `Incident regarding ${category} - ${subcategory}`
                  };
                }
              }
            } catch (manualError) {
              // Silently handle manual extraction errors
            }
          }
          
          // Method 4: Line-based extraction as a last resort
          const lines = response.split('\n');
          if (lines.length >= 2) {
            // Check if the first line might be a title or header
            if (lines[0].length < 100 && !lines[0].includes('{') && !lines[0].includes(':')) {
              return {
                shortDescription: lines[0].trim(),
                description: lines.slice(1).join(' ').trim()
              };
            }
          }
          
          // If all parsing attempts fail, use fallback
          return {
            shortDescription: `${category} - ${subcategory} issue`,
            description: `Incident regarding ${category} - ${subcategory}`
          };
        }
      }
    } catch (error) {
      // Silently handle LLM errors
      return {
        shortDescription: `${category} - ${subcategory} issue`,
        description: `Incident regarding ${category} - ${subcategory}`
      };
    }
  }

  /**
   * Generate close notes using LLM
   * @param {string} shortDescription - The short description
   * @param {string} description - The description
   * @param {string} closeCode - The close code
   * @returns {Promise<string>} - Generated close notes
   */
  async generateCloseNotes(shortDescription, description, closeCode) {
    try {
      const prompt = `Generate realistic ServiceNow incident close notes for the following:
- Short Description: ${shortDescription}
- Description: ${description}
- Close Code: ${closeCode}

The close notes should explain the resolution process and outcome (100-200 characters).`;

      const response = await this.llm.generateText(prompt);
      return response.trim();
    } catch (error) {
      // Silently handle LLM errors for close notes
      return `Incident closed with code: ${closeCode}. The issue was resolved according to standard procedures.`;
    }
  }

  /**
   * Get a random reference value from the reference data
   * @param {string} table - The reference table to get a value from
   * @returns {Object} - Random reference value
   */
  getRandomReference(table) {
    const values = referenceData[table];
    return values[Math.floor(Math.random() * values.length)];
  }

  /**
   * Get a random choice value
   * @param {string} field - The choice field to get a value from
   * @returns {string|Object} - Random choice value
   */
  getRandomChoice(field) {
    const values = choiceValues[field];
    return values[Math.floor(Math.random() * values.length)];
  }
}

/**
 * Main function to run the bulk data generator
 */
async function main() {
  try {
    console.log('Starting bulk data generation...');
    
    // Create a new bulk data generator
    const generator = new BulkDataGenerator({
      recordCount,
      batchSize,
      outputFile,
      tableName,
      model,
      apiKey
    });
    
    // Generate the data
    await generator.generate();
    
    console.log('Bulk data generation complete!');
  } catch (error) {
    // Log a simple error message without details
    console.error('Error generating bulk data. Please check your parameters and try again.');
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

// Export the BulkDataGenerator class
module.exports = BulkDataGenerator;
