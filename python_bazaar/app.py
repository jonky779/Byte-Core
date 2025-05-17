#!/usr/bin/env python3
"""
app.py - Flask web application for displaying bazaar data
"""

import os
import sqlite3
from flask import Flask, render_template, request, jsonify, g
from datetime import datetime, timedelta

# Create Flask app
app = Flask(__name__)

# Database configuration
DATABASE = 'bazaar.db'

def get_db():
    """Get database connection"""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row  # Return rows as dictionaries
    return db

@app.teardown_appcontext
def close_connection(exception):
    """Close database connection when app context ends"""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    """Query the database"""
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

@app.route('/')
def index():
    """Main page - redirect to bazaar"""
    return render_template('index.html')

@app.route('/bazaar')
def bazaar():
    """Bazaar listings page"""
    # Get parameters
    category = request.args.get('category', 'all')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort', 'price_asc')
    min_price = request.args.get('min_price', '')
    max_price = request.args.get('max_price', '')
    
    # Get available categories
    categories = ['all'] + [row['category'] for row in query_db(
        "SELECT DISTINCT category FROM listings WHERE category IS NOT NULL ORDER BY category"
    )]
    
    # Build query for listings
    query = "SELECT * FROM listings WHERE 1=1"
    params = []
    
    # Apply category filter
    if category and category != 'all':
        query += " AND category = ?"
        params.append(category)
    
    # Apply search filter
    if search:
        query += " AND (item_name LIKE ? OR seller_name LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    
    # Apply price filters
    if min_price and min_price.isdigit():
        query += " AND price >= ?"
        params.append(int(min_price))
    
    if max_price and max_price.isdigit():
        query += " AND price <= ?"
        params.append(int(max_price))
    
    # Apply sorting
    if sort_by == 'price_asc':
        query += " ORDER BY price ASC"
    elif sort_by == 'price_desc':
        query += " ORDER BY price DESC"
    elif sort_by == 'quantity_desc':
        query += " ORDER BY quantity DESC"
    elif sort_by == 'newest':
        query += " ORDER BY timestamp DESC"
    elif sort_by == 'value':
        query += " ORDER BY (market_value - price) DESC"
    else:
        query += " ORDER BY price ASC"
    
    # Get limited results (pagination could be added later)
    query += " LIMIT 1000"
    
    # Execute query
    listings = query_db(query, params)
    
    # Get last scan information
    last_scan = query_db(
        "SELECT * FROM scan_history ORDER BY start_time DESC LIMIT 1", 
        one=True
    )
    
    # Get counts
    total_items = query_db("SELECT COUNT(*) as count FROM listings", one=True)['count']
    total_traders = query_db(
        "SELECT COUNT(DISTINCT seller_id) as count FROM listings", 
        one=True
    )['count']
    
    # Group items by category for display
    if category == 'all' and not search and not min_price and not max_price:
        # If no filters, group by category
        category_listings = {}
        for cat in categories:
            if cat != 'all':
                cat_items = query_db(
                    "SELECT * FROM listings WHERE category = ? ORDER BY price ASC LIMIT 100",
                    [cat]
                )
                if cat_items:
                    category_listings[cat] = cat_items
    else:
        # If filters applied, just use the filtered results
        category_listings = {'Results': listings}
    
    return render_template(
        'bazaar.html',
        categories=categories,
        category=category,
        search=search,
        sort_by=sort_by,
        min_price=min_price,
        max_price=max_price,
        listings=listings,
        category_listings=category_listings,
        total_items=total_items,
        total_traders=total_traders,
        last_scan=last_scan
    )

@app.route('/api/bazaar')
def api_bazaar():
    """API endpoint for bazaar data"""
    # Get parameters
    category = request.args.get('category', 'all')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort', 'price_asc')
    min_price = request.args.get('min_price', '')
    max_price = request.args.get('max_price', '')
    
    # Build query
    query = "SELECT * FROM listings WHERE 1=1"
    params = []
    
    # Apply filters (same as web view)
    if category and category != 'all':
        query += " AND category = ?"
        params.append(category)
    
    if search:
        query += " AND (item_name LIKE ? OR seller_name LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    
    if min_price and min_price.isdigit():
        query += " AND price >= ?"
        params.append(int(min_price))
    
    if max_price and max_price.isdigit():
        query += " AND price <= ?"
        params.append(int(max_price))
    
    # Apply sorting
    if sort_by == 'price_asc':
        query += " ORDER BY price ASC"
    elif sort_by == 'price_desc':
        query += " ORDER BY price DESC"
    elif sort_by == 'quantity_desc':
        query += " ORDER BY quantity DESC"
    elif sort_by == 'newest':
        query += " ORDER BY timestamp DESC"
    elif sort_by == 'value':
        query += " ORDER BY (market_value - price) DESC"
    else:
        query += " ORDER BY price ASC"
    
    # Execute query with limit
    query += " LIMIT 1000"
    listings = query_db(query, params)
    
    # Convert to list of dictionaries for JSON
    result = [
        {
            'item_id': row['item_id'],
            'item_name': row['item_name'],
            'category': row['category'],
            'price': row['price'],
            'quantity': row['quantity'],
            'seller_id': row['seller_id'],
            'seller_name': row['seller_name'],
            'market_value': row['market_value'],
            'timestamp': row['timestamp']
        }
        for row in listings
    ]
    
    return jsonify({
        'items': result,
        'count': len(result),
        'filters': {
            'category': category,
            'search': search,
            'min_price': min_price,
            'max_price': max_price,
            'sort_by': sort_by
        }
    })

if __name__ == '__main__':
    # Ensure directories exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    # Check if database exists
    if not os.path.exists(DATABASE):
        print(f"Error: Database file '{DATABASE}' not found.")
        print("Please run create_db.py first to set up the database.")
        exit(1)
    
    # Run the app
    app.run(host='0.0.0.0', port=5100, debug=True)