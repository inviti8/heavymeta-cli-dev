# Pintheon SSL Certificate Installation Guide

This guide provides step-by-step instructions for installing the Pintheon SSL certificate on different operating systems using the most user-friendly GUI tools available.

## Table of Contents
- [Windows](#windows)
  - [Using Certificate Manager](#windows-certificate-manager)
  - [Using MMC (Microsoft Management Console)](#windows-mmc)
- [macOS](#macos)
  - [Using Keychain Access](#macos-keychain)
- [Linux](#linux)
  - [Using GNOME Keyring/Seahorse](#linux-gnome)
  - [Using KDE's Kleopatra](#linux-kde)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Windows

### Using Certificate Manager (Recommended)
1. **Locate the Certificate**
   - Navigate to `/home/pintheon_data/ssl/`
   - Copy `pintheon.crt` to your Windows machine

2. **Install the Certificate**
   - Right-click on `pintheon.crt` and select "Install Certificate"
   - Select "Local Machine" (requires admin rights) or "Current User"
   - Click "Next"
   - Select "Place all certificates in the following store"
   - Click "Browse" and select "Trusted Root Certification Authorities"
   - Click "OK" and then "Next"
   - Click "Finish"
   - If prompted, confirm with administrator credentials

### Using MMC (Alternative Method)
1. Press `Win + R`, type `mmc`, and press Enter
2. Go to File > Add/Remove Snap-in
3. Select "Certificates" and click "Add"
4. Choose "Computer account" > "Local computer"
5. Click "Finish" and then "OK"
6. In the left pane, expand "Certificates (Local Computer)"
7. Right-click on "Trusted Root Certification Authorities"
8. Select All Tasks > Import
9. Click "Next" and browse to `pintheon.crt`
10. Follow the wizard to complete the import

## macOS

### Using Keychain Access
1. **Open Keychain Access**
   - Press `Cmd + Space` and type "Keychain Access"
   - Press Enter to open the application

2. **Import the Certificate**
   - Go to File > Import Items...
   - Navigate to `/home/pintheon_data/ssl/pintheon.crt`
   - Select the file and click "Open"

3. **Trust the Certificate**
   - In Keychain Access, select the "login" keychain (or "System" for all users)
   - Find the certificate named "Pintheon" (or similar)
   - Double-click the certificate
   - Expand the "Trust" section
   - Next to "When using this certificate", select "Always Trust"
   - Close the certificate window
   - Enter your password when prompted

## Linux

### Using GNOME Keyring/Seahorse (GNOME-based distributions)
1. **Install Seahorse** (if not installed)
   ```bash
   # Ubuntu/Debian
   sudo apt install seahorse
   
   # Fedora
   sudo dnf install seahorse
   
   # Arch Linux
   sudo pacman -S seahorse
   ```

2. **Open Passwords and Keys**
   - Open the application menu and search for "Passwords and Keys"
   - Or run `seahorse` in the terminal

3. **Import the Certificate**
   - Go to File > Import
   - Select `pintheon.crt` from `/home/pintheon_data/ssl/`
   - Choose "Trusted" or "Trusted CA" as the destination
   - Enter your password when prompted

### Using KDE's Kleopatra (KDE Plasma)
1. **Install Kleopatra** (if not installed)
   ```bash
   # Ubuntu/Debian
   sudo apt install kleopatra
   
   # Fedora
   sudo dnf install kleopatra
   
   # Arch Linux
   sudo pacman -S kleopatra
   ```

2. **Open Kleopatra**
   - Search for "Kleopatra" in the application menu
   - Or run `kleopatra` in the terminal

3. **Import the Certificate**
   - Go to File > Import Certificates
   - Navigate to `/home/pintheon_data/ssl/pintheon.crt`
   - Click "Open"
   - Right-click the imported certificate
   - Select "Change Owner Trust..."
   - Choose "I believe checks are accurate"
   - Click "OK"

## Verification for Self-Signed Certificates

### Windows
1. Open `certmgr.msc`
2. Navigate to "Trusted Root Certification Authorities" > "Certificates"
3. Look for the Pintheon certificate (it may have a warning icon)
4. Double-click the certificate and check:
   - It's in the "Trusted Root Certification Authorities" store
   - The "Certificate Status" shows "This CA Root certificate is not trusted" (normal for self-signed)
   - The "Valid from" dates are correct

### macOS
1. Open Keychain Access
2. Search for the certificate name (e.g., "Pintheon")
3. Double-click the certificate
4. In the "Trust" section, verify:
   - "When using this certificate" is set to "Always Trust"
   - Note: The certificate will still show as not trusted in the main view (expected for self-signed)
5. Close the certificate window and enter your password to save the trust settings

### Linux
```bash
# For self-signed certificates, you'll see the certificate details
openssl x509 -in /home/pintheon_data/ssl/pintheon.crt -text -noout

# To verify the certificate is in the trusted store (may still show as self-signed)
openssl verify /home/pintheon_data/ssl/pintheon.crt
# Note: This may show "self signed certificate" which is expected
```

## Troubleshooting Self-Signed Certificates

### Browser Warnings Still Appear
- **Expected Behavior**: Browsers will still show security warnings for self-signed certificates
- **Solution**:
  1. When you see the warning, look for an "Advanced" or "Proceed" option
  2. Add a permanent exception in your browser
  
### Certificate Not Trusted
- **macOS**:
  - Open Keychain Access and delete any existing entries for the certificate
  - Re-import the certificate and set "When using this certificate" to "Always Trust"
  - Restart your applications

- **Windows**:
  - Open `certmgr.msc` and ensure the certificate is in "Trusted Root Certification Authorities"
  - Right-click the certificate > All Tasks > Export, then re-import it

- **Linux**:
  ```bash
  # Update certificate stores
  # Ubuntu/Debian
  sudo update-ca-certificates --fresh
  
  # Fedora/RHEL/CentOS
  sudo update-ca-trust force-enable
  sudo update-ca-trust extract
  
  # Clear browser SSL state and restart
  ```

### Certificate Verification Fails
- Check the certificate details matches what you expect:
  ```bash
  openssl x509 -in /home/pintheon_data/ssl/pintheon.crt -noout -subject -issuer
  ```
- Ensure the certificate hasn't expired:
  ```bash
  openssl x509 -in /home/pintheon_data/ssl/pintheon.crt -noout -dates
  ```

### Permission Issues
- Ensure you have read access to the certificate file:
  ```bash
  chmod 644 /home/pintheon_data/ssl/pintheon.crt
  ```
- For system-wide installation, use `sudo` or run as root

### Browser-Specific Issues
- **Firefox**: Manually import the certificate in Firefox settings
  - Go to `about:preferences#privacy`
  - Scroll down to "Certificates" and click "View Certificates"
  - Go to "Authorities" tab and click "Import"

- **Chrome/Chromium**: Uses the system certificate store but may require a restart

## Understanding Self-Signed Certificates

### What to Expect
- **Security Warnings**: Browsers and applications will show security warnings for self-signed certificates
- **Trust on First Use**: You'll need to explicitly trust the certificate on each device
- **Not for Production**: Self-signed certificates are not suitable for production public websites

### When to Consider a Proper CA
For production use, consider obtaining a certificate from a trusted Certificate Authority (CA) like:
- Let's Encrypt (free)
- DigiCert
- GlobalSign
- Sectigo

## Additional Resources
- [Microsoft Certificate Management](https://support.microsoft.com/en-us/windows/view-or-manage-certificates-in-internet-explorer-aaae700b-a9d5-bf6a-4105-492a9949f6e1)
- [Apple Keychain Help](https://support.apple.com/guide/keychain-access/welcome/mac)
- [GNOME Seahorse Documentation](https://help.gnome.org/users/seahorse/stable/)
- [KDE Kleopatra Handbook](https://docs.kde.org/stable5/en/kdepim/kleopatra/)
