package csv

import (
	"os"
	"strings"
	"testing"

	"github.com/michaelbuckner/NOW-Dynamic-Data-Generator/internal/generator"
)

func TestNewWriter(t *testing.T) {
	filename := "test_output.csv"
	defer os.Remove(filename) // Clean up

	writer, err := NewWriter(filename)
	if err != nil {
		t.Fatalf("Failed to create CSV writer: %v", err)
	}
	defer writer.Close()

	// Note: filename is private, so we can't test it directly
	// Instead, we verify the writer was created successfully
	if writer.file == nil {
		t.Error("Expected file to be initialized")
	}
	if writer.writer == nil {
		t.Error("Expected CSV writer to be initialized")
	}
}

func TestGetIncidentHeaders(t *testing.T) {
	headers := GetIncidentHeaders()

	expectedHeaders := []string{
		"Caller", "Category", "Subcategory", "Service", "Service offering",
		"Configuration item", "Short description", "Description", "Channel",
		"Opened", "Incident State", "Impact", "Urgency", "Priority",
		"Assignment group", "Assigned to", "Resolution code", "Resolution notes",
	}

	if len(headers) != len(expectedHeaders) {
		t.Errorf("Expected %d headers, got %d", len(expectedHeaders), len(headers))
	}

	for i, expected := range expectedHeaders {
		if i >= len(headers) || headers[i] != expected {
			t.Errorf("Expected header %d to be %s, got %s", i, expected, headers[i])
		}
	}
}

func TestGetCaseHeaders(t *testing.T) {
	headers := GetCaseHeaders()

	// Check that we have the expected number of headers
	if len(headers) == 0 {
		t.Error("Expected case headers to be non-empty")
	}

	// Check for some key headers
	expectedHeaders := []string{"Number", "Account", "Contact", "Short description", "State"}
	for _, expected := range expectedHeaders {
		found := false
		for _, header := range headers {
			if header == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected to find header %s in case headers", expected)
		}
	}
}

func TestSetHeaders(t *testing.T) {
	filename := "test_headers.csv"
	defer os.Remove(filename) // Clean up

	writer, err := NewWriter(filename)
	if err != nil {
		t.Fatalf("Failed to create CSV writer: %v", err)
	}
	defer writer.Close()

	headers := []string{"Header1", "Header2", "Header3"}
	err = writer.SetHeaders(headers)
	if err != nil {
		t.Fatalf("Failed to set headers: %v", err)
	}

	// Close writer to flush data
	writer.Close()

	// Read the file and check headers
	content, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	contentStr := string(content)
	expectedLine := "Header1,Header2,Header3"
	if !strings.Contains(contentStr, expectedLine) {
		t.Errorf("Expected file to contain %s, got %s", expectedLine, contentStr)
	}
}

func TestWriteIncidentRecords(t *testing.T) {
	filename := "test_incidents.csv"
	defer os.Remove(filename) // Clean up

	writer, err := NewWriter(filename)
	if err != nil {
		t.Fatalf("Failed to create CSV writer: %v", err)
	}
	defer writer.Close()

	// Set headers
	headers := GetIncidentHeaders()
	err = writer.SetHeaders(headers)
	if err != nil {
		t.Fatalf("Failed to set headers: %v", err)
	}

	// Create test incident records
	records := []interface{}{
		&generator.IncidentRecord{
			Caller:           "John Doe",
			Category:         "Hardware",
			Subcategory:      "Printer",
			Service:          "IT Services",
			ShortDescription: "Printer not working",
			Description:      "The office printer is not responding",
			Channel:          "Phone",
			Opened:           "2024-01-01 10:00:00",
			IncidentState:    "New",
			Impact:           2,
			Urgency:          3,
			Priority:         "",
			AssignmentGroup:  "IT Support",
			AssignedTo:       "Jane Smith",
		},
		&generator.IncidentRecord{
			Caller:           "Bob Wilson",
			Category:         "Software",
			Subcategory:      "Email",
			Service:          "Email Services",
			ShortDescription: "Cannot send emails",
			Description:      "User unable to send emails from Outlook",
			Channel:          "Email",
			Opened:           "2024-01-02 14:30:00",
			IncidentState:    "In Progress",
			Impact:           3,
			Urgency:          2,
			Priority:         "",
			AssignmentGroup:  "Email Support",
			AssignedTo:       "Mike Johnson",
		},
	}

	// Write records
	err = writer.WriteRecords(records)
	if err != nil {
		t.Fatalf("Failed to write records: %v", err)
	}

	// Close writer to flush data
	writer.Close()

	// Read the file and verify content
	content, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	contentStr := string(content)

	// Check that both records are present
	if !strings.Contains(contentStr, "John Doe") {
		t.Error("Expected file to contain first record")
	}
	if !strings.Contains(contentStr, "Bob Wilson") {
		t.Error("Expected file to contain second record")
	}
	if !strings.Contains(contentStr, "Printer not working") {
		t.Error("Expected file to contain first record's description")
	}
	if !strings.Contains(contentStr, "Cannot send emails") {
		t.Error("Expected file to contain second record's description")
	}

	// Count lines (should be header + 2 records = 3 lines)
	lines := strings.Split(strings.TrimSpace(contentStr), "\n")
	if len(lines) != 3 {
		t.Errorf("Expected 3 lines (header + 2 records), got %d", len(lines))
	}
}

