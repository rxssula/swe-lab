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

# Test 2.2: Verify thread was created
response = requests.get(
    f"{BASE_URL}/chat/threads",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    threads = response.json()
    if len(threads) == 1:
        thread = threads[0]
        if thread.get('unread_count') == 0:  # Consumer's own message shouldn't count as unread
            results.add_pass("2.2: Thread Created After Message", "1 thread exists, unread_count correct")
        else:
            results.add_fail("2.2: Thread Created After Message", f"Unread count should be 0, got {thread.get('unread_count')}")
    else:
        results.add_fail("2.2: Thread Created After Message", f"Expected 1 thread, got {len(threads)}")
else:
    results.add_fail("2.2: Thread Created After Message", f"Status {response.status_code}")

# Test 2.3: Supplier sends reply
reply_data = {
    "message_text": "Hello! Of course, what would you like to order?",
    "message_type": "TEXT"
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=reply_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 201:
    data = response.json()
    results.test_data['supplier_message_id'] = data['id']

    if (data['sender_type'] == 'SUPPLIER' and
        data['message_text'] == reply_data['message_text']):
        results.add_pass("2.3: Supplier Send Reply", "Reply sent successfully")
    else:
        results.add_fail("2.3: Supplier Send Reply", f"Message attributes incorrect")
else:
    results.add_fail("2.3: Supplier Send Reply", f"Status {response.status_code}: {response.text}")

# Test 2.4: Get message history
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    messages = response.json()
    if len(messages) == 2:
        # Messages should be ordered by sent_at DESC (newest first)
        if messages[0]['sender_type'] == 'SUPPLIER' and messages[1]['sender_type'] == 'CONSUMER':
            results.add_pass("2.4: Get Message History", "2 messages retrieved, ordered correctly")
        else:
            results.add_fail("2.4: Get Message History", "Message order incorrect")
    else:
        results.add_fail("2.4: Get Message History", f"Expected 2 messages, got {len(messages)}")
else:
    results.add_fail("2.4: Get Message History", f"Status {response.status_code}")

# Test 2.5: Consumer sees unread count increased
response = requests.get(
    f"{BASE_URL}/chat/threads",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    threads = response.json()
    if len(threads) == 1 and threads[0].get('unread_count') == 1:
        results.add_pass("2.5: Unread Count Updated", "Consumer sees 1 unread message from supplier")
    else:
        count = threads[0].get('unread_count') if threads else 'N/A'
        results.add_fail("2.5: Unread Count Updated", f"Expected unread_count=1, got {count}")
else:
    results.add_fail("2.5: Unread Count Updated", f"Status {response.status_code}")

# Test 2.6: Send message with product reference
if results.test_data.get('product_id'):
    product_message_data = {
        "message_text": "I recommend this product",
        "message_type": "TEXT",
        "product_id": results.test_data['product_id']
    }

    response = requests.post(
        f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
        json=product_message_data,
        headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
    )
    if response.status_code == 201:
        data = response.json()
        if data.get('product_id') == results.test_data['product_id']:
            results.add_pass("2.6: Message With Product Reference", "Product linked to message")
        else:
            results.add_fail("2.6: Message With Product Reference", "Product ID not in response")
    else:
        results.add_fail("2.6: Message With Product Reference", f"Status {response.status_code}")

# Test 2.7: Pagination test
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages?limit=1&offset=0",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    messages = response.json()
    if len(messages) == 1:
        results.add_pass("2.7: Message Pagination", "Limit parameter works")
    else:
        results.add_fail("2.7: Message Pagination", f"Expected 1 message, got {len(messages)}")
else:
    results.add_fail("2.7: Message Pagination", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 3: READ RECEIPTS")
print("="*70 + "\n")

# Test 3.1: Mark supplier's message as read
mark_read_data = {
    "message_ids": [results.test_data['supplier_message_id']]
}

response = requests.post(
    f"{BASE_URL}/chat/messages/mark-read",
    json=mark_read_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    data = response.json()
    if data.get('marked_count') == 1:
        results.add_pass("3.1: Mark Message As Read", "1 message marked as read")
    else:
        results.add_fail("3.1: Mark Message As Read", f"Expected marked_count=1, got {data.get('marked_count')}")
else:
    results.add_fail("3.1: Mark Message As Read", f"Status {response.status_code}: {response.text}")

# Test 3.2: Verify unread count decreased
response = requests.get(
    f"{BASE_URL}/chat/threads",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    threads = response.json()
    if len(threads) == 1 and threads[0].get('unread_count') == 0:
        results.add_pass("3.2: Unread Count After Read", "Unread count back to 0")
    else:
        count = threads[0].get('unread_count') if threads else 'N/A'
        results.add_fail("3.2: Unread Count After Read", f"Expected unread_count=0, got {count}")
else:
    results.add_fail("3.2: Unread Count After Read", f"Status {response.status_code}")

# Test 3.3: Verify read_at timestamp set
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    messages = response.json()
    supplier_msg = next((m for m in messages if m['id'] == results.test_data['supplier_message_id']), None)
    if supplier_msg and supplier_msg.get('read_at') is not None:
        results.add_pass("3.3: Read Timestamp Set", "read_at field populated")
    else:
        results.add_fail("3.3: Read Timestamp Set", "read_at is still null")
else:
    results.add_fail("3.3: Read Timestamp Set", f"Status {response.status_code}")

# Test 3.4: Try to mark own message as read (should not increment count)
mark_own_data = {
    "message_ids": [results.test_data['first_message_id']]
}

response = requests.post(
    f"{BASE_URL}/chat/messages/mark-read",
    json=mark_own_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    data = response.json()
    if data.get('marked_count') == 0:
        results.add_pass("3.4: Cannot Mark Own Message", "Sender cannot mark own message as read")
    else:
        results.add_fail("3.4: Cannot Mark Own Message", f"Should not mark own message, got marked_count={data.get('marked_count')}")
else:
    results.add_fail("3.4: Cannot Mark Own Message", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 4: CANNED REPLIES (SUPPLIER ONLY)")
print("="*70 + "\n")

# Test 4.1: Create canned reply
canned_reply_data = {
    "title": "Greeting",
    "content": "Thank you for your inquiry! We'll get back to you shortly."
}

response = requests.post(
    f"{BASE_URL}/chat/canned-replies",
    json=canned_reply_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 201:
    data = response.json()
    results.test_data['canned_reply_id'] = data['id']
    if data['title'] == canned_reply_data['title'] and data['content'] == canned_reply_data['content']:
        results.add_pass("4.1: Create Canned Reply", "Reply created successfully")
    else:
        results.add_fail("4.1: Create Canned Reply", "Reply data incorrect")
else:
    results.add_fail("4.1: Create Canned Reply", f"Status {response.status_code}: {response.text}")

# Test 4.2: Get canned replies
response = requests.get(
    f"{BASE_URL}/chat/canned-replies",
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 200:
    replies = response.json()
    if len(replies) >= 1:
        results.add_pass("4.2: Get Canned Replies", f"Retrieved {len(replies)} replies")
    else:
        results.add_fail("4.2: Get Canned Replies", "No replies returned")
else:
    results.add_fail("4.2: Get Canned Replies", f"Status {response.status_code}")

# Test 4.3: Update canned reply
update_data = {
    "title": "Updated Greeting",
    "content": "Thank you! We appreciate your business."
}

response = requests.put(
    f"{BASE_URL}/chat/canned-replies/{results.test_data['canned_reply_id']}",
    json=update_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 200:
    data = response.json()
    if data['title'] == update_data['title']:
        results.add_pass("4.3: Update Canned Reply", "Reply updated successfully")
    else:
        results.add_fail("4.3: Update Canned Reply", "Update not reflected")
else:
    results.add_fail("4.3: Update Canned Reply", f"Status {response.status_code}")

# Test 4.4: Delete (deactivate) canned reply
response = requests.delete(
    f"{BASE_URL}/chat/canned-replies/{results.test_data['canned_reply_id']}",
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 200:
    results.add_pass("4.4: Delete Canned Reply", "Reply deactivated")
else:
    results.add_fail("4.4: Delete Canned Reply", f"Status {response.status_code}")

# Test 4.5: Verify deleted reply not in list
response = requests.get(
    f"{BASE_URL}/chat/canned-replies",
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 200:
    replies = response.json()
    deleted_reply = next((r for r in replies if r['id'] == results.test_data['canned_reply_id']), None)
    if deleted_reply is None:
        results.add_pass("4.5: Deleted Reply Not Listed", "Deactivated reply excluded from list")
    else:
        results.add_fail("4.5: Deleted Reply Not Listed", "Deleted reply still appears")
else:
    results.add_fail("4.5: Deleted Reply Not Listed", f"Status {response.status_code}")

# Print final summary
results.print_summary()
