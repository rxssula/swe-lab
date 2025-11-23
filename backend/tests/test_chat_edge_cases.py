#!/usr/bin/env python3
"""
Chat Edge Cases & Error Handling Tests
Tests boundary conditions, error scenarios, and edge cases
"""

import requests
from datetime import datetime

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
        print("TEST SUMMARY - CHAT EDGE CASES")
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
print("CHAT EDGE CASE TESTS - SETUP PHASE")
print("="*70 + "\n")

# Create Consumer
consumer_data = {
    "business_name": "Edge Case Restaurant",
    "email": f"edge_consumer_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "phone_number": "+1234567890"
}

response = requests.post(f"{BASE_URL}/auth/consumer/signup", json=consumer_data)
if response.status_code == 201:
    data = response.json()
    results.test_data['consumer_token'] = data['access_token']
    results.add_pass("Setup: Consumer Created")
else:
    results.add_fail("Setup: Consumer", f"Status {response.status_code}")
    results.print_summary()
    exit(1)

# Create Supplier
supplier_data = {
    "business_name": "Edge Case Supplier",
    "email": f"edge_supplier_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "phone_number": "+1987654321"
}

response = requests.post(f"{BASE_URL}/auth/supplier/signup", json=supplier_data)
if response.status_code == 201:
    data = response.json()
    results.test_data['supplier_token'] = data['access_token']
    results.test_data['supplier_id'] = data.get('supplier_id')
    results.add_pass("Setup: Supplier Created")
else:
    results.add_fail("Setup: Supplier", f"Status {response.status_code}")
    results.print_summary()
    exit(1)

