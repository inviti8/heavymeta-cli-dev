import os
import click
import subprocess
import shutil
import json
import subprocess
import threading
import concurrent.futures
from subprocess import run, Popen, PIPE
from platformdirs import *
from pygltflib import GLTF2
from dataclasses import dataclass, asdict, field
from dataclasses_json import dataclass_json
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import re

FILE_PATH = Path(__file__).parent

TEMPLATE_MODEL_VIEWER_INDEX = 'model_viewer_html_template.txt'
TEMPLATE_MODEL_VIEWER_JS = 'model_viewer_js_template.txt'


#Material Data classes
@dataclass_json
@dataclass
class base_data_class:
      @property
      def dictionary(self):
            return asdict(self)
      
      @property
      def json(self):
            return json.dumps(self.dictionary)


@dataclass_json
@dataclass
class widget_data_class(base_data_class):
      '''
    Base data class for widget data
    :param widget_type: Widget type to use
    :type widget_type:  (str)
    :param show: if false, hide widget
    :type show:  (bool)
    '''
      widget_type: str
      show: bool


@dataclass_json
@dataclass
class slider_data_class(widget_data_class):
      '''
    Base data class for slider data
    :param prop_slider_type: Slider type to use
    :type prop_slider_type:  (int)
    :param prop_action_type: Action type to use
    :type prop_action_type:  (int)
    '''
      prop_slider_type: str
      prop_action_type: str


@dataclass_json
@dataclass
class int_data_class(slider_data_class):
      '''
    Creates data object for basic material reference
    :param default: Default integer value
    :type default:  (int)
    :param min: Minimum integer value
    :type min:  (int)
    :param max: Maximum integer value
    :type max:  (int)
    '''
      default: int
      min: int
      max: int
      

@dataclass_json
@dataclass
class float_data_class(slider_data_class):
      '''
    Creates data object for basic material reference
    :param default: Default integer value
    :type default:  (float)
    :param min: Minimum integer value
    :type min:  (float)
    :param max: Maximum integer value
    :type max:  (float)
    '''
      default: float
      min: float
      max: float


@dataclass_json
@dataclass
class mesh_data_class(widget_data_class):
      '''
    Creates data object for basic material reference
    :param name: Mesh name
    :type name:  (str)
    :param min: Mesh visiblility
    :type min:  (str)
    '''
      name: str
      visible: bool
      

@dataclass_json
@dataclass
class mesh_set_data_class(widget_data_class):
      '''
    Creates data object for basic material reference
    :param name: Mesh name
    :type name:  (str)
    :param min: Mesh visiblility
    :type min:  (str)
    '''
      set: []
      selected_index: int
      
      
@dataclass_json
@dataclass
class basic_material_class(base_data_class):
      '''
    Creates data object for basic material reference
    :param color: String identifier for color hex
    :type color:  (str)
    :param emissive: String identifier for color hex
    :type emissive:  (str)
    :param emissive_intensity: Float for emissive intensity
    :type emissive_intensity:  (float)
    '''
      color: str
      emissive: str = None
      emissive_intensity: float = None
    

@dataclass_json
@dataclass
class lambert_material_class(base_data_class):
       '''
    Creates data object for lambert material reference
    :param color: String identifier for color hex
    :type color:  (str)
    :param emissive: String identifier for color hex
    :type emissive:  (str)
    :param emissive_intensity: Float for emissive intensity
    :type emissive_intensity:  (float)
    '''
       color: str
       emissive: str = None
       emissive_intensity: float = None
    

@dataclass_json
@dataclass
class phong_material_class(base_data_class):
      '''
    Creates data object for phong material reference
    :param color: String identifier for color hex
    :type color:  (str)
    :param specular: String identifier for color hex
    :type specular:  (str)
    :param shininess: float value for shine
    :type shininess:  (float)
    :param emissive: String identifier for color hex
    :type emissive:  (str)
    :param emissive_intensity: Float for emissive intensity
    :type emissive_intensity:  (float)
    '''
      color: str
      specular: str
      shininess: float
      emissive: str = None
      emissive_intensity: float = None



