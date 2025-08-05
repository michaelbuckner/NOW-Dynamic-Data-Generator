package generator

import (
	"strings"
	"testing"
)

func TestNewBulkGenerator(t *testing.T) {
	config := Config{
		RecordCount:      100,
		BatchSize:        10,
		TableName:        "incident",
		ClosedPercentage: 30,
		SplitOutput:      false,
		APIKey:           "test-key",
		Model:            "test-model",
	}

	bg := NewBulkGenerator(config)

	if bg.RecordCount != 100 {
		t.Errorf("Expected RecordCount 100, got %d", bg.RecordCount)
	}
	if bg.BatchSize != 10 {
		t.Errorf("Expected BatchSize 10, got %d", bg.BatchSize)
	}
	if bg.TableName != "incident" {
		t.Errorf("Expected TableName 'incident', got %s", bg.TableName)
	}
	if bg.ClosedPercentage != 30 {
		t.Errorf("Expected ClosedPercentage 30, got %d", bg.ClosedPercentage)
	}
	if bg.LLMClient == nil {
		t.Error("Expected LLMClient to be initialized")
	}
	if bg.ReferenceData == nil {
		t.Error("Expected ReferenceData to be initialized")
	}
	if bg.ChoiceValues == nil {
		t.Error("Expected ChoiceValues to be initialized")
	}
}

func TestGenerateIncidentRecord(t *testing.T) {
	bg := createTestBulkGenerator("incident")

	record, err := bg.generateIncidentRecord(1)
	if err != nil {
		t.Fatalf("Failed to generate incident record: %v", err)
	}

	// Validate required fields
	if record.Caller == "" {
		t.Error("Caller should not be empty")
	}
	if record.Category == "" {
		t.Error("Category should not be empty")
	}
	if record.ShortDescription == "" {
		t.Error("ShortDescription should not be empty")
	}
	if record.Description == "" {
		t.Error("Description should not be empty")
	}
	if record.Opened == "" {
		t.Error("Opened should not be empty")
	}
	if record.IncidentState == "" {
		t.Error("IncidentState should not be empty")
	}
	if record.Impact < 1 || record.Impact > 4 {
		t.Errorf("Impact should be between 1-4, got %d", record.Impact)
	}
	if record.Urgency < 1 || record.Urgency > 4 {
		t.Errorf("Urgency should be between 1-4, got %d", record.Urgency)
	}

	// Validate date format (YYYY-MM-DD HH:MM:SS)
	if !isValidDateFormat(record.Opened) {
		t.Errorf("Invalid date format for Opened: %s", record.Opened)
	}
}

func TestGenerateCaseRecord(t *testing.T) {
	bg := createTestBulkGenerator("case")

	record, err := bg.generateCaseRecord(1)
	if err != nil {
		t.Fatalf("Failed to generate case record: %v", err)
	}

	// Validate required fields
	if record.Number == "" {
		t.Error("Number should not be empty")
	}
	if !strings.HasPrefix(record.Number, "CS") {
		t.Errorf("Case number should start with 'CS', got %s", record.Number)
	}
	if record.Account == "" {
		t.Error("Account should not be empty")
	}
	if record.Contact == "" {
		t.Error("Contact should not be empty")
	}
	if record.ShortDescription == "" {
		t.Error("ShortDescription should not be empty")
	}
	if record.OpenedAt == "" {
		t.Error("OpenedAt should not be empty")
	}
	if record.Priority < 1 || record.Priority > 5 {
		t.Errorf("Priority should be between 1-5, got %d", record.Priority)
	}
	if record.State == "" {
		t.Error("State should not be empty")
	}

	// Validate date format
	if !isValidDateFormat(record.OpenedAt) {
		t.Errorf("Invalid date format for OpenedAt: %s", record.OpenedAt)
	}
}

