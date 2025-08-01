/**
 * generateCaseRecord.js
 * 
 * Functions for generating CSM case records for the BulkDataGenerator.
 */

const { faker } = require('@faker-js/faker');

/**
 * Generate a random opened_at date/time within the last year
 * @returns {string} - ISO formatted date/time string
 */
function generateRandomOpenedAt() {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
  // Generate random timestamp between one year ago and now
  const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
  const randomDate = new Date(randomTime);
  
  return randomDate.toISOString();
}

/**
 * Generate a case record
 * @param {Object} options - Options for generating the case record
 * @param {Object} referenceData - Reference data for ServiceNow tables
 * @param {Object} choiceValues - Choice values for ServiceNow fields
 * @param {Object} llm - LLM integration for generating descriptions
 * @param {number} closedPercentage - Percentage of cases that should be closed (0-100)
 * @returns {Promise<Object>} - Generated case record
 */
async function generateCaseRecord(options = {}) {
  const { referenceData, choiceValues, llm, index = 0, closedPercentage = 30 } = options;
  
  try {
    // Get random account
    const account = referenceData.account[Math.floor(Math.random() * referenceData.account.length)];
    
    // Get random contact for this account
    const accountContacts = referenceData.contact.filter(c => c.account === account.sys_id);
    const contact = accountContacts.length > 0 
      ? accountContacts[Math.floor(Math.random() * accountContacts.length)] 
      : referenceData.contact[Math.floor(Math.random() * referenceData.contact.length)];
    
    // Get random case type
    const caseType = choiceValues.case_type[Math.floor(Math.random() * choiceValues.case_type.length)];
    
    // Get random category from case categories
    const category = choiceValues.case_category[Math.floor(Math.random() * choiceValues.case_category.length)];
    
    // Get random subcategory based on category
    const subcategory = getRandomCaseSubcategory(category, choiceValues);
    
    // Get random contact type
    const contactType = choiceValues.contact_type[Math.floor(Math.random() * choiceValues.contact_type.length)];
    
    // Determine if this case should be closed based on the closedPercentage
    const shouldBeClosed = Math.random() * 100 < closedPercentage;
    
    // Get state based on whether the case should be closed
    let stateObj, state;
    if (shouldBeClosed) {
      // Get either "Resolved" or "Closed" state
      const closedStates = choiceValues.case_state.filter(s => 
        s.display === 'Resolved' || s.display === 'Closed');
      stateObj = closedStates[Math.floor(Math.random() * closedStates.length)];
      state = stateObj.display;
    } else {
      // Get a random non-closed state
      const openStates = choiceValues.case_state.filter(s => 
        s.display !== 'Resolved' && s.display !== 'Closed');
      stateObj = openStates[Math.floor(Math.random() * openStates.length)];
      state = stateObj.display;
    }
    
    // Get random priority (1-5)
    const priority = Math.floor(Math.random() * 5) + 1;
    
    // Get random assignment group
    const assignmentGroup = referenceData.sys_user_group[Math.floor(Math.random() * referenceData.sys_user_group.length)];
    
    // Get random assigned to user
    const assignedTo = referenceData.sys_user[Math.floor(Math.random() * referenceData.sys_user.length)];
    
    // Generate descriptions using LLM
    let shortDescription, description;
    try {
      const descriptions = await generateCaseDescriptions(category, subcategory, account.display_value, caseType, llm);
      shortDescription = descriptions.shortDescription;
      description = descriptions.description;
    } catch (error) {
      // Silently handle description generation errors
      // Fallback to simple descriptions
      const fallbackDescriptions = getFallbackCaseDescriptions(category, subcategory, account.display_value, caseType);
      shortDescription = fallbackDescriptions.shortDescription;
      description = fallbackDescriptions.description;
    }
    
    // Generate close notes if the case is closed or resolved
    let closeCode = '';
    let closeNotes = '';
    
    if (['Resolved', 'Closed'].includes(state)) {
      closeCode = choiceValues.case_close_code[Math.floor(Math.random() * choiceValues.case_close_code.length)];
      
      try {
        closeNotes = await generateCaseCloseNotes(shortDescription, description, closeCode, llm);
      } catch (error) {
        // Silently handle close notes generation errors
        // Fallback to simple close notes
        closeNotes = getFallbackCaseCloseNotes(shortDescription, closeCode);
      }
    }
    
    // Generate a case number
    const caseNumber = `CS${String(Date.now()).substring(7)}${String(index).padStart(4, '0')}`;
    
    // Generate additional fields for the case record
    const consumer = faker.person.fullName();
    const requestingServiceOrg = faker.company.name() + ' ' + faker.company.buzzNoun();
    const product = faker.commerce.productName();
    const asset = faker.string.alphanumeric(8).toUpperCase();
    const installBase = faker.string.alphanumeric(10).toUpperCase();
    const partnerContact = faker.person.fullName();
    const parent = Math.random() > 0.8 ? `CS${faker.string.numeric(7)}` : '';
    const needsAttention = Math.random() > 0.7 ? 'true' : 'false';
    const openedAt = generateRandomOpenedAt();
    const serviceOrganization = faker.company.name() + ' Services';
    const contract = `CNTR${faker.string.numeric(7)}`;
    const entitlement = faker.helpers.arrayElement([
      '24/7 Support',
      'Business Hours Support',
      'Premium Support',
      'Standard Warranty',
      'Extended Warranty',
      '10-year product warranty on inverters'
    ]);
    const partner = faker.company.name() + ' Partners';
    
    // Create the case record
    const caseRecord = {
      number: caseNumber,
      account: account.display_value,
      contact: contact.display_value,
      consumer,
      requesting_service_organization: requestingServiceOrg,
      product,
      asset,
      install_base: installBase,
      partner_contact: partnerContact,
      parent,
      short_description: shortDescription,
      needs_attention: needsAttention,
      opened_at: openedAt,
      contact_type: contactType,
      state,
      priority,
      assignment_group: assignmentGroup.display_value,
      assigned_to: assignedTo.display_value,
      service_organization: serviceOrganization,
      contract,
      entitlement,
      partner,
      close_code: closeCode,
      close_notes: closeNotes
    };
    
    // Add resolution information for closed cases
    if (shouldBeClosed) {
      // Get random users for resolved_by and closed_by
      const resolvedBy = referenceData.sys_user[Math.floor(Math.random() * referenceData.sys_user.length)].display_value;
      const closedBy = referenceData.sys_user[Math.floor(Math.random() * referenceData.sys_user.length)].display_value;
      
      // Generate dates for resolved_at and closed_at
      const now = new Date();
      const resolvedAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in the last week
      const closedAt = new Date(resolvedAt.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000); // 0-2 days after resolved
      
      // Format dates as ISO strings
      const resolvedAtStr = resolvedAt.toISOString().split('T')[0];
      const closedAtStr = closedAt.toISOString().split('T')[0];
      
      // Generate resolution code
      const resolutionCodes = [
        'Fixed by Vendor', 
        'Fixed by Customer', 
        'Fixed by Support', 
        'Workaround Provided', 
        'Configuration Change', 
        'Software Update', 
        'Hardware Replacement'
      ];
      const resolutionCode = resolutionCodes[Math.floor(Math.random() * resolutionCodes.length)];
      
      // Generate cause
      const causes = [
        'User Error', 
        'Software Bug', 
        'Hardware Failure', 
        'Network Issue', 
        'Configuration Error', 
        'Third-party Integration', 
        'Environmental Factor'
      ];
      const cause = causes[Math.floor(Math.random() * causes.length)];
      
      // Add resolution fields to the case record
      caseRecord.resolved_by = resolvedBy;
      caseRecord.resolved_at = resolvedAtStr;
      caseRecord.closed_by = closedBy;
      caseRecord.closed_at = closedAtStr;
      caseRecord.resolution_code = resolutionCode;
      caseRecord.cause = cause;
      caseRecord.notes_to_comments = Math.random() > 0.5 ? 'true' : 'false';
    }
    
    return caseRecord;
  } catch (error) {
    console.error(`Error generating case record: ${error.message}`);
    return {
      short_description: 'Error generating case record',
      description: `Error: ${error.message}`
    };
  }
}

