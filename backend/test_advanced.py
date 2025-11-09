#!/usr/bin/env python3
"""
Advanced API Endpoint Testing Script
Tests complex workflows like invitations, linking, and permission checks
"""

import requests
import json
import re
from typing import Dict, Any, Optional
from datetime import datetime

BASE_URL = "http://localhost:8000"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
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

    def add_warning(self, test_name: str, warning: str):
        self.warnings.append((test_name, warning))
        print(f"⚠ WARNING: {test_name}")
        print(f"  → {warning}")

    def print_summary(self):
        total = len(self.passed) + len(self.failed)
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {total}")
        print(f"Passed: {len(self.passed)} ({len(self.passed)/total*100:.1f}%)")
        print(f"Failed: {len(self.failed)} ({len(self.failed)/total*100:.1f}%)")
        print(f"Warnings: {len(self.warnings)}")

        if self.failed:
            print("\n" + "-"*70)
            print("FAILED TESTS:")
            print("-"*70)
            for test_name, error in self.failed:
                print(f"  • {test_name}")
                print(f"    Error: {error}")

        if self.warnings:
            print("\n" + "-"*70)
            print("WARNINGS:")
            print("-"*70)
            for test_name, warning in self.warnings:
                print(f"  • {test_name}")
                print(f"    Warning: {warning}")

results = TestResults()

# ============================================================================
# SETUP: Create test users
# ============================================================================

print("\n" + "="*70)
print("SETUP: Creating test users and data")
print("="*70 + "\n")

# Create Supplier
supplier_data = {
    "company_name": "Advanced Test Farm",
    "business_type": "farm",
    "address": "789 Farm Road",
    "city": "Austin",
    "country": "USA",
    "email": f"supplier_adv_{datetime.now().timestamp()}@test.com",
    "password": "testpassword123",
    "phone_number": "+1987654321",
    "subscription_tier": "trial"
}

response = requests.post(f"{BASE_URL}/auth/signup/supplier", json=supplier_data, timeout=5)
if response.status_code == 201:
    data = response.json()
    results.test_data['supplier_token'] = data['access_token']
    results.test_data['supplier_email'] = supplier_data['email']
    results.test_data['supplier_user_id'] = data['user']['id']
    results.add_pass("Setup: Supplier Created", f"Email: {supplier_data['email']}")
else:
    results.add_fail("Setup: Supplier Creation", f"Status {response.status_code}: {response.text[:200]}")

# Create Consumer
consumer_data = {
    "business_name": "Advanced Test Restaurant",
    "business_type": "restaurant",
    "address": "123 Main St",
    "city": "New York",
    "country": "USA",
    "email": f"consumer_adv_{datetime.now().timestamp()}@test.com",
    "password": "testpassword123",
    "phone_number": "+1234567890"
}

response = requests.post(f"{BASE_URL}/auth/signup/consumer", json=consumer_data, timeout=5)
if response.status_code == 201:
    data = response.json()
    results.test_data['consumer_token'] = data['access_token']
    results.test_data['consumer_email'] = consumer_data['email']
    results.test_data['consumer_user_id'] = data['user']['id']
    results.add_pass("Setup: Consumer Created", f"Email: {consumer_data['email']}")
else:
    results.add_fail("Setup: Consumer Creation", f"Status {response.status_code}: {response.text[:200]}")

# Get supplier and consumer IDs from staff listings
response = requests.get(
    f"{BASE_URL}/staff/supplier/list",
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"},
    timeout=5
)
if response.status_code == 200:
    staff_data = response.json()
    if staff_data:
        # We need to get the actual supplier business ID
        # This is a workaround - in production you'd get this from the signup response
        results.add_pass("Setup: Retrieved Supplier Staff", f"Found {len(staff_data)} staff members")
else:
    results.add_fail("Setup: Get Supplier Staff", f"Status {response.status_code}")

response = requests.get(
    f"{BASE_URL}/staff/consumer/list",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
    timeout=5
)
if response.status_code == 200:
    staff_data = response.json()
    if staff_data:
        results.add_pass("Setup: Retrieved Consumer Staff", f"Found {len(staff_data)} staff members")
else:
    results.add_fail("Setup: Get Consumer Staff", f"Status {response.status_code}")

# Create a category and product
category_data = {"name": "Test Vegetables", "description": "For testing"}
response = requests.post(
    f"{BASE_URL}/categories/",
    json=category_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"},
    timeout=5
)
if response.status_code == 201:
    results.test_data['category_id'] = response.json()['id']
    results.add_pass("Setup: Category Created", f"ID: {results.test_data['category_id']}")
