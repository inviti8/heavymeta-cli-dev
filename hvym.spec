# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['/media/desktop/_dsk/dev/hvym/hvym.py'],
    pathex=[],
    binaries=[],
    datas=[('qthvym', 'qthvym'), ('qtwidgets', 'qtwidgets'), ('templates', 'templates'), ('scripts', 'scripts'), ('images', 'images'), ('data', 'data'), ('npm_links', 'npm_links')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
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
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
