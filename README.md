# NOW Dynamic Data Generator

A comprehensive toolkit for ServiceNow data generation and management, featuring both a high-performance Go bulk data generator and ServiceNow server-side scripts for field analysis and data generation.

## 🎯 Components

### 1. Go Bulk Data Generator
A high-performance, concurrent bulk data generator for ServiceNow tables. Generate realistic test data for ServiceNow development, testing, and demonstrations with LLM-powered descriptions.

### 2. ServiceNow Scripts
Server-side JavaScript utilities for ServiceNow field analysis, data generation, and mass operations.

## 🚀 Features

- **High Performance**: Concurrent processing with configurable batch sizes
- **Multiple Output Formats**: Excel (.xlsx) and CSV support
- **LLM Integration**: OpenRouter API integration for realistic descriptions
- **Cross-Platform**: Builds for Windows, macOS, and Linux
- **ServiceNow Compatible**: Generates data in ServiceNow import format
- **Split Output**: Option to separate closed and open records
- **Fallback Mode**: Works without API key using realistic fallback data
- **Comprehensive Test Suite**: 29 test functions with 100% coverage

## 📋 Supported Tables

- **Incident** (`incident`): IT Service Management incidents with realistic technical issues
- **Case** (`case`): Customer Service Management cases with account relationships
- **HR Case** (`hr_case`): Human Resources cases for employee services
- **Change Request** (`change_request`): Change management with comprehensive planning
- **Knowledge Article** (`knowledge_article`): Knowledge base articles with structured content

## 📦 Installation

### Option 1: Download Pre-built Binaries (Recommended)

