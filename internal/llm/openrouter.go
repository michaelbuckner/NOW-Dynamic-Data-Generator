package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// OpenRouterClient represents the OpenRouter LLM client
type OpenRouterClient struct {
	APIKey      string
	Model       string
	Temperature float64
	MaxTokens   int
	BaseURL     string
}

// OpenRouterRequest represents the request structure for OpenRouter API
type OpenRouterRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens"`
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenRouterResponse represents the response structure from OpenRouter API
type OpenRouterResponse struct {
	Choices []Choice  `json:"choices"`
	Error   *APIError `json:"error,omitempty"`
}

// Choice represents a choice in the response
type Choice struct {
	Message Message `json:"message"`
}

// APIError represents an API error
type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

// DescriptionResponse represents the structured response for incident descriptions
type DescriptionResponse struct {
	ShortDescription string `json:"shortDescription"`
	Description      string `json:"description"`
}

// NewOpenRouterClient creates a new OpenRouter client
func NewOpenRouterClient(apiKey, model string) *OpenRouterClient {
	return &OpenRouterClient{
		APIKey:      apiKey,
		Model:       model,
		Temperature: 0.7,
		MaxTokens:   500,
		BaseURL:     "https://openrouter.ai/api/v1/chat/completions",
	}
}

// GenerateText generates text using the OpenRouter API
func (c *OpenRouterClient) GenerateText(prompt string, maxLength int) (string, error) {
	if c.APIKey == "" {
		return c.fallbackText(prompt, maxLength), nil
	}

	response, err := c.callAPI(prompt, maxLength)
	if err != nil {
		// Return fallback text on error
		return c.fallbackText(prompt, maxLength), nil
	}

	if len(response) > maxLength {
		return response[:maxLength], nil
	}
	return response, nil
}

// GenerateIncidentDescriptions generates structured incident descriptions
func (c *OpenRouterClient) GenerateIncidentDescriptions(category, subcategory string) (*DescriptionResponse, error) {
	if c.APIKey == "" {
		return c.fallbackIncidentDescriptions(category, subcategory), nil
	}

	prompt := fmt.Sprintf(`Create a realistic ServiceNow incident for %s - %s. 

Respond with ONLY a JSON object in this exact format:
{
  "shortDescription": "Brief issue summary under 80 characters",
  "description": "Detailed description of the problem and impact, 150-300 characters"
}

Make it realistic and specific to the category/subcategory. Do not include any other text.`, category, subcategory)

	response, err := c.callAPI(prompt, 300)
	if err != nil {
		return c.fallbackIncidentDescriptions(category, subcategory), nil
	}

	// Try to parse as JSON
	var desc DescriptionResponse
	if err := json.Unmarshal([]byte(response), &desc); err != nil {
		// Try to fix and parse JSON
		if fixedDesc := c.tryFixJSON(response, category, subcategory); fixedDesc != nil {
			return fixedDesc, nil
		}
		return c.fallbackIncidentDescriptions(category, subcategory), nil
	}

	// Validate the response
	if desc.ShortDescription == "" {
		desc.ShortDescription = fmt.Sprintf("%s - %s issue", category, subcategory)
	}
	if desc.Description == "" {
		desc.Description = fmt.Sprintf("Incident regarding %s - %s", category, subcategory)
	}

	return &desc, nil
}

// GenerateCaseDescriptions generates structured case descriptions
func (c *OpenRouterClient) GenerateCaseDescriptions(category, subcategory, accountName, caseType string) (*DescriptionResponse, error) {
	prompt := fmt.Sprintf(`Generate a realistic ServiceNow CSM case short description and detailed description for the following:
- Account: %s
- Case Type: %s
- Category: %s
- Subcategory: %s

Format your response as JSON with 'shortDescription' and 'description' fields. 
The short description should be a brief summary (under 100 characters).
The description should be detailed (200-400 characters).`, accountName, caseType, category, subcategory)

	response, err := c.callAPI(prompt, 400)
	if err != nil {
		return c.fallbackCaseDescriptions(category, subcategory, accountName, caseType), nil
	}

	// Try to parse as JSON
	var desc DescriptionResponse
	if err := json.Unmarshal([]byte(response), &desc); err != nil {
		// Try to fix and parse JSON
		if fixedDesc := c.tryFixJSON(response, category, subcategory); fixedDesc != nil {
			return fixedDesc, nil
		}
		return c.fallbackCaseDescriptions(category, subcategory, accountName, caseType), nil
	}

	// Validate the response
	if desc.ShortDescription == "" {
		desc.ShortDescription = fmt.Sprintf("%s: %s - %s issue", accountName, category, subcategory)
	}
	if desc.Description == "" {
		desc.Description = fmt.Sprintf("%s case from %s regarding %s - %s", caseType, accountName, category, subcategory)
	}

	return &desc, nil
}

