package generator

import (
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/brianvoe/gofakeit/v6"
	"github.com/michaelbuckner/NOW-Dynamic-Data-Generator/internal/llm"
	"github.com/michaelbuckner/NOW-Dynamic-Data-Generator/internal/models"
)

// BulkGenerator represents the bulk data generator
type BulkGenerator struct {
	RecordCount      int
	BatchSize        int
	TableName        string
	ClosedPercentage int
	SplitOutput      bool
	LLMClient        *llm.OpenRouterClient
	ReferenceData    *models.ReferenceData
	ChoiceValues     *models.ChoiceValues
}

// IncidentRecord represents an incident record
type IncidentRecord struct {
	Caller            string `json:"caller"`
	Category          string `json:"category"`
	Subcategory       string `json:"subcategory"`
	Service           string `json:"service"`
	ServiceOffering   string `json:"service_offering"`
	ConfigurationItem string `json:"configuration_item"`
	ShortDescription  string `json:"short_description"`
	Description       string `json:"description"`
	Channel           string `json:"channel"`
	Opened            string `json:"opened"`
	IncidentState     string `json:"incident_state"`
	Impact            int    `json:"impact"`
	Urgency           int    `json:"urgency"`
	Priority          string `json:"priority"`
	AssignmentGroup   string `json:"assignment_group"`
	AssignedTo        string `json:"assigned_to"`
	ResolutionCode    string `json:"resolution_code"`
	ResolutionNotes   string `json:"resolution_notes"`
}

// CaseRecord represents a CSM case record
type CaseRecord struct {
	Number                        string `json:"number"`
	ContactType                   string `json:"contact_type"`
	Account                       string `json:"account"`
	Contact                       string `json:"contact"`
	Consumer                      string `json:"consumer"`
	RequestingServiceOrganization string `json:"requesting_service_organization"`
	Product                       string `json:"product"`
	Asset                         string `json:"asset"`
	InstallBase                   string `json:"install_base"`
	PartnerContact                string `json:"partner_contact"`
	Parent                        string `json:"parent"`
	ShortDescription              string `json:"short_description"`
	NeedsAttention                string `json:"needs_attention"`
	OpenedAt                      string `json:"opened_at"`
	Priority                      int    `json:"priority"`
	AssignmentGroup               string `json:"assignment_group"`
	AssignedTo                    string `json:"assigned_to"`
	ServiceOrganization           string `json:"service_organization"`
	Contract                      string `json:"contract"`
	Entitlement                   string `json:"entitlement"`
	Partner                       string `json:"partner"`
	State                         string `json:"state"`
	ResolvedBy                    string `json:"resolved_by,omitempty"`
	ResolvedAt                    string `json:"resolved_at,omitempty"`
	ClosedBy                      string `json:"closed_by,omitempty"`
	ClosedAt                      string `json:"closed_at,omitempty"`
	ResolutionCode                string `json:"resolution_code,omitempty"`
	Cause                         string `json:"cause,omitempty"`
	CloseCode                     string `json:"close_code"`
	CloseNotes                    string `json:"close_notes"`
	NotesToComments               string `json:"notes_to_comments,omitempty"`
}

// HRCaseRecord represents an HR case record
type HRCaseRecord struct {
	Number           string `json:"number"`
	ShortDescription string `json:"short_description"`
	Description      string `json:"description"`
	OpenedFor        string `json:"opened_for"`
	HRService        string `json:"hr_service"`
	SubjectPerson    string `json:"subject_person"`
	AssignmentGroup  string `json:"assignment_group"`
	HRServiceType    string `json:"hr_service_type"`
	DueDate          string `json:"due_date"`
	OpenedBy         string `json:"opened_by"`
	State            string `json:"state"`
	Priority         int    `json:"priority"`
	OpenedAt         string `json:"opened_at"`
	AssignedTo       string `json:"assigned_to,omitempty"`
	ResolvedBy       string `json:"resolved_by,omitempty"`
	ResolvedAt       string `json:"resolved_at,omitempty"`
	ClosedBy         string `json:"closed_by,omitempty"`
	ClosedAt         string `json:"closed_at,omitempty"`
	CloseCode        string `json:"close_code,omitempty"`
	CloseNotes       string `json:"close_notes,omitempty"`
}

