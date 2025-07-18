from PyQt5.QtWidgets import QApplication, QMainWindow, QSplashScreen, QLabel, QGridLayout, QWidget, QCheckBox, QFormLayout, QSystemTrayIcon, QComboBox, QTextEdit, QLineEdit, QDialogButtonBox, QSpacerItem, QSizePolicy, QMenu, QAction, QStyle, qApp, QVBoxLayout, QPushButton, QDialog, QDesktopWidget, QFileDialog, QMessageBox
from PyQt5.QtCore import Qt, QSize, QTimer
from PyQt5.QtGui import QIcon, QPixmap
from qtwidgets import PasswordEdit
from qthvym import *
import os
import sys
import click
import subprocess
import shutil
import json
import subprocess
import threading
from subprocess import run, Popen, PIPE, STDOUT
from platformdirs import *
from pygltflib import GLTF2
from dataclasses import dataclass, asdict, field
from dataclasses_json import dataclass_json
from jinja2 import Environment, FileSystemLoader
from gifanimus import GifAnimation
from pathlib import Path
import numbers
import hashlib
import re
import time
import ast
import pexpect
from pexpect import *
from io import BytesIO
from io import StringIO
from urllib.request import urlopen
from zipfile import ZipFile
from tinydb import TinyDB, Query
import tinydb_encrypted_jsonstorage as tae
import xml.etree.ElementTree as ET
from base64 import b64encode
import pyperclip
import copy
import json
from hvym_stellar import *
from stellar_sdk import Keypair, Network, Server, SorobanServer, soroban_rpc, scval
import platform
import requests

BRAND = "HEAVYMETA®"
VERSION = "0.01"
ABOUT = f"""
Command Line Interface for {BRAND} Standard NFT Data
Version: {VERSION}
ALL RIGHTS RESERVED 2024
"""
VERSION = "0.01"

FILE_PATH = Path(__file__).parent
HOME = os.path.expanduser('~')
CLI_PATH = os.path.join(HOME, '.local', 'share', 'heavymeta-cli')
DFX = os.path.join(HOME, '.local', 'share', 'dfx', 'bin', 'dfx')
DIDC = os.path.join(HOME, '.local', 'share', 'didc', 'didc')
PINGGY_DIR = os.path.join(HOME, '.local', 'share', 'pinggy')
PINGGY = os.path.join(PINGGY_DIR, 'pinggy')

TEMPLATE_MODEL_VIEWER_INDEX = 'model_viewer_html_template.txt'
TEMPLATE_MODEL_VIEWER_JS = 'model_viewer_js_template.txt'
TEMPLATE_MODEL_MINTER_INDEX = 'model_minter_frontend_index_template.txt'
TEMPLATE_MODEL_MINTER_JS = 'model_minter_frontend_js_template.txt'
TEMPLATE_CUSTOM_CLIENT_INDEX = 'custom_client_frontend_index_template.txt'
TEMPLATE_CUSTOM_CLIENT_JS = 'custom_client_frontend_js_template.txt'
TEMPLATE_MODEL_MINTER_MAIN = 'model_minter_backend_main_template.txt'
TEMPLATE_MODEL_MINTER_TYPES = 'model_minter_backend_types_template.txt'

PINGGY_ENDPOINT = 'https://s3.ap-south-1.amazonaws.com/public.pinggy.binaries/cli/v0.2.2/linux'
PINGGY_X86 = os.path.join(PINGGY_ENDPOINT, 'amd64', 'pinggy')
PINGGY_ARM64 = os.path.join(PINGGY_ENDPOINT, 'armd64', 'pinggy')

MODEL_DEBUG_ZIP = 'https://github.com/inviti8/hvym_model_debug_template/archive/refs/heads/main.zip'
MODEL_MINTER_ZIP = 'https://github.com/inviti8/hvym_minter_template/archive/refs/heads/master.zip'
CUSTOM_CLIENT_ZIP = 'https://github.com/inviti8/hvym_custom_client_template/archive/refs/heads/master.zip'
ASSETS_CLIENT_ZIP = 'https://github.com/inviti8/hvym_assets_template/archive/refs/heads/master.zip'
MODEL_DEBUG_TEMPLATE = 'hvym_model_debug_template-main'
MINTER_TEMPLATE = 'hvym_minter_template-master'
CUSTOM_CLIENT_TEMPLATE = 'hvym_custom_client_template-main'
ASSETS_CLIENT_TEMPLATE = 'hvym_assets_template-master'
LOADING_IMG = os.path.join(FILE_PATH, 'images', 'loading.gif')
BUILDING_IMG = os.path.join(FILE_PATH, 'images', 'building.gif')
BG_IMG = os.path.join(FILE_PATH, 'images', 'hvym.png')
LOGO_IMG = os.path.join(FILE_PATH, 'images', 'logo.png')
LOGO_WARN_IMG = os.path.join(FILE_PATH, 'images', 'logo_warn.png')
LOGO_CHOICE_IMG = os.path.join(FILE_PATH, 'images', 'logo_choice.png')
ICP_LOGO_IMG = os.path.join(FILE_PATH, 'images', 'icp_logo.png')
STELLAR_LOGO_IMG = os.path.join(FILE_PATH, 'images', 'stellar_logo.png')
NPM_LINKS = os.path.join(FILE_PATH, 'npm_links')
DATA_PATH = os.path.join(FILE_PATH, 'data')
SCRIPT_PATH = os.path.join(FILE_PATH, 'scripts')
INSTALL_DIDC_SH = os.path.join(SCRIPT_PATH, 'install_didc.sh')
FG_TXT_COLOR = '#98314a'

# STORAGE = TinyDB(os.path.join(FILE_PATH, 'data', 'db.json'))#TEST
dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
STORAGE_PATH = os.path.join(dirs.user_data_dir, 'db.json')
# STORAGE_PATH = os.path.join(FILE_PATH, 'data', 'db.json')#TEST
ENC_STORAGE_PATH = os.path.join(dirs.user_data_dir, 'enc_db.json')
# ENC_STORAGE_PATH = os.path.join(FILE_PATH, 'data', 'enc_db.json')#TEST
if not os.path.isfile(STORAGE_PATH):
      src = os.path.join(DATA_PATH, 'db.json')
      dst = os.path.join(dirs.user_data_dir, 'db.json')
      shutil.copyfile(src, dst)

if not os.path.isfile(ENC_STORAGE_PATH):
      src = os.path.join(DATA_PATH, 'enc_db.json')
      dst = os.path.join(dirs.user_data_dir, 'enc_db.json')
      shutil.copyfile(src, dst)

STORAGE = TinyDB(STORAGE_PATH)
ENC_STORAGE = None
APP_DATA = STORAGE.table('app_data')
IC_IDS = STORAGE.table('ic_identities')
IC_PROJECTS = STORAGE.table('ic_projects')

STELLAR_IDS = STORAGE.table('stellar_identities')
STELLAR_ACCOUNTS = STORAGE.table('stellar_accounts')

DAPP = None
PINTHEON_VERSION = 'v0.00'

NETWORKS = ['testnet', 'mainnet']
DEFAULT_NETWORK = 'testnet'

def _init_app_data():
      find = Query()
      table = {'data_type': 'APP_DATA', 'pinggy_token': '', 'pintheon_dapp': _get_arch_specific_dapp_name(), 'pintheon_sif_path': '', 'pintheon_port': 9999, 'pintheon_networks':NETWORKS}
      if len(APP_DATA.search(find.data_type == 'APP_DATA'))==0:
            APP_DATA.insert(table)

def _get_arch_specific_dapp_name():
    import platform
    arch = platform.machine().lower()
    plat = None
    data = APP_DATA.get(Query().data_type == 'APP_DATA')
    networks = None
    if data != None:
      networks = data.get('pintheon_networks', DEFAULT_NETWORK)
    else:
      networks = NETWORKS

    # Normalize architecture for cross-platform compatibility
    if arch in ['x86_64', 'amd64', 'intel64', 'i386', 'i686']:
        plat = 'linux-amd64'
    elif arch in ['aarch64', 'arm64', 'armv8', 'armv7l', 'arm']:
        plat = 'linux-arm64'
    else:
        plat = arch

    return f'pintheon-{networks[0]}-{plat}'

def _open_encrypted_storage(pw):
      db = TinyDB(encryption_key=pw, path=ENC_STORAGE_PATH, storage=tae.EncryptedJSONStorage)
      accounts = db.table('stellar_accounts')
      return { 'db':db, 'accounts': accounts}


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
class collection_data_class(base_data_class):
      '''
      Base data class for hvym collection properties
      :param collectionName: Name of collection
      :type collectionName:  (str)
      :param collectionType: Type of collection based on constants: ('multi', 'single')
      :type collectionType:  (str)
      :param valProps: Value properties dictionary
      :type valProps:  (dict)
      :param textValProps: Text properties dictionary
      :type textValProps:  (dict)
      :param callProps: Method call properties dictionary
      :type callProps:  (dict)
      :param meshProps: Mesh Properties dictionary
      :type meshProps:  (dict)
      :param meshSets: Mesh sets dictionary
      :type meshSets:  (dict)
      :param morphSets: Morph sets dictionary
      :type morphSets:  (dict)
      :param animProps: Mesh sets dictionary
      :type animProps:  (dict)
      :param matProps: Material properties dictionary
      :type matProps:  (dict)
      :param materialSets: Mesh sets dictionary
      :type materialSets:  (dict)
      :param menuData: Menu data dictionary
      :type menuData:  (dict)
      :param propLabelData: Property labels dictionary
      :type propLabelData:  (dict)
      :param nodes: List of all nodes in the collection
      :type nodes:  (dict)
      :param actionProps: List of all nodes in the collection
      :type actionProps:  (dict)
      '''
      collectionName: str
      collectionType: str
      valProps: dict
      textValProps: dict
      callProps: dict
      meshProps: dict
      meshSets: dict
      morphSets: dict
      animProps: dict
      matProps: dict
      materialSets: dict
      menuData: dict
      propLabelData: dict
      nodes: dict
      actionProps: dict


@dataclass_json
@dataclass
class contract_data_class(base_data_class):
      '''
      Base data class for contract data
      :param mintable: Whether or not this nft is mintable
      :type mintable:  (bool)
      :param nftType: Type of nft based on constants: ('HVYC', 'HVYI', 'HVYA', 'HVYW', 'HVYO', 'HVYG', 'HVYAU')
      :type nftType:  (str)
      :param nftChain: Block chain based on constants: ('ICP', 'EVM')
      :type nftChain:  (str)
      :param nftPrice: Price of NFT
      :type nftPrice  (int)
      :param nftPrice: Price of NFT
      :type nftPrice  (int)
      :param premNftPrice: Premium price of NFT
      :type premNftPrice  (int)
      :param maxSupply: Maximum supply of NFT
      :type maxSupply  (int)
      :param minterType: Type of minter based on constants: ('payable', 'onlyOwner')
      :type minterType  (str)
      :param minterName: Name of minter
      :type minterName  (str)
      :param minterDesc: Description of minter
      :type minterDesc  (str)
      :param minterImage: Path to image file for NFT
      :type minterImage  (str)
      :param minterVersion: Type of minter based on constants: ('payable', 'onlyOwner')
      :type minterVersion  (float)
      :param enableContextMenus: Enable context menus to show or hide prorpium data."
      :type enableContextMenus:  (bool)
      :param menuIndicatorsShown: Determines whether or not proprium menu indicators are shown by default."
      :type menuIndicatorsShown:  (bool)
      '''
      mintable: bool
      nftType: str
      nftChain: str
      nftPrice: float
      premNftPrice: float
      maxSupply: int
      minterType: str
      minterName: str
      minterDesc: str
      minterImage: str
      minterVersion: float
      enableContextMenus: bool
      menuIndicatorsShown: bool


@dataclass_json
@dataclass
class menu_data_class(base_data_class):
      '''
      Base data class for hvym menu properties
      :param name: Widget type to use
      :type name:  (str)
      :param primary_color: Primary color of menu
      :type primary_color:  (str)
      :param secondary_color: Secondary color of menu
      :type secondary_color:  (str)
      :param text_color: text color of menu
      :type text_color:  (str)
      :param alignment: Alignment of menu relative to transform based on string constants: ('CENTER', 'LEFT', 'RIGHT')
      :type alignment:  (str)
      '''
      name: str
      primary_color: str
      secondary_color: str
      text_color: str
      alignment: str


@dataclass_json
@dataclass
class action_data_class(base_data_class):
      '''
      Base data class for hvym action properties
      :param anim_type: Widget type to use
      :type anim_type:  (str)
      :param set: Mesh ref list
      :type set:  (list)
      :param interaction: Interaction type to use
      :type interaction:  (str)
      :param sequence: How animation is sequenced
      :type sequence:  (str)
      :param additive: Set the type of animation blending
      :type additive:  (bool)
      '''
      anim_type: str
      set: list
      interaction: str
      sequence: str
      additive: bool

@dataclass_json
@dataclass
class action_mesh_data_class(action_data_class):
      '''
      Base data class for hvym action properties
      :param model_ref: Model reference properties
      :type model_ref:  (object)
      '''
      model_ref: dict


@dataclass_json
@dataclass
class property_label_data_class(base_data_class):
      '''
      Base data class for widget data
      :param value_prop_label: Value Property Label
      :type value_prop_label:  (str)
      :param text_prop_label: Text Property Label
      :type text_prop_label:  (str)
      :param call_prop_label: Call Property Label
      :type call_prop_label:  (str)
      :param mesh_prop_label: Mesh Propertty Label
      :type mesh_prop_label:  (str)
      :param mat_prop_label: Material Property Label
      :type mat_prop_label:  (str)
      :param anim_prop_label: Animation Property Label
      :type anim_prop_label:  (str)
      :param mesh_set_label: Mesh Set Label
      :type mesh_set_label:  (str)
      :param morph_set_label: Morph Set Label
      :type morph_set_label:  (str)
      :param mat_set_label: MaterialSet Label
      :type mat_set_label:  (str)
      '''
      value_prop_label: str
      text_prop_label: str
      call_prop_label: str
      mesh_prop_label: str
      mat_prop_label: str
      anim_prop_label: str
      mesh_set_label: str
      morph_set_label: str
      mat_set_label: str


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
class single_int_data_class(base_data_class):
      '''
      Creates data object for singular int data value property
      :param name: Element name
      :type name:  (str)
      :param default: Default integer value
      :type default:  (int)
      :param min: Minimum integer value
      :type min:  (int)
      :param max: Maximum integer value
      :type max:  (int)
      '''
      name: str
      default: int
      min: int
      max: int