/**
 * Get a random subcategory based on the category
 * @param {string} category - The category
 * @param {Object} choiceValues - Choice values for ServiceNow fields
 * @returns {string} - Random subcategory
 */
function getRandomCaseSubcategory(category, choiceValues) {
  const subcategories = choiceValues.case_subcategory[category] || [];
  if (subcategories.length === 0) {
    return '';
  }
  return subcategories[Math.floor(Math.random() * subcategories.length)];
}

/**
 * Generate case descriptions using LLM
 * @param {string} category - The category
 * @param {string} subcategory - The subcategory
 * @param {string} accountName - The account name
 * @param {string} caseType - The case type
 * @param {Object} llm - LLM integration for generating descriptions
 * @returns {Promise<Object>} - Generated descriptions
 */
async function generateCaseDescriptions(category, subcategory, accountName, caseType, llm) {
  if (!llm) {
    return getFallbackCaseDescriptions(category, subcategory, accountName, caseType);
  }
  
  try {
    const prompt = `Generate a realistic ServiceNow CSM case short description and detailed description for the following:
- Account: ${accountName}
- Case Type: ${caseType}
- Category: ${category}
- Subcategory: ${subcategory}

Format your response as JSON with 'shortDescription' and 'description' fields. 
The short description should be a brief summary (under 100 characters).
The description should be detailed (200-400 characters).`;

    const response = await llm.generateText(prompt);
    
      // Try to parse the response as JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
        
        // If we successfully parsed the JSON, return the values
        return {
          shortDescription: parsedResponse.shortDescription || `${category} - ${subcategory} issue`,
          description: parsedResponse.description || `Case regarding ${category} - ${subcategory} for ${accountName}`
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
            description: parsedResponse.description || `Case regarding ${category} - ${subcategory} for ${accountName}`
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
                  description: parsedResponse.description || `Case regarding ${category} - ${subcategory} for ${accountName}`
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
              description: descMatch ? descMatch[1].trim() : `Case regarding ${category} - ${subcategory} for ${accountName}`
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
                    description: desc || `Case regarding ${category} - ${subcategory} for ${accountName}`
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
          return getFallbackCaseDescriptions(category, subcategory, accountName, caseType);
        }
      }
  } catch (error) {
    // Silently handle LLM processing errors
    return getFallbackCaseDescriptions(category, subcategory, accountName, caseType);
  }
}

