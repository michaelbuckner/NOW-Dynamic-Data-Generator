var MassSummarize = Class.create();
MassSummarize.prototype = Object.extendsObject(AbstractDataGenerator, {
    initialize: function() {
        AbstractDataGenerator.prototype.initialize.call(this);
    },

    generateSummaryReport: function(numDays) {
        numDays = numDays || 30;

        var startDate = new GlideDateTime();
        startDate.addDaysUTC(-numDays);

        var tablesToSummarize = [
            {
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
            },
            // Add more tables here as needed
        ];

        var summarySections = [];

        try {
            for (var i = 0; i < tablesToSummarize.length; i++) {
                var tableConfig = tablesToSummarize[i];
                var records = this._getRecords(tableConfig);

                // Limit records to significant ones
                var significantRecords = this._getSignificantRecords(records, 5);

                // Generate content for each table
                var tableContent = this._generateTableContent(tableConfig.label, significantRecords);
                summarySections.push(tableContent);
            }

            var fullReportContent = summarySections.join('\n\n');

            // Estimate token count
            var tokenCount = this._estimateTokenCount(fullReportContent);
            var maxTokens = 3000; // Adjust based on the model's max tokens for prompt

            if (tokenCount > maxTokens) {
                gs.error('Prompt exceeds the maximum token limit.');
                return 'The generated prompt is too long to process.';
            }

            var prompt = 'As an IT operations executive preparing for a regulatory review meeting, provide a detailed report for the past ' + numDays + ' days based on the following summaries:\n' + fullReportContent + '\nThe report should include key findings, compliance considerations, and any actions taken.';
            var summaryReport = this._generateUniqueContent(prompt);

            return summaryReport;

        } catch (error) {
            gs.error('Error in generateSummaryReport: ' + error.message);
            return 'An error occurred while generating the summary report.';
        }
    },

    _getRecords: function(tableConfig) {
        var gr = new GlideRecord(tableConfig.tableName);
        gr.addEncodedQuery(tableConfig.conditions);
        gr.query();

        var records = [];
        while (gr.next()) {
            var record = {};
            for (var j = 0; j < tableConfig.fields.length; j++) {
                var fieldName = tableConfig.fields[j];
                record[fieldName] = gr.getDisplayValue(fieldName);
            }
            records.push(record);
        }
        return records;
    },

    _getSignificantRecords: function(records, maxRecords) {
        // Sort records by priority or another significance criterion
        records.sort(function(a, b) {
            var priorityA = parseInt(a.priority || '5');
            var priorityB = parseInt(b.priority || '5');
            return priorityA - priorityB;
        });

        return records.slice(0, maxRecords);
    },

    _generateTableContent: function(tableLabel, records) {
        var content = '### ' + tableLabel + ':\n';

        if (records.length === 0) {
            content += 'No ' + tableLabel.toLowerCase() + ' in the specified period.\n';
            return content;
        }

        records.forEach(function(record) {
            var description = record['short_description'] || record['ci.name'] || 'No description';
            content += '- **' + record.number + '**: ' + description + '\n';
        });

        var prompt = 'Provide a summary for the ' + tableLabel.toLowerCase() + ' listed above, focusing on significant issues relevant to a regulatory review.';
        var tableSummary = this._generateUniqueContent(prompt);

        content += '\n' + tableSummary;

        return content;
    },

    _estimateTokenCount: function(text) {
        // Simple estimation: assume average of 4 characters per token
        return Math.ceil(text.length / 4);
    },

    type: 'MassSummarize'
});
