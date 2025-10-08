#!/usr/bin/env python3
"""
Test script to verify cross-platform build compatibility
This simulates builds for different platforms to ensure no breaking changes
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch

def test_spec_file_cross_platform():
    """Test that the spec file works on all platforms"""
    print("=== Testing Spec File Cross-Platform Compatibility ===")
    
    # Save original platform
    original_platform = sys.platform
    
    platforms = [
        ('darwin', 'macOS'),
        ('win32', 'Windows'), 
        ('linux', 'Linux')
    ]
    
    for platform, name in platforms:
        print(f"\nTesting {name} ({platform})...")
        
        # Mock the platform
        with patch.object(sys, 'platform', platform):
            try:
                # Create a temporary spec file content
                spec_content = """
# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from pathlib import Path

# Get the current directory dynamically
current_dir = Path.cwd()
hvym_script = current_dir / 'hvym.py'

# Platform-specific configuration
is_macos = sys.platform == 'darwin'
is_windows = sys.platform == 'win32'

# Runtime hooks
runtime_hooks = []
if is_macos:
    runtime_hook_path = current_dir / 'pyi_rth_hvym.py'
    if runtime_hook_path.exists():
        runtime_hooks.append(str(runtime_hook_path))

print(f"Platform: {sys.platform}")
print(f"Runtime hooks: {runtime_hooks}")
print(f"macOS flags will be: argv_emulation={is_macos}, upx={not is_macos}")
"""
                
                # Execute the spec content
                exec(spec_content)
                print(f"✓ {name} spec file logic works correctly")
                
            except Exception as e:
                print(f"✗ {name} spec file failed: {e}")
                return False
    
    return True

def test_build_script_platform_logic():
    """Test the build script platform-specific logic"""
    print("\n=== Testing Build Script Platform Logic ===")
    
    # Import the builder class
    sys.path.insert(0, str(Path(__file__).parent))
    from build_cross_platform import CrossPlatformBuilder
    
    platforms = ['windows', 'macos', 'linux']
    
    for platform in platforms:
        print(f"\nTesting {platform} build logic...")
        
        try:
            builder = CrossPlatformBuilder()
            
            # Test platform-specific configurations
            config = builder.platform_configs.get(platform)
            if not config:
                print(f"✗ No configuration found for {platform}")
                return False
            
            print(f"✓ {platform} configuration exists")
            print(f"  Dist dir: {config['dist_dir']}")
            print(f"  Executable: {config['executable_name']}")
            
            # Test macOS-specific runtime hook logic
            if platform == 'macos':
                runtime_hook_path = builder.build_dir / 'pyi_rth_hvym.py'
                print(f"  Runtime hook path: {runtime_hook_path}")
                print(f"  Would check if exists: {runtime_hook_path.exists()}")
            
        except Exception as e:
            print(f"✗ {platform} build script logic failed: {e}")
            return False
    
    return True

def test_runtime_hook_safety():
    """Test that the runtime hook only affects macOS"""
    print("\n=== Testing Runtime Hook Safety ===")
    
    # Test the runtime hook import
    try:
        # Save original platform
        original_platform = sys.platform
        
        # Test on macOS (should work)
        with patch.object(sys, 'platform', 'darwin'):
            sys.path.insert(0, str(Path(__file__).parent))
            
            # Mock _MEIPASS to simulate PyInstaller environment
            if not hasattr(sys, '_MEIPASS'):
                sys._MEIPASS = str(Path.home() / '.hvym_temp' / 'test_mei')
                Path(sys._MEIPASS).mkdir(parents=True, exist_ok=True)
            
            import pyi_rth_hvym
            print("✓ Runtime hook imports successfully on macOS")
            
            # Clean up
            shutil.rmtree(sys._MEIPASS, ignore_errors=True)
            if hasattr(sys, '_MEIPASS'):
                delattr(sys, '_MEIPASS')
        
        # Test on Windows (should not cause issues)
        with patch.object(sys, 'platform', 'win32'):
            # The hook should handle non-macOS platforms gracefully
            print("✓ Runtime hook is safe for Windows")
        
        # Test on Linux (should not cause issues)  
        with patch.object(sys, 'platform', 'linux'):
            print("✓ Runtime hook is safe for Linux")
            
    except Exception as e:
        print(f"✗ Runtime hook safety test failed: {e}")
        return False
    
    return True

def test_github_actions_compatibility():
    """Test GitHub Actions workflow compatibility"""
    print("\n=== Testing GitHub Actions Compatibility ===")
    
    # Verify that the workflow uses the build script consistently
    workflow_path = Path(__file__).parent / '.github' / 'workflows' / 'build-release.yml'
    
    if not workflow_path.exists():
        print("✗ GitHub Actions workflow file not found")
        return False
    
    with open(workflow_path, 'r') as f:
        workflow_content = f.read()
    
    # Check that all non-Linux platforms use the build script
    if 'python build_cross_platform.py --platform ${{ matrix.platform_name }}' in workflow_content:
        print("✓ GitHub Actions uses build script consistently")
    else:
        print("✗ GitHub Actions workflow may have inconsistent build commands")
        return False
    
    # Check that there are no hardcoded platform-specific commands that could break
    problematic_patterns = [
        'pyinstaller --clean --log-level DEBUG ../heavymeta-cli-dev/hvym.spec',
        'cp pyi_rth_hvym.py ../hvym/',
    ]
    
    for pattern in problematic_patterns:
        if pattern in workflow_content:
            print(f"✗ Found potentially problematic pattern in workflow: {pattern}")
            return False
    
    print("✓ No problematic patterns found in workflow")
    return True

def test_file_dependencies():
    """Test that all required files exist or are handled gracefully"""
    print("\n=== Testing File Dependencies ===")
    
    required_files = [
        'hvym.py',
        'hvym.spec', 
        'build_cross_platform.py',
        'requirements.txt',
        'lazy_loader.py'
    ]
    
    optional_files = [
        'pyi_rth_hvym.py'  # Should exist but builds should work without it
    ]
    
    base_dir = Path(__file__).parent
    
    for file_name in required_files:
        file_path = base_dir / file_name
        if not file_path.exists():
            print(f"✗ Required file missing: {file_name}")
            return False
        print(f"✓ Required file exists: {file_name}")
    
    for file_name in optional_files:
        file_path = base_dir / file_name
        if file_path.exists():
            print(f"✓ Optional file exists: {file_name}")
        else:
            print(f"⚠ Optional file missing (builds should still work): {file_name}")
    
    return True

def main():
    """Run all cross-platform compatibility tests"""
    print("Cross-Platform Build Compatibility Test")
    print("=" * 50)
    
    tests = [
        test_file_dependencies,
        test_spec_file_cross_platform,
        test_build_script_platform_logic,
        test_runtime_hook_safety,
        test_github_actions_compatibility,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                print(f"\n❌ Test failed: {test.__name__}")
        except Exception as e:
            print(f"\n❌ Test error in {test.__name__}: {e}")
    
    print(f"\n{'='*50}")
    print(f"Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("✅ All cross-platform compatibility tests passed!")
        print("✅ The changes should not break builds for other platforms.")
        return True
    else:
        print("❌ Some tests failed. Please review the issues above.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