/**
 * Get fallback case descriptions
 * @param {string} category - The category
 * @param {string} subcategory - The subcategory
 * @param {string} accountName - The account name
 * @param {string} caseType - The case type
 * @returns {Object} - Fallback descriptions
 */
function getFallbackCaseDescriptions(category, subcategory, accountName, caseType) {
  const issues = {
    'Account': {
      'Access': 'unable to access account',
      'Creation': 'needs new account created',
      'Modification': 'requires account changes',
      'Deletion': 'requests account deletion',
      'Permissions': 'needs permission adjustment'
    },
    'Billing': {
      'Invoice': 'invoice discrepancy',
      'Payment': 'payment processing issue',
      'Refund': 'requesting refund',
      'Subscription': 'subscription management',
      'Pricing': 'pricing inquiry'
    },
    'Product': {
      'Defect': 'product defect reported',
      'Feature Request': 'requesting new feature',
      'Documentation': 'documentation unclear',
      'Compatibility': 'compatibility issue',
      'Installation': 'installation problem'
    }
  };
  
  const issue = issues[category]?.[subcategory] || `${category} - ${subcategory} issue`;
  
  return {
    shortDescription: `${accountName}: ${issue}`,
    description: `${caseType} case from ${accountName} regarding ${issue}. Customer has requested assistance with their ${category.toLowerCase()} - ${subcategory.toLowerCase()} concern and requires follow-up from the appropriate team.`
  };
}

/**
 * Generate case close notes using LLM
 * @param {string} shortDescription - The short description
 * @param {string} description - The description
 * @param {string} closeCode - The close code
 * @param {Object} llm - LLM integration for generating close notes
 * @returns {Promise<string>} - Generated close notes
 */
async function generateCaseCloseNotes(shortDescription, description, closeCode, llm) {
  if (!llm) {
    return getFallbackCaseCloseNotes(shortDescription, closeCode);
  }
  
  try {
    const prompt = `Generate realistic ServiceNow CSM case close notes for the following:
- Short Description: ${shortDescription}
- Description: ${description}
- Close Code: ${closeCode}

The close notes should explain the resolution process and outcome (100-200 characters).`;

    const response = await llm.generateText(prompt);
    return response.trim();
  } catch (error) {
    // Silently handle LLM errors for close notes
    return getFallbackCaseCloseNotes(shortDescription, closeCode);
  }
}

/**
 * Get fallback case close notes
 * @param {string} shortDescription - The short description
 * @param {string} closeCode - The close code
 * @returns {string} - Fallback close notes
 */
function getFallbackCaseCloseNotes(shortDescription, closeCode) {
  return `Case closed with code: ${closeCode}. The customer's request was addressed according to standard procedures.`;
}

module.exports = {
  generateCaseRecord,
  getRandomCaseSubcategory,
  generateCaseDescriptions,
  getFallbackCaseDescriptions,
  generateCaseCloseNotes,
  getFallbackCaseCloseNotes
};
