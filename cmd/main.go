package main

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/michaelbuckner/NOW-Dynamic-Data-Generator/internal/generator"
	"github.com/michaelbuckner/NOW-Dynamic-Data-Generator/pkg/csv"
	"github.com/michaelbuckner/NOW-Dynamic-Data-Generator/pkg/excel"
	"github.com/spf13/cobra"
)

var (
	outputFile       string
	recordCount      int
	batchSize        int
	tableName        string
	closedPercentage int
	splitOutput      bool
	model            string
	apiKey           string
)

var rootCmd = &cobra.Command{
	Use:   "bulk-generator",
	Short: "Generate bulk data for ServiceNow tables",
	Long: `A utility to generate bulk data for ServiceNow tables.
This version supports generating incident and CSM case records with realistic data using LLM integration.`,
	RunE: runBulkGenerator,
}

func init() {
	rootCmd.Flags().StringVarP(&outputFile, "output", "o", "bulk-data.xlsx", "Output file name")
	rootCmd.Flags().IntVarP(&recordCount, "count", "c", 10000, "Number of records to generate")
	rootCmd.Flags().IntVarP(&batchSize, "batch", "b", 1000, "Batch size for processing")
	rootCmd.Flags().StringVarP(&tableName, "table", "t", "incident", "Table name (incident, case, hr_case, change_request, or knowledge_article)")
	rootCmd.Flags().IntVar(&closedPercentage, "closed", 30, "Percentage of closed cases (0-100)")
	rootCmd.Flags().BoolVar(&splitOutput, "split", false, "Split output into separate files for closed and open cases")
	rootCmd.Flags().StringVarP(&model, "model", "m", "google/gemini-2.0-flash-001", "LLM model to use")
	rootCmd.Flags().StringVarP(&apiKey, "api-key", "k", "", "OpenRouter API key (or set OPENROUTER_API_KEY env var)")
}

func runBulkGenerator(cmd *cobra.Command, args []string) error {
	fmt.Println("Starting bulk data generation...")

	// Get API key from environment if not provided
	if apiKey == "" {
		apiKey = os.Getenv("OPENROUTER_API_KEY")
	}

	// Create generator config
	config := generator.Config{
		RecordCount:      recordCount,
		BatchSize:        batchSize,
		TableName:        tableName,
		ClosedPercentage: closedPercentage,
		SplitOutput:      splitOutput,
		APIKey:           apiKey,
		Model:            model,
	}

	// Create bulk generator
	bg := generator.NewBulkGenerator(config)

	fmt.Printf("Using OpenRouter with model: %s\n", model)

	// Determine output format
	isCSV := strings.HasSuffix(strings.ToLower(outputFile), ".csv")

	// Start timing
	startTime := time.Now()

	if splitOutput {
		return generateSplitOutput(bg, isCSV, startTime)
	} else {
		return generateSingleOutput(bg, isCSV, startTime)
	}
}

func generateSingleOutput(bg *generator.BulkGenerator, isCSV bool, startTime time.Time) error {
	fmt.Printf("Output format is %s: %s\n", getFormatName(isCSV), outputFile)

	var writer interface {
		SetHeaders([]string) error
		WriteRecords([]interface{}) error
		Close() error
	}

	// Create appropriate writer
	if isCSV {
		csvWriter, err := csv.NewWriter(outputFile)
		if err != nil {
			return fmt.Errorf("failed to create CSV writer: %w", err)
		}
		writer = csvWriter
	} else {
		excelWriter := excel.NewWriter(tableName)
		defer func() {
			if err := excelWriter.SaveToFile(outputFile); err != nil {
				fmt.Printf("Error saving Excel file: %v\n", err)
			}
		}()
		writer = excelWriter
	}

	defer writer.Close()

	// Set headers
	var headers []string
	if tableName == "incident" {
		if isCSV {
			headers = csv.GetIncidentHeaders()
		} else {
			headers = excel.GetIncidentHeaders()
		}
	} else {
		if isCSV {
			headers = csv.GetCaseHeaders()
		} else {
			headers = excel.GetCaseHeaders()
		}
	}

	if err := writer.SetHeaders(headers); err != nil {
		return fmt.Errorf("failed to set headers: %w", err)
	}

	// Generate data in batches
	recordsGenerated := 0
	totalBatches := int(math.Ceil(float64(recordCount) / float64(batchSize)))

	fmt.Printf("Generating %d records in %d batches of %d...\n", recordCount, totalBatches, batchSize)

	for batchNum := 0; batchNum < totalBatches; batchNum++ {
		currentBatchSize := min(batchSize, recordCount-recordsGenerated)
		fmt.Printf("Generating batch %d/%d (%d records)...\n", batchNum+1, totalBatches, currentBatchSize)

		// Generate the batch
		records, err := bg.GenerateBatch(currentBatchSize)
		if err != nil {
			return fmt.Errorf("failed to generate batch: %w", err)
		}

		// Write the batch
		if err := writer.WriteRecords(records); err != nil {
			return fmt.Errorf("failed to write records: %w", err)
		}

		recordsGenerated += currentBatchSize
		fmt.Printf("Progress: %d/%d records (%.0f%%)\n", recordsGenerated, recordCount, float64(recordsGenerated)/float64(recordCount)*100)
	}

	// Save Excel file if needed
	if !isCSV {
		if excelWriter, ok := writer.(*excel.Writer); ok {
			if err := excelWriter.SaveToFile(outputFile); err != nil {
				return fmt.Errorf("failed to save Excel file: %w", err)
			}
		}
	}

	elapsed := time.Since(startTime)
	fmt.Printf("Data generation complete! Generated %d records in %v\n", recordsGenerated, elapsed)
	fmt.Printf("%s data written to %s\n", getFormatName(isCSV), outputFile)

	return nil
}

