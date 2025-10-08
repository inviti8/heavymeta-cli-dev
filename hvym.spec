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

a = Analysis(
    [str(hvym_script)],
    pathex=[str(current_dir)],
    binaries=[],
    datas=[
        ('qthvym', 'qthvym'), 
        ('templates', 'templates'), 
        ('scripts', 'scripts'), 
        ('images', 'images'), 
        ('data', 'data'), 
        ('npm_links', 'npm_links'), 
        ('lazy_loader.py', '.')
    ],
    hiddenimports=[
        'PyQt5.QtCore',
        'PyQt5.QtGui', 
        'PyQt5.QtWidgets',
        'qthvym',
        'platformdirs',
        'tinydb',
        'tinydb_encrypted_jsonstorage'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=runtime_hooks,
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='hvym',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False if is_macos else False,
    upx=False if is_macos else True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=True if is_macos else False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
