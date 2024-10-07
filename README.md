# NOW-Dynamic-Data-Generator

This script includes a TaskManager class for ServiceNow that automates the creation of various types of cases (Incidents, CSM Cases, and HR Cases) with AI-generated content using the NOW Assist Generate Content skill.

## Prerequisites

1. ServiceNow instance with NOW Assist capabilities
2. OpenAI API key
3. Access to create and modify Script Includes in ServiceNow

## Setup Instructions

### 1. Configure OpenAI API Key in ServiceNow

To use the OpenAI API with ServiceNow, you need to set up your API key:

1. https://docs.servicenow.com/bundle/xanadu-intelligent-experiences/page/administer/generative-ai-controller/task/configure-api-credentials-for-openai.html 

### 2. Set Default Provider for Generate Content and Generic Prompt Skills

To ensure the TaskManager uses the correct AI provider:

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
6. Repeat all steps for the DataGenerator file.

## Usage

You can use the TaskManager in various ServiceNow server-side scripts. Here are some examples:

### Basic Usage to create an Incident (e.g., Background Script)

```javascript
var taskManager = new TaskManager();
taskManager.createCase('incident', '<Your short description>');
```

### Basic Usage to create a Change Request (e.g., Background Script)

```javascript
var taskManager = new TaskManager();
var changeRequestSysId = taskManager.createCase('change_request');
```

### Basic Usage to create a single healthcare claim with a random claim name (e.g., Background Script)
```javascript
var taskManager = new TaskManager();
var claimSysIds = taskManager.createCase('healthcare_claim');
```

### Basic Usage to create multiple healthcare claims with random claim names (e.g., Background Script)
```javascript
var taskManager = new TaskManager();
var claimSysIds = taskManager.createCase('healthcare_claim', null, 5); // Generates 5 claims
```
### Usage in a Business Rule

```javascript
(function executeRule(current, previous /*null when async*/) {
    var taskManager = new TaskManager();
    taskManager.createCase('csm_case', current.short_description);
})(current, previous);
```

### Usage in a Scheduled Job

```javascript
var taskManager = new TaskManager();
taskManager.createCase('hr_case', 'Annual performance review process initiation');
```

### Usage in a UI Action script

```javascript
function onExecute() {
    var taskManager = new TaskManager();
    taskManager.createCase('incident', g_form.getValue('short_description'));
    return false; // Prevent form submission if needed
}
```

### Usage in a Scripted REST API

```javascript
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
    var taskManager = new TaskManager();
    var caseType = request.queryParams.case_type;
    var shortDescription = request.queryParams.short_description;
    
    if (caseType && shortDescription) {
        taskManager.createCase(caseType, shortDescription);
        response.setStatus(201);
        response.setBody("Case created successfully");
    } else {
        response.setStatus(400);
        response.setBody("Missing required parameters");
    }
})(request, response);
```

## Customization

You can customize the TaskManager by modifying the following:

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
