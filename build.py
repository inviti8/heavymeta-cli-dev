import shutil
import subprocess
from pathlib import Path
import argparse
import os
import platform

parser = argparse.ArgumentParser()
parser.add_argument("--test", help="copy executable to local install directory", action="store_true")
parser.add_argument("--mac", help="copy executable to mac local install directory", action="store_true")
args = parser.parse_args()

# get current working directory
cwd = Path.cwd()
home = Path.home()
#local python packages
pkgs_dir = home / '.pyenv' / 'versions' / '3.9.18' / 'envs' / 'hvym_cli_build' / 'lib' / 'python3.9' / 'site-packages'

# source files
src_file1 = cwd / 'hvym.py'
src_file2 = cwd / 'requirements.txt'

# target directories for the build folder and files
build_dir = cwd.parent / 'hvym' 
template_dir = cwd / 'templates'
template_copied_dir = build_dir / 'templates'
img_dir = cwd / 'images'
img_copied_dir = build_dir / 'images'
npm_links_dir = cwd / 'npm_links'
npm_links_copied_dir = build_dir / 'npm_links'
scripts_dir = cwd / 'scripts'
scripts_copied_dir = build_dir / 'scripts'
dist_dir = build_dir / 'dist' / 'linux'

#need to grab assets from packages so they can be built
qthvym_dir = cwd  /  'qthvym'
qthvym_dir_src = pkgs_dir / 'qthvym'
qthvym_data_src = qthvym_dir_src / 'data'

# No external qtwidgets assets needed; qthvym provides its own resources

if args.mac:
    dist_dir = build_dir / 'dist' / 'mac'


# check if build dir exists, if not create it
if not build_dir.exists():
    build_dir.mkdir()
else: # delete all files inside the directory
    for item in build_dir.iterdir():
        if item.name != '.git' and item.name != 'README.md' and item.name != 'install.sh':
            if item.is_file():
                item.unlink()
            else:
                shutil.rmtree(item)

#Clear out assets dirs first
if qthvym_dir.exists():
    shutil.rmtree(qthvym_dir)

    

            

#copy packaged assets over to this project for build
shutil.copytree(qthvym_data_src, qthvym_dir / 'data')
    

#remove anything that's not an svg from qtwidgets copied over files
    


#opy source files to build directory
shutil.copy(src_file1, build_dir)
shutil.copy(src_file2, build_dir)
shutil.copytree(template_dir, build_dir / template_dir.name)
shutil.copytree(img_dir, build_dir / img_dir.name)
shutil.copytree(npm_links_dir, build_dir / npm_links_dir.name)
shutil.copytree(scripts_dir, build_dir / scripts_dir.name)
shutil.copytree(qthvym_dir, build_dir / qthvym_dir.name)
    

# install dependencies from requirements.txt
subprocess.run(['pip', 'install', '-r', str(build_dir / src_file2.name)], check=True)

# build the python script into an executable using PyInstaller
subprocess.run([
    'pyinstaller',
    '--onefile',
    f'--distpath={dist_dir}',
    '--add-data', 'qthvym:qthvym',
    '--add-data', 'templates:templates',
    '--add-data', 'scripts:scripts',
    '--add-data', 'images:images',
    '--add-data', 'data:data',
    '--add-data', 'npm_links:npm_links',
    str(build_dir / src_file1.name)
], check=True)

# copy built executable to destination directory
if args.test:
    test_dir = Path('/home/desktop/.local/share/heavymeta-cli')
    shutil.copy(str(dist_dir / (src_file1.stem )), test_dir)
    subprocess.Popen('chmod +x ./hvym', cwd=test_dir, shell=True, stderr=subprocess.STDOUT)

