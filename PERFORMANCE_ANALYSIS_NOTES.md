# Performance Analysis Notes: Heavymeta CLI + Metavinci

## Session Goal
Identify and fix performance bottlenecks in CLI calls from Metavinci GUI.

---

## Architecture Summary

### CLI (heavymeta-cli-dev/hvym.py)
- Python CLI using Click framework (~3,440 lines)
- PyInstaller-compiled executable
- Has lazy loading system (lazy_loader.py)
- Uses TinyDB for persistent storage
- qthvym package for PyQt5 UI popups

### GUI (metavinci/metavinci.py)
- PyQt5 GUI application
- Calls CLI via subprocess (through `_subprocess_hvym()` method)
- Uses QThread workers for background operations

---

## Key Finding: CLI Commands Called by GUI

The metavinci GUI calls these CLI commands via subprocess (each spawns new process):

1. `splash` - Shows splash screen
2. `stellar-new-account` - Create new Stellar account
3. `stellar-set-account` - Change Stellar account
4. `stellar-remove-account` - Remove Stellar account
5. `stellar-new-testnet-account` - Create testnet account
6. `check` - Health check
7. `pintheon-setup` - Setup Pintheon
8. `pintheon-image-exists` - Check if Pintheon image exists (FREQUENT)
9. `pinggy-token` - Check if tunnel token exists (FREQUENT)
10. `pintheon-start` - Start Pintheon container
11. `pintheon-open` - Open Pintheon admin
12. `pintheon-stop` - Stop Pintheon container
13. `pintheon-tunnel-open` - Open network tunnel
14. `pinggy-set-token` - Set tunnel token
15. `pinggy-set-tier` - Set tunnel tier
16. `pinggy-tier` - Get tunnel tier
17. `pintheon-set-network` - Set network
18. `pintheon-network` - Get current network
19. `is-pintheon-tunnel-open` - Check tunnel status (FREQUENT)
20. `docker-installed` - Check Docker status (FREQUENT)
21. `installation-stats` - Get installation statistics (FREQUENT)
22. `update-npm-modules` - Update npm modules

**Critical Observation**: Commands marked (FREQUENT) are called often during normal operation,
and they're simple queries that DON'T need PyQt5 UI at all!

---

## Confirmed Bottlenecks

### 1. CRITICAL: PyQt5 Import on Every Command (hvym.py:2)

```python
from qthvym import * # Line 2 - IMPORTS PYQT5 FOR EVERY COMMAND!
```

**Impact**: PyQt5 is heavy (~200-500ms import time). This affects EVERY CLI call,
even simple queries like `docker-installed` or `installation-stats` that never use UI.

**Commands that DON'T need qthvym/PyQt5**:
- `docker-installed`
- `pintheon-image-exists`
- `installation-stats`
- `pinggy-token`
- `pinggy-tier`
- `pintheon-network`
- `is-pintheon-tunnel-open`

### 2. HIGH: Process Spawn Overhead per Call

Each CLI call spawns a new process:
1. OS process creation
2. PyInstaller extraction (if frozen)
3. Python interpreter init
4. All module imports (including PyQt5!)
5. Click CLI dispatch
6. Actual command execution
7. Process teardown

**Estimated overhead**: 500-1500ms per call depending on system

### 3. MEDIUM: TinyDB Import at Module Level (hvym.py:23-24)

```python
from tinydb import TinyDB, Query
import tinydb_encrypted_jsonstorage as tae
```

Always imported even for commands that don't use database.

### 4. MEDIUM: Lazy Loading Not Applied to Core Bottleneck

The lazy_loader.py system exists and covers: network, stellar, 3d, templating, etc.
But it DOESN'T cover qthvym/PyQt5 - the biggest bottleneck!

---

## Proposed Solutions

### Quick Wins (No Architecture Change)

#### A. Conditional qthvym Import (HIGH IMPACT)

Move qthvym import to only commands that need UI:

```python
# At module level - remove: from qthvym import *
# Instead, add qthvym to lazy_loader.py:

def _import_qthvym(self):
    """UI widgets imports - only for commands needing popups."""
    from qthvym import HVYMInteraction, LOGO_IMG, LOGO_WARN_IMG, STELLAR_LOGO_IMG
    # ... other needed symbols
    return {'HVYMInteraction': HVYMInteraction, ...}
```

