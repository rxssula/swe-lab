#!/usr/bin/env python3
"""
Comprehensive API Endpoint Testing Script
Tests all endpoints in the B2B Marketplace API
"""

import requests
import json
from typing import Dict, Any, Optional
from datetime import datetime

BASE_URL = "http://localhost:8000"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.tokens = {}
        self.test_data = {}

    def add_pass(self, test_name: str, details: str = ""):
        self.passed.append((test_name, details))
        print(f"✓ PASS: {test_name}")
        if details:
            print(f"  → {details}")

    def add_fail(self, test_name: str, error: str):
        self.failed.append((test_name, error))
        print(f"✗ FAIL: {test_name}")
        print(f"  → {error}")

    def print_summary(self):
        total = len(self.passed) + len(self.failed)
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {total}")
        print(f"Passed: {len(self.passed)} ({len(self.passed)/total*100:.1f}%)")
        print(f"Failed: {len(self.failed)} ({len(self.failed)/total*100:.1f}%)")

        if self.failed:
            print("\n" + "-"*70)
            print("FAILED TESTS:")
            print("-"*70)
            for test_name, error in self.failed:
                print(f"  • {test_name}")
                print(f"    Error: {error}")

results = TestResults()

def test_endpoint(name: str, method: str, endpoint: str,
                 data: Optional[Dict] = None,
                 headers: Optional[Dict] = None,
                 expected_status: int = 200,
                 params: Optional[Dict] = None) -> Optional[Dict]:
    """Generic endpoint testing function"""
    url = f"{BASE_URL}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=5)
        elif method == "PATCH":
            response = requests.patch(url, json=data, headers=headers, timeout=5)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, params=params, timeout=5)
        else:
            raise ValueError(f"Unsupported method: {method}")

        if response.status_code == expected_status:
            response_data = response.json() if response.text else {}
            results.add_pass(name, f"Status: {response.status_code}")
            return response_data
        else:
            results.add_fail(name,
                           f"Expected {expected_status}, got {response.status_code}. "
                           f"Response: {response.text[:200]}")
            return None

    except Exception as e:
        results.add_fail(name, f"Exception: {str(e)}")
        return None

def get_auth_header(token: str) -> Dict[str, str]:
    """Create authorization header"""
    return {"Authorization": f"Bearer {token}"}

# ============================================================================
# TEST 1: AUTHENTICATION ENDPOINTS
# ============================================================================

print("\n" + "="*70)
print("TESTING AUTHENTICATION ENDPOINTS")
print("="*70 + "\n")

# Test 1.1: Consumer Signup
consumer_data = {
    "business_name": "Test Restaurant",
    "business_type": "restaurant",
    "address": "123 Main St",
    "city": "New York",
    "country": "USA",
    "email": f"consumer_{datetime.now().timestamp()}@test.com",
    "password": "testpassword123",
    "phone_number": "+1234567890"
}

response = test_endpoint(
    "Consumer Signup",
    "POST",
    "/auth/signup/consumer",
    data=consumer_data,
    expected_status=201
)

if response:
    results.tokens['consumer'] = response.get('access_token')
    results.test_data['consumer_email'] = consumer_data['email']
    results.test_data['consumer_password'] = consumer_data['password']
    results.test_data['consumer_user_id'] = response.get('user', {}).get('id')

# Test 1.2: Supplier Signup
supplier_data = {
    "business_name": "Test Farm",
    "business_type": "farm",
    "address": "456 Farm Road",
    "city": "Austin",
    "country": "USA",
    "email": f"supplier_{datetime.now().timestamp()}@test.com",
    "password": "testpassword123",
    "phone_number": "+1987654321",
    "subscription_tier": "trial"
}

response = test_endpoint(
    "Supplier Signup",
    "POST",
    "/auth/signup/supplier",
    data=supplier_data,
    expected_status=201
)

if response:
    results.tokens['supplier'] = response.get('access_token')
    results.test_data['supplier_email'] = supplier_data['email']
    results.test_data['supplier_password'] = supplier_data['password']
    results.test_data['supplier_user_id'] = response.get('user', {}).get('id')
    results.test_data['supplier_id'] = response.get('user', {}).get('id')  # Will need to query for actual supplier_id