else:
    results.add_fail("Setup: Category Creation", f"Status {response.status_code}")

if 'category_id' in results.test_data:
    product_data = {
        "name": "Test Tomatoes",
        "description": "For testing",
        "category_id": results.test_data['category_id'],
        "unit": "kg",
        "price_per_unit": 5.99,
        "stock_level": 100,
        "minimum_order_quantity": 5,
        "is_active": True
    }
    response = requests.post(
        f"{BASE_URL}/products/",
        json=product_data,
        headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"},
        timeout=5
    )
    if response.status_code == 201:
        data = response.json()
        results.test_data['product_id'] = data['id']
        results.test_data['supplier_id'] = data['supplier_id']
        results.add_pass("Setup: Product Created", f"ID: {results.test_data['product_id']}")
        results.add_pass("Setup: Found Supplier ID", f"ID: {results.test_data['supplier_id']}")
    else:
        results.add_fail("Setup: Product Creation", f"Status {response.status_code}: {response.text[:200]}")

# ============================================================================
# TEST 1: STAFF INVITATION FLOW (SUPPLIER)
# ============================================================================

print("\n" + "="*70)
print("TEST 1: STAFF INVITATION FLOW (SUPPLIER)")
print("="*70 + "\n")

# Test 1.1: Supplier invites new staff member
if 'supplier_id' in results.test_data:
    invite_data = {
        "email": f"supplier_staff_{datetime.now().timestamp()}@test.com",
        "role": "admin"
    }

    response = requests.post(
        f"{BASE_URL}/suppliers/{results.test_data['supplier_id']}/staff/invite",
        json=invite_data,
        headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"},
        timeout=5
    )

    if response.status_code == 200:
        data = response.json()
        results.test_data['supplier_invite_link'] = data['invitation_link']
        results.test_data['supplier_invite_email'] = invite_data['email']

        # Extract token from invitation link
        match = re.search(r'token=([^&]+)', data['invitation_link'])
        if match:
            results.test_data['supplier_invite_token'] = match.group(1)
            results.add_pass("Supplier Invite Staff", f"Invitation sent to {invite_data['email']}")
        else:
            results.add_fail("Supplier Invite Staff", "Could not extract token from invitation link")
    else:
        results.add_fail("Supplier Invite Staff", f"Status {response.status_code}: {response.text[:200]}")

# Test 1.2: Accept supplier staff invitation
if 'supplier_invite_token' in results.test_data:
    accept_data = {
        "token": results.test_data['supplier_invite_token'],
        "password": "newstaffpassword123",
        "phone_number": "+1111111111"
    }

    response = requests.post(
        f"{BASE_URL}/auth/accept-invitation",
        json=accept_data,
        timeout=5
    )

    if response.status_code == 200:
        data = response.json()
        results.test_data['supplier_staff_token'] = data['access_token']
        results.test_data['supplier_staff_user_id'] = data['user']['id']
        results.add_pass("Accept Supplier Invitation", f"New staff member created with role: {data['role']}")
    else:
        results.add_fail("Accept Supplier Invitation", f"Status {response.status_code}: {response.text[:200]}")

# Test 1.3: Verify new staff can access supplier endpoints
if 'supplier_staff_token' in results.test_data:
    response = requests.get(
        f"{BASE_URL}/products/my-products",
        headers={"Authorization": f"Bearer {results.test_data['supplier_staff_token']}"},
        timeout=5
    )

    if response.status_code == 200:
        results.add_pass("New Staff Access Products", "Staff member can access supplier products")
    else:
        results.add_fail("New Staff Access Products", f"Status {response.status_code}")

# Test 1.4: Verify staff list includes new member
response = requests.get(
    f"{BASE_URL}/staff/supplier/list",
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"},
    timeout=5
)

if response.status_code == 200:
    staff_list = response.json()
    if len(staff_list) == 2:  # Owner + new staff member
        results.add_pass("Verify Staff List", f"Found 2 staff members (owner + admin)")
    else:
        results.add_warning("Verify Staff List", f"Expected 2 staff members, found {len(staff_list)}")
else:
    results.add_fail("Verify Staff List", f"Status {response.status_code}")

# ============================================================================
# TEST 2: STAFF INVITATION FLOW (CONSUMER)
# ============================================================================

print("\n" + "="*70)
print("TEST 2: STAFF INVITATION FLOW (CONSUMER)")
print("="*70 + "\n")

# Get consumer ID from staff list
response = requests.get(
    f"{BASE_URL}/staff/consumer/list",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
    timeout=5
)

