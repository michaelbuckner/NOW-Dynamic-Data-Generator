var AbstractDataGenerator = Class.create();

AbstractDataGenerator.prototype = {
    initialize: function() {
        // Initialization code
    },

    /**
     * Retrieves a random choice value for a given table and field.
     * @param {String} tableName - The name of the table.
     * @param {String} fieldName - The name of the field.
     * @returns {String} - A random choice value.
     */
    _getRandomChoiceValue: function(tableName, fieldName) {
        var choices = [];
        var choiceGR = new GlideRecord('sys_choice');
        choiceGR.addQuery('name', tableName);
        choiceGR.addQuery('element', fieldName);
        choiceGR.query();
        while (choiceGR.next()) {
            choices.push(choiceGR.getValue('value'));
        }
        if (choices.length > 0) {
            return choices[Math.floor(Math.random() * choices.length)];
        }
        return '';
    },

    /**
     * Retrieves a random record's sys_id from the specified table.
     * @param {String} tableName - The name of the table to query.
     * @returns {String} - The sys_id of a random record, or an empty string if none found.
     */
    _getRandomRecordSysId: function(tableName) {
        var gr = new GlideRecord(tableName);
        gr.query();
        var records = [];
        while (gr.next()) {
            records.push(gr.getUniqueValue());
        }
        if (records.length > 0) {
            // Return a random record's sys_id from the list
            return records[Math.floor(Math.random() * records.length)];
        }
        // Return empty string if no records found
        return '';
    },

    /**
     * Generates unique content based on the provided prompt by calling an external API.
     * @param {String} prompt - The prompt to generate content from.
     * @returns {String} - The generated unique content.
     */
    _generateUniqueContent: function(prompt) {
        var request = {
            "executionRequests": [
                {
                    "payload": {
                        "prompt": prompt
                    },
                    "capabilityId": "0c90ca79533121106b38ddeeff7b12d7"
                }
            ]
        };

        // Execute the request using OneExtendUtil
        var response = sn_one_extend.OneExtendUtil.execute(request);

        if (response && response.capabilities && response.capabilities["0c90ca79533121106b38ddeeff7b12d7"]) {
            var uniqueContent = response.capabilities["0c90ca79533121106b38ddeeff7b12d7"].response;
            // Remove any leading or trailing quotation marks
            uniqueContent = uniqueContent.replace(/^["']|["']$/g, '');
            return uniqueContent;
        } else {
            gs.error('Error generating unique content.');
            return 'Unable to generate content at this time.';
        }
    },

    /**
     * Generates a random number string of specified length.
     * @param {Number} length - The length of the number string to generate.
     * @returns {String} - The generated random number string.
     */
    _generateRandomNumberString: function(length) {
        var result = '';
        for (var i = 0; i < length; i++) {
            result += Math.floor(Math.random() * 10).toString();
        }
        return result;
    },

    /**
     * Generates a random amount between min and max.
     * @param {Number} min - The minimum amount.
     * @param {Number} max - The maximum amount.
     * @returns {String} - The generated random amount as a string with two decimal places.
     */
    _generateRandomAmount: function(min, max) {
        var amount = Math.random() * (max - min) + min;
        return amount.toFixed(2);
    },

    type: 'AbstractDataGenerator'
};
