# GitHub Actions Directory Structure Fix

## Problem
The GitHub Actions workflow was failing because it was trying to change to a non-existent `../hvym` directory:

```
/Users/runner/work/_temp/dd30f514-3982-48f8-b315-54c5a4b3085b.sh: line 18: cd: ../hvym: No such file or directory
```

## Root Cause
The workflow expects a specific directory structure:
- Source code is checked out to the current directory (e.g., `heavymeta-cli-dev/`)
- Build artifacts should be placed in `hvym/dist/{platform}/`
- The previous fix assumed we could `cd ../hvym` but that directory doesn't exist in GitHub Actions

## Solution Applied

### 1. **Fixed Directory Structure**
Instead of trying to change directories, we now:
- Stay in the source directory (`heavymeta-cli-dev/`)
- Create the expected `hvym/dist/macos/` directory structure
- Build with the spec file directly in the source directory
- Copy the built binary to the expected location

### 2. **Updated Build Process**
```yaml
# Create the expected directory structure for the workflow
echo "Creating hvym directory structure..."
mkdir -p hvym/dist/macos

# Install dependencies first (since we're not using the build script)
echo "Installing dependencies for spec file build..."
pip install -r requirements.txt

# Build using spec file for proper runtime hook inclusion
pyinstaller --clean --log-level DEBUG hvym.spec

# Copy to expected location
cp dist/hvym hvym/dist/macos/hvym
```

### 3. **Updated Verification Steps**
- Check for binary at `hvym/dist/macos/hvym` (not `../hvym/dist/macos/hvym`)
- Provide better error messages showing directory contents

### 4. **Updated Artifact Copying**
- Copy from `hvym/dist/macos/` (not `../hvym/dist/macos/`)
- Simplified the logic since we now have a consistent structure

## Key Changes Made

1. **Build Step**: Creates `hvym/dist/macos/` and builds directly in source directory
2. **Verification Step**: Checks `hvym/dist/macos/hvym` for the binary
3. **Artifact Copy Step**: Copies from `hvym/dist/macos/` to `artifacts/macos/`

## Expected Result

The next GitHub Actions build should:
1. ✅ Create the proper directory structure
2. ✅ Install dependencies correctly
3. ✅ Build using the spec file with runtime hook
4. ✅ Place the binary in the expected location
5. ✅ Pass all verification steps
6. ✅ Create the proper artifacts for release

The macOS binary should then work without the MEI temp directory error.
