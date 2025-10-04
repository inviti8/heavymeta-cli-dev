#!/bin/bash
# Install certificate on Linux
CERT_PATH="$1"
DEST_PATH="/usr/local/share/ca-certificates/pintheon.crt"

# Copy certificate
cp "$CERT_PATH" "$DEST_PATH"

# Update certificates
update-ca-certificates
