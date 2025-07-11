# Bond Scraper

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