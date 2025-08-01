@echo off
REM Simple script to generate sample data using the Bulk Data Generator

REM Install dependencies if they don't exist
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)

REM Default model is openai/gpt-3.5-turbo, but user can specify a different model
set MODEL=%1
if "%MODEL%"=="" set MODEL=openai/gpt-3.5-turbo

set API_KEY=%2
if "%API_KEY%"=="" set API_KEY=%OPENROUTER_API_KEY%

set TABLE=%3
if "%TABLE%"=="" set TABLE=incident

set COUNT=%4
if "%COUNT%"=="" set COUNT=1000

if "%API_KEY%"=="" (
  echo Warning: No OpenRouter API key provided.
  echo Please provide an API key as the second parameter or set the OPENROUTER_API_KEY environment variable.
  exit /b 1
)

REM Generate sample records
echo Generating %COUNT% %TABLE% records using OpenRouter model: %MODEL%...
node src\node\BulkDataGenerator.js --output=sample-data.csv --count=%COUNT% --table=%TABLE% --model=%MODEL% --apiKey=%API_KEY%

echo Done! Sample data has been written to sample-data.csv
echo You can now import this file into ServiceNow using System Import Sets ^> Load Data
