package llm

import (
	"strings"
	"testing"
)

func TestNewOpenRouterClient(t *testing.T) {
	apiKey := "test-api-key"
	model := "test-model"

	client := NewOpenRouterClient(apiKey, model)

	if client.APIKey != apiKey {
		t.Errorf("Expected APIKey %s, got %s", apiKey, client.APIKey)
	}
	if client.Model != model {
		t.Errorf("Expected Model %s, got %s", model, client.Model)
	}
	if client.Temperature != 0.7 {
		t.Errorf("Expected Temperature 0.7, got %f", client.Temperature)
	}
	if client.MaxTokens != 500 {
		t.Errorf("Expected MaxTokens 500, got %d", client.MaxTokens)
	}
	if client.BaseURL != "https://openrouter.ai/api/v1/chat/completions" {
		t.Errorf("Expected correct BaseURL, got %s", client.BaseURL)
	}
}

func TestGenerateTextWithoutAPIKey(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	text, err := client.GenerateText("test prompt", 100)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Should return fallback text
	if !strings.Contains(text, "Generated text for: test prompt") {
		t.Errorf("Expected fallback text, got %s", text)
	}
}

func TestGenerateIncidentDescriptionsWithoutAPIKey(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	desc, err := client.GenerateIncidentDescriptions("Hardware", "Printer")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Should return fallback descriptions
	expectedShort := "Hardware - Printer issue"
	expectedDesc := "Incident regarding Hardware - Printer"

	if desc.ShortDescription != expectedShort {
		t.Errorf("Expected short description %s, got %s", expectedShort, desc.ShortDescription)
	}
	if desc.Description != expectedDesc {
		t.Errorf("Expected description %s, got %s", expectedDesc, desc.Description)
	}
}

func TestGenerateCaseDescriptionsWithoutAPIKey(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	desc, err := client.GenerateCaseDescriptions("Account", "Access", "Test Company", "Support")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Should return fallback descriptions
	if !strings.Contains(desc.ShortDescription, "Test Company") {
		t.Errorf("Expected short description to contain company name, got %s", desc.ShortDescription)
	}
	if !strings.Contains(desc.Description, "Support case from Test Company") {
		t.Errorf("Expected description to contain case details, got %s", desc.Description)
	}
}

func TestGenerateCloseNotesWithoutAPIKey(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	notes, err := client.GenerateCloseNotes("Test issue", "Test description", "Resolved")
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Should return fallback close notes
	expected := "Incident resolved. Resolved applied."
	if notes != expected {
		t.Errorf("Expected close notes %s, got %s", expected, notes)
	}
}

func TestFallbackIncidentDescriptions(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	desc := client.fallbackIncidentDescriptions("Software", "Update")

	expectedShort := "Software - Update issue"
	expectedDesc := "Incident regarding Software - Update"

	if desc.ShortDescription != expectedShort {
		t.Errorf("Expected short description %s, got %s", expectedShort, desc.ShortDescription)
	}
	if desc.Description != expectedDesc {
		t.Errorf("Expected description %s, got %s", expectedDesc, desc.Description)
	}
}

func TestFallbackCaseDescriptions(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	desc := client.fallbackCaseDescriptions("Account", "Access", "Test Corp", "Support")

	if !strings.Contains(desc.ShortDescription, "Test Corp") {
		t.Errorf("Expected short description to contain company name, got %s", desc.ShortDescription)
	}
	if !strings.Contains(desc.Description, "Support case from Test Corp") {
		t.Errorf("Expected description to contain case details, got %s", desc.Description)
	}
	// Note: Fallback descriptions may not contain exact category/subcategory terms
	// but should contain relevant content
	if len(desc.Description) < 10 {
		t.Errorf("Expected description to have meaningful content, got %s", desc.Description)
	}
}

