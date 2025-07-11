#!/usr/bin/env python3
"""
Temporary script to explore bonistas.com structure
"""

import requests
from bs4 import BeautifulSoup
import json
import re

def explore_site():
    base_url = "https://bonistas.com"
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    
    # Focus on BOPREAL page which seems to have the most bond data
    print("=== Exploring BOPREAL Page ===")
    response = session.get(f"{base_url}/bonos-bopreal-hoy")
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Look for script tags that might contain bond data
    scripts = soup.find_all('script')
    print(f"Found {len(scripts)} script tags")
    
    # Look for JSON data in scripts
    for i, script in enumerate(scripts):
        if script.string and ('bono' in script.string.lower() or 'bond' in script.string.lower()):
            print(f"Script {i} contains bond-related data")
            # Extract potential JSON
            json_matches = re.findall(r'\{[^{}]*"bono"[^{}]*\}', script.string)
            if json_matches:
                print(f"Found JSON data in script {i}")
    
    # Look for divs with bond data
    bond_divs = soup.find_all('div', class_=lambda x: x and any(term in x.lower() for term in ['bono', 'bond', 'price', 'ticker']))
    print(f"Found {len(bond_divs)} divs with bond-related classes")
    
    # Look for specific bond tickers in the page
    page_text = soup.get_text()
    tickers = ['AL30', 'GD30', 'PARA', 'DISCO', 'BOPREAL', 'CER']
    found_tickers = []
    for ticker in tickers:
        if ticker in page_text:
            found_tickers.append(ticker)
    
    print(f"Found tickers: {found_tickers}")
    
    # Look for price patterns
    price_patterns = re.findall(r'\$[\d,]+\.?\d*', page_text)
    print(f"Found {len(price_patterns)} price patterns: {price_patterns[:10]}")
    
    # Look for percentage patterns (coupon rates)
    percentage_patterns = re.findall(r'\d+\.?\d*%', page_text)
    print(f"Found {len(percentage_patterns)} percentage patterns: {percentage_patterns[:10]}")
    
    # Save the page HTML for manual inspection
    with open('bopreal_page.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify())
    print("Saved page HTML to bopreal_page.html")

if __name__ == "__main__":
    explore_site() 