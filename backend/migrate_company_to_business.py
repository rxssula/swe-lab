"""
Migration script to rename company_name to business_name in suppliers table.
Run this once to update existing database.
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

# Parse PostgreSQL connection string
# Format: postgresql://user:password@host/database
url_parts = DATABASE_URL.replace('postgresql://', '').split('@')
user_pass = url_parts[0].split(':')
host_db = url_parts[1].split('/')

user = user_pass[0]
password = user_pass[1]
host = host_db[0]
database = host_db[1]

try:
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        dbname=database,
        user=user,
        password=password,
        host=host
    )
    cursor = conn.cursor()

    print("Connected to database successfully!")

    # Check if company_name column exists
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='suppliers' AND column_name='company_name'
    """)

    if cursor.fetchone():
        print("Found 'company_name' column. Renaming to 'business_name'...")

        # Rename the column
        cursor.execute("""
            ALTER TABLE suppliers
            RENAME COLUMN company_name TO business_name
        """)

        conn.commit()
        print("✓ Successfully renamed column from 'company_name' to 'business_name'")
    else:
        print("Column 'company_name' does not exist. Checking for 'business_name'...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='suppliers' AND column_name='business_name'
        """)
        if cursor.fetchone():
            print("✓ Column 'business_name' already exists. No migration needed.")
        else:
            print("⚠ Neither 'company_name' nor 'business_name' exists. Table may not be created yet.")

    cursor.close()
    conn.close()
    print("\nMigration completed successfully!")

except Exception as e:
    print(f"Error during migration: {e}")
    if 'conn' in locals():
        conn.rollback()
        conn.close()
