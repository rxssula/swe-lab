"""
Keep-Alive Ping Service for Render Free Tier

PURPOSE:
--------
Render's free tier automatically puts applications to sleep after 15 minutes
of inactivity. This service prevents that by sending HTTP requests to your
application every 14 minutes, keeping it awake 24/7.

HOW IT WORKS:
-------------
1. Sends an HTTP GET request to your app's /health endpoint
2. Waits 14 minutes (840 seconds) - just under Render's 15-minute timeout
3. Repeats indefinitely

USAGE:
------
Set environment variable and run:
    export APP_URL="https://your-app.onrender.com"
    python ping_service.py

Or use a .env file with python-dotenv (optional).
"""

import requests
import time
import os
import sys
from datetime import datetime, timedelta
import logging
from typing import Dict, Optional

# ============================================================================
# CONFIGURATION
# ============================================================================

# Try to load from .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv('.env.ping')
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False

# Configure logging with colors (if terminal supports it)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Configuration from environment variables
APP_URL = os.getenv("APP_URL", "").strip().rstrip('/')
PING_INTERVAL = int(os.getenv("PING_INTERVAL", 840))  # 14 minutes default
HEALTH_ENDPOINT = os.getenv("HEALTH_ENDPOINT", "/health")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))
RETRY_DELAY = int(os.getenv("RETRY_DELAY", 30))  # seconds between retries

# ============================================================================
# VALIDATION
# ============================================================================

def validate_configuration() -> bool:
    """
    Validates that all required configuration is present and correct.

    Returns:
        bool: True if configuration is valid, False otherwise
    """
    if not APP_URL:
        logger.error("❌ ERROR: APP_URL is not set!")
        logger.error("   Please set it using: export APP_URL='https://your-app.onrender.com'")
        return False

    if not APP_URL.startswith(('http://', 'https://')):
        logger.error(f"❌ ERROR: APP_URL must start with http:// or https://")
        logger.error(f"   Current value: {APP_URL}")
        return False

    if PING_INTERVAL < 60:
        logger.error(f"❌ ERROR: PING_INTERVAL too short ({PING_INTERVAL}s). Minimum is 60 seconds.")
        return False

    if PING_INTERVAL >= 900:  # 15 minutes
        logger.warning(f"⚠️  WARNING: PING_INTERVAL ({PING_INTERVAL}s) is >= 15 minutes.")
        logger.warning(f"   Your app may still go to sleep on Render free tier.")

    return True

# ============================================================================
# PING FUNCTIONALITY
# ============================================================================

def ping_app(retries: int = MAX_RETRIES) -> bool:
    """
    Sends a ping request to the application's health endpoint.

    This function:
    1. Constructs the full URL by combining APP_URL + HEALTH_ENDPOINT
    2. Sends an HTTP GET request with a 30-second timeout
    3. Retries on failure with exponential backoff
    4. Logs detailed information about success/failure

    Args:
        retries: Number of retry attempts if the request fails

    Returns:
        bool: True if ping was successful (HTTP 200), False otherwise
    """
    url = f"{APP_URL}{HEALTH_ENDPOINT}"

    for attempt in range(1, retries + 1):
        try:
            # Send GET request with timeout
            # Timeout is important: if app is waking from sleep, it might take 30-60s
            logger.info(f"🔄 Attempt {attempt}/{retries}: Pinging {url}")

            start_time = time.time()
            response = requests.get(url, timeout=90)  # 90s timeout for cold starts
            elapsed_time = time.time() - start_time

            # Check if request was successful
            if response.status_code == 200:
                logger.info(f"✅ SUCCESS! Status: {response.status_code} | Response time: {elapsed_time:.2f}s")

                # Try to parse and log JSON response
                try:
                    data = response.json()
                    logger.info(f"📊 Response data: {data}")
                except Exception:
                    logger.info(f"📄 Response text: {response.text[:200]}")

                return True
            else:
                logger.warning(f"⚠️  Non-200 status code: {response.status_code}")
                logger.warning(f"   Response: {response.text[:200]}")

        except requests.exceptions.Timeout:
            logger.error(f"⏱️  TIMEOUT after 90 seconds (attempt {attempt}/{retries})")
            logger.error(f"   This might mean your app is taking too long to wake up")

        except requests.exceptions.ConnectionError as e:
            logger.error(f"🔌 CONNECTION ERROR (attempt {attempt}/{retries}): {str(e)}")
            logger.error(f"   Check if the URL is correct and the app is deployed")

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ REQUEST ERROR (attempt {attempt}/{retries}): {str(e)}")

        # Wait before retry (except on last attempt)
        if attempt < retries:
            wait_time = RETRY_DELAY * attempt  # Exponential backoff
            logger.info(f"⏳ Waiting {wait_time}s before retry...")
            time.sleep(wait_time)

    # All retries failed
    logger.error(f"💔 All {retries} attempts failed!")
    return False

