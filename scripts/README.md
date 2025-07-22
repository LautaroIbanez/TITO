# Scripts

This directory contains various utility scripts for data management, scraping, and migration.

## Net Gains Migration (`migrate-net-gains.ts`)

### Overview
Migration script to recompute all portfolio history files using the new cumulative daily differences approach for net gains calculation.

### Purpose
This script updates existing portfolio history files to use the new cumulative gains calculation method, ensuring consistency across all components.

### What It Does
1. Loads all existing portfolio history files from `data/history/`
2. Recomputes `ganancias_netas_ars` and `ganancias_netas_usd` using `calculateCumulativeNetGains`
3. Updates each record with cumulative gains up to that point in time
4. Saves the updated files back to disk

### Usage
```bash
# Run the migration
npx tsx scripts/migrate-net-gains.ts
```

### When to Use
- After deploying the new cumulative gains calculation system
- When you need to ensure all history files are consistent with the new approach
- Before running the application with the updated DashboardSummary component

### Output
The script will:
- Process each `.json` file in `data/history/`
- Display progress for each file
- Show final cumulative gains for each user
- Confirm successful migration

### Example Output
```
Starting net gains migration...
History directory: /path/to/data/history
Found 3 history files to migrate.
Processing user1.json...
  Updated 15 records
  Final cumulative gains: ARS 1250.50, USD 45.20
Processing user2.json...
  Updated 8 records
  Final cumulative gains: ARS 890.30, USD 32.10
Processing user3.json...
  Updated 22 records
  Final cumulative gains: ARS 2100.75, USD 78.90

Migration completed successfully!

Note: All portfolio history files have been updated to use the new
cumulative daily differences approach for net gains calculation.
This ensures consistency with the new DashboardSummary and chart components.
```

## Bond Scraper

This directory contains scripts for scraping financial data, including the Bonistas bond scraper.

## Bonistas Scraper (`scrape_bonistas.py`)

### Overview
The Bonistas scraper downloads bond data from bonistas.com and saves it to `data/bonds.json` with enhanced pricing information.

### Features
- Scrapes bond data from bonistas.com
- Extracts multiple pricing options (BCBA, MEP, CCL)
- Includes technical indicators (TNA, duration, TIR, MTIR, etc.)
- Enhanced field mapping for bondData entries
- Saves data with metadata (last updated, source, total bonds)
- Respectful scraping with delays between requests

### How It Works (2024)
- The scraper fetches the pages `/bonos-bopreal-hoy` and `/bonos-cer-hoy` from bonistas.com.
- It parses `<script>` tags on those pages, looking for embedded JavaScript arrays or objects containing bond data.
- The script attempts to convert these JavaScript arrays to JSON and extract all bond entries.
- All bonds found are included in the output (no artificial limit).
- The scraper no longer uses mock data; all data is scraped live from the site.
- Each page is processed independently with fallback table parsing per page.

### Enhanced Field Mapping
The scraper now maps additional fields from bondData entries:
- `last_price` → `price`
- `day_difference` → `difference`
- `tir`, `mtir`, `tna`, `modified_duration`, `volume`, `parity`, `ttir`, `uptir`

### Percentage Field Processing
Percentage fields (`tir`, `mtir`, `tna`, `ttir`, `uptir`) are automatically multiplied by 100 during parsing to convert from decimal to percentage format.

### Duplicate Prevention
The scraper maintains a dictionary keyed by `(ticker, currency)` to prevent inserting duplicate bonds. Only unique bonds are appended to the final list before saving.

### Troubleshooting
- If the site structure changes, the scraper may fail to find or parse bond data. In that case, inspect the HTML and update the extraction logic in `scrape_bonistas.py`.
- Network errors or timeouts will be logged and skipped.
- If no bonds are found, check that bonistas.com is online and that the relevant pages still contain bond data in `<script>` tags.

### Dependencies
Install the required Python packages:
```bash
pip install -r requirements.txt
```

### Usage
Run the scraper manually:
```bash
python3 scripts/scrape_bonistas.py
```

### Data Structure
The scraper generates bond data with the following structure:
```json
{
  "bonds": [
    {
      "id": "AL30",
      "ticker": "AL30",
      "name": "Bonar 2030 Ley Arg.",
      "issuer": "Gobierno de Argentina",
      "maturityDate": "2030-07-09",
      "couponRate": 7.5,
      "price": 50000,
      "currency": "ARS",
      "bcbaPrice": 50000,
      "mepPrice": 45.0,
      "cclPrice": 42.0,
      "tna": 7.5,
      "duration": 6.5,
      "difference": 0.5,
      "tir": 15.2,
      "mtir": 12.8,
      "volume": 1000000,
      "parity": 95.5,
      "ttir": 14.5,
      "uptir": 16.0
    }
  ],
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "source": "bonistas.com",
  "totalBonds": 5
}
```

### API Integration
The `/api/bonds` endpoint automatically runs the scraper if the data is older than 24 hours, ensuring fresh data is always available.

### API Endpoints
- **`GET /api/bonds`**: Main endpoint that returns processed bond data for the frontend
- **`GET /api/bonds/raw`**: Raw endpoint that returns the contents of `data/bonds.json` without transformation, useful for debugging or direct data access

### Data Files
- **`data/bonds.json`**: Main bond data file generated by the scraper
- **`public/data/bonistas_bonds.json`**: Public copy of bond data for fallback access

### Development Notes
- If bonistas.com changes its structure, update the extraction logic in `scrape_bonistas.py`.
- Add proper error handling and rate limiting for production use.

## DataFrame Export (`export_bonistas_dataframe.py`)

### Overview
Exports bond data from `data/bonds.json` to a pandas DataFrame with specific columns.

### Features
- Loads bond data from JSON file
- Creates DataFrame with columns: Ticker, Precio, Dif, TIR, TEM, TNA, MD, Vol(M), Paridad, VT, TTIr, upTTir
- Optional CSV export
- Data cleaning and validation

### Usage
```bash
# Preview DataFrame
python3 scripts/export_bonistas_dataframe.py

# Export to CSV
python3 scripts/export_bonistas_dataframe.py --output bonds_data.csv

# Use custom input file
python3 scripts/export_bonistas_dataframe.py --input custom_bonds.json --output output.csv
```

### Dependencies
- pandas>=2.0.0

## Selenium Scraper (`selenium_scrape_bonistas.py`)

### Overview
Advanced scraper using Selenium WebDriver to extract table data from bonistas.com.

### Features
- Uses Chrome WebDriver in headless mode
- Waits for table to load and scrolls horizontally to reveal all columns
- Extracts complete table data
- Saves to both CSV and JSON formats

### Setup
1. Install Chrome browser
2. Download ChromeDriver from https://chromedriver.chromium.org/
3. Add ChromeDriver to your PATH or place it in the scripts directory
4. Install dependencies:
```bash
pip install selenium pandas
```

### Usage
```bash
# Run in headless mode (default)
python3 scripts/selenium_scrape_bonistas.py

# Run with visible browser
python3 scripts/selenium_scrape_bonistas.py --no-headless

# Specify output file
python3 scripts/selenium_scrape_bonistas.py --output my_bonds_data.csv
```

### Dependencies
- selenium>=4.15.0
- pandas>=2.0.0
- Chrome browser and ChromeDriver 