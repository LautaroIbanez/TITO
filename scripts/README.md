# Bond Scraper

This directory contains scripts for scraping financial data, including the Bonistas bond scraper.

## Bonistas Scraper (`scrape_bonistas.py`)

### Overview
The Bonistas scraper downloads bond data from bonistas.com and saves it to `data/bonds.json` with enhanced pricing information.

### Features
- Scrapes bond data from bonistas.com
- Extracts multiple pricing options (BCBA, MEP, CCL)
- Includes technical indicators (TNA, duration)
- Saves data with metadata (last updated, source, total bonds)
- Respectful scraping with delays between requests

### How It Works (2024)
- The scraper fetches the pages `/bonos-bopreal-hoy` and `/bonos-cer-hoy` from bonistas.com.
- It parses `<script>` tags on those pages, looking for embedded JavaScript arrays or objects containing bond data.
- The script attempts to convert these JavaScript arrays to JSON and extract all bond entries.
- All bonds found are included in the output (no artificial limit).
- The scraper no longer uses mock data; all data is scraped live from the site.

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
      "duration": 6.5
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