Then decorate only UI commands:
```python
@requires_imports('qthvym')
def stellar_set_account():
    ...
```

**Estimated Impact**: 200-500ms faster for non-UI commands

#### B. Move TinyDB to Lazy Loading (MEDIUM IMPACT)

Add database imports to lazy system, only load when needed.

#### C. Add "Fast Mode" Commands (HIGH IMPACT)

Create lightweight versions of frequently-called query commands that:
- Don't import qthvym
- Don't import TinyDB (if not needed)
- Just return status/data

Example: `hvym fast-check docker` instead of `hvym docker-installed`

### Architectural Changes (Higher Effort, Higher Reward)

#### D. Daemon Mode / Server Mode (HIGHEST IMPACT)

Keep CLI running as a background service, accept commands via:
- Named pipe (Windows)
- Unix socket (macOS/Linux)
- Local HTTP server (cross-platform)

```
metavinci GUI <-> socket/pipe <-> hvym daemon (always running)
```

Benefits:
- Zero process spawn overhead
- Zero import overhead after first call
- Sub-millisecond response time for queries

Implementation:
1. Add `hvym daemon start` command
2. Add IPC listener
3. Modify `_subprocess_hvym()` in metavinci to use IPC when daemon is running
4. Fallback to subprocess when daemon not running

#### E. Batch Commands (MEDIUM IMPACT)

Allow multiple operations in single invocation:
```bash
hvym batch "docker-installed" "pintheon-image-exists" "installation-stats"
```
Returns JSON array of results.

#### F. Embed CLI as Library (HIGH IMPACT)

Import hvym module directly into metavinci instead of subprocess:
```python
# In metavinci.py
import hvym_core  # Lightweight core without PyQt5
result = hvym_core.docker_installed()
```

Requires splitting hvym into:
- hvym_core (no UI dependencies)
- hvym_cli (full CLI with UI)

---

## Implementation Priority

### Phase 1: Quick Wins (Can do now)
1. **Conditional qthvym import** - Biggest bang for buck
2. Move TinyDB to lazy loading
3. Add profiling/timing output (HVYM_PERF=1 already exists)

### Phase 2: Medium Effort
4. Batch command support
5. Create "fast" versions of frequent queries

### Phase 3: Architectural (Future)
6. Daemon mode with IPC
7. Core library extraction

---

## Files to Modify

### For Phase 1:
- `hvym.py` - Remove line 2, add conditional imports
- `lazy_loader.py` - Add qthvym and database groups
- Commands that need UI - Add `@requires_imports('qthvym')` decorator

### For Phase 2:
- `hvym.py` - Add batch command
- Add fast-query commands

### For Phase 3:
- Create `hvym_daemon.py`
- Create `hvym_core/` package
- Modify `metavinci.py` `_subprocess_hvym()` method

---

## Actual Measurements (Session 1)

### Baseline Timings

| Measurement | Time |
|-------------|------|
| Full CLI command (docker-installed) | **690-810ms** |
| Full CLI command (installation-stats) | **1130ms** |
| hvym.py import (cold cache) | 2777ms |
| hvym.py import (warm cache) | 470-550ms |
| Core imports WITH qthvym | 338ms |
| Core imports WITHOUT qthvym | 260ms |
| qthvym import alone | 213-245ms |

### Import Time Breakdown (from -X importtime)

Top cumulative imports:
- qthvym: 263ms (includes PyQt5)
- PyQt5.QtWidgets: 125ms
- dataclasses_json: 109ms (includes marshmallow)
- tinydb_encrypted_jsonstorage: 78ms (includes Crypto)
- qrcode: 55ms

### Expected Improvement

Removing qthvym from non-UI commands should save **~200-250ms per call**.

For commands like `docker-installed`, `installation-stats`, `pintheon-image-exists`:
- Current: 690-810ms
- Target: ~450-550ms (30-40% faster)

---

## Progress Log

### Session 1 - Analysis & Measurement
- [x] Explored both codebases
- [x] Identified architecture and communication patterns
- [x] Found root cause: PyQt5 imported for every command
- [x] Listed all CLI commands called by GUI
- [x] Documented proposed solutions
- [x] Measured actual timings
- [x] Implement Phase 1A (conditional qthvym import)
- [x] Test improvement

