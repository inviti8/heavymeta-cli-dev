# Cross-Platform Build Script

This directory contains a comprehensive cross-platform build script for the HeavyMeta CLI that supports Windows, macOS, and Linux builds.

## Files

- `build.py` - Original Linux-focused build script (kept for compatibility)
- `build_cross_platform.py` - New comprehensive cross-platform build script
- `BUILD_README.md` - This documentation file

## Prerequisites

Before building, ensure you have the following installed:

1. **Python 3.8+** with pip
2. **PyInstaller** and all dependencies from `requirements.txt`
3. **Platform-specific requirements**:
   - **Windows**: Visual Studio Build Tools (for C extensions)
   - **macOS**: Xcode Command Line Tools
   - **Linux**: Build essentials (`sudo apt-get install build-essential` on Ubuntu/Debian)

## Installation

```bash
# Install all dependencies
pip install -r requirements.txt

# Install PyInstaller
pip install pyinstaller
```

## Usage

### Basic Usage

Build for the current platform:
```bash
python build_cross_platform.py
```

### Platform-Specific Builds

Build for a specific platform:
```bash
# Windows
python build_cross_platform.py --platform windows

# macOS
python build_cross_platform.py --platform macos

# Linux
python build_cross_platform.py --platform linux
```

### Build for All Platforms

Build executables for all supported platforms:
```bash
python build_cross_platform.py --platform all
```

### Other Options

Show platform information:
```bash
python build_cross_platform.py --info
```

Skip cleaning build directory:
```bash
python build_cross_platform.py --no-clean
```

## Output Structure

The build script creates the following directory structure:

```
hvym/
├── dist/
│   ├── windows/
│   │   ├── hvym.exe
│   │   └── release_info.json
│   ├── macos/
│   │   ├── hvym
│   │   └── release_info.json
│   └── linux/
│       ├── hvym
│       └── release_info.json
├── build/          # PyInstaller build files
├── hvym.py         # Main source file
├── requirements.txt
├── templates/      # Template files
├── images/         # Image assets
├── scripts/        # Script files
├── data/           # Data files
├── npm_links/      # NPM links
├── qthvym/         # Extracted qthvym assets
└── qtwidgets/      # Extracted qtwidgets assets
```

## Platform-Specific Features

### Windows
- Creates `hvym.exe` executable
- Handles Windows-specific DLL loading
- Uses Windows-compatible paths

### macOS
- Creates `hvym` executable
- Handles macOS bundle structure
- Sets proper permissions

### Linux
- Creates `hvym` executable
- Sets executable permissions (755)
- Handles Linux package paths

## Troubleshooting

### Common Issues

1. **Missing dependencies**: Run `pip install -r requirements.txt`
2. **PyInstaller not found**: Install with `pip install pyinstaller`
3. **Permission errors**: Ensure you have write permissions to the build directory
4. **Platform-specific build tools**: Install required build tools for your platform

### Platform-Specific Issues

**Windows**:
- If you get "Microsoft Visual C++ 14.0 is required" error, install Visual Studio Build Tools
- Ensure you're running from a command prompt with administrator privileges if needed

**macOS**:
- If you get Xcode-related errors, install Xcode Command Line Tools: `xcode-select --install`
- For M1/M2 Macs, ensure you're using the correct Python architecture

**Linux**:
- Install build essentials: `sudo apt-get install build-essential` (Ubuntu/Debian)
- For other distributions, install equivalent build tools

### Debug Mode

To see detailed build information, you can modify the script to add verbose logging or run PyInstaller with `--debug` flag.

## Release Process

For creating releases:

1. **Clean build**: `python build_cross_platform.py --platform all`
2. **Test executables**: Run each platform's executable to ensure functionality
3. **Package**: Create platform-specific packages (zip, tar.gz, etc.)
4. **Distribute**: Upload to your distribution platform

## Differences from Original build.py

The new cross-platform script offers several improvements:

- **Multi-platform support**: Build for Windows, macOS, and Linux
- **Better error handling**: More robust error checking and reporting
- **Platform detection**: Automatic platform detection and configuration
- **Asset management**: Improved handling of package assets
- **Release information**: Generates release metadata
- **Modular design**: Cleaner, more maintainable code structure

The original `build.py` is kept for compatibility with existing workflows. 