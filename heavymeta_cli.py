import os
import click
import subprocess
import shutil
import json
import subprocess
from platformdirs import *
from pygltflib import GLTF2

@click.group()
def cli():
    pass

@click.command('icp-install')
def icp_install():
    """Install ICP dxf cli."""
    cmd = "sh -c '$(curl -fsSL https://internetcomputer.org/install.sh)'"
    subprocess.run(cmd, shell=True, check=True)

@click.command('icp-new-cryptonym')
@click.argument('cryptonym', type=str)
def icp_new_cryptonym(cryptonym):
    """Create a new cryptonym, (alias/identity) for the Internet Computer Protocol."""
    command = f'dfx identity new {cryptonym} --storage-mode password-protected'
    output = subprocess.run(command, shell=True, capture_output=True, text=True)
    print('Command output:', output.stdout)

@click.command('icp-use-cryptonym')
@click.argument('cryptonym', type=str)
def icp_use_cryptonym(cryptonym):
    """Use a cryptonym, (alias/identity) for the Internet Computer Protocol."""
    command = f'dfx identity use {cryptonym}'
    output = subprocess.run(command, shell=True, capture_output=True, text=True)
    print('Command output:', output.stdout)

@click.command('icp-account')
def icp_account(cryptonym):
    """Get the account number for the current active account."""
    command = f'dfx ledger account-id'
    output = subprocess.run(command, shell=True, capture_output=True, text=True)
    print('Command output:', output.stdout)

@click.command('icp-principal')
def icp_principal():
    """Get the current principal id for account."""
    command = f'dfx get-principal'
    output = subprocess.run(command, shell=True, capture_output=True, text=True)
    print('Command output:', output.stdout)

@click.command('icp-balance')
def icp_balance():
    """Get the current balance of ic for current account."""
    command = f'dfx ledger --network ic balance'
    output = subprocess.run(command, shell=True, capture_output=True, text=True)
    print('Command output:', output.stdout)

@cli.command('icp_backup_keys')
@click.argument('identity_name')
@click.option('--out_path', type=click.Path(), required=True, help='The output path where to copy the identity.pem file.')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_backup_keys(identity_name, out_path):
    """Backup local Internet Computer Protocol keys."""
    # Get the home directory of the user
    home = os.path.expanduser("~") 
    
    # Construct the source path
    src_path = os.path.join(home, ".config", "dfx", "identity", identity_name, "identity.pem")
    
    # Check if the file exists
    if not os.path.exists(src_path):
        click.echo(f"The source .pem file does not exist: {src_path}")
        return
        
    # Construct the destination path
    dest_path = os.path.join(out_path, "identity.pem")
    
    # Copy the file to out_path
    shutil.copyfile(src_path, dest_path)
    
    click.echo(f"The keys have been successfully backed up at: {dest_path}")

@click.command('icp-project')
@click.argument('name')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
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
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
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
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
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
        

@click.command('print-hvym-data')
@click.argument('path', type=str)
def print_hvym_data(path):
    """Print Heavymeta data embedded in glb file."""
    if '.glb' not in path:
        click.echo(f"Only GLTF Binary files (.glb) accepted.")
        return
    gltf = GLTF2().load(path)
    if 'HVYM_nft_data' in gltf.extensions.keys():
        hvym_data = gltf.extensions['HVYM_nft_data']
        pretty_json = json.dumps(hvym_data, indent=4)
        print(pretty_json)
    else:
        click.echo(f"No Heavymeta data in file: {path}")
    

cli.add_command(icp_install)
cli.add_command(icp_new_cryptonym)
cli.add_command(icp_use_cryptonym)
cli.add_command(icp_account)
cli.add_command(icp_principal)
cli.add_command(icp_balance)
cli.add_command(icp_backup_keys)
cli.add_command(icp_project)
cli.add_command(icp_project_path)
cli.add_command(icp_init_deploy)
cli.add_command(print_hvym_data)

if __name__ == '__main__':
    cli()