// ChangeRequestRecord represents a change request record
type ChangeRequestRecord struct {
	Number             string `json:"number"`
	ShortDescription   string `json:"short_description"`
	Description        string `json:"description"`
	RequestedBy        string `json:"requested_by"`
	Category           string `json:"category"`
	BusinessService    string `json:"business_service"`
	ConfigurationItem  string `json:"configuration_item"`
	Priority           int    `json:"priority"`
	Risk               string `json:"risk"`
	Impact             int    `json:"impact"`
	AssignmentGroup    string `json:"assignment_group"`
	AssignedTo         string `json:"assigned_to,omitempty"`
	Justification      string `json:"justification"`
	ImplementationPlan string `json:"implementation_plan"`
	RiskImpactAnalysis string `json:"risk_impact_analysis"`
	BackoutPlan        string `json:"backout_plan"`
	TestPlan           string `json:"test_plan"`
	StartDate          string `json:"start_date"`
	EndDate            string `json:"end_date"`
	State              string `json:"state"`
	OpenedAt           string `json:"opened_at"`
	OpenedBy           string `json:"opened_by"`
	CloseCode          string `json:"close_code,omitempty"`
	CloseNotes         string `json:"close_notes,omitempty"`
}

// KnowledgeArticleRecord represents a knowledge article record
type KnowledgeArticleRecord struct {
	Number           string `json:"number"`
	ShortDescription string `json:"short_description"`
	Text             string `json:"text"`
	KnowledgeBase    string `json:"knowledge_base"`
	Category         string `json:"category"`
	ValidTo          string `json:"valid_to"`
	WorkflowState    string `json:"workflow_state"`
	Published        string `json:"published"`
	Author           string `json:"author"`
	Active           string `json:"active"`
	Meta             string `json:"meta,omitempty"`
	CreatedOn        string `json:"created_on"`
	UpdatedOn        string `json:"updated_on"`
}

// NewBulkGenerator creates a new bulk generator instance
func NewBulkGenerator(config Config) *BulkGenerator {
	return &BulkGenerator{
		RecordCount:      config.RecordCount,
		BatchSize:        config.BatchSize,
		TableName:        config.TableName,
		ClosedPercentage: config.ClosedPercentage,
		SplitOutput:      config.SplitOutput,
		LLMClient:        llm.NewOpenRouterClient(config.APIKey, config.Model),
		ReferenceData:    models.GetReferenceData(),
		ChoiceValues:     models.GetChoiceValues(),
	}
}

// Config represents the configuration for the bulk generator
type Config struct {
	RecordCount      int
	BatchSize        int
	TableName        string
	ClosedPercentage int
	SplitOutput      bool
	APIKey           string
	Model            string
}

// GenerateBatch generates a batch of records
func (bg *BulkGenerator) GenerateBatch(batchSize int) ([]interface{}, error) {
	fmt.Printf("Generating batch of %d records with concurrent processing...\n", batchSize)

	// Create a channel to collect results
	results := make(chan interface{}, batchSize)
	var wg sync.WaitGroup

	// Limit concurrency to avoid overwhelming the API
	concurrency := 10
	semaphore := make(chan struct{}, concurrency)

	// Generate records concurrently
	for i := 0; i < batchSize; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			var record interface{}
			var err error

			switch bg.TableName {
			case "incident":
				record, err = bg.generateIncidentRecord(index)
			case "case":
				record, err = bg.generateCaseRecord(index)
			case "hr_case":
				record, err = bg.generateHRCaseRecord(index)
			case "change_request":
				record, err = bg.generateChangeRequestRecord(index)
			case "knowledge_article":
				record, err = bg.generateKnowledgeArticleRecord(index)
			default:
				err = fmt.Errorf("unsupported table type: %s", bg.TableName)
			}

			if err != nil {
				fmt.Printf("Error generating record %d: %v\n", index, err)
				// Create a minimal error record
				if bg.TableName == "incident" {
					record = &IncidentRecord{
						ShortDescription: "Error generating incident record",
						Description:      fmt.Sprintf("Error: %v", err),
					}
				} else {
					record = &CaseRecord{
						Number:           fmt.Sprintf("ERROR-%d", index),
						ShortDescription: "Error generating case record",
					}
				}
			}

			results <- record
		}(i)
	}

	// Close results channel when all goroutines are done
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect all results
	var records []interface{}
	for record := range results {
		records = append(records, record)
	}

	return records, nil
}