func TestWriteCaseRecords(t *testing.T) {
	filename := "test_cases.csv"
	defer os.Remove(filename) // Clean up

	writer, err := NewWriter(filename)
	if err != nil {
		t.Fatalf("Failed to create CSV writer: %v", err)
	}
	defer writer.Close()

	// Set headers
	headers := GetCaseHeaders()
	err = writer.SetHeaders(headers)
	if err != nil {
		t.Fatalf("Failed to set headers: %v", err)
	}

	// Create test case records
	records := []interface{}{
		&generator.CaseRecord{
			Number:           "CS0001",
			Account:          "Test Company",
			Contact:          "John Doe",
			ShortDescription: "Account access issue",
			OpenedAt:         "2024-01-01 10:00:00",
			Priority:         2,
			State:            "New",
		},
	}

	// Write records
	err = writer.WriteRecords(records)
	if err != nil {
		t.Fatalf("Failed to write records: %v", err)
	}

	// Close writer to flush data
	writer.Close()

	// Read the file and verify content
	content, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	contentStr := string(content)

	// Check that record is present
	if !strings.Contains(contentStr, "CS0001") {
		t.Error("Expected file to contain case number")
	}
	if !strings.Contains(contentStr, "Test Company") {
		t.Error("Expected file to contain account name")
	}
	if !strings.Contains(contentStr, "Account access issue") {
		t.Error("Expected file to contain case description")
	}
}

func TestWriteRecord(t *testing.T) {
	filename := "test_single_record.csv"
	defer os.Remove(filename) // Clean up

	writer, err := NewWriter(filename)
	if err != nil {
		t.Fatalf("Failed to create CSV writer: %v", err)
	}
	defer writer.Close()

	// Set headers
	headers := GetIncidentHeaders()
	err = writer.SetHeaders(headers)
	if err != nil {
		t.Fatalf("Failed to set headers: %v", err)
	}

	// Create test incident record
	record := &generator.IncidentRecord{
		Caller:           "Test User",
		Category:         "Network",
		Subcategory:      "Connectivity",
		ShortDescription: "Network down",
		Description:      "Network connectivity issues",
		Opened:           "2024-01-01 10:00:00",
		IncidentState:    "New",
		Impact:           1,
		Urgency:          1,
	}

	// Write single record
	err = writer.WriteRecord(record)
	if err != nil {
		t.Fatalf("Failed to write record: %v", err)
	}

	// Close writer to flush data
	writer.Close()

	// Read the file and verify content
	content, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	contentStr := string(content)

	// Check that record is present
	if !strings.Contains(contentStr, "Test User") {
		t.Error("Expected file to contain caller name")
	}
	if !strings.Contains(contentStr, "Network down") {
		t.Error("Expected file to contain short description")
	}
}

func TestWriteUnsupportedRecordType(t *testing.T) {
	filename := "test_unsupported.csv"
	defer os.Remove(filename) // Clean up

	writer, err := NewWriter(filename)
	if err != nil {
		t.Fatalf("Failed to create CSV writer: %v", err)
	}
	defer writer.Close()

	// Set headers
	headers := []string{"Test"}
	err = writer.SetHeaders(headers)
	if err != nil {
		t.Fatalf("Failed to set headers: %v", err)
	}

	// Try to write unsupported record type (string is not a struct)
	unsupportedRecord := "this is not a supported record type"
	err = writer.WriteRecord(unsupportedRecord)

	// The writer should handle this gracefully (no error, but empty values)
	if err != nil {
		t.Errorf("Expected no error for non-struct record type, got: %v", err)
	}

	// Close writer to flush data
	writer.Close()

	// Read the file and verify it only has headers
	content, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	contentStr := string(content)
	lines := strings.Split(strings.TrimSpace(contentStr), "\n")

	// Should have only header line (non-struct records don't write data)
	if len(lines) != 1 {
		t.Errorf("Expected 1 line (header only), got %d", len(lines))
	}

	// Verify it's just the header
	if lines[0] != "Test" {
		t.Errorf("Expected header line to be 'Test', got %s", lines[0])
	}
}

func TestClose(t *testing.T) {
	filename := "test_close.csv"
	defer os.Remove(filename) // Clean up

	writer, err := NewWriter(filename)
	if err != nil {
		t.Fatalf("Failed to create CSV writer: %v", err)
	}

	// Close the writer
	err = writer.Close()
	if err != nil {
		t.Fatalf("Failed to close writer: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Error("Expected file to exist after closing writer")
	}
}

// Benchmark tests

func BenchmarkWriteIncidentRecord(b *testing.B) {
	filename := "bench_incidents.csv"
	defer os.Remove(filename) // Clean up

	writer, err := NewWriter(filename)
	if err != nil {
		b.Fatalf("Failed to create CSV writer: %v", err)
	}
	defer writer.Close()

	headers := GetIncidentHeaders()
	err = writer.SetHeaders(headers)
	if err != nil {
		b.Fatalf("Failed to set headers: %v", err)
	}

	record := &generator.IncidentRecord{
		Caller:           "Benchmark User",
		Category:         "Hardware",
		Subcategory:      "Printer",
		ShortDescription: "Benchmark test",
		Description:      "This is a benchmark test record",
		Opened:           "2024-01-01 10:00:00",
		IncidentState:    "New",
		Impact:           2,
		Urgency:          3,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := writer.WriteRecord(record)
		if err != nil {
			b.Fatalf("Failed to write record: %v", err)
		}
	}
}
