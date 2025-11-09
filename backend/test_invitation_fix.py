#!/usr/bin/env python3
"""Quick test to verify staff invitation endpoint fix"""

import requests
from datetime import datetime

BASE_URL = "http://localhost:8000"

# 1. Create a supplier
supplier_data = {
    "company_name": "Fix Test Farm",
    "business_type": "farm",
    "email": f"fix_test_{datetime.now().timestamp()}@test.com",
    "password": "testpassword123",
    "phone_number": "+1111111111",
    "subscription_tier": "trial",
    "address": "Test St",
    "city": "Test City",
    "country": "USA"
}

print("1. Creating supplier...")
response = requests.post(f"{BASE_URL}/auth/signup/supplier", json=supplier_data)
if response.status_code == 201:
    data = response.json()
    supplier_token = data['access_token']
    print(f"   ✓ Supplier created: {supplier_data['email']}")
else:
    print(f"   ✗ Failed to create supplier: {response.status_code}")
    exit(1)

# 2. Get supplier ID from products
product_data = {
    "name": "Test Product",
    "description": "For getting supplier ID",
    "category_id": "00000000-0000-0000-0000-000000000000",  # Will fail but that's ok
    "unit": "kg",
    "price_per_unit": 5.99,
    "stock_level": 100,
    "minimum_order_quantity": 1,
    "is_active": True
}

# Create a category first
print("2. Creating category...")
category_response = requests.post(
    f"{BASE_URL}/categories/",
    json={"name": "Test Category", "description": "Test"},
    headers={"Authorization": f"Bearer {supplier_token}"}
)

if category_response.status_code == 201:
    category_id = category_response.json()['id']
    product_data['category_id'] = category_id
    print(f"   ✓ Category created: {category_id}")
else:
    print(f"   ✗ Failed to create category: {category_response.status_code}")
    exit(1)

# Create product to get supplier_id
print("3. Creating product to get supplier ID...")
product_response = requests.post(
    f"{BASE_URL}/products/",
    json=product_data,
    headers={"Authorization": f"Bearer {supplier_token}"}
)

if product_response.status_code == 201:
    supplier_id = product_response.json()['supplier_id']
    print(f"   ✓ Found supplier ID: {supplier_id}")
else:
    print(f"   ✗ Failed to create product: {product_response.status_code}")
    exit(1)

# 3. Test the FIXED invitation endpoint with JSON body
print("\n4. Testing FIXED invitation endpoint...")
invite_data = {
    "email": f"staff_fix_{datetime.now().timestamp()}@test.com",
    "role": "ADMIN"  # Using uppercase as fixed in enums
}

response = requests.post(
    f"{BASE_URL}/suppliers/{supplier_id}/staff/invite",
    json=invite_data,
    headers={"Authorization": f"Bearer {supplier_token}"}
)

print(f"\n{'='*70}")
print("INVITATION ENDPOINT TEST RESULT")
print(f"{'='*70}")

if response.status_code == 200:
    data = response.json()
    print(f"✅ SUCCESS! Invitation endpoint is now working correctly!")
    print(f"\nResponse:")
    print(f"  - Message: {data.get('message')}")
    print(f"  - Invitation Link: {data.get('invitation_link')}")
    print(f"  - Expires At: {data.get('expires_at')}")
    print(f"\nInvited Email: {invite_data['email']}")
    print(f"Role: {invite_data['role']}")
else:
    print(f"❌ FAILED! Status code: {response.status_code}")
    print(f"Response: {response.text}")

print(f"{'='*70}\n")
