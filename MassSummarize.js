var MassSummarize = Class.create();
MassSummarize.prototype = Object.extendsObject(AbstractDataGenerator, {
    initialize: function() {
        AbstractDataGenerator.prototype.initialize.call(this);
        this.MAX_TOKENS_PER_REQUEST = 4000; // Adjust based on API limits
        this.MAX_BATCH_SIZE = 3; // Maximum number of prompts to process in one batch
    },

    /**
     * Generates an HTML-formatted summary report for the past N days.
     * @param {Number} [numDays=30] - The number of past days to include in the summary.
     * @returns {String} - The generated HTML summary report.
     */
    generateSummaryReport: function(numDays) {
        numDays = numDays || 30;

        var startDate = new GlideDateTime();
        startDate.addDaysUTC(-numDays);

        var tablesToSummarize = [{
                tableName: 'incident',
                label: 'Incidents',
                conditions: 'opened_at>=javascript:gs.dateGenerate("' + startDate.getLocalDate() + '","00:00:00")',
                fields: ['number', 'short_description', 'priority', 'state']
            },
            {
                tableName: 'change_request',
                label: 'Change Requests',
                conditions: 'start_date>=javascript:gs.dateGenerate("' + startDate.getLocalDate() + '","00:00:00")',
                fields: ['number', 'short_description', 'risk', 'state']
            },
            {
                tableName: 'cmdb_ci_outage',
                label: 'Outage Records',
                conditions: 'begin>=javascript:gs.dateGenerate("' + startDate.getLocalDate() + '","00:00:00")',
                fields: ['number', 'ci.name', 'type', 'duration']
            }
        ];

        try {
            // Step 1: Gather all raw data first
            var tableData = this._gatherAllTableData(tablesToSummarize);

            // Step 2: Generate HTML content for each table (no API calls yet)
            var htmlSections = this._generateAllTableHTML(tableData);

            // Step 3: Prepare prompts for batch processing
            var prompts = this._preparePrompts(htmlSections, numDays);

            // Step 4: Process prompts in batches and combine results
            var finalReport = this._processBatchedPrompts(prompts);

            return finalReport;

        } catch (error) {
            gs.error('Error in generateSummaryReport: ' + error.message);
            return 'An error occurred while generating the summary report.';
        }
    },

    /**
     * Gathers data from all specified tables.
     * @param {Array} tablesToSummarize - Array of table configurations.
     * @returns {Object} - Object containing data for each table.
     */
    _gatherAllTableData: function(tablesToSummarize) {
        var tableData = {};

        for (var i = 0; i < tablesToSummarize.length; i++) {
            var tableConfig = tablesToSummarize[i];
            var records = this._getRecords(tableConfig);
            var significantRecords = this._getSignificantRecords(records, 5);

            tableData[tableConfig.label] = {
                config: tableConfig,
                records: significantRecords
            };
        }

        return tableData;
    },

    /**
     * Generates HTML content for all tables.
     * @param {Object} tableData - Object containing data for each table.
     * @returns {Array} - Array of objects containing HTML content for each table.
     */
    _generateAllTableHTML: function(tableData) {
        var htmlSections = [];

        for (var label in tableData) {
            var content = '<h2>' + label + '</h2>';
            var records = tableData[label].records;

            if (records.length === 0) {
                content += '<p>No ' + label.toLowerCase() + ' in the specified period.</p>';
                htmlSections.push({
                    label: label,
                    content: content
                });
                continue;
            }

            content += '<ul>';
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                var description = record['short_description'] || record['ci.name'] || 'No description';
                content += '<li><strong>' + record.number + '</strong>: ' + description + '</li>';
            }
            content += '</ul>';

            htmlSections.push({
                label: label,
                content: content
            });
        }

        return htmlSections;
    },

    /**
     * Prepares prompts for API processing.
     * @param {Array} htmlSections - Array of HTML sections.
     * @param {Number} numDays - Number of days for the report.
     * @returns {Array} - Array of prompt objects.
     */
    _preparePrompts: function(htmlSections, numDays) {
        var prompts = [];

        // Individual section prompts
        for (var i = 0; i < htmlSections.length; i++) {
            var section = htmlSections[i];
            prompts.push({
                type: 'section',
                prompt: 'Provide an HTML-formatted summary for the following ' + section.label.toLowerCase() +
                    ' for a regulatory review meeting. Focus on significant issues and compliance considerations.\n' +
                    section.content + '\nUse appropriate HTML tags for formatting.'
            });
        }

        // Final summary prompt
        var allContent = htmlSections.map(function(section) {
            return section.content;
        }).join('<br/><br/>');

        prompts.push({
            type: 'final',
            prompt: 'As an IT operations executive preparing for a regulatory review meeting, provide a detailed report for the past ' +
                numDays + ' days based on the following summaries formatted in HTML:\n' + allContent +
                '\nThe report should include key findings, compliance considerations, and any actions taken. ' +
                'Use HTML tags for headings, paragraphs, and lists to format the report appropriately for email.'
        });

        return prompts;
    },

    /**
     * Processes prompts in batches and combines results.
     * @param {Array} prompts - Array of prompt objects.
     * @returns {String} - Combined HTML report.
     */
    _processBatchedPrompts: function(prompts) {
        var results = [];
        var currentBatch = [];
        var currentTokenCount = 0;

        for (var i = 0; i < prompts.length; i++) {
            var prompt = prompts[i];
            var estimatedTokens = this._estimateTokenCount(prompt.prompt);

            // If adding this prompt would exceed token limit or batch size, process current batch
            if (currentTokenCount + estimatedTokens > this.MAX_TOKENS_PER_REQUEST ||
                currentBatch.length >= this.MAX_BATCH_SIZE) {
                this._processBatch(currentBatch, results);
                currentBatch = [];
                currentTokenCount = 0;
            }

            currentBatch.push(prompt);
            currentTokenCount += estimatedTokens;
        }

        // Process any remaining prompts
        if (currentBatch.length > 0) {
            this._processBatch(currentBatch, results);
        }

        // Combine all results into final report
        var sectionsHTML = results.filter(function(r) {
            return r.type === 'section';
        }).map(function(r) {
            return r.content;
        }).join('<br/><br/>');

        var finalSummary = results.find(function(r) {
            return r.type === 'final';
        });

        return sectionsHTML + '<br/><br/><h2>Executive Summary</h2>' + finalSummary.content;
    },

    /**
     * Processes prompts in batches and combines results.
     * @param {Array} prompts - Array of prompt objects.
     * @returns {String} - Combined HTML report.
     */
    _processBatchedPrompts: function(prompts) {
        var results = [];
        var currentBatch = [];
        var currentTokenCount = 0;

        for (var i = 0; i < prompts.length; i++) {
            var prompt = prompts[i];
            var estimatedTokens = this._estimateTokenCount(prompt.prompt);

            // If adding this prompt would exceed token limit or batch size, process current batch
            if (currentTokenCount + estimatedTokens > this.MAX_TOKENS_PER_REQUEST ||
                currentBatch.length >= this.MAX_BATCH_SIZE) {
                this._processBatch(currentBatch, results);
                currentBatch = [];
                currentTokenCount = 0;
            }

            currentBatch.push(prompt);
            currentTokenCount += estimatedTokens;
        }

        // Process any remaining prompts
        if (currentBatch.length > 0) {
            this._processBatch(currentBatch, results);
        }

        // Combine all results into final report
        var sectionsHTML = results.filter(function(r) {
            return r.type === 'section';
        }).map(function(r) {
            return r.content;
        }).join('<br/><br/>');

        var finalSummary = results.find(function(r) {
            return r.type === 'final';
        });

        // Add error handling for final summary
        if (!finalSummary || !finalSummary.content) {
            gs.error('Failed to generate executive summary');
            return sectionsHTML + '<br/><br/><h2>Executive Summary</h2><p>Error: Unable to generate executive summary.</p>';
        }

        return sectionsHTML + '<br/><br/><h2>Executive Summary</h2>' + finalSummary.content;
    },

    /**
     * Processes a batch of prompts using the API.
     * @param {Array} batch - Array of prompts to process.
     * @param {Array} results - Array to store results.
     */
    _processBatch: function(batch, results) {
        var requests = batch.map(function(prompt) {
            return {
                "payload": {
                    "prompt": prompt.prompt
                },
                "capabilityId": "0c90ca79533121106b38ddeeff7b12d7"
            };
        });

        var response = sn_one_extend.OneExtendUtil.execute({
            "executionRequests": requests
        });

        if (response && response.capabilities) {
            var capabilityResponses = response.capabilities["0c90ca79533121106b38ddeeff7b12d7"];
            
            // Log the response for debugging
            gs.debug('API Response: ' + JSON.stringify(capabilityResponses));
            
            // Handle single response vs array response
            if (!Array.isArray(capabilityResponses)) {
                // If it's a single response, wrap it in an array
                capabilityResponses = [capabilityResponses];
            }

            for (var i = 0; i < batch.length; i++) {
                var response = capabilityResponses[i];
                if (response && response.response) {
                    var content = response.response;
                    // Remove quotes if they exist
                    content = content.replace(/^["']|["']$/g, '');
                    results.push({
                        type: batch[i].type,
                        content: content
                    });
                } else {
                    gs.error('Invalid response format for prompt ' + i + ' in batch. Response: ' + JSON.stringify(response));
                    results.push({
                        type: batch[i].type,
                        content: '<p>Error: Unable to generate content for this section.</p>'
                    });
                }
            }
        } else {
            gs.error('Error processing batch of prompts. Full response: ' + JSON.stringify(response));
            throw new Error('Failed to process prompt batch');
        }
    },

    /**
     * Retrieves records based on the table configuration.
     * @param {Object} tableConfig - The configuration object for the table.
     * @returns {Array} - An array of record objects.
     */
    _getRecords: function(tableConfig) {
        var gr = new GlideRecord(tableConfig.tableName);
        gr.addEncodedQuery(tableConfig.conditions);
        gr.query();

        var records = [];
        while (gr.next()) {
            var record = {};
            for (var j = 0; j < tableConfig.fields.length; j++) {
                var fieldName = tableConfig.fields[j];
                // Handle dot-walked fields
                if (fieldName.indexOf('.') !== -1) {
                    record[fieldName] = gr.getDisplayValue(fieldName);
                } else {
                    record[fieldName] = gr.getDisplayValue(fieldName);
                }
            }
            records.push(record);
        }
        return records;
    },

    /**
     * Selects significant records based on a criterion.
     * @param {Array} records - The array of records.
     * @param {Number} maxRecords - The maximum number of significant records to return.
     * @returns {Array} - An array of significant records.
     */
    _getSignificantRecords: function(records, maxRecords) {
        // Sort records by priority or another significance criterion
        records.sort(function(a, b) {
            var priorityA = parseInt(a.priority || a.risk || '5');
            var priorityB = parseInt(b.priority || b.risk || '5');
            return priorityA - priorityB;
        });

        return records.slice(0, maxRecords);
    },

    /**
     * Estimates the token count of the given text.
     * @param {String} text - The text to estimate tokens for.
     * @returns {Number} - The estimated token count.
     */
    _estimateTokenCount: function(text) {
        // Simple estimation: assume average of 4 characters per token
        return Math.ceil(text.length / 4);
    },

    type: 'MassSummarize'
});
