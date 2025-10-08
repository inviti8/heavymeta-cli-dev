# GitHub Actions Fix for macOS MEI Error

## Problem Identified

The GitHub Actions build was including the runtime hook but **not using it correctly**:

- **Local build**: Used `pyinstaller hvym.spec` → runtime hook in `runtime_hooks` parameter ✅ **WORKED**
- **GitHub Actions**: Used `pyinstaller --runtime-hook pyi_rth_hvym.py` → runtime hook as CLI flag ❌ **FAILED**

The `--runtime-hook` CLI flag doesn't work the same way as the `runtime_hooks` parameter in the spec file.

## Solution Applied

Updated `.github/workflows/build-release.yml` to:

### 1. **Use Spec File for macOS Builds**
```yaml
# For macOS, use the spec file which properly handles the runtime hook
if [[ "${{ matrix.platform_name }}" == "macos" ]]; then
  echo "Building macOS executable with spec file..."
  cd ../hvym
  pyinstaller --clean --log-level DEBUG ../heavymeta-cli-dev/hvym.spec
```

### 2. **Maintain Build Script for Other Platforms**
```yaml
else
  # Use the build script for other platforms
  python build_cross_platform.py --platform ${{ matrix.platform_name }}
fi
```

### 3. **Handle Different Directory Structures**
- **Spec file build**: Creates `../hvym/dist/hvym` → copies to `../hvym/dist/macos/hvym`
- **Build script**: Creates `../hvym/dist/macos/hvym` directly

### 4. **Updated Verification and Artifact Handling**
- Checks both possible binary locations
- Handles different directory structures for artifact copying
- Maintains compatibility with existing workflow

## Why This Fixes the MEI Error

1. **Proper Runtime Hook Inclusion**: The spec file's `runtime_hooks` parameter ensures the hook is executed at the right time during PyInstaller bootloader initialization

2. **Consistent with Local Testing**: Uses the same build method that we verified works locally

3. **Cross-Platform Safety**: Only affects macOS builds, Windows and Linux continue using the build script

## Expected Result

The next GitHub Actions build should:
- Include the runtime hook properly
- Create macOS binaries that don't have the MEI temp directory error
- Work identically to our local successful builds

## Verification

After the next build, search the logs for:
```
INFO: Including custom run-time hook '/path/to/pyi_rth_hvym.py'
```

And test the downloaded binary with:
```bash
HVYM_DIAG=1 ./hvym-macos-arm64 --help
```

You should see diagnostic output showing the safe temp directory creation.
