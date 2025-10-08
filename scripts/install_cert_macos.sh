#!/bin/bash
# Install certificate on macOS
CERT_PATH="$1"

# Add certificate to system keychain
security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_PATH"
