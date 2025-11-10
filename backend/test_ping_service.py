"""
Test script for ping_service.py

This script tests the ping service to make sure it can reach your deployed app.
Run this before deploying the full ping service to verify everything works.
"""

import os
import sys
import requests
from datetime import datetime

def test_health_endpoint(app_url):
    """
    Test if the health endpoint is accessible and returns the expected response.

    Args:
        app_url: The base URL of your deployed application
    """
    print("="*60)
    print("🧪 TESTING PING SERVICE")
    print("="*60)
    print(f"📍 Target URL: {app_url}")
    print(f"⏰ Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Test 1: Root endpoint
    print("─"*60)
    print("Test 1: Testing root endpoint (/)")
    print("─"*60)
    try:
        response = requests.get(f"{app_url}/", timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 200:
            print("✅ Root endpoint is working!\n")
        else:
            print("⚠️  Root endpoint returned non-200 status\n")
    except Exception as e:
        print(f"❌ Error accessing root endpoint: {str(e)}\n")

    # Test 2: Health endpoint
    print("─"*60)
    print("Test 2: Testing health endpoint (/health)")
    print("─"*60)
    try:
        start_time = datetime.now()
        response = requests.get(f"{app_url}/health", timeout=90)
        elapsed = (datetime.now() - start_time).total_seconds()

        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f} seconds")
        print(f"Response: {response.json()}")

        if response.status_code == 200:
            print("✅ Health endpoint is working!")

            # Check if response time indicates cold start
            if elapsed > 10:
                print(f"⚠️  Response took {elapsed:.2f}s - this looks like a cold start")
                print("   This is normal if the app was asleep. The ping service will prevent this.")
            else:
                print(f"✅ Fast response ({elapsed:.2f}s) - app is already warm")

        else:
            print(f"❌ Health endpoint returned status {response.status_code}")
            return False

    except requests.exceptions.Timeout:
        print("❌ Request timed out after 90 seconds")
        print("   Your app might be taking too long to wake up")
        print("   Check your Render logs for issues")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection error: {str(e)}")
        print("   Check that:")
        print("   1. The URL is correct")
        print("   2. Your app is deployed and running on Render")
        print("   3. There are no network/firewall issues")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

    # Final summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print("✅ All tests passed!")
    print("\n🎉 Your app is ready for the ping service!")
    print("\n📝 Next steps:")
    print("   1. Set environment variable: export APP_URL='" + app_url + "'")
    print("   2. Run ping service: python ping_service.py")
    print("   3. Or use GitHub Actions (see PING_SERVICE_README.md)")
    print("="*60)

    return True

def main():
    """Main function to run tests."""

    # Get URL from environment or command line
    app_url = os.getenv("APP_URL", "")

    if len(sys.argv) > 1:
        app_url = sys.argv[1]

    if not app_url:
        print("❌ ERROR: APP_URL not provided!")
        print("\nUsage:")
        print("   Option 1: python test_ping_service.py https://your-app.onrender.com")
        print("   Option 2: export APP_URL='https://your-app.onrender.com' && python test_ping_service.py")
        sys.exit(1)

    # Clean up URL
    app_url = app_url.strip().rstrip('/')

    if not app_url.startswith(('http://', 'https://')):
        print("❌ ERROR: URL must start with http:// or https://")
        print(f"   You provided: {app_url}")
        sys.exit(1)

    # Run tests
    success = test_health_endpoint(app_url)

    if not success:
        print("\n❌ Tests failed. Please fix the issues above before using the ping service.")
        sys.exit(1)

    sys.exit(0)

if __name__ == "__main__":
    main()