// generateIncidentRecord generates a single incident record
func (bg *BulkGenerator) generateIncidentRecord(index int) (*IncidentRecord, error) {
	// Get random values
	caller := bg.ReferenceData.GetRandomReference("sys_user")
	category := bg.ChoiceValues.GetRandomChoice("category").(string)
	subcategory := bg.ChoiceValues.GetRandomSubcategory(category)
	businessService := bg.ReferenceData.GetRandomReference("cmdb_ci_service")
	ci := bg.ReferenceData.GetRandomReference("cmdb_ci")
	contactType := bg.ChoiceValues.GetRandomChoice("contact_type").(string)

	// Generate opened_at in ServiceNow format
	openedAt := bg.generateRandomOpenedAt()

	// Get state
	stateObj := bg.ChoiceValues.GetRandomChoice("state").(*models.ChoiceValue)
	state := stateObj.Display

	// Get impact and urgency (numeric values)
	impactObj := bg.ChoiceValues.GetRandomChoice("impact").(*models.ChoiceValue)
	impact := impactObj.Value

	urgencyObj := bg.ChoiceValues.GetRandomChoice("urgency").(*models.ChoiceValue)
	urgency := urgencyObj.Value

	// Don't set priority - let ServiceNow calculate it
	priority := ""

	// Get assignment data
	assignmentGroup := bg.ReferenceData.GetRandomReference("sys_user_group")
	assignedTo := bg.ReferenceData.GetRandomReference("sys_user")

	// Generate descriptions using LLM
	descriptions, err := bg.LLMClient.GenerateIncidentDescriptions(category, subcategory)
	if err != nil {
		// Use fallback descriptions
		descriptions = &llm.DescriptionResponse{
			ShortDescription: fmt.Sprintf("%s - %s issue", category, subcategory),
			Description:      fmt.Sprintf("Incident regarding %s - %s", category, subcategory),
		}
	}

	// Generate close notes if the incident is closed or resolved
	var closeCode, closeNotes string
	if state == "Resolved" || state == "Closed" {
		closeCode = bg.ChoiceValues.GetRandomChoice("close_code").(string)

		notes, err := bg.LLMClient.GenerateCloseNotes(descriptions.ShortDescription, descriptions.Description, closeCode)
		if err != nil {
			closeNotes = fmt.Sprintf("Incident closed with code: %s", closeCode)
		} else {
			closeNotes = notes
		}
	}

	return &IncidentRecord{
		Caller:            caller.DisplayValue,
		Category:          category,
		Subcategory:       subcategory,
		Service:           businessService.DisplayValue,
		ServiceOffering:   "",
		ConfigurationItem: ci.DisplayValue,
		ShortDescription:  descriptions.ShortDescription,
		Description:       descriptions.Description,
		Channel:           contactType,
		Opened:            openedAt,
		IncidentState:     state,
		Impact:            impact,
		Urgency:           urgency,
		Priority:          priority,
		AssignmentGroup:   assignmentGroup.DisplayValue,
		AssignedTo:        assignedTo.DisplayValue,
		ResolutionCode:    closeCode,
		ResolutionNotes:   closeNotes,
	}, nil
}