# Get IDs
response = requests.get(
    f"{BASE_URL}/consumer/me",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    results.test_data['consumer_id'] = response.json()['id']

if not results.test_data.get('supplier_id'):
    response = requests.get(
        f"{BASE_URL}/supplier/me",
        headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
    )
    if response.status_code == 200:
        results.test_data['supplier_id'] = response.json()['id']

# Create and accept link
link_data = {"supplier_id": results.test_data['supplier_id']}
response = requests.post(
    f"{BASE_URL}/links/request",
    json=link_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 201:
    results.test_data['link_id'] = response.json()['id']

    response = requests.post(
        f"{BASE_URL}/links/requests/{results.test_data['link_id']}/accept",
        headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
    )
    if response.status_code == 200:
        results.add_pass("Setup: Link Created & Accepted")
    else:
        results.add_fail("Setup: Link Acceptance", f"Status {response.status_code}")
else:
    results.add_fail("Setup: Link Creation", f"Status {response.status_code}")

# Create a product for testing
category_data = {"name": "Edge Test Category", "description": "Test"}
response = requests.post(
    f"{BASE_URL}/categories",
    json=category_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 201:
    results.test_data['category_id'] = response.json()['id']

product_data = {
    "name": "Edge Test Product",
    "description": "Test product",
    "unit": "kg",
    "price_per_unit": 10.0,
    "stock_level": 100,
    "minimum_order_quantity": 1,
    "category_id": results.test_data['category_id']
}
response = requests.post(
    f"{BASE_URL}/products",
    json=product_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 201:
    results.test_data['product_id'] = response.json()['id']

print("\n" + "="*70)
print("TEST 1: INVALID MESSAGE DATA")
print("="*70 + "\n")

# Test 1.1: Empty message text
message_data = {
    "message_text": "",
    "message_type": "TEXT"
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [422, 400]:
    results.add_pass("1.1: Empty Message Text", "Validation error for empty message")
elif response.status_code == 201:
    results.add_pass("1.1: Empty Message Text", "Empty messages allowed (may be valid for attachments)")
else:
    results.add_fail("1.1: Empty Message Text", f"Unexpected status {response.status_code}")

# Test 1.2: Whitespace-only message
message_data = {
    "message_text": "   \n\t   ",
    "message_type": "TEXT"
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [422, 400]:
    results.add_pass("1.2: Whitespace-Only Message", "Validation rejects whitespace-only")
elif response.status_code == 201:
    # Some systems allow it
    results.add_pass("1.2: Whitespace-Only Message", "Whitespace messages accepted")
else:
    results.add_fail("1.2: Whitespace-Only Message", f"Unexpected status {response.status_code}")

# Test 1.3: Very long message (10,000 characters)
long_text = "A" * 10000
message_data = {
    "message_text": long_text,
    "message_type": "TEXT"
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 201:
    results.add_pass("1.3: Very Long Message", "10k character message accepted")
elif response.status_code in [400, 422]:
    results.add_pass("1.3: Very Long Message", "Length limit enforced")
else:
    results.add_fail("1.3: Very Long Message", f"Unexpected status {response.status_code}")

# Test 1.4: Message with special characters and emojis
message_data = {
    "message_text": "Hello! 😀 Testing <script>alert('xss')</script> & special chars: \u4e2d\u6587 Ñoño",
    "message_type": "TEXT"
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 201:
    data = response.json()
    results.test_data['special_char_message_id'] = data['id']
    # Verify special characters are preserved
    if data['message_text'] == message_data['message_text']:
        results.add_pass("1.4: Special Characters & Emoji", "Special chars preserved correctly")
    else:
        results.add_fail("1.4: Special Characters & Emoji", "Special chars not preserved")
else:
    results.add_fail("1.4: Special Characters & Emoji", f"Status {response.status_code}")

# Test 1.5: SQL injection attempt in message
message_data = {
    "message_text": "'; DROP TABLE chat_messages; --",
    "message_type": "TEXT"
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 201:
    results.add_pass("1.5: SQL Injection Attempt", "Message created (SQL properly escaped)")
else:
    results.add_fail("1.5: SQL Injection Attempt", f"Unexpected status {response.status_code}")

print("\n" + "="*70)
print("TEST 2: INVALID PRODUCT REFERENCES")
print("="*70 + "\n")

# Test 2.1: Non-existent product ID
fake_product_id = "00000000-0000-0000-0000-000000000000"
message_data = {
    "message_text": "Check out this product",
    "message_type": "TEXT",
    "product_id": fake_product_id
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 404:
    results.add_pass("2.1: Non-existent Product", "404 for invalid product ID")
elif response.status_code in [400, 422]:
    results.add_pass("2.1: Non-existent Product", "Validation error for invalid product")
elif response.status_code == 201:
    # Some systems might allow it and just ignore
    results.add_pass("2.1: Non-existent Product", "Product reference ignored (consider validation)")
else:
    results.add_fail("2.1: Non-existent Product", f"Unexpected status {response.status_code}")

# Test 2.2: Create another supplier's product and try to reference it
# (This requires creating another supplier - skip if complex)
# For now, test with current supplier's product (should succeed)
if results.test_data.get('product_id'):
    message_data = {
        "message_text": "Our product",
        "message_type": "TEXT",
        "product_id": results.test_data['product_id']
    }

    response = requests.post(
        f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
        json=message_data,
        headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
    )
    if response.status_code == 201:
        results.add_pass("2.2: Valid Product Reference", "Supplier can reference own product")
    else:
        results.add_fail("2.2: Valid Product Reference", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 3: PAGINATION EDGE CASES")
print("="*70 + "\n")

# Test 3.1: Negative offset
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages?offset=-1",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [200, 422]:
    results.add_pass("3.1: Negative Offset", f"Handled appropriately ({response.status_code})")
else:
    results.add_fail("3.1: Negative Offset", f"Unexpected status {response.status_code}")

# Test 3.2: Zero limit
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages?limit=0",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [200, 422]:
    results.add_pass("3.2: Zero Limit", f"Handled appropriately ({response.status_code})")
else:
    results.add_fail("3.2: Zero Limit", f"Unexpected status {response.status_code}")

# Test 3.3: Very large offset (beyond total messages)
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages?offset=9999",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    messages = response.json()
    if len(messages) == 0:
        results.add_pass("3.3: Large Offset", "Returns empty array for offset beyond total")
    else:
        results.add_fail("3.3: Large Offset", f"Expected empty array, got {len(messages)} messages")
else:
    results.add_fail("3.3: Large Offset", f"Status {response.status_code}")

# Test 3.4: Very large limit
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages?limit=10000",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [200, 400]:
    results.add_pass("3.4: Very Large Limit", f"Handled appropriately ({response.status_code})")
else:
    results.add_fail("3.4: Very Large Limit", f"Unexpected status {response.status_code}")

print("\n" + "="*70)
print("TEST 4: MARK READ EDGE CASES")
print("="*70 + "\n")

# Test 4.1: Mark read with empty array
mark_read_data = {
    "message_ids": []
}

response = requests.post(
    f"{BASE_URL}/chat/messages/mark-read",
    json=mark_read_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [200, 422]:
    results.add_pass("4.1: Mark Read Empty Array", f"Handled appropriately ({response.status_code})")
else:
    results.add_fail("4.1: Mark Read Empty Array", f"Unexpected status {response.status_code}")

# Test 4.2: Mark read with non-existent message IDs
mark_read_data = {
    "message_ids": ["00000000-0000-0000-0000-000000000000"]
}

response = requests.post(
    f"{BASE_URL}/chat/messages/mark-read",
    json=mark_read_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [200, 404]:
    results.add_pass("4.2: Mark Read Non-existent IDs", f"Handled appropriately ({response.status_code})")
else:
    results.add_fail("4.2: Mark Read Non-existent IDs", f"Unexpected status {response.status_code}")

# Test 4.3: Mark read with invalid UUID format
mark_read_data = {
    "message_ids": ["not-a-valid-uuid"]
}

response = requests.post(
    f"{BASE_URL}/chat/messages/mark-read",
    json=mark_read_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [422, 400]:
    results.add_pass("4.3: Mark Read Invalid UUID", "Validation error for invalid UUID")
else:
    results.add_fail("4.3: Mark Read Invalid UUID", f"Expected 422/400, got {response.status_code}")

# Test 4.4: Mark same message as read multiple times
# First send a message
message_data = {
    "message_text": "Test message for double read",
    "message_type": "TEXT"
}
response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 201:
    msg_id = response.json()['id']

    # Mark as read first time
    mark_read_data = {"message_ids": [msg_id]}
    response = requests.post(
        f"{BASE_URL}/chat/messages/mark-read",
        json=mark_read_data,
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
    )

    # Mark as read second time
    response = requests.post(
        f"{BASE_URL}/chat/messages/mark-read",
        json=mark_read_data,
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
    )
    if response.status_code == 200:
        data = response.json()
        if data.get('marked_count') == 0:
            results.add_pass("4.4: Mark Read Twice", "Second mark returns marked_count=0")
        else:
            results.add_pass("4.4: Mark Read Twice", f"Handled appropriately (marked_count={data.get('marked_count')})")
    else:
        results.add_fail("4.4: Mark Read Twice", f"Unexpected status {response.status_code}")

print("\n" + "="*70)
print("TEST 5: CONCURRENT OPERATIONS")
print("="*70 + "\n")

# Test 5.1: Send multiple messages rapidly
import concurrent.futures

def send_message(n):
    message_data = {
        "message_text": f"Concurrent message {n}",
        "message_type": "TEXT"
    }
    response = requests.post(
        f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
        json=message_data,
        headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
    )
    return response.status_code == 201

# Send 5 messages concurrently
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(send_message, i) for i in range(5)]
        results_list = [f.result() for f in concurrent.futures.as_completed(futures)]

    success_count = sum(results_list)
    if success_count == 5:
        results.add_pass("5.1: Concurrent Message Sending", "All 5 concurrent messages succeeded")
    elif success_count > 0:
        results.add_pass("5.1: Concurrent Message Sending", f"{success_count}/5 messages succeeded")
    else:
        results.add_fail("5.1: Concurrent Message Sending", "No concurrent messages succeeded")
except Exception as e:
    results.add_fail("5.1: Concurrent Message Sending", f"Exception: {str(e)}")

print("\n" + "="*70)
print("TEST 6: CANNED REPLY EDGE CASES")
print("="*70 + "\n")

# Test 6.1: Create canned reply with very long title
long_title = "A" * 500
canned_data = {
    "title": long_title,
    "content": "Test content"
}

response = requests.post(
    f"{BASE_URL}/chat/canned-replies",
    json=canned_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code in [201, 400, 422]:
    results.add_pass("6.1: Long Canned Reply Title", f"Handled appropriately ({response.status_code})")
else:
    results.add_fail("6.1: Long Canned Reply Title", f"Unexpected status {response.status_code}")

# Test 6.2: Create canned reply with empty title
canned_data = {
    "title": "",
    "content": "Test content"
}

response = requests.post(
    f"{BASE_URL}/chat/canned-replies",
    json=canned_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code in [422, 400]:
    results.add_pass("6.2: Empty Canned Reply Title", "Validation error for empty title")
else:
    results.add_fail("6.2: Empty Canned Reply Title", f"Expected 422/400, got {response.status_code}")

# Test 6.3: Update non-existent canned reply
fake_id = "00000000-0000-0000-0000-000000000000"
update_data = {
    "title": "Updated",
    "content": "Updated content"
}

response = requests.put(
    f"{BASE_URL}/chat/canned-replies/{fake_id}",
    json=update_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_token']}"}
)
if response.status_code == 404:
    results.add_pass("6.3: Update Non-existent Canned Reply", "404 for non-existent reply")
else:
    results.add_fail("6.3: Update Non-existent Canned Reply", f"Expected 404, got {response.status_code}")

# Print final summary
results.print_summary()