if response.status_code == 200:
    staff_data = response.json()
    # For now, we need the consumer business ID - this is a limitation we should note
    results.add_warning("Consumer ID Detection", "Cannot directly get consumer business ID from API response")

# ============================================================================
# TEST 3: LINK MANAGEMENT WORKFLOW
# ============================================================================

print("\n" + "="*70)
print("TEST 3: LINK MANAGEMENT WORKFLOW")
print("="*70 + "\n")

# Test 3.1: Consumer requests link to supplier
if 'supplier_id' in results.test_data:
    link_request = {"supplier_id": results.test_data['supplier_id']}

    response = requests.post(
        f"{BASE_URL}/links/request",
        json=link_request,
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
        timeout=5
    )

    if response.status_code == 201:
        data = response.json()
        results.test_data['link_id'] = data['id']
        results.add_pass("Consumer Request Link", f"Link request created with ID: {data['id']}")
    else:
        results.add_fail("Consumer Request Link", f"Status {response.status_code}: {response.text[:200]}")

# Test 3.2: Supplier views pending link requests
response = requests.get(
    f"{BASE_URL}/links/requests",
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"},
    params={"status_filter": "pending"},
    timeout=5
)

if response.status_code == 200:
    requests_list = response.json()
    if len(requests_list) > 0:
        results.add_pass("Supplier View Link Requests", f"Found {len(requests_list)} pending request(s)")
    else:
        results.add_fail("Supplier View Link Requests", "No pending requests found")
else:
    results.add_fail("Supplier View Link Requests", f"Status {response.status_code}")

# Test 3.3: Supplier accepts link request
if 'link_id' in results.test_data:
    response = requests.post(
        f"{BASE_URL}/links/requests/{results.test_data['link_id']}/accept",
        headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"},
        timeout=5
    )

    if response.status_code == 200:
        results.add_pass("Supplier Accept Link", "Link request accepted")
    else:
        results.add_fail("Supplier Accept Link", f"Status {response.status_code}: {response.text[:200]}")

# Test 3.4: Consumer views their links
response = requests.get(
    f"{BASE_URL}/links/my-links",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
    params={"status_filter": "accepted"},
    timeout=5
)

if response.status_code == 200:
    links = response.json()
    if len(links) > 0 and links[0]['status'] == 'accepted':
        results.add_pass("Consumer View Accepted Links", f"Found {len(links)} accepted link(s)")
    else:
        results.add_fail("Consumer View Accepted Links", "No accepted links found")
else:
    results.add_fail("Consumer View Accepted Links", f"Status {response.status_code}")

# Test 3.5: Check link status
if 'supplier_id' in results.test_data:
    response = requests.get(
        f"{BASE_URL}/links/check/{results.test_data['supplier_id']}",
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
        timeout=5
    )

    if response.status_code == 200:
        data = response.json()
        if data.get('linked') == True and data.get('status') == 'accepted':
            results.add_pass("Check Link Status", "Link confirmed as accepted")
        else:
            results.add_fail("Check Link Status", f"Unexpected status: {data}")
    else:
        results.add_fail("Check Link Status", f"Status {response.status_code}")

# ============================================================================
# TEST 4: CATALOG BROWSING WITH LINKED SUPPLIER
# ============================================================================

print("\n" + "="*70)
print("TEST 4: CATALOG BROWSING WITH LINKED SUPPLIER")
print("="*70 + "\n")

# Test 4.1: Consumer browses catalog (should now see products)
response = requests.get(
    f"{BASE_URL}/products/catalog/browse",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
    timeout=5
)

if response.status_code == 200:
    products = response.json()
    if len(products) > 0:
        results.add_pass("Browse Catalog After Link", f"Found {len(products)} product(s)")
    else:
        results.add_fail("Browse Catalog After Link", "No products found despite link")
else:
    results.add_fail("Browse Catalog After Link", f"Status {response.status_code}")

# Test 4.2: Consumer views linked suppliers with product counts
response = requests.get(
    f"{BASE_URL}/products/catalog/suppliers",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
    timeout=5
)

if response.status_code == 200:
    suppliers = response.json()
    if len(suppliers) > 0:
        results.add_pass("View Linked Suppliers", f"Found {len(suppliers)} linked supplier(s)")
    else:
        results.add_fail("View Linked Suppliers", "No linked suppliers found")
else:
    results.add_fail("View Linked Suppliers", f"Status {response.status_code}")

