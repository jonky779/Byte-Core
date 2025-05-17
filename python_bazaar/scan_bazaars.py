#!/usr/bin/env python3
"""
scan_bazaars.py - Scans player bazaars and stores items in the database
"""

import requests
import sqlite3
import time
import sys
import os
import logging
import json
from datetime import datetime

# Configure logging
logging.basicConfig(
    filename='errors.log',
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Set up console logging for progress
import logging as console_logging
console_handler = console_logging.StreamHandler()
console_handler.setLevel(console_logging.INFO)
console_formatter = console_logging.Formatter('%(asctime)s - %(message)s')
console_handler.setFormatter(console_formatter)
console_logger = console_logging.getLogger('console')
console_logger.setLevel(console_logging.INFO)
console_logger.addHandler(console_handler)
console_logger.propagate = False

class BazaarScanner:
    def __init__(self, api_key, db_path='bazaar.db', delay=0.6):
        self.api_key = api_key
        self.db_path = db_path
        self.delay = delay  # Delay between API calls in seconds
        self.items_cache = {}  # Cache for item metadata
        self.scan_id = None  # Current scan ID in the database
        
        # Initialize database connection
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        
        # Create tables if they don't exist
        self._ensure_tables_exist()
        
    def _ensure_tables_exist(self):
        """Ensure all required tables exist in the database"""
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS trader_ids (
            player_id INTEGER PRIMARY KEY,
            last_checked TEXT,
            active INTEGER DEFAULT 1
        )
        ''')
        
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS items (
            item_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            type TEXT,
            market_value INTEGER DEFAULT 0,
            last_updated TEXT
        )
        ''')
        
        self.cursor.execute('''
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
        
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time TEXT NOT NULL,
            end_time TEXT,
            traders_scanned INTEGER DEFAULT 0,
            items_found INTEGER DEFAULT 0,
            status TEXT DEFAULT 'running'
        )
        ''')
        
        self.conn.commit()
        
    def _start_scan(self):
        """Start a new scan and record it in the database"""
        self.cursor.execute(
            "INSERT INTO scan_history (start_time, status) VALUES (?, ?)",
            (datetime.now().isoformat(), 'running')
        )
        self.conn.commit()
        self.scan_id = self.cursor.lastrowid
        console_logger.info(f"Started scan #{self.scan_id}")
        
    def _end_scan(self, traders_scanned, items_found):
        """Mark the current scan as complete"""
        self.cursor.execute(
            "UPDATE scan_history SET end_time = ?, traders_scanned = ?, items_found = ?, status = ? WHERE id = ?",
            (datetime.now().isoformat(), traders_scanned, items_found, 'completed', self.scan_id)
        )
        self.conn.commit()
        console_logger.info(f"Completed scan #{self.scan_id}: {traders_scanned} traders scanned, {items_found} items found")
        
    def _fetch_items_metadata(self):
        """Fetch Torn items metadata and cache it"""
        try:
            console_logger.info("Fetching items metadata from Torn API...")
            
            # Get items data from the Torn API
            url = f"https://api.torn.com/torn/?selections=items&key={self.api_key}"
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            if 'items' not in data:
                raise ValueError("Invalid response format - 'items' not found")
                
            # Process and store item metadata
            for item_id, item_data in data['items'].items():
                item_id = int(item_id)
                item = {
                    'id': item_id,
                    'name': item_data.get('name', 'Unknown'),
                    'category': item_data.get('type', 'Miscellaneous'),
                    'type': item_data.get('weapon_type', '') or item_data.get('drug_type', '') or '',
                    'market_value': item_data.get('market_value', 0)
                }
                
                # Add to cache
                self.items_cache[item_id] = item
                
                # Update database
                self.cursor.execute(
                    "INSERT OR REPLACE INTO items (item_id, name, category, type, market_value, last_updated) VALUES (?, ?, ?, ?, ?, ?)",
                    (item['id'], item['name'], item['category'], item['type'], item['market_value'], datetime.now().isoformat())
                )
            
            self.conn.commit()
            console_logger.info(f"Cached {len(self.items_cache)} items")
            return True
            
        except Exception as e:
            logging.error(f"Error fetching items metadata: {str(e)}")
            console_logger.error(f"Failed to fetch items metadata: {str(e)}")
            return False
            
    def _get_player_bazaar(self, player_id):
        """Fetch bazaar listings for a player"""
        try:
            url = f"https://api.torn.com/user/{player_id}?selections=bazaar&key={self.api_key}"
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Update the last checked timestamp for the player
            self.cursor.execute(
                "UPDATE trader_ids SET last_checked = ? WHERE player_id = ?",
                (datetime.now().isoformat(), player_id)
            )
            
            # Check if there's an error
            if 'error' in data:
                if data['error']['code'] == 6:  # Incorrect ID
                    # Mark player as inactive
                    self.cursor.execute(
                        "UPDATE trader_ids SET active = 0 WHERE player_id = ?",
                        (player_id,)
                    )
                    console_logger.warning(f"Player ID {player_id} not found - marked as inactive")
                else:
                    console_logger.warning(f"API error for player {player_id}: {data['error'].get('error', 'Unknown error')}")
                
                self.conn.commit()
                return []
            
            # Check if there are bazaar items
            if 'bazaar' not in data or not data['bazaar']:
                console_logger.info(f"Player {player_id} has no bazaar items")
                self.conn.commit()
                return []
                
            # Get the player's name
            player_name = data.get('name', f"Player {player_id}")
            
            # Process bazaar items
            bazaar_items = []
            for item_id, item_data in data['bazaar'].items():
                item_id = int(item_id)
                
                # Get item details from cache or use defaults
                item_info = self.items_cache.get(item_id, {})
                
                item = {
                    'item_id': item_id,
                    'item_name': item_data.get('name', item_info.get('name', 'Unknown Item')),
                    'category': item_data.get('category', item_info.get('category', 'Miscellaneous')),
                    'price': item_data.get('price', 0),
                    'quantity': item_data.get('quantity', 1),
                    'seller_id': player_id,
                    'seller_name': player_name,
                    'market_value': item_data.get('market_value', item_info.get('market_value', 0))
                }
                
                bazaar_items.append(item)
            
            console_logger.info(f"Found {len(bazaar_items)} items in {player_name}'s bazaar")
            return bazaar_items
            
        except Exception as e:
            logging.error(f"Error fetching bazaar for player {player_id}: {str(e)}")
            console_logger.error(f"Failed to fetch bazaar for player {player_id}: {str(e)}")
            return []
            
    def _store_bazaar_items(self, items):
        """Store bazaar items in the database"""
        timestamp = datetime.now().isoformat()
        
        # First clear existing listings for these sellers
        if items:
            seller_ids = {item['seller_id'] for item in items}
            placeholders = ','.join('?' for _ in seller_ids)
            self.cursor.execute(f"DELETE FROM listings WHERE seller_id IN ({placeholders})", list(seller_ids))
        
        # Insert new listings
        for item in items:
            self.cursor.execute(
                """
                INSERT INTO listings 
                    (item_id, item_name, category, price, quantity, 
                     seller_id, seller_name, market_value, timestamp) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item['item_id'], item['item_name'], item['category'], 
                    item['price'], item['quantity'], item['seller_id'], 
                    item['seller_name'], item['market_value'], timestamp
                )
            )
        
        self.conn.commit()
        
    def scan(self, limit=None):
        """Scan bazaars for trader IDs in the database"""
        # Fetch and cache item metadata
        if not self._fetch_items_metadata():
            console_logger.error("Failed to fetch item metadata, aborting scan")
            return False
        
        # Start a new scan
        self._start_scan()
        
        try:
            # Get active trader IDs
            if limit:
                self.cursor.execute(
                    "SELECT player_id FROM trader_ids WHERE active = 1 ORDER BY last_checked ASC NULLS FIRST LIMIT ?",
                    (limit,)
                )
            else:
                self.cursor.execute("SELECT player_id FROM trader_ids WHERE active = 1 ORDER BY last_checked ASC NULLS FIRST")
                
            trader_ids = [row[0] for row in self.cursor.fetchall()]
            
            if not trader_ids:
                console_logger.info("No active traders found in the database")
                self._end_scan(0, 0)
                return False
            
            console_logger.info(f"Starting scan of {len(trader_ids)} traders")
            
            # Track progress
            traders_scanned = 0
            items_found = 0
            all_items = []
            
            # Process each trader
            for i, player_id in enumerate(trader_ids):
                console_logger.info(f"Scanning player {player_id} ({i+1}/{len(trader_ids)})")
                
                # Get bazaar items
                items = self._get_player_bazaar(player_id)
                all_items.extend(items)
                items_found += len(items)
                traders_scanned += 1
                
                # Store items in chunks to avoid large transactions
                if len(all_items) >= 100:
                    self._store_bazaar_items(all_items)
                    all_items = []
                
                # Delay between API calls to respect rate limits
                if i < len(trader_ids) - 1:  # No need to delay after the last request
                    time.sleep(self.delay)
            
            # Store any remaining items
            if all_items:
                self._store_bazaar_items(all_items)
            
            # Mark scan as complete
            self._end_scan(traders_scanned, items_found)
            
            return True
            
        except Exception as e:
            logging.error(f"Error during bazaar scan: {str(e)}")
            console_logger.error(f"Scan failed: {str(e)}")
            
            # Update scan status to failed
            if self.scan_id:
                self.cursor.execute(
                    "UPDATE scan_history SET end_time = ?, status = ? WHERE id = ?",
                    (datetime.now().isoformat(), 'failed', self.scan_id)
                )
                self.conn.commit()
            
            return False
        
    def __del__(self):
        """Clean up database connections"""
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()

def main():
    # Check if API key is provided
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else None
    else:
        api_key = input("Enter your Torn API key with access to bazaar data: ").strip()
        limit_input = input("Enter maximum number of traders to scan (blank for all): ").strip()
        limit = int(limit_input) if limit_input else None
    
    if not api_key:
        console_logger.error("Error: API key is required.")
        return
    
    # Create scanner and run scan
    scanner = BazaarScanner(api_key)
    scanner.scan(limit)

if __name__ == "__main__":
    console_logger.info(f"Bazaar scanner started - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    main()