// generateCaseRecord generates a single case record
func (bg *BulkGenerator) generateCaseRecord(index int) (*CaseRecord, error) {
	// Generate case number
	timestamp := time.Now().Unix()
	caseNumber := fmt.Sprintf("CS%s%04d", strconv.FormatInt(timestamp, 10)[3:], index)

	// Get random account and contact
	account := bg.ReferenceData.GetRandomReference("account")

	// Find contacts for this account
	var contact *models.ReferenceValue
	for _, c := range bg.ReferenceData.Contact {
		if accountID, exists := c.Extra["account"]; exists && accountID == account.SysID {
			contact = &c
			break
		}
	}
	if contact == nil {
		contact = bg.ReferenceData.GetRandomReference("contact")
	}

	// Get case details
	caseType := bg.ChoiceValues.GetRandomChoice("case_type").(string)
	category := bg.ChoiceValues.GetRandomChoice("case_category").(string)
	subcategory := bg.ChoiceValues.GetRandomCaseSubcategory(category)
	contactType := bg.ChoiceValues.GetRandomChoice("contact_type").(string)

	// Determine if case should be closed
	shouldBeClosed := rand.Float64()*100 < float64(bg.ClosedPercentage)

	var stateObj *models.ChoiceValue
	if shouldBeClosed {
		// Get closed states
		closedStates := []*models.ChoiceValue{}
		for _, s := range bg.ChoiceValues.CaseState {
			if s.Display == "Resolved" || s.Display == "Closed" {
				closedStates = append(closedStates, &s)
			}
		}
		if len(closedStates) > 0 {
			stateObj = closedStates[rand.Intn(len(closedStates))]
		} else {
			stateObj = &bg.ChoiceValues.CaseState[rand.Intn(len(bg.ChoiceValues.CaseState))]
		}
	} else {
		// Get open states
		openStates := []*models.ChoiceValue{}
		for _, s := range bg.ChoiceValues.CaseState {
			if s.Display != "Resolved" && s.Display != "Closed" {
				openStates = append(openStates, &s)
			}
		}
		if len(openStates) > 0 {
			stateObj = openStates[rand.Intn(len(openStates))]
		} else {
			stateObj = &bg.ChoiceValues.CaseState[rand.Intn(len(bg.ChoiceValues.CaseState))]
		}
	}

	// Get assignment data
	priority := rand.Intn(5) + 1
	assignmentGroup := bg.ReferenceData.GetRandomReference("sys_user_group")
	assignedTo := bg.ReferenceData.GetRandomReference("sys_user")

	// Generate descriptions using LLM
	descriptions, err := bg.LLMClient.GenerateCaseDescriptions(category, subcategory, account.DisplayValue, caseType)
	if err != nil {
		// Use fallback descriptions
		descriptions = &llm.DescriptionResponse{
			ShortDescription: fmt.Sprintf("%s: %s - %s issue", account.DisplayValue, category, subcategory),
			Description:      fmt.Sprintf("%s case from %s regarding %s - %s", caseType, account.DisplayValue, category, subcategory),
		}
	}

	// Generate additional fields using gofakeit
	consumer := gofakeit.Name()
	requestingServiceOrg := gofakeit.Company() + " " + gofakeit.BuzzWord()
	product := gofakeit.ProductName()
	asset := strings.ToUpper(gofakeit.LetterN(8))
	installBase := strings.ToUpper(gofakeit.LetterN(10))
	partnerContact := gofakeit.Name()
	parent := ""
	if rand.Float64() > 0.8 {
		parent = fmt.Sprintf("CS%07d", rand.Intn(9999999))
	}
	needsAttention := "false"
	if rand.Float64() > 0.7 {
		needsAttention = "true"
	}
	openedAt := bg.generateRandomOpenedAt()
	serviceOrganization := gofakeit.Company() + " Services"
	contract := fmt.Sprintf("CNTR%07d", rand.Intn(9999999))

	entitlements := []string{
		"24/7 Support", "Business Hours Support", "Premium Support",
		"Standard Warranty", "Extended Warranty", "10-year product warranty on inverters",
	}
	entitlement := entitlements[rand.Intn(len(entitlements))]
	partner := gofakeit.Company() + " Partners"

	// Generate close notes if the case is closed or resolved
	var closeCode, closeNotes string
	if stateObj.Display == "Resolved" || stateObj.Display == "Closed" {
		closeCode = bg.ChoiceValues.GetRandomChoice("case_close_code").(string)

		notes, err := bg.LLMClient.GenerateCloseNotes(descriptions.ShortDescription, descriptions.Description, closeCode)
		if err != nil {
			closeNotes = fmt.Sprintf("Case closed with code: %s. The customer's request was addressed according to standard procedures.", closeCode)
		} else {
			closeNotes = notes
		}
	}

	record := &CaseRecord{
		Number:                        caseNumber,
		ContactType:                   contactType,
		Account:                       account.DisplayValue,
		Contact:                       contact.DisplayValue,
		Consumer:                      consumer,
		RequestingServiceOrganization: requestingServiceOrg,
		Product:                       product,
		Asset:                         asset,
		InstallBase:                   installBase,
		PartnerContact:                partnerContact,
		Parent:                        parent,
		ShortDescription:              descriptions.ShortDescription,
		NeedsAttention:                needsAttention,
		OpenedAt:                      openedAt,
		Priority:                      priority,
		AssignmentGroup:               assignmentGroup.DisplayValue,
		AssignedTo:                    assignedTo.DisplayValue,
		ServiceOrganization:           serviceOrganization,
		Contract:                      contract,
		Entitlement:                   entitlement,
		Partner:                       partner,
		State:                         stateObj.Display,
		CloseCode:                     closeCode,
		CloseNotes:                    closeNotes,
	}

	// Add resolution information for closed cases
	if shouldBeClosed {
		resolvedBy := bg.ReferenceData.GetRandomReference("sys_user").DisplayValue
		closedBy := bg.ReferenceData.GetRandomReference("sys_user").DisplayValue

		// Generate dates for resolved_at and closed_at
		now := time.Now()
		resolvedAt := now.AddDate(0, 0, -rand.Intn(7))     // Random time in the last week
		closedAt := resolvedAt.AddDate(0, 0, rand.Intn(2)) // 0-2 days after resolved

		resolutionCodes := []string{
			"Fixed by Vendor", "Fixed by Customer", "Fixed by Support",
			"Workaround Provided", "Configuration Change", "Software Update", "Hardware Replacement",
		}
		resolutionCode := resolutionCodes[rand.Intn(len(resolutionCodes))]

		causes := []string{
			"User Error", "Software Bug", "Hardware Failure", "Network Issue",
			"Configuration Error", "Third-party Integration", "Environmental Factor",
		}
		cause := causes[rand.Intn(len(causes))]

		record.ResolvedBy = resolvedBy
		record.ResolvedAt = resolvedAt.Format("2006-01-02")
		record.ClosedBy = closedBy
		record.ClosedAt = closedAt.Format("2006-01-02")
		record.ResolutionCode = resolutionCode
		record.Cause = cause
		record.NotesToComments = "false"
		if rand.Float64() > 0.5 {
			record.NotesToComments = "true"
		}
	}

	return record, nil
}

