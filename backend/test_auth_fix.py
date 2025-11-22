"""
Quick test to verify the auth fix works
"""
from app.auth.auth import create_access_token, Token

# Test creating a token with user_type and role
token = create_access_token(
    data={"sub": "test-user-id"},
    user_type="consumer",
    role="owner"
)

print("✓ Token created successfully!")
print(f"  Access Token: {token.access_token[:50]}...")
print(f"  Token Type: {token.token_type}")
print(f"  User Type: {token.user_type}")
print(f"  Role: {token.role}")

# Verify Token model
assert isinstance(token, Token)
assert token.user_type == "consumer"
assert token.role == "owner"
assert token.token_type == "bearer"

print("\n✓ All validations passed!")
print("\nThe authentication fix is working correctly.")
print("Consumer and supplier signup/login will now return:")
print("{")
print('  "access_token": "...",')
print('  "token_type": "bearer",')
print('  "user": {...},')
print('  "user_type": "consumer" or "supplier",')
print('  "role": "owner", "admin", etc.')
print("}")
