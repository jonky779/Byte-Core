#!/usr/bin/env python3
"""
create_db.py - Creates the SQLite database for bazaar data
"""

import sqlite3
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    filename='errors.log',
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def create_database(db_path='bazaar.db'):
    """Create SQLite database for bazaar data"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create trader_ids table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS trader_ids (
            player_id INTEGER PRIMARY KEY,
            last_checked TEXT,
            active INTEGER DEFAULT 1
        )
        ''')
        
        # Create items table for item metadata
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS items (
            item_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            type TEXT,
            market_value INTEGER DEFAULT 0,
            last_updated TEXT
        )
        ''')
        
        # Create listings table for bazaar listings
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER,
            item_name TEXT NOT NULL,
            category TEXT,
            price INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            seller_id INTEGER,
            seller_name TEXT,
            market_value INTEGER DEFAULT 0,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (item_id) REFERENCES items (item_id),
            FOREIGN KEY (seller_id) REFERENCES trader_ids (player_id)
        )
        ''')
        
        # Create an index on category for faster queries
        cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_listings_category ON listings (category)
        ''')
        
        # Create an index on seller_id for faster queries
        cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings (seller_id)
        ''')
        
        # Create an index on item_id for faster queries
        cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_listings_item ON listings (item_id)
        ''')
        
        # Create a table for tracking scan history
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time TEXT NOT NULL,
            end_time TEXT,
            traders_scanned INTEGER DEFAULT 0,
            items_found INTEGER DEFAULT 0,
            status TEXT DEFAULT 'running'
        )
        ''')
        
        conn.commit()
        conn.close()
        
        print(f"Database created successfully at {db_path}")
        return True
    except Exception as e:
        logging.error(f"Database creation error: {str(e)}")
        print(f"Error: Failed to create database. See errors.log for details.")
        return False

def import_trader_ids_from_csv(db_path='bazaar.db', csv_path='trader_ids.csv'):
    """Import trader IDs from CSV to the database"""
    import csv
    
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Read existing player IDs from the database
        cursor.execute("SELECT player_id FROM trader_ids")
        existing_ids = {row[0] for row in cursor.fetchall()}
        
        # Read player IDs from CSV
        added_count = 0
        with open(csv_path, 'r', newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                player_id = int(row['player_id'])
                if player_id not in existing_ids:
                    cursor.execute(
                        "INSERT INTO trader_ids (player_id, last_checked) VALUES (?, ?)",
                        (player_id, None)
                    )
                    added_count += 1
        
        conn.commit()
        conn.close()
        
        print(f"Imported {added_count} new trader IDs to the database")
        return True
    except Exception as e:
        logging.error(f"CSV import error: {str(e)}")
        print(f"Error: Failed to import CSV data. See errors.log for details.")
        return False

def main():
    db_path = 'bazaar.db'
    csv_path = 'trader_ids.csv'
    
    # Create the database
    if create_database(db_path):
        # Import trader IDs if CSV exists
        if os.path.exists(csv_path):
            import_trader_ids_from_csv(db_path, csv_path)
        else:
            print(f"No trader IDs CSV found at {csv_path}")
            print("You can create one using fetch_te_ids.py or scrape_ids.py")

if __name__ == "__main__":
    print(f"Creating bazaar database - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    main()