@dataclass_json
@dataclass
class behavior_data_class(base_data_class):
      '''
      Creates data object for a text item
      :param name: Method name
      :type name:  (str)
      :param trait_type: Trait Type
      :type trait_type:  (str)
      :param values: Values
      :type values:  (str)
      :param use_method: if true, use defined method
      :type use_method:  (bool)
      :param method: Values
      :type method:  (str)
      :param behavior_type: Behavior Type
      :type behavior_type:  (str)
      :param use_behavior: Use Behavior if true
      :type use_behavior:  (bool)

      '''
      name: str
      trait_type: str
      values: str
      use_method: bool
      method: str
      behavior_type: str
      use_behavior: bool

@dataclass_json
@dataclass
class text_data_class(base_data_class):
      '''
      Creates data object for a text item
      :param name: Method name
      :type name:  (str)
      :param show: if false, hide widget
      :type show:  (bool)
      :param immutable: If immutable, property cannot be edited after minting.
      :type immutable:  (bool)
      :param text: Text Value
      :type text:  (str)
      :param widget_type: Text Value
      :type widget_type:  (str)
      :param behaviors: List of behaviors for this val prop.
      :type behaviors:  (list)
      '''
      name: str
      show: bool
      immutable: bool
      text: str
      widget_type: str
      behaviors: list

@dataclass_json
@dataclass
class call_data_class(base_data_class):
      '''
      Creates data object for a method call reference
      :param name: Method name
      :type name:  (str)
      :param call_param: Mesh visiblility
      :type call_param:  (str)
      '''
      name: str
      call_param: str


@dataclass_json
@dataclass
class int_data_class(slider_data_class):
      '''
      Creates data object for int data value property
      :param default: Default integer value
      :type default:  (int)
      :param min: Minimum integer value
      :type min:  (int)
      :param max: Maximum integer value
      :type max:  (int)
      :param immutable: If immutable, property cannot be edited after minting.
      :type immutable:  (bool)
      '''
      default: int
      min: int
      max: int
      immutable: bool


@dataclass_json
@dataclass
class int_data_behavior_class(int_data_class):
      '''
      Creates data object for int data value property with behaviors
      :param behaviors: List of behaviors for this val prop.
      :type behaviors:  (list)
      '''
      behaviors: list


@dataclass_json
@dataclass
class cremental_int_data_class(int_data_class):
      '''
      Creates data object for incremental and decremental data value property
      :param amount: The amount to increment or decrement
      :type amount:  (int)
      '''
      amount: int


@dataclass_json
@dataclass
class cremental_int_data_behavior_class(cremental_int_data_class):
      '''
      Creates data object for incremental and decremental data value property with behaviors
      :param behaviors: List of behaviors for this val prop.
      :type behaviors:  (list)
      '''
      behaviors: list


@dataclass_json
@dataclass
class single_float_data_class(base_data_class):
      '''
      Creates data object for singular float data value property
      :param name: Element name
      :type name:  (str)
      :param default: Default integer value
      :type default:  (float)
      :param min: Minimum integer value
      :type min:  (float)
      :param max: Maximum integer value
      :type max:  (float)
      '''
      name: str
      default: float
      min: float
      max: float
      

@dataclass_json
@dataclass
class float_data_class(slider_data_class):
      '''
      Creates data object for float data value property
      :param default: Default integer value
      :type default:  (float)
      :param min: Minimum integer value
      :type min:  (float)
      :param max: Maximum integer value
      :type max:  (float)
      :param immutable: If immutable, property cannot be edited after minting.
      :type immutable:  (bool)
      '''
      default: float
      min: float
      max: float
      immutable: bool
      

@dataclass_json
@dataclass
class cremental_float_data_class(float_data_class):
      '''
      Creates data object for incremental and decremental data value property
      :param amount: The amount to increment or decrement
      :type amount:  (float)
      '''
      amount: float


@dataclass_json
@dataclass
class cremental_float_data_behavior_class(cremental_float_data_class):
      '''
      Creates data object for incremental and decremental data value property with behaviors
      :param behaviors: List of behaviors for this val prop.
      :type behaviors:  (list)
      '''
      behaviors: list


@dataclass_json
@dataclass
class single_mesh_data_class(base_data_class):
      '''
      Creates data object for singular mesh reference
      :param name: Mesh name
      :type name:  (str)
      :param min: Mesh visiblility
      :type min:  (str)
      '''
      name: str
      visible: bool


@dataclass_json
@dataclass
class single_node_data_class(base_data_class):
      '''
      Creates data object for singular mesh reference
      :param name: Mesh name
      :type name:  (str)
      :param type: Mesh visiblility
      :type type:  (str)
      '''
      name: str
      type: str


@dataclass_json
@dataclass
class mesh_data_class(widget_data_class):
      '''
      Creates data object for a mesh reference
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
      Creates data object for a mesh set
      :param set: Mesh ref list
      :type set:  (list)
      :param min: Mesh visiblility
      :type min:  (str)
      '''
      set: list
      selected_index: int


@dataclass_json
@dataclass
class morph_set_data_class(widget_data_class):
      '''
      Creates data object for a morph set
      :param set: Mesh ref list
      :type set:  (list)
      :param selected_index: Selected index for the list
      :type selected_index:  (int)
      :param model_ref: Model reference properties
      :type model_ref:  (object)
      '''
      set: list
      selected_index: int
      model_ref: dict


@dataclass_json
@dataclass
class mat_set_data_class(widget_data_class):
      '''
      Creates data object for material set
      :param set: Material ref list
      :type set:  (list)
      :param mesh_set: Mesh ref list
      :type mesh_set:  (list)
      :param material_id: the material id that will materials will be assigned to
      :type material_id:  (int)
      :param selected_index: Selected index for the list
      :type selected_index:  (int)
      '''
      set: list
      mesh_set: list
      material_id: int
      selected_index: int


@dataclass_json
@dataclass
class anim_prop_data_class(widget_data_class):
      '''
      Creates data object for basic material reference
      :param name: Element name
      :type name:  (str)
      :param loop: Animation looping property based on string constants: ('NONE', 'LoopRepeat', 'LoopOnce', 'ClampToggle', 'Clamp', 'PingPong')
      :type loop:  (str)
      :param start: Start frame of animation
      :type start:  (int)
      :param end: End frame of animation
      :type end:  (int)
      :param blending: Animation blending based on string constant
      :type blending:  (str)
      :param weight: Amount animation affects element
      :type weight:  (float)
      :param play: If true, animation should play
      :type play:  (bool)
      :param model_ref: Model reference properties
      :type model_ref:  (object)
      '''
      name: str
      loop: str
      start: int
      end: int
      blending: str
      weight: float
      play: bool
      model_ref: dict


