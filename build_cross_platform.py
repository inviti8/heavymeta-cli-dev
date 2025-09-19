#!/usr/bin/env python3
"""
Cross-platform build script for HeavyMeta CLI
Supports Windows, macOS, and Linux builds for releases
"""

import os
import sys
import shutil
import subprocess
import platform
import argparse
from pathlib import Path
from typing import Dict, List, Optional
import json

# Build-time check for pexpect on Unix-like systems
if platform.system().lower() != 'windows':
    try:
        import pexpect
    except ImportError:
        raise RuntimeError('pexpect is required on Unix-like systems. Please install it.')

class CrossPlatformBuilder:
    def __init__(self):
        self.cwd = Path.cwd()
        self.home = Path.home()
        self.platform_info = self._get_platform_info()
        self.build_dir = self.cwd.parent / 'hvym'
        
        # Source files and directories
        self.src_files = {
            'main': self.cwd / 'hvym.py',
            'requirements': self.cwd / 'requirements.txt',
            'templates': self.cwd / 'templates',
            'images': self.cwd / 'images',
            'scripts': self.cwd / 'scripts',
            'npm_links': self.cwd / 'npm_links',
            'data': self.cwd / 'data'
        }
        
        # Platform-specific configurations
        self.platform_configs = {
            'windows': {
                'dist_dir': self.build_dir / 'dist' / 'windows',
                'executable_name': 'hvym.exe'
            },
            'macos': {
                'dist_dir': self.build_dir / 'dist' / 'macos',
                'executable_name': 'hvym'
            },
            'linux': {
                'dist_dir': self.build_dir / 'dist' / 'linux',
                'executable_name': 'hvym'
            }
        }
        
        # Package directories for asset extraction
        self.pkg_dirs = self._get_package_dirs()
        
    def _get_platform_info(self) -> Dict[str, str]:
        """Get detailed platform information"""
        system = platform.system().lower()
        machine = platform.machine().lower()
        
        if system == 'darwin':
            platform_name = 'macos'
        elif system == 'windows':
            platform_name = 'windows'
        else:
            platform_name = 'linux'
            
        return {
            'system': system,
            'platform': platform_name,
            'machine': machine,
            'python_version': platform.python_version(),
            'architecture': '64bit' if sys.maxsize > 2**32 else '32bit'
        }
    
    def _get_package_dirs(self) -> Dict[str, Path]:
        """Get package directories for asset extraction"""
        python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
        
        if self.platform_info['platform'] == 'windows':
            # Windows package paths
            site_packages = Path(sys.prefix) / 'Lib' / 'site-packages'
        elif self.platform_info['platform'] == 'macos':
            # macOS package paths
            site_packages = Path(sys.prefix) / 'lib' / f'python{python_version}' / 'site-packages'
        else:
            # Linux package paths (try multiple common locations)
            possible_paths = [
                Path(sys.prefix) / 'lib' / f'python{python_version}' / 'site-packages',
                Path.home() / '.local' / 'lib' / f'python{python_version}' / 'site-packages',
                Path('/usr/local/lib') / f'python{python_version}' / 'site-packages',
                Path('/usr/lib') / f'python{python_version}' / 'site-packages'
            ]
            
            site_packages = None
            for path in possible_paths:
                if path.exists():
                    site_packages = path
                    break
                    
            if site_packages is None:
                raise RuntimeError(f"Could not find site-packages directory. Tried: {possible_paths}")
        
        pkg_info = {
            'site_packages': site_packages,
            'qthvym': site_packages / 'qthvym'
        }
        print(f"[build] Using site-packages at: {pkg_info['site_packages']}")
        return pkg_info

    def _log_environment_summary(self):
        """Print helpful diagnostics about the environment and key packages."""
        try:
            import importlib.metadata as _md
            import importlib.util as _imputil
        except Exception:
            _md = None
            _imputil = None
        print("[build] Environment summary:")
        print(f"  Python: {platform.python_version()} ({sys.version})")
        print(f"  Platform: {platform.platform()}, machine={platform.machine()}")
        try:
            from shutil import which as _which
            pi_ver = subprocess.run(['pyinstaller', '--version'], capture_output=True, text=True)
            print(f"  PyInstaller: {pi_ver.stdout.strip() if pi_ver.returncode==0 else 'unknown'}")
            print(f"  pyinstaller path: {_which('pyinstaller')}")
        except Exception as e:
            print(f"  PyInstaller version check failed: {e}")
        # Key packages
        for pkg in ['PyQt5', 'qtwidgets', 'qthvym']:
            try:
                if _md:
                    ver = _md.version(pkg)
                    print(f"  {pkg}: {ver}")
            except Exception:
                print(f"  {pkg}: not found via metadata")
        # sys.path and site-packages for debugging
        try:
            import site as _site
            print("[hvym-ci] sys.executable:", sys.executable)
            print("[hvym-ci] sys.path (top 10):", sys.path[:10])
            if hasattr(_site, 'getsitepackages'):
                print("[hvym-ci] site.getsitepackages():", _site.getsitepackages())
        except Exception as e:
            print("[hvym-ci] site/sys.path probe failed:", e)
        # Probe specs
        if _imputil:
            for mod in ['PySide2', 'qtpy', 'qtwidgets']:
                try:
                    spec = _imputil.find_spec(mod)
                    print(f"[hvym-ci] find_spec('{mod}') =>", spec)
                except Exception as e:
                    print(f"[hvym-ci] find_spec('{mod}') FAILED => {e}")
        # Probe qtwidgets module path and submodule, unless explicitly excluded
        if os.environ.get('HVYM_EXCLUDE_QTWIDGETS_MODULE') == '1':
            print("  qtwidgets import: SKIPPED (HVYM_EXCLUDE_QTWIDGETS_MODULE=1)")
        else:
            try:
                import qtwidgets  # type: ignore
                print(f"  qtwidgets.__file__: {getattr(qtwidgets, '__file__', 'unknown')}")
                try:
                    import qtwidgets.colorbutton  # type: ignore
                    print("  qtwidgets.colorbutton import: OK")
                except Exception as e:
                    print(f"  qtwidgets.colorbutton import: FAILED -> {e}")
                try:
                    # Common import used by qthvym
                    from qtwidgets.passwordedit import PasswordEdit  # type: ignore
                    print("  qtwidgets.passwordedit.PasswordEdit import: OK")
                except Exception as e:
                    print(f"  qtwidgets.passwordedit.PasswordEdit import: FAILED -> {e}")
            except Exception as e:
                print(f"  qtwidgets import: FAILED -> {e}")
    
    def _check_dependencies(self) -> bool:
        """Check if required dependencies are installed"""
        required_packages = ['pyinstaller', 'click', 'PyQt5', 'requests']
        missing_packages = []
        
        for package in required_packages:
            try:
                if package == 'pyinstaller':
                    # Special handling for PyInstaller - check both import and command
                    try:
                        import pyinstaller
                        print(f"PyInstaller version: {pyinstaller.__version__}")
                    except ImportError:
                        # Try to run pyinstaller command
                        try:
                            result = subprocess.run(['pyinstaller', '--version'], 
                                                  capture_output=True, text=True, timeout=10)
                            if result.returncode == 0:
                                print(f"PyInstaller found via command: {result.stdout.strip()}")
                                continue
                        except (subprocess.TimeoutExpired, FileNotFoundError):
                            pass
                        missing_packages.append(package)
                else:
                    __import__(package)
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            print(f"Missing required packages: {', '.join(missing_packages)}")
            print("Please install them with: pip install -r requirements.txt")
            return False
        
        return True
    
    def _clean_build_directory(self):
        """Clean and prepare build directory"""
        print("Cleaning build directory...")
        
        if self.build_dir.exists():
            # Remove everything except .git, README.md, and install.sh
            for item in self.build_dir.iterdir():
                if item.name not in ['.git', 'README.md', 'install.sh']:
                    if item.is_file():
                        item.unlink()
                    else:
                        shutil.rmtree(item)
        else:
            self.build_dir.mkdir(parents=True)
    
    def _extract_package_assets(self):
        """Extract assets from installed packages"""
        print("Extracting package assets...")
        
        # Create temporary directories for assets
        qthvym_dir = self.cwd / 'qthvym'
        
        # Clean existing asset directories
        for dir_path in [qthvym_dir]:
            if dir_path.exists():
                shutil.rmtree(dir_path)
        
        # Extract qthvym assets
        if self.pkg_dirs['qthvym'].exists():
            qthvym_data_src = self.pkg_dirs['qthvym'] / 'data'
            if qthvym_data_src.exists():
                shutil.copytree(qthvym_data_src, qthvym_dir / 'data')
        
        # No qtwidgets assets; qthvym now provides its own PasswordEdit and icons
    
    def _copy_source_files(self):
        """Copy source files to build directory"""
        print("Copying source files...")
        
        # Copy main source files
        shutil.copy(self.src_files['main'], self.build_dir)
        shutil.copy(self.src_files['requirements'], self.build_dir)
        
        # Copy directories
        for name, src_path in self.src_files.items():
            if name in ['main', 'requirements']:
                continue
            if src_path.exists():
                shutil.copytree(src_path, self.build_dir / src_path.name)
        
        # Copy extracted package assets
        for asset_dir in ['qthvym']:
            src_asset_dir = self.cwd / asset_dir
            if src_asset_dir.exists():
                shutil.copytree(src_asset_dir, self.build_dir / asset_dir)
    
    def _get_qt_plugins_path(self) -> Optional[str]:
        """Find the Qt plugins directory"""
        try:
            from PyQt5.QtCore import QLibraryInfo
            return QLibraryInfo.location(QLibraryInfo.PluginsPath)
        except ImportError:
            # Try to find it in common locations
            possible_paths = [
                '/usr/lib/x86_64-linux-gnu/qt5/plugins',
                '/usr/local/lib/qt5/plugins',
                '/usr/lib/qt5/plugins',
                '/usr/lib/qt/plugins',
                str(Path(sys.prefix) / 'lib' / 'qt5' / 'plugins'),
                str(Path(sys.prefix) / 'lib' / 'qt' / 'plugins'),
            ]
            
            for path in possible_paths:
                if os.path.isdir(path) and os.path.isdir(os.path.join(path, 'platforms')):
                    return path
        return None

    def _install_dependencies(self):
        """Install Python dependencies"""
        print("Installing dependencies...")
        
        requirements_file = self.build_dir / self.src_files['requirements'].name
        if requirements_file.exists():
            try:
                subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)],
                    check=True
                )
                print("Dependencies installed successfully")
            except subprocess.CalledProcessError as e:
                print(f"Failed to install dependencies: {e}")
                raise

    def _build_executable(self, target_platform: Optional[str] = None):
        """Build executable using PyInstaller"""
        platform_name = target_platform or self.platform_info['platform']
        config = self.platform_configs[platform_name]
        
        print(f"\nBuilding {platform_name} executable...")
        
        # Create dist directory
        config['dist_dir'].mkdir(parents=True, exist_ok=True)
        
        # Base PyInstaller command
        pyinstaller_cmd = [
            'pyinstaller',
            '--onefile',
            f'--distpath={config["dist_dir"]}',
            '--noconfirm',  # Don't confirm overwrite of output directory
        ]
        
        # Add debug options if requested
        if os.environ.get('CI') or os.environ.get('HVYM_PYI_LOG_DEBUG') == '1':
            pyinstaller_cmd.extend(['--log-level', 'DEBUG'])
        
        # Add data files
        if os.environ.get('HVYM_EXCLUDE_QTHVYM_DATA') != '1':
            pyinstaller_cmd.extend(['--add-data', 'qthvym:qthvym'])
            
        pyinstaller_cmd.extend([
            '--add-data', 'templates:templates',
            '--add-data', 'scripts:scripts',
            '--add-data', 'images:images',
            '--add-data', 'data:data',
            '--add-data', 'npm_links:npm_links',
        ])
        
        # Add Qt platform plugins for Linux
        if platform_name == 'linux':
            qt_plugins_path = self._get_qt_plugins_path()
            if qt_plugins_path:
                print(f"Found Qt plugins at: {qt_plugins_path}")
                # Add platform plugins
                platforms_src = os.path.join(qt_plugins_path, 'platforms')
                if os.path.exists(platforms_src):
                    pyinstaller_cmd.extend([
                        '--add-data', f'{platforms_src}:PyQt5/Qt5/plugins/platforms',
                    ])
                # Add other required Qt plugins
                for plugin in ['xcbglintegrations', 'imageformats', 'platformthemes']:
                    plugin_src = os.path.join(qt_plugins_path, plugin)
                    if os.path.exists(plugin_src):
                        pyinstaller_cmd.extend([
                            '--add-data', f'{plugin_src}:PyQt5/Qt5/plugins/{plugin}',
                        ])
        
        # Add main script and name
        pyinstaller_cmd.extend([
            '--name', 'hvym',
            'hvym.py'
        ])
        
        # Collect all required packages
        required_packages = ['PyQt5', 'PyQt5.QtCore', 'PyQt5.QtGui', 'PyQt5.QtWidgets']
        for pkg in required_packages:
            pyinstaller_cmd.extend(['--collect-all', pkg])
            
        # Add any additional packages from environment
        collect_all_csv = os.environ.get('HVYM_PYI_COLLECT_ALL', '')
        if collect_all_csv:
            for pkg in [p.strip() for p in collect_all_csv.split(',') if p.strip()]:
                if pkg not in required_packages:  # Avoid duplicates
                    pyinstaller_cmd.extend(['--collect-all', pkg])

        # Experimental flags for diagnostics and bootloader debugging
        if os.environ.get('HVYM_BOOTLOADER_DEBUG') == '1':
            pyinstaller_cmd.extend(['--debug', 'bootloader'])
            
        runtime_tmpdir = os.environ.get('HVYM_RUNTIME_TMPDIR')
        if runtime_tmpdir:
            pyinstaller_cmd.append(f'--runtime-tmpdir={runtime_tmpdir}')

        # No need to exclude qtwidgets; dependency removed from runtime
        
        print(f"Running PyInstaller command: {' '.join(pyinstaller_cmd)}")
        
        try:
            subprocess.run(pyinstaller_cmd, check=True, cwd=self.build_dir)
        except subprocess.CalledProcessError as e:
            print(f"PyInstaller build failed: {e}")
            raise

    def run_experiments(self, platform_name: Optional[str] = None):
        """Run a small matrix of builds with diagnostic toggles and try a simple command.

        Uses environment variables to control bootloader debug and runtime tmpdir.
        """
        target = platform_name or self.platform_info['platform']
        results = {}

        # Define experiment scenarios
        scenarios = [
            {"name": "baseline", "env": {}},
            {"name": "bootloader_debug", "env": {"HVYM_BOOTLOADER_DEBUG": "1"}},
            {"name": "runtime_tmpdir_tmp", "env": {"HVYM_RUNTIME_TMPDIR": "/tmp"}},
            {"name": "bootloader_debug_tmp", "env": {"HVYM_BOOTLOADER_DEBUG": "1", "HVYM_RUNTIME_TMPDIR": "/tmp"}},
            {"name": "exclude_qtwidgets_data", "env": {"HVYM_EXCLUDE_QTWIDGETS_DATA": "1"}},
            {"name": "qtwidgets_dest_assets", "env": {"HVYM_QTWIDGETS_DST": "qtwidgets_assets"}},
        ]

        for scenario in scenarios:
            print(f"\n=== Experiment: {scenario['name']} ===")
            env_backup = os.environ.copy()
            try:
                os.environ.update(scenario['env'])
                # Clean and rebuild copies/assets to ensure consistency
                self._clean_build_directory()
                self._extract_package_assets()
                self._copy_source_files()
                self._create_platform_hooks()
                self._install_dependencies()
                self._build_executable(target)

                exe_path = self.platform_configs[target]['dist_dir'] / self.platform_configs[target]['executable_name']
                if not exe_path.exists():
                    print(f"Executable not found at {exe_path}")
                    results[scenario['name']] = {"built": False, "ran": False, "rc": None}
                    continue

                # Run a safe command: `version` (click command defined in hvym)
                cmd = [str(exe_path), 'version']
                run_env = os.environ.copy()
                run_env['PYI_LOG_LEVEL'] = 'DEBUG'
                run_env['HVYM_DIAG'] = '1'
                print(f"Running: {' '.join(cmd)}")
                completed = subprocess.run(cmd, capture_output=True, text=True, env=run_env)
                print("STDOUT:\n" + completed.stdout)
                print("STDERR:\n" + completed.stderr)
                results[scenario['name']] = {"built": True, "ran": True, "rc": completed.returncode}
            except Exception as e:
                print(f"Experiment '{scenario['name']}' failed: {e}")
                results[scenario['name']] = {"built": False, "ran": False, "rc": None, "error": str(e)}
            finally:
                os.environ.clear()
                os.environ.update(env_backup)
        return results
    
    def _create_platform_hooks(self):
        """Create platform-specific runtime hooks if needed"""
        hooks_dir = self.build_dir / 'hooks'
        hooks_dir.mkdir(exist_ok=True)
        
        # Windows hook
        windows_hook = hooks_dir / 'windows_hook.py'
        if not windows_hook.exists():
            windows_hook.write_text('''
# Windows-specific runtime hook
import os
import sys

def setup_environment():
    """Setup Windows-specific environment"""
    # Add current directory to PATH for DLL loading
    if hasattr(sys, '_MEIPASS'):
        os.environ['PATH'] = sys._MEIPASS + os.pathsep + os.environ.get('PATH', '')
''')
        
        # macOS hook
        macos_hook = hooks_dir / 'macos_hook.py'
        if not macos_hook.exists():
            macos_hook.write_text('''
# macOS-specific runtime hook
import os
import sys

def setup_environment():
    """Setup macOS-specific environment"""
    # Handle macOS bundle structure
    if hasattr(sys, '_MEIPASS'):
        os.environ['QT_MAC_WANTS_LAYER'] = '1'
''')
    
    def _set_executable_permissions(self, platform_name: str):
        """Set executable permissions for the built binary"""
        config = self.platform_configs[platform_name]
        executable_path = config['dist_dir'] / config['executable_name']
        
        if platform_name in ['linux', 'macos'] and executable_path.exists():
            try:
                os.chmod(executable_path, 0o755)
                print(f"Set executable permissions for {executable_path}")
            except Exception as e:
                print(f"Warning: Could not set executable permissions: {e}")
    
    def _create_release_info(self, platform_name: str):
        """Create release information file"""
        config = self.platform_configs[platform_name]
        release_info = {
            'platform': platform_name,
            'architecture': self.platform_info['architecture'],
            'python_version': self.platform_info['python_version'],
            'build_date': subprocess.run(['date'], capture_output=True, text=True).stdout.strip(),
            'executable_name': config['executable_name'],
            'executable_path': str(config['dist_dir'] / config['executable_name'])
        }
        
        release_file = config['dist_dir'] / 'release_info.json'
        with open(release_file, 'w') as f:
            json.dump(release_info, f, indent=2)
        
        print(f"Created release info: {release_file}")
    
    def build(self, target_platform: Optional[str] = None, clean: bool = True):
        """Main build process"""
        platform_name = target_platform or self.platform_info['platform']
        
        print(f"Starting cross-platform build for {platform_name}")
        print(f"Platform info: {self.platform_info}")
        self._log_environment_summary()
        
        # Check dependencies (skip in CI environment)
        if not os.environ.get('CI'):
            if not self._check_dependencies():
                return False
        else:
            print("Skipping dependency check in CI environment")
        
        try:
            # Clean build directory
            if clean:
                self._clean_build_directory()
            
            # Extract package assets
            self._extract_package_assets()
            
            # Copy source files
            self._copy_source_files()
            
            # Create platform hooks
            self._create_platform_hooks()
            
            # Install dependencies
            self._install_dependencies()
            
            # Build executable
            self._build_executable(platform_name)
            
            # Set permissions
            self._set_executable_permissions(platform_name)
            
            # Create release info
            self._create_release_info(platform_name)
            
            print(f"Build completed successfully for {platform_name}")
            print(f"Executable location: {self.platform_configs[platform_name]['dist_dir']}")
            
            return True
            
        except Exception as e:
            print(f"Build failed: {e}")
            return False
    
    def build_all_platforms(self):
        """Build for all supported platforms"""
        platforms = ['windows', 'macos', 'linux']
        results = {}
        
        print("Building for all platforms...")
        
        for platform_name in platforms:
            print(f"\n{'='*50}")
            print(f"Building for {platform_name}")
            print(f"{'='*50}")
            
            try:
                success = self.build(target_platform=platform_name, clean=True)
                results[platform_name] = success
            except Exception as e:
                print(f"Failed to build for {platform_name}: {e}")
                results[platform_name] = False
        
        # Summary
        print(f"\n{'='*50}")
        print("BUILD SUMMARY")
        print(f"{'='*50}")
        for platform_name, success in results.items():
            status = "SUCCESS" if success else "FAILED"
            print(f"{platform_name:10}: {status}")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Cross-platform build script for HeavyMeta CLI')
    parser.add_argument('--platform', choices=['windows', 'macos', 'linux', 'all'],
                       help='Target platform for build (default: current platform)')
    parser.add_argument('--no-clean', action='store_true',
                       help='Skip cleaning build directory')
    parser.add_argument('--info', action='store_true',
                       help='Show platform information and exit')
    parser.add_argument('--experiment', action='store_true',
                        help='Run experimental builds with diagnostics and execute version command')
    
    args = parser.parse_args()
    
    builder = CrossPlatformBuilder()
    
    if args.info:
        print("Platform Information:")
        print(json.dumps(builder.platform_info, indent=2))
        return
    
    if args.experiment:
        builder.run_experiments()
    elif args.platform == 'all':
        builder.build_all_platforms()
    else:
        builder.build(target_platform=args.platform, clean=not args.no_clean)

if __name__ == '__main__':
    main() 