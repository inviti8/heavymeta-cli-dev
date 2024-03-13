import os
import click
import subprocess
import shutil
import json
from platformdirs import *
from pygltflib import GLTF2

@click.group()
def cli():
    pass

@click.command('install-icp')
def install_icp():
    """Install ICP command"""
    cmd = "sh -c '$(curl -fsSL https://internetcomputer.org/install.sh)'"
    subprocess.run(cmd, shell=True, check=True)

@click.command('icp-project')
@click.argument('name')
def icp_project(name):
    """Create a new ICP project"""
    home = os.path.expanduser("~").replace('\\', '/') if os.name == 'nt' else os.path.expanduser("~")
    
    app_dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
    path = os.path.join(app_dirs.user_data_dir, name)
    
    if not os.path.exists(path):
        os.makedirs(path)
        
    # Write the path to a text file
    session_file = os.path.join(app_dirs.user_data_dir, 'icp_session.txt')
    with open(session_file, 'w') as f:
        f.write(path)
    
    click.echo(f"Created project at {path}")

@click.command('icp-project-path')
def icp_project_path():
    """Print the current ICP project path"""
    path = 'NOT SET!'
    app_dirs = AppDirs('heavymeta-cli', 'HeavyMeta')
    session_file = os.path.join(app_dirs.user_data_dir, 'icp_session.txt')
    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            path = f.read().strip()
    click.echo("The current icp project path is: " + path)

@click.command('icp-init-deploy')
@click.argument('nft_name', type=str)
@click.option('--force', '-f', is_flag=True, default=False, help='Overwrite existing directory without asking for confirmation')
def icp_init_deploy(nft_name, force):
    dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
    session_file = os.path.join(dirs.user_data_dir, "icp_session.txt")
    path = None
    if not os.path.exists(session_file):
        click.echo("No icp session available create a new icp project with 'icp-project' {project_name} ")
        return

    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            path = f.read().strip()
    
    if not os.path.exists(os.path.join(path, nft_name)) or force:
        if not (force or click.confirm(f"Do you want to create a new deploy dir at {path}?")):
            return
        
        os.makedirs(os.path.join(path, nft_name, 'src'))
        
        dfx_json = {
          "canisters": {
             f"{nft_name}_nft_container": {
                "main": "src/Main.mo"
              }
           }
        }
        
        with open(os.path.join(path, nft_name, 'dfx.json'), 'w') as f:
            json.dump(dfx_json, f)
            
        # Create empty Main.mo and Types.mo files
        with open(os.path.join(path, nft_name, 'src', 'Main.mo'), 'w') as f:
            pass
        
        with open(os.path.join(path, nft_name, 'src', 'Types.mo'), 'w') as f:
            pass
    else:
        click.echo(f"Directory {nft_name} already exists at path {path}. Use --force to overwrite.")

@click.command('icp-parse-nft')
@click.argument('path' help="string file path to the gltf file.")
def icp_parse_nft(path):
    """Parse the ICP contract files from heavymeta gltf data"""
    if '.glb' not in path:
        click.echo(f"Only GLTF Binary files (.glb) accepted.")
        return

cli.add_command(install_icp)
cli.add_command(icp_project)
cli.add_command(icp_project_path)
cli.add_command(icp_init_deploy)

if __name__ == '__main__':
    cli()
