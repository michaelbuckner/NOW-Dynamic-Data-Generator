# NOW-Dynamic-Data-Generator

 ![image](https://github.com/user-attachments/assets/bc78048f-1040-49bd-b929-17feacf247bb) ![image](https://github.com/user-attachments/assets/a9888184-05cc-407b-bc07-64433eace7b0)




This script includes a DataGenerator class for ServiceNow that automates the creation of various types of records with AI-generated content using the NOW Assist Generate Content skill.

Supported Record:
- Incidents
- Changes
- CSM Cases
- HR Cases
- Healthcare Claims

There is also an additional script include for generating mass summarizies and emailing them.

## Prerequisites

1. ServiceNow instance with NOW Assist capabilities
2. OpenAI API key
3. Access to create and modify Script Includes in ServiceNow

## Setup Instructions

### 1. Configure OpenAI API Key in ServiceNow

To use the OpenAI API with ServiceNow, you need to set up your API key:

1. https://docs.servicenow.com/bundle/xanadu-intelligent-experiences/page/administer/generative-ai-controller/task/configure-api-credentials-for-openai.html 

### 2. Set Default Provider for Generate Content and Generic Prompt Skills

To ensure the DataGenerator uses the correct AI provider:

1. In the navigation filter, search for the OneExtend Capability table by entering sys_one_extend_capability.list.
2. Open the record for the capability that you would like to configure, in this case we want to set a default provider for Generate Content.
3. In the "OneExtend Definition Configs" related list, set OpenAI as the default provider.
4. Save your changes.
5. https://docs.servicenow.com/bundle/xanadu-intelligent-experiences/page/administer/generative-ai-controller/task/configure-a-provider-for-a-generative-ai-capability.html

## Installation

1. In your ServiceNow instance, navigate to **System Definition** > **Script Includes**.
2. Click "New" to create a new Script Include.
3. Set the following fields:
   - Name: AbstractDataGenerator
   - API Name: global.AbstractDataGenerator
   - Client callable: false
   - Acceible from: All application scopes
   - Active: true
4. Copy the entire AbstractDataGenerator code into the Script field.
5. Click "Submit" to save the Script Include.
6. Click "New" to create a new Script Include.
7. Set the following fields:
   - Name: DataGenerator
   - API Name: global.DataGenerator
   - Client callable: false
   - Acceible from: All application scopes
   - Active: true
8. Copy the entire DataGenerator code into the Script field.
9. Click "Submit" to save the Script Include.

## Usage

You can use the DataGenerator in various ServiceNow server-side scripts. Here are some examples:

### Basic Usage to create an Incident (e.g., Background Script)

```javascript
// Instantiate the DataGenerator class
var dataGen = new DataGenerator();
var incidentSysId = dataGen.createCase('incident', '<Your short description>');

// Log the sys_id of the created incident
gs.info('Created Incident with sys_id: ' + incidentSysId);
```

### Basic Usage to create a CSM Case (e.g., Background Script)

```javascript
// Instantiate the DataGenerator class
var dataGen = new DataGenerator();
// Create a CSM case with a short description
var csmCaseSysId = dataGen.createCase('csm_case', '<Your short description>');

// Log the sys_id of the created CSM case
gs.info('Created CSM Case with sys_id: ' + csmCaseSysId);

```

### Basic Usage to create an HR Case (e.g., Background Script)

```javascript
// Instantiate the DataGenerator class
var dataGen = new DataGenerator();
// Create an HR case with a short description
var hrCaseSysId = dataGen.createCase('hr_case', '<Your short description>');

// Log the sys_id of the created HR case
gs.info('Created HR Case with sys_id: ' + hrCaseSysId);

```

### Basic Usage to create a single healthcare claim with a random claim name (e.g., Background Script)
```javascript
// Instantiate the DataGenerator class
var dataGen = new DataGenerator();
var claimSysId = dataGen.createCase('healthcare_claim');

// Log the sys_ids of the created healthcare claims
gs.info('Created Healthcare Claim with sys_id: ' + claimSysId);
```

### Basic Usage to create multiple healthcare claims with random claim names (e.g., Background Script)
```javascript
// Instantiate the DataGenerator class
// Create 3 healthcare claims
var healthcareClaimsSysIds = dataGen.createCase('healthcare_claim', null, 3);

// Log the sys_ids of the created healthcare claims
gs.info('Created Healthcare Claims with sys_ids: ' + healthcareClaimsSysIds.join(', '));

```

### Basic Usage to create a Change Request (e.g., Background Script)

```javascript
// Instantiate the DataGenerator class
var dataGen = new DataGenerator();
// Create a change request
var changeRequestSysId = dataGen.createCase('change_request');

// Log the sys_id of the created change request
gs.info('Created Change Request with sys_id: ' + changeRequestSysId);

```

### Basic Usage to email a mass summary (e.g., Scheduled job)

```javascript
// Instantiate the MassSummarize class
var summarizer = new MassSummarize();

// Generate the HTML summary report for the past 30 days
var summaryReport = summarizer.generateSummaryReport(30);

var email = new GlideEmailOutbound();
email.addRecipient('<your@email>');
email.setSubject('Operations Summary');
email.setBody(summaryReport);
email.save();

```

## Customization

You can customize the DataGenerator by modifying the following:

- Update the `sys_id` constants at the top of the script to match your ServiceNow instance's record system IDs.
- Modify the `_createIncident`, `_createCSMCase`, and `_createHRCase` methods to include additional fields or logic specific to your needs.
- Adjust the prompt templates in the `_generateEntries` method to generate different types of content.

## Troubleshooting

If you encounter issues:

1. Check the ServiceNow system logs for any error messages.
2. Verify that your OpenAI API key is correctly configured and has sufficient credits.
3. Ensure the Generate Content skill is properly set up with OpenAI as the default provider.
4. Double-check that all required fields are being populated when creating cases.

## Contributing

Feel free to fork this project and submit pull requests with any enhancements or bug fixes. Please ensure you follow ServiceNow best practices and coding standards.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
