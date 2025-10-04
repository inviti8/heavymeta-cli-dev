# HeavyMeta CLI Import Optimization Plan

This document outlines a strategy to optimize imports in the HeavyMeta CLI by breaking them into discrete methods and only loading what's needed for each command.

## Current Import Issues

1. **Slow Startup**: All imports are loaded at module level, even if they're only needed for specific commands.
2. **Memory Usage**: Unnecessary modules are kept in memory.
3. **Windows Performance**: Import overhead is more noticeable on Windows.

## Proposed Solution

Break imports into logical groups and load them on-demand when specific commands are executed.

## Import Groups

### 1. Core Imports (Keep at module level)
These are lightweight and used throughout the application:
```python
import os
import sys
import platform
import json
import time
import hashlib
import re
import copy
from pathlib import Path
from typing import Optional, Dict, List, Any, Union, Tuple
from dataclasses import dataclass, field
```

### 2. Network Operations
```python
def _import_network():
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
```

### 3. Database Operations
```python
def _import_database():
    from tinydb import TinyDB, Query
    import tinydb_encrypted_jsonstorage as tae
    return {
        'TinyDB': TinyDB,
        'Query': Query,
        'tae': tae
    }
```

### 4. Stellar Blockchain
```python
def _import_stellar():
    from hvym_stellar import *
    from stellar_sdk import Keypair, Network, Server, SorobanServer, soroban_rpc, scval
    return {
        'Keypair': Keypair,
        'Network': Network,
        'Server': Server,
        'SorobanServer': SorobanServer,
        'soroban_rpc': soroban_rpc,
        'scval': scval
    }
```

### 5. 3D Model Processing
```python
def _import_3d():
    from pygltflib import GLTF2
    return {
        'GLTF2': GLTF2
    }
```

### 6. Templating
```python
def _import_templating():
    from jinja2 import Environment, FileSystemLoader
    return {
        'Environment': Environment,
        'FileSystemLoader': FileSystemLoader
    }
```

### 7. UI/Clipboard
```python
def _import_ui():
    import pyperclip
    import webbrowser
    return {
        'pyperclip': pyperclip,
        'webbrowser': webbrowser
    }
```

### 8. XML Processing
```python
def _import_xml():
    import xml.etree.ElementTree as ET
    from base64 import b64encode
    return {
        'ET': ET,
        'b64encode': b64encode
    }
```

### 9. Platform-Specific (Unix-like)
```python
def _import_platform_specific():
    if platform.system().lower() != "windows":
        import pexpect
        from pexpect import *
        return {
            'pexpect': pexpect
        }
    return {}
```

## Command-Specific Import Mapping

| Command Group | Required Import Groups |
|---------------|------------------------|
| `tunnel` | network, platform_specific, ui |
| `stellar` | stellar, network |
| `model` | 3d, templating |
| `db` | database |
| `clipboard` | ui |
| `xml` | xml |

## Implementation Strategy

1. **Create a LazyImporter Class**
   - Implement a class that will handle the lazy loading of modules
   - Cache loaded modules to avoid re-importing

2. **Refactor Commands**
   - Update each command to use the lazy importer
   - Move imports to the command functions

3. **Testing**
   - Test each command to ensure all required imports are available
   - Measure startup time before and after the changes

## Expected Benefits

1. **Faster Startup**: Only load what's needed for the specific command
2. **Lower Memory Usage**: Unused modules are never loaded
3. **Better Maintainability**: Clear dependencies for each command
4. **Easier Testing**: Mock only the imports that are actually used

## Next Steps

1. Implement the LazyImporter class
2. Refactor commands one by one
3. Update tests
4. Measure performance improvements
5. Document the new import system for contributors
