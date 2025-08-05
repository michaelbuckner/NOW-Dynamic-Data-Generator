package csv

import (
	"encoding/csv"
	"fmt"
	"os"
	"reflect"
	"strconv"
)

// Writer handles CSV file operations
type Writer struct {
	file    *os.File
	writer  *csv.Writer
	headers []string
}

// NewWriter creates a new CSV writer
func NewWriter(filename string) (*Writer, error) {
	file, err := os.Create(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to create CSV file: %w", err)
	}

	return &Writer{
		file:   file,
		writer: csv.NewWriter(file),
	}, nil
}

// SetHeaders sets the column headers and writes them to the CSV
func (w *Writer) SetHeaders(headers []string) error {
	w.headers = headers
	return w.writer.Write(headers)
}

// WriteRecord writes a record to the CSV file
func (w *Writer) WriteRecord(record interface{}) error {
	values := w.extractValues(record)
	stringValues := make([]string, len(values))
	
	for i, value := range values {
		stringValues[i] = fmt.Sprintf("%v", value)
	}
	
	return w.writer.Write(stringValues)
}

// WriteRecords writes multiple records to the CSV file
func (w *Writer) WriteRecords(records []interface{}) error {
	for _, record := range records {
		if err := w.WriteRecord(record); err != nil {
			return err
		}
	}
	return nil
}

// Flush flushes any buffered data to the underlying writer
func (w *Writer) Flush() {
	w.writer.Flush()
}

// Close closes the CSV file
func (w *Writer) Close() error {
	w.writer.Flush()
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
		
		// Convert to appropriate type for CSV
		switch v := value.(type) {
		case string:
			values = append(values, v)
		case int, int8, int16, int32, int64:
			values = append(values, v)
		case uint, uint8, uint16, uint32, uint64:
			values = append(values, v)
		case float32, float64:
			values = append(values, v)
		case bool:
			values = append(values, strconv.FormatBool(v))
		default:
			values = append(values, fmt.Sprintf("%v", v))
		}
		
		// Check if we have enough values for headers
		if len(w.headers) > 0 && len(values) >= len(w.headers) {
			break
		}
		
		_ = fieldType // Avoid unused variable warning
	}
	
	return values
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