@dataclass_json
@dataclass
class standard_material_class(base_data_class):
       '''
    Creates data object for standard material reference
    :param color: String identifier for color hex
    :type color:  (str)
    :param roughness: float for roughness
    :type roughness:  (float)
    :param metalness: float value for metalness
    :type metalness:  (float)
    :param emissive: String identifier for color hex
    :type emissive:  (str)
    :param emissive_intensity: Float for emissive intensity
    :type emissive_intensity:  (float)
    '''
       color: str
       roughness: float
       metalness: float
       emissive: str = None
       emissive_intensity: float = None


@dataclass_json
@dataclass
class pbr_material_class(base_data_class):
      '''
    Creates data object for pbr material reference
    :param color: String identifier for color hex
    :type color:  (str)
    :param roughness: float for roughness
    :type roughness:  (float)
    :param metalness: float value for metalness
    :type metalness:  (float)
    :param iridescence: float value for iridescence
    :type iridescence:  (float)
    :param sheen: float value for iridescence
    :type sheen:  (float)
    :param sheen_roughness: float value for iridescence
    :type sheen_roughness:  (float)
    :param sheen_color: Sheen color
    :type sheen_color:  (str)
    :param emissive: String identifier for color hex
    :type emissive:  (str)
    :param emissive_intensity: Float for emissive intensity
    :type emissive_intensity:  (float)
    '''
      color: str
      roughness: float
      metalness: float
      iridescence: float = None
      iridescenceIOR: float = None
      sheen: float = None
      sheen_roughness: float = None
      sheen_color: str = None
      emissive: str = None
      emissive_intensity: float = None
    

@dataclass_json
@dataclass      
class model_debug_data(base_data_class):
    '''
    Creates data object to be used in jinja text renderer for model debug templates.
    :param model: String identifier for model file name including extension
    :type model:  (str)
    :param model_name String identifier for model file name without extension.
    :type model_name:  (str)
    :param js_file_name: String identifier for js file name with extension.
    :type js_file_name:  (str)
    '''
    model: str
    model_name: str
    js_file_name: str


def _new_session(chain):
    home = os.path.expanduser("~").replace('\\', '/') if os.name == 'nt' else os.path.expanduser("~")
    
    app_dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
    path = os.path.join(app_dirs.user_data_dir, f'{chain}', name)
    
    if not os.path.exists(path):
        os.makedirs(path)
        
    # Write the path to a text file
    session_file = os.path.join(app_dirs.user_data_dir, f'{chain}_session.txt')
    with open(session_file, 'w') as f:
        f.write(path)
        

def _get_session(chain):
    """Get the active project session path."""
    dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
    session_file = os.path.join(dirs.user_data_dir, f"{chain}_session.txt")
    path = 'NOT SET!!'
    if not os.path.exists(session_file):
        click.echo(f"No {chain} session available create a new {chain}  project with '{chain} -project $project_name' ")
        return

    if os.path.exists(session_file):
        with open(session_file, 'r') as f:
            path = f.read().strip()

    return path


def _run_command(cmd):
    process = Popen(cmd, stdout=PIPE, stderr=PIPE, shell=True)
    output, error = process.communicate()
    
    if process.returncode != 0:   # Checking the return code
        print("Command failed with error:", error.decode('utf-8'))
    else:
        print(output.decode('utf-8'))  # assuming you want to print outout

def _run_futures_cmds(path, cmds):
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {executor.submit(run, cmd, shell=True, cwd=path): cmd for cmd in cmds}
        
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result(timeout=5)  # Get the result from Future object
                #print( result.stdout)
                
            except Exception as e:   # Checking for any exception raised by the command
                print("Command failed with error:", str(e))
                

def _futures(chain, folder, commands):
    path = _get_session(chain)
    asset_path = os.path.join(path, folder)
    
    _run_futures_cmds(asset_path, commands)
    

def _subprocess_output(command, path):
    try:
        output = subprocess.check_output(command, cwd=path, shell=True, stderr=subprocess.STDOUT)
        print(_extract_urls(output.decode('utf-8')))
        return output.decode('utf-8')
    except Exception as e:
        print("Command failed with error:", str(e))
        

def _subprocess(chain, folder, command):
    path = _get_session(chain)
    asset_path = os.path.join(path, folder)
    
    return _subprocess_output(command, asset_path)


def _icp_set_network(name, port):
    """Set the ICP network."""
    config_dir = user_config_dir()  # Gets the path to the config directory.
    networks_config = os.path.join(config_dir, 'dfx', 'networks.json')
    
    if not os.path.exists(networks_config):  # If networks.json does not exist
        with open(networks_config, 'w') as file:
            json.dump({"local": {"replica": {"bind": f"localhost:{port}","subnet_type": "application"}}}, file)
            

