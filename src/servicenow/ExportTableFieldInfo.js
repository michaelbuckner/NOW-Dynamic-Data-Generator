/**
 * ExportTableFieldInfo.js
 * 
 * ServiceNow background script to export field information for a specified table.
 * This script extracts field metadata and reference values for use with the Bulk Data Generator.
 * 
 * Usage:
 * 1. Navigate to System Definition > Scripts - Background in ServiceNow
 * 2. Copy and paste this script into the editor
 * 3. Modify the tableName variable to specify the table you want to export
 * 4. Run the script
 * 5. Copy the JSON output and save it to a file (e.g., field-info.json)
 */

// Replace 'incident' with the table name you want to export
var tableName = 'incident';

// Maximum number of reference values to collect per reference field
var maxReferenceValues = 20;

// Fields to exclude from export (system fields, etc.)
var excludeFields = [
  'sys_created_by', 'sys_created_on', 'sys_updated_by', 'sys_updated_on',
  'sys_mod_count', 'sys_tags', 'sys_domain', 'sys_domain_path'
];

/**
 * Main function to export field information
 */
function exportFieldInfo() {
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
      if (excludeFields.indexOf(fieldName) !== -1) {
        continue;
      }
      
      var fieldType = grDictionary.getValue('internal_type');
      var isReference = fieldType === 'reference' ? true : false;
      
      var fieldInfo = {
        name: fieldName,
        type: mapFieldType(fieldType),
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
          result.referenceFields[fieldName] = getReferencedRecords(refTable, maxReferenceValues);
        }
      }
    }
    
    // Output the result as JSON
    var jsonOutput = JSON.stringify(result, null, 2);
    gs.print(jsonOutput);
    
    gs.info('Field information export complete for table: ' + tableName);
    gs.info('Copy the JSON output above and save it to a file (e.g., field-info.json)');
    
  } catch (e) {
    gs.error('Error exporting field information: ' + e);
  }
}

/**
 * Map ServiceNow field types to simplified types for the generator
 */
function mapFieldType(internalType) {
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
}

/**
 * Get a sample of records from a referenced table
 */
function getReferencedRecords(tableName, maxRecords) {
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
}

// Run the export
exportFieldInfo();