Download the latest release from the [GitHub Releases page](https://github.com/michaelbuckner/NOW-Dynamic-Data-Generator/releases):

- **Windows (64-bit)**: `bulk-generator-windows-amd64.exe`
- **macOS (Intel)**: `bulk-generator-darwin-amd64`
- **macOS (Apple Silicon)**: `bulk-generator-darwin-arm64`
- **Linux (64-bit)**: `bulk-generator-linux-amd64`

No installation required - just download and run! The binaries are statically compiled and include all dependencies.

#### Quick Start:
```bash
# Windows
.\bulk-generator-windows-amd64.exe --help

# macOS/Linux (make executable first)
chmod +x bulk-generator-darwin-amd64  # or your platform's binary
./bulk-generator-darwin-amd64 --help
```

### Option 2: Build from Source

Requirements:
- Go 1.21 or later

```bash
# Clone the repository
git clone https://github.com/michaelbuckner/NOW-Dynamic-Data-Generator.git
cd NOW-Dynamic-Data-Generator

# Install dependencies
go mod download

# Build for current platform
go build -o bulk-generator ./cmd

# Or use the build scripts for cross-platform builds
chmod +x build.sh
./build.sh
```

## 🎯 Usage

### Basic Usage

```bash
# Generate 1000 incident records
./bulk-generator --table incident --count 1000 --output incidents.xlsx

# Generate 500 case records
./bulk-generator --table case --count 500 --output cases.xlsx

# Generate HR cases
./bulk-generator --table hr_case --count 100 --output hr-cases.xlsx

# Generate change requests
./bulk-generator --table change_request --count 50 --output changes.xlsx

# Generate knowledge articles
./bulk-generator --table knowledge_article --count 25 --output kb-articles.xlsx

# Generate CSV output
./bulk-generator --table incident --count 100 --output incidents.csv
```

### Advanced Usage

```bash
# Use OpenRouter API for realistic descriptions
export OPENROUTER_API_KEY="your-api-key-here"
./bulk-generator --table incident --count 1000 --model "google/gemini-2.0-flash-001"

# Split output into separate files for closed and open records
./bulk-generator --table case --count 1000 --split --closed 40 --output cases.xlsx
# Creates: cases-closed.xlsx and cases-open.xlsx

# Custom batch size for memory management
./bulk-generator --table incident --count 10000 --batch 500 --output large-dataset.xlsx

# Pass API key directly
./bulk-generator --table case --count 100 --api-key "your-key" --output cases.xlsx
```

## ⚙️ Command Line Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--output` | `-o` | `bulk-data.xlsx` | Output file name |
| `--count` | `-c` | `10000` | Number of records to generate |
| `--batch` | `-b` | `1000` | Batch size for processing |
| `--table` | `-t` | `incident` | Table name (incident, case, hr_case, change_request, knowledge_article) |
| `--closed` | | `30` | Percentage of closed records (0-100) |
| `--split` | | `false` | Split output into separate files |
| `--model` | `-m` | `google/gemini-2.0-flash-001` | LLM model to use |
| `--api-key` | `-k` | | OpenRouter API key |

## 🌍 Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key for LLM integration

## ⚡ Performance

The generator provides excellent performance through concurrent processing:

- **Concurrent Processing**: Generates multiple records simultaneously
- **Memory Efficient**: Processes data in configurable batches
- **Fast I/O**: Optimized Excel and CSV writing
- **Low Resource Usage**: Minimal memory footprint

### Benchmarks

Typical performance on modern hardware:

| Records | Format | Time | Memory |
|---------|--------|------|--------|
| 1,000 | Excel | ~30s | ~50MB |
| 10,000 | Excel | ~4min | ~200MB |
| 100,000 | CSV | ~15min | ~500MB |

*Performance varies based on LLM API response times and system specifications.*

## 📊 Output Format

### Excel Output
- Professional formatting with headers
- Optimized for ServiceNow import
- Supports large datasets (1M+ rows)

### CSV Output
- Standard comma-separated values
- UTF-8 encoding
- Compatible with Excel and other tools

## 🤖 LLM Integration

The generator uses OpenRouter API to create realistic:
- Short descriptions
- Detailed descriptions
- Close notes and resolution details
- Change request planning (justification, implementation, risk analysis, backout plans, test plans)
- Knowledge article content with structured HTML

### Supported Models
- `google/gemini-2.0-flash-001` (default)
- `anthropic/claude-3-haiku`
- `openai/gpt-4o-mini`
- Any OpenRouter-compatible model

### Fallback Mode
When no API key is provided, the generator uses:
- Realistic fallback descriptions
- Category-specific templates
- Randomized but logical data

## 📋 Data Quality

Generated records include:

### Incident Records
- Realistic technical issues and resolutions
- Proper impact/urgency/priority relationships
- ServiceNow workflow states
- Assignment groups and technicians

### Case Records
- Customer account relationships
- Contact information and communication preferences
- Service organization assignments
- Escalation and resolution tracking

### HR Case Records
- Employee relations scenarios
- Benefits and payroll issues
- Compliance and training requests
- Due date calculations

### Change Request Records
- Comprehensive change planning with 5 LLM-generated sections:
  - **Justification**: Business case for the change
  - **Implementation Plan**: Step-by-step execution details
  - **Risk Analysis**: Potential risks and mitigation strategies
  - **Backout Plan**: Rollback procedures if needed
  - **Test Plan**: Validation and testing approach
- Risk assessments and approval workflows
- Configuration item relationships

### Knowledge Article Records
- Structured HTML content with headings and lists
- Technical procedures and troubleshooting guides
- Keywords and metadata
- Publication workflows and author attribution

## 📜 ServiceNow Scripts

The `src/servicenow/` directory contains server-side JavaScript utilities for ServiceNow:

### Available Scripts

- **ExportTableFieldInfo.js**: Export field information from ServiceNow tables
- **NowAbstractDataGenerator.js**: Abstract base class for data generation
- **NowDataGenerator.js**: Core data generation utilities
- **NowFieldInfoGatherer.js**: Gather field metadata and choice lists
- **NowMassSummarize.js**: Mass operations for data summarization

### Usage

These scripts are designed to be run within ServiceNow as server-side JavaScript. They provide utilities for:

- Analyzing table structures and field definitions
- Gathering choice list values and reference data
- Performing mass data operations
- Generating realistic test data within ServiceNow

## 🧪 Testing

The project includes a comprehensive test suite with 29 test functions:

```bash
# Run all tests
go test ./...

# Run tests with verbose output
go test ./... -v

# Run full test suite with benchmarks and coverage
./run_tests.sh
```

See [TEST_SUITE.md](TEST_SUITE.md) for detailed testing documentation.

## 🔧 Troubleshooting

### Common Issues

1. **API Rate Limits**: Reduce batch size with `--batch 100`
2. **Memory Issues**: Use smaller batches or CSV output
3. **Permission Errors**: Ensure write access to output directory
4. **Large Files**: Excel has ~1M row limit, use CSV for larger datasets

### Debug Mode

```bash
# Enable verbose output
./bulk-generator --table incident --count 100 -v

# Check API connectivity
./bulk-generator --table incident --count 1 --api-key "test-key"
```

## 🚀 Creating Releases (Maintainers)

This project uses GitHub Actions to automatically build cross-platform binaries and create releases. To create a new release:

### Using the Release Script (Recommended)

```bash
# Make sure you're on the main branch with latest changes
git checkout main
git pull origin main

# Create and push a new release tag
./create-release.sh v1.0.0
```

The script will:
1. Validate the version tag format (vX.Y.Z)
2. Check for uncommitted changes
3. Run the test suite
4. Create and push the git tag
5. Trigger the GitHub Actions workflow

### Manual Release Process

```bash
# Create a tag
git tag -a v1.0.0 -m "Release v1.0.0"

# Push the tag
git push origin v1.0.0
```

### What Happens Next

The GitHub Actions workflow will automatically:
1. Build binaries for all four platforms (Windows, macOS Intel, macOS ARM, Linux)
2. Run tests to ensure quality
3. Create a GitHub release with auto-generated release notes
4. Attach all binaries to the release

Monitor the build progress at: https://github.com/michaelbuckner/NOW-Dynamic-Data-Generator/actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run the test suite: `./run_tests.sh`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Review the [test suite documentation](TEST_SUITE.md)
3. Search existing [GitHub issues](https://github.com/michaelbuckner/NOW-Dynamic-Data-Generator/issues)
4. Create a new issue with detailed information

---

**Built with ❤️ for the ServiceNow community**
