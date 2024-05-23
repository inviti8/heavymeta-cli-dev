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
template_dir = cwd / 'templates'
template_copied_dir = cwd / build_dir / 'templates'
img_dir = cwd / 'images'
img_copied_dir = cwd / build_dir / 'images'
dist_dir = cwd / build_dir / 'dist'
destination_dir = Path('/home/desktop/.config/blender/4.0/scripts/addons/heavymeta_standard')

# check if build dir exists, if not create it
if not build_dir.exists():
    build_dir.mkdir()
else: # delete all files inside the directory
    for item in build_dir.iterdir():
        if item.is_file():
            item.unlink()
        else:
            shutil.rmtree(item)

# copy source files to build directory
shutil.copy(src_file1, build_dir)
shutil.copy(src_file2, build_dir)
shutil.copytree(template_dir, build_dir / template_dir.name)
shutil.copytree(img_dir, build_dir / img_dir.name)

# install dependencies from requirements.txt
subprocess.run(['pip', 'install', '-r', str(build_dir / src_file2.name)], check=True)

# build the python script into an executable using PyInstaller
subprocess.run(['pyinstaller', '--onefile', f'--distpath={dist_dir}', '--add-data', 'templates:templates',  '--add-data', 'images:images',  str(build_dir / src_file1.name)], check=True)

# copy built executable to destination directory
shutil.copy(str(dist_dir / (src_file1.stem )), destination_dir)
