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

    /**
     * Creates a new record in the specified table with the given fields.
     * @param {String} tableName - The name of the table to insert the record into.
     * @param {Object} fields - An object containing field names and values to set on the record.
     * @returns {String|null} - The sys_id of the created record, or null if failed.
     */
    _createCaseRecord: function(tableName, fields) {
        var gr = new GlideRecord(tableName);
        gr.initialize();
        // Set field values from the fields object
        for (var field in fields) {
            gr.setValue(field, fields[field]);
        }
        var sysId = gr.insert();
        if (!sysId) {
            gs.error('Failed to insert record into ' + tableName + '. Error: ' + gr.getLastErrorMessage());
        }
        return sysId;
    },

    /**
     * Adds comments and work notes to the specified case.
     * @param {String} tableName - The name of the table containing the case.
     * @param {String} caseSysId - The sys_id of the case record.
     * @param {Array} entries - An array of entries to add to the case.
     */
    _addCommentsAndWorkNotes: function(tableName, caseSysId, entries) {
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];

            // Impersonate the user
            var impUser = new GlideImpersonate();
            impUser.impersonate(entry.user);

            var caseUpdate = new GlideRecord(tableName);
            if (caseUpdate.get(caseSysId)) {
                // Add the comment or work note to the case
                if (entry.type === 'comment') {
                    caseUpdate.comments = entry.text;
                } else {
                    caseUpdate.work_notes = entry.text;
                }
                caseUpdate.update();
            }

            // Revert impersonation
            impUser.unimpersonate();
        }
    },

    /**
     * Adds an attachment to the specified case.
     * @param {String} tableName - The name of the table containing the case.
     * @param {String} caseSysId - The sys_id of the case record.
     * @param {String} fileName - The name of the attachment file.
     * @param {String} fileContent - The content of the attachment file.
     */
    _addAttachment: function(tableName, caseSysId, fileName, fileContent) {
        var attachment = new GlideSysAttachment();
        attachment.write(tableName, caseSysId, fileName, 'text/plain', fileContent);
    },

    /**
     * Retrieves the name of a configuration item based on its sys_id.
     * @param {String} ciSysId - The sys_id of the configuration item.
     * @returns {String} - The name of the configuration item.
     */
    _getCiName: function(ciSysId) {
        var ciGr = new GlideRecord('cmdb_ci');
        if (ciGr.get(ciSysId)) {
            return ciGr.getDisplayValue('name');
        }
        return 'the configuration item';
    },

    /**
     * Retrieves a random user who is a member of the specified group.
     * @param {String} groupSysId - The sys_id of the group.
     * @returns {String} - The sys_id of a user in the group.
     */
    _getRandomUserInGroup: function(groupSysId) {
        var userSysIds = [];
        var groupMemberGR = new GlideRecord('sys_user_grmember');
        groupMemberGR.addQuery('group', groupSysId);
        groupMemberGR.query();
        while (groupMemberGR.next()) {
            userSysIds.push(groupMemberGR.getValue('user'));
        }
        if (userSysIds.length > 0) {
            return userSysIds[Math.floor(Math.random() * userSysIds.length)];
        }
        // If no users in group, pick any random user
        return this._getRandomRecordSysId('sys_user');
    },

    /**
     * Retrieves the name of the user based on their sys_id.
     * @param {String} userSysId - The sys_id of the user.
     * @returns {String} - The name of the user, or a default value if not found.
     */
    _getUserName: function(userSysId) {
        var userGr = new GlideRecord('sys_user');
        if (userGr.get(userSysId)) {
            return userGr.getDisplayValue('name');
        }
        return 'the user';
    },

    /**
     * Performance monitoring wrapper
     */
    _measurePerformance: function(functionName, callback) {
        var start = new Date().getTime();
        var result = callback();
        var end = new Date().getTime();
        
        this._log('info', 'Performance', {
            function: functionName,
            duration: (end - start) + 'ms'
        });
        
        return result;
    },

    /**
     * Generates a detailed description for the case based on the short description.
     * @param {String} shortDescription - The short description of the case.
     * @returns {String} - The generated detailed description.
     */
    _generateDetailedDescription: function(shortDescription) {
        var prompt = 'Provide a detailed description for the issue: "' + shortDescription + '". Include possible causes and the impact on the user.';
        return this._generateUniqueContent(prompt);
    },

    /**
     * Generates entries (comments and work notes) for the case based on the short description.
     * This is a generic implementation - child classes may override with specific implementations.
     * @param {String} shortDescription - The short description of the case.
     * @param {String} endUserSysId - The sys_id of the end user.
     * @param {String} agentUserSysId - The sys_id of the agent user.
     * @param {String} ciName - The name of the configuration item.
     * @returns {Array} - An array of entry objects containing type, text, and user.
     */
    _generateEntries: function(shortDescription, endUserSysId, agentUserSysId, ciName) {
        // Templates for generating prompts
        var promptTemplates = [
            'As an end-user, report the issue "{shortDescription}" including any error messages you encountered.',
            'As a support agent, write a work note detailing the initial troubleshooting steps taken for "{shortDescription}", including tools used and findings.',
            'As the end-user, provide an update on whether the issue "{shortDescription}" persists after initial troubleshooting, and mention any new symptoms.',
            'As a support agent, document additional diagnostic steps performed for "{shortDescription}", and note any anomalies observed.',
            'As the end-user, supply additional details, including exact error codes and the impact on your work due to "{shortDescription}".',
            'As a support agent, outline the resolution steps taken to address "{shortDescription}", and confirm if the issue is resolved.',
            'As the end-user, confirm the resolution of "{shortDescription}" and express gratitude or any remaining concerns.'
        ];

        var entries = [];
        // Get the name of the user
        var userName = this._getUserName(endUserSysId);

        for (var i = 0; i < promptTemplates.length; i++) {
            // Generate the prompt by replacing placeholders
            var prompt = promptTemplates[i]
                .replace('{shortDescription}', shortDescription)
                .replace('{ciName}', ciName || 'the affected system')
                .replace('{userName}', userName);

            // Generate unique content based on the prompt
            var content = this._generateUniqueContent(prompt);
            // Determine the entry type (comment or work note)
            var entryType = i % 2 === 0 ? 'comment' : 'work_note';
            // Determine the user (end user for comments, agent for work notes)
            var user = entryType === 'comment' ? endUserSysId : agentUserSysId;
            entries.push({ type: entryType, text: content, user: user });
        }

        return entries;
    },

    /**
     * Retrieves a random configuration item associated with a business service.
     * @param {String} businessServiceSysId - The sys_id of the business service.
     * @returns {String} - The sys_id of a related configuration item.
     */
    _getRandomRelatedCi: function(businessServiceSysId) {
        var ciSysIds = [];
        var relGR = new GlideRecord('cmdb_rel_ci');
        // Find relationships where the business service is either the parent or child
        relGR.addQuery('parent', businessServiceSysId).addOrCondition('child', businessServiceSysId);
        relGR.query();
        while (relGR.next()) {
            // If the business service is the parent, get the child CI
            if (relGR.parent.sys_id.toString() === businessServiceSysId) {
                ciSysIds.push(relGR.child.sys_id.toString());
            } else {
                // If the business service is the child, get the parent CI
                ciSysIds.push(relGR.parent.sys_id.toString());
            }
        }
        if (ciSysIds.length > 0) {
            return ciSysIds[Math.floor(Math.random() * ciSysIds.length)];
        } else {
            // If no related CIs, pick any random CI
            return this._getRandomRecordSysId('cmdb_ci');
        }
    },

    /**
     * Validates case creation parameters
     * @param {String} caseType - The type of case
     * @param {String} shortDescription - The description
     * @returns {Boolean} - Whether inputs are valid
     */
    _validateCaseInputs: function(caseType, shortDescription) {
        var validTypes = ['incident', 'csm_case', 'hr_case', 'healthcare_claim', 'change_request', 'knowledge_article'];
        
        if (!caseType || !validTypes.includes(caseType)) {
            gs.error('Invalid case type: ' + caseType);
            return false;
        }
        
        if (caseType !== 'healthcare_claim' && !shortDescription) {
            gs.error('Short description required for case type: ' + caseType);
            return false;
        }
        
        return true;
    },

    type: 'AbstractDataGenerator'
};