### Phase 1A Implementation Complete

**Changes made:**
1. `hvym.py` line 2: Removed `from qthvym import *`
2. `lazy_loader.py`: Added `qthvym` import group with `_import_qthvym()` method
3. `hvym.py`: Added `_get_hvym_interaction()` helper for lazy loading
4. `hvym.py`: Updated all UI popup functions to use lazy loading

**Results after optimization:**

| Command | Before | After | Improvement |
|---------|--------|-------|-------------|
| check | ~750ms | 476ms | 37% faster |
| docker-installed | 690-810ms | 653ms | ~15% faster |
| installation-stats | 1130ms | 838ms | 26% faster |
| pintheon-image-exists | ~800ms | 739ms | ~8% faster |
| hvym.py import | 470-550ms | 379ms | ~25% faster |

**Key verification:**
- PyQt5 is NOT loaded for non-UI commands
- PyQt5 IS correctly loaded when UI functions are called
- All existing functionality preserved

### Phase 1B Implementation Complete

**Changes made:**
1. `hvym.py` lines 23-25: Removed TinyDB import from module level
2. `hvym.py`: Added `_LazyDatabase` class with lazy initialization
3. `hvym.py`: Added `_LazyTableProxy` for backward-compatible lazy access to tables
4. `hvym.py`: Added `_LazyQueryClass` for lazy Query access
5. `hvym.py`: Deferred `_init_app_data()` call to lazy DB initialization
6. `hvym.py`: Added `_get_arch_specific_dapp_name_simple()` to avoid circular dependency

**Results after Phase 1A + 1B combined:**

| Command | Baseline | After 1A | After 1A+1B | Total Improvement |
|---------|----------|----------|-------------|-------------------|
| check | ~750ms | 476ms | **392ms** | 48% faster |
| docker-installed | 690-810ms | 653ms | **438ms** | 40-46% faster |
| installation-stats | 1130ms | 838ms | **770ms** | 32% faster |
| pintheon-image-exists | ~800ms | 739ms | **738ms** | ~8% faster |
| hvym.py import | 470-550ms | 379ms | **306ms** | ~40% faster |

**Key verification:**
- TinyDB is NOT loaded for commands that don't need database
- TinyDB IS correctly loaded on-demand when database is accessed
- All existing functionality preserved
- Command outputs verified correct

### Phase 1C Implementation Complete

**Changes made:**
1. Added `_FastConfigCache` class for ultra-fast config reads (~12ms vs ~300ms for TinyDB)
2. Cached keys: `pintheon_dapp`, `pintheon_network`, `pintheon_port`, `pinggy_tier`, `pinggy_token`
3. Updated read functions (`_pintheon_dapp()`, `_pintheon_network()`, etc.) to use cache first
4. Updated setter functions to sync cache when values change
5. Cache synced from TinyDB on first database access

**Final Results (Phase 1A + 1B + 1C combined):**

| Command | Baseline | Final | Total Improvement |
|---------|----------|-------|-------------------|
| check | ~750ms | **348-413ms** | 45-54% faster |
| docker-installed | 690-810ms | **485-575ms** | 25-35% faster |
| pintheon-image-exists | ~800ms | **482-495ms** | **38-40% faster** |
| installation-stats | 1130ms | **778-825ms** | 27-31% faster |
| pinggy-tier | (needed DB) | **467-472ms** | Now uses fast cache |

**Key improvement for `pintheon-image-exists`:**
- Before Phase 1C: 738ms (still needed TinyDB for dapp name)
- After Phase 1C: **482-495ms** (uses fast JSON cache)
- Phase 1C alone: **~33% faster** for this command

### Next Steps
1. Consider Phase 2: Add batch command support for multiple queries in one call
2. Long-term: Consider daemon mode for sub-millisecond response times

---

## Code References

Key files and lines:
- `hvym.py:2` - The problematic `from qthvym import *`
- `hvym.py:23-24` - TinyDB imports at module level
- `lazy_loader.py` - Existing lazy loading system
- `metavinci.py:2092-2096` - `_subprocess_hvym()` method
- `metavinci.py:2111-2188` - All hvym command wrappers

