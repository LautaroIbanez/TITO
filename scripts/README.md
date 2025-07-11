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
- Currently uses mock data for development/testing
- In production, update the extraction methods to match the actual bonistas.com HTML structure
- Add proper error handling and rate limiting for production use 