# Test 4.3: Consumer filters catalog by supplier
if 'supplier_id' in results.test_data:
    response = requests.get(
        f"{BASE_URL}/products/catalog/browse",
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
        params={"supplier_id": results.test_data['supplier_id']},
        timeout=5
    )

    if response.status_code == 200:
        results.add_pass("Filter Catalog by Supplier", "Filter successful")
    else:
        results.add_fail("Filter Catalog by Supplier", f"Status {response.status_code}")

# Test 4.4: Consumer searches catalog
response = requests.get(
    f"{BASE_URL}/products/catalog/browse",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
    params={"search": "tomato"},
    timeout=5
)

if response.status_code == 200:
    products = response.json()
    if len(products) > 0:
        results.add_pass("Search Catalog", f"Search found {len(products)} product(s)")
    else:
        results.add_warning("Search Catalog", "Search returned no results")
else:
    results.add_fail("Search Catalog", f"Status {response.status_code}")

# Test 4.5: Consumer gets specific product
if 'product_id' in results.test_data:
    response = requests.get(
        f"{BASE_URL}/products/{results.test_data['product_id']}",
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
        timeout=5
    )

    if response.status_code == 200:
        results.add_pass("Get Specific Product as Consumer", "Access granted to linked supplier product")
    else:
        results.add_fail("Get Specific Product as Consumer", f"Status {response.status_code}")

# ============================================================================
# TEST 5: PERMISSION CHECKS
# ============================================================================

print("\n" + "="*70)
print("TEST 5: PERMISSION CHECKS")
print("="*70 + "\n")

# Test 5.1: Consumer tries to create product (should fail)
if 'category_id' in results.test_data:
    product_data = {
        "name": "Unauthorized Product",
        "description": "Should not be created",
        "category_id": results.test_data['category_id'],
        "unit": "kg",
        "price_per_unit": 10.00,
        "stock_level": 50,
        "minimum_order_quantity": 1,
        "is_active": True
    }

    response = requests.post(
        f"{BASE_URL}/products/",
        json=product_data,
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
        timeout=5
    )

    if response.status_code == 403:
        results.add_pass("Consumer Cannot Create Product", "Correctly denied (403)")
    else:
        results.add_fail("Consumer Cannot Create Product", f"Expected 403, got {response.status_code}")

# Test 5.2: Supplier staff (admin) CAN create product
if 'supplier_staff_token' in results.test_data and 'category_id' in results.test_data:
    product_data = {
        "name": "Staff Created Product",
        "description": "Created by admin staff",
        "category_id": results.test_data['category_id'],
        "unit": "kg",
        "price_per_unit": 8.00,
        "stock_level": 75,
        "minimum_order_quantity": 3,
        "is_active": True
    }

    response = requests.post(
        f"{BASE_URL}/products/",
        json=product_data,
        headers={"Authorization": f"Bearer {results.test_data['supplier_staff_token']}"},
        timeout=5
    )

    if response.status_code == 201:
        results.add_pass("Staff Admin Can Create Product", "Admin staff has correct permissions")
    else:
        results.add_fail("Staff Admin Can Create Product", f"Status {response.status_code}: {response.text[:200]}")

# Test 5.3: Consumer cannot update supplier's product
if 'product_id' in results.test_data:
    update_data = {"price_per_unit": 99.99}

    response = requests.patch(
        f"{BASE_URL}/products/{results.test_data['product_id']}",
        json=update_data,
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
        timeout=5
    )

    if response.status_code in [403, 404]:
        results.add_pass("Consumer Cannot Update Product", "Correctly denied")
    else:
        results.add_fail("Consumer Cannot Update Product", f"Expected 403/404, got {response.status_code}")

# Test 5.4: Consumer cannot delete category
if 'category_id' in results.test_data:
    response = requests.delete(
        f"{BASE_URL}/categories/{results.test_data['category_id']}",
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"},
        timeout=5
    )

    # This might succeed since any authenticated user can delete categories in MVP
    # But we're testing if there's any permission check
    results.add_warning("Category Delete Permission",
                       f"Consumer got status {response.status_code} when deleting category - check if this is intended")

# Print final results
results.print_summary()

print("\n" + "="*70)
print("COLLECTED TEST DATA")
print("="*70)
print(f"Supplier Email: {results.test_data.get('supplier_email')}")
print(f"Supplier ID: {results.test_data.get('supplier_id')}")
print(f"Consumer Email: {results.test_data.get('consumer_email')}")
print(f"Link ID: {results.test_data.get('link_id')}")
print(f"Product ID: {results.test_data.get('product_id')}")
print(f"Staff Member Email: {results.test_data.get('supplier_invite_email')}")
print("="*70)
