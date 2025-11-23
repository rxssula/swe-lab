#!/usr/bin/env python3
"""
Chat Permissions & Authorization Tests
Tests access control and authorization for chat functionality
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
        print("TEST SUMMARY - CHAT PERMISSIONS")
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
print("CHAT PERMISSION TESTS - SETUP PHASE")
print("="*70 + "\n")

# Create Consumer A
consumer_a_data = {
    "business_name": "Restaurant A",
    "email": f"consumer_a_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "phone_number": "+1111111111"
}

response = requests.post(f"{BASE_URL}/auth/consumer/signup", json=consumer_a_data)
if response.status_code == 201:
    data = response.json()
    results.test_data['consumer_a_token'] = data['access_token']
    results.add_pass("Setup: Consumer A Created")
else:
    results.add_fail("Setup: Consumer A", f"Status {response.status_code}")
    results.print_summary()
    exit(1)

# Create Consumer B
consumer_b_data = {
    "business_name": "Restaurant B",
    "email": f"consumer_b_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "phone_number": "+2222222222"
}

response = requests.post(f"{BASE_URL}/auth/consumer/signup", json=consumer_b_data)
if response.status_code == 201:
    data = response.json()
    results.test_data['consumer_b_token'] = data['access_token']
    results.add_pass("Setup: Consumer B Created")
else:
    results.add_fail("Setup: Consumer B", f"Status {response.status_code}")

# Create Supplier X
supplier_x_data = {
    "business_name": "Supplier X",
    "email": f"supplier_x_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "phone_number": "+3333333333"
}

response = requests.post(f"{BASE_URL}/auth/supplier/signup", json=supplier_x_data)
if response.status_code == 201:
    data = response.json()
    results.test_data['supplier_x_token'] = data['access_token']
    results.test_data['supplier_x_id'] = data.get('supplier_id')
    results.add_pass("Setup: Supplier X Created")
else:
    results.add_fail("Setup: Supplier X", f"Status {response.status_code}")

# Create Supplier Y
supplier_y_data = {
    "business_name": "Supplier Y",
    "email": f"supplier_y_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "phone_number": "+4444444444"
}

response = requests.post(f"{BASE_URL}/auth/supplier/signup", json=supplier_y_data)
if response.status_code == 201:
    data = response.json()
    results.test_data['supplier_y_token'] = data['access_token']
    results.test_data['supplier_y_id'] = data.get('supplier_id')
    results.add_pass("Setup: Supplier Y Created")
else:
    results.add_fail("Setup: Supplier Y", f"Status {response.status_code}")

# Get entity IDs
response = requests.get(
    f"{BASE_URL}/consumer/me",
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code == 200:
    results.test_data['consumer_a_id'] = response.json()['id']

response = requests.get(
    f"{BASE_URL}/consumer/me",
    headers={"Authorization": f"Bearer {results.test_data['consumer_b_token']}"}
)
if response.status_code == 200:
    results.test_data['consumer_b_id'] = response.json()['id']

if not results.test_data.get('supplier_x_id'):
    response = requests.get(
        f"{BASE_URL}/supplier/me",
        headers={"Authorization": f"Bearer {results.test_data['supplier_x_token']}"}
    )
    if response.status_code == 200:
        results.test_data['supplier_x_id'] = response.json()['id']

if not results.test_data.get('supplier_y_id'):
    response = requests.get(
        f"{BASE_URL}/supplier/me",
        headers={"Authorization": f"Bearer {results.test_data['supplier_y_token']}"}
    )
    if response.status_code == 200:
        results.test_data['supplier_y_id'] = response.json()['id']

# Create link: Consumer A ↔ Supplier X (ACCEPTED)
link_data = {"supplier_id": results.test_data['supplier_x_id']}
response = requests.post(
    f"{BASE_URL}/links/request",
    json=link_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code == 201:
    results.test_data['link_a_x_id'] = response.json()['id']

    # Accept the link
    response = requests.post(
        f"{BASE_URL}/links/requests/{results.test_data['link_a_x_id']}/accept",
        headers={"Authorization": f"Bearer {results.test_data['supplier_x_token']}"}
    )
    if response.status_code == 200:
        results.add_pass("Setup: Link A-X Created & Accepted")
    else:
        results.add_fail("Setup: Accept Link A-X", f"Status {response.status_code}")
else:
    results.add_fail("Setup: Create Link A-X", f"Status {response.status_code}")

# Create link: Consumer B ↔ Supplier X (ACCEPTED)
link_data = {"supplier_id": results.test_data['supplier_x_id']}
response = requests.post(
    f"{BASE_URL}/links/request",
    json=link_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_b_token']}"}
)
if response.status_code == 201:
    results.test_data['link_b_x_id'] = response.json()['id']

    # Accept the link
    response = requests.post(
        f"{BASE_URL}/links/requests/{results.test_data['link_b_x_id']}/accept",
        headers={"Authorization": f"Bearer {results.test_data['supplier_x_token']}"}
    )
    if response.status_code == 200:
        results.add_pass("Setup: Link B-X Created & Accepted")
    else:
        results.add_fail("Setup: Accept Link B-X", f"Status {response.status_code}")
else:
    results.add_fail("Setup: Create Link B-X", f"Status {response.status_code}")

# Create link: Consumer A ↔ Supplier Y (PENDING)
link_data = {"supplier_id": results.test_data['supplier_y_id']}
response = requests.post(
    f"{BASE_URL}/links/request",
    json=link_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code == 201:
    results.test_data['link_a_y_pending_id'] = response.json()['id']
    results.add_pass("Setup: Link A-Y Created (PENDING)")
else:
    results.add_fail("Setup: Create Link A-Y", f"Status {response.status_code}")

# Send a message in link A-X to create thread
message_data = {
    "message_text": "Test message for permission tests",
    "message_type": "TEXT"
}
response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_a_x_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code == 201:
    results.test_data['message_a_x_id'] = response.json()['id']
    results.add_pass("Setup: Test Message Sent in Link A-X")
else:
    results.add_fail("Setup: Send Test Message", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 1: THREAD ISOLATION")
print("="*70 + "\n")

# Test 1.1: Consumer B cannot access Consumer A's thread
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_a_x_id']}/messages",
    headers={"Authorization": f"Bearer {results.test_data['consumer_b_token']}"}
)
if response.status_code in [403, 404]:
    results.add_pass("1.1: Thread Isolation - Consumer B Denied", "Consumer B cannot access Consumer A's thread")
elif response.status_code == 200:
    results.add_fail("1.1: Thread Isolation - Consumer B Denied", "Consumer B should not access Consumer A's messages")
else:
    results.add_fail("1.1: Thread Isolation - Consumer B Denied", f"Unexpected status {response.status_code}")

# Test 1.2: Consumer A cannot send message in Consumer B's link
message_data = {
    "message_text": "Unauthorized message",
    "message_type": "TEXT"
}
response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_b_x_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code in [403, 404]:
    results.add_pass("1.2: Cannot Send in Other's Thread", "Consumer A blocked from Consumer B's link")
elif response.status_code == 201:
    results.add_fail("1.2: Cannot Send in Other's Thread", "Consumer A should not send in Consumer B's thread")
else:
    results.add_fail("1.2: Cannot Send in Other's Thread", f"Unexpected status {response.status_code}")

# Test 1.3: Consumer's thread list shows only own threads
response = requests.get(
    f"{BASE_URL}/chat/threads",
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code == 200:
    threads = response.json()
    # Consumer A should see only link A-X thread (has messages)
    if len(threads) == 1:
        results.add_pass("1.3: Thread List Isolation", "Consumer A sees only own thread")
    else:
        results.add_fail("1.3: Thread List Isolation", f"Expected 1 thread, got {len(threads)}")
else:
    results.add_fail("1.3: Thread List Isolation", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 2: LINK STATUS PERMISSIONS")
print("="*70 + "\n")

# Test 2.1: Cannot chat on PENDING link
message_data = {
    "message_text": "Message on pending link",
    "message_type": "TEXT"
}
response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_a_y_pending_id']}/messages",
    json=message_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code in [403, 400]:
    results.add_pass("2.1: PENDING Link Blocked", "Cannot send message on pending link")
elif response.status_code == 201:
    results.add_fail("2.1: PENDING Link Blocked", "Should not allow messages on pending link")
else:
    results.add_fail("2.1: PENDING Link Blocked", f"Unexpected status {response.status_code}")

# Test 2.2: Cannot view messages on pending link
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_a_y_pending_id']}/messages",
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code in [403, 400]:
    results.add_pass("2.2: PENDING Link Messages Blocked", "Cannot view messages on pending link")
elif response.status_code == 200:
    results.add_fail("2.2: PENDING Link Messages Blocked", "Should not allow viewing messages on pending link")
else:
    results.add_fail("2.2: PENDING Link Messages Blocked", f"Unexpected status {response.status_code}")

print("\n" + "="*70)
print("TEST 3: UNAUTHORIZED ACCESS")
print("="*70 + "\n")

# Test 3.1: No auth token
response = requests.get(f"{BASE_URL}/chat/threads")
if response.status_code == 401:
    results.add_pass("3.1: No Auth Token", "401 Unauthorized without token")
else:
    results.add_fail("3.1: No Auth Token", f"Expected 401, got {response.status_code}")

# Test 3.2: Invalid link ID format
response = requests.get(
    f"{BASE_URL}/chat/links/invalid-uuid/messages",
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code in [422, 400]:
    results.add_pass("3.2: Invalid UUID Format", "Validation error for invalid UUID")
else:
    results.add_fail("3.2: Invalid UUID Format", f"Expected 422/400, got {response.status_code}")

# Test 3.3: Non-existent link ID
fake_uuid = "00000000-0000-0000-0000-000000000000"
response = requests.get(
    f"{BASE_URL}/chat/links/{fake_uuid}/messages",
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code == 404:
    results.add_pass("3.3: Non-existent Link", "404 for non-existent link")
else:
    results.add_fail("3.3: Non-existent Link", f"Expected 404, got {response.status_code}")

print("\n" + "="*70)
print("TEST 4: MARK READ PERMISSIONS")
print("="*70 + "\n")

# Test 4.1: Cannot mark messages from inaccessible thread
if results.test_data.get('message_a_x_id'):
    mark_read_data = {
        "message_ids": [results.test_data['message_a_x_id']]
    }

    # Consumer B tries to mark Consumer A's message
    response = requests.post(
        f"{BASE_URL}/chat/messages/mark-read",
        json=mark_read_data,
        headers={"Authorization": f"Bearer {results.test_data['consumer_b_token']}"}
    )
    if response.status_code == 200:
        data = response.json()
        # Should either return 0 marked or exclude inaccessible messages
        if data.get('marked_count') == 0:
            results.add_pass("4.1: Cannot Mark Other's Messages", "Cannot mark inaccessible messages")
        else:
            results.add_fail("4.1: Cannot Mark Other's Messages", f"Marked {data.get('marked_count')} messages from other user")
    elif response.status_code in [403, 404]:
        results.add_pass("4.1: Cannot Mark Other's Messages", "403/404 for inaccessible messages")
    else:
        results.add_fail("4.1: Cannot Mark Other's Messages", f"Unexpected status {response.status_code}")

print("\n" + "="*70)
print("TEST 5: CANNED REPLIES PERMISSIONS")
print("="*70 + "\n")

# Test 5.1: Consumer cannot create canned replies
canned_data = {
    "title": "Test",
    "content": "Test reply"
}

response = requests.post(
    f"{BASE_URL}/chat/canned-replies",
    json=canned_data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code == 403:
    results.add_pass("5.1: Consumer Cannot Create Canned Replies", "403 Forbidden for consumer")
elif response.status_code == 201:
    results.add_fail("5.1: Consumer Cannot Create Canned Replies", "Consumer should not create canned replies")
else:
    results.add_fail("5.1: Consumer Cannot Create Canned Replies", f"Expected 403, got {response.status_code}")

# Test 5.2: Consumer cannot view canned replies
response = requests.get(
    f"{BASE_URL}/chat/canned-replies",
    headers={"Authorization": f"Bearer {results.test_data['consumer_a_token']}"}
)
if response.status_code == 403:
    results.add_pass("5.2: Consumer Cannot View Canned Replies", "403 Forbidden for consumer")
elif response.status_code == 200:
    results.add_fail("5.2: Consumer Cannot View Canned Replies", "Consumer should not view canned replies")
else:
    results.add_fail("5.2: Consumer Cannot View Canned Replies", f"Expected 403, got {response.status_code}")

# Test 5.3: Supplier X cannot modify Supplier Y's canned replies
# First create a canned reply for Supplier Y
canned_data = {
    "title": "Supplier Y Reply",
    "content": "Response from Supplier Y"
}
response = requests.post(
    f"{BASE_URL}/chat/canned-replies",
    json=canned_data,
    headers={"Authorization": f"Bearer {results.test_data['supplier_y_token']}"}
)
if response.status_code == 201:
    supplier_y_reply_id = response.json()['id']

    # Try to update it with Supplier X's token
    update_data = {
        "title": "Hacked",
        "content": "Unauthorized update"
    }
    response = requests.put(
        f"{BASE_URL}/chat/canned-replies/{supplier_y_reply_id}",
        json=update_data,
        headers={"Authorization": f"Bearer {results.test_data['supplier_x_token']}"}
    )
    if response.status_code in [403, 404]:
        results.add_pass("5.3: Supplier Cannot Modify Other's Replies", "Cross-supplier access denied")
    elif response.status_code == 200:
        results.add_fail("5.3: Supplier Cannot Modify Other's Replies", "Supplier X modified Supplier Y's reply")
    else:
        results.add_fail("5.3: Supplier Cannot Modify Other's Replies", f"Unexpected status {response.status_code}")

# Test 5.4: Supplier sees only own canned replies
response = requests.get(
    f"{BASE_URL}/chat/canned-replies",
    headers={"Authorization": f"Bearer {results.test_data['supplier_x_token']}"}
)
if response.status_code == 200:
    replies = response.json()
    # Supplier X should not see Supplier Y's replies
    supplier_y_replies = [r for r in replies if r.get('id') == supplier_y_reply_id]
    if len(supplier_y_replies) == 0:
        results.add_pass("5.4: Supplier Sees Only Own Replies", "Isolation between suppliers maintained")
    else:
        results.add_fail("5.4: Supplier Sees Only Own Replies", "Supplier X sees Supplier Y's replies")
else:
    results.add_fail("5.4: Supplier Sees Only Own Replies", f"Status {response.status_code}")

# Print final summary
results.print_summary()
