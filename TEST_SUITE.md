# Go Bulk Data Generator Test Suite

This document describes the comprehensive test suite for the Go Bulk Data Generator project.

## 📋 Test Coverage

The test suite covers all major components of the bulk data generator:

### 🔧 Core Generator Tests (`internal/generator`)
- **Configuration Testing**: Validates BulkGenerator initialization with various configurations
- **Record Generation**: Tests all supported table types (incident, case, hr_case, change_request, knowledge_article)
- **Batch Processing**: Tests concurrent batch generation and error handling
- **Data Validation**: Ensures generated records have proper field values, formats, and constraints
- **Date Generation**: Tests random date generation with proper formatting
- **Error Handling**: Tests unsupported table types and error recovery

### 🤖 LLM Integration Tests (`internal/llm`)
- **Client Initialization**: Tests OpenRouter client setup with various configurations
- **Fallback Behavior**: Tests graceful degradation when API key is missing
- **Text Generation**: Tests various text generation scenarios (descriptions, close notes, etc.)
- **JSON Parsing**: Tests JSON response parsing and error recovery
- **Category-Specific Logic**: Tests specialized fallback logic for different record categories

### 📊 CSV Output Tests (`pkg/csv`)
- **Writer Creation**: Tests CSV file creation and initialization
- **Header Management**: Tests header setting and validation for different table types
- **Record Writing**: Tests writing individual and batch records
- **Data Integrity**: Validates CSV output contains expected data
- **Error Handling**: Tests behavior with unsupported record types
- **File Operations**: Tests proper file closing and cleanup

## 🚀 Running Tests

### Quick Test Run
```bash
# Run all tests
go test ./...

# Run tests with verbose output
go test ./... -v

# Run specific package tests
go test ./internal/generator -v
go test ./internal/llm -v
go test ./pkg/csv -v
```

### Comprehensive Test Suite
```bash
# Make script executable (first time only)
chmod +x run_tests.sh

# Run full test suite with benchmarks and coverage
./run_tests.sh
```

### Test Script Features
The `run_tests.sh` script provides:
- **Verbose Testing**: Shows detailed test execution
- **Benchmark Testing**: Performance measurements for key operations
- **Coverage Analysis**: Code coverage reporting
- **Race Detection**: Concurrent access safety testing

## 📈 Benchmark Tests

The test suite includes benchmark tests for performance-critical operations:

### Generator Benchmarks
- `BenchmarkGenerateIncidentRecord`: Measures incident record generation speed
- `BenchmarkGenerateCaseRecord`: Measures case record generation speed  
- `BenchmarkGenerateBatch`: Measures batch processing performance

### LLM Benchmarks
- `BenchmarkGenerateTextFallback`: Measures fallback text generation speed
- `BenchmarkGenerateIncidentDescriptionsFallback`: Measures description generation speed
- `BenchmarkFallbackIncidentDescriptions`: Measures fallback logic performance

### CSV Benchmarks
- `BenchmarkWriteIncidentRecord`: Measures CSV writing performance

## 🧪 Test Data and Scenarios

### Incident Records
- Tests all required fields (caller, category, description, dates, etc.)
- Validates impact/urgency ranges (1-4)
- Tests proper incident state values
- Validates date format (YYYY-MM-DD HH:MM:SS)

### Case Records  
- Tests CSM case number format (CS prefix)
- Validates priority ranges (1-5)
- Tests account and contact information
- Validates case state transitions

### HR Case Records
- Tests HR case number format (HRC prefix)
- Validates HR service types (employee_relations, benefits, payroll, etc.)
- Tests due date calculations
- Validates priority ranges (1-4)

### Change Request Records
- Tests change number format (CHG prefix)
- Validates comprehensive LLM-generated sections (justification, implementation plan, etc.)
- Tests risk levels (Low, Medium, High, Very High)
- Validates change categories and workflow states

### Knowledge Article Records
- Tests knowledge base article number format (KB prefix)
- Validates HTML content structure
- Tests article categories and workflow states
- Validates publication dates and author information

## 🔍 Test Validation

### Data Integrity Checks
- **Field Presence**: Ensures all required fields are populated
- **Format Validation**: Checks date formats, number formats, etc.
- **Range Validation**: Validates numeric fields are within expected ranges
- **Enum Validation**: Checks choice field values against valid options

### Error Handling Tests
- **Unsupported Tables**: Tests graceful handling of unknown table types
- **Missing API Keys**: Tests fallback behavior when LLM API is unavailable
- **Invalid Data**: Tests error recovery for malformed inputs

### Performance Tests
- **Concurrent Processing**: Tests thread safety and concurrent batch generation
- **Memory Usage**: Benchmark tests include memory allocation tracking
- **Throughput**: Measures records generated per second

## 📝 Test Results Interpretation

### Success Criteria
- ✅ All tests pass without errors
- ✅ Generated records contain valid, realistic data
- ✅ CSV output is properly formatted and complete
- ✅ Fallback mechanisms work when LLM API is unavailable
- ✅ Performance benchmarks meet acceptable thresholds

### Common Test Scenarios
1. **No API Key**: Tests run with empty API key to validate fallback behavior
2. **Concurrent Generation**: Multiple goroutines generate records simultaneously
3. **Large Batches**: Tests handle batch sizes up to configured limits
4. **File I/O**: Tests create, write, and clean up temporary files

## 🛠 Adding New Tests

### For New Table Types
1. Add record generation test in `bulk_generator_test.go`
2. Add CSV header test in `csv_test.go`
3. Add LLM fallback test in `openrouter_test.go`
4. Update benchmark tests for performance measurement

### For New Features
1. Create focused unit tests for the specific functionality
2. Add integration tests that test the feature end-to-end
3. Include error handling and edge case tests
4. Add performance benchmarks if applicable

## 📊 Coverage Goals

The test suite aims for:
- **>90% Code Coverage**: Most code paths should be tested
- **100% Critical Path Coverage**: All main functionality must be tested
- **Error Path Coverage**: All error conditions should be tested
- **Performance Baseline**: Benchmarks establish performance expectations

## 🔧 Continuous Integration

The test suite is designed to run in CI/CD environments:
- **Fast Execution**: Tests complete in under 30 seconds
- **No External Dependencies**: Tests work without internet or external services
- **Clean Cleanup**: All temporary files are properly removed
- **Deterministic Results**: Tests produce consistent results across runs