@dataclass_json
@dataclass
class mat_prop_data_class(widget_data_class):
      '''
      Creates data object for basic material reference
      :param name: Element name
      :type name:  (str)
      :param type: Material type property based on string constants: ('STANDARD', 'PBR', 'TOON')
      :type type:  (str)
      :param emissive: If true, material is emissive
      :type emissive:  (bool)
      :param reflective: If true, material is reflective
      :type reflective:  (bool)
      :param irridescent: If true, material is irridescent
      :type irridescent:  (bool)
      :param sheen: If true, material has sheen
      :type sheen:  (bool)
      :param mat_ref: Object representation of the mesh material
      :type mat_ref:  (object)
      :param save_data: Empty dictionary into which material save data goes
      :type save_data:  (object)
      '''
      name: str
      type: str
      emissive: bool
      reflective: bool
      irridescent: bool
      sheen: bool
      mat_ref: dict
      save_data: dict
      
      
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
      :param iridescent: if true, material has irridescent property exposed
      :type iridescent:  (bool)
      :param sheen_color: Sheen color
      :type sheen_color:  (str)
      :param sheen_weight: float value for iridescence
      :type sheen_weight:  (float)
      :param emissive: String identifier for color hex
      :type emissive:  (str)
      :param emissive_intensity: Float for emissive intensity
      :type emissive_intensity:  (float)
      '''
      color: str
      roughness: float
      metalness: float
      iridescent: bool = None
      sheen_color: str = None
      sheen_weight: float = None
      emissive: str = None
      emissive_intensity: float = None

@dataclass_json
@dataclass
class interactable_data_class(base_data_class):
      '''
      Base data class for hvym interactables properties
      :param interactable: Bool for interaction type
      :type interactable:  (bool)
      :param has_return: Bool if true, the associated call retturns value
      :type has_return:  (bool)
      :param interaction_type: String for interaction type
      :type interaction_type:  (str)
      :param selector_dir: String for selector type
      :type selector_dir:  (str)
      :param name: String for interaction name
      :type name:  (str)
      :param call: String for interaction call
      :type call:  (str)
      :param default_text: Default text for interactable edit text
      :type default_text:  (str)
      :param text_scale: Amount to scale interactable text
      :type text_scale:  (float)
      :param text_wrap: If true text will wrap in confines of box
      :type text_wrap:  (bool)
      :param param_type: String for interaction type
      :type param_type:  (str)
      :param string_param: String parameter for call
      :type string_param:  (str)
      :param int_param: Int parameter for call
      :type int_param:  (int)
      :param behavior: Behavior of this interactable
      :type behavior:  (dict)
      '''
      interactable: bool
      has_return: bool
      interaction_type: str
      selector_dir: str
      name: str
      call: str
      default_text: str
      text_scale: float
      text_wrap: bool
      param_type: str
      slider_param_type: str
      toggle_param_type: str
      string_param: str
      int_param: int
      float_default: float
      float_min: float
      float_max: float
      int_default: int
      int_min: int
      int_max: int
      toggle_state: bool
      toggle_int: int
      mesh_set: list
      behavior: dict
      

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
      
def _new_session(chain, name):
      home = os.path.expanduser("~").replace('\\', '/') if os.name == 'nt' else os.path.expanduser("~")
      _link_hvym_npm_modules()

      app_dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
      path = os.path.join(app_dirs.user_data_dir, f'{chain}', name)

      if not os.path.exists(path):
        os.makedirs(path)

      session_file = os.path.join(app_dirs.user_data_dir, f'{chain}_session.txt')
      with open(session_file, 'w') as f:
        f.write(path)

      return path
        

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

def _download_unzip(url, out_path):
      with urlopen(url) as zipresp:
          with ZipFile(BytesIO(zipresp.read())) as zfile:
              zfile.extractall(out_path)

def _linux_arm_or_x86():
    if platform.machine().lower() in ['aarch64', 'armv8']:
        return "ARM64"
    elif platform.machine().lower() in ['x86_64', 'amd64']:
        return "x86-64"
    else:
        # Handle other cases (e.g., i386, PPC, etc.)
        pass

def _run_command(cmd):
      process = Popen(cmd, stdout=PIPE, stderr=PIPE, shell=True)
      output, error = process.communicate()

      if process.returncode != 0:  
        print("Command failed with error:", error.decode('utf-8'))
      else:
        print(output.decode('utf-8'))
    

def _subprocess_output(command, path, procImg=LOADING_IMG, pw=None):
      loading = GifAnimation(procImg, 1000, True, '', True)
      loading.Play()
      if not pw:
            try:
                  output = subprocess.check_output(command, cwd=path, shell=True, stderr=subprocess.STDOUT)
                  print(_extract_urls(output.decode('utf-8')))
                  return output.decode('utf-8')
            except Exception as e:
                  print(f"Command failed with error @:{path} with cmd: {command}", str(e))
      else:
            try:
                  child = spawn(command)
                  child.expect('(?i)passphrase')
                  child.sendline(pw)
                  output = child.read().decode("utf-8")
            except Exception as e:
                  print(f"Command failed with error @:{path} with cmd: {command}", str(e))
      loading.Stop()
        

def _subprocess(chain, folders, command, procImg=LOADING_IMG, pw=None):
      session = _get_session(chain)
      path = os.path.join(*folders)
      asset_path = os.path.join(session, path)

      return _subprocess_output(command, asset_path, procImg, pw)

def _call(cmd):
      output = subprocess.run(cmd, shell=True, capture_output=True, text=True)
      return output.stdout.encode('utf-8')

def _create_hex(value):
      sha256_hash = hashlib.sha256()
      sha256_hash.update(value)
      return sha256_hash.hexdigest()      

def _set_hvym_network():
      """Set the ICP  Heavymeta network."""
      _ic_set_network('hvym', 1357)
    

def _extract_urls(output):
      urls = re.findall('http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[\\\\/])*', output)
      return urls

def _exposed_mat_fields(mat_type, reflective=False, iridescent=False, sheen=False, emissive=False):
      props = []
      if mat_type ==  'BASIC':
            props.append('color')
            
      elif mat_type ==  'PHONG':
            props.append('color')
            props.append('specular')
            props.append('shininess')
            
      elif mat_type ==  'STANDARD':
            props.append('color')
            props.append('roughness')
            props.append('metalness')
            
      elif mat_type ==  'PBR':
            props.append('color')
            props.append('roughness')
            props.append('metalness')
            if reflective:
                  props.append('ior')
                  props.append('reflectivity')

            if iridescent:
                  props.append('iridescence')
                  props.append('iridescenceIOR')

            if sheen:
                  props.append('sheen')
                  props.append('sheenRoughness')
                  props.append('sheenColor')

            props.append('clearcoat')
            props.append('clearcoatRoughness')
            props.append('specularColor')
            
      elif mat_type ==  'PBR':
            props.append('color')


      if emissive:
            props.append('emissive')
            props.append('emissiveIntensity')

      return props


def _mat_save_data(mat_ref, mat_type, reflective=False, iridescent=False, sheen=False, emissive=False):
      fields = _exposed_mat_fields(mat_type, reflective, iridescent, sheen, emissive)
      props = {}

      for field in fields:
            if field in mat_ref:
                  props[field] = mat_ref[field]
            else:
                  props[field] = ""

      return props

def _text_behavior(name, use_method, method, behavior_type, use):
    return behavior_data_class(name, 'text', 'NONE' ,use_method, method, behavior_type, use).dictionary

def _update_section_TABLE(section, table, key):
     find = Query()
     data = section.search(find.id == table['id'])
     if len(data)==0:
          section.insert(table)
     else:
          t = data[0]
          if t[key] != table[key] and table[key] != '' and table[key] != 'NOT SET':
            t[key] = table[key]
            section.update(t, find.id == table['id'])

def _find_section_key_val_TABLE(section, key, val):
     find = Query()
     data = section.search(find[f'{key}'] == val)
     return data

def _ic_start_daemon(folder):
      command = f'{DFX} start --clean --background'
      session = _get_session('icp')
      asset_path = os.path.join(session, folder)
      try:
            output = subprocess.Popen(command, cwd=asset_path, shell=True, stderr=subprocess.STDOUT)
            print(_extract_urls(output.decode('utf-8')))
            return output.decode('utf-8')
      except Exception as e:
            print("Command failed with error:", str(e))


def _ic_stop_daemon(folder):
      command = f'{DFX} stop'
      session = _get_session('icp')
      asset_path = os.path.join(session, folder)
      try:
            output = subprocess.Popen(command, cwd=asset_path, shell=True, stderr=subprocess.STDOUT)
            return output.decode('utf-8')
      except Exception as e:
            print("Command failed with error:", str(e))


def _ic_set_network(name, port):
      """Set the ICP network."""
      config_dir = user_config_dir()  # Gets the path to the config directory.
      networks_config = os.path.join(config_dir, 'dfx', 'networks.json')

      if not os.path.exists(networks_config):  # If networks.json does not exist
        with open(networks_config, 'w') as file:
            json.dump({"local": {"replica": {"bind": f"localhost:{port}","subnet_type": "application"}}}, file)


def _ic_get_ids():
      """Get the ICP identities installed on this computer."""
      command = f'{DFX} identity list'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      return output.stdout


def _ic_get_active_id():
      """Get the active ICP Identity on this computer."""
      command = f'{DFX} identity whoami'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      return output.stdout


def _ic_get_principal_by_id(id, pw=None):
      principal = _ic_get_stored_principal(id)
      if not principal:
            if not _ic_account_is_encrypted(id.strip()):
                  principal = _ic_get_principal(pw).strip()
            else:
                 principal = 'NOT SET'
      return principal


def _ic_get_stored_principal(id):
      result = None
      data = data = _find_IC_IDS_TABLE(id)
      
      if len(data) > 0 and 'principal' in data[0] and  data[0]['principal'] is not None and len(data[0]['principal']) >0:
           result = data[0]['principal'].strip()

      return result
     

def _ic_get_principal(pw=None):
      command = f'{DFX} identity get-principal'
      output = None
      if not pw:
           output = _ic_get_test_principal()
      else:
           child = spawn(command)
           child.expect('(?i)passphrase')
           child.sendline(pw)
           output = child.read().decode("utf-8")
           output = output.split('\r\n')
           output = output[len(output)-2]

      return output


def _ic_get_test_principal():
      command = f'{DFX} identity get-principal'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      return output.stdout


def _ic_account_is_encrypted(id):
     result = None
     find = Query()
     
     found = IC_IDS.get((find.data_type == 'IC_ID_DATA') and (find.id == id))
     if found and len(found) > 0:
          result = found['encrypted']
     return result


def _ic_id_info():
      find = Query()
      return IC_IDS.get(find.data_type == 'IC_ID_ACTIVE')


def _ic_set_id(cryptonym):
      command = f'{DFX} identity use {cryptonym}'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      _ic_update_data()
      return output.stdout


def _ic_new_test_id(cryptonym):
      return subprocess.check_output(f'{DFX} identity new {cryptonym} --storage-mode plaintext', shell=True, stderr=subprocess.STDOUT).decode("utf-8")


def _ic_new_encrypted_id(cryptonym, pw):
      child = spawn(f"{DFX} identity new {cryptonym} --storage-mode password-protected")
      child.expect('(?i)passphrase')
      child.sendline(pw)
      return child.read().decode("utf-8")

def _ic_remove_id(cryptonym):
      command = f'{DFX} identity remove {cryptonym}'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      _ic_update_data()
      return output.stdout

def _update_IC_IDS_TABLE(table, key):
     _update_section_TABLE(IC_IDS, table, key)


def _find_IC_IDS_TABLE(id):
     return _find_section_key_val_TABLE(IC_IDS, 'id', id)


def _ic_update_data(pw=None, init=False):
      """Update local db with currently installed icp ids."""
      encrypted = True

      if not pw:
           encrypted = False

      ids = _ic_get_ids()
      active = _ic_get_active_id().strip()

      if init and active.strip() != 'default' and active.strip() != 'anonymous':
           return
      
      principal = _ic_get_principal_by_id(active, pw)

      ids=ids.split('\n')
      tables=[]
      id_arr=[]
      active_table = None
      
      for _id in ids:
            enc = encrypted
            prn = principal
            if _id.strip() == 'default' or _id.strip() == 'anonymous':
                 enc = False
                 if _id.strip() == 'anonymous':
                      prn = '2vxsx-fae'

            if _id.strip() == active.strip():
                  active_table = {'data_type': 'IC_ID_DATA', 'id':_id.strip(), 'encrypted': enc, 'principal': prn, 'active': True}
                  tables.append(active_table)
                  id_arr.append(_id.strip())
            elif _id != '':
                  tables.append({'data_type': 'IC_ID_DATA', 'id':_id.strip(), 'encrypted': None, 'principal': prn, 'active': False})
                  id_arr.append(_id.strip())

      find = Query()

      #Remove any ids from local storage that are no longer in dfx
      stored_ids = IC_IDS.search(find.data_type == 'IC_ID_DATA')
      if len(stored_ids)>len(id_arr):
            for table in stored_ids:
                  if not table['id'] in id_arr:
                        old_data = IC_IDS.get(find.id == table['id'])
                        IC_IDS.remove(doc_ids=[old_data.doc_id])

      #Update active state for stored ids
      for table in tables:
            _update_IC_IDS_TABLE(table, 'active')
            if table['id'] == active:
                  _update_IC_IDS_TABLE(table, 'encrypted')
                  _update_IC_IDS_TABLE(table, 'principal')

      #reorder list so active id is at the top
      for _id in id_arr:
            id_data = IC_IDS.search(find.id == _id)[0]
            if id_data['active']:
                  id_arr.insert(0, id_arr.pop(id_arr.index(_id)))

      table = {'data_type': 'IC_ID_ACTIVE', 'active_id': id_arr[0], 'principal':principal, 'encrypted': encrypted, 'list':id_arr}
      if len(IC_IDS.search(find.data_type == 'IC_ID_ACTIVE'))==0:
            IC_IDS.insert(table)
      else:
            IC_IDS.update(table, find.data_type == 'IC_ID_ACTIVE')


def _ic_create_model_repo(path):
      folder = 'dapp'
      project_name = 'model_view'
      #Create the Debug directories
      os.makedirs(os.path.join(path, folder, 'src'))
      #Create the Assets directories
      os.makedirs(os.path.join(path,  'Assets', 'src'))
        
      dfx_json = {
        "canisters": {
            f"{project_name}_nft_container": {
            "main": "src/Main.mo"
            }
        }
      }
        
      with open(os.path.join(path, folder, 'dfx.json'), 'w') as f:
        json.dump(dfx_json, f)
            
      # Create empty Main.mo and Types.mo files
        with open(os.path.join(path, folder, 'src', 'Main.mo'), 'w') as f:
              pass
        
      with open(os.path.join(path, folder,  'src',  'Types.mo'), 'w') as f:
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


def js_r(filename: str):
    with open(filename) as f_in:
        return json.load(f_in)


def _ic_assign_canister_id(project_type, canister_id):
      session = _get_session('icp')
      path = None
      canister_ids_json = {}

      if project_type == 'model':
            path = os.path.join(session, MODEL_DEBUG_TEMPLATE)
      elif project_type == 'minter':
            path = os.path.join(session, MINTER_TEMPLATE)
      elif project_type == 'custom':
            path = os.path.join(session, CUSTOM_CLIENT_TEMPLATE)
      elif project_type == 'assets':
            path = os.path.join(session, ASSETS_CLIENT_TEMPLATE)

      dfx_file = os.path.join(path, 'dfx.json')
      json_file = os.path.join(path, 'canister_ids.json')

      if os.path.isfile(dfx_file):
            dfx = js_r(dfx_file)

            for key in dfx['canisters'].keys():
                  canister_ids_json[key] = canister_id

            if os.path.isfile(json_file):
                  os.remove(json_file)

            with open(json_file, 'w') as f:
                  json.dump(canister_ids_json, f, indent=4)

def _ic_create_model_debug_repo(path):
      _download_unzip(MODEL_DEBUG_ZIP, path)

def _ic_install_model_debug_repo(path):
      _ic_create_model_debug_repo(_get_session('icp'))
      _npm_install(path)
      _npm_link_module('hvym-proprium', path)

def _ic_create_model_minter_repo(path):
      _download_unzip(MODEL_MINTER_ZIP, path)

def _ic_install_model_minter_repo(path):
      _ic_create_model_minter_repo(_get_session('icp'))
      _npm_install(path)
      _npm_link_module('hvym-proprium', path)

def _ic_create_custom_client_repo(path):
      _download_unzip(CUSTOM_CLIENT_ZIP, path)

def _ic_install_custom_client_repo(path):
      _ic_create_custom_client_repo(_get_session('icp'))
      _npm_install(path)
      _npm_link_module('hvym-proprium', path)

def _ic_create_assets_client_repo(path):
      _download_unzip(ASSETS_CLIENT_ZIP, path)

def _ic_install_assets_client_repo(path):
      _ic_create_assets_client_repo(_get_session('icp'))
      _npm_install(path)
      _npm_link_module('hvym-proprium', path)

def _ic_model_debug_path():
      return os.path.join(_get_session('icp'), MODEL_DEBUG_TEMPLATE)
      
def _ic_minter_path():
      return os.path.join(_get_session('icp'), MINTER_TEMPLATE)

def _ic_custom_client_path():
      return os.path.join(_get_session('icp'), CUSTOM_CLIENT_TEMPLATE)

def _ic_assets_client_path():
      return os.path.join(_get_session('icp'), ASSETS_CLIENT_TEMPLATE)

def _ic_minter_model_path():
      return os.path.join(_ic_minter_path(), 'src', 'proprium_minter_frontend', 'assets')

def _npm_install(path, loading=None):
      try:
            _subprocess_output('npm install', path) 
                
      except Exception as e:  
            print("Command failed with error:", str(e))

      if loading != None:
            loading.Stop()

def _npm_new_link(path):
      try:
            output = subprocess.check_output('npm link', cwd=path, shell=True, stderr=subprocess.STDOUT)
            print(output.decode('utf-8'))

      except Exception as e:  
            print("Command failed with error:", str(e))

def _npm_link_module(module, path):
      try:
            output = subprocess.check_output(f'npm link {module}', cwd=path, shell=True, stderr=subprocess.STDOUT)
            print(output.decode('utf-8'))

      except Exception as e:  
            print("Command failed with error:", str(e))

def _npm_unlink(module):
      try:
            command = f'npm unlink {module} --global'
            output = subprocess.run(command, shell=True, capture_output=True, text=True)

      except Exception as e:  
            print("Command failed with error:", str(e))

def _npm_list_links():
      command = 'npm ls --link --global'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      return re.split(r'\s+|\n', output.stdout)

def _module_is_linked(module):
      result = False
      for txt in _npm_list_links():
            if module in txt:
                  result = True
                  break
      return result

def _update_hvym_npm_modules():
      home = Path.home()
      npm_links = home / '.local' / 'share' / 'heavymeta-cli' / 'npm_links'

      for dirpath in next(os.walk(str(npm_links)))[1]:
                  module_path = os.path.join(npm_links, dirpath)
                  pkg_json = os.path.join(module_path, 'package.json')
                  module = None
                  if os.path.isfile(pkg_json):
                        with open(pkg_json, 'r+', encoding='utf-8') as file:
                              data = json.load(file)
                              module = data['name']
                  if not _module_is_linked(module):
                        if os.path.isdir(module_path):
                              _npm_unlink(module)

      for item in npm_links.iterdir():
        if item.name != '.git' and item.name != 'README.md' and item.name != 'install.sh':
            if item.is_file():
                item.unlink()
            else:
                shutil.rmtree(item)

      shutil.rmtree(npm_links)
      _link_hvym_npm_modules()
      

def _link_hvym_npm_modules():
      
      dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
      npm_links = os.path.join(dirs.user_data_dir, "npm_links")

      if not os.path.exists(npm_links):
            try:
                  shutil.copytree(NPM_LINKS, npm_links)
                      
            except Exception as e:  
                  print("Copy custom backend failed with:", str(e))
                  return

            for dirpath in next(os.walk(npm_links))[1]:
                  module_path = os.path.join(npm_links, dirpath)
                  pkg_json = os.path.join(module_path, 'package.json')
                  module = None
                  if os.path.isfile(pkg_json):
                        with open(pkg_json, 'r+', encoding='utf-8') as file:
                              data = json.load(file)
                              module = data['name']
                  if not _module_is_linked(module):
                        if os.path.isdir(module_path):
                              _npm_install(module_path)
                              _npm_new_link(module_path)

def _update_proprium_js_file():
      dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
      npm_links = os.path.join(dirs.user_data_dir, "npm_links")
      src = os.path.join(NPM_LINKS, 'proprium', 'index.js')
      dst = os.path.join(npm_links,'proprium', 'index.js')
      shutil.copyfile(src, dst)

def _add_db_file():
      dirs = PlatformDirs('heavymeta-cli', 'HeavyMeta')
      src = os.path.join(DATA_PATH, 'db.json')
      dst = os.path.join(dirs.user_data_dir, 'db.json')
      shutil.copyfile(src, dst)

def _parse_hvym_data(hvym_data, model):
      all_val_props = {}
      all_call_props = {}
      contract_props = None
      data = {}
      active = _ic_get_active_id().strip()
      principal = _ic_get_stored_principal(active)
      creator_hash = _create_hex(principal.encode('utf-8')).upper()

      for key, value in hvym_data.items():
          if key != 'contract':
                for propType, props in value.items():
                      if propType == 'valProps':
                            for name, prop in props.items():
                              if prop['prop_action_type'] != 'Static' and not prop['immutable']:
                                    all_val_props[name] = prop
                      if propType == 'callProps':
                            for name, prop in props.items():
                                  all_call_props[name] = prop
          else:
                contract_props = value

      data['valProps'] = all_val_props
      data['callProps'] = all_call_props
      data['contract'] = contract_props
      data['creatorHash'] = creator_hash
      data['model'] = model
      data['project'] = hvym_data['project']

      return data

def _load_hvym_data(model_path):
      gltf = None
      result = None
      if os.path.isfile(model_path):
            gltf = GLTF2().load(model_path)
            if 'HVYM_nft_data' in gltf.extensions.keys():
              result = gltf.extensions['HVYM_nft_data']
            else:
              click.echo("No Heavymeta Data in model.")

      return result

def _render_template(template_file, data, out_file_path):
      file_loader = FileSystemLoader(FILE_PATH / 'templates')
      env = Environment(loader=file_loader)
      template = env.get_template(template_file)

      with open(out_file_path, 'w') as f:
        output = template.render(data=data)
        f.write(output)

def _svg_to_data_url(svgfile):
    tree = ET.parse(svgfile)
    root = tree.getroot()

    # Remove XML declaration and namespaces
    if len(root.attrib) > 0:
      if 'xmlns' in root.attrib:
        root.attrib.pop('xmlns')
        for child in root:
            child.attrib.pop('xmlns', None)
    
    svg_str = ET.tostring(root, encoding='unicode')
    
    # Convert SVG to base64 and format it as a data URL
    return f"data:image/svg+xml;base64,{b64encode(svg_str.encode('utf-8')).decode('utf-8')}"


def _png_to_data_url(pngfile):
    with open(pngfile, "rb") as image_file:
        encoded_string = b64encode(image_file.read()).decode('utf-8')
    
    return f"data:image/png;base64,{encoded_string}"


def parse_val_prop(obj):
      result = None

      if obj['prop_action_type'] == 'Immutable' or obj['prop_action_type'] == 'Static':
            result = int_data_class(obj['prop_slider_type'],
                                          obj['show'],
                                          obj['prop_slider_type'],
                                          obj['prop_action_type'],
                                          obj['int_default'],
                                          obj['int_min'],
                                          obj['int_max'],
                                          obj['prop_immutable']).dictionary
      else:
            result = cremental_int_data_class(obj['prop_slider_type'],
                                                obj['show'], 
                                                obj['prop_slider_type'],
                                                obj['prop_action_type'],
                                                obj['int_default'],
                                                obj['int_min'],
                                                obj['int_max'],
                                                obj['prop_immutable'],
                                                obj['int_amount']).dictionary
                
      if obj['prop_value_type'] == 'Float':
            if obj['prop_action_type'] == 'Immutable' or obj['prop_action_type'] == 'Static':
                  result = int_data_class(obj['prop_slider_type'],
                                                obj['show'],
                                                obj['prop_slider_type'],
                                                obj['prop_action_type'],
                                                obj['float_default'],
                                                obj['float_min'],
                                                obj['float_max'],
                                                obj['prop_immutable']).dictionary
            else:
                  result = cremental_float_data_class(obj['prop_slider_type'],
                                                obj['show'], obj['prop_slider_type'],
                                                obj['prop_action_type'],
                                                obj['float_default'],
                                                obj['float_min'],
                                                obj['float_max'],
                                                obj['prop_immutable'],
                                                obj['float_amount']).dictionary

      return result


def parse_behavior_val_prop(obj):
      result = None

      if obj['prop_action_type'] == 'Immutable' or obj['prop_action_type'] == 'Static':
            result = int_data_behavior_class(obj['prop_slider_type'],
                                          obj['show'],
                                          obj['prop_slider_type'],
                                          obj['prop_action_type'],
                                          obj['int_default'],
                                          obj['int_min'],
                                          obj['int_max'],
                                          obj['prop_immutable'],
                                          obj['behavior_set']).dictionary
      else:
            result = cremental_int_data_behavior_class(obj['prop_slider_type'],
                                                obj['show'], 
                                                obj['prop_slider_type'],
                                                obj['prop_action_type'],
                                                obj['int_default'],
                                                obj['int_min'],
                                                obj['int_max'],
                                                obj['prop_immutable'],
                                                obj['int_amount'],
                                                obj['behavior_set']).dictionary
                
      if obj['prop_value_type'] == 'Float':
            if obj['prop_action_type'] == 'Immutable' or obj['prop_action_type'] == 'Static':
                  result = int_data_behavior_class(obj['prop_slider_type'],
                                                obj['show'],
                                                obj['prop_slider_type'],
                                                obj['prop_action_type'],
                                                obj['float_default'],
                                                obj['float_min'],
                                                obj['float_max'],
                                                obj['prop_immutable'],
                                                obj['behavior_set']).dictionary
            else:
                  result = cremental_float_data_behavior_class(obj['prop_slider_type'],
                                                obj['show'], obj['prop_slider_type'],
                                                obj['prop_action_type'],
                                                obj['float_default'],
                                                obj['float_min'],
                                                obj['float_max'],
                                                obj['prop_immutable'],
                                                obj['float_amount'],
                                                obj['behavior_set']).dictionary

      return result


@click.group()
def cli():
      pass


@click.command('parse-blender-hvym-interactables')
@click.argument('obj_data', type=str)
def parse_blender_hvym_interactables(obj_data):
      """Return parsed interactables data structure from blender for heavymeta gltf extension"""
      objs = json.loads(obj_data)
      data = {}
      for key in objs:
            obj = objs[key]
            if obj['hvym_interactable']:
                  mesh_set = []
                  for child in obj['children']:
                        if child['type'] == 'MESH':
                              mesh_set.append({'name':child['name'], 'visible': True})
                  behavior = _text_behavior(obj['hvym_mesh_interaction_name'], False, obj['hvym_mesh_interaction_call'], obj['hvym_interactable_behavior'], False)
                  if obj['hvym_interactable_behavior'] != 'NONE':
                    behavior['use_method'] = True
                    behavior['use_behavior'] = True

                  d = interactable_data_class(
                        obj['hvym_interactable'],
                        obj['hvym_interactable_has_return'],
                        obj['hvym_mesh_interaction_type'],
                        obj['hvym_interactable_selector_dir'],
                        obj['hvym_mesh_interaction_name'],
                        obj['hvym_mesh_interaction_call'],
                        obj['hvym_mesh_interaction_default_text'],
                        obj['hvym_mesh_interaction_text_scale'],
                        obj['hvym_mesh_interaction_text_wrap'],
                        obj['hvym_mesh_interaction_param_type'],
                        obj['hvym_mesh_interaction_slider_param_type'],
                        obj['hvym_mesh_interaction_toggle_param_type'],
                        obj['hvym_mesh_interaction_string_param'],
                        obj['hvym_mesh_interaction_int_param'],
                        obj['hvym_mesh_interaction_float_default'],
                        obj['hvym_mesh_interaction_float_min'],
                        obj['hvym_mesh_interaction_float_max'],
                        obj['hvym_mesh_interaction_int_default'],
                        obj['hvym_mesh_interaction_int_min'],
                        obj['hvym_mesh_interaction_int_max'],
                        obj['hvym_mesh_interaction_toggle_state'],
                        obj['hvym_mesh_interaction_toggle_int'],
                        mesh_set,
                        behavior).dictionary
                  data[obj['name']] = d
      click.echo( json.dumps(data) )


@click.command('parse-blender-hvym-collection')
@click.argument('collection_name', type=str)
@click.argument('collection_type', type=str)
@click.argument('collection_id', type=str)
@click.argument('collection_json', type=str)
@click.argument('menu_json', type=str)
@click.argument('nodes_json', type=str)
@click.argument('actions_json', type=str)
def parse_blender_hvym_collection(collection_name, collection_type, collection_id, collection_json, menu_json, nodes_json, actions_json):
      """Return parsed data structure from blender for heavymeta gltf extension"""
      col_data = json.loads(collection_json)
      menu_data = json.loads(menu_json)
      node_data = json.loads(nodes_json)
      action_data = json.loads(actions_json)
      val_props = {}
      text_props = {}
      call_props = {}
      mesh_props = {}
      mesh_sets = {}
      morph_sets = {}
      anim_props = {}
      mat_props = {}
      mat_sets = {}
      col_menu = {}
      prop_label_data = {}
      action_props = {}

      # name: str
      # show: bool
      # immutable: bool
      # text: str
      # behaviors: list

      for i in col_data:
          if i.isdigit():
                obj = col_data[i]

                int_props = None

                if obj['behavior_set'] != None:
                  int_props = parse_behavior_val_prop(obj)
                else:
                  int_props = parse_val_prop(obj)
                            
                      
                if obj['trait_type'] == 'property':
                      val_props[obj['type']] = int_props

                elif obj['trait_type'] == 'text':
                      text_props[obj['type']] = text_data_class(obj['type'], 
                                                                obj['show'], 
                                                                obj['prop_immutable'], 
                                                                obj['text_value'],
                                                                obj['prop_text_widget_type'],
                                                                obj['behavior_set']).dictionary

                elif obj['trait_type'] == 'call':
                      call_props[obj['type']] = call_data_class(obj['type'], obj['call_param']).dictionary

                elif obj['trait_type']  == 'mesh':
                      if obj['model_ref'] != None:
                            mesh_props[obj['type']] = mesh_data_class(obj['prop_toggle_type'],
                                                                      obj['show'],
                                                                      obj['model_ref']['name'],
                                                                      obj['visible']).dictionary

                elif obj['trait_type']  == 'mesh_set':
                      mesh_sets[obj['type']] = mesh_set_data_class(obj['prop_selector_type'],
                                                                   obj['show'], obj['mesh_set'],
                                                                   0).dictionary

                elif obj['trait_type']  == 'morph_set':
                      morph_sets[obj['type']] = morph_set_data_class(obj['prop_selector_type'],
                                                                     obj['show'], obj['morph_set'],
                                                                     0, obj['model_ref']).dictionary
                      
                elif obj['trait_type']  == 'anim':
                      widget_type = obj['prop_toggle_type']
                      if obj['anim_loop'] == 'Clamp':
                            widget_type = obj['prop_anim_slider_type']
                      anim_props[obj['type']] = anim_prop_data_class(widget_type,
                                                                     obj['show'],
                                                                     obj['type'],
                                                                     obj['anim_loop'],
                                                                     obj['anim_start'],
                                                                     obj['anim_end'],
                                                                     obj['anim_blending'],
                                                                     obj['anim_weight'],
                                                                     obj['anim_play'],
                                                                     obj['model_ref']).dictionary
                      
                elif obj['trait_type']  == 'mat_prop' and 'mat_ref' in obj:
                      save_data = _mat_save_data(obj['mat_ref'], obj['mat_type'],
                                                 obj['mat_reflective'],
                                                 obj['mat_iridescent'],
                                                 obj['mat_sheen'],
                                                 obj['mat_emissive'])
                            
                      mat_props[obj['type']] = mat_prop_data_class(obj['prop_multi_widget_type'],
                                                                   obj['show'],
                                                                   obj['mat_ref']['name'],
                                                                   obj['mat_type'],
                                                                   obj['mat_emissive'],
                                                                   obj['mat_reflective'],
                                                                   obj['mat_iridescent'],
                                                                   obj['mat_sheen'],
                                                                   obj['mat_ref'],
                                                                   save_data).dictionary
                            
                elif obj['trait_type']  == 'mat_set':
                      mat_sets[obj['type']] = mat_set_data_class(obj['prop_selector_type'],
                                                                 obj['show'],
                                                                 obj['mat_set'],
                                                                 obj['mesh_set_name'],
                                                                 obj['material_id'],
                                                                 0).dictionary

                      
                prop_label_data = property_label_data_class(obj['value_prop_label'],
                                                            obj['text_prop_label'],
                                                            obj['call_prop_label'],
                                                            obj['mesh_prop_label'],
                                                            obj['mat_prop_label'],
                                                            obj['anim_prop_label'],
                                                            obj['mesh_set_label'],
                                                            obj['morph_set_label'],
                                                            obj['mat_set_label']).dictionary

      for i in menu_data:
          if i.isdigit():
                obj = menu_data[i]
                col_menu = menu_data_class(obj['menu_name'],
                                           obj['menu_primary_color'],
                                           obj['menu_secondary_color'],
                                           obj['menu_text_color'],
                                           obj['menu_alignment']).dictionary
                if obj['collection_id'] == collection_id:
                      break
                  
      for i in action_data:
          if i.isdigit():
                obj = action_data[i]
                if obj['trait_type'] == 'mesh_action':
                      action_props[obj['type']] = action_mesh_data_class(obj['trait_type'],
                                                                         obj['action_set'],
                                                                         obj['mesh_interaction_type'],
                                                                         obj['sequence_type'],
                                                                         obj['additive'],
                                                                         obj['model_ref'])
                else:
                      action_props[obj['type']] = action_data_class(obj['trait_type'],
                                                                    obj['action_set'],
                                                                    obj['anim_interaction_type'],
                                                                    obj['sequence_type'],
                                                                    obj['additive'])
                
                  
      data = collection_data_class(collection_name,
                                   collection_type,
                                   val_props,
                                   text_props,
                                   call_props,
                                   mesh_props,
                                   mesh_sets,
                                   morph_sets,
                                   anim_props,
                                   mat_props,
                                   mat_sets,
                                   col_menu,
                                   prop_label_data,
                                   node_data,
                                   action_props).json
      click.echo(data)


@click.command('collection-data')
@click.argument('collectionName', type=str)
@click.argument('collectionType', type=str)
@click.argument('valProps', type=dict)
@click.argument('textValProps', type=dict)
@click.argument('callProps', type=dict)
@click.argument('meshProps', type=dict)
@click.argument('meshSets', type=dict)
@click.argument('animProps', type=dict)
@click.argument('matProps', type=dict)
@click.argument('materialSets', type=dict)
@click.argument('menuData', type=dict)
@click.argument('propLabelData', type=dict)
@click.argument('nodes', type=dict)
def collection_data(collectionName, collectionType, valProps, textValProps, callProps, meshProps, meshSets, animProps, matProps, materialSets, menuData, propLabelData, nodes):
      """Return data for a single node property"""
      print(collection_data_class(collectionName, collectionType, valProps, textValProps, callProps, meshProps, meshSets, animProps, matProps, materialSets, menuData, propLabelData, nodes).json)
      return collection_data_class(collectionName, collectionType, valProps, textValProps, callProps, meshProps, meshSets, animProps, matProps, materialSets, menuData, propLabelData, nodes).json


@click.command('contract-data')
@click.argument('mintable', type=bool)
@click.argument('nft_type', type=str)
@click.argument('nft_chain', type=str)
@click.argument('nft_price', type=float)
@click.argument('prem_nft_price', type=float)
@click.argument('max_supply', type=int)
@click.argument('minter_type', type=str)
@click.argument('minter_name', type=str)
@click.argument('minter_desc', type=str)
@click.argument('minter_image', type=str)
@click.argument('minter_version', type=str)
@click.argument('enable_context', type=bool)
@click.argument('menus_shown', type=bool)
def contract_data(mintable, nft_type, nft_chain, nft_price, prem_nft_price, max_supply, minter_type, minter_name, minter_desc, minter_image, minter_version, enable_context, menus_shown):
      """Return data for contract data"""
      print(contract_data_class(mintable, nft_type, nft_chain, nft_price, prem_nft_price, max_supply, minter_type, minter_name, minter_desc, minter_image, minter_version, enable_context, menus_shown).json)
      return contract_data_class(mintable, nft_type, nft_chain, nft_price, prem_nft_price, max_supply, minter_type, minter_name, minter_desc, minter_image, minter_version, enable_context, menus_shown).json


@click.command('mat-prop-data')
@click.argument('name', type=str)
@click.argument('type', type=str)
@click.argument('emissive', type=int)
@click.argument('reflective', type=int)
@click.argument('irridescent', type=str)
@click.argument('sheen', type=bool)
@click.argument('mat_ref', type=dict)
@click.argument('widget_type', type=str)
@click.argument('show', type=bool)
def mat_prop_data(name, type, emissive, reflective, irridescent, sheen, mat_ref, mat_values, widget_type, show):
      """Return data for an material property"""
      save_data = _mat_save_data(mat_values, type, reflective, irridescent, sheen, emissive)
      print(mat_prop_data_class(widget_type, show, name, type, emissive, reflective, irridescent, sheen, mat_ref, save_data).json)
      return mat_prop_data_class(widget_type, show, name, type, emissive, reflective, irridescent, sheen, mat_ref, save_data).json


@click.command('anim-prop-data')
@click.argument('name', type=str)
@click.argument('loop', type=str)
@click.argument('start', type=int)
@click.argument('end', type=int)
@click.argument('blending', type=str)
@click.argument('weight', type=float)
@click.argument('play', type=bool)
@click.argument('model_ref', type=dict)
@click.argument('widget_type', type=str)
@click.argument('show', type=bool)
def anim_prop_data(name, loop, start, end, blending, weight, play, model_ref, widget_type, show):
      """Return data for a animation property"""
      print(anim_prop_data_class(widget_type, show, name, loop, start, end, blending, weight, play, model_ref).json)
      return anim_prop_data_class(widget_type, show, name, loop, start, end, blending, weight, play, model_ref).json


@click.command('mesh-set-data')
@click.argument('set', type=list)
@click.argument('selected_index', type=int)
@click.argument('widget_type', type=str)
@click.argument('show', type=bool)
def mesh_set_data(set, selected_index, widget_type, show):
      """Return data for a mesh set property"""
      print(mesh_set_data_class(widget_type, show, set, selected_index).json)
      return mesh_set_data_class(widget_type, show, set, selected_index).json


@click.command('single-node-data')
@click.argument('name', type=str)
@click.argument('type', type=str)
def single_node_data(name, type):
      """Return data for a single node property"""
      print(single_node_data_class(name, type).json)
      return single_node_data_class(name, type).json


@click.command('single-mesh-data')
@click.argument('name', type=str)
@click.argument('visible', type=bool)
def single_mesh_data(name, visible):
      """Return data for a single mesh property"""
      print(single_mesh_data_class(name, visible).json)
      return single_mesh_data_class(name, visible).json


@click.command('mesh-data')
@click.argument('name', type=str)
@click.argument('visible', type=bool)
@click.argument('widget_type', type=str)
@click.argument('show', type=bool)
def mesh_data(name, visible, widget_type, show):
      """Return data for mesh data"""
      print(mesh_data_class(widget_type, show, name, visible).json)
      return mesh_data_class(widget_type, show, name, visible).json


@click.command('single-float-data')
@click.argument('name', type=str)
@click.argument('default', type=int)
@click.argument('min', type=int)
@click.argument('max', type=int)
def single_float_data(name, default, min, max):
      """Return data for a float property"""
      print(single_float_data_class(name, default, min, max).json)
      return single_float_data_class(name, default, min, max).json


@click.command('slider-float-data')
@click.argument('default', type=float)
@click.argument('min', type=float)
@click.argument('max', type=float)
@click.argument('prop_slider_type', type=str)
@click.argument('prop_action_type', type=str)
@click.argument('widget_type', type=str)
@click.argument('show', type=bool)
def slider_float_data(default, min, max, prop_slider_type, prop_action_type, widget_type, show):
      """Return data for an int slider widget"""
      print(float_data_class(widget_type, show, prop_slider_type, prop_action_type, default, min, max).json)
      return float_data_class(widget_type, show, prop_slider_type, prop_action_type, default, min, max).json


@click.command('single-int-data')
@click.argument('name', type=str)
@click.argument('default', type=int)
@click.argument('min', type=int)
@click.argument('max', type=int)
def single_int_data(name, default, min, max):
      """Return data for a integer property"""
      print(single_int_data_class(name, default, min, max).json)
      return single_int_data_class(name, default, min, max).json


@click.command('slider-int-data')
@click.argument('default', type=int)
@click.argument('min', type=int)
@click.argument('max', type=int)
@click.argument('prop_slider_type', type=str)
@click.argument('prop_action_type', type=str)
@click.argument('widget_type', type=str)
@click.argument('show', type=bool)
def slider_int_data(default, min, max, prop_slider_type, prop_action_type, widget_type, show):
      """Return data for an int slider widget"""
      print(int_data_class(widget_type, show, prop_slider_type, prop_action_type, default, min, max).json)
      return int_data_class(widget_type, show, prop_slider_type, prop_action_type, default, min, max).json


@click.command('slider-data')
@click.argument('prop_slider_type', type=str)
@click.argument('prop_action_type', type=str)
@click.argument('widget_type', type=str)
@click.argument('show', type=bool)
def slider_data(prop_slider_type, prop_action_type, widget_type, show):
      """Return data for a slider widget"""
      print(slider_data_class(prop_slider_type, prop_action_type, widget_type, show).json)
      return slider_data_class(prop_slider_type, prop_action_type, widget_type, show).json


@click.command('menu-data')
@click.argument('name', type=str)
@click.argument('primary_color', type=str)
@click.argument('secondary_color', type=str)
@click.argument('text_color', type=str)
@click.argument('alignment', type=str)
def menu_data(name, primary_color, secondary_color, text_color, alignment):
      """Return data for hvym menu element"""
      print(menu_data_class(name, primary_color, secondary_color, text_color, alignment).json)
      return menu_data_class(name, primary_color, secondary_color, text_color, alignment).json


@click.command('basic-material-data')
@click.argument('color', type=str)
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def basic_material_data(color, emissive=None, emissive_intensity=None):
      """Return data for basic material"""
      print(basic_material_class(color, emissive, emissive_intensity).json)
      return basic_material_class(color, emissive, emissive_intensity).json


@click.command('lambert-material-data')
@click.argument('color', type=str)
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def lambert_material_data(color, emissive=None, emissive_intensity=None):
      """Return data for lambert material"""
      return phong_material_class(color, emissive, emissive_intensity).json


@click.command('phong-material-data')
@click.argument('color', type=str)
@click.argument('specular', type=str)
@click.argument('shininess', type=float)
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def phong_material_data(color, specular, shininess, emissive=None, emissive_intensity=None):
      """Return data for phong material"""
      return phong_material_class(color, specular, shininess, emissive, emissive_intensity).json


@click.command('standard-material-data')
@click.argument('color', type=str)
@click.argument('roughness', type=float)
@click.argument('metalness', type=float)
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def standard_material_data(color, roughness, metalness, emissive=None, emissive_intensity=None):
      """Return data for standard material"""
      return standard_material_class(color, roughness, metalness, emissive, emissive_intensity).json


@click.command('pbr-material-data')
@click.argument('color', type=str)
@click.argument('roughness', type=float)
@click.argument('metalness', type=float)
@click.option('--iridescent', '-i', type=bool,  help='Optional iridescence field')
@click.option('--sheen', '-s', type=float,  help='Optional sheen field')
@click.option('--sheen-roughness', '-sr', type=float,  help='Optional sheen roughness field')
@click.option('--sheen-color', '-sc', type=str,  help='Optional sheen color field')
@click.option('--emissive', '-e', type=str,  help='Optional emissive color field')
@click.option('--emissive-intensity', '-ei', type=float,  help='Optional emissive intensity field')
def pbr_material_data(color, roughness, metalness, iridescent=None, sheen=None, sheen_roughness=None, sheen_color=None, emissive=None, emissive_intensity=None):
      """Return data for pbr material"""
      return pbr_material_class(color, roughness, metalness, iridescent, sheen, sheen_roughness, sheen_color, emissive, emissive_intensity).json


@click.command('icp-install')
def icp_install():
      """Install ICP dfx cli."""
      cmd = "sh -c '$(curl -fsSL https://internetcomputer.org/install.sh)'"
      subprocess.run(cmd, shell=True, check=True)


@click.command('didc-install')
def didc_install():
      """Install ICP didc cli."""
      if os.path.isfile(INSTALL_DIDC_SH):
           cmd = f"chmod +x {INSTALL_DIDC_SH}"
           subprocess.run(cmd, shell=True, check=True)
           cmd = f"sh -c '{INSTALL_DIDC_SH}'"
           subprocess.run(cmd, shell=True, check=True)


@click.command('didc-bind-js')
@click.argument('didfile', type=str)
def didc_bind_js(didfile):
      """Create js interface from canister .did file."""
      if os.path.isfile(DIDC):
           cmd = f"{DIDC} bind {didfile} -t js"
           output = subprocess.run(cmd, shell=True, check=True)
           click.echo(output.stdout)


@click.command('didc-bind-js-popup')
def didc_bind_js_popup():
      """Create js interface from canister .did file."""
      if os.path.isfile(DIDC):
           popup = _file_select_popup("Select .did file", ["Candid (*.did)"])
           if not popup:
                return
           if popup.value == None or len(popup.value)==0:
                return
            
           file = popup.value[0]
           cmd = f"{DIDC} bind {file} -t js"
           output = subprocess.run(cmd, capture_output=True, shell=True, check=True)

           _copy_text_popup("Js Interface:", output.stdout.decode("utf-8"), str(ICP_LOGO_IMG))


@click.command('didc-bind-ts')
@click.argument('didfile', type=str)
def didc_bind_ts(didfile):
      """Create ts interface from canister .did file."""
      if os.path.isfile(DIDC):
           cmd = f"{DIDC} {didfile} -t ts"
           subprocess.run(cmd, shell=True, check=True)


@click.command('didc-bind-ts-popup')
def didc_bind_ts_popup():
      """Create ts interface from canister .did file."""
      if os.path.isfile(DIDC):
           popup = _file_select_popup("Select .did file", ["Candid (*.did)"])
           if not popup:
                return
           if popup.value == None or len(popup.value)==0:
                return
            
           file = popup.value[0]
           cmd = f"{DIDC} bind {file} -t ts"
           output = subprocess.run(cmd, capture_output=True, shell=True, check=True)

           _copy_text_popup("Ts Interface:", output.stdout.decode("utf-8"), str(ICP_LOGO_IMG))


@click.command('icp-new-cryptonym')
@click.argument('cryptonym', type=str)
def icp_new_cryptonym(cryptonym):
      """Create a new cryptonym, (alias/identity) for the Internet Computer Protocol."""
      command = f'{DFX} identity new {cryptonym} --storage-mode password-protected'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      click.echo('Command output:', output.stdout)


@click.command('icp-id-list')
def icp_id_list():
      """Get a list of identitys on this machine."""
      command = f'{DFX} identity list'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      click.echo(output.stdout)


@click.command('icp-use-id')
@click.argument('cryptonym', type=str)
def icp_use_id(cryptonym):
      """Set the icp id for this machine."""
      command = f'{DFX} identity use {cryptonym}'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      click.echo(output.stdout)


@click.command('icp-use-cryptonym')
@click.argument('cryptonym', type=str)
def icp_use_cryptonym(cryptonym):
      """Use a cryptonym, (alias/identity) for the Internet Computer Protocol."""
      command = f'{DFX} identity use {cryptonym}'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      click.echo('Command output:', output.stdout)


@click.command('icp-account')
def icp_account():
      """Get the account number for the current active account."""
      command = f'{DFX} ledger account-id'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      click.echo('Command output:', output.stdout)


@click.command('icp-principal')
def icp_principal():
      """Get the current principal id for account."""
      active = _ic_get_active_id().strip()
      principal = _ic_get_stored_principal(active.strip())
      click.echo(principal)


@click.command('icp-account-is-encrypted')
@click.argument('cryptonym', type=str)
def ic_account_is_encrypted(cryptonym):
      """Get the stored principal for passed account."""
      click.echo(_ic_account_is_encrypted(cryptonym))


@click.command('icp-principal-hash')
def icp_principal_hash():
      """Get the current principal id for account."""
      active = _ic_get_active_id().strip()
      principal = _ic_get_stored_principal(active)
      hexdigest = _create_hex(principal.encode('utf-8'))
      click.echo(hexdigest.upper())


@click.command('icp-balance')
def icp_balance():
      """Get the current balance of ic for current account."""
      command = f'{DFX} ledger --network ic balance'
      output = subprocess.run(command, shell=True, capture_output=True, text=True)
      click.echo('Command output:', output.stdout)


@click.command('icp-start-assets')
@click.argument('project_type')
def icp_start_assets(project_type): 
      """Start dfx in the current assets folder."""
      loading = loading = GifAnimation(str(LOADING_IMG), 1000, True, 'STARTING DFX DAEMON')
      loading.Play()
      _set_hvym_network()
      if project_type == 'model':
            _ic_start_daemon(MODEL_DEBUG_TEMPLATE)
      elif project_type == 'minter':
            _ic_start_daemon(MINTER_TEMPLATE)
      elif project_type == 'custom':
            _ic_start_daemon(CUSTOM_CLIENT_TEMPLATE)
      elif project_type == 'assets':
            _ic_start_daemon(ASSETS_CLIENT_TEMPLATE)

      time.sleep(2)
      loading.Stop()
                

@click.command('icp-stop-assets')
@click.argument('project_type')
def icp_stop_assets(project_type):
      """ Shut down running dfx daemon."""
      if project_type == 'model':
            _ic_stop_daemon(MODEL_DEBUG_TEMPLATE)
      elif project_type == 'minter':
            _ic_stop_daemon(MINTER_TEMPLATE)
      elif project_type == 'custom':
            _ic_stop_daemon(CUSTOM_CLIENT_TEMPLATE)
      elif project_type == 'assets':
            _ic_stop_daemon(ASSETS_CLIENT_TEMPLATE)


@click.command('icp-template')
@click.argument('project_type')
def icp_template(project_type):
      """Get the icp template name."""
      result = None
      if project_type == 'model':
            result = MODEL_DEBUG_TEMPLATE
      elif project_type == 'minter':
            result = MINTER_TEMPLATE
      elif project_type == 'custom':
            result = CUSTOM_CLIENT_TEMPLATE
      elif project_type == 'assets':
            result = ASSETS_CLIENT_TEMPLATE

      click.echo(result)


@click.command('icp-deploy-assets')
@click.argument('project_type')
@click.option('--ic', is_flag=True, default=True, )
def icp_deploy_assets(project_type, ic):
      """deploy the current asset canister."""
      command = f'{DFX} deploy'
      pw = None
      if not ic:
        popup = _password_popup('Enter the Account Passphrase.')
        pw = popup.value
        command += ' ic'

      folders = [MODEL_DEBUG_TEMPLATE]

      if project_type == 'minter':
            folders = [MINTER_TEMPLATE]
      elif project_type == 'custom':
            folders = [CUSTOM_CLIENT_TEMPLATE]
      elif project_type == 'assets':
            folders = [ASSETS_CLIENT_TEMPLATE]
        
      return _subprocess('icp', folders, command, BUILDING_IMG, pw)
    

@cli.command('icp-backup-keys')
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


@click.command('icp-export-project')
@click.argument('out_path')
def icp_export_project(out_path):
      """Export the working icp project to destination path"""
      try:
            shutil.copytree(_get_session('icp'), out_path)
                
      except Exception as e:  
            click.echo("Export project failed with:", str(e))
    

@click.command('icp-project')
@click.argument('name')
@click.option('--quiet', '-q', is_flag=True,  required=False, default=False, help="Don't echo anything.")
def icp_project(name, quiet):
      """Create a new ICP project"""
      path = _new_session('icp', name)
      click.echo(f"{path}")


@click.command('icp-project-path')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_project_path(quiet):
      """Print the current ICP project path"""
      click.echo(_get_session('icp'))
      

@click.command('icp-minter-path')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_minter_path(quiet):
      """Print the current ICP active project minter path"""
      click.echo(_ic_minter_path())


@click.command('icp-minter-model-path')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_minter_model_path(quiet):
      """Print the current ICP active project minter model path"""
      click.echo(_ic_minter_model_path())


@click.command('icp-custom-client-path')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_custom_client_path(quiet):
      """Print the current ICP active project custom client project path"""
      click.echo(_ic_custom_client_path())


@click.command('icp-model-path')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_model_path(quiet):
      """Print the current ICP active project minter path"""
      click.echo(_ic_model_debug_path())


@click.command('icp-assets-client-path')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_assets_client_path(quiet):
      """Print the current ICP assets client project path"""
      click.echo(_ic_assets_client_path())


@click.command('icp-account-info')
def icp_account_info():
      """Get active icp account info"""
      click.echo(_ic_id_info())


@click.command('icp-set-account')
@click.option('--quiet', '-q', is_flag=True, default=False, help="No confirmation.")
def icp_set_account(quiet):
      """Set the icp account"""
      if quiet:
            click.echo(_ic_account_dropdown_popup(False))
      else:
            click.echo(_ic_account_dropdown_popup())


@click.command('icp-new-account')
def icp_new_account():
      """Create a new icp account"""
      click.echo(_ic_new_encrypted_account_popup())


@click.command('icp-new-test-account')
def icp_new_test_account():
      """Create a new icp test(unencrypted) account"""
      click.echo(_ic_new_test_account_popup())


@click.command('icp-remove-account')
def icp_remove_account():
      """Select an IC account to remove"""
      click.echo(_ic_remove_account_dropdown_popup())


@click.command('icp-active-principal')
def icp_active_principal():
      """Get the active principal in a message popup"""
      click.echo(_ic_get_active_principal())


@click.command('img-to-url')
@click.argument('msg', type=str)
def img_to_url(msg):
      """ Show file selection popup, then convert selected file to base64 string."""
      click.echo(_prompt_img_convert_to_url(msg))


@click.command('icp-init')
@click.argument('project_type', type=str)
@click.option('--force', '-f', is_flag=True, default=False, help='Overwrite existing directory without asking for confirmation')
@click.option('--quiet', '-q', is_flag=True, default=False, help="Don't echo anything.")
def icp_init(project_type, force, quiet):
      """Intialize project directories"""
      loading = GifAnimation(LOADING_IMG, 1000, True, '', True)
      
      model_path = _ic_model_debug_path()
      minter_path = _ic_minter_path()
      custom_client_path = _ic_custom_client_path()
      assets_client_path = _ic_assets_client_path()

      install_path = None

      if not (os.path.exists(model_path) and os.path.exists(minter_path)) or force:
        if not (force or click.confirm(f"Do you want to create a new deploy dir at {model_path}?")):
            return

      if project_type == 'model':
            install_path = model_path
            if not os.path.exists(model_path):
                  loading.Play()
                  _ic_install_model_debug_repo(model_path)
            else:
                  answer = _choice_popup('Project exists already, n/ Overwrite?').value
                  if answer == 'OK':
                        _ic_install_model_debug_repo(model_path)

      if project_type == 'minter':
            install_path = minter_path
            if not os.path.exists(minter_path):
                  loading.Play()
                  _ic_install_model_minter_repo(minter_path)
            else:
                  answer = _choice_popup('Project exists already, n/ Overwrite?').value
                  if answer == 'OK':
                        _ic_install_model_minter_repo(minter_path)

      if project_type == 'custom':
            install_path = custom_client_path
            if not os.path.exists(custom_client_path):
                  loading.Play()
                  _ic_install_custom_client_repo(custom_client_path)
            else:
                  answer = _choice_popup('Project exists already, n/ Overwrite?').value
                  if answer == 'OK':
                        _ic_install_custom_client_repo(custom_client_path)

      if project_type == 'assets':
            install_path = assets_client_path
            if not os.path.exists(assets_client_path):
                  loading.Play()
                  _ic_install_assets_client_repo(assets_client_path)
            else:
                  answer = _choice_popup('Project exists already, n/ Overwrite?').value
                  if answer == 'OK':
                        _ic_install_assets_client_repo(assets_client_path)

      loading.Stop()
            
      click.echo(f"Project files created at: {install_path}.")


@click.command('icp-update-model')
@click.argument('model', type=str)
def icp_update_model(model):
      """Set up nft collection deploy directories & render model debug templates."""
      path = _ic_model_debug_path()
      front_src_dir = os.path.join(path, 'src', 'frontend')
      assets_dir = os.path.join(front_src_dir, 'assets')
      model_path = os.path.join(assets_dir, model)
      

      if not os.path.exists(model_path):
        click.echo(f"No model exists at path {model_path}.")

      hvym_data = _load_hvym_data(model_path)

      if hvym_data == None:
            return

      gltf = GLTF2().load(model_path)
      if 'HVYM_nft_data' in gltf.extensions.keys():
        hvym_data = gltf.extensions['HVYM_nft_data']
      else:
        click.echo("No Heavymeta Data in model.")
        return

      data = _parse_hvym_data(hvym_data, model)

      out_file_path = os.path.join(front_src_dir,  'index.html')
      _render_template(TEMPLATE_CUSTOM_CLIENT_INDEX, data, out_file_path)

      out_file_path = os.path.join(front_src_dir,  'index.js')
      _render_template(TEMPLATE_MODEL_VIEWER_JS, data, out_file_path)


@click.command('icp-update-model-minter')
@click.argument('model', type=str)
def icp_update_model_minter(model):
      """Set up nft collection deploy directories"""
      print('icp_update_model_minter')
      print(model)
      loading = GifAnimation(LOADING_IMG, 1000, True, '', True)
      loading.Play()

      if '.glb' not in model:
        click.echo(f"Only GLTF Binary files (.glb) accepted.")
        return

      model_path = os.path.join(_ic_minter_model_path(), model)
      hvym_data = _load_hvym_data(model_path)

      if hvym_data == None:
            return

      gltf = GLTF2().load(model_path)
      if 'HVYM_nft_data' in gltf.extensions.keys():
        hvym_data = gltf.extensions['HVYM_nft_data']
      else:
        click.echo("No Heavymeta Data in model.")
        return

      data = _parse_hvym_data(hvym_data, model)
      
      path = os.path.join(_ic_minter_path(), 'src', 'proprium_minter_backend')

      out_file_path = os.path.join(path,  'main.mo')
      _render_template(TEMPLATE_MODEL_MINTER_MAIN, data, out_file_path)

      out_file_path = os.path.join(path,  'Types.mo')
      _render_template(TEMPLATE_MODEL_MINTER_TYPES, data, out_file_path)

      path = os.path.join(_ic_minter_path(),  'src', 'proprium_minter_frontend', 'src')

      out_file_path = os.path.join(path,  'index.html')
      _render_template(TEMPLATE_MODEL_MINTER_INDEX, data, out_file_path)

      out_file_path = os.path.join(path,  'index.js')
      _render_template(TEMPLATE_MODEL_MINTER_JS, data, out_file_path)

      loading.Stop()


@click.command('icp-update-custom-client')
@click.argument('model', type=str)
@click.argument('backend', type=str)
def icp_update_custom_client(model, backend):
      """ deploy directories & render custom client debug templates."""
      if not os.path.isdir(backend):
            return
            
      loading = GifAnimation(LOADING_IMG, 1000, True, '', True)
      loading.Play()
      path = _ic_custom_client_path()
      src_dir = os.path.join(path, 'src')
      back_src_dir = os.path.join(src_dir, 'backend')
      front_src_dir = os.path.join(src_dir, 'frontend')

      if '.glb' not in model:
        click.echo(f"Only GLTF Binary files (.glb) accepted.")
        return

      model_path = os.path.join(front_src_dir, 'assets', model)
      hvym_data = _load_hvym_data(model_path)

      if hvym_data == None:
            return

      data = _parse_hvym_data(hvym_data, model)

      #delete old dir first, then copy custom dir
      shutil.rmtree(back_src_dir, ignore_errors=True)
      try:
            shutil.copytree(backend, back_src_dir)
                
      except Exception as e:  
            print("Copy custom backend failed with:", str(e))

      out_file_path = os.path.join(front_src_dir,  'index.html')

      _render_template(TEMPLATE_CUSTOM_CLIENT_INDEX, data, out_file_path)

      out_file_path = os.path.join(front_src_dir,  'index.js')

      _render_template(TEMPLATE_CUSTOM_CLIENT_JS, data, out_file_path)

      loading.Stop()


@click.command('icp-assign-canister-id')
@click.argument('project_type', type=str)
@click.argument('canister_id', type=str)
def icp_assign_canister_id(project_type, canister_id):
      """ Assign canister id to active ic project. """
      _ic_assign_canister_id(project_type, canister_id)

@click.command('stellar-update-db-pw')
def stellar_update_db_pw():
      """Update Passphrase fo Stellar db"""
      click.echo(_stellar_update_db_pw())

@click.command('stellar-select-shared-pub')
def stellar_select_shared_pub():
      """Select KeyPair for Stellar account"""
      click.echo(_stellar_select_shared_pub())

@click.command('stellar-load-shared-pub')
def stellar_load_shared_pub():
      """Load active 25519 public key for Stellar Account"""
      click.echo(_stellar_load_shared_pub())

@click.command('stellar-select-keys')
def stellar_select_keys():
      """Select 25519 public key for Stellar account"""
      click.echo(_stellar_select_keys())

@click.command('stellar-load-keys')
def stellar_load_keys():
      """Load active KeyPair for Stellar account"""
      click.echo(_stellar_load_keys())

@click.command('stellar-set-account')
@click.option('--quiet', '-q', is_flag=True, default=False, help="No confirmation.")
def stellar_set_account(quiet):
      """Set the Stellar account"""
      if quiet:
            click.echo(_stellar_account_dropdown_popup(False))
      else:
            click.echo(_stellar_account_dropdown_popup())

@click.command('stellar-new-account')
def stellar_new_account():
      """Create a new Stellar account"""
      click.echo(_stellar_new_account_popup())

@click.command('stellar-remove-account')
def stellar_remove_account():
      """Select an Stellar account to remove"""
      click.echo(_stellar_remove_account_dropdown_popup())

@click.command('pinggy-set-token')
def pinggy_set_token():
      """Set Pinggy Token"""
      click.echo(_pinggy_set_token())

# @click.command('pintheon-pull-popup')
# def pintheon_pull_popup():
#     """Pop up a directory select and pull the pintheon image to that directory."""
#     popup = _pintheon_pull_popup()
#     if not popup or popup.value is None or len(popup.value) == 0:
#         _msg_popup('No directory selected.', str(LOGO_WARN_IMG))
#         return
#     path = popup.value[0]
#     try:
#         _pintheon_pull(path)
#         _msg_popup(f'Pintheon image downloaded to:\n{path}', str(LOGO_IMG))
#     except Exception as e:
#         _msg_popup(f'Failed to download image: {str(e)}', str(LOGO_WARN_IMG))

def _set_pintheon_port():
    """Pop up a prompt to set the pintheon port and store it in APP_DATA."""
    popup = _edit_line_popup('Enter Pintheon Port:', str(APP_DATA.get(Query().data_type == 'APP_DATA').get('pintheon_port', 9999)))
    if not popup or popup.value is None or popup.value == '':
        _msg_popup('No port entered.', str(LOGO_WARN_IMG))
        return
    try:
        port = int(popup.value)
        if not (1 <= port <= 65535):
            raise ValueError('Port out of range')
        APP_DATA.update({'pintheon_port': port})
        _msg_popup(f'Pintheon port set to: {port}', str(LOGO_IMG))
    except Exception as e:
        _msg_popup(f'Invalid port: {str(e)}', str(LOGO_WARN_IMG))

@click.command('pintheon-set-port')
def pintheon_set_port():
    """Set the port used for the pintheon tunnel and instance."""
    _set_pintheon_port()

@click.command('pintheon-set-network')
def pintheon_set_network():
    """Pop up a dropdown to select the Pintheon network and save to APP_DATA."""
    data = APP_DATA.get(Query().data_type == 'APP_DATA')
    networks = data.get('pintheon_networks', NETWORKS)
    popup = _options_popup('Select Pintheon Network:', networks, str(LOGO_CHOICE_IMG))
    if not popup or popup.value is None or popup.value == '':
        _msg_popup('No network selected.', str(LOGO_WARN_IMG))
        return
    network = popup.value
    networks.insert(0, networks.pop(networks.index(network)))
    APP_DATA.update({'pintheon_networks': networks})
    _msg_popup(f'Pintheon network set to: {network}', str(LOGO_IMG))

@click.command('pintheon-port')
def pintheon_port():
      click.echo(_pintheon_port())

@click.command('pintheon-dapp')
def pintheon_dapp():
      click.echo(_pintheon_dapp())

@click.command('pintheon-network')
def pintheon_network():
      click.echo(_pintheon_network())

@click.command('pintheon-tunnel')
def pintheon_tunnel():
      """Open Pintheon Tunnel"""
      click.echo(_pintheon_tunnel())

@click.command('pintheon-setup')
def pintheon_setup():
      """Setup local Pintheon Gateway"""
      if _check_docker_installed():
            if not _docker_container_exists('pintheon'):
                  _pintheon_create_container()
            _pinggy_install()
            try:
                  _pintheon_pull()
                  _msg_popup(f'Pintheon image downloaded and container created.', str(LOGO_IMG))
            except Exception as e:
                  _msg_popup(f'Failed to download image: {str(e)}', str(LOGO_WARN_IMG))
      else:
            _prompt_popup("Docker must be installed.")

@click.command('pintheon-start')
def pintheon_start():
      """Start local Pintheon Gateway"""
      click.echo(_pintheon_start())

@click.command('pintheon-stop')
def pintheon_stop():
      """Start local Pintheon Gateway"""
      click.echo(_pintheon_stop())

@click.command('svg-to-data-url')
@click.argument('svgfile', type=str)
def svg_to_data_url(svgfile):
      """ Convert an svg file to data url. """
      click.echo(_svg_to_data_url(svgfile))


@click.command('png-to-data-url')
@click.argument('pngfile', type=str)
def png_to_data_url(pngfile):
      """ Convert a png file to data url. """
      click.echo(_png_to_data_url(pngfile))

@click.command('update-npm-modules')
def update_npm_modules():
      """Update npm links"""
      _update_hvym_npm_modules()

@click.command('update-proprium-js-file')
def update_proprium_js_file():
      """Update the local js file for hvym-proprium module"""
      _update_proprium_js_file()

@click.command('check')
def check():
      """For checking if cli is on the path"""
      click.echo('ONE-TWO')

@click.command('up')
def up():
      """Set up the cli"""
      loading = GifAnimation(BUILDING_IMG, 1000, True, '', True)
      loading.Play()
      _link_hvym_npm_modules()
      loading.Stop()
      _splash(BRAND)

@click.command('custom-loading-msg')
@click.argument('msg', type=str)
def custom_loading_msg(msg):
      """ Show custom loading message based on passed msg arg."""
      loading = GifAnimation(str(LOADING_IMG), 1000, True, msg)
      loading.Play()
      time.sleep(5)
      loading.Stop()
      

@click.command('custom-prompt')
@click.argument('msg', type=str)
def custom_prompt(msg):
      """ Show custom prompt based on passed text."""
      _prompt_popup(f'{msg}')


@click.command('custom-choice-prompt')
@click.argument('msg', type=str)
def custom_choice_prompt(msg):
      """ Display a custom message prompt. """
      click.echo(_choice_popup(f'{msg}').value)


@click.command('custom-copy-line-prompt')
@click.argument('msg', type=str)
@click.argument('defaultText', type=str)
def custom_copy_line_prompt(msg, defaultText):
      """ Display a custom copy line prompt. """
      click.echo(_copy_line_popup(msg, defaultText).value)


@click.command('custom-copy-text-prompt')
@click.argument('msg', type=str)
@click.argument('defaultText', type=str)
def custom_copy_text_prompt(msg, defaultText):
      """ Display a custom copy text prompt. """
      click.echo(_copy_text_popup(msg, defaultText).value)


@click.command('splash')
def splash():
      """Show Heavymeta Splash"""
      _splash(BRAND)


@click.command('test')
def test():
      """Set up nft collection deploy directories"""
      _ic_update_data()
      #_ic_account_dropdown_popup()


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
        

@click.command('version')
def version():
      """Print the version number."""
      click.echo(VERSION)

@click.command('about')
def about():
      """About this cli"""
      click.echo(ABOUT)


'''popup creation methods:'''
def _splash(text):
      interaction = HVYMInteraction()
      interaction.splash(text)

def _msg_popup(msg, icon=str(LOGO_IMG)):
      interaction = HVYMInteraction()
      interaction.msg_popup(msg, icon)

def _options_popup(msg, options,icon=str(LOGO_IMG)):
      interaction = HVYMInteraction()
      interaction.options_popup(msg, options, icon)
      
      return interaction

def _edit_line_popup(msg, defaultText=None, icon=str(LOGO_IMG)):
      interaction = HVYMInteraction()
      interaction.edit_line_popup(msg, defaultText, icon)

      return interaction

def _user_popup(msg, icon=str(LOGO_IMG)):
      interaction = HVYMInteraction()
      interaction.user_popup(msg, icon)

      return interaction

def _password_popup(msg, icon=str(LOGO_IMG)):
      interaction = HVYMInteraction()
      interaction.password_popup(msg, icon)

      return interaction

def _user_password_popup(msg, defaultText=None, icon=str(LOGO_IMG)):
      interaction = HVYMInteraction()
      interaction.user_password_popup(msg, defaultText, icon)

      return interaction

def _copy_line_popup(msg, defaultText=None, icon=str(LOGO_IMG)):
      interaction = HVYMInteraction()
      interaction.copy_line_popup(msg, defaultText, icon)

      return interaction

def _copy_text_popup(msg, defaultText=None, icon=str(LOGO_IMG)):
      interaction = HVYMInteraction()
      interaction.copy_text_popup(msg, defaultText, icon)

      return interaction

def _choice_popup(msg, icon=str(LOGO_IMG)):
      """ Show choice popup, message based on passed msg arg."""
      interaction = HVYMInteraction()
      interaction.choice_popup(msg, icon)

      return interaction

def _prompt_popup(msg):
      """ Show choice popup, message based on passed msg arg."""
      _msg_popup(msg)

def _file_select_popup(msg, filters=None, icon=str(LOGO_CHOICE_IMG)):
      interaction = HVYMInteraction()
      interaction.file_select_popup(msg, filters)

      return interaction

def _folder_select_popup(msg, icon=str(LOGO_CHOICE_IMG)):
      interaction = HVYMInteraction()
      interaction.folder_select_popup(msg)

      return interaction

def _prompt_img_convert_to_url(msg):
      """ Show file selection popup, then convert selected file to base64 string."""
      popup = _file_select_popup(msg, ["Images (*.png *.svg)"])
      if not popup:
            return
      if popup.value == None or len(popup.value)==0:
           return
      
      result = None
      file = popup.value[0]

      if os.path.isfile(file):
            if '.png' in file:
                  result = _png_to_data_url(file)
            elif '.svg' in file:
                  result = _svg_to_data_url(file)

      return result


def _ic_get_active_principal():
      _ic_update_data()
      active = _ic_get_active_id().strip()
      principal = _ic_get_stored_principal(active)
      text = 'Active account principal:'
      popup = _copy_line_popup(text,  principal, str(ICP_LOGO_IMG))


def _ic_account_dropdown_popup(confirmation=True):
      _ic_update_data()
      data = _ic_id_info()
      text = 'Choose Account:'
      popup = _options_popup(text, data['list'], str(ICP_LOGO_IMG))
      select = popup.value

      if select != None and select != data['active_id']:
            _ic_set_id(select)
            data = _ic_id_info()
            if confirmation:
                  _msg_popup(f'Account has been changed to: {select}', str(ICP_LOGO_IMG))

      return data['active_id']


def _ic_new_encrypted_account_popup():
      find = Query()
      data = IC_IDS.get(find.data_type == 'IC_ID_ACTIVE')
      text = 'Enter a name for the new account:'
      popup = _user_password_popup(text, None, str(ICP_LOGO_IMG))

      if not popup:
            return
      
      answer = popup.value

      if answer == None or len(answer['user']) == 0 or len(answer['pw']) == 0:
           _msg_popup('All fields must be filled in.', str(LOGO_WARN_IMG))
           return
           
      if answer != None and answer != '' and answer != 'CANCEL':
            user = answer['user']
            pw = answer['pw']
            if user not in data['list']:
                  dfx = _ic_new_encrypted_id(user, pw)
                  _ic_set_id(user)
                  arr1 = dfx.split('\n')
                  arr3 = arr1[3].split(':')
                  text = arr3[0].strip()+'''\nMake sure to store it in a secure place.
                  '''
                  seed = arr3[1].strip()
                  _copy_text_popup(text, seed, str(ICP_LOGO_IMG))
                  _ic_update_data(pw)
                  _msg_popup(f'New account has been created and changed to: {user}', str(ICP_LOGO_IMG))
            elif user in data['list']:
                 _msg_popup(f'{user} exists already, try a different account name.', str(LOGO_WARN_IMG))
                 _ic_new_encrypted_account_popup()

      return data['active_id']


def _ic_new_test_account_popup():
      find = Query()
      data = IC_IDS.get(find.data_type == 'IC_ID_ACTIVE')
      text = 'Enter a name for the new test account:'
      popup = _user_popup(text, str(ICP_LOGO_IMG))

      if not popup:
            return
      
      user = popup.value

      if user == None or len(user) == 0:
           _msg_popup('All fields must be filled in.', str(ICP_LOGO_IMG))
           return
           
      if user != None and user != '' and user != 'CANCEL':
            if user not in data['list']:
                  popup = _choice_popup(f"This is a test account and shouldn't be used to store actual funds, as it lacks encryption.", str(LOGO_WARN_IMG))
                  choice = popup.value
                  if choice == 'OK':
                        dfx = _ic_new_test_id(user)
                        _ic_set_id(user)
                        arr = dfx.split(':')
                        text = arr[0].strip()+'''\nMake sure to store it in a secure place.'''
                        seed = arr[1].replace('This can be used to reconstruct your key in case of emergency, so write it down in a safe place.', '').strip()
                        seed = seed.replace('Created identity', '').strip()
                        _copy_text_popup(text, seed, str(ICP_LOGO_IMG))
                        _ic_update_data()
                        _msg_popup(f'New account has been created and changed to: {user}', str(ICP_LOGO_IMG))
                  elif user in data['list']:
                        _msg_popup(f'{user} exists already, try a different account name.', str(LOGO_WARN_IMG))
                        _user_popup()

      return data['active_id']


def _ic_remove_account_dropdown_popup(confirmation=True):
      _ic_update_data()
      data = _ic_id_info()
      pruned = copy.copy(data['list'])
      pruned.remove('default')
      pruned.remove('anonymous')

      if len(pruned)==0:
           _msg_popup(f'Only default accounts are present, nothing to remove.', str(LOGO_WARN_IMG))
           return
      
      text = 'Choose Account:'
      popup = _options_popup(text, pruned, str(ICP_LOGO_IMG))
      select = popup.value

      if select != None:
            popup = _choice_popup(f'Are you sure you want to delete {select}', str(LOGO_CHOICE_IMG))
            choice = popup.value
            if choice == 'OK':
                  _ic_set_id('default')
                  _ic_remove_id(select.strip())
                  data = _ic_id_info()
                  _ic_update_data()
                  if confirmation:
                        _msg_popup(f'{select} account removed, active account is now: default', str(ICP_LOGO_IMG))

      return data['active_id']

def _stellar_update_db_pw():
      storage = None
      popup = _password_popup(f'Change Passphrase for db?', str(STELLAR_LOGO_IMG))
      pw = popup.value
      new_pw = None
      confirm_pw = None
      if pw != None:
            popup = _password_popup(f'New Passphrase', str(STELLAR_LOGO_IMG))
            new_pw = popup.value
            popup = _password_popup(f'Confirm Passphrase', str(STELLAR_LOGO_IMG))
            confirm_pw = popup.value
            if new_pw == confirm_pw:
                  storage = None
                  try:
                        storage =_open_encrypted_storage(pw)
                  finally:
                        if storage == None:
                              _msg_popup('Wrong Password', str(STELLAR_LOGO_IMG))
                              _stellar_new_account_popup()
                  db = storage['db']

                  db.storage.change_encryption_key(new_pw)
            else:
                  _msg_popup('Passhrases dont match', str(STELLAR_LOGO_IMG))
                  _stellar_update_db_pw()

def _pinggy_install():
      response = None
      if _linux_arm_or_x86() == 'ARM64':
            response = requests.get(PINGGY_ARM64)
      elif _linux_arm_or_x86() == 'x86-64':
            response = requests.get(PINGGY_X86)

      if not os.path.exists(PINGGY_DIR):
            os.makedirs(PINGGY_DIR)

      if response.ok:
            with open(PINGGY, mode="wb") as file:
                  file.write(response.content)
            command = f'chmod +x {PINGGY}'
            _call(command)

def _pinggy_set_token():
      popup = _edit_line_popup('Enter Pinggy Token:', '')
      APP_DATA.update({'pinggy_token': popup.value})

def _pintheon_tunnel():
      find = Query()
      if len(APP_DATA.search(find.pinggy_token == ''))==0:
            data = APP_DATA.get(find.data_type == 'APP_DATA')
            port = data.get('pintheon_port', 9999)
            command = f'{PINGGY} -p 443 -R0:localhost:{port} -L4300:localhost:4300 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -t {data["pinggy_token"]}@pro.pinggy.io x:https x:localServerTls:localhost x:passpreflight'
            _call(command)
      else:
            _msg_popup('No Pinggy Token is available')

def _docker_container_exists(name):
    try:
        output = subprocess.check_output(
            [
                'docker', 'ps', '-a', '--filter', f'name=^{name}$', '--format', '{{.Names}}'
            ],
            stderr=subprocess.DEVNULL
        ).decode('utf-8').strip()
        return output == name
    except Exception:
        return False

def _check_docker_installed():
      result = True
      output = subprocess.run(["docker", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
      if not 'Docker version' in output.stdout.decode('utf-8'):
            result = False

      return result
        
def _pintheon_port():
      data = APP_DATA.get(Query().data_type == 'APP_DATA')
      return data.get('pintheon_port', 9999)

def _pintheon_dapp():
      data = APP_DATA.get(Query().data_type == 'APP_DATA')
      return data.get('pintheon_dapp', 'pintheon-testnet-x86_64')

def _pintheon_network():
      data = APP_DATA.get(Query().data_type == 'APP_DATA')
      networks = data.get('pintheon_networks', DEFAULT_NETWORK)
      return networks[0]

def _pintheon_create_container():
      output = None
      try:
            dapp = _pintheon_dapp()
            port = _pintheon_port()
            command = f'docker create --name pintheon --pid=host --dns=8.8.8.8 --network bridge -p {port}:443/tcp -v "$(pwd)/pintheon_data:/home/pintheon/data" metavinci/{dapp}:{PINTHEON_VERSION}'
            output = subprocess.check_output(command, cwd=HOME, shell=True, stderr=subprocess.STDOUT)
      except:
            print(output)

def _pintheon_pull_popup():
      popup = _folder_select_popup('Select Pintheon Image Install Location')
      return popup

def _pintheon_pull(procImg=LOADING_IMG,):
    loading = GifAnimation(procImg, 1000, True, '', True)
    loading.Play()
    dapp = _pintheon_dapp()
    command = f'docker pull metavinci/{dapp}:{PINTHEON_VERSION}'
    output = subprocess.check_output(command, cwd=HOME, shell=True, stderr=subprocess.STDOUT)
    loading.Stop()

def _pintheon_start():
    if _docker_container_exists('pintheon'):
      command = 'docker start pintheon'
      return _call(command)
    else:
      port = _pintheon_port()
      dapp = _pintheon_dapp()
      f'docker run -d --name pintheon --pid=host --dns=8.8.8.8 --network bridge -p {port}:443/tcp -v "$(pwd)/pintheon_data:/home/pintheon/data" metavinci/{dapp}:{PINTHEON_VERSION}'
      output = subprocess.check_output(command, cwd=HOME, shell=True, stderr=subprocess.STDOUT)
      print(output)

def _pintheon_stop():
      command = 'docker stop pintheon'
      return _call(command)

def _stellar_load_shared_pub():
      user = None
      for acct in STELLAR_IDS.all():
            if acct['active']:
                  user = acct['name']
                  break
      popup = _password_popup(f'{user}', str(STELLAR_LOGO_IMG))
      pw = popup.value
      if pw != None:
            storage = None
            try:
                  storage =_open_encrypted_storage(pw)
            finally:
                  if storage == None:
                        _msg_popup('Wrong Password', str(STELLAR_LOGO_IMG))
                        _stellar_new_account_popup()

            db = storage['db']
            accounts = storage['accounts']
            find = Query()
            data = accounts.get(find.name == user)

            if data != None:
                  _copy_line_popup("Public Share Key:", data['25519_pub'], str(STELLAR_LOGO_IMG))
                  db.close()
            else:
                  _msg_popup('No keys found', str(STELLAR_LOGO_IMG))

def _stellar_select_shared_pub():
      user =_stellar_account_dropdown_popup()

      popup = _password_popup(f'{user}', str(STELLAR_LOGO_IMG))
      pw = popup.value
      if pw != None:
            storage = None
            try:
                  storage =_open_encrypted_storage(pw)
            finally:
                  if storage == None:
                        _msg_popup('Wrong Password', str(STELLAR_LOGO_IMG))
                        _stellar_new_account_popup()

            db = storage['db']
            accounts = storage['accounts']
            find = Query()
            data = accounts.get(find.name == user)

            if data != None:
                  _copy_line_popup("Public Share Key:", data['25519_pub'], str(STELLAR_LOGO_IMG))
                  db.close()
            else:
                  _msg_popup('No keys found', str(STELLAR_LOGO_IMG))

def _stellar_load_keys():
      keys = None
      user = None
      for acct in STELLAR_IDS.all():
            if acct['active']:
                  user = acct['name']
                  break
      popup = _password_popup(f'{user}', str(STELLAR_LOGO_IMG))
      pw = popup.value
      if pw != None:
            storage = None
            try:
                  storage =_open_encrypted_storage(pw)
            finally:
                  if storage == None:
                        _msg_popup('Wrong Password', str(STELLAR_LOGO_IMG))
                        _stellar_new_account_popup()

            db = storage['db']
            accounts = storage['accounts']
            find = Query()
            data = accounts.get(find.name == user)

            if data != None:
                  keys = Keypair.from_secret(data['secret'])
            else:
                  _msg_popup('No keys found', str(STELLAR_LOGO_IMG))

            return keys

def _stellar_select_keys():
      keys = None
      user = _stellar_account_dropdown_popup()
      popup = _password_popup(f'{user}', str(STELLAR_LOGO_IMG))
      pw = popup.value
      if pw != None:
            storage = None
            try:
                  storage =_open_encrypted_storage(pw)
            finally:
                  if storage == None:
                        _msg_popup('Wrong Password', str(STELLAR_LOGO_IMG))
                        _stellar_new_account_popup()

            db = storage['db']
            accounts = storage['accounts']
            find = Query()
            data = accounts.get(find.name == user)

            if data != None:
                  keys = Keypair.from_secret(data['secret'])
            else:
                  _msg_popup('No keys found', str(STELLAR_LOGO_IMG))
            db.close()
            
            return keys


def _stellar_new_account_popup():
      first_run = (len(STELLAR_IDS.all()) == 0)
      text = 'Enter a Name and Passphrase for the new account:'
      popup = _user_password_popup(text, None, str(STELLAR_LOGO_IMG))
      user = None
      pw = None
      confirm_pw = None

      if not popup:
            return
      
      answer = popup.value
      if answer == None or len(answer['user']) == 0 or len(answer['pw']) == 0:
           _msg_popup('All fields must be filled in.', str(LOGO_WARN_IMG))
           return
           
      if answer != None and answer != '' and answer != 'CANCEL':
            user = answer['user']
            pw = answer['pw']


      if first_run:
            popup = _password_popup('Confirm Account Passphrase.', str(STELLAR_LOGO_IMG))
            confirm_pw = popup.value
      else:
            confirm_pw = pw
      
      if pw == confirm_pw:
            storage = None
            
            try:
                  storage =_open_encrypted_storage(pw)
            finally:
                  if storage == None:
                        _msg_popup('Wrong Password', str(STELLAR_LOGO_IMG))
                        _stellar_new_account_popup()

            db = storage['db']
            accounts = storage['accounts']
            find = Query()
            data = accounts.get(find.name == user)

            if data is None:
                  keypair = Keypair.random()
                  keypair_25519 = Stellar25519KeyPair(keypair)
                  seed = keypair.generate_mnemonic_phrase(strength=256)

                  table = {'data_type': 'STELLAR_ID', 'name': user, 'public':keypair.public_key, '25519_pub':keypair_25519.public_key(), 'active': True}
                  enc_table = {'data_type': 'ACCOUNT', 'name': user, 'public':keypair.public_key, 'secret': keypair.secret, '25519_pub':keypair_25519.public_key(), 'seed': seed}
                  STELLAR_IDS.update({'active': False})

                  if len(accounts.search(find.public == keypair.public_key))==0:
                        accounts.insert(enc_table)
                  else:
                        accounts.update(enc_table, find.public == keypair.public_key)

                  if len(STELLAR_IDS.search(find.public == keypair.public_key))==0:
                        STELLAR_IDS.insert(table)
                  else:
                        STELLAR_IDS.update(table, find.public == keypair.public_key)

                  print(accounts.all())
                  db.close()
                  text = "Seed for new Stellar account has been generated, keep it secure."
                  _copy_text_popup(text, seed, str(STELLAR_LOGO_IMG))
            else:
                  _msg_popup('Account with this name exists already', str(STELLAR_LOGO_IMG))
                  _stellar_new_account_popup()
      else:
            _msg_popup('Passhrases dont match', str(STELLAR_LOGO_IMG))
            _stellar_new_account_popup()


def _stellar_account_dropdown_popup(confirmation=True):
      if len(STELLAR_IDS.all()) == 0:
            _msg_popup('No accounts exist')
            return
      
      accounts = []
      active_idx = 0
      idx = 0

      for acct in STELLAR_IDS.all():
            accounts.append(acct['name'])
            if acct['active']:
                  active_idx = idx
            idx+=1
            
      if active_idx > 0:
            accounts.insert(0, accounts.pop(active_idx))

      text = 'Choose Account:'
      popup = _options_popup(text, accounts, str(STELLAR_LOGO_IMG))
      select = popup.value

      if select != None and select != accounts[0]:
            find = Query()
            STELLAR_IDS.update({'active': False})
            STELLAR_IDS.update({'active': True}, find.name == select)
            if confirmation:
                  _msg_popup(f'Account has been changed to: {select}', str(STELLAR_LOGO_IMG))

      return accounts[0]

def _stellar_remove_account_dropdown_popup(confirmation=True):
      if len(STELLAR_IDS.all()) == 0:
            _msg_popup('No accounts exist')
            return
      accts = []
      active_idx = 0
      idx = 0

      for acct in STELLAR_IDS.all():
            accts.append(acct['name'])
            if acct['active']:
                  active_idx = idx
            idx+=1
            
      if active_idx > 0:
            accts.insert(0, accts.pop(active_idx))

      text = 'Remove Account:'
      popup = _options_popup(text, accts, str(STELLAR_LOGO_IMG))
      select = popup.value

      if select != None:
            answer = _choice_popup(f'Are you sure you want to remove: {select}').value
            if answer == 'OK':
                  popup = _password_popup('Enter the Account Passphrase.', str(STELLAR_LOGO_IMG))
                  pw = popup.value
                  storage = None
                  try:
                        storage =_open_encrypted_storage(pw)
                  finally:
                        if storage == None:
                              _msg_popup('Wrong Password', str(STELLAR_LOGO_IMG))
                              _stellar_new_account_popup()

                  db = storage['db']
                  accounts = storage['accounts']

                  find = Query()
                  
                  if len(accounts.search(find.name == select))>0:
                        accounts.remove(find.name == select)

                  db.close()

                  if len(STELLAR_IDS.search(find.name == select))>0:
                        STELLAR_IDS.remove(find.name == select)

                  active_acct = None
                  
                  if len(STELLAR_IDS.all()) > 0:
                        el = STELLAR_IDS.all()[0]
                        active_acct = STELLAR_IDS.get(doc_id=el.doc_id)
                        STELLAR_IDS.update({'active': True}, find.public == active_acct['public'])

                  if confirmation:
                        if active_acct:
                              _msg_popup(f'{select} account removed, active account is now: {active_acct["name"]}', str(STELLAR_LOGO_IMG))
                        else:
                              _msg_popup('All accounts are removed from the db', str(STELLAR_LOGO_IMG))

cli.add_command(parse_blender_hvym_interactables)
cli.add_command(parse_blender_hvym_collection)
cli.add_command(contract_data)
cli.add_command(collection_data)
cli.add_command(contract_data)
cli.add_command(mat_prop_data)
cli.add_command(anim_prop_data)
cli.add_command(mesh_set_data)
cli.add_command(single_node_data)
cli.add_command(single_mesh_data)
cli.add_command(mesh_data)
cli.add_command(single_float_data)
cli.add_command(slider_float_data)
cli.add_command(single_int_data)
cli.add_command(slider_int_data)
cli.add_command(slider_data)
cli.add_command(menu_data)
cli.add_command(basic_material_data)
cli.add_command(lambert_material_data)
cli.add_command(phong_material_data)
cli.add_command(standard_material_data)
cli.add_command(pbr_material_data)
cli.add_command(icp_install)
cli.add_command(didc_install)
cli.add_command(didc_bind_js)
cli.add_command(didc_bind_js_popup)
cli.add_command(didc_bind_ts)
cli.add_command(didc_bind_ts_popup)
cli.add_command(icp_new_cryptonym)
cli.add_command(icp_id_list)
cli.add_command(icp_use_id)
cli.add_command(icp_use_cryptonym)
cli.add_command(icp_account)
cli.add_command(icp_principal)
cli.add_command(ic_account_is_encrypted)
cli.add_command(icp_principal_hash)
cli.add_command(icp_balance)
cli.add_command(icp_start_assets)
cli.add_command(icp_stop_assets)
cli.add_command(icp_template)
cli.add_command(icp_deploy_assets)
cli.add_command(icp_backup_keys)
cli.add_command(icp_project)
cli.add_command(icp_export_project)
cli.add_command(icp_project_path)
cli.add_command(icp_minter_path)
cli.add_command(icp_minter_model_path)
cli.add_command(icp_custom_client_path)
cli.add_command(icp_model_path)
cli.add_command(icp_account_info)
cli.add_command(icp_set_account)
cli.add_command(icp_new_account)
cli.add_command(icp_new_test_account)
cli.add_command(icp_remove_account)
cli.add_command(icp_active_principal)
cli.add_command(stellar_update_db_pw)
cli.add_command(stellar_load_shared_pub)
cli.add_command(stellar_select_shared_pub)
cli.add_command(stellar_load_keys)
cli.add_command(stellar_select_keys)
cli.add_command(stellar_set_account)
cli.add_command(stellar_new_account)
cli.add_command(stellar_remove_account)
cli.add_command(pinggy_set_token)
cli.add_command(pintheon_port)
cli.add_command(pintheon_dapp)
cli.add_command(pintheon_network)
cli.add_command(pintheon_set_port)
cli.add_command(pintheon_set_network)
cli.add_command(pintheon_setup)
cli.add_command(pintheon_start)
cli.add_command(pintheon_stop)
cli.add_command(pintheon_tunnel)
cli.add_command(img_to_url)
cli.add_command(icp_init)
cli.add_command(icp_update_model)
cli.add_command(icp_update_model_minter)
cli.add_command(icp_update_custom_client)
cli.add_command(icp_assign_canister_id)
cli.add_command(svg_to_data_url)
cli.add_command(png_to_data_url)
cli.add_command(update_npm_modules)
cli.add_command(update_proprium_js_file)
cli.add_command(check)
cli.add_command(up)
cli.add_command(custom_loading_msg)
cli.add_command(custom_prompt)
cli.add_command(custom_choice_prompt)
cli.add_command(custom_copy_line_prompt)
cli.add_command(custom_copy_text_prompt)
cli.add_command(splash)
cli.add_command(test)
cli.add_command(print_hvym_data)
cli.add_command(version)
cli.add_command(about)
# cli.add_command(pintheon_pull_popup)

_ic_update_data(None, True)
_init_app_data()

if __name__ == '__main__':
    cli()
