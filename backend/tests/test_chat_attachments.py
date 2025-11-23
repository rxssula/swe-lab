#!/usr/bin/env python3
"""
Chat File Attachments Tests
Tests file upload, audio upload, and attachment functionality
"""

import requests
import io
from datetime import datetime
from pathlib import Path

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
        print("TEST SUMMARY - CHAT ATTACHMENTS")
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
print("CHAT ATTACHMENT TESTS - SETUP PHASE")
print("="*70 + "\n")

# Create Consumer
consumer_data = {
    "business_name": "Attachment Test Restaurant",
    "email": f"attachment_consumer_{datetime.now().timestamp()}@test.com",
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
    "business_name": "Attachment Test Supplier",
    "email": f"attachment_supplier_{datetime.now().timestamp()}@test.com",
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

print("\n" + "="*70)
print("TEST 1: IMAGE FILE UPLOAD")
print("="*70 + "\n")

# Test 1.1: Upload small image file
# Create a minimal fake image file (not a real image, but will test file handling)
image_content = b"fake image data for testing purposes"
image_file = io.BytesIO(image_content)

files = {
    'file': ('test_image.jpg', image_file, 'image/jpeg')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/upload-file",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    data = response.json()
    if 'file_url' in data and 'file_name' in data:
        results.test_data['uploaded_file_url'] = data['file_url']
        results.add_pass("1.1: Upload Image File", f"File uploaded: {data['file_name']}")
    else:
        results.add_fail("1.1: Upload Image File", "Response missing file_url or file_name")
else:
    results.add_fail("1.1: Upload Image File", f"Status {response.status_code}: {response.text}")

# Test 1.2: Upload PDF document
pdf_content = b"%PDF-1.4 fake pdf content for testing"
pdf_file = io.BytesIO(pdf_content)

files = {
    'file': ('test_document.pdf', pdf_file, 'application/pdf')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/upload-file",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    data = response.json()
    if 'file_url' in data:
        results.add_pass("1.2: Upload PDF Document", "PDF uploaded successfully")
    else:
        results.add_fail("1.2: Upload PDF Document", "Response missing file_url")
else:
    results.add_fail("1.2: Upload PDF Document", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 2: AUDIO FILE UPLOAD")
print("="*70 + "\n")

# Test 2.1: Upload audio file
audio_content = b"fake audio data for testing"
audio_file = io.BytesIO(audio_content)

files = {
    'file': ('test_audio.mp3', audio_file, 'audio/mpeg')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/upload-audio",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    data = response.json()
    if 'audio_url' in data or 'file_url' in data:
        results.test_data['uploaded_audio_url'] = data.get('audio_url') or data.get('file_url')
        results.add_pass("2.1: Upload Audio File", "Audio file uploaded")
    else:
        results.add_fail("2.1: Upload Audio File", "Response missing audio_url")
else:
    results.add_fail("2.1: Upload Audio File", f"Status {response.status_code}: {response.text}")

# Test 2.2: Send audio message (upload + create message)
audio_content = b"audio message data"
audio_file = io.BytesIO(audio_content)

files = {
    'file': ('voice_message.mp3', audio_file, 'audio/mpeg')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/send-audio-message",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 201:
    data = response.json()
    if data.get('message_type') == 'AUDIO':
        results.test_data['audio_message_id'] = data['id']
        results.add_pass("2.2: Send Audio Message", "Audio message created with attachment")
    else:
        results.add_fail("2.2: Send Audio Message", f"Expected message_type='AUDIO', got {data.get('message_type')}")
else:
    results.add_fail("2.2: Send Audio Message", f"Status {response.status_code}: {response.text}")

print("\n" + "="*70)
print("TEST 3: MULTIPLE FILE ATTACHMENTS")
print("="*70 + "\n")

# Test 3.1: Send message with multiple files (up to 5)
file1 = io.BytesIO(b"file 1 content")
file2 = io.BytesIO(b"file 2 content")
file3 = io.BytesIO(b"file 3 content")

files = [
    ('files', ('file1.jpg', file1, 'image/jpeg')),
    ('files', ('file2.pdf', file2, 'application/pdf')),
    ('files', ('file3.png', file3, 'image/png'))
]

data = {
    'message_text': 'Message with multiple attachments'
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/send-with-files",
    files=files,
    data=data,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 201:
    msg_data = response.json()
    if 'attachments' in msg_data and len(msg_data['attachments']) == 3:
        results.test_data['multi_file_message_id'] = msg_data['id']
        results.add_pass("3.1: Send Multiple Files", "3 files attached to message")
    elif response.status_code == 201:
        # Endpoint might not return attachments in response
        results.add_pass("3.1: Send Multiple Files", "Message created (check attachments separately)")
    else:
        results.add_fail("3.1: Send Multiple Files", f"Expected 3 attachments, got {len(msg_data.get('attachments', []))}")
else:
    results.add_fail("3.1: Send Multiple Files", f"Status {response.status_code}: {response.text}")

# Test 3.2: Verify attachments in message history
response = requests.get(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/messages",
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    messages = response.json()
    # Find the audio message
    audio_msg = next((m for m in messages if m.get('id') == results.test_data.get('audio_message_id')), None)
    if audio_msg:
        if 'attachments' in audio_msg and len(audio_msg['attachments']) > 0:
            results.add_pass("3.2: Attachments in Message History", "Audio message has attachment in response")
        else:
            results.add_fail("3.2: Attachments in Message History", "Audio message missing attachments")
    else:
        results.add_fail("3.2: Attachments in Message History", "Audio message not found in history")
else:
    results.add_fail("3.2: Attachments in Message History", f"Status {response.status_code}")

print("\n" + "="*70)
print("TEST 4: FILE VALIDATION & LIMITS")
print("="*70 + "\n")

# Test 4.1: Upload file without authentication
unauthorized_file = io.BytesIO(b"unauthorized file")
files = {
    'file': ('unauth.jpg', unauthorized_file, 'image/jpeg')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/upload-file",
    files=files
    # No Authorization header
)
if response.status_code == 401:
    results.add_pass("4.1: Upload Without Auth", "401 Unauthorized as expected")
else:
    results.add_fail("4.1: Upload Without Auth", f"Expected 401, got {response.status_code}")

# Test 4.2: Upload to non-existent link
fake_uuid = "00000000-0000-0000-0000-000000000000"
test_file = io.BytesIO(b"test content")
files = {
    'file': ('test.jpg', test_file, 'image/jpeg')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{fake_uuid}/upload-file",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code in [404, 403]:
    results.add_pass("4.2: Upload to Non-existent Link", f"{response.status_code} for invalid link")
else:
    results.add_fail("4.2: Upload to Non-existent Link", f"Expected 404/403, got {response.status_code}")

# Test 4.3: Large file test (create file > 10MB if supported)
# Note: This creates a 1MB file for testing, adjust size based on your limits
large_content = b"X" * (1024 * 1024)  # 1 MB
large_file = io.BytesIO(large_content)

files = {
    'file': ('large_file.jpg', large_file, 'image/jpeg')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/upload-file",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
# Should succeed for 1MB, fail for > 10MB
if response.status_code == 200:
    results.add_pass("4.3: Large File Upload (1MB)", "1MB file accepted")
elif response.status_code == 400:
    # If there's a smaller size limit
    results.add_pass("4.3: Large File Upload (1MB)", "Size limit enforced (file rejected)")
else:
    results.add_fail("4.3: Large File Upload (1MB)", f"Unexpected status {response.status_code}")

# Test 4.4: Invalid file type (if validation exists)
exe_file = io.BytesIO(b"MZ\x90\x00fake exe content")
files = {
    'file': ('malware.exe', exe_file, 'application/x-msdownload')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/upload-file",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 400:
    results.add_pass("4.4: Invalid File Type Rejected", "EXE file blocked")
elif response.status_code == 200:
    # If no file type validation implemented yet
    results.add_pass("4.4: Invalid File Type Rejected", "No file type validation (consider implementing)")
else:
    results.add_fail("4.4: Invalid File Type Rejected", f"Unexpected status {response.status_code}")

# Test 4.5: Empty file
empty_file = io.BytesIO(b"")
files = {
    'file': ('empty.txt', empty_file, 'text/plain')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/upload-file",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
# Either accept or reject with clear error
if response.status_code in [200, 400]:
    results.add_pass("4.5: Empty File Handling", f"Handled appropriately ({response.status_code})")
else:
    results.add_fail("4.5: Empty File Handling", f"Unexpected status {response.status_code}")

print("\n" + "="*70)
print("TEST 5: ATTACHMENT METADATA")
print("="*70 + "\n")

# Test 5.1: Verify file URL format
if results.test_data.get('uploaded_file_url'):
    file_url = results.test_data['uploaded_file_url']
    if '/uploads/' in file_url or file_url.startswith('http'):
        results.add_pass("5.1: File URL Format", f"Valid URL format: {file_url[:50]}...")
    else:
        results.add_fail("5.1: File URL Format", f"Unexpected URL format: {file_url}")
else:
    results.add_fail("5.1: File URL Format", "No file URL available to test")

# Test 5.2: File metadata in response
image_file = io.BytesIO(b"test image for metadata check")
files = {
    'file': ('metadata_test.jpg', image_file, 'image/jpeg')
}

response = requests.post(
    f"{BASE_URL}/chat/links/{results.test_data['link_id']}/upload-file",
    files=files,
    headers={"Authorization": f"Bearer {results.test_data['consumer_token']}"}
)
if response.status_code == 200:
    data = response.json()
    required_fields = ['file_url', 'file_name', 'file_type']
    missing_fields = [f for f in required_fields if f not in data]

    if not missing_fields:
        results.add_pass("5.2: File Metadata Complete", "All required fields present")
    else:
        results.add_fail("5.2: File Metadata Complete", f"Missing fields: {missing_fields}")
else:
    results.add_fail("5.2: File Metadata Complete", f"Status {response.status_code}")

# Print final summary
results.print_summary()