# ============================================================================
# STATISTICS TRACKING
# ============================================================================

class PingStats:
    """Tracks statistics about ping attempts for monitoring."""

    def __init__(self):
        self.total_pings = 0
        self.successful_pings = 0
        self.failed_pings = 0
        self.start_time = datetime.now()

    def record_success(self):
        self.total_pings += 1
        self.successful_pings += 1

    def record_failure(self):
        self.total_pings += 1
        self.failed_pings += 1

    def get_success_rate(self) -> float:
        if self.total_pings == 0:
            return 0.0
        return (self.successful_pings / self.total_pings) * 100

    def get_uptime(self) -> str:
        uptime = datetime.now() - self.start_time
        return str(uptime).split('.')[0]  # Remove microseconds

    def print_stats(self):
        logger.info("="*60)
        logger.info("📈 PING STATISTICS")
        logger.info(f"   Total pings: {self.total_pings}")
        logger.info(f"   Successful: {self.successful_pings} ✅")
        logger.info(f"   Failed: {self.failed_pings} ❌")
        logger.info(f"   Success rate: {self.get_success_rate():.1f}%")
        logger.info(f"   Service uptime: {self.get_uptime()}")
        logger.info("="*60)

# ============================================================================
# MAIN LOOP
# ============================================================================

def calculate_next_ping_time() -> datetime:
    """Calculate when the next ping will occur."""
    return datetime.now() + timedelta(seconds=PING_INTERVAL)

def main():
    """
    Main loop that runs continuously, sending pings at regular intervals.

    FLOW:
    1. Validates configuration
    2. Prints startup information
    3. Enters infinite loop:
       - Sends ping to app
       - Records success/failure
       - Waits for PING_INTERVAL seconds
       - Repeats
    4. On Ctrl+C, prints final statistics and exits gracefully
    """

    # Validate configuration before starting
    if not validate_configuration():
        logger.error("\n🛑 Configuration validation failed. Please fix the errors above.")
        sys.exit(1)

    # Print startup banner
    logger.info("="*60)
    logger.info("🚀 KEEP-ALIVE PING SERVICE STARTED")
    logger.info("="*60)
    logger.info(f"📍 Target URL: {APP_URL}")
    logger.info(f"🎯 Health endpoint: {HEALTH_ENDPOINT}")
    logger.info(f"⏱️  Ping interval: {PING_INTERVAL} seconds ({PING_INTERVAL/60:.1f} minutes)")
    logger.info(f"🔄 Max retries per ping: {MAX_RETRIES}")
    logger.info(f"⏳ Retry delay: {RETRY_DELAY} seconds")

    if DOTENV_AVAILABLE:
        logger.info(f"📁 Loaded config from: .env.ping")
    else:
        logger.info(f"⚙️  Using environment variables")

    logger.info("="*60)
    logger.info("💡 Press Ctrl+C to stop the service\n")

    # Initialize statistics tracker
    stats = PingStats()

    # Main loop
    ping_count = 0
    try:
        while True:
            ping_count += 1
            next_ping = calculate_next_ping_time()

            # Print ping header
            logger.info("\n" + "─"*60)
            logger.info(f"📡 PING #{ping_count} | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info("─"*60)

            # Send ping
            success = ping_app()

            # Record result
            if success:
                stats.record_success()
            else:
                stats.record_failure()

            # Print statistics every 10 pings
            if ping_count % 10 == 0:
                stats.print_stats()

            # Calculate and display wait time
            logger.info(f"\n⏰ Next ping at: {next_ping.strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"💤 Sleeping for {PING_INTERVAL} seconds ({PING_INTERVAL/60:.1f} minutes)...\n")

            # Wait until next ping
            time.sleep(PING_INTERVAL)

    except KeyboardInterrupt:
        # Graceful shutdown on Ctrl+C
        logger.info("\n\n" + "="*60)
        logger.info("🛑 SHUTDOWN REQUESTED (Ctrl+C)")
        logger.info("="*60)
        stats.print_stats()
        logger.info("\n👋 Ping service stopped. Goodbye!")
        sys.exit(0)

    except Exception as e:
        # Handle unexpected errors
        logger.error(f"\n💥 UNEXPECTED ERROR: {str(e)}")
        logger.error(f"   The service will now exit.")
        stats.print_stats()
        sys.exit(1)

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()
