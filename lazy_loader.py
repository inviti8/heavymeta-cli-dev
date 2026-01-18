"""
Lazy Import System for HeavyMeta CLI

This module provides on-demand import loading to improve CLI startup performance.
Only imports required for specific commands are loaded when needed.
"""

import os
import platform
from functools import wraps


class LazyImporter:
    """Manages on-demand import loading with caching."""
    
    def __init__(self):
        self._cache = {}
        self._import_map = {
            'network': self._import_network,
            'stellar': self._import_stellar,
            'database': self._import_database,
            '3d': self._import_3d,
            'templating': self._import_templating,
            'ui': self._import_ui,
            'xml': self._import_xml,
            'subprocess': self._import_subprocess,
            'filesystem': self._import_filesystem,
            'threading': self._import_threading,
            'platform_specific': self._import_platform_specific,
            'qthvym': self._import_qthvym,
        }
    
    def get_modules(self, *groups):
        """Load and return modules for specified groups."""
        modules = {}
        for group in groups:
            if group not in self._cache:
                if group in self._import_map:
                    self._cache[group] = self._import_map[group]()
                else:
                    raise ValueError(f"Unknown import group: {group}")
            modules.update(self._cache[group])
        return modules
    
    def clear_cache(self):
        """Clear import cache (useful for testing)."""
        self._cache.clear()
    
    def _import_network(self):
        """Network operations imports."""
        import requests
        from urllib.request import urlopen
        from io import BytesIO
        from zipfile import ZipFile
        return {
            'requests': requests,
            'urlopen': urlopen,
            'BytesIO': BytesIO,
            'ZipFile': ZipFile
        }
    
    def _import_database(self):
        """Database operations imports."""
        from tinydb import TinyDB, Query
        import tinydb_encrypted_jsonstorage as tae
        return {
            'TinyDB': TinyDB,
            'Query': Query,
            'tae': tae
        }
    
    def _import_stellar(self):
        """Stellar blockchain imports."""
        import hvym_stellar
        from stellar_sdk import Keypair, Network, Server, SorobanServer, soroban_rpc, scval
        return {
            'hvym_stellar': hvym_stellar,
            'Keypair': Keypair,
            'Network': Network,
            'Server': Server,
            'SorobanServer': SorobanServer,
            'soroban_rpc': soroban_rpc,
            'scval': scval
        }
    
    def _import_3d(self):
        """3D model processing imports."""
        from pygltflib import GLTF2
        return {
            'GLTF2': GLTF2
        }
    
    def _import_templating(self):
        """Templating imports."""
        from jinja2 import Environment, FileSystemLoader
        return {
            'Environment': Environment,
            'FileSystemLoader': FileSystemLoader
        }
    
    def _import_ui(self):
        """UI/Clipboard imports."""
        import pyperclip
        import webbrowser
        return {
            'pyperclip': pyperclip,
            'webbrowser': webbrowser
        }
    
    def _import_xml(self):
        """XML processing imports."""
        import xml.etree.ElementTree as ET
        from base64 import b64encode
        return {
            'ET': ET,
            'b64encode': b64encode
        }
    
    def _import_subprocess(self):
        """Subprocess operations imports (reduced usage after ICP removal)."""
        import subprocess
        from subprocess import run, Popen, PIPE, STDOUT
        return {
            'subprocess': subprocess,
            'run': run,
            'Popen': Popen,
            'PIPE': PIPE,
            'STDOUT': STDOUT
        }
    
    def _import_filesystem(self):
        """Filesystem operations imports (reduced usage after ICP removal)."""
        import shutil
        import platformdirs
        return {
            'shutil': shutil,
            'platformdirs': platformdirs
        }
    
    def _import_threading(self):
        """Threading imports."""
        import threading
        return {
            'threading': threading
        }
    
    def _import_platform_specific(self):
        """Platform-specific imports (Unix-like systems only)."""
        if platform.system().lower() != "windows":
            import pexpect
            return {
                'pexpect': pexpect
            }
        return {}

    def _import_qthvym(self):
        """PyQt5 UI widgets imports - only for commands that show popups/dialogs."""
        from qthvym import HVYMInteraction
        return {
            'HVYMInteraction': HVYMInteraction
        }


# Global lazy importer instance
lazy_importer = LazyImporter()


def requires_imports(*import_groups):
    """Decorator to specify required imports for a command."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Load required modules
            modules = lazy_importer.get_modules(*import_groups)
            # Inject into global namespace
            globals().update(modules)
            return func(*args, **kwargs)
        return wrapper
    return decorator


def measure_startup_time(func):
    """Decorator to measure command startup time when HVYM_PERF=1."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if os.environ.get('HVYM_PERF'):
            import time
            start_time = time.time()
            result = func(*args, **kwargs)
            print(f"Command completed in {(time.time() - start_time)*1000:.1f}ms")
            return result
        return func(*args, **kwargs)
    return wrapper
