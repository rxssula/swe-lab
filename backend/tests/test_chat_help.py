#!/usr/bin/env python3
"""
Chat Functionality Tests - Core Features
Tests thread management and basic messaging functionality
"""

import requests
import json
from datetime import datetime
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
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
        if total == 0:
            print("\nNo tests run!")
            return
        print("\n" + "="*70)
        print("TEST SUMMARY - CHAT CORE FUNCTIONALITY")
        print("="*70)
        print(f"Total Tests: {total}")
        print(f"Passed: {len(self.passed)} ({len(self.passed)/total*100:.1f}%)")
        print(f"Failed: {len(self.failed)} ({len(self.failed)/total*100:.1f}%)")
        if self.failed:
            print("\nFailed Tests:")
            for test_name, error in self.failed:
                print(f"  - {test_name}: {error}")

results = TestResults()

print("\n" + "="*70)
print("CHAT TESTS - SETUP PHASE")
print("="*70 + "\n")

# Create Consumer
consumer_data = {
    "business_name": "Chat Test Restaurant",
    "business_type": "restaurant",
    "address": "123 Test St",
    "city": "Test City",
    "country": "Test Country",
    "email": f"chat_consumer_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "phone_number": "+1234567890"
}

response = requests.post(f"{BASE_URL}/auth/signup/consumer", json=consumer_data)
if response.status_code == 201:
    data = response.json()
    results.test_data['consumer_token'] = data['access_token']
    results.test_data['consumer_user_id'] = data['user']['id']
    results.test_data['consumer_email'] = consumer_data['email']
    results.add_pass("Setup: Consumer Created")
else:
    results.add_fail("Setup: Consumer Creation", f"Status {response.status_code}: {response.text}")
    results.print_summary()
    exit(1)

# Create Supplier
supplier_data = {
    "business_name": "Chat Test Farm",
    "business_type": "farm",
    "address": "456 Farm Rd",
    "city": "Farm City",
    "country": "Test Country",
    "email": f"chat_supplier_{datetime.now().timestamp()}@test.com",
    "phone_number": "+1987654321",
    "subscription_tier": "trial",
    "password": "123"
}

response = requests.post(f"{BASE_URL}/auth/signup/supplier", json=supplier_data)
if response.status_code == 201:
    data = response.json()
    results.test_data['supplier_token'] = data['access_token']
    results.test_data['supplier_user_id'] = data['user']['id']
    results.test_data['supplier_id'] = data.get('supplier_id')
    results.add_pass("Setup: Supplier Created")
else:
    results.add_fail("Setup: Supplier Creation", f"Status {response.status_code}: {response.text}")
    results.print_summary()
    exit(1)

# Get consumer and supplier IDs for link creation
# Consumer ID
response = requests.get(
    f"{BASE_URL}/auth/me",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    results.test_data['consumer_id'] = response.json()['id']
    results.add_pass("Setup: Got Consumer ID")
else:
    results.add_fail("Setup: Get Consumer ID", f"Status {response.status_code}")

# Supplier ID (if not already set)
if not results.test_data.get('supplier_id'):
    response = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
    )
    if response.status_code == 200:
        results.test_data['supplier_id'] = response.json()['id']
        results.add_pass("Setup: Got Supplier ID")
    else:
        results.add_fail("Setup: Get Supplier ID", f"Status {response.status_code}")

# Create link request
link_data = {
    "supplier_id": results.test_data['supplier_id']
}
print("Supplier id: ", link_data)

response = requests.post(
    f"{BASE_URL}/links/request",
    json=link_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 201:
    data = response.json()
    results.test_data['link_id'] = data['id']
    results.add_pass("Setup: Link Request Created")
else:
    results.add_fail("Setup: Link Request", f"Status {response.status_code}: {response.text}")
    results.print_summary()
    exit(1)

# Accept link
response = requests.post(
    f"{BASE_URL}/links/requests/{results.test_data['link_id']}/accept",
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 200:
    results.add_pass("Setup: Link Accepted")
else:
    results.add_fail("Setup: Link Acceptance", f"Status {response.status_code}: {response.text}")
    results.print_summary()
    exit(1)

# Create a product for product reference tests
product_data = {
    "name": "Test Product",
    "description": "Test product for chat",
    "unit": "kg",
    "price_per_unit": 10.50,
    "stock_level": 100,
    "minimum_order_quantity": 1,
    "category_id": None  # We'll need to create a category first
}

# First create a category
category_data = {
    "name": "Test Category",
    "description": "Test category"
}

response = requests.post(
    f"{BASE_URL}/categories",
    json=category_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 201:
    results.test_data['category_id'] = response.json()['id']
    product_data['category_id'] = results.test_data['category_id']
    results.add_pass("Setup: Category Created")
else:
    results.add_fail("Setup: Category Creation", f"Status {response.status_code}")

# Now create product
response = requests.post(
    f"{BASE_URL}/products",
    json=product_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 201:
    results.test_data['product_id'] = response.json()['id']
    results.add_pass("Setup: Product Created")
else:
    results.add_fail("Setup: Product Creation", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 1: CHAT THREAD MANAGEMENT")
print("="*70 + "\n")

# Test 1.1: Get threads - should be empty initially
response = requests.get(
    f"{BASE_URL}/chat/threads",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    threads = response.json()
    if len(threads) == 0:
        results.add_pass("1.1: Initial Threads Empty", "No threads before first message")
    else:
        results.add_fail("1.1: Initial Threads Empty", f"Expected 0 threads, got {len(threads)}")
else:
    results.add_fail("1.1: Initial Threads Empty", f"Status {response.status_code}: {response.text}")

# Test 1.2: Supplier gets empty threads
response = requests.get(
    f"{BASE_URL}/chat/threads",
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 200:
    threads = response.json()
    if len(threads) == 0:
        results.add_pass("1.2: Supplier Initial Threads Empty")
    else:
        results.add_fail("1.2: Supplier Initial Threads Empty", f"Expected 0 threads, got {len(threads)}")
else:
    results.add_fail("1.2: Supplier Initial Threads Empty", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 2: SENDING & RECEIVING MESSAGES")
print("="*70 + "\n")

# Test 2.1: Consumer sends first message (auto-creates thread)
message_data = {
    "message_text": "Hello! I'd like to place an order.",
    "message_type": "TEXT"
}

print(results.test_data['link_id'])
print(message_data)

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 201:
    data = response.json()
    results.test_data['first_message_id'] = data['id']
    results.test_data['thread_id'] = data.get('thread_id')

    # Validate message attributes
    if (data['sender_type'] == 'CONSUMER' and
        data['message_text'] == message_data['message_text'] and
        data.get('read_at') is None):
        results.add_pass("2.1: Consumer Send First Message", "Thread auto-created, attributes correct")
    else:
        results.add_fail("2.1: Consumer Send First Message", f"Message attributes incorrect: {data}")
else:
    results.add_fail("2.1: Consumer Send First Message", f"Status {response.status_code}: {response.text}")