func TestGenerateHRCaseRecord(t *testing.T) {
	bg := createTestBulkGenerator("hr_case")

	record, err := bg.generateHRCaseRecord(1)
	if err != nil {
		t.Fatalf("Failed to generate HR case record: %v", err)
	}

	// Validate required fields
	if record.Number == "" {
		t.Error("Number should not be empty")
	}
	if !strings.HasPrefix(record.Number, "HRC") {
		t.Errorf("HR case number should start with 'HRC', got %s", record.Number)
	}
	if record.ShortDescription == "" {
		t.Error("ShortDescription should not be empty")
	}
	if record.Description == "" {
		t.Error("Description should not be empty")
	}
	if record.OpenedFor == "" {
		t.Error("OpenedFor should not be empty")
	}
	if record.HRService == "" {
		t.Error("HRService should not be empty")
	}
	if record.HRServiceType == "" {
		t.Error("HRServiceType should not be empty")
	}
	if record.DueDate == "" {
		t.Error("DueDate should not be empty")
	}
	if record.Priority < 1 || record.Priority > 4 {
		t.Errorf("Priority should be between 1-4, got %d", record.Priority)
	}

	// Validate HR service types
	validServiceTypes := []string{
		"employee_relations", "benefits", "payroll", "recruitment",
		"performance_management", "training", "compliance", "onboarding",
	}
	if !contains(validServiceTypes, record.HRServiceType) {
		t.Errorf("Invalid HR service type: %s", record.HRServiceType)
	}
}

func TestGenerateChangeRequestRecord(t *testing.T) {
	bg := createTestBulkGenerator("change_request")

	record, err := bg.generateChangeRequestRecord(1)
	if err != nil {
		t.Fatalf("Failed to generate change request record: %v", err)
	}

	// Validate required fields
	if record.Number == "" {
		t.Error("Number should not be empty")
	}
	if !strings.HasPrefix(record.Number, "CHG") {
		t.Errorf("Change request number should start with 'CHG', got %s", record.Number)
	}
	if record.ShortDescription == "" {
		t.Error("ShortDescription should not be empty")
	}
	if record.Description == "" {
		t.Error("Description should not be empty")
	}
	if record.RequestedBy == "" {
		t.Error("RequestedBy should not be empty")
	}
	if record.Category == "" {
		t.Error("Category should not be empty")
	}
	if record.BusinessService == "" {
		t.Error("BusinessService should not be empty")
	}
	if record.ConfigurationItem == "" {
		t.Error("ConfigurationItem should not be empty")
	}
	if record.Priority < 1 || record.Priority > 4 {
		t.Errorf("Priority should be between 1-4, got %d", record.Priority)
	}
	if record.Impact < 1 || record.Impact > 4 {
		t.Errorf("Impact should be between 1-4, got %d", record.Impact)
	}
	if record.Risk == "" {
		t.Error("Risk should not be empty")
	}
	if record.Justification == "" {
		t.Error("Justification should not be empty")
	}
	if record.ImplementationPlan == "" {
		t.Error("ImplementationPlan should not be empty")
	}
	if record.RiskImpactAnalysis == "" {
		t.Error("RiskImpactAnalysis should not be empty")
	}
	if record.BackoutPlan == "" {
		t.Error("BackoutPlan should not be empty")
	}
	if record.TestPlan == "" {
		t.Error("TestPlan should not be empty")
	}
	if record.StartDate == "" {
		t.Error("StartDate should not be empty")
	}
	if record.EndDate == "" {
		t.Error("EndDate should not be empty")
	}

	// Validate risk levels
	validRisks := []string{"Low", "Medium", "High", "Very High"}
	if !contains(validRisks, record.Risk) {
		t.Errorf("Invalid risk level: %s", record.Risk)
	}

	// Validate categories
	validCategories := []string{
		"Software", "Hardware", "Network", "Security", "Database",
		"Application", "Infrastructure", "Emergency", "Standard", "Normal",
	}
	if !contains(validCategories, record.Category) {
		t.Errorf("Invalid category: %s", record.Category)
	}
}

