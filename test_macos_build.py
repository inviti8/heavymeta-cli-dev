#!/usr/bin/env python3
"""
Test script for macOS PyInstaller build issues
This script helps diagnose and test the MEI temp directory fix
"""

import os
import sys
import tempfile
import subprocess
import platform
from pathlib import Path

def test_temp_directory_creation():
    """Test temp directory creation similar to PyInstaller MEI"""
    print("=== Testing Temp Directory Creation ===")
    
    # Test 1: Standard temp directory
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"✓ Standard temp dir created: {temp_dir}")
            
            # Test nested directory creation
            nested_dir = Path(temp_dir) / "nested" / "deep" / "structure"
            nested_dir.mkdir(parents=True, exist_ok=True)
            print(f"✓ Nested directory created: {nested_dir}")
            
    except Exception as e:
        print(f"✗ Standard temp dir failed: {e}")
    
    # Test 2: MEI-style temp directory
    try:
        temp_base = Path(tempfile.gettempdir())
        mei_style_dir = temp_base / f"_MEI{os.getpid()}"
        mei_style_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ MEI-style temp dir created: {mei_style_dir}")
        
        # Clean up
        mei_style_dir.rmdir()
        
    except Exception as e:
        print(f"✗ MEI-style temp dir failed: {e}")
    
    # Test 3: Home-based temp directory (our fix)
    try:
        home_temp = Path.home() / '.hvym_temp'
        home_temp.mkdir(exist_ok=True, mode=0o755)
        
        session_dir = home_temp / f"test_session_{os.getpid()}"
        session_dir.mkdir(exist_ok=True, mode=0o755)
        print(f"✓ Home-based temp dir created: {session_dir}")
        
        # Clean up
        session_dir.rmdir()
        
    except Exception as e:
        print(f"✗ Home-based temp dir failed: {e}")

def test_pyinstaller_environment():
    """Test PyInstaller environment setup"""
    print("\n=== Testing PyInstaller Environment ===")
    
    # Check PyInstaller version
    try:
        result = subprocess.run(['pyinstaller', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ PyInstaller version: {result.stdout.strip()}")
        else:
            print(f"✗ PyInstaller check failed: {result.stderr}")
    except FileNotFoundError:
        print("✗ PyInstaller not found in PATH")
    
    # Check platform info
    print(f"✓ Platform: {platform.platform()}")
    print(f"✓ Machine: {platform.machine()}")
    print(f"✓ Python: {platform.python_version()}")
    
    # Check temp directory environment
    temp_vars = ['TMPDIR', 'TEMP', 'TMP']
    for var in temp_vars:
        value = os.environ.get(var)
        if value:
            print(f"✓ {var}: {value}")
            print(f"  Exists: {os.path.exists(value)}")
            print(f"  Writable: {os.access(value, os.W_OK)}")

def test_runtime_hook():
    """Test the runtime hook functionality"""
    print("\n=== Testing Runtime Hook ===")
    
    # Import the runtime hook
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        
        # Simulate PyInstaller environment
        if not hasattr(sys, '_MEIPASS'):
            sys._MEIPASS = str(Path.home() / '.hvym_temp' / 'test_mei')
            Path(sys._MEIPASS).mkdir(parents=True, exist_ok=True)
        
        # Import and test the hook
        import pyi_rth_hvym
        print("✓ Runtime hook imported successfully")
        
        # Check if environment variables were set
        if os.environ.get('QT_MAC_WANTS_LAYER'):
            print("✓ QT_MAC_WANTS_LAYER set")
        
        if os.environ.get('NSAppSleepDisabled'):
            print("✓ NSAppSleepDisabled set")
            
        # Clean up test MEI directory
        import shutil
        shutil.rmtree(sys._MEIPASS, ignore_errors=True)
        
    except Exception as e:
        print(f"✗ Runtime hook test failed: {e}")

def test_build_locally():
    """Test building the application locally"""
    print("\n=== Testing Local Build ===")
    
    try:
        # Set environment variables
        env = os.environ.copy()
        env['HVYM_PYI_LOG_DEBUG'] = '1'
        env['HVYM_DIAG'] = '1'
        
        # Build command
        cmd = ['pyinstaller', '--clean', '--log-level', 'DEBUG', 'hvym.spec']
        
        print(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        
        if result.returncode == 0:
            print("✓ Build completed successfully")
            
            # Check if binary exists
            binary_path = Path('dist/hvym')
            if binary_path.exists():
                print(f"✓ Binary created: {binary_path}")
                print(f"  Size: {binary_path.stat().st_size} bytes")
                
                # Test running the binary
                try:
                    test_result = subprocess.run([str(binary_path), '--version'], 
                                               capture_output=True, text=True, timeout=10)
                    if test_result.returncode == 0:
                        print("✓ Binary runs successfully")
                        print(f"  Output: {test_result.stdout.strip()}")
                    else:
                        print(f"✗ Binary failed to run: {test_result.stderr}")
                except subprocess.TimeoutExpired:
                    print("✗ Binary execution timed out")
                except Exception as e:
                    print(f"✗ Binary execution failed: {e}")
            else:
                print("✗ Binary not found")
        else:
            print(f"✗ Build failed: {result.stderr}")
            
    except Exception as e:
        print(f"✗ Build test failed: {e}")

def main():
    """Run all tests"""
    print("macOS PyInstaller Build Test")
    print("=" * 40)
    
    if platform.system() != 'Darwin':
        print("Warning: This test is designed for macOS")
    
    test_temp_directory_creation()
    test_pyinstaller_environment()
    test_runtime_hook()
    
    # Only run build test if requested
    if '--build' in sys.argv:
        test_build_locally()
    else:
        print("\nTo test local build, run: python test_macos_build.py --build")

if __name__ == '__main__':
    main()
