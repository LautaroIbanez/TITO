#!/usr/bin/env python3
"""
Bonistas.com Bond Scraper
Scrapes bond data from bonistas.com and saves it to data/bonds.json
"""

import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
import re
from typing import List, Dict, Optional

class BonistasScraper:
    def __init__(self):
        self.base_url = "https://bonistas.com"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.pages = ["/bonos-bopreal-hoy", "/bonos-cer-hoy"]

    def get_bond_list(self) -> List[Dict]:
        bonds_dict = {}  # Dictionary to prevent duplicates: (ticker, currency) -> bond
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        for page in self.pages:
            page_bonds = []
            try:
                url = f"{self.base_url}{page}"
                print(f"[{timestamp}] Scraping {url}...")
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find all <script> tags
                scripts = soup.find_all('script')
                for script in scripts:
                    if not script.string:
                        continue
                    # Look for JS arrays/objects with bond data
                    # Try to find a JS array assignment, e.g. var bonos = [...] or window.__INITIAL_STATE__ = {...}
                    # We'll look for arrays of objects with ISIN, ticker, etc.
                    matches = re.findall(r'(\[\{[\s\S]*?\}\])', script.string)
                    for match in matches:
                        try:
                            # Clean up JS to JSON (single to double quotes, remove trailing commas)
                            json_str = match.replace("'", '"')
                            json_str = re.sub(r',\s*([}\]])', r'\1', json_str)  # Remove trailing commas
                            data = json.loads(json_str)
                            # Heuristic: look for objects with 'ticker' or 'isin'
                            for bond in data:
                                if isinstance(bond, dict) and ('ticker' in bond or 'isin' in bond):
                                    parsed = self.parse_bond(bond)
                                    if parsed:
                                        page_bonds.append(parsed)
                        except Exception:
                            continue
                
                # Fallback: try to parse tables if present
                if not page_bonds:
                    tables = soup.find_all('table')
                    for table in tables:
                        headers = [th.get_text(strip=True) for th in table.find_all('th')]
                        for row in table.find_all('tr')[1:]:
                            cells = [td.get_text(strip=True) for td in row.find_all('td')]
                            if len(cells) == len(headers):
                                bond = dict(zip(headers, cells))
                                parsed = self.parse_bond(bond)
                                if parsed:
                                    page_bonds.append(parsed)
                
                # Add unique bonds from this page
                for bond in page_bonds:
                    key = (bond['ticker'], bond['currency'])
                    if key not in bonds_dict:
                        bonds_dict[key] = bond
                        print(f"[{timestamp}] {page}: Added {bond['ticker']} - Price: {bond.get('price', 'N/A')}, TIR: {bond.get('tir', 'N/A')}, TNA: {bond.get('tna', 'N/A')}")
                    else:
                        print(f"[{timestamp}] {page}: Skipped duplicate {bond['ticker']}")
                
                print(f"[{timestamp}] Found {len(page_bonds)} bonds from {page}, {len([b for b in page_bonds if (b['ticker'], b['currency']) not in bonds_dict])} duplicates skipped")
                
            except Exception as e:
                print(f"[{timestamp}] Error scraping {page}: {e}")
        
        bonds = list(bonds_dict.values())
        print(f"[{timestamp}] Total unique bonds: {len(bonds)}")
        return bonds

    def parse_bond(self, bond: dict) -> Optional[Dict]:
        # Try to map the bond dict to our schema
        try:
            # Enhanced mapping for bondData entries
            parsed_bond = {
                "id": bond.get("ticker") or bond.get("isin") or bond.get("id") or "UNKNOWN",
                "ticker": bond.get("ticker") or "UNKNOWN",
                "name": bond.get("nombre") or bond.get("name") or bond.get("descripcion") or "Unknown Bond",
                "issuer": bond.get("emisor") or bond.get("issuer") or "Desconocido",
                "maturityDate": bond.get("vencimiento") or bond.get("maturity") or bond.get("maturityDate") or "",
                "couponRate": self.try_float(bond.get("cupón") or bond.get("cupon") or bond.get("coupon") or bond.get("tasa")),
                "price": self.try_float(bond.get("last_price") or bond.get("precio") or bond.get("price") or bond.get("bcba")),
                "currency": bond.get("moneda") or bond.get("currency") or "ARS",
                "bcbaPrice": self.try_float(bond.get("bcba") or bond.get("precioBCBA")),
                "mepPrice": self.try_float(bond.get("mep") or bond.get("precioMEP")),
                "cclPrice": self.try_float(bond.get("ccl") or bond.get("precioCCL")),
                "tna": self.try_float(bond.get("tna") or bond.get("TNA")),
                "duration": self.try_float(bond.get("modified_duration") or bond.get("duration") or bond.get("duracion")),
                "difference": self.try_float(bond.get("day_difference") or bond.get("difference") or bond.get("dif")),
                "tir": self.try_float(bond.get("tir") or bond.get("TIR")),
                "mtir": self.try_float(bond.get("mtir") or bond.get("MTIR")),
                "volume": self.try_float(bond.get("volume") or bond.get("vol")),
                "parity": self.try_float(bond.get("parity") or bond.get("paridad")),
                "ttir": self.try_float(bond.get("ttir") or bond.get("TTIR")),
                "uptir": self.try_float(bond.get("uptir") or bond.get("upTTir")),
            }
            
            # Multiply percentage fields by 100
            percentage_fields = ['tir', 'mtir', 'tna', 'ttir', 'uptir']
            for field in percentage_fields:
                if parsed_bond[field] is not None:
                    parsed_bond[field] = parsed_bond[field] * 100
            
            return parsed_bond
        except Exception as e:
            print(f"Error parsing bond: {e}")
            return None

    def try_float(self, value):
        try:
            if value is None:
                return None
            if isinstance(value, (int, float)):
                return float(value)
            # Remove % and $ and commas
            value = re.sub(r'[%$,]', '', str(value))
            return float(value)
        except Exception:
            return None

    def save_bonds_data(self, bonds: List[Dict], output_path: str = "data/bonds.json"):
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            data = {
                "bonds": bonds,
                "lastUpdated": datetime.now().isoformat(),
                "source": "bonistas.com",
                "totalBonds": len(bonds)
            }
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Successfully saved {len(bonds)} bonds to {output_path}")
            return True
        except Exception as e:
            print(f"Error saving bonds data: {e}")
            return False

def main():
    print("Starting Bonistas bond scraper...")
    scraper = BonistasScraper()
    bonds = scraper.get_bond_list()
    if bonds:
        success = scraper.save_bonds_data(bonds)
        if success:
            print("Bond scraping completed successfully!")
        else:
            print("Failed to save bond data!")
    else:
        print("No bonds found!")

if __name__ == "__main__":
    main() 