package excel

import (
	"fmt"
	"reflect"
	"strconv"

	"github.com/xuri/excelize/v2"
)

// Writer handles Excel file operations
type Writer struct {
	file      *excelize.File
	sheetName string
	headers   []string
	rowIndex  int
}

// NewWriter creates a new Excel writer
func NewWriter(sheetName string) *Writer {
	f := excelize.NewFile()
	// Create the sheet if it doesn't exist
	if sheetName != "Sheet1" {
		f.NewSheet(sheetName)
		f.DeleteSheet("Sheet1")
	} else {
		sheetName = "Sheet1"
	}
	return &Writer{
		file:      f,
		sheetName: sheetName,
		rowIndex:  1,
	}
}

// SetHeaders sets the column headers
func (w *Writer) SetHeaders(headers []string) error {
	w.headers = headers
	for i, header := range headers {
		cell := fmt.Sprintf("%s%d", getColumnName(i), w.rowIndex)
		if err := w.file.SetCellValue(w.sheetName, cell, header); err != nil {
			return fmt.Errorf("failed to set header %s: %w", header, err)
		}
	}
	w.rowIndex++
	return nil
}

// WriteRecord writes a record to the Excel file
func (w *Writer) WriteRecord(record interface{}) error {
	values := w.extractValues(record)
	
	for i, value := range values {
		if i >= len(w.headers) {
			break // Don't write more columns than headers
		}
		cell := fmt.Sprintf("%s%d", getColumnName(i), w.rowIndex)
		if err := w.file.SetCellValue(w.sheetName, cell, value); err != nil {
			return fmt.Errorf("failed to set cell %s: %w", cell, err)
		}
	}
	w.rowIndex++
	return nil
}

// WriteRecords writes multiple records to the Excel file
func (w *Writer) WriteRecords(records []interface{}) error {
	for _, record := range records {
		if err := w.WriteRecord(record); err != nil {
			return err
		}
	}
	return nil
}

// SaveToFile saves the Excel file to disk
func (w *Writer) SaveToFile(filename string) error {
	return w.file.SaveAs(filename)
}

// Close closes the Excel file
func (w *Writer) Close() error {
	return w.file.Close()
}

// extractValues extracts values from a struct using reflection
func (w *Writer) extractValues(record interface{}) []interface{} {
	var values []interface{}
	
	v := reflect.ValueOf(record)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	
	if v.Kind() != reflect.Struct {
		return values
	}
	
	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		fieldType := t.Field(i)
		
		// Skip unexported fields
		if !field.CanInterface() {
			continue
		}
		
		// Get the value
		value := field.Interface()
		
		// Convert to string for Excel
		switch v := value.(type) {
		case string:
			values = append(values, v)
		case int, int8, int16, int32, int64:
			values = append(values, fmt.Sprintf("%d", v))
		case uint, uint8, uint16, uint32, uint64:
			values = append(values, fmt.Sprintf("%d", v))
		case float32, float64:
			values = append(values, fmt.Sprintf("%f", v))
		case bool:
			values = append(values, strconv.FormatBool(v))
		default:
			values = append(values, fmt.Sprintf("%v", v))
		}
		
		// Check if we have enough values for headers
		if len(values) >= len(w.headers) {
			break
		}
		
		_ = fieldType // Avoid unused variable warning
	}
	
	return values
}

// getColumnName converts a column index to Excel column name (A, B, C, ..., AA, AB, etc.)
func getColumnName(index int) string {
	result := ""
	for index >= 0 {
		result = string(rune('A'+index%26)) + result
		index = index/26 - 1
	}
	return result
}

// GetIncidentHeaders returns the headers for incident records
func GetIncidentHeaders() []string {
	return []string{
		"Caller", "Category", "Subcategory", "Service", "Service offering",
		"Configuration item", "Short description", "Description", "Channel",
		"Opened", "Incident State", "Impact", "Urgency", "Priority",
		"Assignment group", "Assigned to", "Resolution code", "Resolution notes",
	}
}

// GetCaseHeaders returns the headers for case records
func GetCaseHeaders() []string {
	return []string{
		"Number", "Channel", "Account", "Contact", "Consumer",
		"Requesting Service Organization", "Product", "Asset", "Install Base",
		"Partner Contact", "Parent", "Short description", "Needs attention",
		"Opened", "Priority", "Assignment group", "Assigned to",
		"Service Organization", "Contract", "Entitlement", "Partner",
		"State", "Resolved by", "Resolved at", "Closed by", "Closed at",
		"Resolution code", "Cause", "Close code", "Close notes", "Notes to comments",
	}
}