// generateHRCaseRecord generates a single HR case record
func (bg *BulkGenerator) generateHRCaseRecord(index int) (*HRCaseRecord, error) {
	// Generate HR case number
	timestamp := time.Now().Unix()
	hrNumber := fmt.Sprintf("HRC%s%04d", strconv.FormatInt(timestamp, 10)[3:], index)

	// Get random users
	openedFor := bg.ReferenceData.GetRandomReference("sys_user")
	subjectPerson := bg.ReferenceData.GetRandomReference("sys_user")
	openedBy := bg.ReferenceData.GetRandomReference("sys_user")
	assignmentGroup := bg.ReferenceData.GetRandomReference("sys_user_group")

	// HR service types
	hrServiceTypes := []string{
		"employee_relations", "benefits", "payroll", "recruitment",
		"performance_management", "training", "compliance", "onboarding",
	}
	hrServiceType := hrServiceTypes[rand.Intn(len(hrServiceTypes))]

	// Generate HR-specific categories and issues
	hrCategories := []string{
		"Benefits", "Payroll", "Time Off", "Performance", "Training",
		"Compliance", "Employee Relations", "Onboarding", "Offboarding",
	}
	category := hrCategories[rand.Intn(len(hrCategories))]

	// Generate descriptions using LLM
	descriptions, err := bg.LLMClient.GenerateIncidentDescriptions(category, hrServiceType)
	if err != nil {
		descriptions = &llm.DescriptionResponse{
			ShortDescription: fmt.Sprintf("HR %s - %s request", category, hrServiceType),
			Description:      fmt.Sprintf("HR case regarding %s - %s for employee assistance", category, hrServiceType),
		}
	}

	// Generate dates
	openedAt := bg.generateRandomOpenedAt()
	dueDate := time.Now().AddDate(0, 0, rand.Intn(14)+1) // 1-14 days from now

	// Determine state and priority
	priority := rand.Intn(4) + 1
	states := []string{"New", "In Progress", "Awaiting Info", "Resolved", "Closed"}
	state := states[rand.Intn(len(states))]

	record := &HRCaseRecord{
		Number:           hrNumber,
		ShortDescription: descriptions.ShortDescription,
		Description:      descriptions.Description,
		OpenedFor:        openedFor.DisplayValue,
		HRService:        "HR Services",
		SubjectPerson:    subjectPerson.DisplayValue,
		AssignmentGroup:  assignmentGroup.DisplayValue,
		HRServiceType:    hrServiceType,
		DueDate:          dueDate.Format("2006-01-02"),
		OpenedBy:         openedBy.DisplayValue,
		State:            state,
		Priority:         priority,
		OpenedAt:         openedAt,
	}

	// Add resolution info for closed cases
	if state == "Resolved" || state == "Closed" {
		resolvedBy := bg.ReferenceData.GetRandomReference("sys_user").DisplayValue
		closedBy := bg.ReferenceData.GetRandomReference("sys_user").DisplayValue

		now := time.Now()
		resolvedAt := now.AddDate(0, 0, -rand.Intn(7))
		closedAt := resolvedAt.AddDate(0, 0, rand.Intn(2))

		closeCodes := []string{
			"Resolved", "Closed Complete", "Closed Incomplete",
			"Cancelled", "Duplicate", "Resolved by Caller",
		}
		closeCode := closeCodes[rand.Intn(len(closeCodes))]

		closeNotes, err := bg.LLMClient.GenerateCloseNotes(descriptions.ShortDescription, descriptions.Description, closeCode)
		if err != nil {
			closeNotes = fmt.Sprintf("HR case resolved with code: %s", closeCode)
		}

		record.AssignedTo = resolvedBy
		record.ResolvedBy = resolvedBy
		record.ResolvedAt = resolvedAt.Format("2006-01-02")
		record.ClosedBy = closedBy
		record.ClosedAt = closedAt.Format("2006-01-02")
		record.CloseCode = closeCode
		record.CloseNotes = closeNotes
	}

	return record, nil
}