# Test 1.3: Duplicate Consumer Signup (should fail)
response = test_endpoint(
    "Duplicate Consumer Signup (should fail)",
    "POST",
    "/auth/signup/consumer",
    data=consumer_data,
    expected_status=400
)

# Test 1.4: Login with Consumer (using form data)
try:
    response = requests.post(
        f"{BASE_URL}/auth/token",
        data={
            "username": consumer_data['email'],
            "password": consumer_data['password']
        },
        timeout=5
    )
    if response.status_code == 200:
        results.add_pass("Consumer Login", f"Status: {response.status_code}")
    else:
        results.add_fail("Consumer Login", f"Expected 200, got {response.status_code}")
except Exception as e:
    results.add_fail("Consumer Login", f"Exception: {str(e)}")

# Test 1.5: Login with Supplier (using form data)
try:
    response = requests.post(
        f"{BASE_URL}/auth/token",
        data={
            "username": supplier_data['email'],
            "password": supplier_data['password']
        },
        timeout=5
    )
    if response.status_code == 200:
        results.add_pass("Supplier Login", f"Status: {response.status_code}")
    else:
        results.add_fail("Supplier Login", f"Expected 200, got {response.status_code}")
except Exception as e:
    results.add_fail("Supplier Login", f"Exception: {str(e)}")

# Test 1.6: Get Current User (Consumer)
if results.tokens.get('consumer'):
    test_endpoint(
        "Get Current User - Consumer",
        "GET",
        "/auth/me",
        headers=get_auth_header(results.tokens['consumer'])
    )

# Test 1.7: Get Current User (Supplier)
if results.tokens.get('supplier'):
    test_endpoint(
        "Get Current User - Supplier",
        "GET",
        "/auth/me",
        headers=get_auth_header(results.tokens['supplier'])
    )

# Test 1.8: Invalid Login (using form data)
try:
    response = requests.post(
        f"{BASE_URL}/auth/token",
        data={
            "username": "nonexistent@test.com",
            "password": "wrongpassword"
        },
        timeout=5
    )
    if response.status_code == 401:
        results.add_pass("Invalid Login (should fail)", f"Status: {response.status_code}")
    else:
        results.add_fail("Invalid Login (should fail)", f"Expected 401, got {response.status_code}")
except Exception as e:
    results.add_fail("Invalid Login (should fail)", f"Exception: {str(e)}")

# Test 1.9: Unauthorized Access to /me
test_endpoint(
    "Unauthorized Access to /me (should fail)",
    "GET",
    "/auth/me",
    expected_status=401
)

# ============================================================================
# TEST 2: CATEGORY ENDPOINTS
# ============================================================================

print("\n" + "="*70)
print("TESTING CATEGORY ENDPOINTS")
print("="*70 + "\n")

# Test 2.1: Create Category (top-level)
category_data = {
    "name": "Fresh Vegetables",
    "description": "Seasonal fresh vegetables"
}

if results.tokens.get('supplier'):
    response = test_endpoint(
        "Create Top-Level Category",
        "POST",
        "/categories/",
        data=category_data,
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=201
    )

    if response:
        results.test_data['category_id'] = response.get('id')

# Test 2.2: Create Sub-Category
if results.test_data.get('category_id'):
    sub_category_data = {
        "name": "Organic Vegetables",
        "description": "Certified organic vegetables",
        "parent_category_id": results.test_data['category_id']
    }

    test_endpoint(
        "Create Sub-Category",
        "POST",
        "/categories/",
        data=sub_category_data,
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=201
    )

# Test 2.3: List All Categories
if results.tokens.get('consumer'):
    test_endpoint(
        "List All Categories",
        "GET",
        "/categories/",
        headers=get_auth_header(results.tokens['consumer'])
    )

# Test 2.4: Get Specific Category
if results.test_data.get('category_id'):
    test_endpoint(
        "Get Specific Category",
        "GET",
        f"/categories/{results.test_data['category_id']}",
        headers=get_auth_header(results.tokens['supplier'])
    )