def _set_hvym_network():
    """Set the ICP  Heavymeta network."""
    _icp_set_network('hvym', 1357)
    

def _extract_urls(output):
    urls = re.findall('http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[\\\\/])*', output)
    return urls
    

@click.group()
def cli():
    pass


@click.command('basic-material-data')
@click.argument('color', type=str)
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def basic_material_data(color, emissive=None, emissive_intensity=None):
    """Return data object with fields required for basic material"""
    print(basic_material_class(color, emissive, emissive_intensity).json)
    return basic_material_class(color, emissive, emissive_intensity).json


@click.command('lambert-material-data')
@click.argument('color', type=str)
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def lambert_material_data(color, emissive=None, emissive_intensity=None):
    """Return data object with fields required for lambert material"""
    return phong_material_class(color, emissive, emissive_intensity).json


@click.command('phong-material-data')
@click.argument('color', type=str)
@click.argument('specular', type=str)
@click.argument('shininess', type=float)
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def phong_material_data(color, specular, shininess, emissive=None, emissive_intensity=None):
    """Return data object with fields required for phong material"""
    return phong_material_class(color, specular, shininess, emissive, emissive_intensity).json


@click.command('standard-material-data')
@click.argument('color', type=str)
@click.argument('roughness', type=float)
@click.argument('metalness', type=float)
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def standard_material_data(color, roughness, metalness, emissive=None, emissive_intensity=None):
    """Return data object with fields required for standard material"""
    return pbr_material_class(color, roughness, metalness, emissive, emissive_intensity).json


@click.command('pbr-material-data')
@click.argument('color', type=str)
@click.argument('roughness', type=float)
@click.argument('metalness', type=float)
@click.option('--iridescence', '-i', type=float,  help='Optional iridescence field')
@click.option('--iridescence-io', '-io', type=float,  help='Optional iridescence field')
@click.option('--sheen', '-s', type=float,  help='Optional sheen field')
@click.option('--sheen-roughness', '-sr', type=float,  help='Optional sheen roughness field')
@click.option('--sheen-color', '-sc', type=str,  help='Optional sheen color field')
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def pbr_material_data(color, roughness, metalness, iridescence=None, iridescence_io=None, sheen=None, sheen_roughness=None, sheen_color=None, emissive=None, emissive_intensity=None):
    """Return data object with fields required for pbr material"""
    return pbr_material_class(color, roughness, metalness, iridescence, iridescence_io, sheen, sheen_roughness, sheen_color, emissive, emissive_intensity).json


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
    _set_hvym_network()
    _futures('icp', 'Assets', ['dfx start --clean --background'])
                

@click.command('icp-stop-assets')
def icp_stop_assets():
    _futures('icp', 'Assets', [ 'dfx stop'])


@click.command('icp-deploy-assets')
@click.option('--test', is_flag=True, default=True, )
def icp_deploy_assets(test):
    """deploy the current asset canister."""
    command = 'dfx deploy'
    if not test:
        command += ' ic'
        
    return _subprocess('icp', 'Assets', command)
    

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
    path = _new_session('icp')
    click.echo(f"Working Internet Protocol directory set {path}")


@click.command('icp-project-path')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_project_path(quiet):
    """Print the current ICP project path"""
    click.echo(_get_session('icp'))


@click.command('icp-init-deploy')
@click.argument('project_name', type=str)
@click.option('--force', '-f', is_flag=True, default=False, help='Overwrite existing directory without asking for confirmation')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_init_deploy(project_name, force, quiet):
    """Set up nft collection deploy directories"""
    path = _get_session('icp')
    project_path = os.path.join(path, project_name)
    
    if not os.path.exists(project_path) or force:
        if not (force or click.confirm(f"Do you want to create a new deploy dir at {path}?")):
            return
        #Create the DIP721 directories
        os.makedirs(os.path.join(path, 'DIP721', 'src'))
        #Create the Assets directories
        os.makedirs(os.path.join(path,  'Assets', 'src'))
        
        dfx_json = {
          "canisters": {
             f"{project_name}_nft_container": {
                "main": "src/Main.mo"
              }
           }
        }
        
        with open(os.path.join(path, 'DIP721', 'dfx.json'), 'w') as f:
            json.dump(dfx_json, f)
            
        # Create empty Main.mo and Types.mo files
        with open(os.path.join(path, 'DIP721', 'src', 'Main.mo'), 'w') as f:
            pass
        
        with open(os.path.join(path, 'DIP721',  'src',  'Types.mo'), 'w') as f:
            pass

        dfx_json = {
            f"{project_name}": {
              f"{project_name}_assets": {
                "source": [
                    f"src/{project_name}/"
                  ],
                "type": "assets"
              }
            },
            "output_env_file": ".env"
        }
        
        with open(os.path.join(path, 'Assets', 'dfx.json'), 'w') as f:
            json.dump(dfx_json, f)
        
            
    else:
        click.echo(f"Directory {project_name} already exists at path {path}. Use --force to overwrite.")