// generateChangeRequestRecord generates a single change request record
func (bg *BulkGenerator) generateChangeRequestRecord(index int) (*ChangeRequestRecord, error) {
	// Generate change request number
	timestamp := time.Now().Unix()
	crNumber := fmt.Sprintf("CHG%s%04d", strconv.FormatInt(timestamp, 10)[3:], index)

	// Get random values
	requestedBy := bg.ReferenceData.GetRandomReference("sys_user")
	businessService := bg.ReferenceData.GetRandomReference("cmdb_ci_service")
	ci := bg.ReferenceData.GetRandomReference("cmdb_ci")
	assignmentGroup := bg.ReferenceData.GetRandomReference("sys_user_group")
	assignedTo := bg.ReferenceData.GetRandomReference("sys_user")

	// Change categories
	categories := []string{
		"Software", "Hardware", "Network", "Security", "Database",
		"Application", "Infrastructure", "Emergency", "Standard", "Normal",
	}
	category := categories[rand.Intn(len(categories))]

	// Risk levels
	risks := []string{"Low", "Medium", "High", "Very High"}
	risk := risks[rand.Intn(len(risks))]

	// Generate priority and impact
	priority := rand.Intn(4) + 1
	impact := rand.Intn(4) + 1

	// Generate descriptions using LLM
	descriptions, err := bg.LLMClient.GenerateIncidentDescriptions(category, "Change Request")
	if err != nil {
		descriptions = &llm.DescriptionResponse{
			ShortDescription: fmt.Sprintf("%s change request for %s", category, ci.DisplayValue),
			Description:      fmt.Sprintf("Change request to modify %s configuration for %s", category, businessService.DisplayValue),
		}
	}

	// Generate detailed plans using LLM
	justificationPrompt := fmt.Sprintf("Write a business justification for a %s change request affecting %s. Include business value and expected benefits.", category, businessService.DisplayValue)
	justification, err := bg.LLMClient.GenerateText(justificationPrompt, 500)
	if err != nil {
		justification = fmt.Sprintf("Business justification for %s change to improve system performance and reliability.", category)
	}

	implementationPrompt := fmt.Sprintf("Create an implementation plan for a %s change request. Include specific steps, timing, and ownership.", category)
	implementationPlan, err := bg.LLMClient.GenerateText(implementationPrompt, 800)
	if err != nil {
		implementationPlan = fmt.Sprintf("Implementation plan for %s change with step-by-step procedures.", category)
	}

	riskPrompt := fmt.Sprintf("Analyze risks and impacts for a %s change request. Include mitigation strategies.", category)
	riskAnalysis, err := bg.LLMClient.GenerateText(riskPrompt, 600)
	if err != nil {
		riskAnalysis = fmt.Sprintf("Risk analysis for %s change with identified mitigation strategies.", category)
	}

	backoutPrompt := fmt.Sprintf("Create a backout plan for a %s change request. Include specific rollback steps.", category)
	backoutPlan, err := bg.LLMClient.GenerateText(backoutPrompt, 500)
	if err != nil {
		backoutPlan = fmt.Sprintf("Backout plan for %s change with rollback procedures.", category)
	}

	testPrompt := fmt.Sprintf("Develop a test plan for a %s change request. Include test cases and success criteria.", category)
	testPlan, err := bg.LLMClient.GenerateText(testPrompt, 600)
	if err != nil {
		testPlan = fmt.Sprintf("Test plan for %s change with validation procedures.", category)
	}

	// Generate dates
	openedAt := bg.generateRandomOpenedAt()
	startDate := time.Now().AddDate(0, 0, rand.Intn(30)+1) // 1-30 days from now
	endDate := startDate.AddDate(0, 0, rand.Intn(7)+1)     // 1-7 days after start

	// Change states
	states := []string{"New", "Assess", "Authorize", "Scheduled", "Implement", "Review", "Closed"}
	state := states[rand.Intn(len(states))]

	record := &ChangeRequestRecord{
		Number:             crNumber,
		ShortDescription:   descriptions.ShortDescription,
		Description:        descriptions.Description,
		RequestedBy:        requestedBy.DisplayValue,
		Category:           category,
		BusinessService:    businessService.DisplayValue,
		ConfigurationItem:  ci.DisplayValue,
		Priority:           priority,
		Risk:               risk,
		Impact:             impact,
		AssignmentGroup:    assignmentGroup.DisplayValue,
		AssignedTo:         assignedTo.DisplayValue,
		Justification:      justification,
		ImplementationPlan: implementationPlan,
		RiskImpactAnalysis: riskAnalysis,
		BackoutPlan:        backoutPlan,
		TestPlan:           testPlan,
		StartDate:          startDate.Format("2006-01-02"),
		EndDate:            endDate.Format("2006-01-02"),
		State:              state,
		OpenedAt:           openedAt,
		OpenedBy:           requestedBy.DisplayValue,
	}

	// Add close info for closed changes
	if state == "Closed" {
		closeCodes := []string{
			"Successful", "Successful with Issues", "Unsuccessful",
			"Cancelled", "Backed Out", "Partially Successful",
		}
		closeCode := closeCodes[rand.Intn(len(closeCodes))]

		closeNotes, err := bg.LLMClient.GenerateCloseNotes(descriptions.ShortDescription, descriptions.Description, closeCode)
		if err != nil {
			closeNotes = fmt.Sprintf("Change request completed with status: %s", closeCode)
		}

		record.CloseCode = closeCode
		record.CloseNotes = closeNotes
	}

	return record, nil
}

