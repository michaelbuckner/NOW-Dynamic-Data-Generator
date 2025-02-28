var DataGenerator = Class.create();

DataGenerator.prototype = Object.extendsObject(AbstractDataGenerator, {
    // Constants for sys_id values with descriptive names
    INCIDENT_END_USER_SYSID: '62826bf03710200044e0bfc8bcbe5df1', // Sys_id of the incident caller (end user)
    CONFIGURATION_ITEM_SYSID: '3a6cdbdbc0a8ce01008ef85f28b07a41', // Sys_id of the configuration item (CI)
    BUSINESS_SERVICE_SYSID: '26da329f0a0a0bb400f69d8159bc753d', // Sys_id of the business service
    INCIDENT_ASSIGNMENT_GROUP_SYSID: '287ebd7da9fe198100f92cc8d1d2154e', // Sys_id of the incident assignment group
    INCIDENT_LOCATION_SYSID: '29a6c6bc0a0a0b5000d1f9d758c21531', // Sys_id of the incident location
    CSM_CONTACT_SYSID: '60beb5e7d7600200e5982cf65e6103ad', // Sys_id of the CSM contact
    CSM_ACCOUNT_SYSID: '1b7346d4c6112276007f9d0efdb69cd2', // Sys_id of the CSM account
    CSM_PRODUCT_SYSID: '9f8d1294c6112276007f9d0efdb69cdb', // Sys_id of the CSM product
    CSM_AGENT_SYSID: '46d44a5dc6112276007f9d0efdb69cd4', // Sys_id of the CSM agent
    HR_CASE_OPENED_FOR_SYSID: '3fc87b58931eca10800fb45e1dba105c', // Sys_id of the user the HR case is opened for
    HR_SUBJECT_PERSON_SYSID: '3fc87b58931eca10800fb45e1dba105c', // Sys_id of the HR subject person
    HR_ASSIGNMENT_GROUP_SYSID: 'd625dccec0a8016700a222a0f7900d6c', // Sys_id of the HR assignment group
    HR_SERVICE_SYSID: 'e228cde49f331200d9011977677fcf05', // Sys_id of the HR service
    AGENT_USER_SYSID: 'a8f98bb0eb32010045e1a5115206fe3a', // Sys_id of the agent user
    CHANGE_MODEL_SYSID: '007c4001c343101035ae3f52c1d3aeb2', // Sys_id of the change model
    
    // Knowledge article constants
    KNOWLEDGE_BASE_SYSID: 'a7e8a78bff0221009b20ffffffffff17', // Sys_id of the knowledge base
    KB_CATEGORY_SYSID: '387b2552ff0131009b20ffffffffffdf', // Sys_id of the knowledge category
    KB_KNOWLEDGE_WORKFLOW_STATE: 'published', // Workflow state for knowledge articles

    initialize: function() {
        AbstractDataGenerator.prototype.initialize.call(this);
        // Additional initialization if needed
    },
    
    /**
     * Creates an incident and a related knowledge base article based on the provided short description.
     * @param {String} shortDescription - The short description for the incident and basis for the KB article.
     * @returns {Object} - An object containing the sys_ids of the created incident and KB article.
     */
    createIncidentWithKB: function(shortDescription) {
        if (!shortDescription) {
            gs.error('Short description must be provided.');
            return null;
        }
        
        try {
            // Step 1: Generate incident content
            var detailedDescription = this._generateDetailedDescription(shortDescription);
            var ciName = this._getConfigurationItemName();
            var entries = this._generateEntries(shortDescription, this.INCIDENT_END_USER_SYSID, this.AGENT_USER_SYSID, ciName);
            var errorLogContent = this._generateUniqueContent('Generate a log snippet for the issue: "' + shortDescription + '".');
            
            // Step 2: Generate KB article content
            // Prepare incident details for KB article
            var incidentDetails = {
                shortDescription: shortDescription,
                description: detailedDescription,
                category: 'Network', // Using default values from _createIncident
                subcategory: 'Email',
                ciName: ciName
            };
            
            // Generate KB article title
            var kbTitlePrompt = 'Create a knowledge article title based on this incident: "' + 
                incidentDetails.shortDescription + '". Make it concise and solution-oriented.';
            var kbTitle = this._generateUniqueContent(kbTitlePrompt);
            
            // Generate KB article content
            var kbPrompt = 'Create a comprehensive enterprise knowledge base article to help resolve the following issue: "' + 
                incidentDetails.shortDescription + '". The issue involves ' + incidentDetails.ciName + 
                ' and is categorized as ' + incidentDetails.category + 
                (incidentDetails.subcategory ? ' / ' + incidentDetails.subcategory : '') + 
                '. Include these sections: 1) Problem Description, 2) Symptoms, 3) Cause, 4) Resolution Steps, ' + 
                '5) Prevention, and 6) Related Information. Format with HTML headings and lists. ' + 
                'Use this additional context about the issue: ' + incidentDetails.description;
                
            var kbContent = this._generateUniqueContent(kbPrompt);
            
            // Step 3: Create the KB article first
            var kbSysId = this._createEnterpriseKBArticle(kbTitle, kbContent, null); // Pass null for relatedIncidentSysId for now
            
            if (!kbSysId) {
                gs.error('Failed to create KB article.');
                // Continue with incident creation even if KB article fails
            }
            
            // Step 4: Create the incident last
            var incidentSysId = this._createIncident(shortDescription);
            
            if (!incidentSysId) {
                gs.error('Failed to create incident.');
                return {
                    incident: null,
                    kb_article: kbSysId
                };
            }
            
            // Step 5: Add comments, work notes, and attachment to the incident
            this._addCommentsAndWorkNotes('incident', incidentSysId, entries);
            
            // Add attachment directly instead of using _addAttachment
            var attachment = new GlideSysAttachment();
            attachment.write('incident', incidentSysId, 'error_log.txt', 'text/plain', errorLogContent);
            
            // Step 6: If KB was created successfully, create relationship between KB and incident
            if (kbSysId) {
                this._createKBIncidentRelationship(kbSysId, incidentSysId);
            }
            
            // Return both sys_ids
            return {
                incident: incidentSysId,
                kb_article: kbSysId
            };
            
        } catch (error) {
            gs.error('Error in createIncidentWithKB: ' + error.message);
            return null;
        }
    },

    /**
     * Creates a case of the specified type with the given short description.
     * @param {String} caseType - The type of case to create ('incident', 'csm_case', 'hr_case', 'healthcare_claim', 'change_request', or 'knowledge_article').
     * @param {String} [shortDescription] - The short description of the case (not required for healthcare_claim).
     * @param {Number} [numCases=1] - The number of cases to create (only applicable for healthcare_claim).
     * @returns {Array|String|null} - The sys_id(s) of the created case(s), or null if failed.
     */
    createCase: function(caseType, shortDescription, numCases) {
        if (!caseType) {
            gs.error('Case type must be provided.');
            return null;
        }

        numCases = numCases || 1; // Default to 1 if not provided

        var caseSysIds = [];
        var tableName;

        try {
            // Validate inputs using the parent class method
            if (!this._validateCaseInputs(caseType, shortDescription)) {
                return null;
            }

            // Determine the table name based on case type
            switch (caseType) {
                case 'incident':
                    tableName = 'incident';
                    break;
                case 'csm_case':
                    tableName = 'sn_customerservice_case';
                    break;
                case 'hr_case':
                    tableName = 'sn_hr_core_case';
                    break;
                case 'healthcare_claim':
                    tableName = 'sn_hcls_claim_header';
                    break;
                case 'change_request':
                    tableName = 'change_request';
                    break;
                case 'knowledge_article':
                    tableName = 'kb_knowledge';
                    break;
                default:
                    gs.error('Invalid case type specified: ' + caseType);
                    return null;
            }

            if (caseType === 'healthcare_claim') {
                for (var i = 0; i < numCases; i++) {
                    var caseSysId = this._createHealthcareClaim();
                    if (caseSysId) {
                        caseSysIds.push(caseSysId);
                    } else {
                        gs.error('Failed to create healthcare claim number ' + (i + 1));
                    }
                }
            } else if (caseType === 'change_request') {
                var caseSysId = this._createChangeRequest();
                if (caseSysId) {
                    caseSysIds.push(caseSysId);
                } else {
                    gs.error('Failed to create change request.');
                    return null;
                }
            } else if (caseType === 'knowledge_article') {
                var caseSysId = this._createKnowledgeArticle(shortDescription);
                if (caseSysId) {
                    caseSysIds.push(caseSysId);
                } else {
                    gs.error('Failed to create knowledge article.');
                    return null;
                }
            } else {
                if (numCases > 1) {
                    gs.error('Creating multiple cases is only supported for healthcare claims.');
                    return null;
                }
                var caseSysId;
                if (caseType === 'incident') {
                    caseSysId = this._createIncident(shortDescription);
                } else if (caseType === 'csm_case') {
                    caseSysId = this._createCSMCase(shortDescription);
                } else if (caseType === 'hr_case') {
                    caseSysId = this._createHRCase(shortDescription);
                }

                if (caseSysId) {
                    // Generate entries (comments and work notes) for the case
                    var ciName = this._getConfigurationItemName();
                    var entries;
                    
                    // Use appropriate user IDs based on case type
                    if (caseType === 'incident') {
                        entries = this._generateEntries(shortDescription, this.INCIDENT_END_USER_SYSID, this.AGENT_USER_SYSID, ciName);
                    } else if (caseType === 'csm_case') {
                        entries = this._generateEntries(shortDescription, this.CSM_CONTACT_SYSID, this.CSM_AGENT_SYSID, ciName);
                    } else if (caseType === 'hr_case') {
                        entries = this._generateEntries(shortDescription, this.HR_CASE_OPENED_FOR_SYSID, this.AGENT_USER_SYSID, ciName);
                    }
                    
                    // Add comments and work notes to the case using the parent class method
                    this._addCommentsAndWorkNotes(tableName, caseSysId, entries);
                    
                    // Add an attachment to the case directly
                    var attachment = new GlideSysAttachment();
                    attachment.write(
                        tableName,
                        caseSysId,
                        'error_log.txt',
                        'text/plain',
                        this._generateUniqueContent('Generate a log snippet for the issue: "' + shortDescription + '".')
                    );
                    caseSysIds.push(caseSysId);
                } else {
                    gs.error('Failed to create case of type: ' + caseType);
                    return null;
                }
            }

            // Return the sys_id(s) of the created case(s)
            return caseSysIds.length === 1 ? caseSysIds[0] : caseSysIds;

        } catch (error) {
            gs.error('Error in createCase: ' + error.message);
            return null;
        }
    },

    /**
     * Creates an incident with the specified short description.
     * @param {String} shortDescription - The short description of the incident.
     * @returns {String|null} - The sys_id of the created incident, or null if failed.
     */
    _createIncident: function(shortDescription) {
        // Generate a detailed description for the incident using the parent class method
        var detailedDescription = this._generateDetailedDescription(shortDescription);

        var fields = {
            short_description: shortDescription,
            description: detailedDescription,
            caller_id: this.INCIDENT_END_USER_SYSID,
            cmdb_ci: this.CONFIGURATION_ITEM_SYSID,
            business_service: this.BUSINESS_SERVICE_SYSID,
            impact: 1,
            urgency: 1,
            priority: 1,
            category: 'Network',
            subcategory: 'Email',
            assignment_group: this.INCIDENT_ASSIGNMENT_GROUP_SYSID,
            state: 2, // In Progress
            opened_by: this.INCIDENT_END_USER_SYSID,
            location: this.INCIDENT_LOCATION_SYSID
        };
        // Create the incident record using the parent class method
        return this._createCaseRecord('incident', fields);
    },

    /**
     * Creates a CSM case with the specified short description.
     * @param {String} shortDescription - The short description of the case.
     * @returns {String|null} - The sys_id of the created CSM case, or null if failed.
     */
    _createCSMCase: function(shortDescription) {
        // Generate a detailed description for the CSM case using the parent class method
        var detailedDescription = this._generateDetailedDescription(shortDescription);

        var fields = {
            short_description: shortDescription,
            description: detailedDescription,
            contact: this.CSM_CONTACT_SYSID,
            account: this.CSM_ACCOUNT_SYSID,
            product: this.CSM_PRODUCT_SYSID,
            priority: 2,
            severity: 2,
            assigned_to: this.CSM_AGENT_SYSID,
            opened_by: this.CSM_CONTACT_SYSID
        };
        // Create the CSM case record using the parent class method
        return this._createCaseRecord('sn_customerservice_case', fields);
    },

    /**
     * Creates an HR case with the specified short description.
     * @param {String} shortDescription - The short description of the HR case.
     * @returns {String|null} - The sys_id of the created HR case, or null if failed.
     */
    _createHRCase: function(shortDescription) {
        // Generate a detailed description for the HR case using the parent class method
        var detailedDescription = this._generateDetailedDescription(shortDescription);

        // Calculate due date (5 days from now)
        var dueDate = new GlideDateTime();
        dueDate.addDaysLocalTime(5);

        var fields = {
            short_description: shortDescription,
            description: detailedDescription,
            opened_for: this.HR_CASE_OPENED_FOR_SYSID,
            hr_service: this.HR_SERVICE_SYSID,
            subject_person: this.HR_SUBJECT_PERSON_SYSID,
            assignment_group: this.HR_ASSIGNMENT_GROUP_SYSID,
            hr_service_type: 'employee_relations',
            due_date: dueDate,
            opened_by: this.HR_CASE_OPENED_FOR_SYSID
        };
        // Create the HR case record using the parent class method
        return this._createCaseRecord('sn_hr_core_case', fields);
    },

    /**
     * Creates a healthcare claim with generated data.
     * @returns {String|null} - The sys_id of the created healthcare claim, or null if failed.
     */
    _createHealthcareClaim: function() {
        // Array of medical procedures to diversify the claim names
        var procedures = [
            'Orthopedic Surgery', 'Dental Procedure', 'Cardiac Treatment', 'Physical Therapy',
            'Eye Examination', 'Maternity Care', 'Dermatology Consultation', 'Radiology Imaging',
            'Laboratory Tests', 'Emergency Room Visit', 'Vaccination Service', 'Mental Health Counseling',
            'Allergy Testing', 'Gastroenterology Procedure', 'Neurological Assessment'
        ];
        // Select a random procedure
        var procedure = procedures[Math.floor(Math.random() * procedures.length)];

        // Generate the name of the claim using GenAI
        var namePrompt = 'Generate a realistic healthcare claim title for a ' + procedure + ' service. Do not include quotation marks.';
        var name = this._generateUniqueContent(namePrompt);

        // Remove any leading or trailing quotation marks from the name
        name = name.replace(/^["']|["']$/g, '');

        // For type field, choose one of the specified values
        var types = ['institutional', 'oral', 'pharmacy', 'professional', 'vision'];
        var type = types[Math.floor(Math.random() * types.length)];

        // For patient field, pick a random value from the sn_hcls_patient table
        var patientSysId = this._getRandomRecordSysId('sn_hcls_patient');

        // Ensure patientSysId is valid
        if (!patientSysId) {
            gs.error('No patients found in sn_hcls_patient table.');
            return null;
        }

        // Generate random identification numbers
        var medicalRecordNo = this._generateRandomMedicalRecordNumber();
        var patientAccountNo = this._generateRandomPatientAccountNumber();

        // For member_plan, pick a random value from the sn_hcls_member_plan table
        var memberPlanSysId = this._getRandomRecordSysId('sn_hcls_member_plan');

        // For payer, pick a random value from the sn_hcls_organization table
        var payerSysId = this._getRandomRecordSysId('sn_hcls_organization');

        // For service_provider, pick a random value from sn_hcls_practitioner table
        var serviceProviderSysId = this._getRandomRecordSysId('sn_hcls_practitioner');

        // Generate random service provider ID
        var serviceProviderId = this._generateRandomServiceProviderId();

        // For preauth_header, pick a random value from sn_hcls_pre_auth_header table
        var preAuthHeaderSysId = this._getRandomRecordSysId('sn_hcls_pre_auth_header');

        // For status, choose one of the specified values
        var statuses = ['draft', 'entered-in-error', 'active', 'paid', 'in-hold', 'denied', 'cancelled', 'suspended'];
        var status = statuses[Math.floor(Math.random() * statuses.length)];

        // Generate random billed DRG code
        var billedDrgCode = this._generateRandomBilledDrgCode();

        // Generate remarks using GenAI and patient's name
        var patientName = this._getPatientName(patientSysId);
        var remarksPrompt = 'As a medical provider, write remarks for a healthcare claim for patient ' + patientName + ' who received ' + procedure + '.';
        var remarks = this._generateUniqueContent(remarksPrompt);

        // Generate required date fields using GlideDateTime
        var submittedDate = new GlideDateTime(); // Today

        var acceptedDate = new GlideDateTime();
        acceptedDate.addDaysLocalTime(2); // 2 days from now

        var adjudicatedDate = new GlideDateTime();
        adjudicatedDate.addDaysLocalTime(5); // 5 days from now

        var paymentDate = new GlideDateTime();
        paymentDate.addDaysLocalTime(10); // 10 days from now

        // Generate random amounts
        var claimAmount = this._generateRandomAmount(500, 5000); // Amount between $500 and $5000
        var adjudicatedAmount = this._generateRandomAmount(0, claimAmount); // Between $0 and claimAmount
        var feeReduction = this._generateRandomAmount(0, claimAmount - adjudicatedAmount);
        var patientPayAmount = (claimAmount - adjudicatedAmount - feeReduction).toFixed(2);

        // Build the fields object
        var fields = {
            name: name,
            type: type,
            patient: patientSysId,
            medical_record_no: medicalRecordNo,
            patient_account_no: patientAccountNo,
            member_plan: memberPlanSysId,
            payer: payerSysId,
            service_provider: serviceProviderSysId,
            service_provider_id: serviceProviderId,
            preauth_header: preAuthHeaderSysId,
            status: status,
            billed_drg_code: billedDrgCode,
            remarks: remarks,
            // Include the specified date fields
            submitted_date: submittedDate,
            accepted_date: acceptedDate,
            adjudicated_date: adjudicatedDate,
            payment_date: paymentDate,
            // Random amounts
            claim_amount: claimAmount,
            adjudicated_amount: adjudicatedAmount,
            fee_reduction: feeReduction,
            patient_pay_amount: patientPayAmount
        };

        // Create the healthcare claim record using the parent class method
        return this._createCaseRecord('sn_hcls_claim_header', fields);
    },

    /**
     * Creates a change request with generated data.
     * @returns {String|null} - The sys_id of the created change request, or null if failed.
     */
    _createChangeRequest: function() {
        // Get a random user from sys_user
        var requestedBySysId = this._getRandomRecordSysId('sys_user');

        // Get all choices for 'category' field and select a random one
        var category = this._getRandomChoiceValue('change_request', 'category');

        // Get a random business service from cmdb_ci_service
        var businessServiceSysId = this._getRandomRecordSysId('cmdb_ci_service');

        // Get a random configuration item associated with the above business service
        var cmdbCiSysId = this._getRandomRelatedCi(businessServiceSysId);

        // Get random choices for priority, risk, impact
        var priority = this._getRandomChoiceValue('change_request', 'priority');
        var risk = this._getRandomChoiceValue('change_request', 'risk');
        var impact = this._getRandomChoiceValue('change_request', 'impact');

        // Generate unique content for short_description and description
        var ciName = this._getCiName(cmdbCiSysId);
        var shortDescPrompt = 'Generate a short description for a change request affecting the service "' + ciName + '". Please keep it to a single sentence.';
        var generatedShortDescription = this._generateUniqueContent(shortDescPrompt);

        var descPrompt = 'Provide a detailed description for a change request affecting the service "' + ciName + '". Include reasons and expected outcomes.';
        var description = this._generateUniqueContent(descPrompt);

        // Get a random assignment group from sys_user_group
        var assignmentGroupSysId = this._getRandomRecordSysId('sys_user_group');

        // Get a random user from the above assignment group
        var assignedToSysId = this._getRandomUserInGroup(assignmentGroupSysId);

        // Generate unique content for justification, implementation_plan, backout_plan, test_plan
        var justificationPrompt = 'Provide a justification for the change request affecting "' + ciName + '".';
        var justification = this._generateUniqueContent(justificationPrompt);

        var implementationPlanPrompt = 'Outline an implementation plan for the change request affecting "' + ciName + '".';
        var implementationPlan = this._generateUniqueContent(implementationPlanPrompt);

        var riskImpactPrompt = 'Analyze the risks and impacts associated with the change request affecting "' + ciName + '".';
        var riskImpactAnalysis = this._generateUniqueContent(riskImpactPrompt);

        var backoutPlanPrompt = 'Describe a backout plan for the change request affecting "' + ciName + '".';
        var backoutPlan = this._generateUniqueContent(backoutPlanPrompt);

        var testPlanPrompt = 'Develop a test plan for the change request affecting "' + ciName + '".';
        var testPlan = this._generateUniqueContent(testPlanPrompt);

        // Generate future dates for start_date and end_date
        var startDate = new GlideDateTime();
        startDate.addDaysLocalTime(Math.floor(Math.random() * 5) + 1); // 1 to 5 days from now

        var endDate = new GlideDateTime();
        endDate.addDaysLocalTime(Math.floor(Math.random() * 5) + 6); // 6 to 10 days from now

        var fields = {
            requested_by: requestedBySysId,
            category: category,
            business_service: businessServiceSysId,
            cmdb_ci: cmdbCiSysId,
            priority: priority,
            risk: risk,
            impact: impact,
            short_description: generatedShortDescription,
            description: description,
            change_model: this.CHANGE_MODEL_SYSID,
            assignment_group: assignmentGroupSysId,
            // assigned_to: assignedToSysId,
            justification: justification,
            implementation_plan: implementationPlan,
            risk_impact_analysis: riskImpactAnalysis,
            backout_plan: backoutPlan,
            test_plan: testPlan,
            start_date: startDate,
            end_date: endDate
        };

        // Create the change request record using the parent class method
        return this._createCaseRecord('change_request', fields);
    },

    /**
     * Retrieves the name of the patient based on their sys_id.
     * @param {String} patientSysId - The sys_id of the patient.
     * @returns {String} - The name of the patient, or a default value if not found.
     */
    _getPatientName: function(patientSysId) {
        var patientGr = new GlideRecord('sn_hcls_patient');
        if (patientGr.get(patientSysId)) {
            return patientGr.getDisplayValue('name');
        }
        return 'the patient';
    },

    /**
     * Retrieves the name of the configuration item based on its sys_id.
     * @returns {String} - The name of the configuration item, or a default value if not found.
     */
    _getConfigurationItemName: function() {
        return this._getCiName(this.CONFIGURATION_ITEM_SYSID);
    },

    /**
     * Generates a random medical record number.
     * @returns {String} - The generated medical record number.
     */
    _generateRandomMedicalRecordNumber: function() {
        return 'MRN' + this._generateRandomNumberString(6);
    },

    /**
     * Generates a random patient account number.
     * @returns {String} - The generated patient account number.
     */
    _generateRandomPatientAccountNumber: function() {
        return 'PAN' + this._generateRandomNumberString(8);
    },

    /**
     * Generates a random service provider ID.
     * @returns {String} - The generated service provider ID.
     */
    _generateRandomServiceProviderId: function() {
        return 'SPID' + this._generateRandomNumberString(5);
    },

    /**
     * Generates a random billed DRG code.
     * @returns {String} - The generated billed DRG code.
     */
    _generateRandomBilledDrgCode: function() {
        return 'DRG' + this._generateRandomNumberString(3);
    },

    /**
     * Creates a knowledge article with the specified short description.
     * @param {String} shortDescription - The short description of the knowledge article.
     * @returns {String|null} - The sys_id of the created knowledge article, or null if failed.
     * 
     * NOTE: This method may generate a script error from the "Notify about article's checkout" business rule
     * which tries to access current.article.getRefRecord() when it's undefined. This error is benign and
     * does not affect the successful creation of the knowledge article. The error can be safely ignored.
     */
    _createKnowledgeArticle: function(shortDescription) {
        try {
            // Generate HTML content for the article using the parent class method
            var textPrompt = 'Create a detailed knowledge article about "' + shortDescription + '". Include headings, paragraphs, and bullet points using basic HTML formatting.';
            var htmlContent = this._generateUniqueContent(textPrompt);
            
            // Set valid_to date to 2100-01-01
            var validToDate = new GlideDateTime();
            validToDate.setDisplayValue('2100-01-01');
            
            // Create the kb_knowledge record
            // Note: There may be a benign error from the "Notify about article's checkout" business rule
            // which tries to access current.article.getRefRecord() when it's undefined.
            // This error does not affect the successful creation of the knowledge article.
            var fields = {
                short_description: shortDescription,
                text: htmlContent,
                knowledge_base: this.KNOWLEDGE_BASE_SYSID,
                kb_category: this.KB_CATEGORY_SYSID,
                valid_to: validToDate,
                workflow_state: this.KB_KNOWLEDGE_WORKFLOW_STATE
            };
            
            // Create the knowledge article record using the parent class method
            var sysId = this._createCaseRecord('kb_knowledge', fields);
            
            // Log success if the article was created
            if (sysId) {
                gs.info('Successfully created knowledge article with sys_id: ' + sysId);
                
                // Check for approvals and approve them
                this._approveKnowledgeArticle(sysId);
            }
            
            return sysId;
        } catch (error) {
            gs.error('Error in _createKnowledgeArticle: ' + error.message);
            return null;
        }
    },
    
    /**
     * Creates an enterprise-grade knowledge base article with enhanced formatting and metadata.
     * @param {String} title - The title of the knowledge article.
     * @param {String} content - The HTML content of the knowledge article.
     * @param {String} relatedIncidentSysId - The sys_id of the related incident.
     * @returns {String|null} - The sys_id of the created knowledge article, or null if failed.
     */
    _createEnterpriseKBArticle: function(title, content, relatedIncidentSysId) {
        try {
            // Set valid_to date to 2100-01-01
            var validToDate = new GlideDateTime();
            validToDate.setDisplayValue('2100-01-01');
            
            // Get the current date for the published date
            var publishedDate = new GlideDateTime();
            
            // Create the kb_knowledge record
            var fields = {
                short_description: title,
                text: content,
                knowledge_base: this.KNOWLEDGE_BASE_SYSID,
                kb_category: this.KB_CATEGORY_SYSID,
                valid_to: validToDate,
                workflow_state: this.KB_KNOWLEDGE_WORKFLOW_STATE, // 'published'
                published: publishedDate,
                author: this.AGENT_USER_SYSID,
                roles: 'itil',  // Restrict to ITIL users
                active: true,   // Ensure the article is active
                direct: true    // Allow direct access to the article
            };
            
            // Create the knowledge article record
            var sysId = this._createCaseRecord('kb_knowledge', fields);
            
            if (sysId) {
                gs.info('Successfully created enterprise KB article with sys_id: ' + sysId);
                
                // Explicitly publish the KB article
                this._publishKBArticle(sysId);
                
                // Create a relationship between the KB article and the incident
                if (relatedIncidentSysId) {
                    this._createKBIncidentRelationship(sysId, relatedIncidentSysId);
                }
                
                // Add keywords to the KB article
                this._addKBKeywords(sysId, title);
                
                // Check for approvals and approve them
                this._approveKnowledgeArticle(sysId);
                
                // Verify the article is published
                this._verifyKBArticlePublished(sysId);
            }
            
            return sysId;
        } catch (error) {
            gs.error('Error in _createEnterpriseKBArticle: ' + error.message);
            return null;
        }
    },
    
    /**
     * Explicitly publishes a knowledge article by setting necessary fields.
     * @param {String} articleSysId - The sys_id of the knowledge article to publish.
     */
    _publishKBArticle: function(articleSysId) {
        try {
            var kbGr = new GlideRecord('kb_knowledge');
            if (kbGr.get(articleSysId)) {
                // Set all necessary fields for publication
                kbGr.workflow_state = this.KB_KNOWLEDGE_WORKFLOW_STATE; // 'published'
                kbGr.active = true;
                
                // Set the published date to now
                var now = new GlideDateTime();
                kbGr.published = now;
                
                // Update the record
                kbGr.update();
                gs.info('Successfully published knowledge article with sys_id: ' + articleSysId);
            } else {
                gs.error('Failed to find knowledge article with sys_id: ' + articleSysId + ' for publishing');
            }
        } catch (error) {
            gs.error('Error in _publishKBArticle: ' + error.message);
        }
    },
    
    /**
     * Verifies that a knowledge article is properly published.
     * @param {String} articleSysId - The sys_id of the knowledge article to verify.
     */
    _verifyKBArticlePublished: function(articleSysId) {
        try {
            var kbGr = new GlideRecord('kb_knowledge');
            if (kbGr.get(articleSysId)) {
                if (kbGr.workflow_state == this.KB_KNOWLEDGE_WORKFLOW_STATE && kbGr.active == true) {
                    gs.info('Verified knowledge article is published: ' + articleSysId);
                } else {
                    gs.warning('Knowledge article ' + articleSysId + ' may not be properly published. Current state: ' + 
                              kbGr.workflow_state + ', Active: ' + kbGr.active);
                    
                    // Force publish again if needed
                    if (kbGr.workflow_state != this.KB_KNOWLEDGE_WORKFLOW_STATE || !kbGr.active) {
                        kbGr.workflow_state = this.KB_KNOWLEDGE_WORKFLOW_STATE;
                        kbGr.active = true;
                        kbGr.update();
                        gs.info('Forced publication of knowledge article: ' + articleSysId);
                    }
                }
            } else {
                gs.error('Failed to find knowledge article with sys_id: ' + articleSysId + ' for verification');
            }
        } catch (error) {
            gs.error('Error in _verifyKBArticlePublished: ' + error.message);
        }
    },
    
    /**
     * Automatically approves a knowledge article by updating its approval record.
     * @param {String} articleSysId - The sys_id of the knowledge article to approve.
     */
    _approveKnowledgeArticle: function(articleSysId) {
        try {
            // Find all approval records for this knowledge article
            var approvalGr = new GlideRecord('sysapproval_approver');
            approvalGr.addQuery('document_id', articleSysId);
            approvalGr.query();
            
            var foundApprovals = false;
            
            while (approvalGr.next()) {
                foundApprovals = true;
                // Set the approval state to 'approved'
                approvalGr.state = 'approved';
                approvalGr.update();
                gs.info('Successfully approved knowledge article approval record: ' + approvalGr.getUniqueValue());
            }
            
            if (!foundApprovals) {
                gs.info('No approval records found for knowledge article with sys_id: ' + articleSysId);
                
                // Check if we need to create an approval record and auto-approve it
                var kbGr = new GlideRecord('kb_knowledge');
                if (kbGr.get(articleSysId)) {
                    if (kbGr.workflow_state != this.KB_KNOWLEDGE_WORKFLOW_STATE) {
                        gs.info('Article not in published state. Setting to published state directly.');
                        kbGr.workflow_state = this.KB_KNOWLEDGE_WORKFLOW_STATE;
                        kbGr.update();
                    }
                }
            }
            
            // Double-check the article's workflow state
            var kbGr = new GlideRecord('kb_knowledge');
            if (kbGr.get(articleSysId)) {
                if (kbGr.workflow_state != this.KB_KNOWLEDGE_WORKFLOW_STATE) {
                    gs.info('Article still not in published state after approval. Setting directly.');
                    kbGr.workflow_state = this.KB_KNOWLEDGE_WORKFLOW_STATE;
                    kbGr.update();
                }
            }
        } catch (error) {
            gs.error('Error in _approveKnowledgeArticle: ' + error.message);
        }
    },
    
    /**
     * Creates a relationship between a knowledge article and an incident.
     * @param {String} kbSysId - The sys_id of the knowledge article.
     * @param {String} incidentSysId - The sys_id of the incident.
     */
    _createKBIncidentRelationship: function(kbSysId, incidentSysId) {
        try {
            var m2mGr = new GlideRecord('m2m_kb_task');
            m2mGr.initialize();
            m2mGr.kb_knowledge = kbSysId;
            m2mGr.task = incidentSysId;
            var relationshipSysId = m2mGr.insert();
            
            if (relationshipSysId) {
                gs.info('Successfully created relationship between KB article and incident');
            } else {
                gs.error('Failed to create relationship between KB article and incident');
            }
        } catch (error) {
            gs.error('Error in _createKBIncidentRelationship: ' + error.message);
        }
    },
    
    /**
     * Adds keywords to a knowledge article based on its title.
     * @param {String} kbSysId - The sys_id of the knowledge article.
     * @param {String} title - The title of the knowledge article.
     */
    _addKBKeywords: function(kbSysId, title) {
        try {
            // Generate keywords based on the title
            var keywordsPrompt = 'Generate 5-7 relevant technical keywords for a knowledge article titled: "' + 
                title + '". Return only the keywords separated by commas, no explanations.';
            var keywordsText = this._generateUniqueContent(keywordsPrompt);
            
            // Clean up the keywords
            var keywords = [];
            if (keywordsText) {
                keywords = keywordsText.split(',').map(function(keyword) {
                    return keyword.trim();
                });
            }
            
            // Get the KB article record
            var kbGr = new GlideRecord('kb_knowledge');
            if (kbGr.get(kbSysId)) {
                // Add keywords directly to the KB article's meta field
                var meta = '';
                for (var i = 0; i < keywords.length; i++) {
                    if (keywords[i]) {
                        // Ensure the keyword is a single word with no spaces to avoid errors
                        var safeKeyword = keywords[i].replace(/\s+/g, '_');
                        if (meta) {
                            meta += ', ';
                        }
                        meta += safeKeyword;
                    }
                }
                
                // Update the KB article with the keywords
                if (meta) {
                    kbGr.meta = meta;
                    kbGr.update();
                }
            }
            
            gs.info('Successfully added keywords to KB article');
        } catch (error) {
            gs.error('Error in _addKBKeywords: ' + error.message);
        }
    },

    type: 'DataGenerator'
});