func generateSplitOutput(bg *generator.BulkGenerator, isCSV bool, startTime time.Time) error {
	// Get the base filename without extension
	fileExt := filepath.Ext(outputFile)
	fileBase := strings.TrimSuffix(outputFile, fileExt)

	// Create filenames for closed and open cases
	closedFile := fmt.Sprintf("%s-closed%s", fileBase, fileExt)
	openFile := fmt.Sprintf("%s-open%s", fileBase, fileExt)

	fmt.Printf("Splitting output into separate files:\n")
	fmt.Printf("- Closed cases: %s\n", closedFile)
	fmt.Printf("- Open cases: %s\n", openFile)

	// Create writers for both files
	var closedWriter, openWriter interface {
		SetHeaders([]string) error
		WriteRecord(interface{}) error
		Close() error
	}

	if isCSV {
		cw, err := csv.NewWriter(closedFile)
		if err != nil {
			return fmt.Errorf("failed to create closed CSV writer: %w", err)
		}
		closedWriter = cw

		ow, err := csv.NewWriter(openFile)
		if err != nil {
			return fmt.Errorf("failed to create open CSV writer: %w", err)
		}
		openWriter = ow
	} else {
		closedWriter = excel.NewWriter(tableName)
		openWriter = excel.NewWriter(tableName)
	}

	defer closedWriter.Close()
	defer openWriter.Close()

	// Set headers for both writers
	var headers []string
	if tableName == "incident" {
		if isCSV {
			headers = csv.GetIncidentHeaders()
		} else {
			headers = excel.GetIncidentHeaders()
		}
	} else {
		if isCSV {
			headers = csv.GetCaseHeaders()
		} else {
			headers = excel.GetCaseHeaders()
		}
	}

	if err := closedWriter.SetHeaders(headers); err != nil {
		return fmt.Errorf("failed to set closed headers: %w", err)
	}
	if err := openWriter.SetHeaders(headers); err != nil {
		return fmt.Errorf("failed to set open headers: %w", err)
	}

	// Generate data in batches
	recordsGenerated := 0
	closedRecords := 0
	openRecords := 0
	totalBatches := int(math.Ceil(float64(recordCount) / float64(batchSize)))

	fmt.Printf("Generating %d records in %d batches of %d...\n", recordCount, totalBatches, batchSize)

	for batchNum := 0; batchNum < totalBatches; batchNum++ {
		currentBatchSize := min(batchSize, recordCount-recordsGenerated)
		fmt.Printf("Generating batch %d/%d (%d records)...\n", batchNum+1, totalBatches, currentBatchSize)

		// Generate the batch
		records, err := bg.GenerateBatch(currentBatchSize)
		if err != nil {
			return fmt.Errorf("failed to generate batch: %w", err)
		}

		// Split records into closed and open
		for _, record := range records {
			isClosed := isRecordClosed(record)

			if isClosed {
				if err := closedWriter.WriteRecord(record); err != nil {
					return fmt.Errorf("failed to write closed record: %w", err)
				}
				closedRecords++
			} else {
				if err := openWriter.WriteRecord(record); err != nil {
					return fmt.Errorf("failed to write open record: %w", err)
				}
				openRecords++
			}
		}

		recordsGenerated += currentBatchSize
		fmt.Printf("Progress: %d/%d records (%.0f%%)\n", recordsGenerated, recordCount, float64(recordsGenerated)/float64(recordCount)*100)
	}

	// Save Excel files if needed
	if !isCSV {
		if excelWriter, ok := closedWriter.(*excel.Writer); ok {
			if err := excelWriter.SaveToFile(closedFile); err != nil {
				return fmt.Errorf("failed to save closed Excel file: %w", err)
			}
		}
		if excelWriter, ok := openWriter.(*excel.Writer); ok {
			if err := excelWriter.SaveToFile(openFile); err != nil {
				return fmt.Errorf("failed to save open Excel file: %w", err)
			}
		}
	}

	elapsed := time.Since(startTime)
	fmt.Printf("Data generation complete! Generated %d records in %v\n", recordsGenerated, elapsed)
	fmt.Printf("- %d closed records\n", closedRecords)
	fmt.Printf("- %d open records\n", openRecords)
	fmt.Printf("%s data written to %s and %s\n", getFormatName(isCSV), closedFile, openFile)

	return nil
}

func isRecordClosed(record interface{}) bool {
	switch r := record.(type) {
	case *generator.IncidentRecord:
		return r.IncidentState == "Resolved" || r.IncidentState == "Closed"
	case *generator.CaseRecord:
		return r.State == "Resolved" || r.State == "Closed"
	case *generator.HRCaseRecord:
		return r.State == "Resolved" || r.State == "Closed"
	case *generator.ChangeRequestRecord:
		return r.State == "Closed"
	case *generator.KnowledgeArticleRecord:
		return r.WorkflowState == "published" // Knowledge articles are considered "closed" when published
	default:
		return false
	}
}

func getFormatName(isCSV bool) string {
	if isCSV {
		return "CSV"
	}
	return "Excel"
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