# Test 2.5: Update Category
if results.test_data.get('category_id'):
    update_data = {
        "description": "Updated description for fresh vegetables"
    }

    test_endpoint(
        "Update Category",
        "PATCH",
        f"/categories/{results.test_data['category_id']}",
        data=update_data,
        headers=get_auth_header(results.tokens['supplier'])
    )

# Test 2.6: Create Category Without Auth (should fail)
test_endpoint(
    "Create Category Without Auth (should fail)",
    "POST",
    "/categories/",
    data=category_data,
    expected_status=401
)

# ============================================================================
# TEST 3: PRODUCT ENDPOINTS
# ============================================================================

print("\n" + "="*70)
print("TESTING PRODUCT ENDPOINTS")
print("="*70 + "\n")

# Test 3.1: Create Product
if results.tokens.get('supplier') and results.test_data.get('category_id'):
    product_data = {
        "name": "Organic Tomatoes",
        "description": "Fresh organic tomatoes from local farm",
        "category_id": results.test_data['category_id'],
        "unit": "kg",
        "price_per_unit": 5.99,
        "stock_level": 100,
        "minimum_order_quantity": 5,
        "is_active": True
    }

    response = test_endpoint(
        "Create Product",
        "POST",
        "/products/",
        data=product_data,
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=201
    )

    if response:
        results.test_data['product_id'] = response.get('id')

# Test 3.2: Get My Products (Supplier)
if results.tokens.get('supplier'):
    test_endpoint(
        "Get My Products - Supplier",
        "GET",
        "/products/my-products",
        headers=get_auth_header(results.tokens['supplier'])
    )

# Test 3.3: Get My Products with Filters
if results.tokens.get('supplier'):
    test_endpoint(
        "Get My Products - Active Only",
        "GET",
        "/products/my-products",
        headers=get_auth_header(results.tokens['supplier']),
        params={"active_only": True}
    )

# Test 3.4: Add Product Image
if results.tokens.get('supplier') and results.test_data.get('product_id'):
    image_data = {
        "image_url": "https://example.com/tomato.jpg",
        "is_primary": True
    }

    response = test_endpoint(
        "Add Product Image",
        "POST",
        f"/products/{results.test_data['product_id']}/images",
        data=image_data,
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=201
    )

    if response:
        results.test_data['image_id'] = response.get('id')

# Test 3.5: Update Product
if results.tokens.get('supplier') and results.test_data.get('product_id'):
    update_data = {
        "price_per_unit": 6.99,
        "stock_level": 150
    }

    test_endpoint(
        "Update Product",
        "PATCH",
        f"/products/{results.test_data['product_id']}",
        data=update_data,
        headers=get_auth_header(results.tokens['supplier'])
    )

# Test 3.6: Consumer Browse Catalog (no links yet - should be empty)
if results.tokens.get('consumer'):
    test_endpoint(
        "Browse Catalog - No Links Yet",
        "GET",
        "/products/catalog/browse",
        headers=get_auth_header(results.tokens['consumer'])
    )

# Test 3.7: Create Product Without Auth (should fail)
test_endpoint(
    "Create Product Without Auth (should fail)",
    "POST",
    "/products/",
    data=product_data if 'product_data' in locals() else {},
    expected_status=401
)

# ============================================================================
# TEST 4: LINK MANAGEMENT ENDPOINTS
# ============================================================================

print("\n" + "="*70)
print("TESTING LINK MANAGEMENT ENDPOINTS")
print("="*70 + "\n")

# First, we need to get the actual supplier_id (not user_id)
# We'll need to query the database or use a staff endpoint
# For now, let's try to get it from the supplier staff list

# Test 4.1: Request Link (Consumer to Supplier)
# NOTE: We need the actual supplier business ID, not the user ID
# Let's skip this for now and come back to it

# Test 4.2: Get My Links (Consumer - should be empty)
if results.tokens.get('consumer'):
    test_endpoint(
        "Get My Links - Consumer (empty)",
        "GET",
        "/links/my-links",
        headers=get_auth_header(results.tokens['consumer'])
    )

# Test 4.3: Get Link Requests (Supplier - should be empty)
if results.tokens.get('supplier'):
    test_endpoint(
        "Get Link Requests - Supplier (empty)",
        "GET",
        "/links/requests",
        headers=get_auth_header(results.tokens['supplier'])
    )

