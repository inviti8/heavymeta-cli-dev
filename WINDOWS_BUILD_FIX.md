# Windows Build Fix - Shell Compatibility

## Problem
The Windows build was failing because the GitHub Actions workflow was using bash syntax (`[[ ]]`) in a PowerShell environment:

```
ParserError: D:\a\_temp\47d7261b-5419-4e3a-89d5-5c68a666abab.ps1:11
Line |
  11 |  if [[ "windows" == "macos" ]]; then
     |    ~
     | Missing '(' after 'if' in if statement.
```

## Root Cause
- **macOS/Linux**: Use bash shell by default
- **Windows**: Uses PowerShell by default
- The conditional syntax `[[ ]]` is bash-specific and doesn't work in PowerShell

## Solution Applied

### **Split Build Steps by Platform**
Instead of using conditional logic within a single step, I created separate steps for each platform:

#### **1. macOS Build Step**
```yaml
- name: Build executable (macOS)
  if: matrix.platform_name == 'macos'
  run: |
    # macOS-specific build logic using spec file
    pyinstaller --clean --log-level DEBUG hvym.spec
  shell: bash
```

#### **2. Windows Build Step**
```yaml
- name: Build executable (Windows)
  if: matrix.platform_name == 'windows'
  run: |
    # Windows build using build script
    python build_cross_platform.py --platform windows
```

#### **3. Separate Verification Steps**
- **macOS**: Uses bash with Unix commands (`ls`, `test -f`)
- **Windows**: Uses PowerShell with Windows commands (`Test-Path`, `Get-ChildItem`)

### **Benefits of This Approach**

1. **Platform-specific shells**: Each platform uses its native shell
2. **No conditional syntax conflicts**: No need for cross-platform conditional logic
3. **Cleaner separation**: Each platform has its own dedicated build process
4. **Better error handling**: Platform-specific error messages and debugging
5. **Maintainability**: Easier to modify platform-specific logic

### **Key Changes Made**

1. **Replaced single conditional step** with separate platform-specific steps
2. **Added explicit shell declarations** (`shell: bash`, `shell: pwsh`)
3. **Split verification logic** into platform-specific steps
4. **Maintained existing Windows artifact copying** (was already correct)

## Expected Result

- ✅ **Windows builds** will use the build script (no changes to Windows build process)
- ✅ **macOS builds** will use the spec file with runtime hook (fixes MEI error)
- ✅ **Linux builds** continue using Docker (no changes)
- ✅ **No shell compatibility issues** between platforms

Each platform now has its own dedicated, optimized build process without cross-platform shell syntax conflicts.