func TestFallbackCaseDescriptionsWithKnownCategories(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	// Test Account category
	desc := client.fallbackCaseDescriptions("Account", "Access", "Test Corp", "Support")
	if !strings.Contains(desc.ShortDescription, "unable to access account") {
		t.Errorf("Expected specific account access issue, got %s", desc.ShortDescription)
	}

	// Test Billing category
	desc = client.fallbackCaseDescriptions("Billing", "Invoice", "Test Corp", "Support")
	if !strings.Contains(desc.ShortDescription, "invoice discrepancy") {
		t.Errorf("Expected specific billing issue, got %s", desc.ShortDescription)
	}

	// Test Product category
	desc = client.fallbackCaseDescriptions("Product", "Defect", "Test Corp", "Support")
	if !strings.Contains(desc.ShortDescription, "product defect reported") {
		t.Errorf("Expected specific product issue, got %s", desc.ShortDescription)
	}
}

func TestFallbackText(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	prompt := "test prompt"
	maxLength := 50

	text := client.fallbackText(prompt, maxLength)

	expected := "Generated text for: test prompt"
	if text != expected {
		t.Errorf("Expected fallback text %s, got %s", expected, text)
	}

	// Test with length limit
	longPrompt := "this is a very long prompt that should be truncated when the max length is applied"
	shortText := client.fallbackText(longPrompt, 20)

	if len(shortText) > 20 {
		t.Errorf("Expected text to be truncated to 20 characters, got %d", len(shortText))
	}
}

func TestTryFixJSON(t *testing.T) {
	client := NewOpenRouterClient("", "test-model")

	// Test valid JSON extraction
	response := `Here is the JSON: {"shortDescription": "Test short", "description": "Test desc"} and some extra text`
	result := client.tryFixJSON(response, "Test", "Category")

	if result == nil {
		t.Fatal("Expected result, got nil")
	}
	if result.ShortDescription != "Test short" {
		t.Errorf("Expected 'Test short', got %s", result.ShortDescription)
	}
	if result.Description != "Test desc" {
		t.Errorf("Expected 'Test desc', got %s", result.Description)
	}

	// Test regex extraction
	response2 := `shortDescription: "Regex test", description: "Regex desc"`
	result2 := client.tryFixJSON(response2, "Test", "Category")

	if result2 == nil {
		t.Fatal("Expected result, got nil")
	}
	if result2.ShortDescription != "Regex test" {
		t.Errorf("Expected 'Regex test', got %s", result2.ShortDescription)
	}
	if result2.Description != "Regex desc" {
		t.Errorf("Expected 'Regex desc', got %s", result2.Description)
	}

	// Test fallback when nothing matches
	response3 := `invalid response with no JSON`
	result3 := client.tryFixJSON(response3, "Test", "Category")

	if result3 != nil {
		t.Errorf("Expected nil result for invalid response, got %v", result3)
	}
}

func TestMinFunction(t *testing.T) {
	if min(5, 3) != 3 {
		t.Errorf("Expected min(5, 3) = 3, got %d", min(5, 3))
	}
	if min(2, 8) != 2 {
		t.Errorf("Expected min(2, 8) = 2, got %d", min(2, 8))
	}
	if min(4, 4) != 4 {
		t.Errorf("Expected min(4, 4) = 4, got %d", min(4, 4))
	}
}

// Benchmark tests

func BenchmarkGenerateTextFallback(b *testing.B) {
	client := NewOpenRouterClient("", "test-model")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := client.GenerateText("test prompt", 100)
		if err != nil {
			b.Fatalf("Failed to generate text: %v", err)
		}
	}
}

func BenchmarkGenerateIncidentDescriptionsFallback(b *testing.B) {
	client := NewOpenRouterClient("", "test-model")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := client.GenerateIncidentDescriptions("Hardware", "Printer")
		if err != nil {
			b.Fatalf("Failed to generate descriptions: %v", err)
		}
	}
}

func BenchmarkFallbackIncidentDescriptions(b *testing.B) {
	client := NewOpenRouterClient("", "test-model")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		client.fallbackIncidentDescriptions("Hardware", "Printer")
	}
}
