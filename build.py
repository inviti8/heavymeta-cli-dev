import shutil
import subprocess
from pathlib import Path

# get current working directory
cwd = Path.cwd()

# source files
src_file1 = cwd / 'heavymeta_cli.py'
src_file2 = cwd / 'requirements.txt'

# target directories for the build folder and files
build_dir = cwd / 'build'
dist_dir = cwd / build_dir / 'dist'
destination_dir = Path('/home/desktop/.config/blender/4.0/scripts/addons/heavymeta_standard')

# check if build dir exists, if not create it
if not build_dir.exists():
    build_dir.mkdir()

# copy source files to build directory
shutil.copy(src_file1, build_dir)
shutil.copy(src_file2, build_dir)

# install dependencies from requirements.txt
subprocess.run(['pip', 'install', '-r', str(build_dir / src_file2.name)], check=True)

# build the python script into an executable using PyInstaller
subprocess.run(['pyinstaller', '-F', f'--distpath={dist_dir}', str(build_dir / src_file1.name)], check=True)

# copy built executable to destination directory
shutil.copy(str(dist_dir / (src_file1.stem )), destination_dir)
