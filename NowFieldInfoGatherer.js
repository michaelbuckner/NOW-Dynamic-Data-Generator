/**
 * NowFieldInfoGatherer
 * 
 * ServiceNow Script Include to gather field information for a specified table.
 * This script extracts field metadata and reference values for use with the Bulk Data Generator.
 * 
 * Installation:
 * 1. Navigate to System Definition > Script Includes in ServiceNow
 * 2. Click "New" to create a new Script Include
 * 3. Set the following fields:
 *    - Name: NowFieldInfoGatherer
 *    - API Name: global.NowFieldInfoGatherer
 *    - Client callable: false
 *    - Accessible from: All application scopes
 *    - Active: true
 * 4. Copy and paste this script into the Script field
 * 5. Click "Submit" to save the Script Include
 */
var NowFieldInfoGatherer = Class.create();
NowFieldInfoGatherer.prototype = {
    initialize: function() {
        // Fields to exclude from export (system fields, etc.)
        this.excludeFields = [
            'sys_created_by', 'sys_created_on', 'sys_updated_by', 'sys_updated_on',
            'sys_mod_count', 'sys_tags', 'sys_domain', 'sys_domain_path'
        ];
        
        // Maximum number of reference values to collect per reference field
        this.maxReferenceValues = 20;
    },
    
    /**
     * Get field information for a specified table
     * @param {string} tableName - The name of the table to gather field information for
     * @param {object} options - Options for gathering field information
     * @returns {object} - Field information object
     */
    getFieldInfo: function(tableName, options) {
        if (!tableName) {
            gs.error('Table name is required');
            return null;
        }
        
        options = options || {};
        var maxReferenceValues = options.maxReferenceValues || this.maxReferenceValues;
        var excludeFields = options.excludeFields || this.excludeFields;
        
        try {
            var result = {
                tableName: tableName,
                fields: [],
                referenceFields: {}
            };
            
            // Get table fields
            var grDictionary = new GlideRecord('sys_dictionary');
            grDictionary.addQuery('name', tableName);
            grDictionary.addQuery('active', true);
            grDictionary.addNotNullQuery('element');
            grDictionary.query();
            
            while (grDictionary.next()) {
                var fieldName = grDictionary.getValue('element');
                
                // Skip excluded fields
                if (this._isExcluded(fieldName, excludeFields)) {
                    continue;
                }
                
                var fieldType = grDictionary.getValue('internal_type');
                var isReference = fieldType === 'reference' ? true : false;
                
                var fieldInfo = {
                    name: fieldName,
                    type: this._mapFieldType(fieldType),
                    isReference: isReference
                };
                
                // Add max length for string fields
                if (fieldType === 'string') {
                    fieldInfo.maxLength = grDictionary.getValue('max_length');
                }
                
                result.fields.push(fieldInfo);
                
                // Collect reference values if it's a reference field
                if (isReference) {
                    var refTable = grDictionary.getValue('reference');
                    if (refTable) {
                        result.referenceFields[fieldName] = this._getReferencedRecords(refTable, maxReferenceValues);
                    }
                }
            }
            
            return result;
            
        } catch (e) {
            gs.error('Error gathering field information: ' + e);
            return null;
        }
    },
    
    /**
     * Export field information as JSON
     * @param {string} tableName - The name of the table to gather field information for
     * @param {object} options - Options for gathering field information
     * @returns {string} - JSON string of field information
     */
    exportFieldInfoAsJSON: function(tableName, options) {
        var fieldInfo = this.getFieldInfo(tableName, options);
        if (fieldInfo) {
            return JSON.stringify(fieldInfo, null, 2);
        }
        return null;
    },
    
    /**
     * Check if a field should be excluded
     * @param {string} fieldName - The name of the field to check
     * @param {array} excludeFields - Array of field names to exclude
     * @returns {boolean} - True if the field should be excluded, false otherwise
     */
    _isExcluded: function(fieldName, excludeFields) {
        return excludeFields.indexOf(fieldName) !== -1;
    },
    
    /**
     * Map ServiceNow field types to simplified types for the generator
     * @param {string} internalType - The internal type of the field
     * @returns {string} - The mapped field type
     */
    _mapFieldType: function(internalType) {
        var typeMap = {
            'string': 'string',
            'integer': 'integer',
            'boolean': 'boolean',
            'reference': 'reference',
            'glide_date': 'date',
            'glide_date_time': 'datetime',
            'decimal': 'decimal',
            'float': 'float',
            'choice': 'choice'
        };
        
        return typeMap[internalType] || 'string';
    },
    
    /**
     * Get a sample of records from a referenced table
     * @param {string} tableName - The name of the referenced table
     * @param {number} maxRecords - Maximum number of records to retrieve
     * @returns {array} - Array of reference records
     */
    _getReferencedRecords: function(tableName, maxRecords) {
        var records = [];
        
        try {
            var gr = new GlideRecord(tableName);
            gr.setLimit(maxRecords);
            gr.query();
            
            while (gr.next() && records.length < maxRecords) {
                records.push({
                    sys_id: gr.getUniqueValue(),
                    display_value: gr.getDisplayValue()
                });
            }
        } catch (e) {
            gs.warn('Error getting reference records for table ' + tableName + ': ' + e);
        }
        
        return records;
    },
    
    type: 'NowFieldInfoGatherer'
};