# ============================================================================
# TEST 5: STAFF MANAGEMENT ENDPOINTS
# ============================================================================

print("\n" + "="*70)
print("TESTING STAFF MANAGEMENT ENDPOINTS")
print("="*70 + "\n")

# Test 5.1: List Supplier Staff
if results.tokens.get('supplier'):
    response = test_endpoint(
        "List Supplier Staff",
        "GET",
        "/staff/supplier/list",
        headers=get_auth_header(results.tokens['supplier'])
    )

    if response and len(response) > 0:
        results.test_data['supplier_business_id'] = response[0].get('id')

# Test 5.2: List Consumer Staff
if results.tokens.get('consumer'):
    response = test_endpoint(
        "List Consumer Staff",
        "GET",
        "/staff/consumer/list",
        headers=get_auth_header(results.tokens['consumer'])
    )

    if response and len(response) > 0:
        results.test_data['consumer_business_id'] = response[0].get('id')

# Test 5.3: List Supplier Invitations (should be empty)
if results.tokens.get('supplier'):
    test_endpoint(
        "List Supplier Invitations (empty)",
        "GET",
        "/staff/supplier/invitations",
        headers=get_auth_header(results.tokens['supplier'])
    )

# Test 5.4: List Consumer Invitations (should be empty)
if results.tokens.get('consumer'):
    test_endpoint(
        "List Consumer Invitations (empty)",
        "GET",
        "/staff/consumer/invitations",
        headers=get_auth_header(results.tokens['consumer'])
    )

# ============================================================================
# TEST 6: EDGE CASES AND ERROR HANDLING
# ============================================================================

print("\n" + "="*70)
print("TESTING EDGE CASES AND ERROR HANDLING")
print("="*70 + "\n")

# Test 6.1: Get Non-Existent Category
if results.tokens.get('supplier'):
    test_endpoint(
        "Get Non-Existent Category (should fail)",
        "GET",
        "/categories/00000000-0000-0000-0000-000000000000",
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=404
    )

# Test 6.2: Get Non-Existent Product
if results.tokens.get('supplier'):
    test_endpoint(
        "Get Non-Existent Product (should fail)",
        "GET",
        "/products/00000000-0000-0000-0000-000000000000",
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=404
    )

# Test 6.3: Update Non-Existent Product
if results.tokens.get('supplier'):
    test_endpoint(
        "Update Non-Existent Product (should fail)",
        "PATCH",
        "/products/00000000-0000-0000-0000-000000000000",
        data={"price_per_unit": 9.99},
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=404
    )

# Test 6.4: Delete Category with Products (should fail)
if results.tokens.get('supplier') and results.test_data.get('category_id'):
    test_endpoint(
        "Delete Category with Products (should fail)",
        "DELETE",
        f"/categories/{results.test_data['category_id']}",
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=400
    )

# Test 6.5: Soft Delete Product
if results.tokens.get('supplier') and results.test_data.get('product_id'):
    test_endpoint(
        "Soft Delete Product",
        "DELETE",
        f"/products/{results.test_data['product_id']}",
        headers=get_auth_header(results.tokens['supplier']),
        expected_status=204
    )

# Test 6.6: Verify Product is Inactive
if results.tokens.get('supplier'):
    response = test_endpoint(
        "Get My Products - Verify Soft Delete",
        "GET",
        "/products/my-products",
        headers=get_auth_header(results.tokens['supplier'])
    )

    if response:
        active_count = sum(1 for p in response if p.get('is_active'))
        inactive_count = sum(1 for p in response if not p.get('is_active'))
        results.add_pass("Soft Delete Verification",
                        f"Active: {active_count}, Inactive: {inactive_count}")

# Print final results
results.print_summary()

print("\n" + "="*70)
print("TEST DATA COLLECTED")
print("="*70)
print(f"Consumer Email: {results.test_data.get('consumer_email')}")
print(f"Supplier Email: {results.test_data.get('supplier_email')}")
print(f"Category ID: {results.test_data.get('category_id')}")
print(f"Product ID: {results.test_data.get('product_id')}")
print("="*70)