func TestGenerateKnowledgeArticleRecord(t *testing.T) {
	bg := createTestBulkGenerator("knowledge_article")

	record, err := bg.generateKnowledgeArticleRecord(1)
	if err != nil {
		t.Fatalf("Failed to generate knowledge article record: %v", err)
	}

	// Validate required fields
	if record.Number == "" {
		t.Error("Number should not be empty")
	}
	if !strings.HasPrefix(record.Number, "KB") {
		t.Errorf("Knowledge article number should start with 'KB', got %s", record.Number)
	}
	if record.ShortDescription == "" {
		t.Error("ShortDescription should not be empty")
	}
	if record.Text == "" {
		t.Error("Text should not be empty")
	}
	if record.KnowledgeBase == "" {
		t.Error("KnowledgeBase should not be empty")
	}
	if record.Category == "" {
		t.Error("Category should not be empty")
	}
	if record.ValidTo == "" {
		t.Error("ValidTo should not be empty")
	}
	if record.WorkflowState != "published" {
		t.Errorf("WorkflowState should be 'published', got %s", record.WorkflowState)
	}
	if record.Published == "" {
		t.Error("Published should not be empty")
	}
	if record.Author == "" {
		t.Error("Author should not be empty")
	}
	if record.Active != "true" {
		t.Errorf("Active should be 'true', got %s", record.Active)
	}
	if record.CreatedOn == "" {
		t.Error("CreatedOn should not be empty")
	}
	if record.UpdatedOn == "" {
		t.Error("UpdatedOn should not be empty")
	}

	// Validate categories
	validCategories := []string{
		"IT Services", "Hardware", "Software", "Network", "Security",
		"Troubleshooting", "How-To", "FAQ", "Best Practices", "Procedures",
	}
	if !contains(validCategories, record.Category) {
		t.Errorf("Invalid category: %s", record.Category)
	}

	// Validate HTML content (fallback may not have HTML)
	if record.Text == "" {
		t.Error("Text should not be empty")
	}
}

func TestGenerateBatch(t *testing.T) {
	bg := createTestBulkGenerator("incident")

	batchSize := 5
	records, err := bg.GenerateBatch(batchSize)
	if err != nil {
		t.Fatalf("Failed to generate batch: %v", err)
	}

	if len(records) != batchSize {
		t.Errorf("Expected %d records, got %d", batchSize, len(records))
	}

	// Validate all records are of correct type
	for i, record := range records {
		if _, ok := record.(*IncidentRecord); !ok {
			t.Errorf("Record %d is not an IncidentRecord", i)
		}
	}
}

func TestGenerateBatchUnsupportedTable(t *testing.T) {
	bg := createTestBulkGenerator("unsupported_table")

	records, err := bg.GenerateBatch(1)

	// Should return records with error records, not a direct error
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if len(records) != 1 {
		t.Errorf("Expected 1 record, got %d", len(records))
	}

	// The record should be an error record (CaseRecord with error info)
	if record, ok := records[0].(*CaseRecord); ok {
		if !strings.Contains(record.Number, "ERROR") {
			t.Errorf("Expected error record number to contain 'ERROR', got %s", record.Number)
		}
	} else {
		t.Error("Expected error record to be a CaseRecord")
	}
}

func TestGenerateRandomOpenedAt(t *testing.T) {
	bg := createTestBulkGenerator("incident")

	openedAt := bg.generateRandomOpenedAt()

	if openedAt == "" {
		t.Error("OpenedAt should not be empty")
	}

	if !isValidDateFormat(openedAt) {
		t.Errorf("Invalid date format: %s", openedAt)
	}
}

// Helper functions

func createTestBulkGenerator(tableName string) *BulkGenerator {
	config := Config{
		RecordCount:      10,
		BatchSize:        5,
		TableName:        tableName,
		ClosedPercentage: 30,
		SplitOutput:      false,
		APIKey:           "", // Empty API key for testing (will use fallback)
		Model:            "test-model",
	}

	return NewBulkGenerator(config)
}

func isValidDateFormat(dateStr string) bool {
	// Check if date matches YYYY-MM-DD HH:MM:SS format
	if len(dateStr) != 19 {
		return false
	}
	if dateStr[4] != '-' || dateStr[7] != '-' || dateStr[10] != ' ' || dateStr[13] != ':' || dateStr[16] != ':' {
		return false
	}
	return true
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Benchmark tests

func BenchmarkGenerateIncidentRecord(b *testing.B) {
	bg := createTestBulkGenerator("incident")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := bg.generateIncidentRecord(i)
		if err != nil {
			b.Fatalf("Failed to generate incident record: %v", err)
		}
	}
}

func BenchmarkGenerateCaseRecord(b *testing.B) {
	bg := createTestBulkGenerator("case")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := bg.generateCaseRecord(i)
		if err != nil {
			b.Fatalf("Failed to generate case record: %v", err)
		}
	}
}

func BenchmarkGenerateBatch(b *testing.B) {
	bg := createTestBulkGenerator("incident")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := bg.GenerateBatch(10)
		if err != nil {
			b.Fatalf("Failed to generate batch: %v", err)
		}
	}
}
