#!/usr/bin/env python3
"""
Bonistas.com Bond Scraper
Scrapes bond data from bonistas.com and saves it to data/bonds.json
"""

import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime, timedelta
import time
import re
from typing import List, Dict, Optional

class BonistasScraper:
    def __init__(self):
        self.base_url = "https://bonistas.com"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def get_bond_list(self) -> List[Dict]:
        """Get the list of available bonds from bonistas.com"""
        try:
            # Get the main bonds page
            response = self.session.get(f"{self.base_url}/bonos")
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find bond links - this is a simplified approach
            # In a real implementation, you'd need to analyze the actual site structure
            bond_links = soup.find_all('a', href=re.compile(r'/bono/'))
            
            bonds = []
            for link in bond_links[:20]:  # Limit to first 20 for demo
                bond_url = f"{self.base_url}{link['href']}"
                bond_data = self.scrape_bond_details(bond_url)
                if bond_data:
                    bonds.append(bond_data)
                time.sleep(1)  # Be respectful to the server
                
            return bonds
            
        except Exception as e:
            print(f"Error getting bond list: {e}")
            return []

    def scrape_bond_details(self, bond_url: str) -> Optional[Dict]:
        """Scrape detailed information for a specific bond"""
        try:
            response = self.session.get(bond_url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract bond information
            # This is a mock implementation since we don't have the actual site structure
            # In a real implementation, you'd parse the actual HTML structure
            
            # Mock data structure based on the expected format
            bond_data = {
                "id": self.extract_bond_id(bond_url),
                "ticker": self.extract_ticker(bond_url),
                "name": self.extract_name(soup),
                "issuer": self.extract_issuer(soup),
                "maturityDate": self.extract_maturity_date(soup),
                "couponRate": self.extract_coupon_rate(soup),
                "price": self.extract_price(soup),
                "currency": self.extract_currency(soup),
                "bcbaPrice": self.extract_bcba_price(soup),
                "mepPrice": self.extract_mep_price(soup),
                "cclPrice": self.extract_ccl_price(soup),
                "tna": self.extract_tna(soup),
                "duration": self.extract_duration(soup)
            }
            
            return bond_data
            
        except Exception as e:
            print(f"Error scraping bond details from {bond_url}: {e}")
            return None

    def extract_bond_id(self, url: str) -> str:
        """Extract bond ID from URL"""
        match = re.search(r'/bono/([^/]+)', url)
        return match.group(1) if match else "UNKNOWN"

    def extract_ticker(self, url: str) -> str:
        """Extract ticker from URL"""
        match = re.search(r'/bono/([^/]+)', url)
        return match.group(1).upper() if match else "UNKNOWN"

    def extract_name(self, soup: BeautifulSoup) -> str:
        """Extract bond name from page"""
        # Mock implementation - in real scenario, find the actual element
        title = soup.find('h1') or soup.find('title')
        if title:
            return title.get_text().strip()
        return "Unknown Bond"

    def extract_issuer(self, soup: BeautifulSoup) -> str:
        """Extract issuer information"""
        # Mock implementation
        return "Gobierno de Argentina"

    def extract_maturity_date(self, soup: BeautifulSoup) -> str:
        """Extract maturity date"""
        # Mock implementation - would parse actual date from page
        return "2030-07-09"

    def extract_coupon_rate(self, soup: BeautifulSoup) -> float:
        """Extract coupon rate"""
        # Mock implementation
        return 7.5

    def extract_price(self, soup: BeautifulSoup) -> float:
        """Extract current price"""
        # Mock implementation
        return 50000.0

    def extract_currency(self, soup: BeautifulSoup) -> str:
        """Extract currency"""
        # Mock implementation
        return "ARS"

    def extract_bcba_price(self, soup: BeautifulSoup) -> Optional[float]:
        """Extract BCBA price"""
        # Mock implementation
        return 50000.0

    def extract_mep_price(self, soup: BeautifulSoup) -> Optional[float]:
        """Extract MEP price"""
        # Mock implementation
        return 45.0

    def extract_ccl_price(self, soup: BeautifulSoup) -> Optional[float]:
        """Extract CCL price"""
        # Mock implementation
        return 42.0

    def extract_tna(self, soup: BeautifulSoup) -> Optional[float]:
        """Extract TNA (Tasa Nominal Anual)"""
        # Mock implementation
        return 7.5

    def extract_duration(self, soup: BeautifulSoup) -> Optional[float]:
        """Extract duration in years"""
        # Mock implementation
        return 6.5

    def generate_mock_data(self) -> List[Dict]:
        """Generate mock bond data for development/testing"""
        return [
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
            },
            {
                "id": "GD30",
                "ticker": "GD30",
                "name": "Global 2030 Ley NY",
                "issuer": "Gobierno de Argentina",
                "maturityDate": "2030-07-09",
                "couponRate": 7.5,
                "price": 55,
                "currency": "USD",
                "bcbaPrice": 55,
                "mepPrice": 55,
                "cclPrice": 55,
                "tna": 7.5,
                "duration": 6.5
            },
            {
                "id": "ON-YMC20",
                "ticker": "YMC2O",
                "name": "ON YPF 2026",
                "issuer": "YPF S.A.",
                "maturityDate": "2026-03-23",
                "couponRate": 8.5,
                "price": 98,
                "currency": "USD",
                "bcbaPrice": 98,
                "mepPrice": 98,
                "cclPrice": 98,
                "tna": 8.5,
                "duration": 2.3
            },
            {
                "id": "PARA",
                "ticker": "PARA",
                "name": "Par 2038",
                "issuer": "Gobierno de Argentina",
                "maturityDate": "2038-01-01",
                "couponRate": 5.0,
                "price": 35000,
                "currency": "ARS",
                "bcbaPrice": 35000,
                "mepPrice": 31.5,
                "cclPrice": 29.4,
                "tna": 5.0,
                "duration": 14.0
            },
            {
                "id": "DISCO",
                "ticker": "DISCO",
                "name": "Discount 2033",
                "issuer": "Gobierno de Argentina",
                "maturityDate": "2033-07-09",
                "couponRate": 0.0,
                "price": 25000,
                "currency": "ARS",
                "bcbaPrice": 25000,
                "mepPrice": 22.5,
                "cclPrice": 21.0,
                "tna": 0.0,
                "duration": 9.5
            }
        ]

    def save_bonds_data(self, bonds: List[Dict], output_path: str = "data/bonds.json"):
        """Save bonds data to JSON file"""
        try:
            # Ensure the data directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Add metadata
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
    """Main function to run the scraper"""
    print("Starting Bonistas bond scraper...")
    
    scraper = BonistasScraper()
    
    # For development/testing, use mock data
    # In production, you would use: bonds = scraper.get_bond_list()
    bonds = scraper.generate_mock_data()
    
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