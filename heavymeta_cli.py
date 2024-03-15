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


@click.command('icp-start-assets')
def icp_start_assets(): 
    """Start dfx in the current assets folder."""
    dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
    session_file = os.path.join(dirs.user_data_dir, "icp_session.txt")
    path = None
    if not os.path.exists(session_file):
        click.echo("No icp session available create a new icp project with 'icp-project' ")
        return
    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            path = f.read().strip()
            
    commands = [f'cd {path}', 'dfx start --clean --background']
    for command in commands:
        process = subprocess.run(command, shell=True, capture_output=True, text=True)
        if process.returncode != 0:  # Checking the return code
            print("Command failed with error:", process.stderr)


@click.command('icp-deploy-assets')
@click.option('--test', is_flag=True)
def icp_deploy_assets(test):
    """deploy the current asset canister."""
    dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
    session_file = os.path.join(dirs.user_data_dir, "icp_session.txt")
    path = None
    if not os.path.exists(session_file):
        click.echo("No icp session available create a new icp project with 'icp-project' ")
        return
    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            path = f.read().strip()
    command = 'dfx deploy'
    ic  = ''
    if not test:
        ic = ' ic'
    command=command+ic
    output = subprocess.run(command, shell=True, capture_output=True, text=True)
    print('Command output:', output.stdout)


@cli.command('icp_backup_keys')
@click.argument('identity_name')
@click.option('--out_path', type=click.Path(), required=True, help='The output path where to copy the identity.pem file.')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_backup_keys(identity_name, out_path, quiet):
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
@click.option('--quiet', '-q', is_flag=True,  required=False, default=False, help="Don't echo anything.")
def icp_project(name, quiet):
    """Create a new ICP project"""
    home = os.path.expanduser("~").replace('\\', '/') if os.name == 'nt' else os.path.expanduser("~")
    
    app_dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
    path = os.path.join(app_dirs.user_data_dir, 'icp', name)
    
    if not os.path.exists(path):
        os.makedirs(path)
        
    # Write the path to a text file
    session_file = os.path.join(app_dirs.user_data_dir, 'icp_session.txt')
    with open(session_file, 'w') as f:
        f.write(path)
    
    click.echo(f"Working Internet Protocol directory set {path}")


@click.command('icp-project-path')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_project_path(quiet):
    """Print the current ICP project path"""
    path = 'NOT SET!'
    app_dirs = AppDirs('heavymeta-cli', 'HeavyMeta')
    session_file = os.path.join(app_dirs.user_data_dir, 'icp_session.txt')
    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            path = f.read().strip()
    click.echo(path)


@click.command('icp-init-deploy')
@click.argument('coll_name', type=str)
@click.option('--force', '-f', is_flag=True, default=False, help='Overwrite existing directory without asking for confirmation')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_init_deploy(coll_name, force):
    """Set up nft collection deploy directories"""
    dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
    session_file = os.path.join(dirs.user_data_dir, "icp_session.txt")
    path = None
    if not os.path.exists(session_file):
        click.echo("No icp session available create a new icp project with 'icp-project' {project_name} ")
        return

    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            path = f.read().strip()
    
    if not os.path.exists(os.path.join(path, coll_name)) or force:
        if not (force or click.confirm(f"Do you want to create a new deploy dir at {path}?")):
            return
        #Create the DIP721 directories
        os.makedirs(os.path.join(path, coll_name, 'DIP721', 'src'))
        #Create the Assets directories
        os.makedirs(os.path.join(path, coll_name, 'Assets', 'src'))
        
        dfx_json = {
          "canisters": {
             f"{coll_name}_nft_container": {
                "main": "src/Main.mo"
              }
           }
        }
        
        with open(os.path.join(path, coll_name, 'DIP721', 'dfx.json'), 'w') as f:
            json.dump(dfx_json, f)
            
        # Create empty Main.mo and Types.mo files
        with open(os.path.join(path, coll_name, 'src', 'DIP721', 'Main.mo'), 'w') as f:
            pass
        
        with open(os.path.join(path, coll_name, 'src', 'DIP721', 'Types.mo'), 'w') as f:
            pass

        dfx_json = {
            "canisters": {
              f"{coll_name}_assets": {
                "source": ["src"],
                "type": "assets"
              }
            },
            "output_env_file": ".env"
        }
        
        with open(os.path.join(path, coll_name, 'Assets', 'dfx.json'), 'w') as f:
            json.dump(dfx_json, f)
            
    else:
        click.echo(f"Directory {coll_name} already exists at path {path}. Use --force to overwrite.")
        

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
cli.add_command(icp_start_assets)
cli.add_command(icp_deploy_assets)
cli.add_command(icp_backup_keys)
cli.add_command(icp_project)
cli.add_command(icp_project_path)
cli.add_command(icp_init_deploy)
cli.add_command(print_hvym_data)

if __name__ == '__main__':
    cli()
