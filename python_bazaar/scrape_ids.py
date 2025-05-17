#!/usr/bin/env python3
"""
scrape_ids.py - Extracts player IDs from text input or uploaded CSV
"""

import re
import csv
import os
import sys
import logging

# Configure logging
logging.basicConfig(
    filename='errors.log',
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def extract_ids_from_text(text):
    """Extract 7-digit player IDs from text using regex"""
    # Pattern to match 7-digit numbers that are likely player IDs
    pattern = r'\b\d{7}\b'
    
    # Find all matches
    matches = re.findall(pattern, text)
    
    # Convert to integers
    player_ids = [int(match) for match in matches]
    
    # Remove duplicates while preserving order
    unique_ids = []
    seen = set()
    for id in player_ids:
        if id not in seen:
            seen.add(id)
            unique_ids.append(id)
    
    return unique_ids

def process_uploaded_csv(filename):
    """Process uploaded CSV file containing player IDs"""
    try:
        player_ids = []
        with open(filename, 'r', newline='') as csvfile:
            # Try to determine if there's a header and what column has the IDs
            sample = csvfile.read(1024)
            csvfile.seek(0)  # Reset file position
            
            # Check if file has a header
            has_header = csv.Sniffer().has_header(sample)
            
            # Try to detect the dialect
            dialect = csv.Sniffer().sniff(sample)
            
            reader = csv.reader(csvfile, dialect)
            
            # Skip header if present
            if has_header:
                header = next(reader)
                # Try to find a column that might contain player IDs
                id_col_idx = None
                for i, col in enumerate(header):
                    if 'id' in col.lower() or 'player' in col.lower():
                        id_col_idx = i
                        break
            
            # Process data rows
            for row in reader:
                if not row:  # Skip empty rows
                    continue
                    
                if id_col_idx is not None and id_col_idx < len(row):
                    # Extract from the identified column
                    value = row[id_col_idx].strip()
                    if value.isdigit() and len(value) == 7:
                        player_ids.append(int(value))
                else:
                    # Check each column for a 7-digit number
                    for cell in row:
                        cell = cell.strip()
                        if cell.isdigit() and len(cell) == 7:
                            player_ids.append(int(cell))
                            break
        
        return player_ids
        
    except Exception as e:
        logging.error(f"Error processing CSV file: {str(e)}")
        print(f"Error: Failed to process CSV file. See errors.log for details.")
        return []

def save_to_csv(player_ids, filename='trader_ids.csv'):
    """Save player IDs to CSV file"""
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
        new_ids = [id for id in player_ids if id not in existing_ids]
        
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
        
        print(f"Added {len(new_ids)} new player IDs to {filename}")
        print(f"Total unique player IDs in file: {len(existing_ids) + len(new_ids)}")
        
    except IOError as e:
        logging.error(f"File error: {str(e)}")
        print(f"Error: Failed to write to CSV file. See errors.log for details.")

def main():
    # Check if input file is provided
    if len(sys.argv) > 1 and os.path.isfile(sys.argv[1]):
        print(f"Processing file: {sys.argv[1]}")
        
        # Check file extension
        if sys.argv[1].lower().endswith('.csv'):
            player_ids = process_uploaded_csv(sys.argv[1])
        else:
            # Read text file
            with open(sys.argv[1], 'r') as f:
                text = f.read()
            player_ids = extract_ids_from_text(text)
    else:
        # Get input from user
        print("Enter text containing player IDs (format: Xanax - Seller: Test [1234567]):")
        print("Press Ctrl+D (Unix) or Ctrl+Z (Windows) followed by Enter when done.")
        
        lines = []
        try:
            while True:
                line = input()
                lines.append(line)
        except EOFError:
            pass
        
        text = '\n'.join(lines)
        player_ids = extract_ids_from_text(text)
    
    # Report results
    if player_ids:
        print(f"Found {len(player_ids)} unique player IDs")
        save_to_csv(player_ids)
    else:
        print("No player IDs found.")

if __name__ == "__main__":
    main()