@click.command('icp-debug-model')
@click.argument('model', type=str)
def icp_debug_model(model):
    """Set up nft collection deploy directories"""
    path = _get_session('icp')
    assets_dir = os.path.join(path, 'Assets')
    src_dir = os.path.join(assets_dir, 'src')
    model_path = os.path.join(src_dir, model)
    model_name = model.replace('.glb', '')
    js_file_name = 'main.js'

    if not os.path.exists(model_path):
        click.echo(f"No model exists at path {model_path}.")
    
    js_dir = os.path.join(src_dir, 'assets')
    
    if not os.path.exists(js_dir):
        os.makedirs(js_dir)
        
    file_loader = FileSystemLoader(FILE_PATH / 'templates')
    env = Environment(loader=file_loader)
    template = env.get_template(TEMPLATE_MODEL_VIEWER_JS)
    
    data = model_debug_data(model, model_name, js_file_name)
    output = template.render(data=data)
    js_file_path = os.path.join(src_dir, 'assets',  js_file_name)
    index_file_path = os.path.join(src_dir, 'index.html')

    with open(js_file_path, 'w') as f:
        output = template.render(data=data)
        f.write(output)
        
    template = env.get_template(TEMPLATE_MODEL_VIEWER_INDEX)
    
    with open(index_file_path, 'w') as f:
        output = template.render(data=data)
        f.write(output)


@click.command('test')
@click.argument('model', type=str)
def test(model):
    """Set up nft collection deploy directories"""
    path = _get_session('icp')
    assets_dir = os.path.join(path, 'Assets')
    src_dir = os.path.join(assets_dir, 'src')
    model_path = os.path.join(src_dir, model)
    model_name = model.replace('.glb', '')
    js_file_name = 'main.js'

    if not os.path.exists(model_path):
        click.echo(f"No model exists at path {model_path}.")
    
    js_dir = os.path.join(src_dir, 'assets')
    
    if not os.path.exists(js_dir):
        os.makedirs(js_dir)
        
    file_loader = FileSystemLoader('templates')
    env = Environment(loader=file_loader)
    template = env.get_template(TEMPLATE_MODEL_VIEWER_JS)
    
    data = model_debug_data(model, model_name, js_file_name)
    output = template.render(data=data)
    js_file_path = os.path.join(src_dir, 'assets',  js_file_name)
    index_file_path = os.path.join(src_dir, 'index.html')

    with open(js_file_path, 'w') as f:
        output = template.render(data=data)
        f.write(output)
        
    template = env.get_template(TEMPLATE_MODEL_VIEWER_INDEX)
    
    with open(index_file_path, 'w') as f:
        output = template.render(data=data)
        f.write(output)



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
    
cli.add_command(basic_material_data)
cli.add_command(lambert_material_data)
cli.add_command(phong_material_data)
cli.add_command(standard_material_data)
cli.add_command(pbr_material_data)
cli.add_command(icp_install)
cli.add_command(icp_new_cryptonym)
cli.add_command(icp_use_cryptonym)
cli.add_command(icp_account)
cli.add_command(icp_principal)
cli.add_command(icp_balance)
cli.add_command(icp_start_assets)
cli.add_command(icp_stop_assets)
cli.add_command(icp_deploy_assets)
cli.add_command(icp_backup_keys)
cli.add_command(icp_project)
cli.add_command(icp_project_path)
cli.add_command(icp_init_deploy)
cli.add_command(icp_debug_model)
cli.add_command(test)
cli.add_command(print_hvym_data)

if __name__ == '__main__':
    cli()
