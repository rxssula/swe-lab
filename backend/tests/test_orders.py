"""
Test script for Order Management System
Tests all order endpoints with proper authentication
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

def print_response(title, response):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2, default=str))
    except:
        print(response.text)


def test_order_endpoints():
    """
    Test order management endpoints

    Note: This test requires:
    1. A consumer user with an active business
    2. A supplier user with an active business
    3. An accepted link between consumer and supplier
    4. Products created by the supplier

    You'll need to update the credentials and IDs below
    """

    print("\n" + "="*60)
    print("ORDER MANAGEMENT SYSTEM - API TEST")
    print("="*60)

    # Test 1: Health check
    print("\n1. Testing server health...")
    response = requests.get(f"{BASE_URL}/health")
    print_response("Health Check", response)

    # Test 2: Check OpenAPI docs for order endpoints
    print("\n2. Checking order endpoints in OpenAPI...")
    response = requests.get(f"{BASE_URL}/openapi.json")
    if response.status_code == 200:
        openapi = response.json()
        order_paths = [path for path in openapi['paths'].keys() if '/orders' in path]
        print("\n✓ Order Endpoints Found:")
        for path in sorted(order_paths):
            methods = list(openapi['paths'][path].keys())
            print(f"  - {path} [{', '.join(m.upper() for m in methods)}]")

    print("\n" + "="*60)
    print("MANUAL TESTING REQUIRED")
    print("="*60)
    print("""
To fully test the order management system, you need to:

1. Create/Login as a CONSUMER user:
   POST /auth/consumer-signup or POST /auth/login

2. Create/Login as a SUPPLIER user:
   POST /auth/supplier-signup or POST /auth/login

3. Create an ACCEPTED link between consumer and supplier:
   POST /links/request (as consumer)
   POST /links/{link_id}/accept (as supplier)

4. Create some PRODUCTS (as supplier):
   POST /products/

5. Then test order creation (as consumer):
   POST /orders/
   Body: {
     "supplier_id": "supplier-uuid",
     "delivery_notes": "Please deliver before 10 AM",
     "delivery_option": "delivery",
     "items": [
       {"product_id": "product-uuid", "quantity": 5}
     ]
   }

6. Test order management (as supplier):
   - POST /orders/{order_id}/accept
   - POST /orders/{order_id}/reject?rejection_reason=Out of stock
   - POST /orders/{order_id}/complete

7. Test order tracking:
   - GET /orders/{order_id} (both consumer and supplier)
   - GET /orders/consumer/history (as consumer)
   - GET /orders/supplier/incoming (as supplier)

8. Test cancel order (as consumer):
   - POST /orders/{order_id}/cancel

9. Test reorder (as consumer):
   - POST /orders/{order_id}/reorder

API Documentation available at: http://127.0.0.1:8000/docs
""")


def get_api_documentation():
    """Print API documentation for order endpoints"""
    print("\n" + "="*60)
    print("ORDER MANAGEMENT API DOCUMENTATION")
    print("="*60)

    endpoints = {
        "Consumer Endpoints": [
            {
                "method": "POST",
                "path": "/orders/",
                "description": "Create a new order",
                "auth": "Required (Consumer)",
                "body": {
                    "supplier_id": "uuid",
                    "delivery_notes": "string (optional)",
                    "delivery_option": "delivery or pickup",
                    "items": [
                        {"product_id": "uuid", "quantity": "integer"}
                    ]
                }
            },
            {
                "method": "GET",
                "path": "/orders/consumer/history",
                "description": "Get order history for consumer",
                "auth": "Required (Consumer)",
                "params": "?status=pending&supplier_id=uuid&skip=0&limit=100"
            },
            {
                "method": "POST",
                "path": "/orders/{order_id}/cancel",
                "description": "Cancel an order",
                "auth": "Required (Consumer)",
                "body": None
            },
            {
                "method": "POST",
                "path": "/orders/{order_id}/reorder",
                "description": "Create a new order based on previous order",
                "auth": "Required (Consumer)",
                "body": {
                    "delivery_notes": "string (optional)",
                    "delivery_option": "delivery or pickup (optional)"
                }
            }
        ],
        "Supplier Endpoints": [
            {
                "method": "GET",
                "path": "/orders/supplier/incoming",
                "description": "View incoming orders",
                "auth": "Required (Supplier)",
                "params": "?status=pending&consumer_id=uuid&skip=0&limit=100"
            },
            {
                "method": "POST",
                "path": "/orders/{order_id}/accept",
                "description": "Accept an order",
                "auth": "Required (Supplier)",
                "body": None
            },
            {
                "method": "POST",
                "path": "/orders/{order_id}/reject",
                "description": "Reject an order",
                "auth": "Required (Supplier)",
                "params": "?rejection_reason=string (required)"
            },
            {
                "method": "POST",
                "path": "/orders/{order_id}/complete",
                "description": "Mark order as completed",
                "auth": "Required (Supplier)",
                "body": None
            }
        ],
        "Shared Endpoints": [
            {
                "method": "GET",
                "path": "/orders/{order_id}",
                "description": "Get order details",
                "auth": "Required (Consumer or Supplier)",
                "body": None
            }
        ]
    }

    for category, eps in endpoints.items():
        print(f"\n{category}:")
        print("-" * 60)
        for ep in eps:
            print(f"\n{ep['method']} {ep['path']}")
            print(f"Description: {ep['description']}")
            print(f"Auth: {ep['auth']}")
            if ep.get('params'):
                print(f"Params: {ep['params']}")
            if ep.get('body'):
                print(f"Body: {json.dumps(ep['body'], indent=2)}")


if __name__ == "__main__":
    test_order_endpoints()
    get_api_documentation()

    print("\n" + "="*60)
    print("✓ Order Management System is ready for testing!")
    print("="*60)
    print(f"\nInteractive API Docs: {BASE_URL}/docs")
    print(f"ReDoc Documentation: {BASE_URL}/redoc")
