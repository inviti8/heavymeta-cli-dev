# -*- coding: utf-8 -*-
"""
Custom PyInstaller runtime hook for hvym CLI
Fixes macOS ARM64 MEI temp directory creation issues
"""

import os
import sys
import tempfile
import stat
from pathlib import Path

def _fix_macos_mei_permissions():
    """Fix macOS MEI temp directory permissions and creation issues"""
    if not hasattr(sys, '_MEIPASS'):
        return
        
    try:
        # Get the MEI temp directory
        mei_dir = Path(sys._MEIPASS)
        
        # Ensure parent directories exist with proper permissions
        mei_parent = mei_dir.parent
        if not mei_parent.exists():
            mei_parent.mkdir(parents=True, exist_ok=True, mode=0o755)
            
        # Set proper permissions on MEI directory
        if mei_dir.exists():
            os.chmod(mei_dir, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
            
        # Set environment variables for better temp directory handling
        os.environ.setdefault('TMPDIR', str(mei_parent))
        
    except Exception as e:
        # Log error but don't crash the application
        print(f"Warning: MEI permission fix failed: {e}", file=sys.stderr)

def _setup_macos_environment():
    """Setup macOS-specific environment variables"""
    if sys.platform == 'darwin':
        # Set Qt environment variables for macOS
        os.environ.setdefault('QT_MAC_WANTS_LAYER', '1')
        
        # Disable macOS App Nap for CLI applications
        os.environ.setdefault('NSAppSleepDisabled', '1')
        
        # Fix potential library loading issues
        if hasattr(sys, '_MEIPASS'):
            dylib_path = os.path.join(sys._MEIPASS, 'lib')
            if os.path.exists(dylib_path):
                current_path = os.environ.get('DYLD_LIBRARY_PATH', '')
                if current_path:
                    os.environ['DYLD_LIBRARY_PATH'] = f"{dylib_path}:{current_path}"
                else:
                    os.environ['DYLD_LIBRARY_PATH'] = dylib_path

def _create_safe_temp_dir():
    """Create a safe temporary directory for macOS ARM64"""
    try:
        # Use a more predictable temp directory structure
        base_temp = Path.home() / '.hvym_temp'
        base_temp.mkdir(exist_ok=True, mode=0o755)
        
        # Create a unique subdirectory for this session
        import uuid
        session_dir = base_temp / f"session_{uuid.uuid4().hex[:8]}"
        session_dir.mkdir(exist_ok=True, mode=0o755)
        
        # Set as temp directory
        os.environ['TMPDIR'] = str(session_dir)
        
        return str(session_dir)
    except Exception as e:
        print(f"Warning: Could not create safe temp dir: {e}", file=sys.stderr)
        return None

# Apply fixes immediately when this hook is loaded
if sys.platform == 'darwin':
    _create_safe_temp_dir()
    _fix_macos_mei_permissions()
    _setup_macos_environment()
