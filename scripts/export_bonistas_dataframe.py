#!/usr/bin/env python3
"""
Export Bonistas Data to DataFrame
Loads data/bonds.json and creates a pandas DataFrame with specific columns
"""

import json
import pandas as pd
import argparse
import os
from typing import List, Dict

def load_bonds_data(file_path: str = "data/bonds.json") -> List[Dict]:
    """Load bonds data from JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('bonds', [])
    except FileNotFoundError:
        print(f"Error: {file_path} not found. Run scrape_bonistas.py first.")
        return []
    except Exception as e:
        print(f"Error loading bonds data: {e}")
        return []

def create_dataframe(bonds: List[Dict]) -> pd.DataFrame:
    """Create DataFrame with specified columns"""
    if not bonds:
        return pd.DataFrame()
    
    # Define the required columns and their mappings
    column_mappings = {
        'Ticker': 'ticker',
        'Precio': 'price',
        'Dif': 'difference',
        'TIR': 'tir',
        'TEM': 'mtir',
        'TNA': 'tna',
        'MD': 'duration',
        'Vol(M)': 'volume',
        'Paridad': 'parity',
        'VT': 'volume',  # Assuming VT is volume
        'TTIr': 'ttir',
        'upTTir': 'uptir'
    }
    
    # Create DataFrame with mapped columns
    df_data = []
    for bond in bonds:
        row = {}
        for df_col, bond_key in column_mappings.items():
            row[df_col] = bond.get(bond_key)
        df_data.append(row)
    
    df = pd.DataFrame(df_data)
    
    # Clean up the data
    df = df.replace([None, 'UNKNOWN', ''], pd.NA)
    
    return df

def save_dataframe(df: pd.DataFrame, output_path: str = None):
    """Save DataFrame to CSV if output path is provided"""
    if output_path:
        try:
            df.to_csv(output_path, index=False, encoding='utf-8')
            print(f"DataFrame saved to {output_path}")
        except Exception as e:
            print(f"Error saving DataFrame: {e}")
    else:
        print("\nDataFrame Preview:")
        print(df.head())
        print(f"\nShape: {df.shape}")
        print(f"Columns: {list(df.columns)}")

def main():
    parser = argparse.ArgumentParser(description='Export Bonistas bonds data to DataFrame')
    parser.add_argument('--output', '-o', type=str, help='Output CSV file path')
    parser.add_argument('--input', '-i', type=str, default='data/bonds.json', 
                       help='Input JSON file path (default: data/bonds.json)')
    
    args = parser.parse_args()
    
    print("Loading bonds data...")
    bonds = load_bonds_data(args.input)
    
    if not bonds:
        print("No bonds data found. Exiting.")
        return
    
    print(f"Creating DataFrame from {len(bonds)} bonds...")
    df = create_dataframe(bonds)
    
    if df.empty:
        print("No valid data found in bonds.")
        return
    
    save_dataframe(df, args.output)

if __name__ == "__main__":
    main() 