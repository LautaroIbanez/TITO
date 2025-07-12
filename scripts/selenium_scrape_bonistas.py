#!/usr/bin/env python3
"""
Selenium-based Bonistas.com Scraper
Uses Selenium WebDriver to load bonistas.com and extract table data
"""

import pandas as pd
import time
import argparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import json
from datetime import datetime
import os

class SeleniumBonistasScraper:
    def __init__(self, headless: bool = True):
        self.base_url = "https://bonistas.com"
        self.headless = headless
        self.driver = None
        
    def setup_driver(self):
        """Setup Chrome WebDriver with options"""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            return True
        except Exception as e:
            print(f"Error setting up Chrome driver: {e}")
            print("Make sure ChromeDriver is installed and in PATH")
            return False
    
    def wait_for_table(self, timeout: int = 30):
        """Wait for table to load"""
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.TAG_NAME, "table"))
            )
            return True
        except TimeoutException:
            print("Timeout waiting for table to load")
            return False
    
    def scroll_horizontally(self):
        """Scroll horizontally to reveal all columns"""
        try:
            # Find the table container
            table_container = self.driver.find_element(By.TAG_NAME, "table")
            
            # Get the scrollable parent
            scrollable = table_container.find_element(By.XPATH, "./..")
            
            # Scroll to the right to reveal all columns
            self.driver.execute_script("arguments[0].scrollLeft = arguments[0].scrollWidth;", scrollable)
            time.sleep(2)  # Wait for content to load
            
            return True
        except Exception as e:
            print(f"Error scrolling horizontally: {e}")
            return False
    
    def extract_table_data(self) -> pd.DataFrame:
        """Extract data from the table"""
        try:
            # Find the table
            table = self.driver.find_element(By.TAG_NAME, "table")
            
            # Get headers
            headers = []
            header_elements = table.find_elements(By.TAG_NAME, "th")
            for th in header_elements:
                headers.append(th.text.strip())
            
            # Get rows
            rows = []
            row_elements = table.find_elements(By.TAG_NAME, "tr")[1:]  # Skip header row
            
            for row in row_elements:
                cells = row.find_elements(By.TAG_NAME, "td")
                row_data = []
                for cell in cells:
                    row_data.append(cell.text.strip())
                
                if len(row_data) == len(headers):
                    rows.append(row_data)
            
            # Create DataFrame
            df = pd.DataFrame(rows, columns=headers)
            return df
            
        except Exception as e:
            print(f"Error extracting table data: {e}")
            return pd.DataFrame()
    
    def scrape_bonds(self) -> pd.DataFrame:
        """Main scraping method"""
        if not self.setup_driver():
            return pd.DataFrame()
        
        try:
            print("Loading bonistas.com...")
            self.driver.get(self.base_url)
            
            print("Waiting for table to load...")
            if not self.wait_for_table():
                return pd.DataFrame()
            
            print("Scrolling horizontally to reveal all columns...")
            self.scroll_horizontally()
            
            print("Extracting table data...")
            df = self.extract_table_data()
            
            if not df.empty:
                print(f"Successfully extracted {len(df)} rows")
                return df
            else:
                print("No data extracted from table")
                return pd.DataFrame()
                
        except Exception as e:
            print(f"Error during scraping: {e}")
            return pd.DataFrame()
        finally:
            if self.driver:
                self.driver.quit()
    
    def save_data(self, df: pd.DataFrame, output_path: str = None):
        """Save DataFrame to CSV and JSON"""
        if df.empty:
            print("No data to save")
            return
        
        # Save to CSV
        csv_path = output_path or "bonistas_selenium_data.csv"
        df.to_csv(csv_path, index=False, encoding='utf-8')
        print(f"Data saved to CSV: {csv_path}")
        
        # Save to JSON
        json_path = csv_path.replace('.csv', '.json')
        data = {
            "bonds": df.to_dict('records'),
            "lastUpdated": datetime.now().isoformat(),
            "source": "bonistas.com (selenium)",
            "totalBonds": len(df)
        }
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Data saved to JSON: {json_path}")

def main():
    parser = argparse.ArgumentParser(description='Selenium-based Bonistas scraper')
    parser.add_argument('--output', '-o', type=str, help='Output file path')
    parser.add_argument('--no-headless', action='store_true', help='Run browser in visible mode')
    
    args = parser.parse_args()
    
    print("Starting Selenium Bonistas scraper...")
    scraper = SeleniumBonistasScraper(headless=not args.no_headless)
    
    df = scraper.scrape_bonds()
    
    if not df.empty:
        scraper.save_data(df, args.output)
        print("Scraping completed successfully!")
    else:
        print("No data was scraped")

if __name__ == "__main__":
    main() 