// generateKnowledgeArticleRecord generates a single knowledge article record
func (bg *BulkGenerator) generateKnowledgeArticleRecord(index int) (*KnowledgeArticleRecord, error) {
	// Generate KB number
	timestamp := time.Now().Unix()
	kbNumber := fmt.Sprintf("KB%s%04d", strconv.FormatInt(timestamp, 10)[3:], index)

	// Knowledge categories
	categories := []string{
		"IT Services", "Hardware", "Software", "Network", "Security",
		"Troubleshooting", "How-To", "FAQ", "Best Practices", "Procedures",
	}
	category := categories[rand.Intn(len(categories))]

	// Generate article content using LLM
	titlePrompt := fmt.Sprintf("Create a knowledge article title for %s. Make it concise and solution-oriented.", category)
	title, err := bg.LLMClient.GenerateText(titlePrompt, 100)
	if err != nil {
		title = fmt.Sprintf("How to resolve %s issues", category)
	}

	contentPrompt := fmt.Sprintf("Create a comprehensive knowledge base article about %s. Include sections for Problem Description, Symptoms, Cause, Resolution Steps, Prevention, and Related Information. Format with HTML headings and lists.", category)
	content, err := bg.LLMClient.GenerateText(contentPrompt, 2000)
	if err != nil {
		content = fmt.Sprintf(`<h2>Problem Description</h2>
<p>This article covers common %s issues and their resolutions.</p>
<h2>Symptoms</h2>
<ul><li>Common symptoms related to %s</li></ul>
<h2>Resolution Steps</h2>
<ol><li>Step 1: Identify the issue</li><li>Step 2: Apply the solution</li><li>Step 3: Verify the fix</li></ol>`, category, category)
	}

	// Generate keywords
	keywordsPrompt := fmt.Sprintf("Generate 5-7 relevant technical keywords for a knowledge article about %s. Return only keywords separated by commas.", category)
	keywords, err := bg.LLMClient.GenerateText(keywordsPrompt, 100)
	if err != nil {
		keywords = fmt.Sprintf("%s, troubleshooting, resolution, guide", strings.ToLower(category))
	}

	// Get author
	author := bg.ReferenceData.GetRandomReference("sys_user")

	// Generate dates
	createdOn := bg.generateRandomOpenedAt()
	updatedOn := time.Now().Format("2006-01-02 15:04:05")
	published := time.Now().Format("2006-01-02 15:04:05")
	validTo := time.Now().AddDate(2, 0, 0).Format("2006-01-02") // Valid for 2 years

	return &KnowledgeArticleRecord{
		Number:           kbNumber,
		ShortDescription: title,
		Text:             content,
		KnowledgeBase:    "IT Knowledge Base",
		Category:         category,
		ValidTo:          validTo,
		WorkflowState:    "published",
		Published:        published,
		Author:           author.DisplayValue,
		Active:           "true",
		Meta:             keywords,
		CreatedOn:        createdOn,
		UpdatedOn:        updatedOn,
	}, nil
}

// generateRandomOpenedAt generates a random opened_at date/time in ServiceNow format
func (bg *BulkGenerator) generateRandomOpenedAt() string {
	now := time.Now()
	oneYearAgo := now.AddDate(-1, 0, 0)

	// Generate random timestamp between one year ago and now
	randomTime := oneYearAgo.Unix() + rand.Int63n(now.Unix()-oneYearAgo.Unix())
	randomDate := time.Unix(randomTime, 0)

	// Format as YYYY-MM-DD HH:MM:SS for ServiceNow
	return randomDate.Format("2006-01-02 15:04:05")
}
