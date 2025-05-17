#!/usr/bin/env python3
"""
fetch_te_ids.py - Fetches active trader IDs from TornExchange API
"""

import requests
import csv
import os
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    filename='errors.log',
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def fetch_active_traders(api_key):
    """Fetch active traders from TornExchange API"""
    url = f"https://www.tornexchange.com/api/active_traders?key={api_key}"
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        data = response.json()
        
        if 'traders' not in data:
            logging.error(f"Unexpected API response format: {data}")
            print("Error: Unexpected API response format. See errors.log for details.")
            return []
            
        # Extract player IDs
        trader_ids = [trader['player_id'] for trader in data['traders'] if 'player_id' in trader]
        
        print(f"Successfully fetched {len(trader_ids)} trader IDs from TornExchange")
        return trader_ids
        
    except requests.exceptions.RequestException as e:
        logging.error(f"Request error: {str(e)}")
        print(f"Error: Failed to fetch data from TornExchange API. See errors.log for details.")
        return []
    except ValueError as e:
        logging.error(f"JSON parsing error: {str(e)}")
        print(f"Error: Invalid JSON response. See errors.log for details.")
        return []

def save_to_csv(trader_ids, filename='trader_ids.csv'):
    """Save trader IDs to CSV file"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else '.', exist_ok=True)
        
        # Check if file exists to determine if we need to write a header
        file_exists = os.path.isfile(filename)
        
        # Get existing IDs to avoid duplicates
        existing_ids = set()
        if file_exists:
            with open(filename, 'r', newline='') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    existing_ids.add(int(row['player_id']))
        
        # Filter out existing IDs
        new_ids = [id for id in trader_ids if id not in existing_ids]
        
        # Append to the file
        with open(filename, 'a', newline='') as csvfile:
            fieldnames = ['player_id']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            # Write header only if the file is new
            if not file_exists:
                writer.writeheader()
            
            # Write rows
            for player_id in new_ids:
                writer.writerow({'player_id': player_id})
        
        print(f"Added {len(new_ids)} new trader IDs to {filename}")
        print(f"Total unique trader IDs in file: {len(existing_ids) + len(new_ids)}")
        
    except IOError as e:
        logging.error(f"File error: {str(e)}")
        print(f"Error: Failed to write to CSV file. See errors.log for details.")

def main():
    # Check if API key is provided
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
    else:
        api_key = input("Enter your Torn Limited Access API key: ").strip()
    
    if not api_key:
        print("Error: API key is required.")
        return
    
    # Fetch trader IDs
    trader_ids = fetch_active_traders(api_key)
    
    # Save to CSV
    if trader_ids:
        save_to_csv(trader_ids)

if __name__ == "__main__":
    print(f"Fetching active traders from TornExchange - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    main()