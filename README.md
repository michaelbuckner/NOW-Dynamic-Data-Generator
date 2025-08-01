﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿# NOW-Dynamic-Data-Generator

![image](https://github.com/user-attachments/assets/bc78048f-1040-49bd-b929-17feacf247bb) ![image](https://github.com/user-attachments/assets/a9888184-05cc-407b-bc07-64433eace7b0)

This project consists of two main components:

1. **NowDataGenerator**: A ServiceNow script that automates the creation of various types of records with AI-generated content using the NOW Assist Generate Content skill.
2. **Bulk Data Generator**: A utility for generating large quantities of data (10K+ records) for ServiceNow tables.

# Part 1: NowDataGenerator

This script includes a NowDataGenerator class for ServiceNow that automates the creation of various types of records with AI-generated content using the NOW Assist Generate Content skill.

## Supported Record Types
- Incidents
- Changes
- CSM Cases
- HR Cases
- Healthcare Claims
- Knowledge Articles

There is also an additional script include for generating mass summarizies and emailing them.

## Recent Changes

- All class names have been prefixed with "Now" (e.g., AbstractDataGenerator → NowAbstractDataGenerator)
- Attachment functionality has been removed from all classes
- File names have been updated to match the new class names
- Added ability to split output into separate files for closed and open cases using the `--split=true` parameter
- Improved error handling with silent error management for JSON parsing issues

## Prerequisites

1. ServiceNow instance with NOW Assist capabilities
2. OpenAI API key
3. Access to create and modify Script Includes in ServiceNow

## Setup Instructions

### 1. Configure OpenAI API Key in ServiceNow

To use the OpenAI API with ServiceNow, you need to set up your API key:

1. https://docs.servicenow.com/bundle/xanadu-intelligent-experiences/page/administer/generative-ai-controller/task/configure-api-credentials-for-openai.html 

### 2. Set Default Provider for  Generic Prompt Skill

To ensure the NowDataGenerator uses the correct AI provider:

1. In the navigation filter, search for the OneExtend Capability table by entering sys_one_extend_capability.list.
2. Open the record for the capability that you would like to configure, in this case we want to set a default provider for Generic Prompt.
3. In the "OneExtend Definition Configs" related list, set OpenAI as the default provider.
4. Save your changes.
5. https://docs.servicenow.com/bundle/xanadu-intelligent-experiences/page/administer/generative-ai-controller/task/configure-a-provider-for-a-generative-ai-capability.html

## Installation

1. In your ServiceNow instance, navigate to **System Definition** > **Script Includes**.
2. Click "New" to create a new Script Include.
3. Set the following fields:
   - Name: NowAbstractDataGenerator
   - API Name: global.NowAbstractDataGenerator
   - Client callable: false
   - Acceible from: All application scopes
   - Active: true
4. Copy the entire NowAbstractDataGenerator code into the Script field.
5. Click "Submit" to save the Script Include.
6. Click "New" to create a new Script Include.
7. Set the following fields:
   - Name: NowDataGenerator
   - API Name: global.NowDataGenerator
   - Client callable: false
   - Acceible from: All application scopes
   - Active: true
8. Copy the entire NowDataGenerator code into the Script field.
9. Click "Submit" to save the Script Include.
10. Click "New" to create a new Script Include.
11. Set the following fields:
    - Name: NowMassSummarize
    - API Name: global.NowMassSummarize
    - Client callable: false
    - Acceible from: All application scopes
    - Active: true
12. Copy the entire NowMassSummarize code into the Script field.
13. Click "Submit" to save the Script Include.

## Usage

You can use the NowDataGenerator in various ServiceNow server-side scripts. Here are some examples:

### Basic Usage to create an Incident (e.g., Background Script)

```javascript
// Instantiate the NowDataGenerator class
var dataGen = new NowDataGenerator();
var incidentSysId = dataGen.createCase('incident', '<Your short description>');

// Log the sys_id of the created incident
gs.info('Created Incident with sys_id: ' + incidentSysId);
```

### Basic Usage to create a CSM Case (e.g., Background Script)

```javascript
// Instantiate the NowDataGenerator class
var dataGen = new NowDataGenerator();
// Create a CSM case with a short description
var csmCaseSysId = dataGen.createCase('csm_case', '<Your short description>');

// Log the sys_id of the created CSM case
gs.info('Created CSM Case with sys_id: ' + csmCaseSysId);

```

### Basic Usage to create an HR Case (e.g., Background Script)

```javascript
// Instantiate the NowDataGenerator class
var dataGen = new NowDataGenerator();
// Create an HR case with a short description
var hrCaseSysId = dataGen.createCase('hr_case', '<Your short description>');

// Log the sys_id of the created HR case
gs.info('Created HR Case with sys_id: ' + hrCaseSysId);

```

### Basic Usage to create a single healthcare claim with a random claim name (e.g., Background Script)
```javascript
// Instantiate the NowDataGenerator class
var dataGen = new NowDataGenerator();
var claimSysId = dataGen.createCase('healthcare_claim');

// Log the sys_ids of the created healthcare claims
gs.info('Created Healthcare Claim with sys_id: ' + claimSysId);
```

### Basic Usage to create multiple healthcare claims with random claim names (e.g., Background Script)
```javascript
// Instantiate the NowDataGenerator class
// Create 3 healthcare claims
var healthcareClaimsSysIds = dataGen.createCase('healthcare_claim', null, 3);

// Log the sys_ids of the created healthcare claims
gs.info('Created Healthcare Claims with sys_ids: ' + healthcareClaimsSysIds.join(', '));

```

### Basic Usage to create a Change Request (e.g., Background Script)

```javascript
// Instantiate the NowDataGenerator class
var dataGen = new NowDataGenerator();
// Create a change request (short description is optional, will be generated if not provided)
var changeRequestSysId = dataGen.createCase('change_request');

// Log the sys_id of the created change request
gs.info('Created Change Request with sys_id: ' + changeRequestSysId);

// Alternatively, you can provide a short description if desired
var changeRequestWithDescSysId = dataGen.createCase('change_request', 'Upgrade server firmware');
gs.info('Created Change Request with custom description, sys_id: ' + changeRequestWithDescSysId);

// Create a "bad" change request with problematic plan data that would likely be flagged by an LLM
var badChangeRequestSysId = dataGen.createCase('change_request', 'Server maintenance', { generateBadData: true });
gs.info('Created problematic Change Request with sys_id: ' + badChangeRequestSysId);

// You can also pass options as the third parameter
var anotherBadChangeRequestSysId = dataGen.createCase('change_request', null, { generateBadData: true });
gs.info('Created another problematic Change Request with sys_id: ' + anotherBadChangeRequestSysId);
```

The `generateBadData` option creates change requests with problematic content in the following fields:
- justification: Vague and incomplete, lacking specific details and business value
- implementation_plan: Missing steps, inconsistent timing, and no clear ownership
- risk_impact_analysis: Downplays risks, ignores service impacts, lacks mitigation strategies
- backout_plan: Inadequate steps, timing issues, doesn't address service restoration
- test_plan: Insufficient test cases, no clear success criteria, missing validation steps

This is useful for testing ServiceNow's ability to detect problematic changes, such as when using an LLM to review change requests.

### Basic Usage to create a Knowledge Article (e.g., Background Script)

```javascript
// Instantiate the NowDataGenerator class
var dataGen = new NowDataGenerator();
// Create a knowledge article with a short description
var knowledgeArticleSysId = dataGen.createCase('knowledge_article', 'How to reset your password');

// Log the sys_id of the created knowledge article
gs.info('Created Knowledge Article with sys_id: ' + knowledgeArticleSysId);
```

### Basic Usage to create an Incident with a related KB Article (e.g., Background Script)

```javascript
// Instantiate the NowDataGenerator class
var dataGen = new NowDataGenerator();
// Create an incident and a related KB article with a short description
var result = dataGen.createIncidentWithKB('Unable to connect to VPN from remote location');

// Log the sys_ids of the created incident and KB article
gs.info('Created Incident with sys_id: ' + result.incident);
gs.info('Created KB Article with sys_id: ' + result.kb_article);

// You can also access the created records directly
var incidentGr = new GlideRecord('incident');
if (incidentGr.get(result.incident)) {
    gs.info('Incident short description: ' + incidentGr.short_description);
}

var kbGr = new GlideRecord('kb_knowledge');
if (kbGr.get(result.kb_article)) {
    gs.info('KB Article title: ' + kbGr.short_description);
}
```

### Basic Usage to email a mass summary (e.g., Scheduled job)

```javascript
// Instantiate the NowMassSummarize class
var summarizer = new NowMassSummarize();

// Generate the HTML summary report for the past 30 days
var summaryReport = summarizer.generateSummaryReport(30);

var email = new GlideEmailOutbound();
email.addRecipient('<your@email>');
email.setSubject('Operations Summary');
email.setBody(summaryReport);
email.save();

```

## Customization

You can customize the NowDataGenerator by modifying the following:

- Update the `sys_id` constants at the top of the script to match your ServiceNow instance's record system IDs.
- Modify the `_createIncident`, `_createCSMCase`, and `_createHRCase` methods to include additional fields or logic specific to your needs.
- Adjust the prompt templates in the `_generateEntries` method to generate different types of content.

# Part 2: Bulk Data Generator

A utility for generating bulk data (10K+ records) for ServiceNow tables. This component consists of:

1. **ServiceNow Field Information Gatherer**: A ServiceNow script that extracts field information for a specified table, including field types and reference values.
2. **Bulk Data Generator**: A Node.js program that generates large quantities of data based on the gathered field information and outputs it to a CSV file for import into ServiceNow.

## Project Structure

The project is organized into the following directories:

- `src/` - Source code
  - `servicenow/` - ServiceNow script includes
  - `node/` - Node.js components
  - `llm/` - LLM integration components
- `scripts/` - Utility scripts
- `examples/` - Example output files
- `docs/` - Documentation
- `config/` - Configuration files

## Features

- Generate 10K+ records with realistic data for ServiceNow tables
- Support for incident and CSM case records
- Hard-coded reference and choice values for consistent data generation
- OpenRouter LLM integration for generating realistic short descriptions and detailed descriptions
- Optimized for performance with batch processing
- CSV or Excel output for easy import into ServiceNow

## Prerequisites

### For Bulk Data Generator
- Node.js 14.x or higher
- npm (Node Package Manager)
- OpenRouter API key (sign up at https://openrouter.ai/)

## Installation

1. Clone this repository or download the files.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your OpenRouter API key as an environment variable:
   ```bash
   # Unix/Linux/Mac
   export OPENROUTER_API_KEY=your-api-key-here
   
   # Windows
   set OPENROUTER_API_KEY=your-api-key-here
   ```

## Usage

### Testing the OpenRouter Integration

Before generating a large dataset, you can test the OpenRouter integration:

```bash
node scripts/test-openrouter.js [model] [apiKey]
```

This will generate sample incident descriptions for different categories and configuration items, allowing you to verify that the OpenRouter integration is working correctly.

### Generating Bulk Data

Run the Bulk Data Generator to create incident records:

```bash
node src/node/BulkDataGenerator.js --output=bulk-data.csv --count=10000 --apiKey=your-api-key
```

Options:
- `--output`: Path to the output CSV file (default: bulk-data.csv)
- `--count`: Number of records to generate (default: 10000)
- `--batch`: Batch size for processing (default: 1000)
- `--table`: Table to generate data for (default: incident)
- `--closed`: Percentage of records that should be closed (default: 30)
- `--split`: Whether to split output into separate files for closed and open cases (default: false)
- `--model`: OpenRouter model to use (default: google/gemini-2.0-flash-001)
- `--apiKey`: Your OpenRouter API key

You can also use the provided scripts for convenience:

```bash
# Unix/Linux/Mac
./generate-sample-data.sh [model] [apiKey] [table] [count]

# Windows
generate-sample-data.bat [model] [apiKey] [table] [count]
```

### Import Data into ServiceNow

1. In your ServiceNow instance, navigate to **System Import Sets** > **Load Data**.
2. Upload the generated CSV file.
3. Configure the import set to map the CSV columns to the appropriate fields in the target table.
4. Run the import.

### Generated Fields for Incident Records

The generator creates incident records with the following fields optimized for ServiceNow import:

- **caller_id**: Reference to a user in the sys_user table
- **category**: IT service category (e.g., Network, Hardware, Software)
- **subcategory**: Subcategory related to the category (e.g., VPN, Laptop, Application)
- **business_service**: Reference to a business service in the cmdb_ci_service table
- **service_offering**: Reference to a service offering in the service_offering table
- **cmdb_ci**: Reference to a configuration item in the cmdb_ci table
- **short_description**: AI-generated concise description of the incident
- **description**: AI-generated detailed description that elaborates on the short description
- **contact_type**: Method of contact (e.g., Email, Phone, Self-service)
- **opened_at**: Date/time in ServiceNow format (YYYY-MM-DD HH:MM:SS)
- **incident_state**: Incident state with proper field mapping (New, In Progress, Resolved, etc.)
- **impact**: Impact level as numeric values (1=High, 2=Medium, 3=Low)
- **urgency**: Urgency level as numeric values (1=High, 2=Medium, 3=Low)
- **priority**: Left empty for ServiceNow to auto-calculate from Impact and Urgency
- **assignment_group**: Reference to a group in the sys_user_group table
- **assigned_to**: Reference to a user in the sys_user table
- **resolution_code**: Reason for closing the incident (for resolved/closed incidents)
- **resolution_notes**: AI-generated notes explaining the resolution (for resolved/closed incidents)

### ServiceNow Import Compatibility

The generator has been optimized for seamless ServiceNow import with the following features:

- **Proper Date Format**: The "Opened" field uses ServiceNow's expected format (YYYY-MM-DD HH:MM:SS)
- **Numeric Values**: Impact and Urgency use numeric values (1, 2, 3) instead of text for proper field mapping
- **Auto-calculated Priority**: Priority field is left empty so ServiceNow can calculate it automatically from Impact and Urgency
- **Field Name Mapping**: Column headers match ServiceNow field names for automatic mapping:
  - "Incident State" instead of "State" for proper auto-mapping
  - "Resolution code" instead of "Close code"
  - "Resolution notes" instead of "Close notes"

### Generated Fields for CSM Case Records

The generator creates CSM case records with the following fields:

- **number**: Unique case number (e.g., CS0010001)
- **account**: Reference to a customer account
- **contact**: Reference to a contact at the customer account
- **case_type**: Type of case (e.g., Question, Issue, Feature Request)
- **category**: Case category (e.g., Account, Billing, Product)
- **subcategory**: Subcategory related to the category (e.g., Access, Invoice, Defect)
- **short_description**: AI-generated concise description of the case
- **description**: AI-generated detailed description that elaborates on the short description
- **contact_type**: Method of contact (e.g., Email, Phone, Self-service)
- **state**: Case state (e.g., New, In Progress, Awaiting Customer)
- **priority**: Priority level (1-5)
- **assignment_group**: Reference to a group in the sys_user_group table
- **assigned_to**: Reference to a user in the sys_user table
- **close_code**: Reason for closing the case (for resolved/closed cases)
- **close_notes**: AI-generated notes explaining the resolution (for resolved/closed cases)

## OpenRouter LLM Integration

The Bulk Data Generator uses OpenRouter to generate meaningful content for text fields like short_description and description. This produces realistic data that is consistent and contextually appropriate.

### Available Models

OpenRouter provides access to many different models. Some popular options include:

- `openai/gpt-3.5-turbo` - Fast and cost-effective
- `openai/gpt-4-turbo` - More capable but more expensive
- `anthropic/claude-3-haiku-20240307` - Fast and high quality
- `anthropic/claude-3-opus-20240229` - Highest quality but more expensive
- `google/gemini-pro` - Google's model

For a full list of available models, see the [OpenRouter documentation](https://openrouter.ai/docs#models).

### How It Works

The generator uses context-aware prompts based on incident details to generate appropriate content:

1. For **short_description**, it uses the category, subcategory, and configuration item to generate a concise description of the issue.
2. For **description**, it uses the generated short description and configuration item to create a more detailed explanation of the problem, including possible symptoms and impact.

This approach ensures that the descriptions are realistic, consistent with each other, and appropriate for the type of incident being generated.

### Performance Optimizations

The Bulk Data Generator includes several optimizations to improve performance:

1. **Concurrent API Calls**: The generator processes multiple records in parallel (default: 10 concurrent requests) to significantly speed up data generation.

2. **Combined LLM Prompts**: Instead of making separate API calls for short_description and description, the generator combines them into a single prompt, reducing the number of API calls by half.

3. **Batch Processing**: Records are generated and written in batches to minimize memory usage, making it possible to generate very large datasets.

4. **Error Handling and Fallbacks**: Robust error handling ensures that the generation process continues even if some API calls fail, with fallback mechanisms to generate basic content when needed.

#### Performance Tuning

- **Concurrency Limit**: The default concurrency limit is 10 concurrent API calls. You can modify this in the code if your API provider allows higher concurrency.

- **Batch Size**: For very large datasets (100K+ records), consider adjusting the batch size:
  ```bash
  node src/node/BulkDataGenerator.js --output=bulk-data.csv --count=100000 --batch=2000
  ```

- **Model Selection**: To optimize for speed and cost, use faster models like `openai/gpt-3.5-turbo` or `anthropic/claude-3-haiku-20240307`.

- **Network Connection**: The generation process is network-bound due to API calls to OpenRouter, so a good internet connection is recommended.

## Examples

### Example 1: Generate 10,000 Incident Records with OpenRouter

```bash
# Generate 10,000 incident records using GPT-3.5 Turbo
node src/node/BulkDataGenerator.js --output=incidents.csv --count=10000 --model=openai/gpt-3.5-turbo --apiKey=your-api-key
```

### Example 2: Generate CSM Case Records with OpenRouter

```bash
# Generate 5,000 CSM case records using GPT-3.5 Turbo
node src/node/BulkDataGenerator.js --output=cases.xlsx --count=5000 --table=case --model=openai/gpt-3.5-turbo --apiKey=your-api-key
```

### Example 3: Generate Split Output for Closed and Open Cases

```bash
# Generate 5,000 CSM case records with 50% closed, split into separate files
node src/node/BulkDataGenerator.js --output=cases.csv --count=5000 --table=case --closed=50 --split=true --apiKey=your-api-key
```

This will generate two separate files:
- `cases-closed.csv`: Contains only closed/resolved cases
- `cases-open.csv`: Contains only open cases (new, in progress, on hold, etc.)

The split feature is useful when you need to import different sets of records separately or when you want to analyze closed and open cases independently.

### Example 4: Using the Sample Data Scripts

```bash
# Unix/Linux/Mac - Generate 5,000 incident records using Claude
./generate-sample-data.sh anthropic/claude-3-haiku-20240307 your-api-key incident 5000

# Windows - Generate 2,000 CSM case records using GPT-4
generate-sample-data.bat openai/gpt-4-turbo your-api-key case 2000
```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**: Ensure you have installed all required npm packages.
   ```bash
   npm install
   ```

2. **OpenRouter API Key**: Make sure you've provided a valid OpenRouter API key either as a command-line parameter or as an environment variable.

3. **Memory Issues**: If you encounter memory issues when generating large datasets, try reducing the batch size:
   ```bash
   node src/node/BulkDataGenerator.js --output=bulk-data.csv --count=10000 --batch=500
   ```

4. **OpenRouter Connection Issues**: If you encounter errors connecting to OpenRouter:
   - Ensure your API key is valid and correctly set
   - Check your internet connection
   - Verify the model name is correct
   - Check OpenRouter status at https://status.openrouter.ai/
   
   If OpenRouter fails, the generator will fall back to using a simple text generation method.

5. **Rate Limits**: If you're generating a very large number of records, you might hit OpenRouter's rate limits. In this case, try:
   - Reducing the batch size
   - Using a different model
   - Spreading the generation over multiple runs

6. **JSON Parsing Errors**: The generator has improved error handling for JSON parsing issues that may occur when processing LLM responses. These errors are now handled silently with multiple fallback mechanisms:
   - Automatic fixing of common JSON formatting issues
   - Extraction of content from malformed JSON responses
   - Multiple parsing strategies to recover usable data
   - Fallback to template-based content generation when all parsing attempts fail
   
   This ensures the generation process continues smoothly even when the LLM returns improperly formatted JSON.

## Important Notes

- Attachment functionality has been removed from all classes. If you need to add attachments to records, you will need to implement this functionality separately.

## Contributing

Feel free to fork this project and submit pull requests with any enhancements or bug fixes. Please ensure you follow ServiceNow best practices and coding standards.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