// GenerateCloseNotes generates close notes for incidents/cases
func (c *OpenRouterClient) GenerateCloseNotes(shortDescription, description, closeCode string) (string, error) {
	prompt := fmt.Sprintf(`Write realistic ServiceNow incident close notes for:
Issue: %s
Close Code: %s

Write 1-2 sentences explaining how this was resolved. Be specific and professional. Maximum 150 characters. Do not include quotes or extra formatting.`, shortDescription, closeCode)

	response, err := c.callAPI(prompt, 200)
	if err != nil {
		return fmt.Sprintf("Incident resolved. %s applied.", closeCode), nil
	}

	// Clean up the response
	cleanedResponse := strings.TrimSpace(response)
	cleanedResponse = strings.Trim(cleanedResponse, `"'`)
	cleanedResponse = strings.TrimPrefix(cleanedResponse, "Close notes:")
	cleanedResponse = strings.TrimPrefix(cleanedResponse, "Resolution:")
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\n", " ")
	cleanedResponse = strings.TrimSpace(cleanedResponse)

	if cleanedResponse == "" {
		return fmt.Sprintf("Incident resolved. %s applied.", closeCode), nil
	}

	return cleanedResponse, nil
}

// callAPI makes the actual API call to OpenRouter
func (c *OpenRouterClient) callAPI(prompt string, maxTokens int) (string, error) {
	reqBody := OpenRouterRequest{
		Model:       c.Model,
		Temperature: c.Temperature,
		MaxTokens:   min(maxTokens, c.MaxTokens),
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", c.BaseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("HTTP-Referer", "https://github.com/NOW-Dynamic-Data-Generator")
	req.Header.Set("X-Title", "NOW-Dynamic-Data-Generator")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var apiResp OpenRouterResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if apiResp.Error != nil {
		return "", fmt.Errorf("API error: %s", apiResp.Error.Message)
	}

	if len(apiResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	content := apiResp.Choices[0].Message.Content
	// Clean up markdown code blocks
	content = strings.ReplaceAll(content, "```json", "")
	content = strings.ReplaceAll(content, "```", "")
	content = strings.TrimSpace(content)

	return content, nil
}

// tryFixJSON attempts to fix common JSON parsing issues
func (c *OpenRouterClient) tryFixJSON(response, category, subcategory string) *DescriptionResponse {
	// Method 1: Find JSON object boundaries
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}")
	if start != -1 && end != -1 && end > start {
		jsonStr := response[start : end+1]
		var desc DescriptionResponse
		if err := json.Unmarshal([]byte(jsonStr), &desc); err == nil {
			return &desc
		}
	}

	// Method 2: Regex extraction
	shortDescPattern := `["']?shortDescription["']?\s*:\s*["']([^"']+)["']`
	descPattern := `["']?description["']?\s*:\s*["']([^"']+)["']`

	var shortDesc, desc string
	if matches := findStringSubmatch(shortDescPattern, response); len(matches) > 1 {
		shortDesc = matches[1]
	}
	if matches := findStringSubmatch(descPattern, response); len(matches) > 1 {
		desc = matches[1]
	}

	if shortDesc != "" || desc != "" {
		result := &DescriptionResponse{
			ShortDescription: shortDesc,
			Description:      desc,
		}
		if result.ShortDescription == "" {
			result.ShortDescription = fmt.Sprintf("%s - %s issue", category, subcategory)
		}
		if result.Description == "" {
			result.Description = fmt.Sprintf("Incident regarding %s - %s", category, subcategory)
		}
		return result
	}

	return nil
}

// fallbackText generates fallback text when LLM fails
func (c *OpenRouterClient) fallbackText(prompt string, maxLength int) string {
	text := fmt.Sprintf("Generated text for: %s", prompt)
	if len(text) > maxLength {
		return text[:maxLength]
	}
	return text
}

// fallbackIncidentDescriptions generates fallback incident descriptions
func (c *OpenRouterClient) fallbackIncidentDescriptions(category, subcategory string) *DescriptionResponse {
	return &DescriptionResponse{
		ShortDescription: fmt.Sprintf("%s - %s issue", category, subcategory),
		Description:      fmt.Sprintf("Incident regarding %s - %s", category, subcategory),
	}
}

// fallbackCaseDescriptions generates fallback case descriptions
func (c *OpenRouterClient) fallbackCaseDescriptions(category, subcategory, accountName, caseType string) *DescriptionResponse {
	issues := map[string]map[string]string{
		"Account": {
			"Access":       "unable to access account",
			"Creation":     "needs new account created",
			"Modification": "requires account changes",
			"Deletion":     "requests account deletion",
			"Permissions":  "needs permission adjustment",
		},
		"Billing": {
			"Invoice":      "invoice discrepancy",
			"Payment":      "payment processing issue",
			"Refund":       "requesting refund",
			"Subscription": "subscription management",
			"Pricing":      "pricing inquiry",
		},
		"Product": {
			"Defect":          "product defect reported",
			"Feature Request": "requesting new feature",
			"Documentation":   "documentation unclear",
			"Compatibility":   "compatibility issue",
			"Installation":    "installation problem",
		},
	}

	issue := fmt.Sprintf("%s - %s issue", category, subcategory)
	if categoryIssues, exists := issues[category]; exists {
		if specificIssue, exists := categoryIssues[subcategory]; exists {
			issue = specificIssue
		}
	}

	return &DescriptionResponse{
		ShortDescription: fmt.Sprintf("%s: %s", accountName, issue),
		Description:      fmt.Sprintf("%s case from %s regarding %s. Customer has requested assistance with their %s - %s concern and requires follow-up from the appropriate team.", caseType, accountName, issue, strings.ToLower(category), strings.ToLower(subcategory)),
	}
}

// Helper function for regex functionality
func findStringSubmatch(pattern, text string) []string {
	re, err := regexp.Compile(pattern)
	if err != nil {
		return []string{}
	}
	return re.FindStringSubmatch(text)
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
