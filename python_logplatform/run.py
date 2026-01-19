#!/usr/bin/env python3
"""
Script to run the Python Log Platform application
"""

import os
import sys
from app import log_service, app  # Import both the service and the app


def main():
    print("Starting Python Log Platform...")
    print(f"Log directory: {log_service.config.full_log_path}")
    
    # Check if log directory exists, create if not
    os.makedirs(log_service.config.full_log_path, exist_ok=True)
    
    print("Application is running at http://localhost:8080")
    print("Press Ctrl+C to stop the server")
    
    try:
        app.run(debug=False, host='0.0.0.0', port=8080)
    except KeyboardInterrupt:
        print("\nShutting down the server...")
        sys.exit(0)


if __name__ == '__main__':
    main()