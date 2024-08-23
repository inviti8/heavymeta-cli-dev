import * as THREE from 'three';
import { gsap } from "gsap";
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as CameraUtils from 'three/addons/utils/CameraUtils.js';
import colorsea from 'colorsea';
import DROID_FONT_JSON from 'three/examples/fonts/droid/droid_sans_regular.typeface.json';
import FONT_JSON from 'three/examples/fonts/droid/droid_sans_regular.typeface.json';
//import FONT_JSON from './fonts/Generic_Techno_Regular.json';
import MINTER_BTN_OBJ from './mintBtn.obj?raw';
import MINTER_LOCK_LOOP from './mintLockLoop.obj?raw';
import MINTER_LOCK_BASE from './mintLockBase.obj?raw';
import PARTICLE1_TEXTURE_URL from './spark1.png'

//Needed hack for pivot points
THREE.Object3D.prototype.updateMatrix = function () {

  this.matrix.compose( this.position, this.quaternion, this.scale );

  if ( this.pivot && this.pivot.isVector3 ) {

    var px = this.pivot.x;
    var py = this.pivot.y;
    var pz = this.pivot.z;

    var te = this.matrix.elements;

    te[ 12 ] += px - te[ 0 ] * px - te[ 4 ] * py - te[ 8 ] * pz;
    te[ 13 ] += py - te[ 1 ] * px - te[ 5 ] * py - te[ 9 ] * pz;
    te[ 14 ] += pz - te[ 2 ] * px - te[ 6 ] * py - te[ 10 ] * pz;

  }

  this.matrixWorldNeedsUpdate = true;

};

//colors
const PRIMARY_COLOR_A = '#37b89e';
let c = colorsea(PRIMARY_COLOR_A, 100).darken(15);
const PRIMARY_COLOR_B = c.hex();
c = colorsea(PRIMARY_COLOR_A, 100).darken(5);
const PRIMARY_COLOR_C = c.hex();
const SECONDARY_COLOR_A = '#ce166f';

const loader = new FontLoader();
const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const textureLoader = new THREE.TextureLoader();
export const stencilRefs = [];//For assigning a unique stencil ref to each clipped material

let PARTICLE1_TEXTURE = undefined;
textureLoader.load(
  // resource URL
  PARTICLE1_TEXTURE_URL,

  // onLoad callback
    ( texture )=> {
      PARTICLE1_TEXTURE = texture;
  },

  // onProgress callback currently not supported
  undefined,

  // onError callback
  ( err )=> {
      console.error( 'An error happened.' );
  }
);

const MINTER_BTN_SHADER = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }
  },
  fragmentShader: document.getElementById('minter-fragment-shader').textContent,
  vertexShader: document.getElementById( 'minter-vertex-shader' ).textContent,
});

let DEFAULT_FONT = loader.parse( FONT_JSON );
let DEFAULT_PRIMARY_MAT_PROPS = materialProperties('BASIC', PRIMARY_COLOR_A);
let DEFAULT_SECONDARY_MAT_PROPS = materialProperties('BASIC', SECONDARY_COLOR_A);
let DEFAULT_TEXT_PROPS = textProperties( DEFAULT_FONT, 0.02, 0.1, 0.1, 0.1, 0.05, 0.05, 1, DEFAULT_SECONDARY_MAT_PROPS);
const MINTER_BTN_MESH = objLoader.parse( MINTER_BTN_OBJ ).children[0];
const MINTER_LOCK_LOOP_MESH = objLoader.parse( MINTER_LOCK_LOOP ).children[0];
const MINTER_LOCK_BASE_MESH = objLoader.parse( MINTER_LOCK_BASE ).children[0];
MINTER_LOCK_LOOP_MESH.material.dispose();
MINTER_LOCK_LOOP_MESH.material = MINTER_BTN_SHADER;
MINTER_LOCK_BASE_MESH.material.dispose();
MINTER_LOCK_BASE_MESH.material = MINTER_BTN_SHADER;

let DEFAULT_SCENE = undefined;
let DEFAULT_MOUSE = undefined;
let DEFAULT_CAMERA = undefined;
let DEFAULT_RAYCASTER = undefined;
let DEFAULT_RENDERER = undefined;
let DEFAULT_CAM_PROPS = undefined;
let HVYM_SCENE = undefined;

export function ParticlePlayerProperties( duration, infinite ){
  return {
    'type': 'PARTICLE_PLAYER_PROPERTIES',
    'duration': duration,
    'infinite': infinite
  }
}

export class HVYM_ParticleAnimation {
  constructor(playerProps) {
    this.is = 'HVYM_PARTICLE_ANIMATION';
    this.player = undefined;
    this.startTime = undefined;
    this.duration = playerProps.duration;
    this.infinite = playerProps.infinite;
    this.deltaTime = 0;
    this.initialized = false;
    this.done = false;
    this.animate = undefined;
  }
  Init(player){
    this.player = player;
    this.initialized = true;
  }
  Play(startTime){
    this.startTime = startTime;
    this.player.playing.push(this);
  }
  Stop(){
    this.player.playing.splice(this.player.playing.indexOf(this));//Remove self from player
  }
  Update(time){
    if(!this.initialized || this.done)
      return;
    this.time = time;
    this.deltaTime = time-this.startTime;
    if(this.infinite)
      return;
    if(this.deltaTime>this.duration){
      this.done = true;
      this.Stop();
    } 
  }
}

export class SpinSystemAnimation extends HVYM_ParticleAnimation {
  constructor(playerProps, speed=0.01, axis=['z'], dir=1) {
    super(playerProps);
    this.type = 'SPIN_SYSTEM_ANIMATION';
    this.name = 'systemSpin';
    this.speed = speed;
    this.axis = axis;
    this.dir = dir;
  } 
};

export class SizePulseAnimation extends HVYM_ParticleAnimation {
  constructor(playerProps, speed=1, pulseAmount=0.25) {
    super(playerProps);
    this.type = 'SIZE_PULSE_ANIMATION';
    this.name = 'particleSizePulse';
    this.speed = speed;
    this.pulseAmount = pulseAmount;
  } 
};

export class OrbitRingAnimation extends HVYM_ParticleAnimation {
  constructor(playerProps, speed=1, dir=1) {
    super(playerProps);
    this.type = 'ORBIT_RING_ANIMATION';
    this.name = 'particleOrbitRing';
    this.speed = speed;
    this.dir = dir;
  } 
};

export class ColorFadeAnimation extends HVYM_ParticleAnimation {
  constructor(playerProps, speed=1, dir=1, colors=[]) {
    super(playerProps);
    this.type = 'COLOR_FADE_ANIMATION';
    this.name = 'particleColorFade';
    this.speed = speed;
    this.dir = dir;
    this.colors = colors;
    this.color = new THREE.Color();
  } 
};

//shape constants: CLOUD, ORBITAL
export function ParticleProperties(color='#ffffff', radius=200, particleSize=20, particleCount=100, shape='CLOUD', randomizeColor=false, texture=undefined, hvymScene=undefined){
  return {
    'type': 'PARTICLE_PROPS',
    'color': color,
    'particleSize': particleSize,
    'particleCount': particleCount,
    'shape': shape,
    'randomizeColor': randomizeColor,
    'radius': radius,
    'texture': texture,
    'hvymScene': hvymScene
  }
};

export class HVYM_Particles {
  constructor(particleProps) {
    this.is = 'HVYM_PARTICLES';
    this.uniforms = {

      pointTexture: { value: particleProps.texture }

    };
    this.shaderMaterial = new THREE.ShaderMaterial( {

      uniforms: this.uniforms,
      vertexShader: document.getElementById( 'vertexshader' ).textContent,
      fragmentShader: document.getElementById( 'fragmentshader' ).textContent,

      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true

    } );
    this.particleSize = particleProps.particleSize;
    this.particleCount = particleProps.particleCount;
    this.shape = particleProps.shape;
    this.randomizeColor = particleProps.randomizeColor;
    this.radius = particleProps.radius;
    this.animProps = particleProps.animProps;
    this.geometry = new THREE.BufferGeometry();
    this.positions = [];
    this.sizes = [];
    this.colors = [];
    this.fadeOutColors = [];
    this.systemAnims = {};
    this.particleAnims = {};
    this.playing = [];
    this.particlePos = new THREE.Vector3();
    this.color = new THREE.Color(particleProps.color);
    this.hvymScene = particleProps.hvymScene;

    this.CreateFadeOutColorAnimation();

    if(this.shape == 'CLOUD'){
      this.Cloud();
    }else if(this.shape == 'ORBITAL'){
      this.Orbital();
    }
    console.log(this)
  }
  PlayAnim(anims, anim){
    let time = this.hvymScene.clock.elapsedTime;
    anims[anim.type] = anim;
    anim.Init(this);
    anim.Play(time);
  }
  PlaySystemAnim(systemAnim){
    this.PlayAnim(this.systemAnims, systemAnim);
  }
  PlayParticleAnim(particleAnim){
    this.PlayAnim(this.particleAnims, particleAnim);
  }
  Cloud(){
    for ( let i = 0; i < this.particleCount; i ++ ) {

      this.positions.push( ( Math.random() * 2 - 1 ) * this.radius );
      this.positions.push( ( Math.random() * 2 - 1 ) * this.radius );
      this.positions.push( ( Math.random() * 2 - 1 ) * this.radius );

      if(this.randomizeColor){
        this.color.setHSL( i / this.particleCount, 1.0, 0.5 );

        this.colors.push( this.color.r, this.color.g, this.color.b );
      }else{
        this.colors.push( this.color.r, this.color.g, this.color.b );
      }
      
      this.sizes.push( this.particleSize );

    }

    this.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( this.positions, 3 ) );
    this.geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( this.colors, 3 ) );
    this.geometry.setAttribute( 'size', new THREE.Float32BufferAttribute( this.sizes, 1 ).setUsage( THREE.DynamicDrawUsage ) );

    this.particleSystem = new THREE.Points( this.geometry, this.shaderMaterial );
    this.particleSystem.renderOrder = 999;
    this.particleSystem.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

    this.hvymScene.addParticleSystem(this);
  }
  Orbital(){
    for ( let i = 0; i < this.particleCount; i ++ ) {
      let angle = i * ( 2 * Math.PI / this.particleCount );
      this.positions.push( ( this.radius ) * Math.cos( angle ) );
      this.positions.push( ( this.radius ) * Math.sin( angle ) );
      this.positions.push( 0 );

      if(this.randomizeColor){
        this.color.setHSL( i / this.particleCount, 1.0, 0.5 );

        this.colors.push( this.color.r, this.color.g, this.color.b );
      }else{
        this.colors.push( this.color.r, this.color.g, this.color.b );
      }
    
      this.sizes.push( this.particleSize );

    }

    this.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( this.positions, 3 ) );
    this.geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( this.colors, 3 ) );
    this.geometry.setAttribute( 'size', new THREE.Float32BufferAttribute( this.sizes, 1 ).setUsage( THREE.DynamicDrawUsage ) );

    this.particleSystem = new THREE.Points( this.geometry, this.shaderMaterial );
    this.particleSystem.renderOrder = 999;
    this.particleSystem.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

    this.hvymScene.addParticleSystem(this);

    this.shaderMaterial.opacity = 0;

  }
  Taper(dir=1){
    let totalParticles = this.sizes.length;
    let taper = 1 / totalParticles;
  
    if (dir === 1) { // ascending order
        this.sizes.forEach((size, i) => {
          this.sizes[i]=this.particleSize * ((totalParticles-i) * taper); 
         });
    } else if (dir === -1) { // descending order
        for(let i = totalParticles-1; i >= 0; i--){
          this.sizes[i]=this.particleSize * ((totalParticles-i) * taper); 
         }
    } 
    this.geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(this.sizes), 1));
  }
  Update(delta){
    if(Object.keys(this.systemAnims).length == 0 && Object.keys(this.particleAnims).length == 0)
        return;

    let time = this.hvymScene.clock.elapsedTime;
    let animSets = [this.systemAnims, this.particleAnims];
    let self = this;

    this.playing.forEach((anim, idx) => {
      anim.Update(time);
      self[anim.name](anim);
    });

    this.geometry.attributes.size.needsUpdate = true;
  }
  CreateFadeOutColorAnimation(){
    let colors = [];
    const playerProps = ParticlePlayerProperties( 0.5, false );
    for ( let i = 0; i < this.particleCount; i ++ ) {
      colors.push( 0.0, 0.0, 0.0 );
    }
    this.fadeInColorAnim = new ColorFadeAnimation(playerProps, 1, 1, this.colors);
    this.fadeOutColorAnim = new ColorFadeAnimation(playerProps, 1, -1, colors);
  }
  FadeColorsIn(){
    this.PlayParticleAnim(this.fadeInColorAnim);
  }
  FadeColorsOut(){
    this.PlayParticleAnim(this.fadeOutColorAnim);
  }
  particleColorFade(anim){
    let currentColors = this.geometry.getAttribute( 'color' );
    let colors = [];//new colors
    const maxValue = 100;
    const minValue = 0;
    let amount = minValue;
    if(anim.dir==-1){
      amount = maxValue;
    }

    if (anim.dir == 1){ 
      amount = Math.min(amount + anim.deltaTime * anim.speed, maxValue);
    } else if (anim.dir == -1){
      amount = Math.max(amount - anim.deltaTime * anim.speed, minValue);
    }

    for (let i = 0; i < this.colors.length; i += 3) {
      const r = this.colors[i];
      const g = this.colors[i+1];
      const b = this.colors[i+2];
      anim.color.set(r, g, b);
      let c = colorsea('#'+anim.color.getHexString(), 100).darken(amount);
      let rgb = c.rgb();
      anim.color = new THREE.Color(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
      colors.push( anim.color.r, anim.color.g, anim.color.b );
    }  

    this.geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
  }
  systemSpin(anim){
    for ( let i = 0; i < anim.axis.length; i ++ ) {
      this.particleSystem.rotation[anim.axis[i]] = anim.dir*(anim.speed * anim.time);
    }
  }
  particleSizePulse(anim){;
    const sizes = this.geometry.attributes.size.array;

    for ( let i = 0; i < this.particleCount; i ++ ) {

      sizes[ i ] = this.particleSize * (( 2 + Math.sin( 0.1 * i + (anim.time*anim.speed) ) )*anim.pulseAmount);

    }
  }
  particleOrbitRing(anim) {
    for (let i = 0; i < this.positions.length; i += 3) {
      let angle = (i * ( 2 * Math.PI / this.positions.length ));
      let angleOffset = THREE.MathUtils.degToRad(anim.time*anim.speed)*anim.dir;
      let x = this.radius * Math.cos(angle + angleOffset);
      let y = this.radius * Math.sin(angle + angleOffset);
        // Set the new positions
      this.positions[i]   = x;
      this.positions[i+1] = y;
      this.positions[i+2] = 0;
    }
    this.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( this.positions, 3 ) );
  }
}

export function createParticleStarField(hvymScene, color='#ffffff', radius=200, size=20, particleCount=100, sysDir=1) {
  const playerProps = ParticlePlayerProperties( 0, true );
  const particleProps = ParticleProperties(color, radius, size, particleCount);
  particleProps.hvymScene = hvymScene;
  const particles = new HVYM_Particles(particleProps);
  particles.PlaySystemAnim(new SpinSystemAnimation(playerProps, 0.01, ['z'], sysDir));
  particles.PlayParticleAnim(new SizePulseAnimation(playerProps,5, 0.25));
  return particles;
}

export function createOrbitRing(hvymScene, color='#ffffff', radius=1, size=1, particleCount=10, axis=['y'], taper=1, dir=1, sysDir=1) {
  let randColor = false;
  if(color=='RANDOM'){
    randColor = true;
  }
  const playerProps = ParticlePlayerProperties( 0, true );
  const particleProps = ParticleProperties(color, radius, size, particleCount, 'ORBITAL', randColor, hvymScene.loadingTexture, hvymScene);
  const particles = new HVYM_Particles(particleProps);
  particles.Taper(taper);
  particles.PlaySystemAnim(new SpinSystemAnimation(playerProps, 1, axis, sysDir));
  particles.PlayParticleAnim(new OrbitRingAnimation(playerProps, 200, dir));
  return particles;
}


export function OutlineProperties(color='#ffffff', edgeStrength=5.0, edgeGlow=0, edgeThickness=0.01, pulsePeriod=0){
  return {
    'type': 'OUTLINE_PROPS',
    'color': color,
    'edgeStrength': edgeStrength,
    'edgeGlow': edgeGlow,
    'edgeThickness': edgeThickness,
    'pulsePeriod': pulsePeriod
  }
};

/**
 * This function creates a new post process fx object,
 * @param {object} HVYM_Scene.
 * @param {object} OUTLINE_PROPS.
 * 
 * @returns {object} Heavymeta scene class object.
 */
export class HVYM_PostProcessFx {
  constructor(hvymScene, outlineData, composer) {
    this.is = 'HVYM_POSTFX';
    this.hvymScene = hvymScene;
    this.outlineData = outlineData;
    this.composer = composer;
    //this.composer = new EffectComposer( this.hvymScene.renderer );
    this.renderPass = new RenderPass( this.hvymScene.scene, this.hvymScene.camera );
    this.composer.addPass( this.renderPass );

    this.outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), this.hvymScene.scene, this.hvymScene.camera );
    this.composer.addPass( this.outlinePass );

    this.outputPass = new OutputPass();
    this.composer.addPass( this.outputPass );

    this.effectFXAA = new ShaderPass( FXAAShader );
    this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
    this.composer.addPass( this.effectFXAA );
  }
  getOutlineData(){
    return this.outlineData;
  }
  updateOutline(){
    this.outlinePass.visibleEdgeColor = this.outlineData.color;
    this.outlinePass.edgeStrength = this.outlineData.edgeStrength;
    this.outlinePass.edgeGlow = this.outlineData.edgeGlow;
    this.outlinePass.edgeThickness = this.outlineData.edgeThickness;
    this.outlinePass.pulsePeriod = this.outlineData.pulsePeriod;
  }
  outlineObjects(arr){
    this.outlinePass.selectedObjects = arr;
  }
  composerRender(){
    this.composer.render();
  }
}


export function CamControlProperties(autoRotate=true, minPolarAngle=0, maxPolarAngle=Math.PI, enableZoom=true, minDistance=0, maxDistance=Infinity, enableDamping=true, camControls=undefined){
  return {
    'type': 'CAM_CTRL_PROPS',
    'autoRotate': autoRotate,
    'minPolarAngle': minPolarAngle,
    'maxPolarAngle': maxPolarAngle,
    'enableZoom': enableZoom,
    'minDistance': minDistance,
    'maxDistance': maxDistance,
    'enableDamping': enableDamping,
    'camControls': camControls
  }
};

export function MainSceneProperties(scene=undefined, mouse=undefined, camera=undefined, renderer=undefined, raycaster=undefined, raycastLayer=0, camControlProps=CamControlProperties()){
  return {
    'type': 'MAIN_SCENE_PROPS',
    'scene': scene,
    'mouse': mouse,
    'camera': camera,
    'renderer': renderer,
    'raycaster': raycaster,
    'raycastLayer': raycastLayer,
    'camControlProps': camControlProps
  }
};

export function DefaultSceneProperties(){
  DEFAULT_SCENE = new THREE.Scene();
  DEFAULT_CAMERA = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  DEFAULT_CAMERA.name = 'MAIN_CAM';
  DEFAULT_MOUSE = new THREE.Vector2();
  DEFAULT_RAYCASTER = new THREE.Raycaster();
  

  let lastClick = 0;

  DEFAULT_RENDERER = new THREE.WebGLRenderer({antialias: true });
  DEFAULT_RENDERER.toneMapping = THREE.ACESFilmicToneMapping;
  DEFAULT_RENDERER.setSize(window.innerWidth, window.innerHeight);
  DEFAULT_RENDERER.localClippingEnabled = true;
  document.body.appendChild(DEFAULT_RENDERER.domElement);


  return MainSceneProperties(DEFAULT_SCENE, DEFAULT_MOUSE, DEFAULT_CAMERA, DEFAULT_RENDERER, DEFAULT_RAYCASTER, 0, CamControlProperties())
};


export class HVYM_FileHandler {
  constructor(minter) {
    this.is = 'FILE_HANDLER';
    this.minter = minter;
    this.MAX_CHUNK_SIZE = 1024 * 500;//500kb
  }
  fileInfo(imgFile, chunkCount){
    return {
      'name': Math.random().toString(36).substring(2),
      'createdAt': BigInt(Number(Date.now() * 1000)),
      'size': imgFile.size,
      'chunkCount': BigInt(chunkCount),
      'extension': this.getFileExtension(imgFile.type)
    }
  }
  getFileExtension(type) {
    switch(type) {
      case 'image/jpeg':
        return { 'jpeg' : null };
      case 'image/gif':
        return { 'gif' : null };
      case 'image/jpg':
        return { 'jpg' : null };
      case 'image/png':
        return { 'png' : null };          
      case 'image/svg':
        return { 'svg' : null };          
      case 'video/avi':
        return { 'avi' : null };                            
      case 'video/aac':
        return { 'aac' : null };
      case 'video/mp4':
        return { 'mp4' : null };        
      case 'audio/wav':
        return { 'wav' : null };                         
      case 'audio/mp3':
        return { 'mp3' : null };
      default :
      return null;
    }
  }
  getReverseFileExtension(type){
    switch(Object.keys(type)[0]) {
      case 'jpeg':
        return  'image/jpeg';
      case 'gif':
        return  'image/gif'; 
      case 'jpg':
        return  'image/jpg';       
      case 'png':
        return  'image/png';
      case 'svg':
        return  'image/svg';
      case 'avi':
        return  'video/avi';
      case 'mp4':
        return  'video/mp4';
      case 'aac':
        return  'video/aac';
      case 'wav':
        return  'audio/wav';
      case 'mp3':
        return  'audio/mp3';                                                                                                              
      default :
      return "";
    }
  }
  encodeArrayBuffer(file){
    return Array.from(new Uint8Array(file));
  }
  async processAndUploadChunk (blob, byteStart, fileId, chunk, fileSize){
    const blobSlice = blob.slice(
      byteStart,
      Math.min(Number(fileSize), byteStart + this.MAX_CHUNK_SIZE),
      blob.type
    );
    const bsf = await blobSlice.arrayBuffer();

    return this.minter.putChunks(fileId, BigInt(chunk), this.encodeArrayBuffer(bsf))
  }
  async uploadPNG(base64Img) {
    console.log('start upload');
    const promises = [];
    
    const response = await fetch(base64Img);
    const blob = await response.blob();
    const file = new File([blob], 'temp', { type: 'image/png' });
    const chunks = Number(Math.ceil(file.size / this.MAX_CHUNK_SIZE));

    const fileInfo = this.fileInfo(file, chunks);

    const fileIdArr = await this.minter.putFile(fileInfo);
    const fileId = fileIdArr[0];
    const putChunkPromises = new Array(chunks).fill().map(() => new Promise((resolve) => resolve()));

    let chunk = 1;
    for (let byteStart = 0; byteStart < blob.size; byteStart += this.MAX_CHUNK_SIZE, chunk++ ) {
      putChunkPromises.push(
        this.processAndUploadChunk(blob, byteStart, fileId, chunk, file.size)
      );
    }

    await Promise.all(putChunkPromises);

    return fileId
  }
  async getPNG(fileInfo){
    const chunks = [];
    for (let i = 1; i <= Number(fileInfo.chunkCount); i++) {
      const chunk = await this.minter.getChunks(fileInfo.fileId, BigInt(i));
      if (chunk[0]) {
        chunks.push(new Uint8Array(chunk[0]).buffer);
      }
    }

    const blob = new Blob(chunks, { type: 'image/png' } );
    const url = URL.createObjectURL(blob);
    const file = new File([blob], fileInfo.name, { type: 'image/png' });
    file.src = url;

    return file
  }
  async getFileInfo(fileId){
    const files = await this.minter.getFileInfo(fileId);
  }
  async getAllFilesInfo(){
    const files = await this.minter.getInfo();
  }
}

/**
 * This function creates a Model Client object
 * 
 * @returns {object} gltfPath path to the gltf file.
 * @returns {object} hvymScene HVYM_Scene object.
 */
export class ModelClient {
  constructor(gltfPath, hvymScene) {
    this.is = 'HVYM_MODEL_CLIENT';
    this.hvymScene = hvymScene;
    this.boxProps = defaultModelBoxProps('box', this.hvymScene.origin);
  }
  LoadModel(gltfPath, hvymData=undefined, setupCallback=undefined){
    this.gltfPath = gltfPath;
    this.gltfProps = gltfProperties(this.hvymScene, this.boxProps, '', this.gltfPath);
    this.gltfProps.boxProps.isPortal = false;
    const self = this;

    console.log('this.gltfProps!!!!!!!!!!!!!!!!!!!!!!!')
    console.log(this.gltfProps)
    // Instantiate a loader
    gltfLoader.load( this.gltfProps.gltf,function ( gltf ) {
        self.hvymScene.toggleLoading();
        console.log(gltf)
        if(hvymData!=undefined){
          self.gltfProps.hvymData = new HVYM_Data(gltf, self.hvymScene, hvymData);
        }else{
          self.gltfProps.hvymData = new HVYM_Data(gltf, self.hvymScene);
        }
        self.hvymData = self.gltfProps.hvymData;
        console.log(self.gltfProps.hvymData)
        self.gltfProps.gltf = gltf;
        self.SetupModelWidget(self.gltfProps, setupCallback);
      },
      // called while loading is progressing
      function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      // called when loading has errors
      function ( error ) {
        console.log( error );
      }
    );
  }
  ReloadModel(hvymData=undefined){
    if(!this.gltfPath)
      return;

    if(this.widget!=undefined){
      this.DestroyLoadedModel();
    }
    this.LoadModel(this.gltfPath, hvymData);
  }
  DestroyLoadedModel(){
    this.widget.RemoveSelf();
    this.hvymScene.renderer.renderLists.dispose();
    this.widget = undefined;
  }
  SetupModelWidget(gltfProps, setupCallback=undefined){
    if(typeof DEFAULT_TEXT_PROPS.font === 'string'){
      // Load the font
      loader.load(DEFAULT_TEXT_PROPS.font, (font) => {
        DEFAULT_TEXT_PROPS.font = font;
        ListItemBox.SetListConfigFont(gltfProps.listConfig, font);
        this.widget = new GLTFModelWidget(gltfProps);
        this.widget.scene.gltfModels.push(this.widget);
        if(setupCallback!=undefined){
          setupCallback(this);
        }
      });
    }else if(DEFAULT_TEXT_PROPS.font.isFont){
      ListItemBox.SetListConfigFont(gltfProps.listConfig, DEFAULT_TEXT_PROPS.font);
      this.widget = new GLTFModelWidget(gltfProps);
      this.widget.scene.gltfModels.push(this.widget);
      if(setupCallback!=undefined){
        setupCallback(this);
      }
    }

    this.hvymScene.toggleLoading();
  }
}

/**
 * This function creates a Internet Computer
 * Authenticated Minter Client Object.
 * 
 * @returns {object} Heavymeta scene class object.
 * @returns {object} authClient @dfinity/auth-client
 * @returns {object} httpAgent @dfinity/agent
 */
export class IC_MinterClient {
  constructor(hvymScene, AuthClient, HttpAgent, createActor, idProvider, minterBackend, debug=false) {
    this.is = 'INTERNET_COMPUTER_NFT_MINTER_CLIENT';
    this.hvymScene = hvymScene;
    this.AUTH_CLIENT = AuthClient;
    this.HTTP_AGENT = HttpAgent;
    this.CREATE_ACTOR = createActor;
    this.ID_PROVIDER = idProvider;
    this.MINTER_BACKEND = minterBackend;
    this.authClient = undefined;
    this.httpAgent = undefined;
    this.principal = undefined;
    this.minter = undefined;
    this.released = false;

    this.addAuthButton();
  }
  addAuthButton(){
    let buttonProps = defaultPanelButtonProps(this.hvymScene, 'LOGIN', this.hvymScene.rightAnchor, DEFAULT_FONT);
    this.authButton = ButtonElement(buttonProps);
    this.authButton.box.userData.state = 'initial';
    this.authButton.box.userData.loggedIn = false;
    this.authButton.box.position.set(-0.25,0,0.1);
    this.authButton.SetButtonOnTopRendering();
    const self = this;

    return this.authButton

  }
  async ReleaseMinter(){
    this.released = await this.minter.release(this.principal);
  }
  async authenticate(){
    if(!this.authButton.box.userData.loggedIn && this.authButton.box.userData.state == 'initial'){
      this.hvymScene.toggleLoading();
      try{
        this.authClient = await this.AUTH_CLIENT.create();
      }catch(err){
        console.log(err);
      }
          
      try{
        await new Promise((resolve) => {
          this.authClient.login({
              identityProvider: this.ID_PROVIDER,
              onSuccess: resolve,
          });
        });
      }catch(err){
        console.log(err);
      }
      // start the login process and wait for it to finish
      this.authButton.box.userData.loggedIn = true;

      // At this point we're authenticated, and we can get the identity from the auth client:
      const identity = this.authClient.getIdentity();
      this.principal = identity.getPrincipal();
      // Using the identity obtained from the auth client, we can create an agent to interact with the IC.
      const agent = new this.HTTP_AGENT({identity});
      // Using the interface description of our webapp, we create an actor that we use to call the service methods.
      this.minter = this.CREATE_ACTOR(this.MINTER_BACKEND, {
            agent,
      });
      this.fileHandler = new HVYM_FileHandler(this.minter);
      try{
            this.released = await this.minter.isReleased();
      }catch(err){
            console.log(err);
      }
      this.hvymScene.toggleLoading();

      if(!this.released){
            this.authButton.box.userData.state = 'unreleased'
            this.authButton.UpdateText('RELEASE');
      }else{
            this.authButton.box.userData.state = 'authorized'
            this.authButton.UpdateText('LOGOUT');
      }
    }else{

      if(this.authButton.box.userData.loggedIn && this.authButton.box.userData.state == 'unreleased'){
            if(this.minter != undefined || this.principal != undefined){
                this.hvymScene.toggleLoading(true);
                try{
                    await this.ReleaseMinter();
                }catch(err){
                    console.log(err);
                }
                
                this.hvymScene.toggleLoading(true);
                if(!this.released){
                    this.authButton.box.userData.state = 'unauthorized';
                    this.authButton.UpdateText('LOGOUT');
                    alert('UNAUTHORIZED');
                }
            }
        }else if(window.confirm('Are you sure you want to logout?')){
            this.hvymScene.toggleLoading();
            await this.authClient.logout();
            this.hvymScene.toggleLoading();
            this.authButton.box.userData.loggedIn = false;
            this.authButton.UpdateText('LOGIN');
        }

    }
  }
  FormatMetadataDesc(description, tag, data){
    return   [{
        purpose: {"Rendered": null}, // or '#Rendered'
        key_val_data: [
          {key: "description", val: {TextContent: description}},
          {key: "tag", val: {TextContent: tag}},
          {key: "contentType", val: {TextContent: "text/plain"}},
          {key: "locationType", val: {Nat8Content: 8}}
          ], 
        data: data 
    }];
  }
}

export class IC_ModelMinterClient extends IC_MinterClient {
  constructor(gltfPath, hvymScene, AuthClient, HttpAgent, createActor, idProvider, minterBackend, debug=false) {
    super(hvymScene, AuthClient, HttpAgent, createActor, idProvider, minterBackend)
    this.is = 'INTERNET_COMPUTER_MODEL_NFT_MINTER_CLIENT';
    this.boxProps = defaultModelBoxProps('box', this.hvymScene.origin);
    this.debug = debug;
    this.activeTokenId = undefined;
    this.loadedNFTs = {};
    this.LoadModel(gltfPath);

    const self = this;
    this.authButton.box.addEventListener('action', function(event) {
      if(self.hvymScene.isLoading)
        return;
      self.authenticate();
    });

  }
  LoadModel(gltfPath, hvymData=undefined){
    this.gltfPath = gltfPath;
    this.gltfProps = gltfProperties(this.hvymScene, this.boxProps, '', this.gltfPath);
    this.gltfProps.boxProps.isPortal = false;
    const self = this;

    if(typeof this.gltfProps.gltf === 'string'){
      // Instantiate a loader
      gltfLoader.load( this.gltfProps.gltf,function ( gltf ) {
          self.hvymScene.toggleLoading();
          console.log(gltf)
          if(hvymData!=undefined){
            self.gltfProps.hvymData = new HVYM_Data(gltf, self.hvymScene, hvymData);
          }else{
            self.gltfProps.hvymData = new HVYM_Data(gltf, self.hvymScene);
          }
          console.log(self.gltfProps.hvymData)
          self.gltfProps.gltf = gltf;
          self.SetupModelWidget(self.gltfProps);
        },
        // called while loading is progressing
        function ( xhr ) {
          console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
          console.log( error );
        }
      );
    }
  }
  ReloadModel(hvymData=undefined){
    if(!this.gltfPath)
      return;

    if(this.widget!=undefined){
      this.DestroyLoadedModel();
    }
    this.LoadModel(this.gltfPath, hvymData);
  }
  DestroyLoadedModel(){
    this.widget.RemoveSelf();
    this.hvymScene.renderer.renderLists.dispose();
    this.widget = undefined;
  }
  SetupModelWidget(gltfProps){
    if(typeof DEFAULT_TEXT_PROPS.font === 'string'){
      // Load the font
      loader.load(DEFAULT_TEXT_PROPS.font, (font) => {
        DEFAULT_TEXT_PROPS.font = font;
        ListItemBox.SetListConfigFont(gltfProps.listConfig, font);
        this.widget = new GLTFModelWidget(gltfProps);
        this.widget.scene.gltfModels.push(this.widget);
      });
    }else if(DEFAULT_TEXT_PROPS.font.isFont){
      ListItemBox.SetListConfigFont(gltfProps.listConfig, DEFAULT_TEXT_PROPS.font);
      this.widget = new GLTFModelWidget(gltfProps);
      this.widget.scene.gltfModels.push(this.widget);
    }

    if(this.minter!=undefined && !this.minter.buttonCallbacksAssigned){
      console.log('this.assignMinterToWidget()')
      this.assignMinterToWidget();
    }

    this.hvymScene.toggleLoading();
  }
  HandleMinterButton(){
    if(this.released){
      this.widget.UnlockMinterAnimation();
    }
  }
  async ReleaseMinter(){
    await super.ReleaseMinter();
    this.HandleMinterButton();
  }
  async AddMinterDebugPanel(){
    this.isCreator = await this.minter.isCreator(this.principal);
    console.log('this.isCreator')
    console.log(this.isCreator)
    if(this.isCreator){
      this.debugPanel = this.widget.CreateMinterDebugPanel();
    }
  }
  async assignMinterToWidget(){
    this.widget.SetMinterClient(this);
    this.widget.buttonCallbacks = gltfButtonCallbackConfig(this.mint);
    this.widget.AssignButtonCallbacks();

    if(this.debug && this.debugPanel == undefined){
      this.AddMinterDebugPanel();
      this.HandleMinterButton();
    }
  }
  async authenticate(){
    await super.authenticate();
    if(this.minter!=undefined && !this.minter.buttonCallbacksAssigned){
      this.assignMinterToWidget();
    }
    if(!this.authButton.box.userData.loggedIn && this.authButton.box.userData.state == 'unauthorized'){
      this.widget.RemoveMinterDebugPanel();
      this.authButton.box.userData.state = 'initial';
      this.debugPanel = undefined;
    }
  }
  canMakeLocalCall(call_str){
    let result = true;
    const authorized = ['loadNFT'];
    if(!authorized.includes(call_str))
      result = false;

    return result
  }
  localCall(call_str){
    if(!this.canMakeLocalCall(call_str))
      return;

    this[call_str]();
  }
  localStringCall(call_str, str){
    if(!this.canMakeLocalCall(call_str))
      return;

    this[call_str](str);
  }
  localNumericCall(call_str, num){
    if(!this.canMakeLocalCall(call_str))
      return;

    this[call_str](num);
  }
  canMakeCall(call_str){
    let result = true;
    if(this.minter == undefined || this.principal == undefined || !this.minter.hasOwnProperty(call_str))
      result = false;

    return result
  }
  async getModelNFTProps(tokenId){
    let result = undefined;
    const response = await this.getTokenMetadataForUser(tokenId);
    if(response.hasOwnProperty('Ok')){
      const payload = response.Ok;
      const metadata = JSON.parse(new TextDecoder().decode(payload.metadata_desc[0].data));
      const fileInfo = await this.getFileInfo(payload.image_id);
      const image = await this.fileHandler.getPNG(fileInfo[0]);

      result = this.ModelNFTProperties(tokenId, metadata, image);
    }
    console.log(result)
    return result
  }
  async loadNFT(tokenId){
    let tokenIds = await this.getTokenIdsForUser();
    let arr = Array.from(tokenIds).map((num) => Number(num));
    if(arr.includes(tokenId)){
      this.activeTokenId = tokenId;
      this.loadedNFTs[tokenId] = await this.getModelNFTProps(tokenId);
      if(this.loadedNFTs[tokenId]){
        const metadata = this.loadedNFTs[tokenId].metadata;
        this.ReloadModel(metadata);
      }
    }
  }
  async showNFTImage(tokenId){

  }
  async balanceOf(){
    return await this.call('balanceOf');
  }
  async ownerOf(tokenId){
    return await this.numericCall('ownerOf', tokenId);
  }
  async getTokenMetadataForUser(tokenId){
    return await this.numericCall('getTokenMetadataForUser', tokenId);
  }
  async nftLogo(){
    return await this.simple_query('nftLogo');
  }
  async nftName(){
    return await this.simple_query('nftName');
  }
  async nftSymbol(){
    return await this.simple_query('nftSymbol');
  }
  async totalSupply(){
    return await this.simple_query('totalSupply');
  }
  async getMetaData(tokenId){
    return await this.numericCall('getMetaData', tokenId);
  }
  async getImageId(tokenId){
    return await this.numericCall('getImageId', tokenId);
  }
  async getFileInfo(tokenId){
    return await this.numericQuery('getFileInfo', tokenId);
  }
  async getMaxLimit(){
    return await this.simple_query('getMaxLimit');
  }
  async getMetadataForUser(){
    return await this.call('getMetadataForUser');
  }
  async getTokenIdsForUser(){
    return await this.call('getTokenIdsForUser');
  }
  async mint( img, metaData){
    if(!this.canMakeCall('mint'))
      return;
    this.hvymScene.toggleLoading(true);
    const fileId = await this.fileHandler.uploadPNG( img );
    const result = await this.minter.mint(this.principal, fileId, metaData);
    this.hvymScene.toggleLoading(true);

    return result
  }
  async simple_query(call_str){
    if(!this.canMakeCall(call_str))
      return;
    this.hvymScene.toggleLoading(true);
    const result = await this.minter[call_str]();
    this.hvymScene.toggleLoading(true);

    return result
  }
  async call(call_str){
    if(!this.canMakeCall(call_str))
      return;
    this.hvymScene.toggleLoading(true);
    const result = await this.minter[call_str](this.principal);
    this.hvymScene.toggleLoading(true);

    console.log(result)

    return result
  }
  async incrementCall(call_str){
    const call = 'increment_'+call_str;
    if(!this.canMakeCall(call))
      return;
    this.hvymScene.toggleLoading(true);
    const result = await this.minter[call](this.principal);
    this.hvymScene.toggleLoading(true);

    return result
  }
  async decrementCall(call_str){
    const call = 'decrement_'+call_str;
    if(!this.canMakeCall(call))
      return;
    this.hvymScene.toggleLoading(true);
    const result = await this.minter[call](this.principal);
    this.hvymScene.toggleLoading(true);

    return result
  }
  async stringCall(call_str, str){
    if(!this.canMakeCall(call_str))
      return;
    this.hvymScene.toggleLoading(true);
    const result = await this.minter[call_str](this.principal, str);
    this.hvymScene.toggleLoading(true);

    return result
  }
  async numericCall(call_str, num){
    if(!this.canMakeCall(call_str))
      return;
    this.hvymScene.toggleLoading(true);
    const result = await this.minter[call_str](this.principal, num);
    this.hvymScene.toggleLoading(true);

    return result
  }
  async numericQuery(call_str, num){
    if(!this.canMakeCall(call_str))
      return;
    this.hvymScene.toggleLoading(true);
    const result = await this.minter[call_str](num);
    this.hvymScene.toggleLoading(true);

    return result
  }
  ModelNFTProperties(tokenId, metadata, image){
    return {
      'type': 'MODEL_NFT_PROPS',
      'tokenId': tokenId,
      'metadata': metadata,
      'image': image
    }
  }
}

/**
* This function creates a Internet Computer
* Custom Client Object.
* 
* @returns {object} gltfPath path to the gltf file.
* @returns {object} hvymScene HVYM_Scene object.
* @returns {object} actor icp compiled motoko backend
*/
export class IC_CustomClient extends ModelClient{
  constructor(gltfPath, hvymScene, actor) {
    super(gltfPath, hvymScene)
    this.is = 'INTERNET_COMPUTER_CUSTOM_CLIENT';
    this.hvymScene = hvymScene;
    this.actor = actor;
    this.clientCallbacks = {};
    this.LoadModel(gltfPath, undefined, this.SetupInteractables);
  }
  SetupInteractables(self){
    self.widget.SetCustomClient(self);
    self.hvymData.AssignInteractableCallbacks(self);
  }
  canMakeCall(call_str){
    let result = true;
    if(this.actor == undefined || !this.actor.hasOwnProperty(call_str))
      result = false;

    return result
  }
  addClientCallback(name, callback){
    this.clientCallbacks[name] = callback;
  }
  async call(method, arg=undefined){
    if(!this.canMakeCall(method))
      return;
    let result = undefined;

    if(arg!=undefined){
      result = await this.actor[method](arg);
    }else{
      result = await this.actor[method]();
    }

    if(Object.keys(this.clientCallbacks).length==0){
      console.log(result);
    }else{
      if(arg!=undefined){
        this.clientCallbacks[method](arg);
      }else{
        this.clientCallbacks[method]();
      }
    }
  }
}

/**
 * This function creates a new scene, sets up lighting,
 * handles scene interactions and updates.
 * @param {object} gltf loaded gltf object.
 * 
 * @returns {object} Heavymeta scene class object.
 */
export class HVYM_Scene {
  constructor(sceneProps) {
    this.is = 'HVYM_SCENE';
    this.scene = sceneProps.scene;
    this.mouse = sceneProps.mouse;
    this.camera = sceneProps.camera;
    this.renderer = sceneProps.renderer;
    this.raycaster = sceneProps.raycaster;
    this.clock = new THREE.Clock();
    this.utils = new HVYM_Utils();
    this.anims = new HVYM_Animation(this);
    this.raycaster = sceneProps.raycaster;
    this.draggable = [];
    this.mouseOverable = [];
    this.clickable = [];
    this.interactables = [];
    this.meshActions = [];
    this.rayBlockers = [];
    this.inputPrompts = [];
    this.inputText = [];
    this.selectorElems = [];
    this.toggles = [];
    this.stencilRefs = [];//For assigning a unique stencil ref to each clipped material
    this.gltfModels = [];
    this.particleSystems = [];
    this.loadingFx = [];
    this.postProcessFx = false;
    this.hudPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
    this.hudPlanePos = new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z+1);
    this.cornerOrigin = new THREE.Vector2(-1, -1);
    this.inverseOrigin = new THREE.Vector2(1, 1);
    this.topRight = new THREE.Vector2(1, 1);
    this.loadingFxActive = false;

    //Interaction variables
    this.mouseDown = false;
    this.lastClicked = undefined;
    this.isDragging = false;
    this.lastDragged = undefined;
    this.previousMouseX = 0;
    this.previousMouseY = 0;
    this.moveDir = 1;
    this.dragDistX = 0;
    this.dragDistY = 0;
    this.lastClick = 0;
    this.mouseOver = [];
    this.isLoading = false;
    this.activeEditText = undefined;

    this.ambientLight = new THREE.AmbientLight('white');
    this.ambientLight.name = 'MAIN_AMBIENT_LIGHT'
    sceneProps.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.name = 'MAIN_DIRECTIONAL_LIGHT'
    this.directionalLight.position.set(1, 1, 1);
    this.scene.add(this.directionalLight);
    this.scene.add(this.camera);
    HVYM_SCENE = this;

    this.setupScrim();
    this.setupHudAnchors();
    this.setupRenderBounds();

  }
  renderImage(){
    this.renderer.render(this.scene, this.camera);
    let imgData = this.renderer.domElement.toDataURL();
    let img = new Image();
    img.src = imgData;

    return img
  }
  setupRenderBounds(){
    const geometry = new THREE.PlaneGeometry( 1, 1 );
    var geo = new THREE.EdgesGeometry( geometry ); // or WireframeGeometry( geometry )
    var mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2, transparent: true, opacity: 0 } );
    this.renderBounds = new THREE.LineSegments( geo, mat );

    this.camera.add( this.renderBounds );
    this.renderBounds.position.set(0, 0, -0.655);
  }
  setupScrim(){
    const geometry = new THREE.PlaneGeometry( 10, 10 );
    this.scrimMaterial = new THREE.MeshLambertMaterial( {color: 'black', transparent: true, opacity: 0} );
    this.scrim = new THREE.Mesh( geometry, this.scrimMaterial );
    this.scrim.name = 'SCRIM';
    this.scrim.userData.animating = false;
    this.scrim.userData.fadeAnimation = undefined;
    this.scrim.userData.ctrl = this;
    this.scrim.renderOrder = 990;
    this.scrim.onBeforeRender = function( renderer ) { renderer.clearDepth(); };
    this.camera.add( this.scrim );
    this.scrim.position.set(0, 0, -1.5);
    this.anims.scrimAnimation(this.scrim, this.isLoading);
    this.loadTextures();
    
  }
  setupHudAnchors(){
    this.rightAnchor = InvisibleBox(this.scene).box;
    this.leftAnchor = InvisibleBox(this.scene).box;
    this.loadingAnchor = InvisibleBox(this.scene).box;

    this.camera.add(this.rightAnchor);
    this.camera.add(this.leftAnchor);
    this.rightAnchor.position.set(2.5,1.25,-2);
    this.rightAnchor.userData.maxXPos = this.rightAnchor.position.x;
    this.rightAnchor.userData.midXPos = this.rightAnchor.position.x*0.6;
    this.rightAnchor.userData.minXPos = this.rightAnchor.position.x*0.3;
    this.rightAnchor.userData.centerXPos = this.rightAnchor.position.x*0.1;
    this.rightAnchor.userData.xAnim = 'MAX';
    this.rightAnchor.userData.animating = false;
    this.leftAnchor.position.set(-2.5,1.25,-2);
    this.leftAnchor.userData.maxXPos = this.leftAnchor.position.x;
    this.leftAnchor.userData.midXPos = this.leftAnchor.position.x*0.6;
    this.leftAnchor.userData.minXPos = this.leftAnchor.position.x*0.3;
    this.leftAnchor.userData.centerXPos = this.leftAnchor.position.x*0.1;
    this.rightAnchor.userData.xAnim = 'MAX';
    this.leftAnchor.userData.animating = false;

    const matProps = basicMatProperties(PRIMARY_COLOR_A);
    const boxProps = boxProperties(name, this.leftAnchor, 0.01, 0.01, 0.01, SMOOTHNESS, RADIUS, Z_OFFSET, false, matProps);
    this.leftMenuParent = new BaseBox(boxProps);
    this.leftMenuParent.MakeBoxMaterialInvisible();
    this.leftMenuParent.box.translateX(-0.6);
    this.leftMenuParent.box.translateY(0.25);
    this.leftMenuParent.box.translateZ(-0.85);

    if(window.innerWidth < 1600){
      this.rightAnchor.userData.xAnim = 'MID';
    }else if(window.innerWidth < 1000 && window.innerWidth > 500){
      this.rightAnchor.userData.xAnim = 'MIN';
    }else if(window.innerWidth < 500){
      this.rightAnchor.userData.xAnim = 'CENTER';
    }

    this.ResizeHud(this.rightAnchor.userData.xAnim , this.rightAnchor);
    this.ResizeHud(this.leftAnchor.userData.xAnim , this.leftAnchor);
  }
  setOrigin(box){
    this.origin = box;
  }
  flattenLeftMenu(amount){
    if(this.leftMenuParent == undefined && (amount < 1 && amount > 0))
      return;

    this.leftMenuParent.box.scale.set(1, 1, 1-amount);
  }
  addICMinterClient(AuthClient, HttpAgent, createActor, idProvider, minterBackend){
    this.nftMinter = new IC_MinterClient(this, AuthClient, HttpAgent, createActor, idProvider, minterBackend);
    this.nftMinter.addAuthButton();

    return this.nftMinter
  }
  addICModelMinterClient(gltfPath, AuthClient, HttpAgent, createActor, idProvider, minterBackend, debug=false){
    this.nftMinter = new IC_ModelMinterClient(gltfPath, this, AuthClient, HttpAgent, createActor, idProvider, minterBackend, debug);
    this.nftMinter.addAuthButton();

    return this.nftMinter
  }
  addICCustomClient(gltfPath, actor){
    this.icCustomClient = new IC_CustomClient(gltfPath, this, actor);

    return this.icCustomClient
  }
  calculateAspectRatio() {
      return window.innerWidth / window.innerHeight;
  }
  createCameraOrbitControls(){
    this.camCtrls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camCtrls.update(); // This is important to initialize the controls
  }
  getStencilRef(){
    let ref = this.stencilRefs.length+1;
    this.stencilRefs.push(ref);

    return this.stencilRefs[stencilRefs.length-1]
  }
  addParticleSystem(hvymParticles){
    if(this.origin!=undefined){
      this.origin.add( hvymParticles.particleSystem );
    }else{
      this.scene.add( hvymParticles.particleSystem );
    }
    this.particleSystems.push(hvymParticles);
  }
  toggleLoading(loadingFx=false){
    if(this.scrim.userData.animating){
      this.scrim.userData.fadeAnimation.kill();
    }
    this.isLoading = !this.isLoading;
    this.anims.scrimAnimation(this.scrim, this.isLoading);

    if(loadingFx){
      this.toggleLoadingFx(this.isLoading);
    }
    if(this.isLoading){
      this.rayBlockers.push(this.scrim);
    }else{
      this.scrim = this.rayBlockers.pop();
    }
  }
  toggleLoadingFx(loading){
    if(this.isLoading){
      this.showLoadingFx();
    }else{
      this.hideLoadingFx();
    }
  }
  createLoadingFx(){
    // this.loadingWheel1 = createOrbitRing(this, PRIMARY_COLOR_A, 0.9, 2, 60,['x', 'z'], 1, -1, 1);
    // this.loadingWheel2 = createOrbitRing(this, SECONDARY_COLOR_A, 0.9, 2, 60,['x', 'y'], 1, -1, -1);
    this.loadingWheel1 = createOrbitRing(this, 'RANDOM', 0.9, 2, 60,['x', 'z'], 1, -1, 1);
    this.loadingWheel2 = createOrbitRing(this, 'RANDOM', 0.9, 2, 60,['x', 'y'], 1, -1, -1);
    this.loadingFx.push(this.loadingWheel1);
    this.loadingFx.push(this.loadingWheel2);
    this.loadingFxActive = true;
    this.hideLoadingFx();
  }
  loadTextures(){
    const self = this;
    if(PARTICLE1_TEXTURE != undefined){
      this.loadingTexture = PARTICLE1_TEXTURE;
      this.createLoadingFx();
    }else{
      textureLoader.load(
        // resource URL
        PARTICLE1_TEXTURE_URL,

        // onLoad callback
         ( texture )=> {
            self.loadingTexture = texture;
            self.createLoadingFx();
        },

        // onProgress callback currently not supported
        undefined,

        // onError callback
        ( err )=> {
            console.error( 'An error happened.' );
        }
      );
    }
  }
  handleLoadingFx(loading){
    if(loading){
      this.showLoadingFx();
    }else{
      this.hideLoadingFx();
    }
  }
  showLoadingFx(){
    this.loadingFx.forEach((fx, i) => {
      if(!this.loadingFxActive || fx.playing.length == 0)
        return
      fx.FadeColorsIn();
    });
  }
  hideLoadingFx(){
    this.loadingFx.forEach((fx, i) => {
      if(!this.loadingFxActive || fx.playing.length == 0)
        return
      fx.FadeColorsOut();
    });
  }
  toggleSceneCtrls(state){
    if(!this.camCtrls)
      return;

    this.camCtrls.enabled = state;
  }
  mouseDownHandler(){
    if(this.isLoading)
      return;

    const intersectsBlocker = this.raycaster.intersectObjects(this.rayBlockers);
    if ( intersectsBlocker.length > 0 )
      return;

    this.mouseDown = true;
    this.isDragging = true;
    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;

    const intersectsDraggable = this.raycaster.intersectObjects(this.draggable);
    const intersectsClickable = this.raycaster.intersectObjects(this.clickable);
    const intersectsInteractable = this.raycaster.intersectObjects(this.interactables);
    const intersectsMeshAction = this.raycaster.intersectObjects(this.meshActions);
    const intersectsToggle = this.raycaster.intersectObjects(this.toggles);

    if ( intersectsClickable.length > 0 ) {
      console.log("Clickable")
      let obj = intersectsClickable[0].object;
      obj.dispatchEvent({type:'action'});

      if(!this.clickable.includes(obj))
        return;

      this.anims.clickAnimation(obj);
      this.lastClicked = obj;
    }

    if ( intersectsDraggable.length > 0 ) {
      console.log('intersects draggable')
      this.lastDragged = intersectsDraggable[0].object;
      this.lastClicked = this.lastDragged;
    }

    if ( intersectsInteractable.length > 0 ) {
      console.log("Interactable mouse down")
      let obj = intersectsInteractable[0].object;
      if(obj.userData.interactableHandle==true && obj.userData.interactableBtn==true){
        obj.dispatchEvent({type:'interactable-action'});
      }
      this.lastClicked = obj;
    }

    if ( intersectsMeshAction.length > 0 ) {
      console.log("Mesh Action")
      let obj = intersectsMeshAction[0].object;
      obj.dispatchEvent({type:'mesh_action'});
      this.lastClicked = obj;
      if(!this.meshActions.includes(obj) || (obj.userData.hasOwnProperty('noClickAnimation') && obj.userData.noClickAnimation))
        return;

      this.anims.clickAnimation(obj);

    }

    if ( intersectsToggle.length > 0 ) {
      let obj = intersectsToggle[0].object;
      obj.dispatchEvent({type:'action'});
      this.lastClicked = obj;
    }
  }
  mouseUpHandler(){
    this.mouseDown = false;
    this.isDragging = false;
    this.lastDragged = undefined;
    this.toggleSceneCtrls(true);

    if(this.lastClicked != undefined && this.lastClicked.isInteractable){
      if(this.lastClicked.userData.interactableHandle || this.lastClicked.userData.interactableSelection){
        this.lastClicked.dispatchEvent({type:'interactable-action'});
      }else if(this.lastClicked.userData.interactableBase){
        this.lastClicked.userData.boxCtrl.handle.dispatchEvent({type:'interactable-action'});
      }
    }
  }
  mouseMoveHandler(event){
    const intersectsMouseOverable = this.raycaster.intersectObjects(this.mouseOverable);
    const intersectsselectorElems = this.raycaster.intersectObjects(this.selectorElems);
    let canMouseOver = true;

    if(intersectsMouseOverable.length > 0){

      let elem = intersectsMouseOverable[0].object;

      if(elem.userData.mouseOverParent != undefined){
        canMouseOver = false;
      }

      if(!this.mouseOver.includes(elem) && canMouseOver){
        elem.userData.mouseOver = true;
        this.mouseOver.push(elem);
        this.anims.mouseOverAnimation(elem);
      }

    }else if(intersectsselectorElems.length > 0){

      let e = intersectsselectorElems[0].object;
      // console.log("elem")
      if(e.parent.userData.selectors != undefined && !e.parent.userData.open){
        this.anims.selectorAnimation(e.parent);
      }

    }else{

      this.mouseOver.forEach((elem, idx) => {
        if(elem.userData.mouseOver && canMouseOver){
          elem.userData.mouseOver = false;
          this.anims.mouseOverAnimation(elem);
          this.mouseOver.splice(this.mouseOver.indexOf(elem));
        }
      });

      this.selectorElems.forEach((elem, idx) => {
        if(elem.parent.userData.selectors != undefined && elem.parent.userData.open){
          this.anims.selectorAnimation(elem.parent, 'CLOSE');
        }
      });
    }

    if (this.lastDragged != undefined && this.lastDragged.userData.draggable && this.mouseDown && this.isDragging) {
      const deltaX = event.clientX - this.previousMouseX;
      const deltaY = event.clientY - this.previousMouseY;
      const dragPosition = this.lastDragged.position.clone();
      this.toggleSceneCtrls(false);
      if(!this.lastDragged.userData.horizontal){
        this.dragDistY = deltaY;

        if(deltaY<0){
          this.moveDir=1
        }else{
          this.moveDir=-1;
        }
        // Limit scrolling
        dragPosition.y = Math.max(this.lastDragged.userData.minScroll, Math.min(this.lastDragged.userData.maxScroll, dragPosition.y - deltaY * 0.01));
        this.lastDragged.position.copy(dragPosition);
        this.previousMouseY = event.clientY;
        this.lastDragged.dispatchEvent({type:'action'});
      }else{
        this.dragDistX = deltaX;

        if(deltaX<0){
          this.moveDir=1
        }else{
          this.moveDir=-1;
        }

        // Limit scrolling
        dragPosition.x = Math.max(this.lastDragged.userData.minScroll, Math.min(this.lastDragged.userData.maxScroll, dragPosition.x + deltaX * 0.01));
        this.lastDragged.position.copy(dragPosition);
        this.previousMouseX = event.clientX;
        this.lastDragged.dispatchEvent({type:'action'});
      }
      
    }

  }
  doubleClickHandler(){
    if(this.isLoading)
      return;

    const intersectsBlocker = this.raycaster.intersectObjects(this.rayBlockers);
    if ( intersectsBlocker.length > 0 )
      return;

    this.raycaster.layers.set(0);
    const intersectsInputPrompt = this.raycaster.intersectObjects(this.inputPrompts);

    if(intersectsInputPrompt.length > 0){

      let textMesh = intersectsInputPrompt[0].object;
      let userData = textMesh.userData;
      const textProps = textMesh.userData.textProps;

      if(this.activeEditText == undefined){
        this.activeEditText = textMesh;
      }

      if(this.activeEditText != textMesh){
        this.activeEditText = textMesh;
      }

      // Initialize variables for typing
      let currentText = textProps.cBox.box.userData.currentText;
      let boxSize = getGeometrySize(textProps.cBox.box.geometry);
      let pos = new THREE.Vector3().copy(textMesh.position);
      let padding = textProps.padding;

      if(!textProps.draggable){
        this.inputPrompts.push(textMesh);
        this.mouseOverable.push(textMesh);
        this.clickable.push(textMesh);
      }

      let yPosition = this._inputTextYPosition(event, textMesh, boxSize, padding);

      // Listen for keyboard input
      window.addEventListener('keydown', (event) => {

          if (event.key === 'Enter') {;
            this._onEnterKey(event, this.activeEditText, currentText, boxSize, padding);
          } else if (event.key === 'Backspace') {
              // Handle backspace
              currentText = currentText.slice(0, -1);
              this._onHandleTypingText(event, textMesh, currentText, boxSize, padding);
          } else if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Capslock') {

          } else if (event.key === 'ArrowDown' ) {

          } else if (event.key === 'ArrowUp' ) {

          } else {
            if(event.shiftKey || event.capslock){
              currentText += event.key.toUpperCase();
            }else{
              currentText += event.key;
            }
            this._onHandleTypingText(event, this.activeEditText, currentText, boxSize, padding);

          }
          this._onHandleTextGeometry(textMesh, currentText, boxSize);
        });
      }
  }
  ResizeHud(size, box){
    if(box.userData.animating || box.children.length == 0)
      return;

    if(box.userData.xAnim != size){
      box.userData.xAnim = size;
      this.anims.hudXAnimation(box, box.userData.xAnim);
    }
  }
  Update(delta){
    var width = window.innerWidth / 2;
    var height = window.innerHeight / 2;

    if(window.innerWidth > 1600){
      this.ResizeHud('MAX', this.rightAnchor);
      this.ResizeHud('MAX', this.leftAnchor);
    }else if(window.innerWidth < 1600 && window.innerWidth > 1000){
      this.ResizeHud('MID', this.rightAnchor);
      this.ResizeHud('MID', this.leftAnchor);
    }else if(window.innerWidth < 1000 && window.innerWidth > 500){
      this.ResizeHud('MIN', this.rightAnchor);
      this.ResizeHud('MIN', this.leftAnchor);
    }else if(window.innerWidth < 500){
      this.ResizeHud('CENTER', this.rightAnchor);
      this.ResizeHud('CENTER', this.leftAnchor);
    }

    this.gltfModels.forEach((model, idx) => {
      model.UpdateAnimation(delta);
    });

    this.particleSystems.forEach((particles, idx) => {
        particles.Update(delta);
    });

    if(MINTER_BTN_SHADER!=undefined){
      MINTER_BTN_SHADER.uniforms.uTime.value++;
    }
  }
  _onEnterKey(event, textMesh, currentText, boxSize, padding){
    textMesh.dispatchEvent({type:'onEnter'});

    if(textMesh.widget == undefined){
      if(textMesh.userData.textProps.draggable){
        this.draggable.push(textMesh);
      }
    }
  }
  _onHandleTextGeometry(textMesh, currentText, boxSize){
    if(textMesh.widget != undefined)//widgets update their own text geometry
      return;

    let textProps = textMesh.userData.textProps;
    if(currentText.length > 0){
      textMesh.userData.currentText = currentText;
      textMesh.dispatchEvent({type:'update'});
    }
  }
  _onHandleTypingText(event, textMesh, currentText, boxSize, padding){
    if(textMesh.widget == undefined){
      textMesh.userData.textProps.cBox.box.userData.currentText = currentText;
    }else{
      textMesh.widget.box.userData.currentText = currentText;
      textMesh.widget.SetValueText(currentText);
    } 
  }
  _inputTextYPosition(event, textMesh, boxSize, padding){

    let yPosition = textMesh.position.y;
    let textSize = getGeometrySize(textMesh.geometry);

    if(textMesh.widget == undefined){
      if (event.key === 'Enter') {
        yPosition=boxSize.height-boxSize.height;
        textMesh.dispatchEvent({type:'onEnter'});
      }else{
        yPosition=textSize.height-padding;
      }
    }

    return yPosition

  }
}


export class HVYM_DefaultScene extends HVYM_Scene {
  constructor() {
    let mainSceneProperties = DefaultSceneProperties();
    super(mainSceneProperties)
    this.is = 'HVYM_DEFAULT_SCENE';
    this.Size = 100;
    this.camera.position.z = 5;
    this.lastClick = 0;
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('click', (e) => {
      const thisClick = Date.now();
      if (thisClick - this.lastClick < 500) {
        this.onDoubleClick();
        this.lastClick = thisClick;
        return;
      }
      this.lastClick = thisClick;
    });

    window.addEventListener('resize', this.onWindowResize);
  }
  onWindowResize() {
      const newAspectRatio = HVYM_SCENE.calculateAspectRatio();
      HVYM_SCENE.camera.left = (HVYM_SCENE.Size * newAspectRatio) / -2;
      HVYM_SCENE.camera.right = (HVYM_SCENE.Size * newAspectRatio) / 2;
      HVYM_SCENE.camera.top = HVYM_SCENE.Size / 2;
      HVYM_SCENE.camera.bottom = HVYM_SCENE.Size / -2;
      HVYM_SCENE.camera.aspect = newAspectRatio;
      HVYM_SCENE.camera.updateProjectionMatrix();
      HVYM_SCENE.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  updateMouseAndRaycaster(event){
    // Calculate mouse position in normalized device coordinates (NDC)
    HVYM_SCENE.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    HVYM_SCENE.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    HVYM_SCENE.raycaster.setFromCamera(HVYM_SCENE.mouse, HVYM_SCENE.camera);
    HVYM_SCENE.raycaster.layers.set(0);
  }
  onMouseDown(event) {
    event.preventDefault();
    HVYM_SCENE.updateMouseAndRaycaster(event);
    HVYM_SCENE.mouseDownHandler();
  }
  onMouseUp() {
    HVYM_SCENE.mouseUpHandler();
  }
  onMouseMove(event) {
    HVYM_SCENE.updateMouseAndRaycaster(event);
    HVYM_SCENE.mouseMoveHandler(event);
  }
  onDoubleClick() {
    HVYM_SCENE.updateMouseAndRaycaster(event);
    HVYM_SCENE.doubleClickHandler();
  }
  static handleLoading(){
    if(HVYM_SCENE == undefined)
      return;
    HVYM_SCENE.toggleLoading();
  }
  animate() {
    var delta = HVYM_SCENE.clock.getDelta();
    HVYM_SCENE.Update(delta);

    requestAnimationFrame(HVYM_SCENE.animate);
    HVYM_SCENE.renderer.render(HVYM_SCENE.scene, HVYM_SCENE.camera);
  }
}

export class HVYM_Utils {
  constructor() {

  }
  /**
   * This function creates a random number between a minumum and maximum value.
   * @param {number} min minumum number in range.
   * @param {number} max maximum number in range.
   * 
   * @returns {number} random number.
   * 
   */
  randomNumber(min, max) {
    return Math.random() * (max - min) + min;
  }
  /**
   * This function returns a range number between 2 numbers.
   * @param {number} from the starting number for the range.
   * @param {number} to ending number in range.
   * @param {number} step the increment number in range.
   * 
   * @returns {number} random number.
   * 
   */
  * range(from, to, step = 1) {
    let value = from;
    while (value <= to) {
      yield value;
      value += step;
    }
  }
}


/**
 * This function creates a new property set for animation.
 * @param {string} [anim='FADE'] this is a localized constant to the function.
 * @param {string} [anim='IN'] this is a localized constant for fading animation in or out.
 * @param {number} [duration=0.07] the duration of the animation.
 * @param {string} [easeIn='power1.inOut'] easing in constant for animation.
 * @param {number} [delay=0.007] the delay before animation plays.
 * @param {number} [delayIdx=0] this is a delay multiplier, which acts to stagger animations played consecutively.
 * 
 * @returns {null} No return.
 * 
 */
export function animationProperties(anim='FADE', action='IN', duration=0.07, ease="power1.inOut", delay=0.007, onComplete=undefined){
  return {
    'type': 'ANIMATION_PROPS',
    'anim': anim,
    'action': action,
    'duration': duration,
    'ease': ease,
    'delay': delay,
    'onComplete': onComplete
  }
};

/**
 * This function creates a new property set for information.
 * @param {string} title this is a title for a given element.
 * @param {string} author this is an author for a given element.
 * 
 * @returns {null} No return.
 * 
 */
export function infoProperties(title, author){
  return {
    'type': 'INFO_PROPS',
    'title': title,
    'author': author
  }
};

export class HVYM_Animation {
  constructor(hvymScene) {
    this.is = 'HVYM_ANIMATION';
    this.scene = hvymScene;
    this.posVar = new THREE.Vector3();
    this.scaleVar = new THREE.Vector3();
  }
  minterUnlockAnimation(lockGrp, loop, btn, duration=1.0, callback=undefined){
    let loopSize = getGeometrySize(loop.geometry);
    let tl_loop = gsap.timeline();
    btn.box.scale.set(0,0,0);
    btn.box.visible = true;

    function timelineComplete(){
      if(callback!=undefined){
        callback();
      }
    }
  
    tl_loop.to(loop.position, {delay: 2, duration:(duration*0.2), y:-(loopSize.height*0.15), ease: 'back.out'})
      .to(loop.position, {duration:(duration*0.3), y:(loopSize.height*0.25), ease: 'elastic.out'})
      .to(lockGrp.scale, {delay: 0.15, duration:(duration*0.2), x:0, y:0, z:0, ease: 'back.in'})
      .to(btn.box.scale, {duration:(duration*0.3), x:1, y:1, z:1, ease: 'elastic.out', onComplete: timelineComplete});

  }
  scrimAnimation(box, isLoading=false, duration=0.5, ease="power1.inOut"){
    box.userData.animating = true;
    let opacityTarget = 0.75;

    function fadeComplete(elem){
      elem.userData.animating = false;
      if(!isLoading){
        box.material.opacity = 0;
        elem.visible = false;
      }
    }

    if(!isLoading){
      box.material.opacity = 0.75;
      opacityTarget = 0;
    }else{
      box.material.opacity = 0;
      box.visible = true;
    }

    let props = {duration: duration, opacity: opacityTarget, ease: ease, onComplete: fadeComplete, onCompleteParams:[box]};


    box.userData.fadeAnimation = gsap.to(box.material, props);

  }
  hudXAnimation(box, anim='MIN', duration=0.07, ease="power1.inOut"){
    box.userData.animating = true;
    function hudAnimComplete(elem){
      elem.userData.animating = false;
    }

    let props = {duration: duration, x: box.userData.minXPos, y: box.position.y, z: box.position.z, ease: ease, onComplete: hudAnimComplete, onCompleteParams:[box]};

    switch (anim) {
        case 'MIN':
          props = {duration: duration, x: box.userData.minXPos, y: box.position.y, z: box.position.z, ease: ease, onComplete: hudAnimComplete, onCompleteParams:[box]};
          break;
        case 'MID':
          props = {duration: duration, x: box.userData.midXPos, y: box.position.y, z: box.position.z, ease: ease, onComplete: hudAnimComplete, onCompleteParams:[box]};
          break;
        case 'MAX':
          props = {duration: duration, x: box.userData.maxXPos, y: box.position.y, z: box.position.z, ease: ease, onComplete: hudAnimComplete, onCompleteParams:[box]};
          break;
        case 'CENTER':
          props = {duration: duration, x: box.userData.centerXPos, y: box.position.y, z: box.position.z, ease: ease, onComplete: hudAnimComplete, onCompleteParams:[box]};
          break;
        default:
          console.log('')
    }

    gsap.to(box.position, props);

  }
  /**
   * This function animates text elements.
   * @param {object} elem the Object3D to be animated.
   * @param {string} [anim='FADE'] this is a localized constant to the function.
   * @param {string} [anim='IN'] this is a localized constant for fading animation in or out.
   * @param {number} [duration=0.07] the duration of the animation.
   * @param {string} [easeIn='power1.inOut'] easing in constant for animation.
   * @param {number} [delay=0.007] the delay before animation plays.
   * @param {number} [delayIdx=0] this is a delay multiplier, which acts to stagger animations played consecutively.
   * 
   * @returns {null} No return.
   * 
   */
  txtAnimation(box, txt, anim='FADE', action='IN', duration=0.07, ease="power1.inOut", delay=0.007, delayIdx=0, onComplete=undefined){
    const top = box.userData.height/2+10;
    const bottom = top-box.userData.height-10;
    const right = box.userData.width;
    const left = -box.userData.width;
    let props = {};

    switch (anim) {
        case 'FADE':
          let opacityTarget = 1;
          if(action == 'OUT'){
            opacityTarget = 0;
          }else{
            txt.material.opacity=0;
          }
          props = {duration: duration, opacity: opacityTarget, ease: ease };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }
          gsap.to(txt.material, props).delay(delay*delayIdx);
          break;
        case 'SCALE':
          if(action == 'OUT'){
            this.scaleVar.set(0,0,0);
          }else{
            this.scaleVar.copy(txt.scale);
            txt.scale.set(0,0,0);
            txt.material.opacity=1;
          }
          props = {duration: duration, x: this.scaleVar.x, y: this.scaleVar.y, z: this.scaleVar.z, ease: ease };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }
          gsap.to(txt.scale, props).delay(delay*delayIdx);
          break;
        case 'SLIDE_DOWN':
          if(txt.position.y>bottom){
            if(action == 'OUT'){
              this.posVar.set(txt.position.x, top, txt.position.z);
              txt.material.opacity=1;
            }else{
              this.posVar.copy(txt.position);
              txt.position.set(txt.position.x, top, txt.position.z);
              txt.material.opacity=1;
            }
            props = {duration: duration, x: this.posVar.x, y: this.posVar.y, z: this.posVar.z, ease: ease };
            if(onComplete != undefined){
              props.onComplete = onComplete;
            }

            gsap.to(txt.position, props).delay(delay*delayIdx);
          }
          break;
        case 'SLIDE_UP':
          if(action == 'OUT'){
            this.posVar.set(txt.position.x, bottom, txt.position.z);
          }else{
            this.posVar.copy(txt.position);
            txt.position.set(txt.position.x, bottom, txt.position.z);
            txt.material.opacity=1;
          }
          props = {duration: duration, x: this.posVar.x, y: this.posVar.y, z: this.posVar.z, ease: ease };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }

            gsap.to(txt.position, props).delay(delay*delayIdx);
          break;
        case 'SLIDE_RIGHT':
          if(action == 'OUT'){
              this.posVar.set(right, txt.position.y, txt.position.z);
          }else{
            this.posVar.copy(txt.position);
            txt.position.set(right, txt.position.y, txt.position.z);
            txt.material.opacity=1;
          }
          props = {duration: duration, x: this.posVar.x, y: this.posVar.y, z: this.posVar.z, ease: ease };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }

            gsap.to(txt.position, props).delay(delay*delayIdx);
          break;
        case 'SLIDE_LEFT':
          if(action == 'OUT'){
            this.posVar.set(left, txt.position.y, txt.position.z);
          }else{
            this.posVar.copy(txt.position);
            txt.position.set(left, txt.position.y, txt.position.z);
            txt.material.opacity=1;
          }
          props = {duration: duration, x: this.posVar.x, y: this.posVar.y, z: this.posVar.z, ease: ease };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }

          gsap.to(txt.position, props).delay(delay*delayIdx);
          break;
        case 'UNSCRAMBLE0':
          if(action == 'OUT'){
            this.posVar.set(txt.position.x+this.scene.utils.randomNumber(-0.1, 0.1), txt.position.y+this.scene.utils.randomNumber(-0.1, 0.1), txt.position.z);
          }else{
            this.posVar.copy(txt.position);
            txt.position.set(txt.position.x+this.scene.utils.randomNumber(-0.1, 0.1), txt.position.y+this.scene.utils.randomNumber(-0.1, 0.1), txt.position.z);
            txt.material.opacity=1;
          }
          props = {duration: duration, x: this.posVar.x, y: this.posVar.y, z: this.posVar.z, ease: ease };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }

          gsap.to(txt.position, props).delay(delay*delayIdx);
          break;
        case 'UNSCRAMBLE1':
          if(action == 'OUT'){
            this.posVar.set(txt.position.x+this.scene.utils.randomNumber(-1, 1), txt.position.y+this.scene.utils.randomNumber(-1, 1), txt.position.z);
          }else{
            this.posVar.copy(txt.position);
            txt.position.set(txt.position.x+this.scene.utils.randomNumber(-1, 1), txt.position.y+this.scene.utils.randomNumber(-1, 1), txt.position.z);
            txt.material.opacity=1;
          }
          props = {duration: duration, x: this.posVar.x, y: this.posVar.y, z: this.posVar.z, ease: ease };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }

          gsap.to(txt.position, props).delay(delay*delayIdx);
          break;
        case 'UNSCRAMBLE2':
          if(action == 'OUT'){
            this.posVar.set(txt.position.x+this.scene.utils.randomNumber(-2, 2), txt.position.y+this.scene.utils.randomNumber(-2, 2), txt.position.z);
          }else{
            this.posVar.copy(txt.position);
            txt.position.set(txt.position.x+this.scene.utils.randomNumber(-2, 2), txt.position.y+this.scene.utils.randomNumber(-2, 2), txt.position.z);
            txt.material.opacity=1;
          }
          props = {duration: duration, x: this.posVar.x, y: this.posVar.y, z: this.posVar.z, ease: ease };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }

          gsap.to(txt.position, props).delay(delay*delayIdx);
          break;
        case 'SPIRAL':
          if(action == 'OUT'){
              this.posVar.set(right, top, txt.position.z);
          }else{
            this.posVar.copy(txt.position);
            txt.position.set(right, top, txt.position.z);
            txt.material.opacity=1;
          }
          props = {duration: duration, x: this.posVar.x, y: this.posVar.y, z: this.posVar.z, ease: 'cubic-bezier(0.55,0.055,0.675,0.19)' };
          if(onComplete != undefined){
            props.onComplete = onComplete;
          }

          gsap.to(txt.position, props).delay(delay*delayIdx);
          break;
        default:
          console.log("");
      }
  }
  /**
   * This function animates multi text elements.
   * @param {object} elem the Object3D to be animated.
   * @param {string} [anim='FADE'] this is a localized constant to the function.
   * @param {string} [easeIn='power1.in'] easing in constant for animation.
   * @param {string} [easeIn='elastic.Out'] easing out constant for animation.
   * 
   * @returns {null} No return.
   * 
   */
  multiAnimation(box, txtArr, anim='FADE', action='IN', duration=0.07, ease="power1.inOut", delay=0.007, onComplete=undefined){
    let delayIdx=0;
    const top = box.userData.height/2+5;
    const bottom = top-box.userData.height-5;

    txtArr.forEach((txt, i) => {
      if(txt.position.y>bottom){
        this.txtAnimation(box, txt, anim, action, duration, ease, delay, delayIdx, onComplete);
        delayIdx+=1;
      }
    });

  }
  /**
   * This function animates an element for mouseover.
   * @param {object} elem the Object3D to be animated.
   * @param {string} [anim='SCALE'] this is a localized constant to the function.
   * @param {string} [easeIn='power1.in'] easing in constant for animation.
   * @param {string} [easeIn='elastic.Out'] easing out constant for animation.
   * 
   * @returns {null} No return.
   * 
   */
  mouseOverAnimation(elem, anim='SCALE', duration=0.5, ease="power1.inOut", delay=0){

    let doAnim = false;

    if(elem==undefined)
      return;

    if(elem.userData.hoverAnim != undefined && elem.userData.hoverAnim.isActive())
      return;

    if(elem.userData.mouseOver && (elem.scale.x == elem.userData.defaultScale.x && elem.scale.y == elem.userData.defaultScale.z)){
      this.scaleVar.set(elem.userData.defaultScale.x*1.1,elem.userData.defaultScale.y*1.1,elem.userData.defaultScale.z);
      elem.userData.mouseOverActive = true;
      doAnim=true;
    }else if (!elem.userData.mouseOver && elem.userData.mouseOverActive && (elem.scale.x != elem.userData.defaultScale.x || elem.scale.y != elem.userData.defaultScale.z)){
      elem.userData.mouseOverActive = false;
      this.scaleVar.copy(elem.userData.defaultScale);
      doAnim=true;
    }

    if(doAnim){
      let props = { duration: duration, x: this.scaleVar.x, y: this.scaleVar.y, z: this.scaleVar.z, ease: ease };
      elem.userData.hoverAnim = gsap.to(elem.scale, props);
    }

  }
  /**
   * This function animates selector elements.
   * @param {object} elem the Object3D to be animated.
   * @param {string} [anim='OPEN'] this is a localized constant to the function.
   * @param {string} [duration=0.1] the duration of the animation.
   * @param {string} [easeIn='power1.in'] easing in constant for animation.
   * @param {string} [easeIn='elastic.Out'] easing out constant for animation.
   * 
   * @returns {null} No return.
   * 
   */
  selectorAnimation(elem, anim='OPEN', duration=0.15, easeIn="power1.in", easeOut="elastic.Out"){
      let yPositions = [];
      let zPositions = [];
      let scales = [];
      let selected = undefined;

      elem.userData.selectors.forEach((c, idx) => {
        let size = getGeometrySize(c.geometry);
        let parentSize = getGeometrySize(c.parent.geometry);
        let yPos = size.height*idx;
        let zPos = c.userData.unselectedPos.z;
        let sel = c.children[0].userData.selected;
        c.material.renderOrder = 1;
        if(sel){
          selected = idx;
          scales.push(c.userData.selectedScale);
        }else{
          scales.push(c.userData.unselectedScale);
        }
        
        if(anim=='CLOSE'){
          yPos=0;
          if(sel){
            zPos = c.userData.selectedPos.z;
            c.material.renderOrder = 2;
          }
        }
        yPositions.push(-yPos);
        zPositions.push(zPos);
        if(idx>0){
          yPositions.push(yPos);
        }
      });

      elem.userData.open = true;
      let portalScale = 1*(elem.userData.selectors.length+1);
      if(anim=='CLOSE'){
        elem.userData.open = false;
        portalScale = 1;
      }

      if(anim=='OPEN' || anim=='CLOSE'){
        for (let i = 0; i < elem.userData.selectors.length; i++) {
          let current = elem.userData.selectors[i];
          let props = { duration: duration, x: current.position.x, y: yPositions[i], z: zPositions[i], ease: easeIn };
          let scale = scales[i];
          if(anim=='CLOSE' && i!=selected){
            scale = 0;
          }
          gsap.to(current.position, props);
          props = { duration: duration, x: scale, y: scale, z: scale, ease: easeIn};
          gsap.to(current.scale, props);
        }

        if(elem.userData.hoverZPos!=undefined){
          let props = {duration: duration, x: elem.position.x, y: elem.position.y, z: elem.userData.defaultZPos}
          if(elem.userData.open){
            props = {duration: duration, x: elem.position.x, y: elem.position.y, z:elem.userData.hoverZPos};
          }
          gsap.to(elem.position, props);
        }

        if(elem.userData.properties.isPortal){
          let props = { duration: duration, 0: 0, ease: easeIn };
          if(elem.userData.open){
            props = { duration: duration, 0: 1, ease: easeIn };
          }
          gsap.to(elem.morphTargetInfluences, props);
        }
      }

      if(anim=='SELECT'){
        
        let current = elem.userData.selectors[selected];
        let currentY = current.position.y;
        let last = current.parent.userData.lastSelected;
        let props = { duration: duration, x: current.position.x, y: current.userData.selectedPos.y, z: current.userData.selectedPos.z, ease: easeIn };
        gsap.to(current.position, props);
        props = { duration: duration, x: current.userData.selectedScale, y: current.userData.selectedScale, z: current.userData.selectedScale, ease: easeIn };
        gsap.to(current.scale, props);

        if(last != undefined){
          props = { duration: duration, x: last.position.x, y: currentY, z: zPositions[selected], ease: easeIn };
          gsap.to(last.position, props);
          props = { duration: duration, x: last.userData.unselectedScale, y: last.userData.unselectedScale, z: last.userData.unselectedScale, ease: easeIn };
          gsap.to(last.scale, props);
        }
      }

  }
  /**
   * This function animates a toggle element.
   * @param {object} elem the Object3D to be animated.
   * @param {string} [duration=0.15] the duration of the animation.
   * @param {string} [easeIn='power1.in'] easing in constant for animation.
   * @param {string} [easeIn='elastic.Out'] easing out constant for animation.
   * 
   * @returns {null} No return.
   * 
   */
  toggleAnimation(elem, duration=0.15, easeIn="power1.in", easeOut="elastic.Out"){

    if(elem.handle.userData.anim != false && gsap.isTweening( elem.handle.userData.anim ))
    return;

    let pos = elem.handle.userData.onPos;

    if(elem.handle.userData.on){
      pos=elem.handle.userData.offPos;
    }

    let props = { duration: duration, x: pos.x, y: elem.handle.position.y, z: elem.handle.position.z, ease: easeIn, onComplete: ToggleWidget.DoToggle, onCompleteParams:[elem] };

    if(!elem.handle.userData.horizontal){
      props = { duration: duration, x: elem.handle.position.x, y: pos.y, z: elem.handle.position.z, ease: easeIn, onComplete: ToggleWidget.DoToggle, onCompleteParams:[elem] };
    }

    elem.handle.userData.anim = gsap.to(elem.handle.position, props);

  }
  /**
   * This function animates panel elements.
   * @param {object} elem the Object3D to be animated.
   * @param {string} [anim='OPEN'] this is a localized constant to the function.
   * @param {string} [duration=0.1] the duration of the animation.
   * @param {string} [easeIn='power1.in'] easing in constant for animation.
   * @param {string} [easeIn='elastic.Out'] easing out constant for animation.
   * 
   * @returns {null} No return.
   * 
   */
  panelAnimation(elem, anim='OPEN', duration=0.1, easeIn="power1.in", easeOut="elastic.Out"){
    if(elem.parent==undefined)
        return;

    function panelAnimComplete(elem, props){
      gsap.to(elem.scale, props);
    }

    function panelExpandComplete(elem){
      if(elem.userData.properties.expanded)
        return;
      elem.dispatchEvent({type:'hideWidgets'});
    }

    function handleRotate(handle, props){
      gsap.to(handle.rotation, props);
    }

    if(anim == 'OPEN'){
      let onScale = elem.userData.onScale;
      let offScale = elem.userData.offScale;

      if(!elem.userData.properties.open){

        let rot = elem.userData.handleOpen.userData.onRotation;
        let props = { duration: duration, x: rot.x, y: rot.y, z: rot.z, ease: easeOut };
        handleRotate(elem.userData.handleOpen, props);

        let yprops = { duration: duration, x: onScale.x, y: onScale.y, z: onScale.z, ease: easeOut };
        let xprops = { duration: duration, x: onScale.x, y: offScale.y, z: onScale.z, ease: easeOut, onComplete: panelAnimComplete, onCompleteParams:[elem, yprops] };
        
        gsap.to(elem.scale, xprops);

      }else if(elem.userData.properties.open){

        let rot = elem.userData.handleOpen.userData.offRotation;
        let props = { duration: duration, x: rot.x, y: rot.y, z: rot.z, ease: easeOut };
        handleRotate(elem.userData.handleOpen, props);

        let xprops = { duration: duration, x: offScale.x, y: offScale.y, z: offScale.z, ease: easeOut};
        let yprops = { duration: duration, x: onScale.x, y: offScale.y, z: onScale.z, ease: easeOut, onComplete: panelAnimComplete, onCompleteParams:[elem, xprops] };
        
        gsap.to(elem.scale, yprops);

      }

      elem.userData.properties.open = !elem.userData.properties.open;
    }

    if(anim == 'EXPAND'){
      
      let expanded = elem.userData.properties.expanded;
      let bottom = elem.userData.bottom;
      let topHeight = elem.userData.size.height;
      let bottomHeight = bottom.userData.size.height;
      let elemHeight = topHeight+bottomHeight;
      let yPos = -bottomHeight/2;
      let sectionsLength = elem.userData.sectionElements.length;
      let bottomYPos = -((bottomHeight/2+elemHeight * sectionsLength) + bottomHeight);
      let thisIndex = elem.userData.index;
      let parentBottom = elem.parent.userData.bottom;
      let props = {};

      if(elem.userData.sectionsValueTypes == 'container'){
        //Move sub elements to correct positions
        for (const obj of elem.userData.sectionElements) {
          if(expanded){
            let pos = obj.userData.expandedPos;
            props = { duration: duration, x: pos.x, y: pos.y, z: pos.z, ease: easeOut };
            gsap.to(obj.position, props);
            //expand handle
            props = { duration: duration, x: 1, y: 1, z: 1, ease: easeOut };
            gsap.to(obj.userData.handleExpand.scale, props);
          }else if(!expanded){
            let pos = obj.userData.closedPos;
            props = { duration: duration, x: pos.x, y: pos.y, z: pos.z, ease: easeOut };
            gsap.to(obj.position, props);
            //contract handle
            props = { duration: duration, x: 0, y: 0, z: 0, ease: easeOut };
            gsap.to(obj.userData.handleExpand.scale, props);
          }
        }
      } else if(elem.userData.sectionsValueTypes == 'controls'){
        sectionsLength = elem.userData.widgetElements.length;
        let widgetHeight = elem.userData.widgetHeight;
        bottomYPos = -((bottomHeight/2+widgetHeight * sectionsLength) + bottomHeight);

        for (const obj of elem.userData.widgetElements) {
          if(expanded){
            let pos = obj.userData.expandedPos;
            props = { duration: duration, x: pos.x, y: pos.y, z: pos.z, ease: easeOut };
            gsap.to(obj.position, props);
          }else if(!expanded){
            let pos = obj.userData.closedPos;
            props = { duration: duration, x: pos.x, y: pos.y, z: pos.z, ease: easeOut };
            gsap.to(obj.position, props);
          }
        }
      }

      //Do animation for expand handle and move down bottom element of main container
      if(expanded){
        let rot = elem.userData.handleExpand.userData.onRotation;
        props = { duration: duration, x: rot.x, y: rot.y, z: rot.z, ease: easeOut };
        handleRotate(elem.userData.handleExpand, props);
        let pos = bottom.userData.expandedPos;
        props = { duration: duration, x: pos.x, y: bottomYPos, z: pos.z, ease: easeOut };
        gsap.to(bottom.position, props);
      }else if(!expanded){
        let rot = elem.userData.handleExpand.userData.offRotation;
        props = { duration: duration, x: rot.x, y: rot.y, z: rot.z, ease: easeOut };
        handleRotate(elem.userData.handleExpand, props);
        let pos = bottom.userData.closedPos;
        bottomYPos = pos.y;
        props = { duration: duration, x: pos.x, y: bottomYPos, z: pos.z, ease: easeOut };
        gsap.to(bottom.position, props); 
      }

      //if a sub panel is opened, we need to manage positions of other sub panels and base panel elements
      if(elem.userData.properties.isSubPanel){
        let subPanelBottom = undefined;
        let startIdx = elem.userData.index+1;
        let parentSectionsLength = elem.parent.userData.sectionElements.length;
        let YPos = elem.position.y;
        
        if(expanded){
          if(elem.userData.index==parentSectionsLength){
            //YPos -= elem.userData.expandedHeight-parentBottom.userData.height-parentBottom.userData.height;
          }else{
            for (const i of this.scene.utils.range(startIdx, parentSectionsLength)) {
              let idx = i-1;
              let el = elem.parent.userData.sectionElements[idx];
              let prev = elem.parent.userData.sectionElements[idx-1];
              let pos = el.position;
              let Y = prev.userData.expandedHeight;
              
              if(idx>startIdx-1){
                if(!prev.userData.properties.expanded){
                  Y = prev.userData.closedHeight;
                }
              }
              YPos -= Y;
              props = { duration: duration, x: pos.x, y: YPos, z: pos.z, ease: easeOut };
              gsap.to(el.position, props);
              if(i==parentSectionsLength){
                subPanelBottom = el.userData.bottom;
              }
            }
          }
          
        }else if(!expanded){
          if(elem.userData.index==parentSectionsLength){;
            //YPos -= elem.userData.closedHeight-parentBottom.userData.height-parentBottom.userData.height;
          }else{
            for (const i of this.scene.utils.range(startIdx, parentSectionsLength)) {
              let idx = i-1;
              let el = elem.parent.userData.sectionElements[idx];
              let prev = elem.parent.userData.sectionElements[idx-1];
              let pos = el.position;
              let Y = prev.userData.closedHeight;
              
              if(idx>startIdx-1){
                if(prev.userData.properties.expanded){
                  Y = prev.userData.expandedHeight;
                }
              }
              YPos -= Y;
              props = { duration: duration, x: pos.x, y: YPos, z: pos.z, ease: easeOut };
              gsap.to(el.position, props);
              if(i==parentSectionsLength){
                subPanelBottom = el.userData.bottom;
              }
            }      
          }

        }

        //calculate bottom based on child bottom position
        let lastElem = elem.parent.userData.sectionElements[parentSectionsLength-1];

        if(parentBottom!=undefined && !lastElem.userData.properties.expanded){
          YPos -= lastElem.userData.closedHeight-parentBottom.userData.height/2;
        }else{
          YPos -= lastElem.userData.expandedHeight-parentBottom.userData.height/2;
        }

        //Adjust the bottom for parent container again
        props = { duration: duration, x: parentBottom.position.x, y: YPos, z: parentBottom.position.z, ease: easeOut, onComplete: panelExpandComplete, onCompleteParams:[elem]};
        gsap.to(parentBottom.position, props);

      }

    }

  }
  /**
   * This function creates a click animation on passed element.
   * @param {object} elem the Object3D to be animated.
   * @param {string} [anim='SCALE'] this is a localized constant to the function.
   * @param {string} [duration=0.15] the duration of the animation.
   * @param {string} [easeIn='power1.in'] easing in constant for animation.
   * @param {string} [easeIn='elastic.Out'] easing out constant for animation.
   * 
   * @returns {null} No return.
   * 
   */
  clickAnimation(elem, anim='SCALE', duration=0.15, easeIn="power1.in", easeOut="elastic.Out"){
    const self = this;
    this.scaleVar.set(elem.userData.defaultScale.x*0.9,elem.userData.defaultScale.y*0.9,elem.userData.defaultScale.z);
    let props = { duration: duration, x: this.scaleVar.x, y: this.scaleVar.y, z: this.scaleVar.z, ease: easeIn };
    props.onComplete = function(e){
      self.scaleVar.copy(elem.userData.defaultScale);
      let props = { duration: duration, x: self.scaleVar.x, y: self.scaleVar.y, z: self.scaleVar.z, ease: easeOut };
      gsap.to(elem.scale, props);
    }
    gsap.to(elem.scale, props);
  }
}

/**
 * This function an object with width, height, and depth based on passed geometry.
 * @param {object} geometry the geometry of an Object3D.
 * 
 * @returns {object} an object with geometry size dimensions.
 * 
 */
export function getGeometrySize(geometry) {

  let width = 100;
  let height = 100;
  let depth = 0.1;
  if(geometry!=undefined){
    const bbox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
    width = bbox.max.x - bbox.min.x;
    height = bbox.max.y - bbox.min.y;
    depth = bbox.max.z - bbox.min.z;
  }

  return { width, height, depth };
};

/**
 * This function creates a new text mesh property set, property of text geometry.
 * useCase='SIMPLE','STENCIL','STENCIL_CHILD'
 * @param {number} [curveSegments=12] the mesh curve segments.
 * @param {bool} [bevelEnabled=false] if true, text has an edge bevel.
 * @param {number} [bevelThickness=0.1] thickness of bevel.
 * @param {number} [bevelSize=0.1] size of bevel.
 * @param {number} [bevelOffset=0] offset of bevel.
 * @param {number} [bevelSegments=3] number of segments in bevel.
 * 
 * @returns {object} Data (materialRefProperties).
 * 
 */
export function textMeshProperties(curveSegments=12, bevelEnabled=false, bevelThickness=0.1, bevelSize=0.1, bevelOffset=0, bevelSegments=3){
  return {
    'type': 'TEXT_MESH_PROPS',
    'curveSegments': curveSegments,
    'bevelEnabled': bevelEnabled,
    'bevelThickness': bevelThickness,
    'bevelSize': bevelSize,
    'bevelOffset': bevelOffset,
    'bevelSegments': bevelSegments,
  }
};

//default widget text mesh properties
const W_CURVE_SEGMENTS = 12;
const W_BEVEL_ENABLED = false;
const W_BEVEL_THICKNESS = 0.1;
const W_BEVEL_SIZE = 0.1;
const W_BEVEL_OFFSET = 0;
const W_BEVEL_SEGMENTS = 3;

/**
 * This function returns default (textMeshProperties) for widgets.
 */
export function defaultWidgetTextMeshProperties(){
  return textMeshProperties(W_CURVE_SEGMENTS, W_BEVEL_ENABLED, W_BEVEL_THICKNESS, W_BEVEL_SIZE, W_BEVEL_OFFSET, W_BEVEL_SEGMENTS)
}

//default value text mesh properties
const VT_CURVE_SEGMENTS = 12;
const VT_BEVEL_ENABLED = false;
const VT_BEVEL_THICKNESS = 0.1;
const VT_BEVEL_SIZE = 0.1;
const VT_BEVEL_OFFSET = 0;
const VT_BEVEL_SEGMENTS = 3;

/**
 * This function returns default (textMeshProperties).
 */
export function defaultValueTextMeshProperties(){
  return textMeshProperties(VT_CURVE_SEGMENTS, VT_BEVEL_ENABLED, VT_BEVEL_THICKNESS, VT_BEVEL_SIZE, VT_BEVEL_OFFSET, VT_BEVEL_SEGMENTS)
}


//MATERIAL CREATION

/**
 * This function returns material string constant based on passed material.
 * @param {object} material the three js material to clone.
 * 
 * @returns {string} string constant for material type.
 * 
 */
export function materialTypeConstant(material){
  let result = undefined;

  switch (material.type) {
    case 'MeshBasicMaterial':
      result = 'BASIC';
      break;
    case 'MeshLambertMaterial':
      result = 'LAMBERT';
      break;
    case 'MeshPhongMaterial':
      result = 'PHONG';
      break;
    case 'MeshStandardMaterial':
      result = 'STANDARD';
      break;
    case 'MeshPhysicalMaterial':
      result = 'PBR';
      break;
    case 'MeshToonMaterial':
      result = 'TOON';
      break;
    default:
      console.log('X');
  }

  return result
};

/**
 * This function creates a new material reference prperty set based on passed material and target property.
 * useCase='SIMPLE','STENCIL','STENCIL_CHILD'
 * @param {string} [type='BASIC'] the type of material.
 * @param {string} [color='white'] the color of the material.
 * @param {bool} [transparent=false] if true, material has transparent property enabled.
 * @param {number} [opacity=1] the opacity value for the material.
 * @param {object} [side=THREE.FrontSide] the side of the mesh that gets rendered.
 * @param {string} [useCase='SIMPLE'] used to set stencil rendering.
 * @param {bool} [emissive=false] if true, material made emissive.
 * @param {bool} [reflective=false] if true, material made reflective.
 * @param {bool} [iridescent=false] if true, material made iridescent.
 * 
 * @returns {object} Data (materialRefProperties).
 * 
 */
export function materialProperties(type='BASIC', color='white', transparent=false, opacity=1, side=THREE.FrontSide, useCase='SIMPLE', emissive=false, reflective=false, iridescent=false){
  return {
    'type': type,
    'color': color,
    'transparent': transparent,
    'opacity': opacity,
    'side': side,
    'useCase': useCase,
    'emissive': emissive,
    'reflective': reflective,
    'iridescent':iridescent
  }
};

/**
 * This function creates a new material reference prperty set based on passed material and target property.
 * @param {string} [matType='PHONG'] the type of material.
 * @param {object} [ref=undefined] the reference to the material.
 * @param {string} [targetProp='animation'] target propert of mesh.
 * @param {bool} [useMaterialView=false] if true view for material preview is created.
 * @param {bool} [isHVYM=false] identifier for mesh that has heavymeta data.
 * @param {object} [hvymCtrl=undefined] (HVYM_Data) class object.
 * 
 * @returns {object} Data (materialRefProperties).
 * 
 */
export function materialRefProperties(matType='PHONG', ref=undefined, targetProp='color', valueProps=numberValueProperties( 0, 0, 1, 3, 0.001, false), useMaterialView=false, isHVYM=false, hvymCtrl=undefined){
  return {
    'type': 'MAT_REF',
    'matType': matType,
    'ref': ref,
    'targetProp': targetProp,
    'valueProps': valueProps,
    'useMaterialView': useMaterialView,
    'isHVYM': isHVYM,
    'hvymCtrl': hvymCtrl
  }
};

/**
 * This function creates a new material reference prperty set based on passed material and target property.
 * used to set up control over a specific material property.
 * @param {object} material the three js material to base propert set on.
 * @param {string} prop the target property on the material.
 * @param {bool} [useMaterialView=false] if true, widget will use an indicator for the material.
 * 
 * @returns {object} (materialRefProperties).
 * 
 */
export function materialRefPropertiesFromMaterial(material, prop, useMaterialView=false){
  let matType = materialTypeConstant(material);
  let valProp = materialNumberValueProperties(material, prop);

  return materialRefProperties(matType, material, prop, valProp, useMaterialView);
}

/**
 * This function creates a new material based on another copying all the first level properties.
 * @param {object} material the three js material to clone.
 * 
 * @returns {object} new three js material.
 * 
 */
export function shallowCloneMaterial(material){
  const matType = materialTypeConstant(material);
  let clonedMat = getBaseMaterial('#'+material.color.getHexString(), matType);
  Object.keys(material).forEach((prop, idx) => {
    if(BaseWidget.IsMaterialSliderProp(prop) || BaseWidget.IsMaterialColorProp(prop)){
      clonedMat[prop] = material[prop];
    }
  });

  return clonedMat
}

/**
 * This function creates a new material porperty set for phong material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function basicMatProperties(color='white'){
  return materialProperties('BASIC', color, false, 1, THREE.FrontSide, 'SIMPLE');
};

/**
 * This function creates a new material porperty set for phong stencil material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function basicStencilMatProperties(color='white'){
  return materialProperties('BASIC', color, false, 1, THREE.FrontSide, 'STENCIL');
};

/**
 * This function creates a new material porperty set for basic stencil child material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function basicStencilChildMatProperties(color='white'){
  return materialProperties('BASIC', color, false, 1, THREE.FrontSide, 'STENCIL_CHILD');
};

/**
 * This function creates a new material porperty set for phong material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function phongMatProperties(color='white'){
  return materialProperties('PHONG', color, false, 1, THREE.FrontSide, 'SIMPLE');
};

/**
 * This function creates a new material porperty set for phong stencil material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function phongStencilMatProperties(color='white'){
  return materialProperties('PHONG', color, false, 1, THREE.FrontSide, 'STENCIL');
};

/**
 * This function creates a new material porperty set for phong stencil child material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function phongStencilChildMatProperties(color='white'){
  return materialProperties('PHONG', color, false, 1, THREE.FrontSide, 'STENCIL_CHILD');
};

/**
 * This function creates a new material porperty set for lambert material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function lambertMatProperties(color='white'){
  return materialProperties('LAMBERT', color, false, 1, THREE.FrontSide, 'SIMPLE');
};

/**
 * This function creates a new material porperty set for lambert stencil material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function lambertStencilMatProperties(color='white'){
  return materialProperties('LAMBERT', color, false, 1, THREE.FrontSide, 'STENCIL');
};

/**
 * This function creates a new material porperty set for lambert stencil child material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function lambertStencilChildMatProperties(color='white'){
  return materialProperties('LAMBERT', color, false, 1, THREE.FrontSide, 'STENCIL_CHILD');
};

/**
 * This function creates a new material porperty set for standard material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function standardMatProperties(color='white'){
  return materialProperties('STANDARD', color, false, 1, THREE.FrontSide, 'SIMPLE');
};

/**
 * This function creates a new material porperty set for standard stencil material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function standardMatStencilProperties(color='white'){
  return materialProperties('STANDARD', color, false, 1, THREE.FrontSide, 'STENCIL');
};

/**
 * This function creates a new material porperty set for standard stencil child material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function standardMatStencilChildProperties(color='white'){
  return materialProperties('STANDARD', color, false, 1, THREE.FrontSide, 'STENCIL_CHILD');
};

/**
 * This function creates a new material porperty set for pbr material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function pbrMatProperties(color='white'){
  return materialProperties('PBR', color, false, 1, THREE.FrontSide, 'SIMPLE');
};

/**
 * This function creates a new material porperty set for pbr stencil material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function pbrMatStencilProperties(color='white'){
  return materialProperties('PBR', color, false, 1, THREE.FrontSide, 'STENCIL');
};

/**
 * This function creates a new material porperty set for pbr stencil child material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function pbrMatStencilChildProperties(color='white'){
  return materialProperties('PBR', color, false, 1, THREE.FrontSide, 'STENCIL_CHILD');
};

/**
 * This function creates a new material porperty set for toon material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function toonMatProperties(color='white'){
  return materialProperties('TOON', color, false, 1, THREE.FrontSide, 'SIMPLE');
};

/**
 * This function creates a new material porperty set for toon stencil material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function toonMatStencilProperties(color='white'){
  return materialProperties('TOON', color, false, 1, THREE.FrontSide, 'STENCIL');
};

/**
 * This function creates a new material porperty set for toon stencil child material.
 * @param {string} [color='white'] the color of the material.
 * 
 * @returns {object} (materialProperties).
 * 
 */
export function toonMatStencilChildProperties(color='white'){
  return materialProperties('TOON', color, false, 1, THREE.FrontSide, 'STENCIL_CHILD');
};

/**
 * This function creates a new material based on passed properties.
 * material type constants: 'BASIC', 'PHONG', 'LAMBERT', 'STANDARD', 'PBR', 'TOON'
 * @param {string} [color='white'] (materialProperties) properties of material used on box.
 * @param {string} [type='BASIC'] the material constant type.
 * @param {object} [side=THREE.FrontSide] the side of the mesh that gets rendered.
 * 
 * @returns {object} new three js material.
 * 
 */
export function getBaseMaterial(color='white', type='BASIC', side=THREE.FrontSide){
  let mat = undefined;
  switch (type) {
    case 'BASIC':
      mat = new THREE.MeshBasicMaterial({ color: color, side: side });
      break;
      
    case 'PHONG':
      mat = new THREE.MeshPhongMaterial({ color: color, side: side });
      break;

    case 'LAMBERT':
      mat = new THREE.MeshLambertMaterial({ color: color, side: side });
      break;

    case 'STANDARD':
      mat = new THREE.MeshStandardMaterial({ color: color, side: side });
      break;

    case 'PBR':
      mat = new THREE.MeshPhysicalMaterial({ color: color, side: side });
      break;

    case 'TOON':
      mat = new THREE.MeshToonMaterial({ color: color, side: side });
      break;

    default:
      mat = new THREE.MeshBasicMaterial({ color: color, side: side });
  }

  return mat
};

/**
 * This function creates and stores a new stencil reference.
 * 
 * @returns {int} new stencil integer.
 * 
 */
export function getStencilRef(){
  let ref = stencilRefs.length+1;
  stencilRefs.push(ref);

  return stencilRefs[stencilRefs.length-1]
}

/**
 * This function creates a new transparent material.
 * @param {object} matProps (materialProperties) properties of material used on box.
 * @param {number} [stencilRef=0] the stencil ref to be used.
 * 
 * @returns {object} new three js material.
 * 
 */
export function getMaterial(matProps, stencilRef=0){
  const mat = getBaseMaterial(matProps.color, matProps.type, matProps.side);
  mat.transparent = matProps.transparent;
  mat.opacity = matProps.opacity;

  if(matProps.useCase == 'STENCIL'){
    setupStencilMaterial(mat, getStencilRef());
  }else if(matProps.useCase == 'STENCIL_CHILD'){
    setupStencilChildMaterial(mat, stencilRef);
  }

  return mat
};

/**
 * This function creates a new transparent material.
 * 
 * @returns {object} new three js material.
 * 
 */
export function transparentMaterial(){
  const mat = new THREE.MeshBasicMaterial();
  mat.transparent = true;
  mat.opacity = 0;

  return mat
};

/**
 * This function sets up material to render another inside of it.
 * @param {object} material the material to be darkened.
 * @param {number} stencilRef the stencil reference to be set on the material.
 * 
 * @returns {null} no return.
 * 
 */
export function setupStencilMaterial(mat, stencilRef){
  mat.depthWrite = false;
  mat.stencilWrite = true;
  mat.stencilRef = stencilRef;
  mat.stencilFunc = THREE.AlwaysStencilFunc;
  mat.stencilZPass = THREE.ReplaceStencilOp;
};

/**
 * This function sets up material to be rendered inside another, no depth sorting.
 * @param {object} material the material to be darkened.
 * @param {number} stencilRef the stencil reference to be set on the material.
 * 
 * @returns {null} no return.
 * 
 */
export function setupStencilChildMaterial(mat, stencilRef){
  mat.depthWrite = false;
  mat.stencilWrite = true;
  mat.stencilTest = true;
  mat.stencilRef = stencilRef;
  mat.stencilFunc = THREE.EqualStencilFunc;
};

/**
 * This function sets up material to be rendered inside another with depth sorting.
 * @param {object} material the material to be darkened.
 * @param {number} stencilRef the stencil reference to be set on the material.
 * 
 * @returns {null} no return.
 * 
 */
export function setupStencilChildDepthMaterial(mat, stencilRef){
  mat.depthWrite = true;
  mat.stencilWrite = true;
  mat.stencilTest = true;
  mat.stencilRef = stencilRef;
  mat.stencilFunc = THREE.EqualStencilFunc;
};

/**
 * This function creates a new material based on passed property set, assigns a new stencil ref.
 * @param {object} matProps (materialProperties) property set.
 * 
 * @returns {object} new three js material.
 * 
 */
export function stencilMaterial(matProps){
  let stencilRef = getStencilRef();
  return getMaterial(matProps, stencilRef);
};

/**
 * This function darkens passed material color by passed value.
 * @param {object} material the material to be darkened.
 * @param {number} value the amount the material color value should be lightened.
 * @param {number} [alpha=100] the alpha value of the material.
 * 
 * @returns {null} no return.
 * 
 */
export function darkenMaterial(material, value, alpha=100){
  let c = colorsea('#'+material.color.getHexString(), alpha).darken(value);
  material.color.set(c.hex());
}

/**
 * This function lightens passed material color by passed value.
 * @param {object} material the material to be lightened.
 * @param {number} value the amount the material color value should be lightened.
 * @param {number} [alpha=100] the alpha value of the material.
 * 
 * @returns {null} no return.
 * 
 */
export function lightenMaterial(material, value, alpha=100){
  let c = colorsea('#'+material.color.getHexString(), alpha).lighten(value);
  material.color.set(c.hex());
}

/**
 * This function creates vector 3 position for the center of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function centerPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3(parentSize.width-parentSize.width, parentSize.height-parentSize.height, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the left top center of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function topCenterPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3(parentSize.width-parentSize.width, (parentSize.height/2)-childSize.height/2-padding, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the top center outside of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function topCenterOutsidePos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3(parentSize.width-parentSize.width, (parentSize.height/2)+childSize.height/2+padding, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the bottom center of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function bottomCenterPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3(parentSize.width-parentSize.width, -(parentSize.height/2)+childSize.height/2+padding, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the bottom center outside of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function bottomCenterOutsidePos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3(parentSize.width-parentSize.width, -(parentSize.height/2)-childSize.height/2-padding, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the right center of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function rightCenterPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3((parentSize.width/2)-childSize.width/2-padding, parentSize.height-parentSize.height, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the right top corner of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function rightTopCornerPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3((parentSize.width/2)-childSize.width/2-padding, (parentSize.height/2)-childSize.height/2-padding, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the left bottom corner of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function rightBottomCornerPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3((parentSize.width/2)-childSize.width/2-padding, -(parentSize.height/2)+childSize.height/2+padding, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the left center of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function leftCenterPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3(-(parentSize.width/2)+childSize.width/2+padding, parentSize.height-parentSize.height, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the left top corner of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function leftTopCornerPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3(-(parentSize.width/2)+childSize.width/2+padding, (parentSize.height/2)-childSize.height/2-padding, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates vector 3 position for the left bottom corner of the parent.
 * @param {number} parentSize size of parent object.
 * @param {number} childSize size of child object.
 * @param {number} [zPosDir=1] if 1, object aligned in front of parent, else behind parent.
 * @param {object} [padding=0.025] extra padding on size of object.
 * 
 * @returns {object} Data THREE.Vector3.
 * 
 */
export function leftBottomCornerPos(parentSize, childSize, zPosDir=1, padding=0.025){
  return new THREE.Vector3(-(parentSize.width/2)+childSize.width/2+padding, -(parentSize.height/2)+childSize.height/2+padding, (parentSize.depth/2+childSize.depth/2)*zPosDir);
}

/**
 * This function creates a property set for value prop reference.
 * @param {string} [targetProp='animation'] target propert of mesh.
 * @param {object} [hvymCtrl=undefined] (HVYM_Data) class object.
 * 
 * @returns {object} Data animRefProperties.
 * 
 */
export function valPropRefProperties( targetProp='default', hvymCtrl=undefined){
  return {
    'type': 'VAL_PROP_REF',
    'targetProp': targetProp,
    'hvymCtrl': hvymCtrl
  }
};

/**
 * This function creates a property set for animation reference.
 * loop constants: 'loopOnce', 'loopRepeat', 'pingPong', 'clamp'
 * @param {number} start animation start time.
 * @param {number} end animation end time.
 * @param {string} [loop='loopRepeat'] how the animations loop.
 * @param {object} [ref=undefined] reference for the animation object in imported model.
 * @param {object} [valueProps=stringValueProperties] property set for value type of widget.
 * @param {string} [targetProp='animation'] target propert of mesh.
 * @param {bool} [useMaterialView=false] if true view for material preview is created.
 * @param {bool} [isHVYM=false] identifier for mesh that has heavymeta data.
 * @param {object} [hvymCtrl=undefined] (HVYM_Data) class object.
 * 
 * @returns {object} Data animRefProperties.
 * 
 */
export function animRefProperties( start, end, loop='loopRepeat', ref=undefined, valueProps=stringValueProperties(), targetProp='animation', useMaterialView=false, isHVYM=false, hvymCtrl=undefined){
  return {
    'type': 'ANIM_REF',
    'start': start,
    'end': end,
    'loop': loop,
    'ref': ref,
    'valueProps': valueProps,
    'targetProp': targetProp,
    'useMaterialView': useMaterialView,
    'isHVYM': isHVYM,
    'hvymCtrl': hvymCtrl
  }
};

/**
 * This function creates a property set for mesh reference.
 * @param {bool} [isGroup=false] if three js mesh consists of multiple meshes.
 * @param {object} [ref=undefined] Object3D mesh reference.
 * @param {object} [valueProps=stringValueProperties] property set for value type of widget.
 * @param {string} [targetProp='visibility'] target propert of mesh.
 * @param {bool} [useMaterialView=false] if true view for material preview is created.
 * @param {object} [targetMorph=undefined] if defined morph.
 * @param {bool} [isHVYM=false] identifier for mesh that has heavymeta data.
 * @param {object} [hvymCtrl=undefined] (HVYM_Data) class object.
 * 
 * @returns {object} Data meshRefProperties.
 * 
 */
export function meshRefProperties(isGroup=false, ref=undefined, valueProps=stringValueProperties(), targetProp='visible', useMaterialView=false, targetMorph=undefined, isHVYM=false, hvymCtrl=undefined){
  return {
    'type': 'MESH_REF',
    'isGroup': isGroup,
    'ref': ref,
    'valueProps': valueProps,
    'targetProp': targetProp,
    'useMaterialView': useMaterialView,
    'targetMorph': targetMorph,
    'isHVYM': isHVYM,
    'hvymCtrl': hvymCtrl
  }
};

/**
 * This function creates a property set for text mesh creation.
 * @param {string} font path to the font json file.
 * @param {number} letterSpacing space between letters.
 * @param {number} lineSpacing space between text lines.
 * @param {number} wordSpacing space between words.
 * @param {number} text padding.
 * @param {number} size text size.
 * @param {number} height text height.
 * @param {number} zOffset position of text in z.
 * @param {object} [matProps=materialProperties] (materialProperties) properties of material used on box.
 * @param {number} [meshProps=textMeshProperties] text mesh properties.
 * @param {string} [align='CENTER'] text alignment.
 * @param {bool} [editText=false] if true, text is editable.
 * @param {bool} [wrap=true] if true, text wraps in box.
 * 
 * @returns {object} Data textProperties.
 * 
 */
export function textProperties(font, letterSpacing, lineSpacing, wordSpacing, padding, size, height, zOffset=-1, matProps=materialProperties(), meshProps=textMeshProperties(), align='CENTER', editText=false, wrap=true) {
  return {
    'font': font,
    'letterSpacing': letterSpacing,
    'lineSpacing': lineSpacing,
    'wordSpacing': wordSpacing,
    'padding': padding,
    'size': size,
    'height': height,
    'zOffset': zOffset,
    'matProps': matProps,
    'meshProps': meshProps,
    'align': align,
    'editText': editText,
    'wrap': wrap
  }
};

//Default widget text properties
const W_LETTER_SPACING = 0.02;
const W_LINE_SPACING = 0.1;
const W_WORD_SPACING = 0.1;
const W_TEXT_PADDING = 0.015;
const W_TEXT_SIZE = 0.04;
const W_TEXT_HEIGHT = 0.005;
const W_TEXT_Z_OFFSET = 1;
const W_TEXT_MAT_PROPS = basicMatProperties(SECONDARY_COLOR_A);
const W_TEXT_MESH_PROPS = defaultWidgetTextMeshProperties();

/**
 * This function creates a default material properties for text elements.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data materialProperties.
 */
export function defaultWidgetTextProperties(font){
  return textProperties( font, W_LETTER_SPACING, W_LINE_SPACING, W_WORD_SPACING , W_TEXT_PADDING, W_TEXT_SIZE, W_TEXT_HEIGHT, W_TEXT_Z_OFFSET, W_TEXT_MAT_PROPS, W_TEXT_MESH_PROPS);
};

/**
 * This function creates a default material properties for text portal elements.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data materialProperties.
 */
export function defaultWidgetStencilTextProperties(font){
  let textProps = defaultWidgetTextProperties(font);
  textProps.matProps = phongStencilMatProperties(SECONDARY_COLOR_A);

  return textProps
};

//Default value text properties
const VT_LETTER_SPACING = 0.02;
const VT_LINE_SPACING = 0.1;
const VT_WORD_SPACING = 0.1;
const VT_TEXT_PADDING = 0.01;
const VT_TEXT_SIZE = 0.05;
const VT_TEXT_HEIGHT = 0.05;
const VT_TEXT_Z_OFFSET = 1;
const VT_TEXT_MAT_PROPS = basicMatProperties(SECONDARY_COLOR_A);
const VT_TEXT_MESH_PROPS = defaultValueTextMeshProperties();

/**
 * This function creates a default material properties for value text elements.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data materialProperties.
 */
export function defaultValueTextProperties(font){
  return textProperties( font, VT_LETTER_SPACING, VT_LINE_SPACING, VT_WORD_SPACING , VT_TEXT_PADDING, VT_TEXT_SIZE, VT_TEXT_HEIGHT, VT_TEXT_Z_OFFSET, VT_TEXT_MAT_PROPS, VT_TEXT_MESH_PROPS);
};

/**
 * This function creates a default material properties for value text portal elements.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data materialProperties.
 */
export function defaultStencilValueTextProperties(font){
  let textProps = defaultValueTextProperties(font);
  textProps.matProps = phongStencilMatProperties(SECONDARY_COLOR_A);

  return textProps
};

/**
 * This function creates base class for all elements with text.
 * @param {object} textProps (textProperties) property set.
 * 
 * @returns {object} Basetext class object.
 */
export class BaseText {
  constructor(textProps){
    this.is = 'BASE_TEXT';
    this.textProps = textProps;
    this.padding = textProps.padding;
    this.zPosDir = 1;
    this.MultiLetterMeshes = textProps.MultiLetterMeshes;
    this.multiTextArray = [];
    this.material = getMaterial(textProps.matProps);
    this.meshes = {};
    this.editText = textProps.editText;
    this.wrap = textProps.wrap;
  }
  DarkenTextMaterial(amount=10){
    darkenMaterial(this.material, amount);
  }
  LightenTextMaterial(amount=10){
    lightenMaterial(this.material, amount);
  }
  HandlePortalStencil(){
    if(this.parent.userData.isPortal){
      setupStencilChildMaterial(this.material, this.parent.material.stencilRef);
    }
  }
  SetMaterial(material){
    this.HandlePortalStencil();
    this.material = material;
  }
  SetParent(parent){
    this.parent = parent.box;
    this.parentSize = getGeometrySize(this.parent.geometry);
    this.parentCtrl = parent;
    this.initialPositionY = (this.parentSize.height / 2) - (this.textProps.height) - (this.textProps.padding);

    if(this.parent.userData.isPortal){
      this.zPosDir = -1;
    }
  }
  AddButtonEvent(key){
    const self = this;
    this.meshes[key].addEventListener('action', function(event) {
        this.parent.dispatchEvent({type:'action'});
    });
  }
  SetTextOnTopRendering(key, renderOrder=999){
    this.meshes[key].renderOrder = renderOrder;
    this.meshes[key].onBeforeRender = function( renderer ) { renderer.clearDepth(); };
  }
  ParentText(key){
    this.parent.add(this.meshes[key]);
  }
  NewTextMesh(key, text){
    const geometry = this.GeometryText(text);
    this.HandlePortalStencil();
    if(this.MultiLetterMeshes){
      this.multiTextArray = geometry.letterMeshes;
      this.meshes[key] = this.MergedMultiText(geometry);
    }else{
      geometry.center();
      this.meshes[key] = new THREE.Mesh(geometry, this.material);
    }
    
    this.meshes[key].userData.size = getGeometrySize(this.meshes[key].geometry);
    this.meshes[key].userData.key = key;
    this.meshes[key].userData.currentText = text;
    this.meshes[key].userData.controller = this;
    this.meshes[key].userData.wrap = this.wrap;
    this.ParentText(key);
    this.AlignTextPos(key);

    if(this.editText){
      this.meshes[key].addEventListener('update', function(event) {
        this.userData.controller.UpdateTextMesh(this.userData.key, this.userData.currentText);
      });

      this.meshes[key].addEventListener('onEnter', function(event) {
        this.userData.controller.AlignEditTextToTop(this.userData.key);
      });
    }

    return this.meshes[key]
  }
  NewSingleTextMesh(key, text, sizeMult=1){
    const geometry = this.SingleTextGeometry(text, sizeMult);
    geometry.center();
    this.HandlePortalStencil();
    this.meshes[key] = new THREE.Mesh(geometry, this.material);
    this.meshes[key].userData.size = getGeometrySize(geometry);
    this.meshes[key].userData.key = key;
    this.meshes[key].userData.controller = this;
    this.ParentText(key);
    this.AlignTextPos(key);

    return this.meshes[key]
  }
  AlignEditTextToTop(key){
    let pos = new THREE.Vector3(this.meshes[key].position.x, this.initialPositionY, this.meshes[key].position.z);
    this.meshes[key].position.copy(pos);
  }
  AlignEditTextToCenter(key){
    let yPosition = -this.parentSize.height/2;
    let pos = new THREE.Vector3(this.meshes[key].position.x, yPosition, this.meshes[key].position.z);
    this.meshes[key].position.copy(pos);
  }
  AlignTextPos(key){
    if(this.textProps.align == 'CENTER'){
      this.CenterTextPos(key)
    }else if(this.textProps.align == 'LEFT'){
      this.LeftTextPos(key)
    }
  }
  AlignTextZOuterBox(key, boxSize){
    this.meshes[key].position.copy(new THREE.Vector3(this.meshes[key].position.x, this.meshes[key].position.y, boxSize.depth/2));
  }
  CenterTopTextPos(key){
    this.meshes[key].position.copy(topCenterPos(this.parentSize, this.meshes[key].userData.size, this.zPosDir, this.padding));
  }
  CenterTopOutsideTextPos(key){
    this.meshes[key].position.copy(topCenterOutsidePos(this.parentSize, this.meshes[key].userData.size, this.zPosDir, this.padding));
  }
  CenterTopOutsideChildTextPos(key, childSize){
    this.meshes[key].position.copy(topCenterOutsidePos(childSize, this.meshes[key].userData.size, this.zPosDir, this.padding));
  }
  CenterBottomTextPos(key){
    this.meshes[key].position.copy(bottomCenterPos(this.parentSize, this.meshes[key].userData.size, this.zPosDir, this.padding));
  }
  CenterBottomOutsideTextPos(key){
    this.meshes[key].position.copy(bottomCenterOutsidePos(this.parentSize, this.meshes[key].userData.size, this.zPosDir, this.padding));
  }
  CenterTextPos(key){
    this.meshes[key].position.copy(centerPos(this.parentSize, this.meshes[key].userData.size, this.zPosDir, this.padding));
  }
  LeftTextPos(key){
    this.meshes[key].position.copy(leftCenterPos(this.parentSize, this.meshes[key].userData.size, this.zPosDir, this.padding));
  }
  LeftBottomCornerTextPos(key){
    this.meshes[key].position.copy(leftBottomCornerPos(this.parentSize, this.meshes[key].userData.size, this.zPosDir, this.padding));
  }
  OffsetTextX(key, offset){
    this.meshes[key].translateX(offset);
  }
  OffsetTextY(key, offset){
    this.meshes[key].translateY(offset);
  }
  OffsetTextZ(key, offset){
    this.meshes[key].translateZ(offset);
  }
  DeleteTextGeometry(key){
    if(!this.meshes.hasOwnProperty(key))
      return;
    this.meshes[key].geometry.dispose();
  }
  UpdateTextMesh(key, text){
    if(this.meshes[key]==undefined)
      return;

    let ctrl = this.parent.userData.boxCtrl.is;
    
    this.meshes[key].geometry.dispose();
    this.meshes[key].geometry = this.GeometryText(text);
    this.meshes[key].userData.size = getGeometrySize(this.meshes[key].geometry);
    if(!this.wrap && ctrl == 'INPUT_TEXT_WIDGET'){
      this.AlignEditTextToCenter(key);
    }else{
      this.AlignTextPos(key);
    }
  }
  ReplaceTextGeometry(key, geometry){
    this.meshes[key].geometry.dispose();
    this.meshes[key].geometry = geometry;
  }
  ReplaceTextMaterial(key, material){
    this.meshes[key].material.dispose();
    this.meshes[key].material = material;
  }
  MergedMultiTextMesh(text){
    const geometry = this.MergedMultiGeometry(text);
    return new THREE.Mesh(geometry, this.material);
  }
  MergedTextMesh(text){
    const geometry = this.MergedTextGeometry(text);
    return new THREE.Mesh(geometry, this.material);
  }
  GeometryText(text){
    let geometry = undefined;
    if(this.MultiLetterMeshes){
      geometry = this.MergedMultiGeometry(text);
    }else{
      geometry = this.MergedTextGeometry(text);
    }

    return geometry
  }
  MergedTextGeometry(text) {
    const boxSize = getGeometrySize(this.parent.geometry);
    let lineWidth = -(this.parentSize.width / 2 - (this.textProps.padding));
    let yPosition = this.initialPositionY;
    

    let letterGeometries = [];

    for (let i = 0; i < text.length; i++) {
      const character = text[i];

      let geoHandler = this.TextLineGeometry(character, lineWidth, yPosition, letterGeometries);
      lineWidth = geoHandler.lineWidth;
      letterGeometries = geoHandler.letterGeometries;

      // Check if lineWidth exceeds cBox width - padding
      if (lineWidth > this.parentSize.width / 2 - this.textProps.padding && this.wrap) {
        lineWidth = -(this.parentSize.width / 2) + this.textProps.padding; // Reset x position to the upper-left corner
        yPosition -= this.textProps.lineSpacing; // Move to the next line
      }
    }

    // Merge the individual letter geometries into a single buffer geometry
    return BufferGeometryUtils.mergeGeometries(letterGeometries);
  }
  SingleTextGeometry(text, sizeMult=1){
    return new TextGeometry(text, {
      font: this.textProps.font,
      size: this.textProps.size*sizeMult,
      height: this.textProps.height,
      curveSegments: this.textProps.curveSegments,
      bevelEnabled: this.textProps.bevelEnabled,
      bevelThickness: this.textProps.bevelThickness,
      bevelSize: this.textProps.bevelSize,
      bevelOffset: this.textProps.bevelOffset,
      bevelSegments: this.textProps.bevelSegments,
    });
  }
  TextLineGeometry(character, lineWidth, yPosition, letterGeometries){
    const boxSize = getGeometrySize(this.parent.geometry);
    if (character === ' ') {
      // Handle spaces by adjusting the x position
      lineWidth += this.textProps.wordSpacing;
    } else {

      const geometry = this.SingleTextGeometry(character);
      const charSize = getGeometrySize(geometry);
      geometry.translate(lineWidth, yPosition, (this.parentSize.depth+boxSize.depth)-charSize.depth*this.zPosDir);

      // Calculate the width of the letter geometry
      let { width } = getGeometrySize(geometry);
      width+=this.textProps.letterSpacing;

      letterGeometries.push(geometry);

      // Update lineWidth
      lineWidth += width;
    }

    return { letterGeometries, lineWidth }
  }
  MergedMultiText(merged){

    const mergedMesh = new THREE.Mesh(merged.geometry, transparentMaterial());

    const boxSize = getGeometrySize(this.parent.geometry);
    const geomSize = getGeometrySize(merged.geometry);
    mergedMesh.position.set(0, -this.textProps.padding, 0);
    setMergedMeshUserData(this.parentSize, geomSize, this.textProps.padding, mergedMesh);
    mergedMesh.userData.draggable=true;
    mergedMesh.userData.horizontal=false;
    if(name==''){
      name='text-'+this.parent.id;
    }
    this.parent.name = name;
    merged.letterMeshes.forEach((m, i) => {
      mergedMesh.add(m);
    });

    return mergedMesh
  }
  MergedMultiGeometry(text){

    let lineWidth = -(this.parentSize.width / 2 - (this.textProps.padding));
    let yPosition = this.parentSize.height / 2 ;
    const letterGeometries = [];
    const letterMeshes = [];
    const cubes = [];

    for (let i = 0; i < text.length; i++) {
        const character = text[i];

        if (character === ' ') {
          // Handle spaces by adjusting the x position
          lineWidth += this.textProps.wordSpacing;
        } else {

           if(this.textProps.meshProps == undefined){
            this.textProps.meshProps = textMeshProperties()
          }
          const geometry = this.SingleTextGeometry(character);
          const cube = new THREE.BoxGeometry(this.textProps.size*2, this.textProps.size*2, this.textProps.height);

          cube.translate((this.textProps.size/2)+lineWidth, (this.textProps.size/2)+yPosition, this.parent.userData.depth/2*this.zPosDir);

          const letterMesh = new THREE.Mesh(geometry, this.material);
          letterMesh.position.set(lineWidth, yPosition, this.parent.userData.depth/2*this.zPosDir);

          // Calculate the width of the letter geometry
          let { width } = getGeometrySize(geometry);
          width+=this.textProps.letterSpacing;

          // Check if the letter is within the bounds of the cBox mesh
          if (width <= this.parent.userData.width / 2 - this.textProps.padding) {
            letterMeshes.push(letterMesh);
            letterGeometries.push(geometry);
            cubes.push(cube);
          }
          // Update lineWidth
          lineWidth += width;
        }

        // Check if lineWidth exceeds cBox width - padding
        if (lineWidth > this.parentSize.width / 2 - this.textProps.padding) {
          lineWidth = -(this.parentSize.width / 2) + this.textProps.padding; // Reset x position to the upper-left corner
          yPosition -= this.textProps.lineSpacing; // Move to the next line
        }
      }


      const mergedGeometry = BufferGeometryUtils.mergeGeometries(cubes);

      return { 'geometry': mergedGeometry, 'letterMeshes': letterMeshes }

  }
  SetMergedTextUserData(key){
    let extraSpace = this.padding*0.5;
    let geomSize = this.meshes[key].userData.size;
    this.meshes[key].userData.initialPositionY = this.parentSize.height/2 - geomSize.height/2;
    this.meshes[key].userData.maxScroll = geomSize.height/2 - this.parentSize.height/2 - (this.padding+extraSpace);
    this.meshes[key].userData.minScroll = this.meshes[key].userData.initialPositionY+this.meshes[key].userData.maxScroll+(this.padding-extraSpace);
    this.meshes[key].userData.padding = this.padding;
  }
  static CreateTextGeometry(character, font, size, height, curveSegments, bevelEnabled, bevelThickness, bevelSize, bevelOffset, bevelSegments) {
    return new TextGeometry(character, {
      'font': font,
      'size': size,
      'height': height,
      'curveSegments': curveSegments,
      'bevelEnabled': bevelEnabled,
      'bevelThickness': bevelThickness,
      'bevelSize': bevelSize,
      'bevelOffset': bevelOffset,
      'bevelSegments': bevelSegments,
    });
  }
}

/**
 * This function creates a property set toggle widgets.
 * @param {string} name element name.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {number} width  the width of the box.
 * @param {number} height  the height of the box.
 * @param {number} depth  the depth of the box.
 * @param {number} smoothness amount of geometry smoothness.
 * @param {number} radius  the curvature of the box edges.
 * @param {number} [zOffset=1]  offset of box in z relative to the parent.
 * @param {bool} [complexMesh=true] if true box created has curved edges, else simple box is used.
 * @param {object} [matProps=materialProperties] (materialProperties) properties of material used on box.
 * @param {string} [pivot='CENTER'] pivot point of the box.
 * @param {number} [padding=0.01] box padding.
 * @param {bool} [isPortal=false] if true, element is curved flat plane with stencil shader, children box are rendered inside of it.
 * 
 * @returns {object} Data object for toggle elements.
 */
export function boxProperties(name, parent, width, height, depth, smoothness, radius, zOffset = 1, complexMesh=true, matProps=materialProperties(), pivot='CENTER', padding=0.01, isPortal=false, geometry=undefined){
  return {
    'type': 'BOX_PROPS',
    'name': name,
    'parent': parent,
    'width': width,
    'height': height,
    'depth': depth,
    'smoothness': smoothness,
    'radius': radius,
    'zOffset': zOffset,
    'complexMesh': complexMesh,
    'matProps': matProps,
    'pivot': pivot,
    'padding': padding,
    'isPortal': isPortal,
    'geometry': geometry
  }
};

//default box geometry constants
const SMOOTHNESS = 3;
const RADIUS = 0.02;
const Z_OFFSET = 0.025;
const COMPLEX_MESH = true;
const MAT_PROPS = basicMatProperties(PRIMARY_COLOR_A);
const PIVOT = 'CENTER';
const PADDING = 0;
const IS_PORTAL = false;

//default widget box constants
const W_WIDTH = 1.5;
const W_HEIGHT = 0.25;
const W_DEPTH = 0.1;


/**
 * This function creates default box property set for models from passed mesh.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {object} mesh Object3D box dimensions are based on.
 * 
 * @returns {object} Data (boxProperties).
 */
export function boxPropsFromMesh(name, parent, mesh){
  let size = getGeometrySize(mesh.geometry);
  return boxProperties(name, parent, size.width, size.height, size.depth, SMOOTHNESS, RADIUS, Z_OFFSET, false, MAT_PROPS, PIVOT, PADDING, false)
};

/**
 * This function creates default box property set for widgets on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultWidgetBoxProps(name, parent){
  return boxProperties(name, parent, W_WIDTH, W_HEIGHT, W_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for widget portals on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultWidgetPortalProps(name, parent){
  let boxProps = defaultWidgetBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

//default widget box constants
const M_WIDTH = 3;
const M_HEIGHT = 3;
const M_DEPTH = 0.1;

/**
 * This function creates default box property set for models.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultModelBoxProps(name, parent){
  return boxProperties(name, parent, M_WIDTH, M_HEIGHT, M_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

//default panel widget box constants
const PW_WIDTH = 1.7;
const PW_HEIGHT = 0.25;
const PW_DEPTH = 0.05;

/**
 * This function creates default box property set for panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelWidgetBoxProps(name, parent){
  return boxProperties(name, parent, PW_WIDTH, PW_HEIGHT, PW_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for panel portals.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelWidgetPortalProps(name, parent){
  let boxProps = defaultPanelWidgetBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

const PCTRL_MAT_PROPS = basicMatProperties(PRIMARY_COLOR_B);
//default panel ctrl widget constants
const PCTRL_HEIGHT = 0.13;
const PCTRL_DEPTH = 0.01;

//default panel widget box constants
const PIT_WIDTH = 1.5;

/**
 * This function creates default box property set for edit texts on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelEditTextBoxProps(name, parent){
  return boxProperties(name, parent, PIT_WIDTH, PCTRL_HEIGHT, PCTRL_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, PCTRL_MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for edit text portals on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelEditTextPortalProps(name, parent){
  let boxProps = defaultPanelEditTextBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

//default panel widget box constants
const EDTBTN_WIDTH = 1;

/**
 * This function creates default box property set for edit text buttons on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultEditTextButtonBoxProps(name, parent){
  return boxProperties(name, parent, EDTBTN_WIDTH, PCTRL_HEIGHT, PCTRL_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, PCTRL_MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for edit text button portals on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultEditTextButtonPortalProps(name, parent){
  let boxProps = defaultEditTextButtonBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

//default panel toggle box constants
const PTGL_WIDTH = 1;

/**
 * This function creates default box property set for toggles on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelToggleBoxProps(name, parent){
  return boxProperties(name, parent, PTGL_WIDTH, PCTRL_HEIGHT, PCTRL_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, PCTRL_MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for toggle portals on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelTogglePortalProps(name, parent){
  let boxProps = defaultPanelToggleBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

//default panel toggle box constants
const PSL_WIDTH = 1.2;
const PSL_HEIGHT = 0.1;

/**
 * This function creates default box property set for sliders on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelSliderBoxProps(name, parent){
  return boxProperties(name, parent, PSL_WIDTH, PSL_HEIGHT, PCTRL_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, PCTRL_MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for slider portals on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelSliderPortalProps(name, parent){
  let boxProps = defaultPanelSliderBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

const CW_HEIGHT = 0.18;

/**
 * This function creates default box property set for color widgets on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelColorWidgetBoxProps(name, parent){
  return boxProperties(name, parent, W_WIDTH, CW_HEIGHT, PCTRL_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, PCTRL_MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for color widget portals on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelColorWidgetPortalProps(name, parent){
  let boxProps = defaultPanelColorWidgetBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

//default selector box broperties
const PLS_HEIGHT = 0.13;
const PLS_WIDTH = 0.75;

/**
 * This function creates default box property set for selector on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelListSelectorBoxProps(name, parent){
  return boxProperties(name, parent, PLS_WIDTH, PLS_HEIGHT, PCTRL_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, PCTRL_MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for selector portals on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelListSelectorPortalProps(name, parent){
  let boxProps = defaultPanelListSelectorBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

//default selector box broperties
const PBTN_WIDTH = 0.75;

/**
 * This function creates default box property set for button on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelButtonBoxProps(name, parent){
  return boxProperties(name, parent, PLS_WIDTH, PCTRL_HEIGHT, PCTRL_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, PCTRL_MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for button portals on panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelButtonPortalProps(name, parent){
  let boxProps = defaultPanelButtonBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

//default panel gltf model box props
const PGL_WIDTH = 0.15;
const PGL_HEIGHT = 0.15;

/**
 * This function creates default box property set for gltf model panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelGltfModelBoxProps(name, parent){
  return boxProperties(name, parent, PGL_WIDTH, PGL_HEIGHT, PCTRL_DEPTH, SMOOTHNESS, RADIUS, Z_OFFSET, COMPLEX_MESH, PCTRL_MAT_PROPS, PIVOT, PADDING, IS_PORTAL)
};

/**
 * This function creates default box property set for gltf model panel portals.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (boxProperties).
 */
export function defaultPanelGltfModelPortalProps(name, parent){
  let boxProps = defaultPanelGltfModelBoxProps(parent);
  boxProps.isPortal = true;

  return boxProps
};

/**
 * This function sets the mesh pivot based on passed constant type.
 * Pivot Constants: 'LEFT', 'RIGHT', 'TOP', 'TOP_LEFT', 'TOP_RIGHT','BOTTOM_LEFT', 'BOTTOM_RIGHT'
 * @param {object} mesh Object3D mesh.
 * @param {object} boxProps (boxProperties) property set.
 * 
 * @returns {null} No return.
 */
function setGeometryPivot(mesh, boxProps){
  let geomSize = getGeometrySize(mesh.geometry);
  switch (boxProps.pivot) {
    case 'LEFT':
      mesh.pivot = new THREE.Vector3(-boxProps.width/2, boxProps.height/2, boxProps.depth/2);
      break;
    case 'RIGHT':
      mesh.pivot = new THREE.Vector3(boxProps.width/2, boxProps.height/2, boxProps.depth/2);
      break;
    case 'TOP':
      mesh.pivot = new THREE.Vector3(boxProps.width/2, -boxProps.height, boxProps.depth/2);
      break;
    case 'TOP_LEFT':
      mesh.pivot = new THREE.Vector3(-boxProps.width, -boxProps.height, boxProps.depth/2);
      break;
    case 'TOP_RIGHT':
      mesh.pivot = new THREE.Vector3(boxProps.width, -boxProps.height, boxProps.depth/2);
      break;
    case 'BOTTOM':
      mesh.pivot = new THREE.Vector3(boxProps.width/2, boxProps.height, boxProps.depth/2);
      break;
    case 'BOTTOM_LEFT':
      mesh.pivot = new THREE.Vector3(-boxProps.width, boxProps.height, boxProps.depth/2);
      break;
    case 'BOTTOM_RIGHT':
      mesh.pivot = new THREE.Vector3(boxProps.width, boxProps.height, boxProps.depth/2);
      break;
    default:
      mesh.pivot = new THREE.Vector3(0, 0, 0);
  }
}

/**
 * This function creates base class for all elements with boxes.
 * @param {object} boxProps (boxProperties) property set.
 * 
 * @returns {object} BaseBox class object.
 */
export class BaseBox {
  constructor(boxProps) {
    this.is = 'BASE_BOX';
    this.parent = boxProps.parent;
    this.width = boxProps.width;
    this.height = boxProps.height;
    this.depth = boxProps.depth;
    this.matProps = boxProps.matProps;
    this.padding = boxProps.padding;
    this.complexMesh = boxProps.complexMesh;
    this.isPortal = boxProps.isPortal;
    this.material = getMaterial(boxProps.matProps);
    this.isInteractable = false;

    if(boxProps.geometry != undefined){
      this.geometry = boxProps.geometry;
    }else{
      this.geometry = this.CreateBoxGeometry(boxProps);
    }
    this.boxProps = boxProps;
    this.box = new THREE.Mesh(this.geometry, this.material);
    setGeometryPivot(this.box, boxProps);
    this.box.userData.width = this.width;
    this.box.userData.height = this.height;
    this.box.userData.depth = this.depth;
    this.box.userData.padding = this.padding;
    this.size = getGeometrySize(this.box.geometry);
    this.parentSize = getGeometrySize(this.parent.geometry);

    this.box.userData.width = boxProps.width;
    this.box.userData.height = boxProps.height;
    this.box.userData.depth = boxProps.depth;
    this.box.userData.padding = boxProps.padding;
    this.box.userData.isPortal = boxProps.isPortal;
    this.box.userData.interactableBase = false;
    this.box.userData.interactableHandle = false;
    this.box.userData.interactableBtn = false;
    this.box.userData.interactableSelection = false;

    this.parentPanel = undefined;

    this.zPosDir = 1;
    //this.zPos = this.depth/2;

    if(this.isPortal){
      this.parent.material.depthWrite = false;
      this.zPosDir = -1;
      //this.zPos = 0;
    }

    
    if(!this.parent.isScene){
      this.parent.add(this.box);
      this.parentSize = getGeometrySize(boxProps.parent.geometry);
      this.box.position.copy(this.CenterBoxPos());
      //this.box.position.set(this.box.position.x, this.box.position.y, this.parentSize.depth/2);
    }
    
    this.stencilRef = this.box.material.stencilRef;
    this.box.userData.stencilRef = this.box.material.stencilRef;
    this.box.userData.boxCtrl = this;

  }
  SetOnTopRendering(renderOrder=999){
    this.box.renderOrder = renderOrder;
    this.box.onBeforeRender = function( renderer ) { renderer.clearDepth(); };
  }
  MakePortalChild(stencilRef){
    this.stencilRef = stencilRef;
    this.box.userData.stencilRef = stencilRef;
    setupStencilChildMaterial(this.box.material, stencilRef)
    this.MakeChidrenStencilChild(this.box, stencilRef);
  }
  MakeChidrenStencilChild(child, stencilRef){
    child.traverse( function( object ) {
        if(object.isMesh){
          setupStencilChildDepthMaterial(object.material, stencilRef);
        }
    });
  }
  ToggleVisible(visible){
    this.box.traverse( function( object ) {
        if(object.isMesh){
          object.visible = visible;
        }
    });
  }
  CreateBoxGeometry(boxProps) {
    let result = undefined;
    if(this.complexMesh){
      if(this.isPortal){
        result = BaseBox.RoundedPlaneGeometry(boxProps.width, boxProps.height, boxProps.radius, boxProps.smoothness, boxProps.zOffset);
      }else{
        result = BaseBox.RoundedBoxGeometry(boxProps.width, boxProps.height, boxProps.depth, boxProps.radius, boxProps.smoothness, boxProps.zOffset);
      }
    }else{
      result = new THREE.BoxGeometry(boxProps.width, boxProps.height, boxProps.depth);
    }

    result.morphAttributes.position = [];

    return result
  }
  SetCustomGeometry(geometry) {
    this.box.geometry.dispose();
    this.box.geometry = geometry;
  }
  UpdateBoxGeometry(boxProps) {
    this.geometry.dispose();
    this.CreateBoxGeometry(boxProps);
    setGeometryPivot(this.box, boxProps);
  }
  UpdateMaterial(matProps){
    this.material.dispose();
    this.material = getMaterial(matProps);
    this.box.material = this.material;
  }
  ReplaceMaterial(material){
    this.material.dispose();
    this.material = material;
    this.box.material = this.material;
  }
  CreateHeightExpandedMorph(sizeMult){
    if(this.box.geometry == undefined)
      return;

    this.material.morphTargets = true;
    const morphGeometry = this.box.geometry.clone();
    const expansionY = (this.height/2)*sizeMult;
    //move the top verts upward, and the bottom verts downward.
    morphGeometry.attributes.position.array.forEach((v, i) => {
      let x = morphGeometry.attributes.position.getX(i);
      let y = morphGeometry.attributes.position.getY(i);
      let z = morphGeometry.attributes.position.getZ(i);
      if(y>0){
        morphGeometry.attributes.position.setXYZ(i, x, y+expansionY, z);
      }else if(y<0){
        morphGeometry.attributes.position.setXYZ(i, x, y-expansionY, z);
      }
    });

    this.box.geometry.morphAttributes.position[ 0 ] = new THREE.Float32BufferAttribute( morphGeometry.attributes.position.array, 3 );
    this.box.updateMorphTargets();
  }
  HandleListConfig(listConfig){
    if(listConfig != undefined){
      this.parent.material.depthWrite = false;
      this.box.name = listConfig.boxProps.name;
      this.listItem = new ListItemBox(listConfig);
      this.listItem.SetContent(this);
    }else{
      this.parent.add(this.box);
    }
  }
  SetColor(color){
    this.box.material.color.set(color);
  }
  SetOpacity(opacity){
    this.box.material.opacity = opacity;
  }
  NewBoxStencilMaterial(stencilRef){
    this.box.material = getMaterial(this.matProps, stencilRef);
  }
  SetStencilRef(stencilRef){
    this.box.material.stencilRef = stencilRef;
  }
  ConvertBoxMaterialToPortalMaterial(){
    this.box.material.stencilWrite = true;
    this.box.material.depthWrite = false;
    this.box.material.stencilFunc = THREE.AlwaysStencilFunc;
    this.box.material.stencilZPass = THREE.ReplaceStencilOp;
  }
  ConvertBoxMaterialToPortalChildMaterial(){
    this.box.material.depthWrite = false;
    this.box.material.stencilWrite = true;
    this.box.material.stencilFunc = THREE.EqualStencilFunc;
  }
  MakeBoxMaterialInvisible(){
    this.box.material.opacity = 0;
    this.box.material.transparent = true;
  }
  MakeBoxMaterialVisible(){
    this.box.material.opacity = 1;
    this.box.material.transparent = false;
  }
  DarkenBoxMaterial(amount=10){
    darkenMaterial(this.box.material, amount);
  }
  LightenBoxMaterial(amount=10){
    lightenMaterial(this.box.material, amount);
  }
  CreateComplemetaryColorMaterial(matProps){
    let c = '#'+this.box.material.color.getHexString()
    let colsea = colorsea(c, 100);
    matProps.color = colsea.complement().hex();

    return getMaterial(matProps, matProps.stencilRef);
  }
  AlignCenter(){
    this.box.position.copy(this.CenterBoxPos(this.zPosDir));
  }
  AlignTop(){
    this.box.position.copy(this.TopCenterBoxPos(this.zPosDir));
  }
  AlignAsTopSibling(zPosDir=1){
    this.box.position.copy(this.TopCenterParallelOutsideBoxPos());
  }
  AlignBottom(zPosDir=1){
    this.box.position.copy(this.BottomCenterBoxPos(this.zPosDir));
  }
  AlignBottomRight(zPosDir=1){
    this.box.position.copy(this.BottomRightBoxPos(this.zPosDir));
  }
  AlignFrontBottomRight(zPosDir=1){
    this.box.position.copy(this.BottomFrontRightBoxPos(this.zPosDir));
  }
  AlignOutsideBottom(zPosDir=1){
    this.box.position.copy(this.BottomCenterOutsideBoxPos(zPosDir));
  }
  AlignAsBottomSibling(zPosDir=1){
    this.box.position.copy(this.BottomCenterParallelOutsideBoxPos());
  }
  AlignLeft(){
    this.box.position.copy(this.LeftCenterBoxPos(this.zPosDir));
  }
  AlignLeftOfTransform(){
    this.box.position.set(-this.size.width/2, 0, 0);
  }
  AlignOutsideLeft(zPosDir=1){
    this.box.position.copy(this.LeftCenterOutsideBoxPos(zPosDir));
  }
  AlignRight(){
    this.box.position.copy(this.RightCenterBoxPos(this.zPosDir));
  }
  AlignOutsideRight(zPosDir=1){
    this.box.position.copy(this.LeftCenterOutsideBoxPos(zPosDir));
  }
  AlignRightOfTransform(){
    this.box.position.set(this.size.width/2, 0, 0);
  }
  AlignOutsideRight(zPosDir=1){
    this.box.position.copy(this.RightCenterOutsideBoxPos(zPosDir));
  }
  AlignOutsideFrontParent(){
    this.box.translateZ(this.parentSize.depth+this.depth/2);
  }
  AlignOutsideBehindParent(){
    this.box.translateZ(-this.parentSize.depth-this.depth/2);
  }
  CenterBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width-this.parentSize.width, this.parentSize.height-this.parentSize.height, (this.parentSize.depth/2)*zPosDir);
  }
  TopCenterBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width-this.parentSize.width, this.parentSize.height/2-this.size.height/2, (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  TopCenterOutsideBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width-this.parentSize.width, this.parentSize.height/2+this.size.height/2, (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  TopCenterParallelOutsideBoxPos(){
    return new THREE.Vector3(this.parentSize.width-this.parentSize.width, this.parentSize.height/2+this.size.height/2, -(this.parentSize.depth-this.size.depth));
  }
  BottomCenterBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width-this.parentSize.width, -this.parentSize.height/2+this.size.height/2, (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  BottomRightBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width, -this.parentSize.height/2+this.size.height/2, (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  BottomFrontRightBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width, -this.parentSize.height/2+this.size.height/2, (this.parentSize.depth+this.size.depth));
  }
  BottomCenterOutsideBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width-this.parentSize.width, -(this.parentSize.height/2+this.size.height/2), (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  BottomCenterParallelOutsideBoxPos(){
    return new THREE.Vector3(this.parentSize.width-this.parentSize.width, -(this.parentSize.height/2+this.size.height/2), -(this.parentSize.depth-this.size.depth));
  }
  RightCenterBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width/2-this.size.width/2, this.parentSize.height/2-this.parentSize.height/2, (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  RightCenterOutsideBoxPos(zPosDir=1){
    return new THREE.Vector3(this.parentSize.width/2+this.size.width/2, this.parentSize.height/2-this.parentSize.height/2, (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  LeftCenterBoxPos(zPosDir=1){
    return new THREE.Vector3(-(this.parentSize.width/2-this.size.width/2), this.parentSize.height/2-this.parentSize.height/2, (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  LeftCenterOutsideBoxPos(zPosDir=1){
    return new THREE.Vector3(-(this.parentSize.width/2+this.size.width/2), this.parentSize.height/2-this.parentSize.height/2, (this.parentSize.depth/2+this.size.depth/2)*zPosDir);
  }
  SetParentPanel(){
    if(this.box.parent.userData.panelProps!=undefined && this.box.parent.userData.panelCtrl!=undefined){
      this.parentPanel = this.box.parent.userData.panelCtrl;
      this.box.userData.parentPanel = this.parentPanel;
    }
  }
  RemoveSelf(){
    if(this.box.material){
      this.box.material.dispose();
    }
    this.box.parent.remove(this.box);
  }
  SetMinterClient(minterClient){
    this.minterClient = minterClient;
  }
  SetCustomClient(customClient){
    this.customClient = customClient;
  }
  AssignInteractableCallback(client, target=undefined){
    const self = this;
    if(target==undefined){
      target=this.box;
    }

    target.addEventListener('interactable-action', function(event) {
      if(client.is=='INTERNET_COMPUTER_CUSTOM_CLIENT'){
        if(self.customClient==undefined || self.objectControlProps==undefined || self.objectControlProps.call_props==undefined)
          return;
        let call_props = self.objectControlProps.call_props;
        
        if(!self.customClient.actor.hasOwnProperty(call_props.name))
          return;

        let interactable = self.box.userData.interactable;

        if(!interactable.has_return){
          self.customClient.call(call_props.name);
        }else{
          if(interactable.interaction_type=='button'){
            self.customClient.call(call_props.name, call_props.val_props.defaultValue);
          }else if(interactable.interaction_type=='toggle'){
            let param = self.objectControlProps.widget.on;
            self.customClient.call(call_props.name, param);
          }else if(interactable.interaction_type=='slider'){
            let param = self.objectControlProps.widget.value;
            self.customClient.call(call_props.name, param);
          }else if(interactable.interaction_type=='selector'){
            let param = self.objectControlProps.widget.selectedIndex;
            if(interactable.param_type=='STRING'){
              param = self.objectControlProps.widget.selectedKey;
            }
            self.customClient.call(call_props.name, param);
          }
          
        }
      }
    });
  }
  static RoundedBoxGeometry(width, height, depth, radius, smoothness, zOffset=1){
    const shape = new THREE.Shape();
    let eps = 0.00001;
    let _radius = radius - eps;
    shape.absarc( eps, eps, eps, -Math.PI / 2, -Math.PI, true );
    shape.absarc( eps, height -  radius * 2, eps, Math.PI, Math.PI / 2, true );
    shape.absarc( width - radius * 2, height -  radius * 2, eps, Math.PI / 2, 0, true );
    shape.absarc( width - radius * 2, eps, eps, 0, -Math.PI / 2, true );

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelSegments: smoothness * 2,
      steps: 1,
      bevelSize: _radius,
      bevelThickness: zOffset*radius,
      curveSegments: smoothness
    };

    const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
    geometry.center();
    BufferGeometryUtils.mergeVertices(geometry);
    geometry.computeVertexNormals();


    return geometry
  }
  static RoundedPlaneGeometry( width, height, radius, smoothness ) {
    
    const pi2 = Math.PI * 2;
    const n = ( smoothness + 1 ) * 4; // number of segments    
    let indices = [];
    let positions = [];
    let uvs = [];   
    let qu, sgx, sgy, x, y;
      
    for ( let j = 1; j < n + 1; j ++ ) indices.push( 0, j, j + 1 ); // 0 is center
      indices.push( 0, n, 1 );   
      positions.push( 0, 0, 0 ); // rectangle center
      uvs.push( 0.5, 0.5 );   
      for ( let j = 0; j < n ; j ++ ) contour( j );
      
      const geometry = new THREE.BufferGeometry( );
      geometry.setIndex( new THREE.BufferAttribute( new Uint32Array( indices ), 1 ) );

    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( uvs ), 2 ) );
    geometry.center();
      
      return geometry;
      
      function contour( j ) {
          
          qu = Math.trunc( 4 * j / n ) + 1 ;      // quadrant  qu: 1..4         
          sgx = ( qu === 1 || qu === 4 ? 1 : -1 ) // signum left/right
          sgy =  qu < 3 ? 1 : -1;                 // signum  top / bottom
          x = sgx * ( width / 2 - radius ) + radius * Math.cos( pi2 * ( j - qu + 1 ) / ( n - 4 ) ); // corner center + circle
          y = sgy * ( height / 2 - radius ) + radius * Math.sin( pi2 * ( j - qu + 1 ) / ( n - 4 ) );   
   
          positions.push( x, y, 0 );       
          uvs.push( 0.5 + x / width, 0.5 + y / height );       
          
      }
      
  }

}

/**
 * This simple box that is invisible.
 * @param {string} name element name.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {number} width  the width of the box.
 * @param {number} height  the height of the box.
 * @param {number} depth  the depth of the box.
 * 
 * @returns {object} Data object for toggle elements.
 */
export function InvisibleBox(parent, width=1, height=1, depth=1){
  const matProps = basicMatProperties(SECONDARY_COLOR_A);
  const boxProps = boxProperties(name, parent, width, height, depth, SMOOTHNESS, RADIUS, Z_OFFSET, false, matProps);
  let box = new BaseBox(boxProps);
  box.MakeBoxMaterialInvisible();

  return box
}

/**
 * This function creates a property set for button widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} [name='Button'] name for the element.
 * @param {string} [value=''] button value.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {bool} [mouseOver=false] if true, button expands on ouse-over.
 * @param {string} [attach='RIGHT'] alignment of where button is attached.
 * @param {object} [objectControlProps=undefined] slot for object that will be updated by widget.
 * 
 * @returns {object} Data object for button elements.
 */
export function buttonProperties( scene, boxProps, name='Button', value='', textProps=undefined, mouseOver=false, attach='RIGHT', objectControlProps=undefined){
  return {
    'type': 'BUTTON',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'value': value,
    'textProps': textProps,
    'mouseOver': mouseOver,
    'attach': attach,
    'objectControlProps': objectControlProps
  }
};


/**
 * This function creates a default property set for button widgets, used in panels.
 * @param {string} model that dimensions are based on.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for button elements, used in panels.
 */
export function buttonPropsFromMesh(scene, model){
  const boxProps = boxPropsFromMesh(model.name, model.parent, model);
  const textProps = defaultWidgetTextProperties(DEFAULT_FONT);

  return buttonProperties(scene, boxProps, model.name, '', textProps, false, 'CENTER')
};

/**
 * This function creates a default property set for button widgets, used in panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for button elements, used in panels.
 */
export function defaultPanelButtonProps(scene, name, parent, font){
  const boxProps = defaultPanelButtonBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);

  return buttonProperties(scene, boxProps, name, '', textProps, false, 'CENTER')
};

/**
 * This function creates a default property set for edit text button widgets, used in panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for edit text button elements, used in panels.
 */
export function defaultPanelEditTextButtonProps(name, parent, font){
  const boxProps = defaultEditTextButtonBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);

  return buttonProperties(boxProps, name, '', textProps)
};


/**
 * This function creates base class for elements that are boxes containing text such as buttons.
 * @param {object} buttonProps (buttonProperties) property set.
 * 
 * @returns {object} BaseTextBox class object.
 */
class BaseTextBox extends BaseBox {
  constructor(buttonProps) {
    let indicatorBoxProps = undefined;
    if(buttonProps.objectControlProps != undefined && buttonProps.objectControlProps.type == 'MAT_REF'){
      let adjustBoxProps = BaseWidget.ModelIndicatorBoxProps(buttonProps);
      buttonProps.boxProps = adjustBoxProps.base;
      indicatorBoxProps = adjustBoxProps.indicator;
    }
    super(buttonProps.boxProps);
    this.is = 'BASE_TEXT_BOX';
    this.scene = buttonProps.scene;
    this.objectControlProps = buttonProps.objectControlProps;
    this.text = buttonProps.name;
    this.textProps = buttonProps.textProps;
    this.textProps.MultiLetterMeshes = false;
    this.matProps = buttonProps.matProps;
    this.animProps = buttonProps.animProps;
    this.listConfig = buttonProps.listConfig;
    this.mouseOver = buttonProps.mouseOver;
    this.portal = buttonProps.portal;

    this.BaseText = new BaseText(this.textProps);
    this.BaseText.SetParent(this);

    this.textMaterial = getMaterial(this.textProps.matProps, this.box.material.stencilRef);
    this.BaseText.SetMaterial(this.textMaterial);
    this.textMesh = this.CreateText();
    this.UpdateText(this.text);
    this.textMesh.userData.value = buttonProps.value;
    this.box.userData.value = buttonProps.value;
    this.box.userData.properties = buttonProps;
    adjustBoxScaleRatio(this.box, this.parent);

    BaseWidget.SetUpObjectControlProps(this);

    if(indicatorBoxProps!=undefined){
      indicatorBoxProps.parent = this.box;
      BaseWidget.AddModelInnerIndicator(this, indicatorBoxProps);
      if(this.objectControlProps.type == 'MAT_REF'){
        BaseWidget.HandleMaterialMesh(this, this.useAlpha);
        this.BaseText.OffsetTextX('btn_text', this.modelIndicator.size.width/2);
      }
      
    }

  }
  SetButtonOnTopRendering(){
    this.SetOnTopRendering(998);
    this.BaseText.SetTextOnTopRendering('btn_text', 998);
  }
  CreateText(){
    const boxSize = getGeometrySize(this.box.geometry);
    let result = this.BaseText.NewSingleTextMesh('btn_text', this.text);
    setMergedMeshUserData(boxSize, result.userData.size, this.textProps.padding, result);
    this.BaseText.AddButtonEvent('btn_text');

    return result
  }
  UpdateText(text){
    this.text = text;
    this.textMesh.geometry.dispose();
    this.textMesh.geometry = this.BaseText.SingleTextGeometry(this.text);
    this.textMesh.geometry.center();
    this.BaseText.ParentText('btn_text');
    this.BaseText.AlignTextPos('btn_text');
  }
  DeleteText(){
    this.textMesh.geometry.dispose();
    this.box.remove(this.textMesh);
  }
  ReplaceTextMesh(geometry, material){
    this.BaseText.ReplaceTextGeometry('btn_text', geometry);
    this.BaseText.ReplaceTextMaterial('btn_text', material);
  }
  UpdateBoxPropsColors(boxProps){
    let bProps = {...boxProps};
    let boxMatProps = {...bProps.matProps};
    boxMatProps.color = this.boxProps.matProps.color;
    bProps.matProps = boxMatProps;
    bProps = boxProps;

    return bProps
  }
  UpdateWidgetPropColors(props){
    let boxProps = {...props.boxProps};
    let textProps = {...props.textProps};
    let boxMatProps = {...boxProps.matProps};
    let textMatProps = {...textProps.matProps};
    boxMatProps.color = this.boxProps.matProps.color;
    textMatProps.color = this.textProps.matProps.color;

    boxProps.matProps = boxMatProps;
    textProps.matProps = textMatProps;

    props.boxProps = boxProps;
    props.textProps = textProps;

    return props
  }
}

/**
 * This function creates panel box for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelBox class object.
 */
export class PanelBox extends BaseTextBox {
  constructor(panelProps) {
    super(buttonProperties(panelProps.scene, panelProps.boxProps, panelProps.name, panelProps.value, panelProps.textProps, panelProps.mouseOver));
    this.is = 'PANEL_BOX';
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    this.DeleteText();
    this.AlignOutsideBehindParent();
  }
  AlignCtrlWidget(){
    if(this.ctrlWidget == undefined)
      return;

    this.ctrlWidget.box.position.set(this.ctrlWidget.box.position.x, -(this.height*0.6)+this.ctrlWidget.height, this.ctrlWidget.box.position.z);
  }
};

/**
 * This function creates panel gltf label widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelLabel class object.
 */
export class PanelLabel extends BaseTextBox {
  constructor(panelProps) {
    super(buttonProperties(panelProps.scene, panelProps.boxProps, panelProps.name, panelProps.value, panelProps.textProps, panelProps.mouseOver));
    this.is = 'PANEL_LABEL';
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    this.AlignOutsideBehindParent();
  }
};

/**
 * This function creates panel gltf model widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelGltfModel class object.
 */
export class PanelGltfModel extends BaseTextBox {
  constructor(panelProps) {
    super(buttonProperties(panelProps.scene, panelProps.boxProps, panelProps.name, panelProps.value, panelProps.textProps, panelProps.mouseOver));
    this.is = 'PANEL_GLTF_MODEL';
    this.scene = panelProps.scene;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    this.AlignOutsideBehindParent();
    this.panelProps = panelProps;
    const section = panelProps.sections.data[this.panelProps.index];
    this.valProps = section.data;
    this.useLabel = this.valProps.useLabel;
    this.loadedCallback = undefined;

    if(!this.useLabel){
      this.DeleteText();
    }

    let gltfProps = defaultPanelGltfModelProps(this.scene, this.panelProps.name, this.box, this.panelProps.textProps.font, this.valProps.path);
    if(panelProps.unique){
      gltfProps = this.UpdateWidgetPropColors(gltfProps);
    }
    
    gltfProps.ctrl = this;

    gltfLoader.load( gltfProps.gltf,function ( gltf ) {
        gltfProps.hvymData = new HVYM_Data(gltf);
        gltfProps.gltf = gltf;
        gltfProps.ctrl.modelBox = new GLTFModelWidget(gltfProps);
        gltfProps.ctrl.box.userData.modelBox = gltfProps.ctrl.ctrlWidget;
        if(gltfProps.ctrl.useLabel){
          gltfProps.ctrl.BaseText.CenterTopOutsideChildTextPos('btn_text', gltfProps.ctrl.modelBox.size);
          gltfProps.ctrl.BaseText.AlignTextZOuterBox('btn_text', gltfProps.ctrl.size);
        }

        if(gltfProps.ctrl.loadedCallback){
          gltfProps.ctrl.loadedCallback();
        }
      },
      // called while loading is progressing
      function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      // called when loading has errors
      function ( error ) {
        console.log( error );
      }
    );
  }
};

/**
 * This function creates panel gltf model meter widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelGltfModelMeter class object.
 */
export class PanelGltfModelMeter extends PanelGltfModel{
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_GLTF_MODEL_METER';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    const section = panelProps.sections.data[panelProps.name];
    this.SetParentPanel();
    this.meterProps = defaultPanelMeterProps(this.scene, this.panelProps.name, this.box, this.panelProps.textProps.font, this.valProps.widgetValueProp);
    if(panelProps.unique){
      this.meterProps = this.UpdateWidgetPropColors(this.meterProps);
    }

    this.DeleteText();
    this.loadedCallback = this.SetupMeter;
  }
  SetupMeter(){
    this.meterProps.boxProps.width = this.meterProps.boxProps.width-this.modelBox.size.width;
    this.ctrlWidget = new MeterWidget(this.meterProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.modelBox.box.translateX(-this.ctrlWidget.size.width/2);
    this.ctrlWidget.box.translateX(this.modelBox.size.width/2);
    this.ctrlWidget.widgetText.translateX(-this.modelBox.size.width/2);
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel gltf model value meter widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelGltfModelValueMeter class object.
 */
export class PanelGltfModelValueMeter extends PanelGltfModelMeter{
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_GLTF_MODEL_VALUE_METER';
    this.scene = panelProps.scene;
    this.propertyGrp = 'valProps';
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    this.meterProps = defaultPanelValueMeterProps(this.scene, this.panelProps.name, this.box, this.panelProps.textProps.font, this.valProps.widgetValueProp);
    if(panelProps.unique){
      this.meterProps = this.UpdateWidgetPropColors(this.meterProps);
    }
    this.loadedCallback = this.SetupValueMeter;
  }
  SetupValueMeter(){
    this.meterProps.boxProps.width = this.meterProps.boxProps.width-this.modelBox.size.width;
    this.ctrlWidget = new MeterWidget(this.meterProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.ctrlWidget.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.modelBox.box.translateX(-(this.ctrlWidget.size.width/2+this.ctrlWidget.valueTextBox.width/2));
    this.ctrlWidget.box.translateX(this.modelBox.size.width/2);
    this.ctrlWidget.widgetText.translateX(-this.modelBox.size.width/2);
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel edit text widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelEditText class object.
 */
export class PanelEditText extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.SetParentPanel();
    this.is = 'PANEL_EDIT_TEXT';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    const section = panelProps.sections.data[panelProps.name];
    let editTextProps = defaultPanelEditTextProps(this.scene, panelProps.name, this.box, panelProps.textProps.font);
    if(panelProps.unique){
      editTextProps = this.UpdateWidgetPropColors(editTextProps);
    }
    if(panelProps.unique){
      gltfProps = this.UpdateWidgetPropColors(props);
    }
    editTextProps.name = section.name;
    editTextProps.textProps.wrap = false;
    this.ctrlWidget = new InputTextWidget(editTextProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel input text widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelInputText class object.
 */
export class PanelInputText extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_INPUT_TEXT';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    const section = panelProps.sections.data[panelProps.name];
    this.SetParentPanel();
    let inputTextProps = defaultPanelInputTextProps(this.scene, panelProps.name, this.box, panelProps.textProps.font);
    if(panelProps.unique){
      inputTextProps = this.UpdateWidgetPropColors(inputTextProps);
    }
    inputTextProps.name = section.name;
    inputTextProps.textProps.wrap = false;
    this.ctrlWidget = new InputTextWidget(inputTextProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel toggle widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelBooleanToggle class object.
 */
export class PanelBooleanToggle extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_BOOLEAN_TOGGLE';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    this.DeleteText();
    let toggleProps = defaultPanelBooleanToggleProps(this.scene, panelProps.name, this.box, panelProps.textProps.font);
    if(panelProps.unique){
      toggleProps = this.UpdateWidgetPropColors(toggleProps);
    }
    this.ctrlWidget = new ToggleWidget(toggleProps);
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel slider widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelSlider class object.
 */
export class PanelSlider extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_SLIDER';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    const section = panelProps.sections.data[panelProps.name];
    let valProps = section.data;
    let objectControlProps = undefined;
    if(section.data.type.includes('HVYM')){
      valProps = valProps.val_props;
      if(section.data.type.includes('MORPH_SET_REF')){
        this.propertyGrp = 'morphSets';
        this.propertyName = panelProps.sections.name;
        objectControlProps = meshRefProperties(section.data.mesh_ref.isGroup, section.data.mesh_ref, valProps, 'morph', false, section.data.morph_name, true);
        objectControlProps.hvymCtrl = panelProps.hvymCtrl;
      }else if(section.data.type.includes('ANIM_PROP')){
        this.propertyGrp = 'animProps';
        objectControlProps = section.data.val_props;
        valProps = section.data.val_props.valueProps
      }else{
        this.propertyGrp = 'valProps';
        objectControlProps = valPropRefProperties('default', panelProps.hvymCtrl);
      }
    }
    let sliderProps = defaultPanelSliderProps(this.scene, panelProps.name, this.box, panelProps.textProps.font, valProps);
    if(panelProps.unique){
      sliderProps = this.UpdateWidgetPropColors(sliderProps);
    }
    if(objectControlProps!=undefined){
      sliderProps.objectControlProps = objectControlProps;
    }
    this.ctrlWidget = new SliderWidget(sliderProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.ctrlWidget.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel material slider widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelMaterialSlider class object.
 */
export class PanelMaterialSlider extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_MATERIAL_SLIDER';
    this.scene = panelProps.scene;
    this.propertyGrp = 'matProps';
    this.propertyName = panelProps.sections.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    const section = panelProps.sections.data[panelProps.name];
    const matRefProps = section.data;
    matRefProps.valueProps.editable = true;
    let sliderProps = defaultPanelSliderProps(this.scene, panelProps.name, this.box, panelProps.textProps.font, matRefProps.valueProps);
    if(panelProps.unique){
      sliderProps = this.UpdateWidgetPropColors(sliderProps);
    }
    if(panelProps.hvymCtrl != undefined){
      matRefProps.isHVYM = true;
      matRefProps.hvymCtrl = panelProps.hvymCtrl;
      matRefProps.ref.userData.hvymCtrl = panelProps.hvymCtrl;
    }
    sliderProps.objectControlProps = matRefProps;
    this.ctrlWidget = new SliderWidget(sliderProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.ctrlWidget.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel meter widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelMeter class object.
 */
export class PanelMeter extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_METER';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    const section = panelProps.sections.data[panelProps.name];
    let valProps = section.data;
    if(valProps.type == 'HVYM_VAL_PROP_REF'){
      this.propertyGrp = 'valProps';
      valProps = valProps.val_props;
    }
    let meterProps = defaultPanelMeterProps(this.scene, panelProps.name, this.box, panelProps.textProps.font, valProps);
    meterProps.objectControlProps = valPropRefProperties('default', panelProps.hvymCtrl);
    if(panelProps.unique){
      meterProps = this.UpdateWidgetPropColors(meterProps);
    }
    this.ctrlWidget = new MeterWidget(meterProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.ctrlWidget.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.AlignCtrlWidget();
  } 
};

/**
 * This function creates panel value meter widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelValueMeter class object.
 */
export class PanelValueMeter extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_VALUE_METER';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    const section = panelProps.sections.data[panelProps.name];
    let valProps = section.data;
    if(valProps.type == 'HVYM_VAL_PROP_REF'){
      this.propertyGrp = 'valProps';
      valProps = valProps.val_props;
    }
    let meterProps = defaultPanelValueMeterProps(this.scene, panelProps.name, this.box, panelProps.textProps.font, valProps);
    meterProps.objectControlProps = valPropRefProperties('default', panelProps.hvymCtrl);
    if(panelProps.unique){
      meterProps = this.UpdateWidgetPropColors(meterProps);
    }
    this.ctrlWidget = new MeterWidget(meterProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.ctrlWidget.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel color widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelColorWidget class object.
 */
export class PanelColorWidget extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_COLOR_WIDGET';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    let colorWidgetProps = defaultPanelColorWidgetProps(this.scene, panelProps.name, this.box, panelProps.textProps.font);
    if(panelProps.unique){
      colorWidgetProps = this.UpdateWidgetPropColors(colorWidgetProps);
    }
    this.ctrlWidget = new ColorWidget(colorWidgetProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel material color widget for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelMaterialColorWidget class object.
 */
export class PanelMaterialColorWidget extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_MATERIAL_COLOR_WIDGET';
    this.scene = panelProps.scene;
    this.propertyGrp = 'matProps';
    this.propertyName = panelProps.sections.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    const section = panelProps.sections.data[panelProps.name];
    const matRefProps = section.data;
    this.colorWidgetProps = defaultPanelColorWidgetProps(this.scene, panelProps.name, this.box, panelProps.textProps.font);
    if(panelProps.unique){
      this.colorWidgetProps = this.UpdateWidgetPropColors(this.colorWidgetProps);
    }
    if(matRefProps.targetProp=='color'){
      matRefProps.useMaterialView = true;
      this.colorWidgetProps.useAlpha = true;
    }else{
      this.colorWidgetProps.useAlpha = false;
      matRefProps.useMaterialView = false;
    }
    if(panelProps.hvymCtrl != undefined){
      matRefProps.isHVYM = true;
      matRefProps.hvymCtrl = panelProps.hvymCtrl;
      matRefProps.ref.userData.hvymCtrl = panelProps.hvymCtrl;
    }
    this.colorWidgetProps.objectControlProps = matRefProps;
    this.ctrlWidget = new ColorWidget(this.colorWidgetProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.ctrlWidget.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.ctrlWidget.SetSlidersHVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel selector for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelListSelector class object.
 */
export class PanelListSelector extends PanelBox {
  constructor(panelProps) {
    panelProps.boxProps.matProps.useCase = 'STENCIL';
    super(panelProps);
    this.is = 'PANEL_LIST_SELECTOR';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    const section = panelProps.sections.data[panelProps.name];
    this.selectors = section.data;

    if(!dataIsHVYMWidget(this.selectors))
      return;

    if(this.selectors.type == 'HVYM_MESH_SET'){
      this.propertyGrp = 'materialSets';
    }else if(this.selectors.type == 'HVYM_MAT_SET'){
      this.propertyGrp = 'animProps';
    }

    let listSelectorProps = defaultPanelListSelectorProps(this.scene, panelProps.name, this.box, panelProps.textProps.font);
    if(panelProps.unique){
      listSelectorProps = this.UpdateWidgetPropColors(listSelectorProps);
    }
    this.ctrlWidget = new SelectorWidget(listSelectorProps);
    this.ctrlWidget.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.ctrlWidget.box.userData.hoverZPos = this.size.depth*2;
    this.ctrlWidget.AssignSelectionSet(this.selectors);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel toggle for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelToggle class object.
 */
export class PanelToggle extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_TOGGLE';
    this.scene = panelProps.scene;
    this.propertyName = panelProps.name;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    const section = panelProps.sections.data[panelProps.name];
    const sectionProps = section.data;
    let toggleProps = defaultPanelBooleanToggleProps(this.scene, sectionProps.name, this.box, panelProps.textProps.font, false);
    if(panelProps.unique){
      toggleProps = this.UpdateWidgetPropColors(toggleProps);
    }
    if(sectionProps.type == 'HVYM_MESH_PROP_REF'){
      this.propertyGrp = 'meshProps';
      toggleProps.on = sectionProps.val_props.ref.visible;
      toggleProps.objectControlProps = sectionProps.val_props;
    }else if(sectionProps.type == 'HVYM_ANIM_PROP'){
      this.propertyGrp = 'animProps';
      toggleProps.on = sectionProps.play;
      toggleProps.objectControlProps = sectionProps.val_props;
    }
    
    this.ctrlWidget = new ToggleWidget(toggleProps);
    this.ctrlWidget.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel button for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelButton class object.
 */
export class PanelButton extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_BUTTON';
    this.scene = panelProps.scene;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    let buttonProps = defaultPanelButtonProps(this.scene, panelProps.name, this.box, panelProps.textProps.font);
    if(panelProps.unique){
      buttonProps = this.UpdateWidgetPropColors(buttonProps);
    }
    this.ctrlWidget = ButtonElement(buttonProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    this.AlignCtrlWidget();
  }
};

/**
 * This function creates panel button for debugging value prop contract calls.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} PanelButton class object.
 */
export class PanelDebugButton extends PanelBox {
  constructor(panelProps) {
    super(panelProps);
    this.is = 'PANEL_BUTTON';
    this.scene = panelProps.scene;
    this.collectionId = panelProps.collectionId;
    this.SetParentPanel();
    const section = panelProps.sections.data[panelProps.name];
    const valProps = section.data.val_props;

    let buttonProps = defaultPanelButtonProps(this.scene, panelProps.name, this.box, panelProps.textProps.font);
    buttonProps.objectControlProps = section.data;
    buttonProps.valueProps = valProps;

    this.ctrlWidget = new ButtonWidget(buttonProps);
    this.box.userData.ctrlWidget = this.ctrlWidget;
    if(section.data.type == 'HVYM_CALL_PROP_REF' || section.data.type == 'HVYM_VAL_PROP_REF'){
      this.ctrlWidget.SetMinterClient(panelProps.scene.nftMinter);
    }
    this.AlignCtrlWidget();
  }
}


/**
 * This function creates a property set for panels.
 * value types: container, controls, label, edit_text, input_text, toggle, int_slider, float_slider
 * @param {string} [name='Section'] name of the panel section.
 * @param {string} [value_type='container'] use for this panel.
 * @param {object} [data={}] value data attached to the panel.
 * 
 * @returns {object} Data (panelSectionProperties)
 */
export function panelSectionProperties(name='Section', value_type='container', data={}){
  return {
    'type': 'PANEL_SECTION',
    'name': name,
    'value_type': value_type,
    'data': data
  }
};

/**
 * This function creates a default property set for material panels.
 * @param {object} material target material.
 * @param {bool} [emissive=false] if true, emissive property is exposed.
 * @param {bool} [reflective=false] if true, reflective property is exposed.
 * @param {bool} [iridescent=false] if true, iridescent property is exposed.
 * @param {bool} [sheen=false] if true, sheen property is exposed.
 * 
 * @returns {object} Data (panelSectionProperties)
 */
export function panelMaterialSectionPropertySet(propName, material, emissive=false, reflective=false, iridescent=false, sheen=false){
  let sectionData = {};
  let matType = materialTypeConstant(material);
  let props = {}

  switch (material.type) {
    case 'MeshBasicMaterial':
      props['color'] = 'mat_color_widget';
      break;
    case 'MeshLambertMaterial':
      props['color'] = 'mat_color_widget';
      break;
    case 'MeshPhongMaterial':
      props['color'] = 'mat_color_widget';
      props['specular'] = 'mat_color_widget';
      props['shininess'] = 'mat_slider';
      break;
    case 'MeshStandardMaterial':
      props['color'] = 'mat_color_widget';
      props['roughness'] = 'mat_slider';
      props['metalness'] = 'mat_slider';
      break;
    case 'MeshPhysicalMaterial':
      props['color'] = 'mat_color_widget';
      props['roughness'] = 'mat_slider';
      props['metalness'] = 'mat_slider';
      if(reflective){
        props['ior'] = 'mat_slider';
        props['reflectivity'] = 'mat_slider';
      }
      if(iridescent){
        props['iridescence'] = 'mat_slider';
        props['iridescenceIOR'] = 'mat_slider';
      }
      if(sheen){
        props['sheen'] = 'mat_slider';
        props['sheenRoughness'] = 'mat_slider';
        props['sheenColor'] = 'mat_color_widget';
      }
      
      props['clearcoat'] = 'mat_slider';
      props['clearCoatRoughness'] = 'mat_slider';
      props['specularColor'] = 'mat_color_widget';
      break;
    case 'MeshToonMaterial':
      props['color'] = 'mat_color_widget';
      break;
    default:
      console.log('X');
  }

  if(emissive){
    props['emissive'] = 'mat_color_widget';
    props['emissiveIntensity'] = 'mat_slider';
  }

  sectionData[propName] = panelSectionProperties(material.name, 'label', {});

  Object.keys(props).forEach((prop, idx) => {
    if(material.hasOwnProperty(prop)){
      let valProp = materialNumberValueProperties(material, prop);

      let matRefProp = materialRefProperties(matType, material, prop, valProp);
      let widget = props[prop];
      let i = (idx+1).toString();
      sectionData[prop] = panelSectionProperties(prop, widget, matRefProp);
    }
  });

  return panelSectionProperties(propName, 'controls', sectionData)
};

/**
 * This function creates a default property set for panels.
 * @param {object} materialSet Object3D that the model widget should be parented to.
 * 
 * @returns {object} Data (panelSectionProperties)
 */
export function panelMaterialSetSectionPropertySet(materialSet){
  let sectionData = {};
  let matType = undefined;
  let props = {}

  return panelSectionProperties(materialSet.name, 'controls', sectionData)
};

/**
 * This function creates a property set for panel widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} [name=''] name for the element.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {string} [attach='LEFT'] how the panel is attached.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {object} [sections={}] (panelSectionProperties) used to create panels.
 * @param {bool} [open=true] if true panel is open, else closed.
 * @param {bool} [expanded=true] if true panel is expanded, else collapsed.
 * @param {bool} [isSubPanel=true] identifier indicating whether panel is child of another panel.
 * @param {object} [topPanel=undefined] (Object3D) this is always set to the topmost panel element.
 * @param {object} [topCtrl=undefined] (BasePanel) if subPane, this is the hook to the parent BasePanel class.
 * @param {number} [index=0] index of the panel.
 * 
 * @returns {object} Data object for panel elements.
 */
export function panelProperties( scene, boxProps, name='Panel', textProps, attach='LEFT', sections={}, open=false, expanded=false, isSubPanel=false, topPanel=undefined, topCtrl=undefined, unique=false, collectionId=undefined, hvymCtrl=undefined){
  return {
    'type': 'PANEL',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'textProps': textProps,
    'attach': attach,
    'sections': sections,
    'open': open,
    'expanded': expanded,
    'isSubPanel': isSubPanel,
    'topPanel': topPanel,
    'topCtrl': topCtrl,
    'index': 0,
    'unique': unique,
    'collectionId': collectionId,
    'hvymCtrl': hvymCtrl
  }
};

/**
 * This function creates a default property set for panels.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for panels.
 */
export function hvymPanelProperties(parent, font){
  let panelBoxProps = three_text.defaultPanelWidgetBoxProps('gltf-panel-box', parent);
  let panelTextProps = three_text.defaultWidgetTextProperties(font);
};

/**
 * This function creates panel elements for expandable ui elements.
 * @param {object} panelProps (panelProperties) property set.
 * 
 * @returns {object} BasePanel class object.
 */
export class BasePanel extends BaseTextBox {
  constructor(panelProps) {
    super(buttonProperties(panelProps.scene, panelProps.boxProps, panelProps.name, panelProps.value, panelProps.textProps, panelProps.mouseOver));
    this.is = 'BASE_PANEL';
    this.scene = panelProps.scene;
    this.unique = panelProps.unique;
    this.collectionId = panelProps.collectionId;
    this.boxProps = panelProps.boxProps;
    this.name = panelProps.name;
    this.textProps = panelProps.textProps;
    this.matProps = panelProps.boxProps.matProps;
    this.attach = panelProps.attach;
    this.sections = panelProps.sections;
    this.sectionsValueTypes = panelProps.sections.value_type;
    this.open = panelProps.open;
    this.isSubPanel = panelProps.isSubPanel;
    this.panelList = [];
    this.controlList = [];
    this.panelProps = panelProps;
    this.siblingPanel = undefined;
    this.box.userData.panelProps = this.panelProps;
    this.box.userData.panelCtrl = this;
    this.panelMaterials = [];
    this.SetParentPanel();


    if(this.isSubPanel){
      this.subPanelMaterial = panelProps.topCtrl.subPanelMaterial;
      this.ctrlPanelMaterial = panelProps.topCtrl.ctrlPanelMaterial;
      this.handleMaterial = panelProps.topCtrl.handleMaterial;
    }else{
      this.subPanelMaterial = getMaterial(this.matProps, this.matProps.stencilRef);
      darkenMaterial(this.subPanelMaterial, 10);
      this.panelMaterials.push(this.subPanelMaterial);
      this.ctrlPanelMaterial = getMaterial(this.matProps, this.matProps.stencilRef);
      darkenMaterial(this.ctrlPanelMaterial, 20);
      this.panelMaterials.push(this.ctrlPanelMaterial);
      this.handleMaterial = this.textMaterial;
      this.panelMaterials.push(this.textMaterial);
    }

    this.box.userData.properties = panelProps;
    
    this.handleExpand = this.CreateHandle(panelProps);
    this.CreateTop();
    
    this.bottom = this.CreateBottom();
    this.box.add(this.handleExpand);
    this.box.userData.handleExpand = this.handleExpand;
    this.handleExpand.userData.targetElem = this.box;
    this.handleExpand.position.set(this.width/2, this.height/2 - this.handleExpand.userData.size.height*2, this.depth/2);

    if(panelProps.topPanel == undefined){
      panelProps.topPanel = this.box;
      panelProps.topCtrl = this;
      this.handleOpen = this.CreateTopHandle();
      this.box.renderOrder = 2;
      this.bottom.box.renderOrder = 2;
    }


    if(panelProps.expanded){
      this.handleExpand.rotation.z = this.handleExpand.rotation.z+0.8;
    }

    this.SetUserData();

    if(panelProps.sections != undefined){
      if(this.sectionsValueTypes == 'controls'){
        this.CreateControlSections(panelProps);
      }else if(this.sectionsValueTypes == 'container'){
        this.CreateContainerSections(panelProps);
      }
    }

    const self = this;

    this.handleExpand.addEventListener('close', function(event) {
      this.userData.targetElem.userData.properties.expanded = false;
      self.scene.anims.panelAnimation(this.userData.targetElem, 'EXPAND');
      this.userData.targetElem.userData.widgetElements.forEach((widget, index) =>{
        widget.userData.boxCtrl.ToggleVisible(false);
      });
    });


    this.handleExpand.addEventListener('action', function(event) {
      this.userData.targetElem.userData.properties.expanded = !this.userData.targetElem.userData.properties.expanded;
      if(!this.userData.targetElem.userData.properties.expanded){
        this.userData.targetElem.userData.panelList.forEach((panel, idx) => {

            panel.handleExpand.dispatchEvent({type:'close'});
        });
      }
      self.scene.anims.panelAnimation(this.userData.targetElem, 'EXPAND');

      if(!this.userData.targetElem.userData.properties.expanded)
      return;

      this.userData.targetElem.dispatchEvent({type:'showWidgets'});

    });


    this.box.addEventListener('hideWidgets', function(event) {
      this.userData.handleExpand.userData.targetElem.userData.widgetElements.forEach((widget, index) =>{
        widget.userData.boxCtrl.ToggleVisible(false);
      });
    });

    this.box.addEventListener('showWidgets', function(event) {
      this.userData.handleExpand.userData.targetElem.userData.widgetElements.forEach((widget, index) =>{
        widget.userData.boxCtrl.ToggleVisible(true);
      });
    });

    if(this.isSubPanel){
      this.box.dispatchEvent({type:'hideWidgets'});
    }

    if(this.handleOpen!=undefined && !this.open){
      this.box.userData.properties.open = !(this.open);
      this.scene.anims.panelAnimation(this.box, 'OPEN', 0.0001);
    }

  }
  CreateTopHandle() {
    const handle = this.CreateHandle();

    this.parent.add(handle);

    if(!this.unique){
      if(this.attach == 'CENTER'){
        handle.position.set(this.width/2, this.height/2, this.parentSize.depth+this.depth/2);
      }else if(this.attach == 'LEFT'){
        handle.position.set(-(this.parentSize.width/2), this.parentSize.height/2, this.parentSize.depth+this.depth/2);
      }else if(this.attach == 'RIGHT'){
        handle.position.set(-(this.parentSize.width/2), this.parentSize.height/2, this.parentSize.depth+this.depth/2);
      }
    }else{
      handle.position.set(0, this.height/2, this.depth/2);
    }

    this.box.userData.handleOpen = handle;
    handle.userData.targetElem = this.box;
    this.box.userData.properties.open = this.open;
    const self = this;

    handle.addEventListener('action', function(event) {
      self.scene.anims.panelAnimation(this.userData.targetElem);
    });

    if(!this.open){
      handle.rotation.z = handle.rotation.z;
    }else if(this.open){
      handle.rotation.z = handle.rotation.z+0.8;
    }

    return handle
  }
  CreateHandle() {
    let result = undefined;
    let geometry = new THREE.OctahedronGeometry(this.height*0.2, 0);
    geometry.center();
    const size = getGeometrySize(geometry);
    result = new THREE.Mesh(geometry, this.handleMaterial);
    result.userData.offRotation = new THREE.Vector3().copy(result.rotation);
    result.userData.onRotation = new THREE.Vector3(result.rotation.x, result.rotation.y, result.rotation.z+0.8)
    result.userData.size = size;
    mouseOverUserData(result);
    this.scene.clickable.push(result);

    return result
  }
  CreateBottom(){
    let boxProps = {...this.boxProps};
    boxProps.geometry = undefined;
    if(this.panelProps.topCtrl != undefined){
      boxProps.geometry = this.panelProps.topCtrl.bottom.box.geometry;
    }
    boxProps.height=boxProps.height*0.5;
    boxProps.parent = this.box;
    const result = new BaseBox(boxProps);
    let size = getGeometrySize(result.box.geometry);
    if(this.isSubPanel){
      result.box.material = this.subPanelMaterial;
    }else{
      result.box.material = this.box.material;
    }
    
    result.box.position.set(result.box.position.x, -(this.height/2+result.height/2), 0);
    this.box.add(result.box);
    result.box.userData.expandedPos = new THREE.Vector3().set(result.box.position.x, -(this.height+result.height), result.box.position.z);
    if(this.sectionsValueTypes == 'controls'){
      result.box.userData.expandedPos = new THREE.Vector3().set(result.box.position.x, -result.height, result.box.position.z);
    }
    result.box.userData.closedPos = new THREE.Vector3().copy(result.box.position);
    result.box.userData.size = size;

    return result
  }
  CreateTop(){
    if(this.attach == 'CENTER'){
      this.box.position.set(this.parentSize.width/2, this.parentSize.height/2, this.parentSize.depth);
    }else if(this.attach == 'LEFT'){
      this.boxProps.pivot = 'RIGHT';
      this.box.position.set(-(this.parentSize.width/2+this.width/2), this.parentSize.height/2-this.height/2, this.parentSize.depth);
    }else if(this.attach == 'RIGHT'){
      this.boxProps.pivot = 'LEFT';
      this.box.position.set(this.parentSize.width/2+this.width/2, this.parentSize.height/2-this.height/2, this.parentSize.depth);
    }

    if(this.isSubPanel){
      this.box.position.copy(this.parent.position);
      this.DarkenBoxMaterial();
      this.box.userData.onPos = new THREE.Vector3(this.box.position.x, -(this.parentSize.height/2-this.height/2), this.box.position.z);
      this.box.userData.offPos = new THREE.Vector3().copy(this.box.position);
    }

  }
  static GetParentPanel(box){
    let result = undefined;

    if(box.parent.userData.panelProps!=undefined && box.parent.userData.panelCtrl!=undefined){
      result = box.parent.userData.panelCtrl;
    }

    return result
  }
  SetUserData(){
    this.box.userData.textMesh = this.textMesh;
    this.box.userData.bottom = this.bottom.box;
    this.box.userData.isSubPanel = this.isSubPanel;
    this.box.userData.sectionsValueTypes = this.sectionsValueTypes;
    this.box.userData.expandedPos = new THREE.Vector3().copy(this.box.position);
    this.box.userData.closedPos = new THREE.Vector3().copy(this.box.position);
    this.box.userData.closedHeight = this.height+this.bottom.height;
    this.box.userData.onPos = new THREE.Vector3().copy(this.box.position);
    this.box.userData.offPos = new THREE.Vector3().copy(this.box.position);
    this.box.userData.onScale = new THREE.Vector3(0,0,0).copy(this.box.scale);
    this.box.userData.offScale = new THREE.Vector3(0,0,0);
    this.box.userData.sectionCount = Object.keys(this.sections).length;
    this.box.userData.openSections = 0;
    this.box.userData.sectionElements = [];
    this.box.userData.widgetElements = [];
    this.box.userData.panelList = [];
    this.box.userData.size = getGeometrySize(this.box.geometry);
  }
  CreateControlSections(panelProps){
    let index = 1;
    let widgetHeight = undefined;
    const propCount = Object.entries(panelProps.sections.data).length;
    for (const [name, sect] of Object.entries(panelProps.sections.data)) {
      let sectionProps = {...panelProps};
      sectionProps.name = name;
      sectionProps.isSubPanel = true;
      sectionProps.boxProps = defaultPanelWidgetBoxProps('panel-box-'+index.toString(), this.box);
      if(panelProps.unique){
        sectionProps = this.UpdateWidgetPropColors(sectionProps);
        let c = colorsea(sectionProps.boxProps.matProps.color, 100).lighten(10);
        sectionProps.boxProps.matProps.color = c.hex();
      }
      sectionProps.index = index;
      let ctrlBox = undefined;

      switch (sect.value_type) {
        case 'label':
          ctrlBox = new PanelLabel(sectionProps);
          break;
        case 'edit_text':
          ctrlBox = new PanelEditText(sectionProps);
          break;
        case 'input_text':
          ctrlBox = new PanelInputText(sectionProps);
          break;
        case 'boolean_toggle':
          ctrlBox = new PanelBooleanToggle(sectionProps);
          break;
        case 'slider':
          ctrlBox = new PanelSlider(sectionProps);
          break;
        case 'mat_slider':
          ctrlBox = new PanelMaterialSlider(sectionProps);
          break;
        case 'meter':
          ctrlBox = new PanelMeter(sectionProps);
          break;
        case 'gltf_meter':
          ctrlBox = new PanelGltfModelMeter(sectionProps);
          break;
        case 'value_meter':
          ctrlBox = new PanelValueMeter(sectionProps);
          break;
        case 'gltf_value_meter':
          ctrlBox = new PanelGltfModelValueMeter(sectionProps);
          break;
        case 'color_widget':
          ctrlBox = new PanelColorWidget(sectionProps);
          break;
        case 'mat_color_widget':
          ctrlBox = new PanelMaterialColorWidget(sectionProps);
          break;
        case 'gltf':
          ctrlBox = new PanelGltfModel(sectionProps);
          break;
        case 'selector':
          ctrlBox = new PanelListSelector(sectionProps);
          break;
        case 'button':
          ctrlBox = new PanelButton(sectionProps);
          break;
        case 'debug_button':
          ctrlBox = new PanelDebugButton(sectionProps);
          break;
        case 'toggle':
          ctrlBox = new PanelToggle(sectionProps);
          break;
        default:
          console.log('X');
      }

      this.controlList.push(ctrlBox);
      this.box.userData.widgetElements.push(ctrlBox.box);

      let bottomHeight = this.bottom.height;
      let yPos =  -(this.height)*index;
      ctrlBox.ReplaceMaterial(this.ctrlPanelMaterial);
      ctrlBox.box.userData.index = index;
      ctrlBox.box.userData.expandedPos = new THREE.Vector3(ctrlBox.box.position.x, yPos, ctrlBox.box.position.z);
      ctrlBox.box.userData.closedPos = new THREE.Vector3().copy(ctrlBox.box.position);
      ctrlBox.box.renderOrder = panelProps.topPanel.renderOrder-2;
      widgetHeight = ctrlBox.box.userData.height;
      
      index += 1;
    }
    this.box.userData.widgetHeight = widgetHeight;
    this.box.userData.expandedHeight = this.height+(widgetHeight*Object.keys(this.sections.data).length)+this.bottom.height;

  }
  CreateContainerSections(panelProps){
    let index = 1;
    for (const [name, sect] of Object.entries(panelProps.sections.data)) {
      let sectionProps = {...panelProps};
      sectionProps.name = name;
      sectionProps.isSubPanel = true;
      sectionProps.boxProps.parent = panelProps.topPanel;

      sectionProps.sections = sect;
      sectionProps.boxProps.geometry = this.box.geometry;
      let section = new BasePanel(sectionProps);
      section.ReplaceMaterial(this.subPanelMaterial);
      section.handleExpand.scale.set(0,0,0);
      section.box.position.set(this.width/2-section.width/2, 0, -this.depth);

      let bottom = section.box.userData.bottom;
      let bottomHeight = this.bottom.height;
      let yPos =  bottomHeight - (this.height + bottomHeight)*index;
      section.box.userData.index = index;
      section.box.userData.expandedPos.set(section.box.position.x, yPos, section.box.position.z);
      section.box.userData.closedPos = new THREE.Vector3().copy(section.box.position);
      section.box.renderOrder = panelProps.topPanel.renderOrder-1;
      section.bottom.box.renderOrder = section.box.renderOrder;
      panelProps.topPanel.userData.sectionElements.push(section.box);
      this.box.userData.panelList.push(section);
      this.panelList.push(section);
      
      index += 1;
    }
  }
  RemoveSelf(){
    this.panelList.forEach((panel, index) =>{
      panel.RemoveSelf();
    });
    if(this.handleExpand!=undefined){
      this.scene.clickable.splice(this.scene.clickable.indexOf(this.handleExpand),1);
      this.handleExpand.parent.remove(this.handleExpand);
    }
    if(this.handleOpen!=undefined){
      this.scene.clickable.splice(this.scene.clickable.indexOf(this.handleOpen),1);
      this.handleOpen.parent.remove(this.handleOpen);
    }
    super.RemoveSelf();
  }
};

export function CreateBasePanel(panelProps) {
  if(typeof panelProps.textProps.font === 'string'){
    // Load the font
    loader.load(panelProps.textProps.font, (font) => {
      panelProps.textProps.font = font;
      let panel = new BasePanel(panelProps);
    });
  }else if(panelProps.textProps.font.isFont){
    let panel = new BasePanel(panelProps);
  } 
  
};

/**
 * This function creates a property set for various widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} [name=''] name for the element.
 * @param {bool} [horizontal=true] if true toggle is horizontal, else vertical.
 * @param {bool} [on=false] if true initial state of widget is on, else off.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {bool} [useValueText=true] if true toggle has a text portal for value.
 * @param {bool} [numeric=true] the meter value is numeric.
 * @param {object} [valueProps=stringValueProperties] property set for value type of widget.
 * @param {number} [handleSize=2] size of handle on toggle.
 * @param {object} [objectControlProps=undefined] slot for object that will be updated by widget.
 * 
 * @returns {object} Data object for widget elements.
 */
export function widgetProperties(scene, boxProps, name='', horizontal=true, on=false, textProps=undefined, useValueText=true, valueProps=stringValueProperties(), listConfig=undefined, handleSize=2, objectControlProps=undefined ){
  return {
    'type': 'WIDGET',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'horizontal': horizontal,
    'on': on,
    'textProps': textProps,
    'useValueText': useValueText,
    'valueProps': valueProps,
    'listConfig': listConfig,
    'handleSize': handleSize,
    'objectControlProps': objectControlProps
  }
};

/**
 * This function creates base class used by several widgets with handles.
 * @param {object} widgetProps (widgetProperties) property set.
 * 
 * @returns {object} BaseWidget class object.
 */
export class BaseWidget extends BaseBox {
  constructor(widgetProps) {
    let size = BaseWidget.CalculateWidgetSize(widgetProps.boxProps, widgetProps.horizontal, widgetProps.useValueText, widgetProps.handleSize);
    let baseBoxProps = {...widgetProps.boxProps};
    baseBoxProps.width = size.baseWidth;
    baseBoxProps.height = size.baseHeight;
    baseBoxProps.depth = size.baseDepth/2;
    super(baseBoxProps);
    this.is = 'BASE_WIDGET';
    this.isHVYM = false;
    this.objectControlProps = widgetProps.objectControlProps;
    this.zOffset = 1;
    this.value = widgetProps.valueProps.defaultValue;
    this.box.userData.horizontal = widgetProps.horizontal;
    this.box.userData.hasSubObject = widgetProps.useValueText;
    this.box.userData.properties = widgetProps;

    this.name = widgetProps.name;
    this.widgetSize = size;
    this.handleSize = widgetProps.handleSize;
    this.baseBoxProps = baseBoxProps;
    this.widgetSize = size;
    this.complexMesh = widgetProps.boxProps.complexMesh;

    this.BaseText = new BaseText(widgetProps.textProps);
    this.BaseText.SetParent(this);

    darkenMaterial(this.box.material, 20);

    if(this.isPortal){
      this.zOffset = -1;
    }

    if(this.handleSize > 0){
      let stencilRef = 0;
      if(widgetProps.boxProps.parent.material!=undefined){
        stencilRef = widgetProps.boxProps.parent.material;
      }
      this.handleMaterial = getMaterial(widgetProps.boxProps.matProps, stencilRef);
      this.handleCtrl = this.WidgetHandle();
      this.handle = this.handleCtrl.box;
      this.handle.renderOrder = 2;

      if(widgetProps.horizontal){
        this.handleCtrl.AlignLeft();
      }else{
        this.handleCtrl.AlignBottom();
      }
    }

    this.widgetText = this.WidgetText();
    if(this.widgetText!=undefined){
      this.widgetTextSize = getGeometrySize(this.widgetText.geometry);
    }
    
    BaseWidget.SetUpObjectControlProps(this);

  }
  HVYMCollectionParams(propGrp, propName, colId){
    this.isHVYM = true;
    this.propertyGrp = propGrp;
    this.box.userData.propertyGrp = propGrp;
    this.propertyName = propName;
    this.box.userData.propertyName = propName;
    this.collectionId = colId;
    this.box.userData.collectionId = colId;
    this.UpdateHvymData(this.value);
  }
  UpdateHvymData(value){
    if(this.objectControlProps==undefined)
      return;

    if(this.objectControlProps.type == 'MAT_REF'){
      if(this.parentCtrl != undefined && this.parentCtrl.is == 'COLOR_WIDGET'){
        value = this.parentCtrl.value;
      }
      this.objectControlProps.hvymCtrl.HandleHVYMLocalMaterialStorage(this.propertyName, this.collectionId, this.propertyGrp, this.objectControlProps.targetProp, this.objectControlProps.ref, value);
    }else{
      this.objectControlProps.hvymCtrl.HandleHVYMLocalStorage(this.propertyName, this.collectionId, this.propertyGrp, this.objectControlProps.targetProp, value);
    }
  }
  UpdateHvymMorphData(value){
    this.objectControlProps.hvymCtrl.HandleHVYMLocalStorage(this.propertyName, this.collectionId, this.propertyGrp, this.objectControlProps.targetProp, value, this.objectControlProps.targetMorph);
  }
  WidgetHandle(){
    let handleBoxProps = {...this.baseBoxProps};
    handleBoxProps.parent = this.box;
    handleBoxProps.width = this.widgetSize.handleWidth;
    handleBoxProps.height = this.widgetSize.handleHeight;
    handleBoxProps.depth = this.widgetSize.handleDepth;
    this.handleZPos = this.widgetSize.baseDepth/2+this.widgetSize.handleDepth/2;

    let handle = new BaseBox(handleBoxProps);
    handle.box.material = this.handleMaterial;

    return handle
  }
  WidgetText(){
    if(this.name.length>0){
      const props = this.box.userData.properties;
      const boxProps = props.boxProps;
      const textProps = this.BaseText.textProps;

      const text = this.BaseText.NewSingleTextMesh('widgetText', this.name);
      const textSize = text.userData.size;
      const padding = this.BaseText.textProps.padding;

      this.box.add(text);
      this.BaseText.CenterTopOutsideTextPos('widgetText');

      return text
    }
  }
  CenterWidgetText(){
    let pos = this.CenterBoxPos();
    if(this.isPortal){
      pos.z = -(this.widgetTextSize.depth+this.size.depth);
    }
    this.widgetText.position.copy(pos);
  }
  Recenter(width){
    this.box.translateX(-width/2);
    this.widgetText.translateX(width/2);
  }
  DeleteWidgetText(){
    this.BaseText.DeleteTextGeometry('widgetText');
    this.box.remove(this.widgetText);
  }
  ValueText(){
    const widgetProps = {...this.box.userData.properties};
    widgetProps.boxProps.parent = this.box;
    const boxProps = widgetProps.boxProps;
    const valBox = new ValueTextWidget(widgetProps);
    darkenMaterial(valBox.box.material, 30);
    this.box.userData.valueBoxCtrl = valBox;
    this.box.userData.valueBox = valBox.box;

    this.Recenter(valBox.width);

    if(widgetProps.horizontal){
      valBox.AlignOutsideRight();
    }else{
      valBox.AlignOutsideBottom();
    }

    return valBox
  }
  UpdateMaterialRefFloatValue(value){
    if(BaseWidget.IsMaterialSliderProp(this.targetProp)){
      value = parseFloat(value)
      this.objectRef[this.targetProp] = value;
    }
    
    this.objectRef.dispatchEvent({type:'refreshMaterialViews'});
  }
  UpdateMeshRefFloatValue(value){
    if(BaseWidget.IsMorphSliderProp(this.targetProp)){
      value = parseFloat(value);
      this.objectRef.userData.hvymCtrl.UpdateMorph(this.objectControlProps, value);
    }
    
  }
  UpdateAnimRefFloatValue(value){
    if(BaseWidget.IsAnimationSliderProp(this.targetProp)){
      value = parseFloat(value);
      this.objectRef.hvymCtrl.SetAnimWeight(this.objectRef.ref, value);
    }
    
  }
  static UpdateMaterialRefColor(elem, hex, alpha=undefined){
    if(!isNaN(elem.objectRef[elem.targetProp]) && !BaseWidget.IsMaterialColorProp(this.targetProp))
      return;
    elem.objectRef[elem.targetProp].set(hex);
    if(alpha!=undefined){
      elem.objectRef.opacity = alpha;
    }
    elem.objectRef.dispatchEvent({type:'refreshMaterialViews'});
  }
  static RefreshMaterialRefs(mat){
    if(mat==undefined)
      return;
    mat.userData.materialCtrls.forEach((ctrl) =>{
      let parentPanel = ctrl.box.parent.userData.parentPanel;
      if(parentPanel!=undefined){
        parentPanel.controlList.forEach((elem) =>{
          let widget = elem.ctrlWidget;
          if(widget!=undefined && widget.RefreshMaterialView!=undefined){
            widget.RefreshMaterialView();
          }
        });
      }
    });
  }
  static ModelIndicatorBoxProps(elemProps){
    let baseBoxProps = {...elemProps.boxProps};
    let indicatorBoxProps = {...elemProps.boxProps};
    let indicatorMatProps = {...elemProps.boxProps.matProps};
    indicatorMatProps.color = 'black';
    indicatorMatProps.isPortal = true;

    indicatorMatProps.useCase = 'STENCIL'
    elemProps.boxProps.width = elemProps.boxProps.width-elemProps.boxProps.height;
    indicatorBoxProps.width = elemProps.boxProps.height;
    indicatorBoxProps.matProps = indicatorMatProps;


    return {'base': baseBoxProps, 'indicator': indicatorBoxProps};
  }
  static SetObjectRef(elem){
    elem.objectRef = elem.objectControlProps.ref;
    elem.targetProp = elem.objectControlProps.targetProp;
    elem.isHVYM = elem.objectControlProps.isHVYM;
  }
  static SetUpObjectControlProps(elem){
    if(elem.objectControlProps != undefined){
      if(elem.objectControlProps.type == 'MAT_REF'){
        BaseWidget.SetObjectRef(elem);
        elem.objectRef.userData.materialCtrls = [];
        elem.objectRef.userData.refreshCallback = BaseWidget.RefreshMaterialRefs;
        elem.objectRef.addEventListener('refreshMaterialViews', function(event) {
          elem.objectRef.userData.refreshCallback(this);
        });
      }else if(elem.objectControlProps.type == 'SET_REF'){
        elem.setRef = elem.objectControlProps.setRef;
        if(elem.objectControlProps.setType == 'MATERIAL'){

        }else if(elem.objectControlProps.setType == 'MESH'){
          
        } 
      }else if(elem.objectControlProps.type == 'MESH_REF'){
        BaseWidget.SetObjectRef(elem);
        if(elem.targetProp=='morph'){
          elem.targetMorph = elem.objectControlProps.targetMorph;
        }
      }else if(elem.objectControlProps.type.includes('ANIM')){
        elem.objectRef = elem.objectControlProps;
        elem.targetProp = elem.objectControlProps.targetProp;
        elem.isHVYM = elem.objectControlProps.isHVYM;
      }
    }
  }
  static AddModelInnerIndicator(elem, boxProps){
    elem.modelIndicator = new BaseBox(boxProps);
    elem.modelIndicator.AlignLeft();
    elem.materialView = undefined;
  }
  static AddModelOuterIndicator(elem, boxProps){
    elem.modelIndicator = new BaseBox(boxProps);
    elem.modelIndicator.AlignOutsideLeft();
    elem.materialView = undefined;
  }
  static MaterialViewMesh(parentBox, objectRef){
    let radius = parentBox.size.width/2;
    if(parentBox.size.height<parentBox.size.width){
      radius = parentBox.size.height/2;
    }
    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    const size = getGeometrySize(geometry)
    const material = shallowCloneMaterial(objectRef);
    setupStencilChildMaterial(material, parentBox.material.stencilRef);
    const sphere = new THREE.Mesh( geometry, material );
    sphere.renderOrder = 999;
    sphere.onBeforeRender = function( renderer ) { renderer.clearDepth(); };

    parentBox.box.add(sphere);
    sphere.position.set(0,0,0);
    sphere.translateZ(-size.depth/2);

    return sphere
  }
  static HandleMaterialMesh(elem, useAlpha=false){
    if(elem.modelIndicator == undefined || !elem.objectControlProps.useMaterialView)
      return;

    elem.materialView = BaseWidget.MaterialViewMesh(elem.modelIndicator, elem.objectRef);
    elem.objectRef.userData.materialCtrls.push(elem);

    if(useAlpha){
      elem.materialView.material.transparent = true;
    }
  }
  static CalculateElementSizeOffset(elementSize, horizontal, boxProps){
    let bProps = {...boxProps};
    if(horizontal){
      bProps.width = bProps.width-elementSize.width;
    }else{
      bProps.height = bProps.height-elementSize.height;
    }

    return bProps
  }
  static CalculateWidgetSize(boxProps, horizontal, useSubObject, operatorSizeDivisor, defaultSubOffset=0.65){
    let subOffset = 1;
    if(useSubObject){
      subOffset = defaultSubOffset;
    }
    let baseWidth = boxProps.width*subOffset;
    let baseHeight = boxProps.height;
    let baseDepth=boxProps.depth/2;
    let handleWidth=boxProps.width/operatorSizeDivisor*subOffset;
    let handleHeight=boxProps.height;
    let handleDepth=boxProps.depth;
    let subWidth=baseWidth*(1-1*subOffset);
    let subHeight=baseHeight;
    let subDepth=baseDepth;

    if(horizontal==false){
      baseWidth = boxProps.width;
      baseHeight = boxProps.height*subOffset;
      handleWidth=boxProps.width;
      handleHeight=boxProps.height/operatorSizeDivisor*subOffset;
      subWidth=baseWidth;
      subHeight=baseHeight*(1-1*subOffset);
      subDepth=baseDepth;
    }

    return {baseWidth, baseHeight, baseDepth, handleWidth, handleHeight, handleDepth, subWidth, subHeight, subDepth}
  }
  static IsMaterialColorProp(prop){
    return (prop == 'color' || prop == 'specular' || prop == 'emissive')
  }
  static IsMaterialSliderProp(prop){
    return (prop == 'shininess' || prop == 'roughness' || prop == 'metalness' || prop == 'clearcoat' || prop == 'clearCoatRoughness' || prop == 'emissiveIntensity'|| prop == 'ior' || prop == 'reflectivity' || prop == 'iridescence' || prop == 'sheen' || prop == 'sheenRoughness' || prop == 'specularIntensity')
  }
  static IsMaterialPBRSliderProp(prop){
    return (prop == 'roughness' || prop == 'metalness' || prop == 'clearcoat' || prop == 'clearCoatRoughness' || prop == 'ior' || prop == 'reflectivity' || prop == 'iridescence' || prop == 'sheen' || prop == 'sheenRoughness' || prop == 'specularIntensity')
  }
  static IsMorphSliderProp(prop){
    return (prop == 'morph')
  }
  static IsAnimationSliderProp(prop){
    return (prop == 'weight')
  }
  static IsAnimationToggleProp(prop){
    return (prop == 'play')
  }
};


export class ButtonWidget extends BaseWidget {
  constructor(buttonProps) {

    let widgetProps = widgetProperties(buttonProps.scene, buttonProps.boxProps, buttonProps.name, true);
    if(buttonProps.objectControlProps.val_props.type == 'NULL_VALUE_PROPS'){
      widgetProps.useValueText = false;
    }
    widgetProps.textProps = buttonProps.textProps;
    widgetProps.valueProps = buttonProps.objectControlProps.val_props;
    widgetProps.handleSize = -1;
    super(widgetProps);
    this.is = 'BUTTON_WIDGET';
    this.buttonProps = buttonProps;
    this.objectControlProps = buttonProps.objectControlProps;
    this.valProps = widgetProps.valueProps;
    
    if(this.box.userData.hasSubObject){
      if(this.valProps.type == 'NUMBER_VALUE_PROPS'){
        this.polarity = this.valProps.polarity;
      }
      
      this.valueTextBox = this.ValueText();
      this.buttonProps.boxProps.width = this.width;
    }

    if(this.objectControlProps.type == 'HVYM_CALL_PROP_REF' || this.objectControlProps.type == 'HVYM_VAL_PROP_REF'){
      this.isHVYM = true;
      this.callName = this.objectControlProps.name;
      this.box.userData.value = this.valProps.defaultValue;
      if(this.polarity != undefined){

        if(this.polarity == 'POSITIVE'){
          this.AddIncrementButton(this.valProps);
        }else if(this.polarity == 'NEGATIVE'){
          this.AddDecrementButton(this.valProps);
        }else if(this.polarity == 'BIDIRECTIONAL'){
          this.buttonProps.boxProps.width = this.width*0.5;
          this.AddBicrementButtons(this.valProps);
        }else if(this.polarity == 'CALL'){
          this.AddNumericCallButton(this.valProps);
        }

      }else{
        if(this.valProps.type == 'STRING_VALUE_PROPS'){
          this.AddStringCallButton(this.valProps);
        }else if(this.valProps.type == 'NULL_VALUE_PROPS'){
          this.AddCallButton(this.valProps);
        }
      }
    }else{
      this.button = ButtonElement(this.buttonProps);
    }

  }
  ValPropsButton(name, valProps){
    let boxProps = {...this.buttonProps.boxProps};
    boxProps.name = name;
    boxProps.parent = this.box;

    return ButtonElement(buttonProperties(this.buttonProps.scene, boxProps, name, valProps, this.buttonProps.textProps))
  }
  AddCallButton(valProps){
    this.callButton = this.ValPropsButton('CALL', valProps);
  }
  AddStringCallButton(valProps){
    this.stringCallButton = this.ValPropsButton('CALL', valProps);
  }
  AddNumericCallButton(valProps){
    this.numericCallButton = this.ValPropsButton('CALL', valProps);
  }
  AddIncrementButton(valProps){
    this.incrementButton = this.ValPropsButton('+', valProps);
  }
  AddDecrementButton(valProps){
    this.decrementButton = this.ValPropsButton('-', valProps);
  }
  AddBicrementButtons(valProps){
    this.AddIncrementButton(valProps);
    this.AddDecrementButton(valProps);
    this.incrementButton.AlignRight();
    this.decrementButton.AlignLeft();
  }
  DisableMainButton(){
    this.button.scene.clickable.splice(this.button.scene.clickable.indexOf(this.button),1);
    if(this.buttonProps.mouseOver){
      this.button.scene.mouseOverable.splice(this.button.scene.mouseOverable.indexOdf(this.button),1);;
    }
  }
  SetMinterClient(minter){
    super.SetMinterClient(minter);
    const self = this;
    let call = 'call';
    let stringCall = 'stringCall';
    let numericCall = 'numericCall';

    if(this.objectControlProps.call_target == 'LOCAL_CALL'){
      call = 'localCall';
      stringCall = 'localStringCall';
      numericCall = 'localNumericCall';
    }
    if(this.valProps.type == 'STRING_VALUE_PROPS'){
      this.stringCallButton.box.addEventListener('action', function(event) {
        self.minterClient[stringCall](self.callName, self.box.userData.value);
      });
    }else if(this.valProps.type == 'NULL_VALUE_PROPS'){
      this.callButton.box.addEventListener('action', function(event) {
        self.minterClient[call](self.callName);
      });
    }else if(this.valProps.type == 'NUMBER_VALUE_PROPS'){
      if(isNaN(self.box.userData.value))
        return;

      if(this.polarity == 'POSITIVE'){
        this.incrementButton.box.addEventListener('action', function(event) {
          self.minterClient.incrementCall(self.callName);
        });
      }else if(this.polarity == 'NEGATIVE'){
        this.decrementButton.box.addEventListener('action', function(event) {
          self.minterClient.decrementCall(self.callName);
        });
      }else if(this.polarity == 'BIDIRECTIONAL'){
        this.incrementButton.box.addEventListener('action', function(event) {
          self.minterClient.incrementCall(self.callName);
        });
        this.decrementButton.box.addEventListener('action', function(event) {
          self.minterClient.decrementCall(self.callName);
        });
      }else if(this.polarity == 'CALL'){
        this.numericCallButton.box.addEventListener('action', function(event) {
          self.minterClient[numericCall](self.callName, parseInt(self.box.userData.value));
        });
      }
    }

  }
}

/**
 * This function creates a number value property set.
 * @param {number} [defaultvalue=0] default numeric value.
 * @param {number} [min=0] minimum value.
 * @param {number} [max=1] maximum value.
 * @param {number} [places=3] number of place values used in number.
 * @param {number} [step=0.001] decimal places that numbers use.
 * @param {bool} [editable=true] if true, number text is editable.
 * 
 * @returns {object} Data object for number values.
 */
export function numberValueProperties( defaultValue=0, min=0, max=1, places=3, step=0.001, editable=true, polarity='NONE'){
  return {
    'type': 'NUMBER_VALUE_PROPS',
    'defaultValue': defaultValue,
    'min': min,
    'max': max,
    'places': places,
    'step': step,
    'editable': editable,
    'polarity': polarity
  }
};

/**
 * This function creates a number value property set for static integers.
 * @param {number} [defaultvalue=0] default numeric value.
 * @param {number} [min=0] minimum value.
 * @param {number} [max=1] maximum value.
 * 
 * @returns {object} Data object for integer values.
 */
export function intValueProperties( defaultValue=0, min=0, max=1){
  return numberValueProperties( defaultValue, min, max, 0, 0.001, false)
};

/**
 * This function creates a number value property set for editable integers.
 * @param {number} [defaultvalue=0] default numeric value.
 * @param {number} [min=0] minimum value.
 * @param {number} [max=1] maximum value.
 * 
 * @returns {object} Data object for integer values.
 */
export function intValuePropertiesEditable( defaultValue=0, min=0, max=1){
  return numberValueProperties( defaultValue, min, max, 0, 0.001, true)
};

/**
 * This function creates a number value property set for floats.
 * @param {number} [defaultvalue=0] default numeric value.
 * @param {number} [min=0] minimum value.
 * @param {number} [max=1] maximum value.
 * 
 * @returns {object} Data object for float values.
 */
export function floatValueProperties( defaultValue=0, min=0, max=1){
  return numberValueProperties( defaultValue, min, max, 3, 0.001, false)
};

/**
 * This function creates a number value property set for editable floats.
 * @param {number} [defaultvalue=0] default numeric value.
 * @param {number} [min=0] minimum value.
 * @param {number} [max=1] maximum value.
 * 
 * @returns {object} Data object for float values.
 */
export function floatValuePropertiesEditable( defaultValue=0, min=0, max=1){
  return numberValueProperties( defaultValue, min, max, 3, 0.001, true)
};

/**
 * This function creates a number value property set for materials.
 * @param {object} material object.
 * @param {string} prop target property in the material.
 * 
 * @returns {object} Data object for float values.
 */
export function materialNumberValueProperties(material, prop){
  let result = undefined;

  if(BaseWidget.IsMaterialColorProp(prop)){
    result = numberValueProperties( material[prop], 0, 255, 0, 0.001, false);
  }else if (BaseWidget.IsMaterialSliderProp(prop)){
    result = numberValueProperties( material[prop], 0, 100, 3, 0.001, false);
    if(BaseWidget.IsMaterialPBRSliderProp(prop)){
      result = numberValueProperties( material[prop], 0, 1, 3, 0.001, false);
      if(prop == 'ior' || prop == 'iridescenceIOR'){
        result = numberValueProperties( material[prop], 1, 2.33, 3, 0.001, false);
      }
    }
  }

  return result
}

/**
 * This function creates a value text widget based on passed property set.
 * @param {object} widgetProps (widgetProperties) property set.
 * 
 * @returns {object} ValueTextWidget class object.
 */
export class ValueTextWidget extends BaseTextBox{
  constructor(widgetProps) {
    let valBoxProps = {...widgetProps.boxProps};
    valBoxProps.isPortal = true;
    let textProps = widgetProps.textProps;
    textProps.align = 'CENTER';
    let valMatProps = materialProperties('BASIC', widgetProps.textProps.matProps.color, false, 1, THREE.FrontSide, 'STENCIL');
    let size = BaseWidget.CalculateWidgetSize(widgetProps.boxProps, widgetProps.horizontal, widgetProps.useValueText);
    let defaultVal = widgetProps.valueProps.defaultValue.toString();

    valBoxProps.matProps = valMatProps;

    if(widgetProps.horizontal){
      valBoxProps.height=widgetProps.boxProps.height;
      valBoxProps.width=size.subWidth;
    }else{
      valBoxProps.height=size.subHeight;
      valBoxProps.width=widgetProps.boxProps.width;
    }
    super(buttonProperties(widgetProps.scene, valBoxProps, defaultVal, widgetProps.value, textProps, false));
    this.is = 'VALUE_TEXT_WIDGET';
    this.scene = widgetProps.scene;
    this.widgetSize = size;
    this.numeric = widgetProps.numeric;
    this.places = widgetProps.valueProps.places;
    this.steps = widgetProps.valueProps.steps;
    if(this.numeric){
      this.min = widgetProps.valueProps.min;
      this.max = widgetProps.valueProps.max;
    }
    this.box.userData.targetElem = this;

    darkenMaterial(this.box.material, 30);

    if(widgetProps.valueProps.editable){
      this.EditableSetup();
    }

    const self = this;

    this.box.addEventListener('update', function(event) {
      self.UpdateValueText();
    });

  }
  SetValueText(val){
    if(this.box.parent.userData.value == undefined)
      return;

    if(this.numeric){
      if(!this.NumericValueValid(val))
        return;
      this.box.parent.userData.value = val;

    }else{
      this.box.parent.userData.value = val;
    }
    this.UpdateValueText();
    this.box.parent.dispatchEvent({type:'update'});
  }
  UpdateValueText(){
    if(this.box.parent.userData.value == undefined)
      return;
    if(this.numeric){
      this.box.parent.userData.value = Number.parseFloat(this.box.parent.userData.value).toFixed(this.places);
    }
    this.UpdateText(this.box.parent.userData.value.toString());
    this.box.dispatchEvent({type:'onValueUpdated'});
  }
  EditableSetup(){
    this.scene.inputPrompts.push(this.textMesh);
    const textProps = this.box.userData.properties.textProps;
    const tProps = editTextProperties(this, '', this.textMesh, textProps.font, textProps.size, textProps.height, textProps.zOffset, textProps.letterSpacing, textProps.lineSpacing, textProps.wordSpacing, textProps.padding, false, textProps.meshProps);
    this.textMesh.userData.textProps = tProps;
    this.box.userData.mouseOverParent = true;
    this.box.userData.currentText = '';
    this.textMesh.userData.numeric = this.box.userData.properties.numeric;
    this.textMesh.widget = this;
    this.scene.mouseOverable.push(this.box);
    mouseOverUserData(this.textMesh);
  }
  NumericValueValid(val){
    let result = true;
    if(val < this.min && val > this.max){
      result = false;
    }
    if(isNaN(val)){
      result = false;
    }

    return result
  }

}

/**
 * This function creates a property set slider widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} [name=''] name for the element.
 * @param {bool} [horizontal=true] if true toggle is horizontal, else vertical.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {bool} [useValueText=true] if true toggle has a text portal for value.
 * @param {bool} [numeric=true] the meter value is numeric.
 * @param {object} [valueProps=numberValueProperties] property set for value type of meter widget.
 * @param {number} [handleSize=8] size of handle on toggle.
 * @param {bool} [draggable=true] if true, widgets hadles are draggable.
 * @param {object} [objectControlProps=undefined] slot for object that will be updated by widget.
 * 
 * @returns {object} Data object for slider elements.
 */
export function sliderProperties(scene, boxProps, name='', horizontal=true, textProps=undefined, useValueText=true, numeric=true, valueProps=numberValueProperties(), handleSize=8, objectControlProps=undefined){
  return {
    'type': 'SLIDER',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'horizontal': horizontal,
    'textProps': textProps,
    'useValueText': useValueText,
    'numeric': numeric,
    'valueProps': valueProps,
    'handleSize': handleSize,
    'draggable': true,
    'objectControlProps': objectControlProps
  }
};

/**
 * This function creates a default property set for slider widgets based on mesh.
 * @param {string} mesh Object3D that dimensions are based on.
 * @param {object} valueProps value property object used by widget.
 * 
 * @returns {object} Data object for slider elements, used in panels.
 */
export function sliderPropsFromMesh(scene, mesh, valueProps){
  const boxProps = boxPropsFromMesh(mesh.name, mesh.parent, mesh);
  const textProps = defaultWidgetTextProperties(DEFAULT_FONT);
  return sliderProperties(scene, boxProps, mesh.name, true, textProps, false, true, valueProps)
};

/**
 * This function creates a default property set for slider widgets, used in panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * @param {object} valueProps value property object used by widget.
 * 
 * @returns {object} Data object for slider elements, used in panels.
 */
export function defaultPanelSliderProps(scene, name, parent, font, valueProps){
  const boxProps = defaultPanelSliderBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  return sliderProperties(scene, boxProps, name, true, textProps, true, true, valueProps)
};

/**
 * This function creates a slider widget based on passed property set.
 * @param {object} widgetProps (widgetProperties) property set.
 * 
 * @returns {object} SliderWidget class object.
 */
export class SliderWidget extends BaseWidget {
  constructor(widgetProps) {
    widgetProps.textProps.align = 'LEFT';
    super(widgetProps);
    this.is = 'SLIDER_WIDGET';
    this.scene = widgetProps.scene;
    if(widgetProps.valueProps.editable){
      this.scene.draggable.push(this.handle);
    }
    
    if(this.box.userData.hasSubObject){
      this.valueTextBox = this.ValueText(this, widgetProps.boxProps, widgetProps, this.size.baseWidth, this.size.baseHeight);
      this.valueTextBox.box.userData.updateValTargetElem = this;

      this.valueTextBox.box.addEventListener('onValueUpdated', function(event) {

      });
    }

    this.SetSliderUserData();
    
    if(this.objectControlProps != undefined){
      if(this.objectControlProps.type == 'MAT_REF'){
        if(BaseWidget.IsMaterialSliderProp(this.targetProp)){
          this.box.userData.valueBoxCtrl.SetValueText(this.objectRef[this.targetProp]);
          this.objectRef.userData.materialCtrls.push(this);
        }
      }
    }

    this.handle.addEventListener('action', function(event) {
      this.userData.targetElem.OnSliderMove();
    });

    this.box.addEventListener('update', function(event) {
      this.userData.targetElem.UpdateSliderPosition();
    });

    this.UpdateSliderPosition();
  }
  SetParentCtrl(ctrl){
    this.parentCtrl = ctrl;
  }
  SetValue(value){
    value = parseFloat(value);
    this.box.userData.value = value;
    this.value = value;
    this.UpdateMaterialRefFloatValue(value);
    this.box.dispatchEvent({type:'update'});
  }
  SetSliderUserData(){
    let sliderProps = this.box.userData.properties;
    let size = BaseWidget.CalculateWidgetSize(sliderProps.boxProps, sliderProps.horizontal, sliderProps.useValueText, 8);

    this.box.userData.type = 'SLIDER';
    this.box.userData.size = {'width': size.baseWidth, 'height': size.baseHeight, 'depth': size.baseDepth};
    this.box.userData.handle = this.handle;
    this.box.userData.horizontal = sliderProps.horizontal;
    this.box.userData.valueProps = sliderProps.valueProps;
    this.box.userData.value = sliderProps.valueProps.defaultValue;
    this.box.normalizedValue = sliderProps.valueProps.defaultValue;
    this.box.userData.targetElem = this;

    this.handle.userData.type = 'SLIDER';
    this.handle.userData.size = {'width': size.handleWidth, 'height': size.handleHeight, 'depth': size.handleDepth};
    this.handle.userData.horizontal = sliderProps.horizontal;
    this.handle.userData.min = sliderProps.valueProps.min;
    this.handle.userData.max = sliderProps.valueProps.max;
    this.handle.userData.places = sliderProps.valueProps.places;


    if(sliderProps.horizontal){
      this.handle.userData.maxScroll = this.handle.position.x + (size.baseWidth-size.handleWidth);
      this.handle.userData.minScroll = -size.baseWidth+(this.handle.userData.maxScroll+size.handleWidth);
    }else{
      this.handle.userData.maxScroll = this.handle.position.y + (size.baseHeight-size.handleHeight);
      this.handle.userData.minScroll = -size.baseHeight+(this.handle.userData.maxScroll+size.handleHeight);
    }

    this.handle.userData.draggable = true;
    this.handle.userData.targetElem = this;
  }
  HVYMCollectionParams(propGrp, propName, colId){
    super.HVYMCollectionParams(propGrp, propName, colId);
    this.HandleUpdateData(this.value);
  }
  SliderValue(){
    let coord = 'x';
    let divider = (this.box.userData.size.width-this.handle.userData.size.width);

    if(!this.handle.userData.horizontal){
      coord = 'y';
      divider = (this.box.userData.size.height-this.handle.userData.size.height);
    }

    let pos = this.handle.position[coord];
    let minScroll = this.handle.userData.minScroll;
    let max = this.handle.userData.max;
    let min = this.handle.userData.min;

    let value = (pos-minScroll)/divider*max;

    if(this.handle.userData.min<0){
      value = ((pos-minScroll)/divider*(max-min))+min;
    }

    this.UpdateNormalizedValue();

    return parseFloat(value.toFixed(this.handle.userData.places));
  }
  OnSliderMove(){
    let value = this.SliderValue();
    this.box.userData.value = value;
    this.value = value;

    this.HandleUpdateData(value);

    if(this.box.userData.valueBox != undefined){
      this.box.userData.valueBox.currentText = this.box.userData.value;
    }

    if(this.box.userData.valueBox != undefined){
      this.box.userData.valueBox.dispatchEvent({type:'update'});
    }

  }
  HandleUpdateData(value){
    let isMorph = false;
    if(BaseWidget.IsMaterialSliderProp(this.targetProp)){
      this.UpdateMaterialRefFloatValue(value);
    }else if(BaseWidget.IsMorphSliderProp(this.targetProp)){
      isMorph = true;
      this.UpdateMeshRefFloatValue(value);
    }else if(BaseWidget.IsAnimationSliderProp(this.targetProp)){
      this.UpdateAnimRefFloatValue(value);
    }

    if(this.isHVYM){
      if(!isMorph){
        this.UpdateHvymData(value);
      }else{
        this.UpdateHvymMorphData(value);
      }
    }
  }
  UpdateSliderPosition(){
    let minScroll = this.handle.userData.minScroll;
    let maxScroll = this.handle.userData.maxScroll;
    let max = this.handle.userData.max;
    let min = this.handle.userData.min;
    let value = this.box.userData.value;
    this.UpdateNormalizedValue();
    if(value>max){
      this.box.userData.value = max;
      value = max;
    }else if(value<min){
      this.box.userData.value = min;
      value = min;
    }
    if(isNaN(value))
      return;

    let coord = 'x';
    let divider = (this.box.userData.size.width-this.handle.userData.size.width);

    if(!this.handle.userData.horizontal){
      coord = 'y';
      divider = (this.box.userData.size.height-this.handle.userData.size.height);
    }

    let vec = ((value-min)/(max-min))*divider+minScroll;
    let pos = new THREE.Vector3(this.handle.position.x, vec, this.handle.position.z);

    if(this.box.userData.horizontal){
      pos.set(vec, this.handle.position.y, this.handle.position.z);
    }

    this.handle.position.copy(pos);
  }
  UpdateNormalizedValue(){
    let max = this.handle.userData.max;
    let min = this.handle.userData.min;
    let value = this.box.userData.value;
    this.box.normalizedValue = (value-min)/(max-min);
    this.box.userData.normalizedValue = this.box.normalizedValue;
  }
};

/**
 * This function creates a property set toggle widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} [name=''] name for the element.
 * @param {bool} [horizontal=true] if true toggle is horizontal, else vertical.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {bool} [useValueText=true] if true toggle has a text portal for value.
 * @param {bool} [numeric=true] the meter value is numeric.
 * @param {object} [valueProps=numberValueProperties] property set for value type of meter widget.
 * @param {number} [handleSize=8] size of handle on toggle.
 * @param {bool} [draggable=true] if true, widgets hadles are draggable.
 * @param {string} [meterColor=SECONDARY_COLOR_A] color of meter.
 * 
 * @returns {object} Data object for toggle elements.
 */
export function meterProperties(scene, boxProps, name='', horizontal=true, textProps=undefined, useValueText=true, numeric=true, valueProps=numberValueProperties(), handleSize=8, draggable=true, meterColor=SECONDARY_COLOR_A, objectControlProps=undefined){
  return {
    'type': 'METER',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'horizontal': horizontal,
    'textProps': textProps,
    'useValueText': useValueText,
    'numeric': numeric,
    'valueProps': valueProps,
    'handleSize': handleSize,
    'draggable': draggable,
    'meterColor': meterColor,
    'objectControlProps': objectControlProps
  }
};

/**
 * This function creates a default property set for color widgets, used in panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * @param {object} valueProps value property object used by widget.
 * 
 * @returns {object} Data object for color elements, used in panels.
 */
export function defaultPanelMeterProps(scene, name, parent, font, valueProps){
  const boxProps = defaultPanelSliderBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  return meterProperties(scene, boxProps, name, true, textProps, false, true, valueProps)
};

/**
 * This function creates a default property set for color widgets with value text, used in panels.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * @param {object} valueProps value property object used by widget.
 * 
 * @returns {object} Data object for color elements, used in panels.
 */
export function defaultPanelValueMeterProps(scene, name, parent, font, valueProps){
  const boxProps = defaultPanelSliderBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  return meterProperties(scene, boxProps, name, true, textProps, true, true, valueProps)
};

/**
 * This function creates a meter widget based on passed property set.
 * @param {object} widgetProps (widgetProperties) property set.
 * 
 * @returns {object} MeterWidget class object.
 */
export class MeterWidget extends SliderWidget {
  constructor(widgetProps) {
    super(widgetProps);
    this.is = 'METER_WIDGET';
    const meterBoxProps = {...widgetProps.boxProps}
    let meterMatProps = {...widgetProps.boxProps.matProps}
    meterMatProps.color = widgetProps.meterColor;
    meterBoxProps.width = this.box.userData.size.width;
    meterBoxProps.height = this.box.userData.size.height;
    meterBoxProps.pivot = 'LEFT';
    meterBoxProps.matProps = meterMatProps;
    if(!widgetProps.horizontal){
      meterBoxProps.pivot = 'BOTTOM';
    }
    meterBoxProps.parent = this.box;

    this.meter = new BaseBox(meterBoxProps);

    if(this.box.userData.horizontal){
      this.meter.AlignLeft();
    }else{
      this.meter.AlignBottom();
    }

    this.handle.material.visible=false;
    this.handle.userData.meterElem = this;
    this.box.userData.meterElem = this;

    this.handle.scale.x = this.handle.scale.x*2;

    this.handle.addEventListener('action', function(event) {
      this.userData.meterElem.UpdateMeter();
    });

    this.box.addEventListener('update', function(event) {
      this.userData.meterElem.UpdateMeter();
    });

    this.UpdateMeter();
  }
  UpdateMeter(){
    if(this.box.userData.horizontal){
      this.meter.box.scale.set(this.box.normalizedValue, this.meter.box.scale.y, this.meter.box.scale.z);
    }else{
      this.meter.box.scale.set(this.meter.box.scale.x, this.box.normalizedValue, this.meter.box.scale.z);
    }
  }
  SetMeterColor(color){
    this.meter.material.color = color;
  }

};

export function createMeterPortal(meterProps) {
  meterProps.boxProps.isPortal = true;
  createMeter(meterProps);
};

export function createMeter(meterProps) {
  if(typeof meterProps.textProps.font === 'string'){
    // Load the font
    loader.load(meterProps.textProps.font, (font) => {
      meterProps.textProps.font = font;
      new MeterWidget(meterProps);

    });
  }else if(meterProps.textProps.font.isFont){
    new MeterWidget(meterProps);
  }
};

/**
 * This function creates a property set toggle widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} [name=''] name for the element.
 * @param {bool} [horizontal=true] if true toggle is horizontal, else vertical.
 * @param {bool} [defaultColor='#ffffff'] if true initial state of widget is toggled(on), else off.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {bool} [useValueText=true] if true toggle has a text portal for value.
 * @param {bool} [useAlpha=true] alpha property of color is set by widget.
 * @param {bool} [draggable=true] if true, widgets hadles are draggable.
 * @param {number} [alpha=100] Alpha value.
 * @param {bool} [meter=false] if true, slider elements use meter bars, instead of handles.
 * @param {string} [colorValueType='hex'] value type generated by widget.
 * @param {object} [objectControlProps=undefined] slot for object that will be updated by widget.
 * 
 * @returns {object} Data object for toggle elements.
 */
export function colorWidgetProperties(scene, boxProps, name='', horizontal=true, defaultColor='#ffffff', textProps=undefined, useValueText=true, useAlpha=true, draggable=true, alpha=100, meter=true, colorValueType='hex', objectControlProps=undefined ){
  return {
    'type': 'COLOR_WIDGET',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'horizontal': horizontal,
    'defaultColor': defaultColor,
    'textProps': textProps,
    'useValueText': useValueText,
    'valueProps': numberValueProperties( 0, 0, 1, 0, 0.001, true),
    'useAlpha': useAlpha,
    'handleSize': 0,
    'draggable': draggable,
    'alpha': alpha,
    'meter': meter,
    'colorValueType': colorValueType,
    'objectControlProps': objectControlProps
  }
};

/**
 * This function creates a default property set for color widgets.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for color elements.
 */
export function defaultPanelColorWidgetProps(scene, name, parent, font){
  const boxProps = defaultPanelColorWidgetBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  return colorWidgetProperties(scene, boxProps, name, true, '#ffffff', textProps)
};

/**
 * This function creates a color widget based on passed property set.
 * @param {object} widgetProps (widgetProperties) property set.
 * 
 * @returns {object} ColorWidget class object.
 */
export class ColorWidget extends BaseWidget {
  constructor(widgetProps) {
    let colorWidgetProps = ColorWidget.ColorWidgetProps(widgetProps);
    if(!widgetProps.boxProps.matProps.transparent){
      widgetProps.useAlpha = false;
    }
    super(colorWidgetProps.base);
    this.is = 'COLOR_WIDGET';
    this.scene = widgetProps.scene;
    this.value = widgetProps.defaultColor;
    this.isMeter = widgetProps.meter;

    this.colorManipulator = MeterWidget;
    if(!this.isMeter){
      this.colorManipulator = SliderWidget;
    }

    colorWidgetProps = this.InitColorWidgetProps(colorWidgetProps)
    this.useAlpha = colorWidgetProps.base.useAlpha;
    this.redSlider = new this.colorManipulator(colorWidgetProps.red);
    this.greenSlider = new this.colorManipulator(colorWidgetProps.green);
    this.blueSlider = new this.colorManipulator(colorWidgetProps.blue);
    this.sliders = [this.redSlider, this.greenSlider, this.blueSlider];

    if(widgetProps.useAlpha){
      this.alphaSlider = new this.colorManipulator(colorWidgetProps.alpha);
      this.sliders.push(this.alphaSlider);
    }
    BaseWidget.AddModelInnerIndicator(this, colorWidgetProps.indicator); 
    this.modelIndicator.box.translateZ(this.depth+0.01);

    if(this.objectControlProps != undefined){
      if(this.objectControlProps.type == 'MAT_REF'){
        this.value = '#'+this.objectRef[this.targetProp].getHexString();
        this.box.userData.value = this.value;
        let alpha = this.objectRef[this.targetProp].opacity;
        let color = colorsea(this.value, alpha).rgba();

        this.sliders.forEach((slider, index) =>{
          slider.box.userData.valueBoxCtrl.SetValueText(color[index]);
        });

        BaseWidget.HandleMaterialMesh(this, this.useAlpha);

        if(this.useAlpha){
          this.alphaSlider.box.userData.valueBoxCtrl.SetValueText(color[3]);
        }

        this.UpdateColor();
      }
    }

    this.sliders.forEach((slider, index) =>{
      let pos = slider.TopCenterBoxPos();
      pos.y = pos.y-(slider.size.height*index);
      slider.box.position.copy(pos);
      slider.CenterWidgetText();
      slider.SetParentCtrl(this);
      slider.box.userData.targetColorElem = this;
      slider.handle.userData.targetColorElem = this;
      slider.valueTextBox.box.userData.targetColorElem = this;

      if(widgetProps.meter){
        slider.DeleteWidgetText();
      }

      slider.handle.addEventListener('action', function(event) {
        this.userData.targetColorElem.UpdateColor();
      });
      slider.valueTextBox.box.addEventListener('onValueUpdated', function(event) {
        this.userData.targetColorElem.UpdateColor();
      });
    });

  }
  SetSlidersHVYMCollectionParams(propertyGrp, propertyName, collectionId){
    this.sliders.forEach((slider, index) =>{
      slider.HVYMCollectionParams(this.propertyGrp, this.propertyName, this.collectionId)
    });
  }
  CurrentColor(){
    let rgb = [this.redSlider.value, this.greenSlider.value, this.blueSlider.value];
    let alpha = 100;
    if(this.useAlpha){
      alpha = this.alphaSlider.value;
    }

    return colorsea(rgb, alpha);
  }
  UpdateColor(){
    let alpha = 100;
    this.UpdateSliderValues();
    let color = this.CurrentColor();
    if(this.useAlpha){
      alpha = this.alphaSlider.value;
    }
    this.value = color.hex();
    if(this.objectRef != undefined && this.objectControlProps.type == 'MAT_REF'){
      BaseWidget.UpdateMaterialRefColor(this, color.hex(), alpha);
      this.UpdateMaterialView(color.hex(), alpha);
      if(this.materialView==undefined){
        this.UpdateColorIndicator(color.hex(), alpha);
      }
    }else{
      this.UpdateColorIndicator(color.hex(), alpha);
    }
  }
  UpdateSliderValues(){
    this.sliders.forEach((slider, index) =>{
      slider.value = slider.box.userData.value;
    });
    if(this.useAlpha){
      this.alphaSlider.value = this.alphaSlider.box.userData.value;
    }
  }
  UpdateColorIndicator(hex, alpha=undefined){
    this.modelIndicator.SetColor(hex);
    if(alpha!=undefined){
      this.modelIndicator.SetOpacity(alpha*0.01);
    }
  }
  UpdateMaterialView(hex, alpha=undefined){
    if(this.materialView==undefined)
      return;
    this.materialView.material[this.targetProp].set(hex);
    if(alpha!=undefined){
      this.materialView.material.opacity = alpha*0.01;
    }
  }
  RefreshMaterialView(){
    let color = this.CurrentColor();
    if(this.materialView==undefined)
      return;
    Object.keys(this.materialView.material).forEach((prop, idx) => {
      if(BaseWidget.IsMaterialSliderProp(prop) || BaseWidget.IsMaterialColorProp(prop)){
        this.materialView.material[prop] = this.objectRef[prop];
      }
    });
  }
  InitColorWidgetProps(sliderWidgetProps){
    let colors = ['red', 'blue', 'green'];
    let boxMatProps = ColorWidget.SliderMatProps(sliderWidgetProps.base);
    let valProps = ColorWidget.SliderValueProps(sliderWidgetProps.base);
    let sliderHeight = 0.25;
    if(!sliderWidgetProps.base.useAlpha){
      sliderHeight = 0.33;
    }else{
      colors.push('alpha');
    }
    let sliderBoxProps = {...sliderWidgetProps.base.boxProps};
    sliderBoxProps.width = sliderBoxProps.width*0.54;
    sliderBoxProps.height = sliderBoxProps.height*sliderHeight;

    colors.forEach((color, index) =>{
      sliderWidgetProps[color].name = color;
      sliderWidgetProps[color].meterColor = color;
      sliderWidgetProps[color].valueProps = valProps[color];
      sliderWidgetProps[color].boxProps.isPortal = true;
      sliderWidgetProps[color].boxProps = {...sliderBoxProps};
      sliderWidgetProps[color].boxProps.matProps = boxMatProps[color];
      sliderWidgetProps[color].boxProps.parent = this.box;
    });

    sliderWidgetProps['indicator'].parent = this.box;
    sliderWidgetProps['indicator'].isPortal = true;
    sliderWidgetProps['indicator'].matProps = boxMatProps['indicator'];

    return sliderWidgetProps
  }
  static ColorWidgetProps(widgetProps){
    let props = {...widgetProps};
    let indicatorBoxProps = {...widgetProps.boxProps};
    widgetProps.boxProps.width = widgetProps.boxProps.width*1.3;
    indicatorBoxProps.width = indicatorBoxProps.width*0.18;
    props.handleSize = 8;
    const redProps = {...props};
    const greenProps = {...props};
    const blueProps = {...props};
    const alphaProps = {...props};

    alphaProps.valueProps = numberValueProperties( 100, 0, 100, 0, 0.001, true);

    if(alphaProps.objectControlProps!=undefined && alphaProps.objectControlProps.type == 'MAT_REF'){
      alphaProps.objectControlProps.valueProps = numberValueProperties( 100, 0, 100, 0, 0.001, true);
    }

    return {'base': widgetProps, 'red': redProps, 'blue': blueProps, 'green': greenProps, 'alpha': alphaProps, 'indicator': indicatorBoxProps};
  }
  static SliderMatProps(widgetProps){
    let col = colorsea(widgetProps.defaultColor, 100);
    let boxMatProps = {...widgetProps.boxProps.matProps};
    let redMatProps = {...boxMatProps};
    redMatProps.color = 'red';
    let greenMatProps = {...boxMatProps};
    greenMatProps.color = 'green';
    let blueMatProps = {...boxMatProps};
    blueMatProps.color = 'blue';
    let indicatorMatProps = {...boxMatProps};
    indicatorMatProps.color = widgetProps.defaultColor;
    if(widgetProps.objectControlProps!=undefined && widgetProps.objectControlProps.useMaterialView){
      indicatorMatProps.color = 'black';
    }
    indicatorMatProps.useCase = 'STENCIL';
    let props = {'red': redMatProps, 'blue': blueMatProps, 'green': greenMatProps, 'indicator': indicatorMatProps};
    if(widgetProps.useAlpha){
      let alphaMatProps = {...boxMatProps};
      alphaMatProps.color = 'gray';
      props = {'red': redMatProps, 'blue': blueMatProps, 'green': greenMatProps, 'alpha': alphaMatProps, 'indicator': indicatorMatProps};
    }

    return props;
  }
  static SliderValueProps(widgetProps){
    let col = colorsea(widgetProps.defaultColor, widgetProps.alpha);
    let rgba = col.rgba();
    let redValProps = numberValueProperties( rgba[0], 0, 255, 0, 0.001, true);
    let greenValProps = numberValueProperties( rgba[1], 0, 255, 0, 0.001, true);
    let blueValProps = numberValueProperties( rgba[2], 0, 255, 0, 0.001, true);
    let alphaValProps = numberValueProperties( rgba[3], 0, 100, 0, 0.001, true);

    let props = {'red': redValProps, 'blue': blueValProps, 'green': greenValProps};

    if(widgetProps.useAlpha){
      props = {'red': redValProps, 'blue': blueValProps, 'green': greenValProps, 'alpha': alphaValProps};
    }

    return props
  }

};

/**
 * This function creates a color (inset inside of parent, 
 * rendered using stencil ref)widget based on passed property set.
 * @param {object} colorWidgetProps (colorWidgetProperties) Properties used for toggle widget.
 * 
 * @returns {null} no return value.
 */
export function createColorWidget(colorWidgetProps) {
  colorWidgetProps.useValueText = true;
  if(typeof colorWidgetProps.textProps.font === 'string'){
    // Load the font
    loader.load(colorWidgetProps.textProps.font, (font) => {
      colorWidgetProps.textProps.font = font;
      new ColorWidget(colorWidgetProps);
    });
  }else if(colorWidgetProps.textProps.font.isFont){
    new ColorWidget(colorWidgetProps);
  }
};

/**
 * This function creates a color portal(inset inside of parent, 
 * rendered using stencil ref)widget based on passed property set.
 * @param {object} colorWidgetProps (colorWidgetProperties) Properties used for toggle widget.
 * 
 * @returns {null} no return value.
 */
export function createColorWidgetPortal(colorWidgetProps) {
  colorWidgetProps.useValueText = true;
  colorWidgetProps.boxProps.isPortal = true;
  createColorWidget(colorWidgetProps);
};

export function nullValueProperties(defaultValue='NULL', onValue='NULL', offValue='NULL', editable=false){
  return {
    'type': 'NULL_VALUE_PROPS',
    'defaultValue': defaultValue,
    'onValue': onValue,
    'offValue': offValue,
    'editable': editable
  }
};

/**
 * This function creates string value property set for toggle widgets.
 * @param {string} [defaultValue='Off'] default value of widget.
 * @param {string} [onValue='On'] on value of widget.
 * @param {string} [offValue='On'] off value of widget.
 * @param {bool} [editable=false] if true attached text element is editable.
 * 
 * @returns {object} Data value property object for toggle elements.
 */
export function stringValueProperties(defaultValue='Off', onValue='On', offValue='Off', editable=false){
  return {
    'type': 'STRING_VALUE_PROPS',
    'defaultValue': defaultValue,
    'onValue': onValue,
    'offValue': offValue,
    'editable': editable
  }
};

/**
 * This function creates a property set toggle widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} [name=''] for the element.
 * @param {bool} [horizontal=true] if true toggle is horizontal, else vertical.
 * @param {bool} [on=false] if true initial state of widget is toggled(on), else off.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {bool} useValueText if true toggle has a text portal for value.
 * @param {object} [valueProps=stringValueProperties] property set for value type of toggle widget.
 * @param {number} [handleSize=2] size of handle on toggle.
 * @param {object} [objectControlProps=undefined] slot for object that will be updated by widget.
 * 
 * @returns {object} Data object for toggle elements.
 */
export function toggleProperties(scene, boxProps, name='', horizontal=true, on=false, textProps=undefined, useValueText=true, valueProps=stringValueProperties(), handleSize=2, objectControlProps=undefined ){
  return {
    'type': 'TOGGLE',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'horizontal': horizontal,
    'on': on,
    'textProps': textProps,
    'useValueText': useValueText,
    'valueProps': valueProps,
    'handleSize': handleSize,
    'objectControlProps': objectControlProps
  }
};

/**
 * This function creates a default property set for toggle widgets based on mesh.
 * @param {string} mesh Object3D that dimensions are based on.
 * @param {object} valueProps value property object used by widget.
 * @param {bool} on toggle state of widget.
 * 
 * @returns {object} Data object for slider elements, used in panels.
 */
export function togglePropsFromMesh(scene, mesh, on=false){
  const boxProps = boxPropsFromMesh(mesh.name, mesh.parent, mesh);
  const textProps = defaultWidgetTextProperties(DEFAULT_FONT);
  return toggleProperties(scene, boxProps, name, true, on, textProps, false);
};

/**
 * This function creates a default property set for toggle widgets.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * @param {bool} [on=false] initial toggled state of widget.
 * 
 * @returns {object} Data object for toggle elements.
 */
export function defaultPanelBooleanToggleProps(scene, name, parent, font, on=false){
  const boxProps = defaultPanelToggleBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  return toggleProperties(scene, boxProps, name, true, on, textProps);
}

/**
 * This function creates a toggle widget based on passed property set.
 * @param {object} widgetProps (widgetProperties) property set.
 * 
 * @returns {object} ToggleWidget class object.
 */
export class ToggleWidget extends BaseWidget {
  constructor(widgetProps) {

    super(widgetProps);
    this.is = 'TOGGLE_WIDGET';
    this.scene = widgetProps.scene;
    this.on = widgetProps.on;
    
    if(this.box.userData.hasSubObject){
      this.ValueText(this, widgetProps.boxProps, widgetProps, this.size.baseWidth, this.size.baseHeight)
    }
    this.setToggleUserData();

    if(widgetProps.horizontal){
      this.handle.userData.onPos = this.handleCtrl.RightCenterBoxPos();
    }else{
      this.handle.userData.onPos = this.handleCtrl.TopCenterBoxPos();
    }

    this.scene.toggles.push(this.handle);

    if(widgetProps.valueProps.defaultValue == widgetProps.valueProps.onValue){
      this.handle.position.copy(this.handle.userData.onPos);
      this.handle.userData.on = true;
    }

    if(this.box.userData.valueBox != undefined){
      this.box.userData.valueBox.dispatchEvent({type:'update'});
    }
    const self = this;
    this.handle.addEventListener('action', function(event) {
      self.scene.anims.toggleAnimation(this.userData.targetElem);
    });

    if(this.on){
      console.log('Should set toggle on...')
      console.log(widgetProps)
      this.scene.anims.toggleAnimation(this);
    }

  }
  setToggleUserData(){
    let toggleProps = this.box.userData.properties;

    this.box.userData.type = 'TOGGLE';
    this.box.userData.size = {'width': toggleProps.boxProps.width, 'height': toggleProps.boxProps.height, 'depth': this.widgetSize.baseDepth};
    this.box.userData.handle = this.handle;
    this.box.userData.horizontal = toggleProps.horizontal;
    this.box.userData.valueProps = toggleProps.valueProps;
    this.box.userData.value = toggleProps.valueProps.defaultValue;
    this.updateBooleanValue();

    this.handle.userData.type = 'TOGGLE';
    this.handle.userData.size = {'width': this.widgetSize.handleWidth, 'height': this.widgetSize.handleHeight, 'depth': this.widgetSize.handleDepth};
    this.handle.userData.offPos = new THREE.Vector3().copy(this.handle.position);
    this.handle.userData.horizontal = toggleProps.horizontal;
    this.handle.userData.anim = false;
    this.handle.userData.on = false;
    this.handle.userData.targetElem = this;

  }
  updateBooleanValue(){
    let result = true;
    if(this.box.userData.value=='Off'){
      result = false;
    }
    this.box.userData.booleanValue = result;
  }
  handleToggleValueText(toggle){
    if(toggle.box.userData.valueBox != undefined){

      if(toggle.box.userData.value == toggle.base.userData.valueProps.onValue){
        toggle.box.userData.value = toggle.base.userData.valueProps.offValue;
      }else{
        toggle.box.userData.value = toggle.base.userData.valueProps.onValue;
      }

      toggle.box.userData.valueBox.dispatchEvent({type:'update'});
    }
  }
  HVYMCollectionParams(propGrp, propName, colId){
    this.value = this.on;
    super.HVYMCollectionParams(propGrp, propName, colId);
  }
  static HandleHVYMToggle(toggle){
    let bool = toggle.box.userData.booleanValue;
    toggle.on = bool;
    if(toggle.objectRef.isObject3D && toggle.objectRef!=undefined){
      toggle.objectRef.userData.hvymCtrl.SetMeshVis(toggle.objectRef, bool);
    } else if(toggle.objectRef.type == 'ANIM_REF'){
      toggle.objectRef.hvymCtrl.ToggleAnimation(toggle.objectRef.ref, bool);
    }

  }
  static DoToggle(toggle){
    toggle.handle.userData.on=!toggle.handle.userData.on;
    toggle.box.userData.boxCtrl.on=!toggle.box.userData.boxCtrl.on;
    if(toggle.box.userData.valueBox != undefined){

      if(toggle.box.userData.value == toggle.box.userData.valueProps.onValue){
        toggle.box.userData.value = toggle.box.userData.valueProps.offValue;
      }else{
        toggle.box.userData.value = toggle.box.userData.valueProps.onValue;
      }

      toggle.updateBooleanValue();

      if(toggle.isHVYM){
        ToggleWidget.HandleHVYMToggle(toggle);
        toggle.UpdateHvymData(toggle.on);
      }

      toggle.box.userData.valueBox.dispatchEvent({type:'update'});
    }
  }
};

/**
 * This function sets required scrolling userdata vars on passed mergedMesh
 */
function setMergedMeshUserData(boxSize, geomSize, padding, mergedMesh){
  let extraSpace = padding*0.5;
  mergedMesh.userData.initialPositionY = boxSize.height/2 - geomSize.height/2;
  mergedMesh.userData.maxScroll = geomSize.height/2 - boxSize.height/2 - (padding+extraSpace);
  mergedMesh.userData.minScroll = mergedMesh.userData.initialPositionY+mergedMesh.userData.maxScroll+(padding-extraSpace);
  mergedMesh.userData.padding = padding;
}

/**
 * This function sets required mouse-over userdata vars on passed element
 */
function mouseOverUserData(elem){
  elem.userData.defaultScale =  new THREE.Vector3().copy(elem.scale);
  elem.userData.mouseOver =  false;
  elem.userData.mouseOverActive = false;
  elem.userData.hoverAnim = undefined;
}

/**
 * This function creates a slider portal(inset inside of parent, 
 * rendered using stencil ref)widget based on passed property set.
 * @param {object} sliderProps (sliderProperties) Properties used for toggle widget.
 * 
 * @returns {null} no return value.
 */
function adjustBoxScaleRatio(box, parent){
  let ratio = parent.userData.ratio;
  let scaleX = parent.scale.x;
  let scaleY = parent.scale.y;
  let newX = box.scale.x;
  let newY = box.scale.y;
  if(scaleX > scaleY){
    newX = newX*(ratio);
  }else if(scaleY > scaleX){
    newY = newY*(ratio);
  }

  box.scale.set(newX, newY, box.scale.z);
  box.userData.defaultScale = new THREE.Vector3().copy(box.scale);
}

/**
 * This function creates a property set for list selector widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} text the text that will be rendered.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {object} [animProps=undefined] (animationProperties) animation properties for text.
 * @param {object} [listConfig=undefined] (listItemConfig) if a list config is used, model will be attached to a list element.
 * @param {bool} [scrollable=false] if true, text is scrollable.
 * @param {bool} [MultiLetterMeshes=false] if true, text created with an individual mesh for each letter.
 * 
 * @returns {object} Data object for list selector elements.
 */
export function textBoxProperties( scene, boxProps, text, textProps, animProps=undefined, listConfig=undefined, scrollable=false, MultiLetterMeshes=false){
  return {
    'type': 'TEXT_BOX',
    'scene': scene,
    'boxProps': boxProps,
    'text': text,
    'textProps': textProps,
    'animProps': animProps,
    'listConfig': listConfig,
    'scrollable': scrollable,
    'MultiLetterMeshes': MultiLetterMeshes
  }
};


/**
 * This function creates a slider portal(inset inside of parent, 
 * rendered using stencil ref)widget based on passed property set.
 * @param {object} sliderProps (sliderProperties) Properties used for toggle widget.
 * 
 * @returns {null} no return value.
 */
export function createSliderPortal(sliderProps) {
  sliderProps.boxProps.isPortal = true;
  createSliderBox(sliderProps);
};

/**
 * This function creates a toggle widget based on passed property set.
 * @param {object} toggleProps (toggleProperties) Properties used for toggle widget.
 * 
 * @returns {null} no return value.
 */
export function createToggleBox(toggleProps) {
  if(typeof toggleProps.textProps.font === 'string'){
    // Load the font
    loader.load(toggleProps.textProps.font, (font) => {
      toggleProps.textProps.font = font;
      let toggle = new ToggleWidget(toggleProps);
      toggle.scene.toggles.push(toggle.handle);

    });
  }else if(toggleProps.textProps.font.isFont){
    let toggle = new ToggleWidget(toggleProps);
    toggle.scene.toggles.push(toggle.handle);
  }
};

/**
 * This function creates a toggle portal(inset inside of parent, 
 * rendered using stencil ref)widget based on passed property set.
 * @param {object} toggleProps (toggleProperties) Properties used for toggle widget.
 * 
 * @returns {null} no return value.
 */
function TogglePortal(toggleProps) {
  const parentSize = getGeometrySize(toggleProps.boxProps.parent.geometry);
  let stencilRef = getStencilRef();
  let toggle = new ToggleWidget(toggleProps);
  setupStencilMaterial(toggle.box.material, stencilRef);
  setupStencilChildMaterial(toggle.handle.material, stencilRef);
  toggle.box.material.depthWrite = false;
  toggle.handle.material.depthWrite = false;
  toggleProps.boxProps.parent.add(toggle.box);
  toggle.box.position.set(toggle.box.position.x, toggle.box.position.y, toggle.box.position.z+parentSize.depth/2);
  toggle.scene.toggles.push(toggle.handle);

}

/**
 * This function creates a toggle portal(inset inside of parent, 
 * rendered using stencil ref)widget based on passed property set.
 * @param {object} toggleProps (toggleProperties) Properties used for toggle widget.
 * 
 * @returns {null} no return value.
 */
export function createTogglePortal(toggleProps) {
  if(typeof toggleProps.textProps.font === 'string'){
    // Load the font
    loader.load(toggleProps.textProps.font, (font) => {
      toggleProps.textProps.font = font;
      TogglePortal(toggleProps);
    });
  }else if(toggleProps.textProps.font.isFont){
    TogglePortal(toggleProps);
  }
};

/**
 * This function creates a input text box widget based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {object} TextBoxWidget class object.
 */
export class TextBoxWidget extends BaseWidget {
  constructor(textBoxProps) {
    const textProps = textBoxProps.textProps;
    let widgetProps = widgetProperties(textBoxProps.scene, textBoxProps.boxProps, "", true, true, textProps, false, undefined, textBoxProps.listConfig, 0);
    super(widgetProps);
    this.is = 'TEXT_BOX_WIDGET';
    this.scene = textBoxProps.scene;
    this.textMeshMaterial = getMaterial(textProps.matProps);
    this.textProps = textProps;
    this.textMesh = this.BaseText.NewTextMesh('textMesh', textBoxProps.text);
    if(!textBoxProps.MultiLetterMeshes){
      if(textBoxProps.animProps!=undefined){
        this.textMesh.material.transparent=true;
        this.textMesh.material.opacity=0;
      }

      if(textBoxProps.boxProps.name==''){
        textBoxProps.boxProps.name='text-'+this.box.id;
      }
      this.box.name = textBoxProps.boxProps.name;
      this.BaseText.SetMergedTextUserData('textMesh');
      this.textMesh.userData.draggable=textBoxProps.textProps.draggable;
      this.textMesh.userData.horizontal=false;
    }
    this.textMeshSize = getGeometrySize(this.textMesh.geometry);
    this.box.add(this.textMesh);

    this.HandleListConfig(textBoxProps.listConfig);

    if(textProps.draggable){
      this.scene.draggable.push(this.textMesh);
    }
    if(textBoxProps.animProps!=undefined){
      //anim, action, duration, ease, delay, onComplete
      this.scene.anims.multiAnimation(this.box, this.textMesh.children, textBoxProps.animProps.anim, textBoxProps.animProps.action, textBoxProps.animProps.duration, textBoxProps.animProps.ease, textBoxProps.animProps.delay, textBoxProps.animProps.callback);
    }
    if(textBoxProps.onCreated!=undefined){
      textBoxProps.onCreated(this.box);
    }
    if(textBoxProps.isPortal){
      setupStencilMaterial(this.box.material, this.box.material.stencilRef);
      setupStencilChildMaterial(this.textMeshMaterial, this.box.material.stencilRef);
    }
  }
  NewTextMeshStencilMaterial(stencilRef){
    const material = getMaterial(this.textProps.matProps, stencilRef);
    if(this.BaseText.multiTextArray.length>0){
      this.BaseText.multiTextArray.forEach((text, index) =>{
        text.material = material;
      });

    }else{
      this.textMesh.material = material;
    }
  }
  SetTextMeshMaterialStencilRef(stencilRef){
    this.textMesh.material.stencilRef = stencilRef;
  }
  ConvertTextMeshMaterialToPortalChildMaterial(){
    this.textMesh.material.depthWrite = false;
    this.textMesh.material.stencilWrite = true;
    this.textMesh.material.stencilFunc = THREE.EqualStencilFunc;
    //this.textMesh.material.stencilZPass = undefined;
  }
  static SetupPortalProps(textBoxProps){
    textBoxProps.boxProps.isPortal = true;
    textBoxProps.boxProps.matProps.useCase = 'STENCIL';
    textBoxProps.textProps.matProps.useCase = 'STENCIL_CHILD';

    return textBoxProps
  }

};

/**
 * This function creates a multi-line text widget based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {null} no return.
 */
export function createStaticTextBox(textBoxProps) {
  textBoxProps.MultiLetterMeshes = false;
  if(typeof textBoxProps.textProps.font === 'string'){
    // Load the font
    loader.load(textBoxProps.textProps.font, (font) => {
      textBoxProps.textProps.font = font;
      ListItemBox.SetListConfigFont(textBoxProps.listConfig, font);
      new TextBoxWidget(textBoxProps);
    });
  }else if(textBoxProps.textProps.font.isFont){
    ListItemBox.SetListConfigFont(textBoxProps.listConfig, font);
    new TextBoxWidget(textBoxProps);
  }  
};

/**
 * This function creates a multi-line text widget portal based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {null} no return.
 */
export function createStaticTextPortal(textBoxProps) {
  textBoxProps = TextBoxWidget.SetupPortalProps(textBoxProps);
  createStaticTextBox(textBoxProps);
}

/**
 * This function creates a scrollable multi-line text widget portal based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {null} no return.
 */
export function createStaticScrollableTextBox(textBoxProps) {
  textBoxProps.textProps.draggable = true;
  createStaticTextBox(textBoxProps); 
}

/**
 * This function creates a multi-line text widget portal based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {null} no return.
 */
export function createStaticScrollableTextPortal(textBoxProps) {
  textBoxProps.textProps.draggable = true;
  createStaticTextPortal(textBoxProps);
}

/**
 * This function creates a multi-line text widget based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {null} no return.
 */
export function createMultiTextBox(textBoxProps) {
  textBoxProps.MultiLetterMeshes = true;
  textBoxProps.textProps.MultiLetterMeshes = true;
  if(typeof textBoxProps.textProps.font === 'string'){
    // Load the font
    loader.load(textBoxProps.textProps.font, (font) => {
      textBoxProps.textProps.font = font;
      ListItemBox.SetListConfigFont(textBoxProps.listConfig, font);
      new TextBoxWidget(textBoxProps);
    });
  }else if(textBoxProps.textProps.font.isFont){
    ListItemBox.SetListConfigFont(textBoxProps.listConfig, font);
    new TextBoxWidget(textBoxProps);
  }
};

/**
 * This function creates a multi-line text widget portal based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {null} no return.
 */
export function createMultiTextPortal(textBoxProps) {
  textBoxProps = TextBoxWidget.SetupPortalProps(textBoxProps);
  createMultiTextBox(textBoxProps);
};

/**
 * This function creates a scrollable text widget based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {null} no return.
 */
export function createMultiScrollableTextBox(textBoxProps) {
  textBoxProps.textProps.draggable = true;
  createMultiTextBox(textBoxProps);
};

/**
 * This function creates a scrollable text widget portal based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) property set.
 * 
 * @returns {null} no return.
 */
export function createMultiScrollableTextPortal(textBoxProps) {
  textBoxProps = TextBoxWidget.SetupPortalProps(textBoxProps);
  createMultiScrollableTextBox(textBoxProps);
};

/**
 * This function creates a catch all property set for text based elements.
 * @param {object} cBox object for an widget that has a box mesh.
 * @param {string} text string of text to be rendered.
 * @param {object} textMesh Object3D mesh for text.
 * @param {object} font the loaded font asset object.
 * @param {number} size text size.
 * @param {number} height text height.
 * @param {number} zOffset position of text in z.
 * @param {number} letterSpacing space between letters.
 * @param {number} lineSpacing space between text lines.
 * @param {number} wordSpacing space between words.
 * @param {number} text padding.
 * @param {number} draggable draggability of text.
 * @param {number} meshProps text mesh properties.
 * @param {bool} [wrap=true] if true, text wraps.
 * @param {bool} [hasButton=false] if true, text element has button.
 * 
 * @returns {object} Data object text elements.
 */
export function editTextProperties(cBox, text, textMesh, font, size, height, zOffset, letterSpacing, lineSpacing, wordSpacing, padding, draggable, meshProps, wrap=true, hasButton=false){
  return {
    'type': 'EDIT_TEXT_PROPS',
    'cBox': cBox,
    'text': text,
    'textMesh': textMesh,
    'font': font,
    'size': size,
    'height': height,
    'zOffset': zOffset,
    'letterSpacing': letterSpacing,
    'lineSpacing': lineSpacing,
    'wordSpacing': wordSpacing,
    'padding': padding,
    'draggable': draggable,
    'meshProps': meshProps,
    'wrap': wrap,
    'hasButton': hasButton
  }
};

/**
 * This function creates a input text widget based on passed property set.
 * @param {object} inputTextProps (editTextProperties) property set.
 * 
 * @returns {object} InputTextWidget class object.
 */
export class InputTextWidget extends BaseWidget {
  constructor(textInputProps) {
    const props = InputTextWidget.CalculateBoxProps(textInputProps);
    let inputBoxProps = props.inputBoxProps;
    let btnBoxProps = undefined;

    if(textInputProps.buttonProps != undefined){
      btnBoxProps = props.btnBoxProps;
      textInputProps.buttonProps.boxProps = btnBoxProps;
    }
    const textProps = textInputProps.textProps;
    let widgetProps = widgetProperties(textInputProps.scene, inputBoxProps, textInputProps.name, true, true, textProps, false, undefined, textInputProps.listConfig, 0)
    super(widgetProps);
    this.is = 'INPUT_TEXT_WIDGET';
    this.scene = textInputProps.scene;
    this.defaultText = 'Enter Text';
    if(textInputProps.name.length>0){
      this.defaultText = textInputProps.name;
    }
    
    this.BaseText.SetParent(this);
    this.inputText = this.BaseText.NewTextMesh('inputText', this.defaultText);
    setupStencilChildMaterial(this.inputText.material, this.box.material.stencilRef);
    this.BaseText.SetMergedTextUserData('inputText');
    this.inputTextSize = this.inputText.userData.size;
    this.box.userData.properties = textInputProps;
    this.inputBoxProps = inputBoxProps;
    if(btnBoxProps!=undefined){
      textInputProps.buttonProps.boxProps.parent = this.box;
      this.btnBoxProps = btnBoxProps;
      this.buttonProps = textInputProps.buttonProps;
    }
    
    this.scene.mouseOverable.push(this.inputText);

    if(this.buttonProps != undefined){
      this.button = this.AttachButton();
    }

    this.HandleTextInputSetup();
  }
  HandleTextInputSetup(){
    this.scene.inputPrompts.push(this.inputText);
    let textProps = this.box.userData.properties.textProps;
    let draggable = this.box.userData.properties.draggable;
    const editProps = editTextProperties(this, '', this.inputText, textProps.font, textProps.size, textProps.height, textProps.zOffset, textProps.letterSpacing, textProps.lineSpacing, textProps.wordSpacing, textProps.padding, draggable, textProps.meshProps);
    this.inputText.userData.textProps = editProps;
    this.box.userData.mouseOverParent = true;
    this.box.userData.currentText = '';
    this.scene.mouseOverable.push(this.box);
    mouseOverUserData(this.inputText);
    if(this.box.userData.properties.isPortal){
      setupStencilMaterial(this.box.material, this.box.material.stencilRef);
      setupStencilChildMaterial(this.inputText.material, this.box.material.stencilRef);
    }
  }
  AttachButton(){
    let btn = undefined;
    if(!this.box.userData.properties.isPortal){
      btn = ButtonElement(this.buttonProps);
    }else{
      btn = PortalButtonElement(this.buttonProps);
    }
    this.Recenter(this.btnBoxProps.width);

    if(this.box.userData.properties.buttonProps.attach == 'RIGHT'){
      btn.AlignOutsideRight();
    }else if(widgetProps.buttonProps.attach == 'BOTTOM'){
      btn.AlignOutsideRight();
    }

    return btn
  }
  static CalculateBoxProps(inputTextProps){
    let inputBoxProps = {...inputTextProps.boxProps};
    let btnBoxProps = {...inputTextProps.boxProps};
    let hasButton = (inputTextProps.buttonProps != undefined);
    let horizontal = true;
    if(hasButton && inputTextProps.buttonProps.attach == 'BOTTOM'){
      horizontal = false;
    }
    let size = BaseWidget.CalculateWidgetSize(inputTextProps.boxProps, horizontal, hasButton, 2);

    inputBoxProps.width = size.baseWidth;
    inputBoxProps.height = size.baseHeight;
    inputBoxProps.depth = size.baseDepth;

    btnBoxProps.width = size.subWidth;
    btnBoxProps.height = size.subHeight;
    btnBoxProps.depth = size.subDepth;

    return { inputBoxProps, btnBoxProps }
  }
  static SetupPortalProps(textInputProps){
    textInputProps.boxProps.isPortal = true;
    textInputProps.boxProps.matProps.useCase = 'STENCIL';
    textInputProps.textProps.matProps.useCase = 'STENCIL_CHILD';
    if(textInputProps.buttonProps!=undefined){
      textInputProps.buttonProps.boxProps.isPortal = true;
      textInputProps.buttonProps.boxProps.matProps.useCase = 'STENCIL';
      textInputProps.buttonProps.textProps.matProps.useCase = 'STENCIL_CHILD';
    }
    return textInputProps
  }
};

/**
 * This function creates a default property set for input text box properties.
 * @param {object} parent Object3D that the widget should be parented to.
 * 
 * @returns {object} boxProperties for input text elements.
 */
function TextInputBoxProperties(parent, portal=false){
  let matProps = phongMatProperties('black');
  if(portal){
    matProps = phongStencilMatProperties('black');
  }
  return boxProperties('input-box-properties', parent, 'black', 4, 2, 0.2, 10, 0.4, 0.25, true, matProps);
}

/**
 * This function creates a default property set for input text box properties.
 * @param {object} parent Object3D that the widget should be parented to.
 * 
 * @returns {object} boxProperties for input text elements.
 */
export function defaultTextInputBoxProps(parent=undefined){
  return TextInputBoxProperties(parent);
};

/**
 * This function creates a default property set for input text box portal properties.
 * @param {object} parent Object3D that the widget should be parented to.
 * 
 * @returns {object} boxProperties for input text elements.
 */
export function defaultTextInputPortalBoxProps(parent){
  return TextInputBoxProperties(parent, true);
};

/**
 * This function creates a property set for input text widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} name for the element.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {object} [buttonProps=undefined] (buttonProperties) if input needs a button, pass button properties.
 * @param {bool} [draggables=false] if true, text will be draggable.
 * 
 * @returns {object} Data object for list selector elements.
 */
export function textInputProperties( scene, boxProps, name='', textProps=undefined, buttonProps=undefined, draggable=false){
  return {
    'type': 'INPUT_TEXT',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'textProps': textProps,
    'buttonProps': buttonProps,
    'draggable': draggable
  }
};

/**
 * This function creates a default property set for edit text widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for edit text elements.
 */
export function defaultPanelEditTextProps(scene, name, parent, font){
  const boxProps = defaultPanelEditTextBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  textProps.editText = true;
  return textInputProperties(scene, boxProps, name, textProps);
}

/**
 * This function creates a default property set for edit text widgets in panels.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for edit text elements in panels.
 */
export function defaultPanelInputTextProps(scene, name, parent, font){
  const boxProps = defaultPanelEditTextBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  const btnBoxProps = defaultEditTextButtonBoxProps(name, parent);
  const btnProps = buttonProperties(btnBoxProps, name, '', textProps)
  return textInputProperties(scene, boxProps, name, textProps, btnProps);
}

/**
 * This function creates a text input widget.
 * @param {object} textInputProps (textInputProperties) Properties used for text input widget.
 * 
 * @returns {null} no return value.
 */
export function createTextInput(textInputProps) {
  textInputProps.textProps.editText = true;
  if(typeof textInputProps.textProps.font === 'string'){
    // Load the font
    loader.load(textInputProps.textProps.font, (font) => {
      textInputProps.textProps.font = font;
      new InputTextWidget(textInputProps);
    });
  }else if(textInputProps.textProps.font.isFont){
    new InputTextWidget(textInputProps);
  }
};

/**
 * This function creates a text input widget.
 * @param {object} textInputProps (textInputProperties) Properties used for text input widget.
 * 
 * @returns {null} no return value.
 */
export function createScrollableTextInput(textInputProps) {
  textInputProps.draggable = true;
  createTextInput(textInputProps);
};

/**
 * This function creates a text input widget portal(inset inside of parent, 
 * rendered using stencil ref) widget based on passed property set.
 * @param {object} textInputProps (textInputProperties) Properties used for text input widget.
 * 
 * @returns {null} no return value.
 */
export function createTextInputPortal(textInputProps) {
  textInputProps = InputTextWidget.SetupPortalProps(textInputProps);
  createTextInput(textInputProps);
};

/**
 * This function creates a text input widget.
 * @param {object} textInputProps (textInputProperties) Properties used for text input portal(inset inside of parent, rendered using stencil ref) widget based on passed property set.
 * 
 * @returns {null} no return value.
 */
export function createScrollableTextInputPortal(textInputProps) {
  textInputProps = InputTextWidget.SetupPortalProps(textInputProps);
  textInputProps.draggable = true;
  createTextInput(textInputProps);
};

/**
 * This function creates a selector set property set.
 * @param {object} set dictionary of objects for selector.
 * 
 * @returns {object} Selector set property.
 */
export function selectorSet(set){
  return {
    'type': 'SELECTOR_SET',
    'set': set
  }
};

/**
 * This function creates a property set for list selector widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} name for the element.
 * @param {object} [textProps=undefined] (textProperties) Properties of text.
 * @param {object} [listConfig=undefined] (listItemConfig) if a list config is used, model will be attached to a list element.
 * @param {object} [objectControlProps=undefined] slot for object that will be updated by widget.
 * 
 * @returns {object} Data object for list selector elements.
 */
export function listSelectorProperties( scene, boxProps=defaultTextInputBoxProps(), name='', textProps=undefined, listConfig=undefined, objectControlProps=undefined){
  return {
    'type': 'LIST_SELECTOR',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'textProps': textProps,
    'listConfig': listConfig,
    'objectControlProps': objectControlProps
  }
};

/**
 * This function creates a default property set for toggle widgets based on mesh.
 * @param {string} mesh Object3D that dimensions are based on.
 * @param {object} valueProps value property object used by widget.
 * 
 * @returns {object} Data object for list selector widgets.
 */
export function listSelectorPropsFromMesh(scene, mesh){
  const boxProps = boxPropsFromMesh(mesh.name, mesh.parent, mesh);
  const textProps = defaultWidgetTextProperties(DEFAULT_FONT);
  return listSelectorProperties(scene, boxProps, mesh.name, textProps);
};

/**
 * This function creates a default property set for list selector widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for list selector elements.
 */
export function defaultPanelListSelectorProps(scene, name, parent, font){
  const boxProps = defaultPanelListSelectorBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  const listSelectorProps = listSelectorProperties(scene, boxProps, name, textProps)

  return listSelectorProps
};

/**
 * This function creates a default property set for material list selector widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * 
 * @returns {object} Data object for list selector elements.
 */
export function defaultPanelMaterialSetSelectorProps(name, parent, font){
  const boxProps = defaultPanelListSelectorBoxProps(name, parent);
  const textProps = defaultWidgetTextProperties(font);
  const listSelectorProps = listSelectorProperties(boxProps, name, textProps)

  return listSelectorProps
};

/**
 * This function creates a selector widget based on passed property set.
 * @param {object} listSelectorProps (listSelectorProperties) property set.
 * 
 * @returns {object} SelectorWidget class object.
 */
export class SelectorWidget extends BaseWidget {
  constructor(listSelectorProps) {
    const isPortal = listSelectorProps.isPortal;
    const textProps = listSelectorProps.textProps;
    let btnBoxProps = {...listSelectorProps.boxProps};
    let btnMatProps = {...listSelectorProps.boxProps.matProps};
    let btnTextProps = {...listSelectorProps.textProps};
    btnBoxProps.matProps = btnMatProps;
    if(isPortal){
      btnBoxProps.isPortal = isPortal;
      btnBoxProps.matProps.useCase = 'STENCIL_CHILD';
      btnTextProps.matProps.useCase = 'STENCIL_CHILD';
      btnMatProps.useCase = 'STENCIL';
      listSelectorProps.boxProps.matProps.useCase = 'STENCIL_CHILD';
      listSelectorProps.textProps.matProps.useCase = 'STENCIL_CHILD';
    }
    let widgetProps = widgetProperties(listSelectorProps.scene, btnBoxProps, listSelectorProps.name, true, true, btnTextProps, false, undefined, listSelectorProps.listConfig, 0)
    super(widgetProps);
    this.is = 'SELECTOR_WIDGET';
    this.scene = listSelectorProps.scene;
    this.selectedIndex = 0;
    this.selectedKey = undefined;
    this.isHVYM = false;
    this.isPortal = isPortal;
    this.box.userData.properties = listSelectorProps;
    this.box.userData.selectors = [];
    this.box.userData.defaultZPos = this.box.position.z;
    this.box.userData.hoverZPos = this.box.position.z;
    this.btnBoxProps = btnBoxProps;
    this.btnMatProps = btnMatProps;
    this.btnTextProps = btnTextProps;
    this.boxProps = btnBoxProps;
    this.selectors = {};
    this.btns = [];
    this.meshSet = undefined;

  }
  AssignSelectionSet(selectors){
    const index = selectors.selected_index;
    const type = selectors.type;
    this.selectors = selectors.set;
    if(selectors.type == 'SELECTOR_SET'){
      
    }else if(type == 'HVYM_MAT_SET'){
      this.isHVYM = true;
      this.collectionID = selectors.collection_id;
      this.matSet = selectors.set;
      this.meshSet = selectors.mesh_set.set;
    }else if(type == 'HVYM_MESH_SET'){
      this.isHVYM = true;
      this.collectionID = selectors.collection_id;
      this.meshSet = selectors.set;
    }else if(type == 'HVYM_INTERACTABLE_SET'){
      this.isHVYM = true;
      this.collectionID = undefined;
    }

    this.CreateSelectors();

    if(this.isPortal){
      this.CreateHeightExpandedMorph(Object.keys(this.selectors).length);
    }
    if(Object.keys(this.selectors).length>0){
      SelectorWidget.HandleHVYMSelection(this.selectors[Object.keys(this.selectors)[index]], index);
    }
    if(index>0){
      SelectorWidget.TextSelected(this.btns[index].textMesh);
    }
  }
  CreateSelectors(){
    let idx = 0;

    for (const [key, val] of Object.entries(this.selectors)) {
      let props = this.box.userData.properties;
      let btnProps = buttonProperties(this.scene, {...this.btnBoxProps}, key, val, props.textProps);
      if(val.type == 'HVYM_MAT_SET_REF'){
        val.mat_ref.userData.mat_ref_props = materialRefPropertiesFromMaterial(val.mat_ref, 'color', true);
        val.mat_ref.userData.mat_ref_props.isHVYM = this.isHVYM;
        btnProps.objectControlProps = val.mat_ref.userData.mat_ref_props;
      }
      let btn = new BaseTextBox(btnProps);
      btn.box.userData.properties = props;
      btn.box.userData.ctrl = this;
      btn.box.index = idx;

      const editProps = editTextProperties(btn, '', this.btnTextProps.textMesh, this.btnTextProps.font, this.btnTextProps.size, this.btnTextProps.height, this.btnTextProps.zOffset, this.btnTextProps.letterSpacing, this.btnTextProps.lineSpacing, this.btnTextProps.wordSpacing, this.btnTextProps.padding, true, this.btnTextProps.meshProps);
      btn.textMesh.userData.textProps = editProps;
      this.scene.inputPrompts.push(btn.textMesh);
      this.scene.mouseOverable.push(btn.textMesh);
      this.scene.clickable.push(btn.textMesh);
      this.scene.clickable.push(btn.box);
      btn.box.name = key;
      
      this.SetBtnUserData(btn, key, val, idx);
      mouseOverUserData(btn.textMesh);

      this.box.userData.selectors.push(btn.box);
      this.scene.selectorElems.push(btn.box);
      this.box.add(btn.box);
      this.btns.push(btn);
        
      btn.textMesh.addEventListener('action', function(event) {
        SelectorWidget.TextSelected(btn.textMesh);
      });

      if(idx==0){
        btn.textMesh.userData.selected = true;
        btn.box.position.copy(btn.box.userData.selectedPos);

      }else{
        btn.box.position.copy(btn.box.userData.unselectedPos);
        btn.box.scale.set(0, 0, 0);
      }

      if(this.isPortal){
        setupStencilChildMaterial(btn.box.material, this.box.material.stencilRef);
        setupStencilChildMaterial(btn.textMesh.material, this.box.material.stencilRef);
        btn.box.material.stencilRef = this.box.material.stencilRef;
        btn.textMesh.material.stencilRef = this.box.material.stencilRef;
        btn.textMesh.material.depthWrite = true;
        btn.box.renderOrder = 2;
        btn.textMesh.renderOrder = 2;
        btn.box.position.set(btn.box.position.x, btn.box.position.y, -btn.depth);
      }

      btn.box.material.depthWrite = true;

      if(val.type == 'HVYM_INTERACTABLE_SET_REF'){
        btn.isInteractable = true;
        btn.textMesh.isInteractable = true;
        btn.textMesh.userData.interactableSelection = true;
        btn.textMesh.userData.interactable = this.box.userData.interactable;
        btn.box.userData.interactable = this.box.userData.interactable;
        btn.ReplaceTextMesh(val.mesh_ref.geometry, val.mesh_ref.material);
        val.mesh_ref.visible = false;
        btn.MakeBoxMaterialInvisible();
        this.scene.interactables.push(btn.textMesh);
        btn.objectControlProps = this.objectControlProps;
      }

      idx+=1;
    }
    this.selectedKey = Object.keys(this.selectors)[this.selectedIndex]
  }
  SetBtnUserData(btn, key, value, index){
    const textSize = getGeometrySize(btn.textMesh.geometry);
    let selectedZ = btn.depth+(btn.depth+textSize.depth);
    let unselectedZ = btn.depth;
    if(btn.box.userData.properties.isPortal){
      selectedZ = -btn.depth;
      unselectedZ = -(btn.depth+(btn.depth+textSize.depth)*2);
    }
    btn.textMesh.userData.draggable = false;
    btn.textMesh.userData.key = key;
    btn.textMesh.userData.value = value;
    btn.textMesh.userData.index = index;
    btn.textMesh.userData.selected = false;
    btn.box.userData.selectedScale = 1;
    btn.box.userData.unselectedScale = 0.9;
    btn.box.userData.selectedPos = new THREE.Vector3(btn.box.position.x, btn.box.position.y, selectedZ);
    btn.box.userData.unselectedPos = new THREE.Vector3(btn.box.position.x, btn.box.position.y, unselectedZ);
    btn.box.userData.mouseOverParent = true;
    btn.box.userData.currentText = key;
  }
  static HandleHVYMSelection(value, index){
    if(!value.hasOwnProperty('type'))
      return;

    if(value.type == 'HVYM_MAT_SET_REF'){
      value.ctrl.UpdateMatSet(value);
      value.ctrl.HandleHVYMLocalStorage(value.set_name, value.collection_id, 'materialSets', 'selected_index', index);

    } else if(value.type == 'HVYM_MESH_SET_REF'){
      value.ctrl.UpdateMeshSet(value.collection_id, value.set_name, value.mesh_ref.name);
      value.ctrl.HandleHVYMLocalStorage(value.set_name, value.collection_id, 'meshSets', 'selected_index', index);
    } else if(value.type == 'HVYM_INTERACTABLE_SET_REF'){
      
    }

  }
  static TextSelected(selection){
    const scene = selection.userData.controller.parentCtrl.scene;
    let base = selection.parent.parent;
    base.userData.selection = selection;
    base.userData.boxCtrl.selectedIndex = selection.userData.index;
    base.userData.boxCtrl.selectedKey = Object.keys(base.userData.boxCtrl.selectors)[selection.userData.index];

    base.userData.selectors.forEach((c, idx) => {
      if(c.children[0].userData.selected){
        base.userData.lastSelected = c;
      }
      c.children[0].userData.selected = false;
    });

    selection.userData.selected = true;
    let first = selection.parent;
    base.userData.selectors.sort(function(x,y){ return x == first ? -1 : y == first ? 1 : 0; });
    scene.anims.selectorAnimation(selection.parent.parent, 'SELECT');
    SelectorWidget.HandleHVYMSelection(selection.userData.value, selection.userData.index);

  }
};


/**
 * This function creates a list selector widget.
 * @param {object} listSelectorProps (listSelectorProperties) Properties used for list selector widget.
 * @param {object} selectors (selectorSetProperties) Properties used for list selector set dictionary.
 * 
 * @returns {null} no return value.
 */
export function createListSelector(listSelectorProps, selectors) {

  if(typeof listSelectorProps.textProps.font === 'string'){
    // Load the font
    loader.load(listSelectorProps.textProps.font, (font) => {
      listSelectorProps.textProps.font = font;
      let widget = new SelectorWidget(listSelectorProps);
      widget.AssignSelectionSet(selectors);
    });
  }else if(listSelectorProps.textProps.font.isFont){
    let widget = new SelectorWidget(listSelectorProps);
      widget.AssignSelectionSet(selectors);
  }
};

/**
 * This function creates a list selector portal(inset inside of parent, 
 * rendered using stencil ref) widget based on passed property set.
 * @param {object} listSelectorProps (listSelectorProperties) Properties used for list selector widget.
 * @param {object} selectors (selectorSetProperties) Properties used for list selector set dictionary.
 * 
 * @returns {null} no return value.
 */
export function createListSelectorPortal(listSelectorProps, selectors) {
  listSelectorProps.isPortal = true;
  createListSelector(listSelectorProps, selectors);
};

/**
 * This function creates a button element based on passed property set.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
function ButtonElement(buttonProps){
  let btn = new BaseTextBox(buttonProps);
  let textProps = buttonProps.textProps;
  const tProps = editTextProperties(btn, '', btn.textMesh, textProps.font, textProps.size, textProps.height, textProps.zOffset, textProps.letterSpacing, textProps.lineSpacing, textProps.wordSpacing, textProps.padding, true, textProps.meshProps);
  btn.box.userData.textProps = tProps;
  btn.box.userData.draggable = false;
  btn.textMesh.userData.mouseOverParent = true;

  mouseOverUserData(btn.box);
  btn.scene.clickable.push(btn.box);
  if(buttonProps.mouseOver){
    btn.scene.mouseOverable.push(btn.box);
  }

  btn.box.userData.properties = buttonProps;

  return btn
}

/**
 * This function creates a button portal(inset inside of parent, 
 * rendered using stencil ref) widget based on passed property set.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
function PortalButtonElement(buttonProps){
  const portal = new BaseBox(buttonProps.boxProps);
  const stencilRef = portal.box.material.stencilRef;
  setupStencilMaterial(portal.box.material, stencilRef);
  let btn = ButtonElement(buttonProps);
  const textSize = getGeometrySize(btn.textMesh.geometry);

  btn.box.material.opacity = 0;
  btn.box.material.transparent = true;
  setupStencilChildMaterial(btn.box.material, stencilRef);
  setupStencilChildMaterial(btn.textMesh.material, stencilRef);
  portal.box.add(btn.box);
  btn.box.position.set(btn.box.position.x, btn.box.position.y, -btn.depth/2);
  btn.textMesh.position.set(btn.textMesh.position.x, btn.textMesh.position.y, -textSize.depth/2);
  buttonProps.boxProps.parent.add(portal.box);
  portal.box.userData.properties = buttonProps;

  return portal
}

/**
 * This function creates a button element based on passed property set.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
function Button(buttonProps) {
  if(typeof buttonProps.textProps.font === 'string'){
    // Load the font
    loader.load(buttonProps.textProps.font, (font) => {
      buttonProps.textProps.font = font;
      ButtonElement(buttonProps);
    });
  }else if(buttonProps.textProps.font.isFont){
    ButtonElement(buttonProps);
  }
}

/**
 * This function creates a button portal(inset inside of parent, 
 * rendered using stencil ref) widget based on passed property set.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
function portalButton(buttonProps) {
  if(typeof buttonProps.textProps.font === 'string'){
    // Load the font
    loader.load(buttonProps.textProps.font, (font) => {
      buttonProps.textProps.font = font;
      PortalButtonElement(buttonProps);
    });
  }else if(buttonProps.textProps.font.isFont){
    PortalButtonElement(buttonProps);
  }
}

/**
 * This function creates a button element based on passed property set.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
export function createButton(buttonProps){
  Button(buttonProps);
};

/**
 * This function creates a button portal(inset inside of parent, 
 * rendered using stencil ref) widget based on passed property set.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
export function createPortalButton(buttonProps){
  buttonProps.isPortal = true;
  buttonProps.boxProps.isPortal = true;
  portalButton(buttonProps);
};

/**
 * This function creates a mouseoverable button element based on passed property set.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
export function createMouseOverButton(buttonProps){
  buttonProps.mouseOver = true;
  Button(buttonProps);
};

/**
 * This function creates a  mouseoverable button portal(inset inside of parent, 
 * rendered using stencil ref) widget based on passed property set.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
export function createMouseOverPortalButton(buttonProps){
  buttonProps.mouseOver = true;
  createPortalButton(buttonProps);
};


/**
 * This function creates a button element based on passed mesh geometry.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
export function customGeometryButton(name, scene, parent, mesh, boxMatProps, textProps){
  const geomSize = getGeometrySize(mesh.geometry);
  let boxProps = boxProperties(mesh.name+'input-box-properties', parent, geomSize.width, geomSize.height, geomSize.depth, SMOOTHNESS, RADIUS, Z_OFFSET, false);
  boxProps.matProps = boxMatProps;
  const buttonProps = buttonProperties(scene, boxProps, name, '', textProps, false, 'CENTER');
  let btn = ButtonElement(buttonProps);
  btn.SetCustomGeometry(mesh.geometry);
  
  return btn
};

/**
 * This function creates a button element based on passed mesh geometry.
 * @param {object} buttonProps (buttonProperties) Properties used for button element.
 * 
 * @returns {object} BaseTextBox class object.
 */
export function customGeometryMesh(name, scene, parent, mesh, boxMatProps, textProps){
  const geomSize = getGeometrySize(mesh.geometry);
  let boxProps = boxProperties(mesh.name+'custom-mesh-box-properties', parent, geomSize.width, geomSize.height, geomSize.depth, SMOOTHNESS, RADIUS, Z_OFFSET, false);
  boxProps.matProps = boxMatProps;
  let custom = new BaseBox(boxProps);
  custom.SetCustomGeometry(mesh.geometry);
  
  return custom
};


/**
 * This function creates a slider widget based on passed property set.
 * @param {object} sliderProps (sliderProperties) Properties used for toggle widget.
 * 
 * @returns {null} no return value.
 */
export function createSliderBox(sliderProps) {
  if(typeof sliderProps.textProps.font === 'string'){
    // Load the font
    loader.load(sliderProps.textProps.font, (font) => {
      sliderProps.textProps.font = font;
      new SliderWidget(sliderProps);

    });
  }else if(sliderProps.textProps.font.isFont){
    new SliderWidget(sliderProps);
  }
};

/**
 * This function creates a property set for loading image widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} name for the element.
 * @param {object} imgUrl a url to the image
 * @param {number} [padding=0.01] paddnig for image element.
 * @param {object} [listConfig=undefined] (listItemConfig) if a list config is used, model will be attached to a list element.
 * @param {number} [zoffset=0] Amount to offset model in z.
 * 
 * @returns {object} Data object for gltf model elements.
 */
export function imageProperties( scene, boxProps, name='', imgUrl, padding=0.01, listConfig=undefined, zOffset=0){
  return {
    'type': 'IMAGE',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'imgUrl': imgUrl,
    'padding': padding,
    'listConfig': listConfig,
    'zOffset': zOffset
  }
};

/**
 * This function creates an image widget based on passed property set.
 * @param {object} imageProps (imageProperties) property set.
 * 
 * @returns {object} ImageWidget class object.
 */
export class ImageWidget extends BaseWidget {
  constructor(imageProps) {
    let textProps = {...DEFAULT_TEXT_PROPS};
    imageProps.boxProps.isPortal = true;
    let widgetProps = widgetProperties(imageProps.scene, imageProps.boxProps, imageProps.name, true, true, textProps, false, undefined, imageProps.listConfig, 0);
    super(widgetProps);
    this.is = 'IMAGE_WIDGET';
    this.map = new THREE.TextureLoader().load( imageProps.imgUrl );
    this.imageMaterial = new THREE.MeshBasicMaterial( { color: 'white', map: this.map } );
    this.box.material = this.imageMaterial;

    this.HandleListConfig(imageProps.listConfig);

  }
  NewImageBoxStencilMaterial(stencilRef){
    this.imageMaterial = new THREE.MeshBasicMaterial( { color: 'white', map: this.map } );
    this.box.material = this.imageMaterial;
    setupStencilChildMaterial(this.box.material, stencilRef);
  }
  ConvertToPortalChild(stencilRef){
    setupStencilChildMaterial(this.box.material, stencilRef);
    this.MakeModelPortalChild(stencilRef);
  }
  static SetupPortalProps(imageProps){
    imageProps.isPortal = true;
    imageProps.boxProps.isPortal = true;
    imageProps.matProps.useCase = 'STENCIL';
    imageProps.boxProps.matProps.useCase = 'STENCIL';

    return imageProps
  }

};

/**
 * This function creates an image widget based on passed property set.
 * @param {object} imageProps (imageProperties) Properties used for image widget.
 * 
 * @returns {null} no return value.
 */
export function createImageBox(imageProps){

  if(typeof DEFAULT_TEXT_PROPS.font === 'string'){
    // Load the font
    loader.load(DEFAULT_TEXT_PROPS.font, (font) => {
      DEFAULT_TEXT_PROPS.font = font;
      ListItemBox.SetListConfigFont(imageProps.listConfig, font);
      new ImageWidget(imageProps);
    });
  }else if(DEFAULT_TEXT_PROPS.font.isFont){
    ListItemBox.SetListConfigFont(imageProps.listConfig, DEFAULT_TEXT_PROPS.font);
    new ImageWidget(imageProps);
  }
};

/**
 * Checks whether or not heavymeta data is used for widget creation.
 * @param {object} data heavymeta data object.
 * 
 * @returns {bool}
 */
export function dataIsHVYMWidget(data){
  let result = false;

  if(data.hasOwnProperty('widget_type') && data.hasOwnProperty('show')){
    if(data.widget_type == 'none')
      return
    result = data.show
  }

  return result
}


/**
 * Class for assigned Action animation control.
 * @param {object} HVYM_Data.actionProp.
 * 
 * @returns {HVYM_Action}
 */
export class HVYM_Action {
  constructor(actionProp) {
    this.is = 'HVYM_ACTION';
    this.name = actionProp.name;
    this.collection_id = actionProp.collection_id;
    this.hvymScene = actionProp.hvymScene;
    this.sequence = actionProp.sequence;
    this.type = actionProp.anim_type;
    this.hvymCtrl = actionProp.ctrl;
    this.set = actionProp.set;
    this.interaction = actionProp.interaction;
    this.currentIndex = 0;
    this.lastIndex = 0;
    this.max = this.set.length;
    this.mixer = actionProp.mixer;
    this.activeClip = undefined;
    this.lastClip = undefined;
    this.playing = false;
    this.mesh_ref = undefined;

    if(this.type == 'mesh_action'){
      this.mesh_ref = actionProp.mesh_ref;
      this.SetupMesh();
      this.SetupMeshInteraction();
    }else{
      this.SetupWindowInteraction();
    }

    const self = this;
    this.mixer.addEventListener('finished', (event) => {
      self.playing = false;
      self.lastClip = event.action;
    });

  }
  SetupMesh(){
    this.mesh_ref.userData.defaultScale =  new THREE.Vector3().copy(this.mesh_ref.scale);
    this.mesh_ref.userData.mouseOver =  false;
    this.mesh_ref.userData.mouseOverActive = false;
    this.mesh_ref.userData.hoverAnim = undefined;
    this.mesh_ref.userData.noClickAnimation = true;
  }
  SetupInteraction(elStr){
    switch (this.interaction) {
      case 'click':
        this[`Setup${elStr}ClickHandler`]();
        break;
      case 'double_click':
        this[`Setup${elStr}DoubleClickHandler`]();
        break;
      case 'mouse_wheel':
          this[`Setup${elStr}MouseWheelHandler`]();
          break;
      default:
        console.log('X');
    }
  }
  Handler(elem, action){
    const self = this;
    elem.addEventListener(action, (event) => {
      self.Action();
    });
  }
  ClickHandler(elem){
    this.Handler(elem, 'click');
  }
  WheelHandler(elem){
    this.Handler(elem, 'wheel');
  }
  DoubleClickHandler(elem){
    this.lastClick = 0;
    const self = this;
    elem.addEventListener('click', (e) => {
      const thisClick = Date.now();
      if (thisClick - this.lastClick < 500) {
        this.Action();
        this.lastClick = thisClick;
        return;
      }
      this.lastClick = thisClick;
    });
  }
  SetupMeshInteraction(){
    this.SetupInteraction('Mesh');
  }
  SetupMeshClickHandler(){
    this.Handler(this.mesh_ref, this.type);
    this.hvymScene.meshActions.push(this.mesh_ref);
  }
  SetupMeshMouseWheelHandler(){
    this.WheelHandler(this.mesh_ref);
  }
  SetupMeshDoubleClickHandler(){
    this.Handler(this.mesh_ref, this.type);
    this.hvymScene.meshActions.push(this.mesh_ref);
  }
  SetupWindowInteraction(){
    this.SetupInteraction('Window');
  }
  SetupWindowClickHandler(){
    this.ClickHandler(window);
  }
  SetupWindowDoubleClickHandler(){
    this.DoubleClickHandler(window);
  }
  SetupWindowMouseWheelHandler(){
    this.WheelHandler(window);
  }
  Action(direction='FORWARD'){
    if(this.playing)
      return;

    if(this.currentIndex<=this.max){
      
      if(direction=='BACKWARD'){
        this.currentIndex-=1;
        if(this.currentIndex<0 && this.sequence=='loop'){
          this.currentIndex = this.max;
        }
        if(this.lastClip != undefined){
          this.lastClip.stop();
        }
        this.activeClip = this.set[this.currentIndex];
        this.activeClip.stop();
        this.activeClip.timeScale = -1;
        this.activeClip.play();
        this.playing = true;
      }else{
        this.activeClip = this.set[this.currentIndex];
        if(this.lastClip != undefined){
          this.lastClip.stop();
        }
        this.activeClip.stop();
        this.activeClip.timeScale = 1;
        this.activeClip.play();
        this.playing = true;
        this.currentIndex+=1;
        if(this.currentIndex>=this.max && this.sequence=='loop'){
          this.currentIndex = 0;
        }
      }
    }

  }
}

/**
 * This function creates heavymeta data object based on loaded gltf file.
 * @param {object} gltf loaded gltf object.
 * 
 * @returns {object} Heavymeta data class object.
 */
export class HVYM_Data {
  constructor(gltf, hvymScene=undefined, HVYM_nft_data=undefined) {
    this.is = 'EMPTY';
    const extensions = gltf.userData.gltfExtensions;
    if(extensions != undefined && extensions.hasOwnProperty( 'HVYM_nft_data' )){
      this.is = 'HVYM_DATA';
      this.nft_Data = extensions.HVYM_nft_data;
      if(HVYM_nft_data!=undefined){
        this.nft_Data = HVYM_nft_data;
      }
      this.mintable = false;
      this.scene = gltf.scene;
      this.contractProps = this.nft_Data.contract;
      this.collections = {};
      this.debugData = {};
      this.actionCtrls = {};
      this.actionMixers = [];
      if(hvymScene){
        this.hvymScene = hvymScene;
      }

      localStorage.setItem('HVYM_nft_data', JSON.stringify(this.nft_Data));
      this.SetUpDebugData();

      for (const [key, obj] of Object.entries(this.nft_Data)) {

        if(key=='project'){
          this.project = {...this.nft_Data[key]};
        }
        else if(key=='contract'){
          this.mintable = this.nft_Data.contract.mintable;
        }else if(key=='interactables'){
          this.interactables = {...this.nft_Data[key]};
        }else{
          this.collections[key] = this.hvymCollection(key, obj.collectionName, obj.propertyName);
          this.collections[key].models = this.getCollectionModelRefs(gltf.scene, obj.nodes);
          this.collections[key].menuData = {...this.nft_Data[key].menuData};
          this.collections[key].menuTransform = this.getCollectionMenuTransform(this.collections[key]);
          this.collections[key].materials = this.getGltfSceneMaterials(gltf.scene);
          this.collections[key].hasAnimation = false;
          this.hasAnimProps = this.nft_Data[key].hasOwnProperty('animProps');
          this.hasActionProps = this.nft_Data[key].hasOwnProperty('actionProps');

          if(this.hasAnimProps || this.hasActionProps){
            this.mixer = new THREE.AnimationMixer( this.scene );
            this.collections[key].hasAnimation = true;

            if(this.hasAnimProps){
              this.collections[key].animations = this.getAnimPropsAnimations(this.nft_Data[key].animProps, gltf);
            }

            if(this.hasActionProps){
              this.collections[key].animationSets = this.getActionPropsAnimationSets(this.nft_Data[key].actionProps, gltf);
            }
            
          }

          if(obj.hasOwnProperty('propLabelData')){
            this.collections[key].meshSetsLabel = obj.propLabelData.mesh_set_label;
            this.collections[key].materialSetsLabel = obj.propLabelData.mat_set_label;
            this.collections[key].morphSetsLabel = obj.propLabelData.morph_set_label;
            this.collections[key].materialPropsLabel = obj.propLabelData.mat_prop_label;
            this.collections[key].animPropsLabel = obj.propLabelData.anim_prop_label;
            this.collections[key].valuePropsLabel = obj.propLabelData.value_prop_label;
            this.collections[key].callPropsLabel = obj.propLabelData.call_prop_label;
            this.collections[key].meshPropsLabel = obj.propLabelData.mesh_prop_label;
          }

          this.HandleHVYMProps(key, obj);
          this.SetupInteraction(this.collections[key]);
        }

      }

      this.SetupActions();
    }
  }
  GetHVYMData(){
    return JSON.parse( localStorage.getItem('HVYM_nft_data') );
  }
  SetupActions(){
    if(this.hvymScene==undefined)
      return;

    for (const [colId, col] of Object.entries(this.collections)) {
      for (const [actionName, action] of Object.entries(col.actionProps)) {
        this.actionCtrls[actionName] = new HVYM_Action(action);
      }
    }

  }
  SetUpDebugData(){
    this.debugData['MINTER'] = this.hvymCollection('1', 'Debug', 'None');
    this.debugData['MINTER'].callPropsLabel = 'Built In Calls';
    this.debugData['MINTER'].callProps['getTokenIdsForUser'] = this.hvymCallPropRef('getTokenIdsForUser');
    this.debugData['MINTER'].callProps['getAllTokensForUser'] = this.hvymCallPropRef('getAllTokensForUser');
    this.debugData['MINTER'].callProps['getMetadata'] = this.hvymCallPropRef('getMetadata', 'INT');
    this.debugData['MINTER'].callProps['loadNFT'] = this.hvymCallPropRef('loadNFT', 'INT', 'LOCAL_CALL');
  }
  SetupInteraction(collection){
    if(this.interactables == undefined || this.hvymScene==undefined)
      return;

    for (const [modelName, model] of Object.entries(collection.models)) {

      let interactable = this.interactables[modelName];

      if(interactable){
        if(interactable.interaction_type == 'button'){
          this.SetupInteractableButton(this.hvymScene, model, interactable);
        }else if(interactable.interaction_type == 'slider'){
          this.SetupInteractableSlider(this.hvymScene, model, interactable);
        }else if(interactable.interaction_type == 'toggle'){
          this.SetupInteractableToggle(this.hvymScene, model, interactable);
        }else if(interactable.interaction_type == 'selector'){
          this.SetupInteractableSelector(this.hvymScene, model, interactable)
        }
      }
    }

  }
  SetupInteractableButton(scene, model, interactable){
    let btnProps = buttonPropsFromMesh(scene, model);
    let btn = ButtonElement(btnProps);
    btn.isInteractable = true;
    btn.box.userData.interactableBtn = true;
    btn.box.userData.interactable = interactable;
    btn.box.userData.interactableHandle = true;
    scene.interactables.push(btn.box);
    btn.box.position.copy(model.position);
    btn.DeleteText();
    btn.SetCustomGeometry(model.geometry);
    btn.ReplaceMaterial(model.material);
    model.visible = false;
    this.interactables[model.name] = this.hvymInteractableWidgetRef(interactable.interaction_type, model, btn);
    this.HandleInteractableCallProps(model, btn, interactable);
    btn.objectControlProps = this.interactables[model.name];
  }
  SetupInteractableSlider(scene, model, interactable){
    if(model.children.length==0)
      return;

    let def = interactable.float_default;
    let min = interactable.float_min;
    let max = interactable.float_max;
    let mesh = model.children[0];

    let valueProps = numberValueProperties( def, min, max, 3, 0.001, true, 'NONE');
    let sliderProps = sliderPropsFromMesh(scene, model, valueProps);
    let slider = new SliderWidget(sliderProps);
    slider.isInteractable = true;
    slider.handle.userData.interactable = interactable;
    scene.interactables.push(slider.box);

    this.SetupInteractableWidget(slider, model, mesh);
    this.interactables[model.name] = this.hvymInteractableWidgetRef(interactable.interaction_type, model, slider);
    this.HandleInteractableCallProps(model, slider, interactable);
    slider.objectControlProps = this.interactables[model.name];
    slider.handleCtrl.objectControlProps = this.interactables[model.name];
  }
  SetupInteractableToggle(scene, model, interactable){
    if(model.children.length==0)
      return;

    let toggleProps = togglePropsFromMesh(scene, model, false);
    let mesh = model.children[0];
    let toggle = new ToggleWidget(toggleProps);
    toggle.isInteractable = true;
    toggle.handle.userData.interactable = interactable;
    scene.interactables.push(toggle.handle);
    this.SetupInteractableWidget(toggle, model, mesh);
    this.interactables[model.name] = this.hvymInteractableWidgetRef(interactable.interaction_type, model, toggle);
    this.HandleInteractableCallProps(model, toggle, interactable);
    toggle.handleCtrl.objectControlProps = this.interactables[model.name];
  }
  SetupInteractableSelector(scene, model, interactable){
    if(model.children.length==0)
      return;

    let set = {};
    let selectorProps = listSelectorPropsFromMesh(scene, model);
    let selectors = this.hvymInteractableSet(interactable.interaction_type, set, 0);
    this.interactables[model.name] = selectors;

    let selector = new SelectorWidget(selectorProps);
    selector.objectControlProps = this.interactables[model.name];
    selector.DeleteWidgetText();
    this.HandleInteractableCallProps(model, selector, interactable);
    let self = this;
    interactable.mesh_set.forEach((el, index) =>{
      let ref = self.getGltfSceneModel(self.scene, el.name);
      set[el.name] = self.hvymInteractableSetRef(model.name, ref);
      set[el.name].widget = selector;
      set[el.name].call_props = self.interactables[model.name].call_props;
    });
    selector.isInteractable = true;
    selector.box.userData.interactable = interactable;
    selector.box.position.copy(model.position);
    selector.SetCustomGeometry(model.geometry);
    selector.ReplaceMaterial(model.material);
    selector.AssignSelectionSet(selectors);
    model.visible = false;
    selectors.widget = selector;
  }
  SetupInteractableWidget(widget, model, mesh){
    widget.DeleteWidgetText();
    widget.isInteractable = true;
    widget.handle.isInteractable = true;
    widget.box.userData.interactableBase = true;
    widget.box.position.copy(model.position);
    widget.SetCustomGeometry(model.geometry);
    widget.ReplaceMaterial(model.material);
    widget.handle.geometry.dispose();
    widget.handle.geometry = mesh.geometry;
    widget.handle.material.dispose();
    widget.handle.material = mesh.material;
    widget.handle.isInteractable = true;
    widget.handle.userData.interactableBtn = false;
    widget.handle.userData.interactableHandle = true;
    model.visible = false;
  }
  AssignInteractableCallbacks(client){
    for (const [modelName, el] of Object.entries(this.interactables)) {
      if(el.widget.is == 'BASE_TEXT_BOX'){
        el.widget.SetCustomClient(client);
        el.widget.AssignInteractableCallback(client);
      }else if(el.widget.is == 'SLIDER_WIDGET' || el.widget.is == 'TOGGLE_WIDGET'){
        el.widget.handleCtrl.SetCustomClient(client);
        el.widget.handleCtrl.AssignInteractableCallback(client);
      }else if(el.widget.is == 'SELECTOR_WIDGET'){
        el.widget.btns.forEach((btn, index) =>{
          btn.SetCustomClient(client);
          btn.AssignInteractableCallback(client, btn.textMesh);
        });
      }
    }
  }
  HandleInteractableCallProps(model, widget, interactable){
    let param = interactable.param_type;
    let call_props = this.hvymCallPropRef(interactable.call, param, 'INTERNET_COMPUTER_CUSTOM_CLIENT');
    if(param == 'STRING'){
      call_props.val_props.defaultValue = interactable.string_param
    }else if(param == 'INT'){
      call_props.val_props.defaultValue = interactable.int_param
    }
    if(widget.is == 'BASE_TEXT_BOX'){
      this.interactables[model.name].call_props = call_props;
    }else if(widget.is == 'SLIDER_WIDGET'){
      param = interactable.slider_param_type;
      this.interactables[model.name].call_props = call_props;
    }else if(widget.is == 'TOGGLE_WIDGET'){
      param = interactable.toggle_param_type;
      this.interactables[model.name].call_props = call_props;
    }else if(widget.is == 'SELECTOR_WIDGET'){
      param = interactable.toggle_param_type;
      this.interactables[model.name].call_props = call_props;
    }
  }
  HandleHVYMLocalMaterialStorage(propName, colId, propGrp, attribute, material, value){
    const data = JSON.parse( localStorage.getItem('HVYM_nft_data') );
    if(data[colId]==undefined)
      return;

    for (const [field, val] of Object.entries(data[colId][propGrp][propName].save_data)) {

      if(field.toLowerCase().includes('color')){
        data[colId][propGrp][propName].save_data[field] = '#'+material[field].getHexString();
      }else{
        data[colId][propGrp][propName].save_data[field] = material[field];
      }

    }
    
    localStorage.setItem('HVYM_nft_data', JSON.stringify(data));
    //console.log(JSON.parse( localStorage.getItem('HVYM_nft_data') ));
  }
  HandleHVYMLocalStorage(propName, colId, propGrp, attribute, value, setElemName=undefined){
    const data = JSON.parse( localStorage.getItem('HVYM_nft_data') );
    if(data[colId]==undefined)
      return;

    if(setElemName==undefined){
      data[colId][propGrp][propName][attribute] = value;
      localStorage.setItem('HVYM_nft_data', JSON.stringify(data));
    }else{
      let idx = 0;
      if(attribute=='morph'){
        attribute = 'default';
      }
      let propSet = data[colId][propGrp][propName]['set'];
      propSet.forEach((el, index) =>{
          if(el.name == setElemName){
            idx = index;
          }
      });
      data[colId][propGrp][propName].set[idx][attribute] = value;
      localStorage.setItem('HVYM_nft_data', JSON.stringify(data))
    }

    //console.log(JSON.parse( localStorage.getItem('HVYM_nft_data') ));
  }
  HandleHVYMProps(colID, data){
    for (const [key, obj] of Object.entries(data)) {
      switch (key) {
        case 'valProps':
          this.HandleValueProps(colID, obj);
          break;
        case 'callProps':
          this.HandleCallProps(colID, obj);
          break;
        case 'materialSets':
          this.HandleMaterialSets(colID, obj);
          break;
        case 'meshSets':
          this.HandleMeshSets(colID, obj);
          break;
        case 'meshProps':
          this.HandleMeshProps(colID, obj);
          break;
        case 'matProps':
          this.HandleMaterialProps(colID, obj);
          break;
        case 'morphSets':
          this.HandleMorphSetProps(colID, obj);
          break;
        case 'animProps':
          this.HandleAnimProps(colID, obj);
          break;
        case 'actionProps':
          this.HandleActionProps(colID, obj);
          break;
        default:
          console.log('X');
      }
    }
  }
  HandleValueProps(colID, valProps){
    for (const [valPropName, valProp] of Object.entries(valProps)) {
      let name = valPropName;
      let default_val = valProp.default;
      let min = valProp.min;
      let max = valProp.max;
      let amount = 0.001;
      if(!valProp.prop_immutable && valProp.prop_action_type != 'Static'){
        amount = valProp.amount;
      }
      let action_type = valProp.prop_action_type;
      let slider_type = valProp.prop_slider_type;
      let widget_type = valProp.widget_type;
      let show = valProp.show;
      let immutable = valProp.immutable;
      this.collections[colID].valProps[valPropName] = this.hvymValPropRef(name, default_val, min, max, amount, action_type, slider_type, widget_type, show, immutable);
    }
  }
  HandleCallProps(colID, callProps){
    for (const [callPropName, callProp] of Object.entries(callProps)) {
      let name = callPropName;
      let call_param = callProp.call_param;

      this.collections[colID].callProps[callPropName] = this.hvymCallPropRef(name, call_param);
    }
  }
  HandleMatRefSaveData(material, save_data){
    for (const [key, val] of Object.entries(save_data)) {
      let v = val;
      if(material.hasOwnProperty(key) && !val){
        v = material[key];
        save_data[key] = v;
      }
      if(material.hasOwnProperty(key)){
        if(key.toLowerCase().includes('color')){
          let c = colorsea(save_data[key], 1).rgba();
          material[key].set(c[0], c[1], c[2]);
        }else{
          material[key] = v;
        }
      }
    }

    return save_data
  }
  HandleMaterialProps(colID, matProps){
    for (const [matPropName, matProp] of Object.entries(matProps)) {
      let mat_ref = this.collections[colID].materials[matProp.name];
      let mat_name = matProp.name;
      let emissive = matProp.emissive;
      let irridescent = matProp.irridescent;
      let sheen = matProp.sheen;
      let widget_type = matProp.widget_type;
      let save_data = matProp.save_data;
      let show = matProp.show;

      save_data = this.HandleMatRefSaveData(mat_ref, save_data);

      this.collections[colID].matProps[matPropName] = this.hvymMatProps(colID, save_data, mat_name, emissive, irridescent, sheen, mat_ref, widget_type, show);
    }
  }
  HandleMorphSetProps(colID, morphSets){
    for (const [morphSetName, morphSet] of Object.entries(morphSets)) {
      let mesh_ref = this.collections[colID].models[morphSet.model_ref.name];
      let morph_set = {};

      morphSet.set.forEach((m_prop, index) =>{
        morph_set[m_prop.name] = this.hvymMorphSetRef(m_prop.name, morphSetName, colID, mesh_ref, m_prop.default, m_prop.min, m_prop.max);
      });

      this.collections[colID].morphSets[morphSetName] = this.hvymMorphSet(colID, morph_set, mesh_ref, morphSet.widget_type, morphSet.show);
    }
  }
  HandleMeshProps(colID, meshProps){
    for (const [meshPropName, meshProp] of Object.entries(meshProps)) {
      let mesh = this.collections[colID].models[meshProp.name];
      mesh.visible = meshProp.visible;
      this.collections[colID].meshProps[meshPropName] = this.hvymMeshPropRef(meshProp.name, meshProp.visible, mesh, meshProp.widget_type, meshProp.show);
    }
  }
  HandleAnimProps(colID, animProps){
    for (const [animPropName, animProp] of Object.entries(animProps)) {
      if(!this.collections[colID].hasAnimation || !this.collections[colID].animations.hasOwnProperty(animProp.name))
        return

      let anim = this.collections[colID].animations[animProp.name];
      anim.weight = animProp.weight;
      this.collections[colID].animProps[animPropName] = this.hvymAnimProp(colID, animProp.play, animProp.name, animProp.start, animProp.end, animProp.loop, animProp.blending, anim, animProp.widget_type, animProp.show);
      if(animProp.widget_type == 'slider'){
        let val_props = numberValueProperties(animProp.weight, 0, 1, 3, 0.001, true);
        this.collections[colID].animProps[animPropName].val_props = animRefProperties(animProp.start, animProp.end, animProp.loop, anim, val_props, 'weight', false, true, this);;
        anim.play();
      }
    }
  }
  HandleActionProps(colID, actionProps){
    for (const [actionPropName, actionProp] of Object.entries(actionProps)) {
      if(!this.collections[colID].hasAnimation || !this.collections[colID].animationSets.hasOwnProperty(actionPropName))
        return

      let animSet = this.collections[colID].animationSets[actionPropName].set;
      let mixer = this.collections[colID].animationSets[actionPropName].mixer;
      this.actionMixers.push(mixer);
      if(actionProp.anim_type == 'action'){
        this.collections[colID].actionProps[actionPropName] = this.hvymActionProp(colID, actionPropName, this.hvymScene, actionProp.sequence, actionProp.anim_type, animSet, actionProp.interaction);
        this.collections[colID].actionProps[actionPropName].mixer = mixer;
      }else if(actionProp.anim_type == 'mesh_action'){
        if(this.collections[colID].models.hasOwnProperty(actionProp.model_ref.name)){
          let meshRef = this.collections[colID].models[actionProp.model_ref.name];
          this.collections[colID].actionProps[actionPropName] = this.hvymMeshActionProp(colID, actionPropName, this.hvymScene, actionProp.sequence, actionProp.anim_type, animSet, meshRef, actionProp.interaction);
          this.collections[colID].actionProps[actionPropName].mixer = mixer;
        }
      }  
    }
  }
  HandleMaterialSets(colID, materialSet){
    for (const [k, v] of Object.entries(materialSet)) {
        
        let mesh_set = this.collections[colID].meshSets[v.mesh_set];
        let sel_idx = v.selected_index;
        let mat_id = v.material_id;
        let widget_type = v.widget_type;
        let show = v.show;
        if(mesh_set == undefined)
          return;

        let mat_set = {};

        v.set.forEach((m_ref, index) =>{
          let mat = this.collections[colID].materials[m_ref.name];
          let m_name = mat.name;
          mat_set[m_name] = this.hvymMaterialSetRef(k, colID, mat);
        });

        this.collections[colID].materialSets[k] = this.hvymMaterialSet(colID, sel_idx, mat_id, mat_set, mesh_set, widget_type, show);

        //assign material ref to material userData
        for (const [matName, mat_set_ref] of Object.entries(mat_set)) {
          mat_set_ref.mat_ref.userData.mat_set = this.collections[colID].materialSets[k];
        }

    }
  }
  HandleMeshSets(colID, meshSets){
    for (const [k, v] of Object.entries(meshSets)) {
      let set = {};
      v.set.forEach((m_ref, index) =>{
        let mesh_ref = this.collections[colID].models[m_ref.name]
        let ref = this.hvymMeshSetRef(k, colID, mesh_ref, m_ref.visible);
        set[m_ref.name] = ref
      });

      this.collections[colID].meshSets[k] = this.hvymMeshSet(colID, v.selected_index, set, v.widget_type, v.show);
    }
  }
  CollectionHasProperty(key, prop){

    if(!this.collections.hasOwnProperty(key))
      return false;

    if(!this.collections[key].hasOwnProperty(prop))
      return false;

    return true

  }
  SetAnimWeight(clip, weight){
    clip.weight = weight;
  }
  ToggleAnimation(clip, on){
    if(on){
      clip.play();
    }else{
      clip.stop();
    }
  }
  SetMeshVis(mesh, visible){
    if(mesh.isGroup){
      mesh.children.forEach((c, idx) => {
        c.visible = visible;
      });
    }else{
      mesh.visible = visible;
    }
  }
  SetMeshRefVis(ref, visible){
    this.SetMeshVis(ref.mesh_ref, visible)
  }
  SetMeshMorph(mesh, name, value){
    if(!mesh.hasOwnProperty('morphTargetDictionary') || !mesh.morphTargetDictionary.hasOwnProperty(name))
      return;

    let idx = mesh.morphTargetDictionary[name];
    mesh.morphTargetInfluences[idx] = value;
  }
  UpdateMorph(object_ctrl_props, value){
    if(object_ctrl_props.isGroup){
      object_ctrl_props.ref.children.forEach((m, idx) => {
        this.SetMeshMorph(m, object_ctrl_props.targetMorph, value);
      });
    }else{
      this.SetMeshMorph(m, object_ctrl_props.targetMorph, value);
    }
  }
  UpdateMatSet(mat_set_ref){
    const material = mat_set_ref.mat_ref;
    const mat_set = material.userData.mat_set;
    const mat_id = mat_set.material_id;
    for (const [meshName, mesh] of Object.entries(mat_set.mesh_set.set)) {

      if(mesh.mesh_ref.isGroup){
        mesh.mesh_ref.children[mat_id].material = material;
      }else{
        mesh.mesh_ref.material = material;
      }

    }
  }
  UpdateMeshSet(collection_id, set_name, mesh_name){
    if(!this.CollectionHasProperty(collection_id, 'meshSets'))
      return;

    for (const [k, ref] of Object.entries(this.collections[collection_id].meshSets[set_name].set)) {
      if(k!=mesh_name){
        ref.visible == false;
        this.SetMeshRefVis(ref, false);
      }else{
        ref.visible == true;
        this.SetMeshRefVis(ref, true);
      }
    }
  }
  hvymDataWidgetMap(){
    return {
      'valProps': 'meter',
      'materialSets': 'selector',
      'meshSets': 'selector'
    }
  }
  hvymDataLabelMap(){
    return {
      'valProps': 'valuePropsLabel',
      'callProps': 'callPropsLabel',
      'materialSets': 'materialSetsLabel',
      'meshSets': 'meshSetsLabel',
      'meshProps': 'meshPropsLabel',
      'morphSets': 'morphSetsLabel',
      'animProps': 'animPropsLabel'
    }
  }
  hvymAnimLoopMap(){
    return{
      'NONE': THREE.LoopOnce,
      'LoopOnce': THREE.LoopOnce,
      'LoopForever': THREE.LoopRepeat,
      'PingPong': THREE.LoopPingPong,
      'Clamp': THREE.LoopOnce,
      'ClampToggle': THREE.LoopOnce,
      'Seek': THREE.LoopOnce
    }
  }
  createHVYMMinterDebugData(collection){
    let mainData = {};
    const collectionKeys = ['valProps', 'callProps'];
    const widgetMap = this.hvymDataWidgetMap();
    const labelMap = this.hvymDataLabelMap();

    collectionKeys.forEach((key, idx) => {
      let label = collection[labelMap[key]];
      if(Object.keys(collection[key]).length==0)
        return;

      let widgetData = {};
      for (const [name, obj] of Object.entries(collection[key])) {
        if(obj.widget_type == 'none')
          return;

        if(key == 'valProps' && obj.immutable)
          return;

        let widget = widgetMap[key];
        if(obj.type.includes('HVYM')){
          widget = 'debug_button';
        }

        let section = panelSectionProperties(name, widget, obj);

        if(section.data.action_type != 'Static' && !section.data.prop_immutable){

          if(section.data.action_type == 'Incremental'){
            section.data.val_props.polarity = 'POSITIVE';
          }else if(section.data.action_type =='Decremental'){
            section.data.val_props.polarity = 'NEGATIVE';
          }else if(section.data.action_type =='Bicremental'){
            section.data.val_props.polarity = 'BIDIRECTIONAL';
          }

          widgetData[section.name] = section;
        }
      }

      if(Object.keys(widgetData).length > 0){
        mainData[label] = panelSectionProperties(label, 'controls', widgetData);
      }
    });

    return panelSectionProperties('sections', 'container', mainData);
  }
  createDebugPanel(scene, parent, textProps, collection, id, panelArray){
    let boxProps = defaultPanelWidgetBoxProps('panel-box', parent);
    let topSectionData = this.createHVYMMinterDebugData(collection);
    let colPanel = panelProperties( scene, boxProps, collection.name, textProps, 'RIGHT', topSectionData);
    if(Object.keys(colPanel.sections.data).length > 0){
      colPanel.collectionId = id;
      colPanel.hvymCtrl = this;
      panelArray.push(colPanel);
    }

    return panelArray
  }
  debugPanelHVYMCollectionPropertyList(scene, parent, textProps){
    let panelBoxProps = defaultPanelWidgetBoxProps('panel-box', parent);
    let colPanels = [];

    colPanels = this.createDebugPanel(scene, parent, textProps, this.debugData['MINTER'], 'NONE', colPanels);

    for (const [colId, collection] of Object.entries(this.collections)) {
      colPanels = this.createDebugPanel(scene, parent, textProps, collection, colId, colPanels);
    }

    return colPanels
  }
  createHVYMCollectionWidgetData(collection){
    let mainData = {};
    const collectionKeys = ['valProps', 'materialSets', 'meshSets', 'meshProps', 'matProps', 'morphSets', 'animProps'];
    const widgetMap = this.hvymDataWidgetMap();
    const labelMap = this.hvymDataLabelMap();

    collectionKeys.forEach((key, idx) => { 
      let label = collection[labelMap[key]];
      if(Object.keys(collection[key]).length==0)
        return;
      let widgetData = {};
      if(key=='matProps'){
          let matProps = collection[key];
          for (const [name, obj] of Object.entries(matProps)) {
            if(obj.widget_type == 'none')
            return;

            let data = panelMaterialSectionPropertySet(name, obj.mat_ref, obj.emissive, obj.reflective, obj.iridescent, obj.sheen);
            mainData[data.name] = data;
          }
      }else if(key=='morphSets'){
        let morphSets = collection[key];
        let widgetData = {};

        for (const [name, obj] of Object.entries(morphSets)) {
          if(obj.widget_type == 'none')
            return;
          for (const [morphName, morphObj] of Object.entries(obj.set)) {
            let data = panelSectionProperties(morphName, 'slider', morphObj);
            widgetData[data.name] = data;
          }

          mainData[name] = panelSectionProperties(name, 'controls', widgetData);
        }

      }else{

        for (const [name, obj] of Object.entries(collection[key])) {
          if(obj.widget_type == 'none')
            return;

          let widget = widgetMap[key];
          if(obj.type.includes('HVYM')){
            widget = obj.widget_type;
          }

          let data = panelSectionProperties(name, widget, obj);
          widgetData[data.name] = data;
        }

        mainData[label] = panelSectionProperties(label, 'controls', widgetData);
      }
        
    });

    return panelSectionProperties('sections', 'container', mainData);
  }
  basicPanelHVYMCollectionPropertyList(scene, parent, textProps){
    let panelBoxProps = defaultPanelWidgetBoxProps('panel-box', parent);
    let colPanels = [];

    for (const [colId, collection] of Object.entries(this.collections)) {

      if(collection.menuTransform==undefined){
        let topSectionData = this.createHVYMCollectionWidgetData(collection);
        let colPanel = panelProperties( scene, panelBoxProps, collection.name, textProps, 'LEFT', topSectionData);
        colPanel.collectionId = colId;
        colPanel.hvymCtrl = this;
        colPanels.push(colPanel);
      }
    }

    return colPanels
  }
  uniquePanelHVYMCollectionPropertyList(scene, parent, textProps){
    let colPanels = {};

    for (const [colId, collection] of Object.entries(this.collections)) {

      if(collection.menuTransform!=undefined){
        let panelBoxProps = defaultPanelWidgetBoxProps('panel-box-'+collection.name, collection.menuTransform);
        let boxMatProps = {...panelBoxProps.matProps}
        let textMatProps = {...textProps.matProps}
        let tProps = {...textProps};
        boxMatProps.color = collection.menuData.primary_color;
        textMatProps.color = collection.menuData.text_color;
        panelBoxProps.matProps = boxMatProps;
        tProps.matProps = textMatProps;
        let topSectionData = this.createHVYMCollectionWidgetData(collection);
        let colPanel = panelProperties( scene, panelBoxProps, collection.name, tProps, collection.menuData.alignment, topSectionData);
        colPanel.topPanel = undefined;
        colPanel.topCtrl = undefined;
        colPanel.unique = true;
        colPanel.collectionId = colId;
        colPanel.hvymCtrl = this;
        colPanels[collection.menuTransform.name] = colPanel;
      }
    }

    return colPanels
  }
  hvymCollection(id, name, propertyName){
    return {
      'type': 'HVYM_COLLECTION',
      'id': id,
      'name': name,
      'propertyName': propertyName,
      'valProps': {},
      'callProps': {},
      'morphSets': {},
      'animProps': {},
      'actionProps': {},
      'matProps': {},
      'meshSets': {},
      'meshProps': {},
      'materialSets': {},
      'models': {},
      'materials': {},
      'menuTransform': undefined,
      'menuData': undefined
    }
  }
  hvymMeshSet(collection_id, selected_index, set, widget_type, show){
    return {
      'type': 'HVYM_MESH_SET',
      'collection_id': collection_id,
      'selected_index': selected_index,
      'set': set,
      'widget_type': widget_type,
      'show': show
    }
  }
  hvymMeshSetRef(set_name, collection_id, mesh_ref, visible){
    return {
      'type': 'HVYM_MESH_SET_REF',
      'set_name': set_name,
      'collection_id': collection_id,
      'mesh_ref': mesh_ref,
      'visible': visible,
      'ctrl': this
    }
  }
  hvymMaterialSet(collection_id, selected_index, material_id, set, mesh_set, widget_type, show){
    return {
      'type': 'HVYM_MAT_SET',
      'collection_id': collection_id,
      'selected_index': selected_index,
      'material_id': material_id,
      'set': set,
      'mesh_set': mesh_set,
      'widget_type': widget_type,
      'show': show
    }
  }
  hvymMaterialSetRef(set_name, collection_id, mat_ref){
    return {
      'type': 'HVYM_MAT_SET_REF',
      'set_name': set_name,
      'collection_id': collection_id,
      'mat_ref': mat_ref,
      'ctrl': this
    }
  }
  hvymMorphSet(collection_id, set, mesh_ref, widget_type, show){
    return {
      'type': 'HVYM_MORPH_SET',
      'collection_id': collection_id,
      'set': set,
      'mesh_ref': mesh_ref,
      'widget_type': widget_type,
      'show': show
    }
  }
  hvymMorphSetRef(morph_name, set_name, collection_id, mesh_ref, default_val, min, max){
    return {
      'type': 'HVYM_MORPH_SET_REF',
      'morph_name': morph_name,
      'set_name': set_name,
      'collection_id': collection_id,
      'val_props': numberValueProperties(default_val, min, max, 3, 0.001, true),
      'mesh_ref': mesh_ref,
      'ctrl': this
    }
  }
  hvymInteractableSet(interaction_type, set, selected_index){
    return {
      'type': 'HVYM_INTERACTABLE_SET',
      'collection_id': 'interactable',
      'interaction_type': interaction_type,
      'set': set,
      'selected_index': selected_index,
      'widget_type': 'selector',
      'show': true
    }
  }
  hvymInteractableSetRef(set_name, mesh_ref){
    return {
      'type': 'HVYM_INTERACTABLE_SET_REF',
      'collection_id': 'interactable',
      'set_name': set_name,
      'mesh_ref': mesh_ref,
      'widget': undefined,
      'call_props': undefined,
      'ctrl': this
    }
  }
  hvymInteractableWidgetRef(interaction_type, mesh_ref, widget){
    return {
      'type': 'HVYM_INTERACTABLE_WIDGET_REF',
      'collection_id': 'interactable',
      'interaction_type': interaction_type,
      'mesh_ref': mesh_ref,
      'widget': widget,
      'call_props': undefined,
      'ctrl': this
    }
  }
  hvymMatProps(collection_id, save_data, mat_name, emissive, irridescent, sheen, mat_ref, widget_type, widget){
    return {
      'type': 'HVYM_MAT_PROPS',
      'collection_id': collection_id,
      'save_data': save_data,
      'mat_name': mat_name,
      'emissive': emissive,
      'irridescent': irridescent,
      'sheen': sheen,
      'mat_ref': mat_ref,
      'widget_type': widget_type,
      'widget': widget,
      'ctrl': this
    }
  }
  hvymAnimProp(collection_id, play, name, start, end, loop, blend, anim_ref, widget_type, show){
    return {
      'type': 'HVYM_ANIM_PROP',
      'collection_id': collection_id,
      'play': play,
      'name': name,
      'val_props': animRefProperties(start, end, loop, anim_ref, stringValueProperties(), 'play', false, true, this),
      'blend': blend,
      'widget_type': widget_type,
      'show': show,
      'mixer': undefined,
      'ctrl': this
    }
  }
  hvymActionProp(collection_id, name, hvymScene, sequence, anim_type, set, interaction){
    return {
      'type': 'HVYM_ACTION_PROP',
      'collection_id': collection_id,
      'name': name,
      'hvymScene': hvymScene,
      'sequence': sequence,
      'anim_type': anim_type,
      'set': set,
      'interaction': interaction,
      'mixer': undefined,
      'ctrl': this
    }
  }
  hvymMeshActionProp(collection_id, name, hvymScene, sequence, anim_type, set, mesh_ref, interaction){
    return {
      'type': 'HVYM_ACTION_PROP',
      'collection_id': collection_id,
      'name': name,
      'hvymScene': hvymScene,
      'sequence': sequence,
      'anim_type': anim_type,
      'set': set,
      'mesh_ref': mesh_ref,
      'interaction': interaction,
      'mixer': undefined,
      'ctrl': this
    }
  }
  hvymValPropRef(name, default_val, min, max, amount, action_type, slider_type, widget_type, show, immutable=true){
    let editable = true;
    if(action_type == 'Static'){
      editable = false;
    }
    return {
      'type': 'HVYM_VAL_PROP_REF',
      'name': name,
      'val_props': numberValueProperties(default_val, min, max, 0, amount, editable),
      'action_type': action_type,
      'slider_type': slider_type,
      'widget_type': widget_type,
      'show': show,
      'immutable': immutable,
      'ctrl': this
    }
  }
  hvymCallPropRef(name, param_type, call_target='MINTER_CLIENT'){
    let val_props = nullValueProperties();
    if(param_type == 'INT'){
      val_props = numberValueProperties(0, -1, -1, 0, 0.001, true, 'CALL');
    }else if(param_type == 'STRING'){
      val_props = stringValueProperties('?', '?', '?', true);
    }

    return {
      'type': 'HVYM_CALL_PROP_REF',
      'name': name,
      'val_props': val_props,
      'action_type': 'method_call',
      'call_target': call_target,
      'ctrl': this
    }
  }
  hvymMeshPropRef(name, visible, mesh, widget_type, widget){
    return {
      'type': 'HVYM_MESH_PROP_REF',
      'name': name,
      'visible': visible,
      'val_props': meshRefProperties(mesh.isGroup, mesh, stringValueProperties(), 'visible', false, undefined, true, this),
      'widget_type': widget_type,
      'widget': widget,
      'ctrl': this
    }
  }
  getGltfSceneModel(scene, name){
    let result = undefined;

    scene.traverse( function( child ) {
      if(child.name == name && child.isObject3D){
        result = child;
      } 
    });

    return result
  }
  getGltfSceneMaterials(scene){
    let result = {};

    scene.traverse( function( child ) {
      if(child.isObject3D && child.hasOwnProperty('material')){
        result[child.material.name] = child.material;
        child.material.userData.hvymCtrl = this;
      } 
    });

    return result
  }
  getAnimPropsAnimations(animProps, gltf){
    let result = {};
    if(!gltf.hasOwnProperty('animations'))
      return
    const loopMap = this.hvymAnimLoopMap();

    for (const [animPropName, animProp] of Object.entries(animProps)) {
      gltf.animations.forEach((anim, index) =>{
        if(anim.name==animPropName){
          let clip = this.mixer.clipAction( anim )
          if(animProp.blend=='ADD'){
            THREE.AnimationUtils.makeClipAdditive( clip.getClip() );
          }
          clip.setLoop(loopMap[animProp.loop]);
          if(animProp.loop == 'Clamp' || animProp.loop == 'ClampToggle'){
            clip.clampWhenFinished = true;
          }
          result[animPropName] = clip;
        }
      });
    }

    return result
  }
  getActionPropsAnimationSets(actionProps, gltf){
    let result = {};

    for (const [actionPropName, actionProp] of Object.entries(actionProps)) {
      let set = [];
      let mixer = new THREE.AnimationMixer( this.scene );
      actionProp.set.forEach((name, j) => {

        gltf.animations.forEach((anim, i) => {
          if(anim.name==name){
            let clip = mixer.clipAction( anim );
            clip.setLoop(THREE.LoopOnce);
            clip.clampWhenFinished = true;
            if(actionProp.additive){
              THREE.AnimationUtils.makeClipAdditive( clip.getClip() );
            }
            clip.paused = true;
            set.push(clip);
          }
        });
        
      });

      result[actionPropName] = { 'set': set, 'mixer': mixer };

    }

    return result
  }
  getCollectionModelRefs(scene, nodes){
    let result = {};
    nodes.forEach((node, index) =>{
      let ref = this.getGltfSceneModel(scene, node.name);
      let k = node.name;
      if(ref!=undefined){
        result[k] = ref;
        ref.userData.hvymCtrl = this;
      }
    });

    return result
  }
  getCollectionMenuTransform(collection){
    let result = undefined;
    const menuName = 'menu_'+collection.id;
    if(collection.models.hasOwnProperty(menuName)){
      result = collection.models[menuName];
      result.userData.alignment = collection.menuData.alignment
      result.userData.primary_color = collection.menuData.primary_color;
      result.userData.secondary_color = collection.menuData.secondary_color;
      result.userData.text_color = collection.menuData.text_color;
    }
    
    return result
  }
};

/**
 * This function creates a default config, used to assign any default callbacks.
 * @param {method} the method to be attached to the minter button.
 * To customize callbacks, additional keys that map to unique mesh names
 * with their corresponding callbacks can be added to the dictionary.
 * The gltf model is traversed, any mesh that has a name matching a key
 * in the dictionary is assigned the corresponding callback.
 * 
 * @returns {object} Data object for gltf button callbacks.
 */
export function gltfButtonCallbackConfig( mintCallback ){
  return {
    'type': 'GLTF_BUTTON_CALLBACK_CONFIG',
    'mint': mintCallback
  }
};

/**
 * This function creates a value property set used for panel section creation.
 * @param {string} path string url for loading the model file.
 * @param {bool} useLabel if true, label is shown based on model name.
 * @param {object} widgetValueProp value property used for widget creation.
 * 
 * @returns {object} Data object for model value properties.
 */
export function modelValueProperties(path=0, useLabel=true, widgetValueProp=undefined){
  return {
    'type': 'MODEL_VALUE_PROPS',
    'path': path,
    'useLabel': useLabel,
    'widgetValueProp': widgetValueProp
  }
};

/**
 * This function creates a property set for loading gltf model widgets.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {string} name for the element.
 * @param {object} gltf a url to the model, or the loaded model Object3D
 * @param {object} [listConfig=undefined] (listItemConfig) if a list config is used, model will be attached to a list element.
 * @param {number} [zoffset=0] Amount to offset model in z.
 * @param {number} [childInset=0.9] Amount content is inset.
 * @param {number} [index=0] Index of the list element.
 * 
 * @returns {object} Data object for gltf model elements.
 */
export function gltfProperties( scene, boxProps, name='', gltf, listConfig=undefined, zOffset=0, btnCallbacks=undefined){
  return {
    'type': 'GLTF',
    'scene': scene,
    'boxProps': boxProps,
    'name': name,
    'gltf': gltf,
    'listConfig': listConfig,
    'zOffset': zOffset,
    'btnCallbacks': btnCallbacks,
    'hvymData': undefined
  }
};

/**
 * This function creates a default property set for loading gltf model widgets.
 * @param {string} name for the element.
 * @param {object} parent Object3D that the model widget should be parented to.
 * @param {string} font path to the font json file.
 * @param {string} modelPath path to the model file.
 * 
 * @returns {object} Data object for gltf model elements.
 */
export function defaultPanelGltfModelProps(scene, name, parent, font, modelPath){
  const boxProps = defaultPanelGltfModelBoxProps(name, parent);
  boxProps.isPortal = true;
  boxProps.matProps.useCase = 'STENCIL';
  const textProps = defaultWidgetTextProperties(font);
  return gltfProperties(scene, boxProps, name, modelPath)
}

/**
 * This function creates a gltf model widget based on passed property set.
 * @param {object} gltfProps (gltfProperties) Properties used for model widget.
 * 
 * @returns {null} no return value.
 */
export class GLTFModelWidget extends BaseWidget {
  constructor(gltfProps) {
    let textProps = {...DEFAULT_TEXT_PROPS};
    let widgetProps = widgetProperties(gltfProps.scene, gltfProps.boxProps, gltfProps.name, true, true, textProps, false, undefined, gltfProps.listConfig, 0);
    super(widgetProps);
    this.is = 'GLTF_MODEL_WIDGET';
    this.scene = gltfProps.scene;
    this.hvymScene = gltfProps.scene;
    this.hvymData = gltfProps.hvymData;
    this.buttonCallbacks = gltfProps.btnCallbacks;
    this.buttonCallbacksAssigned = false;
    this.box.properties = gltfProps;
    const boxSize = getGeometrySize(this.box.geometry);
    const parentSize = getGeometrySize(gltfProps.boxProps.parent.geometry);

    this.gltf = gltfProps.gltf;
    this.sceneBox = new THREE.Box3().setFromObject( this.gltf.scene );
    this.sceneSize = this.sceneBox.getSize(new THREE.Vector3());
    this.hvymPanels = [];

    let axis = 'y';
    let prop = 'height';
    if(this.sceneSize.x > this.sceneSize.y){
      axis = 'x';
      prop = 'width';
    }

    this.ratio = boxSize[prop]/this.sceneSize[axis];

    if(boxSize[prop]>this.sceneSize[axis]){
      this.ratio = this.sceneSize[axis]/boxSize[prop];
    }
    if(this.isPortal){
      let stencilRef = this.box.material.stencilRef;
      this.MakeModelPortalChild(stencilRef);
      this.gltf.scene.scale.set(this.gltf.scene.scale.x*this.ratio, this.gltf.scene.scale.y*this.ratio, this.gltf.scene.scale.z*this.ratio);
      this.gltf.scene.position.set(this.gltf.scene.position.x, this.gltf.scene.position.y, this.gltf.scene.position.z-this.depth-(this.sceneSize.z*this.ratio));
      this.gltf.scene.renderOrder = 2;

    }else{
      this.box.material.opacity = 0;
      this.box.material.transparent = true;
      this.gltf.scene.scale.set(this.gltf.scene.scale.x*this.ratio, this.gltf.scene.scale.y*this.ratio, this.gltf.scene.scale.z*this.ratio);
      this.gltf.scene.position.set(this.gltf.scene.position.x, this.gltf.scene.position.y, this.gltf.scene.position.z+this.depth+(this.sceneSize.z/2*this.ratio));
    }
    
    this.box.add( this.gltf.scene );
    this.HandleListConfig(gltfProps.listConfig);

    if(this.hvymData != undefined && this.hvymData.is == 'HVYM_DATA'){
      let panelTextProps = defaultWidgetTextProperties(DEFAULT_FONT);

      const basicPanelPropList = this.hvymData.basicPanelHVYMCollectionPropertyList(this.scene, this.box, panelTextProps, this.isPortal);
      this.CreateBasicHVYMPanel(basicPanelPropList);
      const uniquePanelPropList = this.hvymData.uniquePanelHVYMCollectionPropertyList(this.scene, this.box, panelTextProps, this.isPortal);
      this.CreateUniqueHVYMPanel(uniquePanelPropList);
      this.isHVYM = true;

      if(this.hvymData.mintable && this.hvymData.project.type == 'minter'){
        this.AddMinterButton(); 
      }
    }
  }
  UnlockMinterAnimation(){
    this.hvymScene.anims.minterUnlockAnimation(this.minterLock, this.minterLockLoop, this.minterButton, 2.0);
  }
  AddMinterLock(pos){
    this.minterLock = new THREE.Group();
    this.minterLockLoop = MINTER_LOCK_LOOP_MESH.clone();
    this.minterLockBase = MINTER_LOCK_BASE_MESH.clone();
    this.minterLock.add(this.minterLockLoop);
    this.minterLock.add(this.minterLockBase);
    this.box.add(this.minterLock);
    this.minterLock.position.copy(pos);
  }
  AddMinterButton(){
    const boxMatProps = phongMatProperties(PRIMARY_COLOR_A);
    this.minterButton = customGeometryButton('mint', this.scene, this.box, MINTER_BTN_MESH, boxMatProps, DEFAULT_TEXT_PROPS);
    this.minterButton.DeleteText();
    this.minterButton.ReplaceMaterial(MINTER_BTN_SHADER);
    
    let sceneBox = new THREE.Box3().setFromObject( this.gltf.scene );
    let sceneSize = this.sceneBox.getSize(new THREE.Vector3());
    const pos = new THREE.Vector3((this.sceneSize.x/3)*this.gltf.scene.scale.x, -(this.sceneSize.y/3)*this.gltf.scene.scale.y, this.sceneSize.z/2);
    this.minterButton.box.position.copy(pos);
    this.minterButton.box.userData.targetElem = this;
    this.minterButton.box.scale.set(0,0,0);
    this.minterButton.box.visible = false;
    this.AddMinterLock(pos);
  }
  AssignButtonCallbacks(){
    if (this.buttonCallbacks != undefined){
      const self = this;
      for (const [btnName, callback] of Object.entries(this.buttonCallbacks)) {
        this.gltf.scene.traverse( function( child ) {
          if(child.isObject3D && child.name == btnName){
            this.buttonCallbacksAssigned = true;
            child.addEventListener('action', function(event) {
              if(!self.hvymScene.isLoading){
                callback();
              }
            });
          } 
        });
      }
      this.minterButton.box.addEventListener('action', function(event) {
        this.buttonCallbacksAssigned = true;
        if(!self.hvymScene.isLoading){
          self.MintModel();
        }
      });
    }
  }
  async MintModel(){
    const data = this.hvymData.GetHVYMData();
    const desc = data.contract.minterDesc;
    const encodedJson = new TextEncoder().encode(JSON.stringify(data));
    const metaDataDesc = this.minterClient.FormatMetadataDesc(desc, "3D NFT", encodedJson);
    const img = this.hvymScene.renderImage();
    let receipt = await this.minterClient.mint(img, metaDataDesc);

    console.log(receipt)
  }
  UpdateAnimation(delta){
    if(this.hvymData != undefined && this.hvymData.mixer != undefined){
      this.hvymData.mixer.update(delta);
      this.hvymData.actionMixers.forEach((mixer, index) =>{
        mixer.update(delta);
      });
    }
  }
  CreateBasicHVYMPanel(panelPropList){
    panelPropList.forEach((panelProps, index) =>{
      let panel = undefined;
      if(index == 0){
        panel = new BasePanel(panelProps);
      }else{
        let lastPanel = this.hvymPanels[index-1];
        panelPropList[index].boxProps.parent = lastPanel.bottom.box;
        panel = new BasePanel(panelPropList[index]);
        panel.AlignAsBottomSibling();
      }

      if(panel != undefined){
        this.hvymPanels.push(panel);
      }
    });

    if(this.isPortal && this.hvymPanels.length>0){
      this.hvymPanels[0].MakePortalChild(this.stencilRef);
    }
    
  }
  CreateAndAlignPanel(panelProps){
    let panel = new BasePanel(panelProps);
    if(panelProps.attach == 'LEFT'){
      panel.AlignLeftOfTransform();
    }else if(panelProps.attach == 'RIGHT'){
      panel.AlignRightOfTransform();
    }else{
      panel.box.position.set(0,0,0);
    }

    return panel
  }
  CreateUniqueHVYMPanel(panelPropList){
    for (const [menuTransform, panelProps] of Object.entries(panelPropList)) {
      let panel = this.CreateAndAlignPanel(panelProps);
      
      if(panel != undefined){
        this.hvymPanels.push(panel);
      }
      if(this.isPortal && this.hvymPanels.length>0){
        panel.MakePortalChild(this.stencilRef);
      }
    }
  }
  CreateMinterDebugPanel(){
    if(!this.isHVYM || this.hvymData == undefined || this.minterClient == undefined)
      return;

    let panelPropList = this.hvymData.debugPanelHVYMCollectionPropertyList(this.scene, this.scene.leftMenuParent.box, DEFAULT_TEXT_PROPS);
    let panels = [];

    panelPropList.forEach((panelProps, index) =>{
      let panel = undefined;
      if(index == 0){
        panel = new BasePanel(panelProps);
        this.debugPanel = panel;

      }else{
        panelPropList[index].boxProps.parent = panels[index-1].bottom.box;
        panel = new BasePanel(panelPropList[index]);
        panel.AlignAsBottomSibling();
      }

      if(panel != undefined){
        panels.push(panel);
      }
    });

    this.scene.flattenLeftMenu(0.9);

    return this.debugPanel
    
  }
  RemoveMinterDebugPanel(){
    if(this.debugPanel != undefined){
      this.debugPanel.RemoveSelf();
      this.hvymScene.renderer.renderLists.dispose();
      this.debugPanel = undefined;
    }
  }
  MakeModelPortalChild(stencilRef){
    this.stencilRef = stencilRef;
    this.MakeChidrenStencilChild(this.gltf.scene, stencilRef);
  }
  ConvertToPortalChild(stencilRef){
    setupStencilChildMaterial(this.box.material, stencilRef);
    this.MakeModelPortalChild(stencilRef);
  }
  RemoveSelf(){
    this.hvymPanels.forEach((panel, index) =>{
      panel.RemoveSelf();
    });
    this.box.remove( this.gltf.scene );
    super.RemoveSelf();
  }
  static SetupPortalProps(gltfProps){
    gltfProps.boxProps.isPortal = true;
    gltfProps.boxProps.matProps.useCase = 'STENCIL';

    return gltfProps
  }

};

/**
 * This function creates a gltf model widget based on passed property set. Handles font loading
 * in the case that font isnt loaded.
 * @param {object} gltfProps (gltfProperties) Properties used for model widget.
 * 
 * @returns {null} no return value.
 */
function GLTFModelWidgetLoader(gltfProps){
  if(typeof DEFAULT_TEXT_PROPS.font === 'string'){
    // Load the font
    loader.load(DEFAULT_TEXT_PROPS.font, (font) => {
      DEFAULT_TEXT_PROPS.font = font;
      ListItemBox.SetListConfigFont(gltfProps.listConfig, font);
      let model = new GLTFModelWidget(gltfProps);
      model.scene.gltfModels.push(model);
    });
  }else if(DEFAULT_TEXT_PROPS.font.isFont){
    ListItemBox.SetListConfigFont(gltfProps.listConfig, DEFAULT_TEXT_PROPS.font);
    let model = new GLTFModelWidget(gltfProps);
    model.scene.gltfModels.push(model);
  }
}

/**
 * This function creates a gltf model widget based on passed property set.
 * @param {object} gltfProps (gltfProperties) Properties used for model widget.
 * 
 * @returns {null} no return value.
 */
export function createGLTFModel(gltfProps, hvymScene=undefined){
  HVYM_DefaultScene.handleLoading();
  gltfProps.boxProps.isPortal = false;
  if(typeof gltfProps.gltf === 'string'){
    // Instantiate a loader
    gltfLoader.load( gltfProps.gltf,function ( gltf ) {
        HVYM_DefaultScene.handleLoading();
        if(hvymScene==undefined){
          gltfProps.hvymData = new HVYM_Data(gltf, HVYM_DefaultScene);
        }else{
          gltfProps.hvymData = new HVYM_Data(gltf, hvymScene);
        }
        console.log('gltf')
        console.log(gltf)
        console.log(gltfProps.hvymData)
        gltfProps.gltf = gltf;
        GLTFModelWidgetLoader(gltfProps);
        console.log('gltfProps.hvymData')
        console.log(gltfProps.hvymData)
      },
      // called while loading is progressing
      function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      // called when loading has errors
      function ( error ) {
        console.log( error );
      }
    );
  }else if(gltfProps.gltf.scene != undefined){
    gltfProps.hvymData = new HVYM_Data(gltf, HVYM_DefaultScene);
    GLTFModelWidgetLoader(gltfProps);
  }

};


/**
 * This function creates a gltf model with a parent invisible box.
 * @param {object} hvymScene the HVYM_Scene that the model is part of.
 * @param {object} parent the parent that the model's parent box will be attached to.
 * @param {object} modelPath the file path to the model.
 * 
 * @returns {null} no return value.
 */
export function defaultGLTFModel(hvymScene, parent, modelPath){
  const boxProps = defaultModelBoxProps('box', parent);
  let gltfProps = gltfProperties(hvymScene, boxProps, '', modelPath);

  createGLTFModel(gltfProps, hvymScene);
};

/**
 * This function creates a gltf model with a parent invisible box.
 * @param {object} hvymScene the HVYM_Scene that the model is part of.
 * @param {object} parent the parent that the model's parent box will be attached to.
 * @param {object} modelPath the file path to the model.
 * @param {object} mintCallback the client side method minter callback.
 * 
 * @returns {null} no return value.
 */
export function gltfModelMinter(hvymScene, parent, modelPath, mintCallback){
  const boxProps = defaultModelBoxProps('box', parent);
  let gltfProps = gltfProperties(hvymScene, boxProps, '', modelPath);
  gltfProps.boxProps.isPortal = false;
  gltfProps.btnCallbacks = gltfButtonCallbackConfig(mintCallback);

  createGLTFModel(gltfProps, hvymScene);

};


/**
 * This function creates a gltf model widget portal(inset inside of parent, 
 * rendered using stencil ref) based on passed property set.
 * @param {object} gltfProps (gltfProperties) Properties used for model widget.
 * 
 * @returns {null} no return value.
 */
export function createGLTFModelPortal(gltfProps){
  gltfProps = GLTFModelWidget.SetupPortalProps(gltfProps);
  if(typeof gltfProps.gltf === 'string'){
    // Instantiate a loader
    gltfLoader.load( gltfProps.gltf,function ( gltf ) {
        gltfProps.hvymData = new HVYM_Data(gltf);
        gltfProps.gltf = gltf;
        GLTFModelWidgetLoader(gltfProps);
      },
      // called while loading is progressing
      function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      // called when loading has errors
      function ( error ) {
        console.log( error );
      }
    );
  }else if(gltfProps.gltf.scene != undefined){
    GLTFModelWidgetLoader(gltfProps);
  }
}

/**
 * Enable model drag and drop upload for page.
 *
 * @param {object} parent Object3D.
 */
export function GLTFDragAndDrop(hvymScene, parent) {
  document.addEventListener('dragover', (e) => {
      e.preventDefault()
  });
  document.addEventListener('drop', (e) => {
      e.preventDefault()

      const file = e.dataTransfer.files[0];
      const filename = file.name;
      const extension = filename.split( '.' ).pop().toLowerCase();


      if(extension == 'glb'){
        const reader = new FileReader();
        reader.addEventListener( 'progress', function ( event ) {

          const progress = Math.floor( ( event.loaded / event.total ) * 100 ) + '%';

          console.log( 'Loading', filename, progress );

        } );

        reader.addEventListener( 'load', async function ( event ) {

          const contents = event.target.result;
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath( '../examples/js/libs/draco/gltf/' );
          const loader = new GLTFLoader();
          loader.setDRACOLoader( dracoLoader );

          loader.parse( contents, '', function ( gltf ) {
            const size = getGeometrySize(parent.geometry);
            const boxProps = boxProperties(gltf.scene.name, parent, size.width, size.height, size.depth, 3, 0.02);
            const gltfProps = gltfProperties(hvymScene, boxProps, gltf.scene.name, gltf);
            gltfProps.hvymData = new HVYM_Data(gltf);
            GLTFModelWidgetLoader(gltfProps);
          } );

        }, false );
        reader.readAsArrayBuffer( file );
      }else{
        alert('Only .glb model supported currently.')
      }

  });
};

/**
 * This function creates a list item config.
 * @param {object} boxProps (boxProperties) Dimensions of element box mesh.
 * @param {object} textProps (textProperties) Properties of text.
 * @param {object} animProps (animationProperties) 
 * @param {object} infoProps (infoProperties) Information displayed
 * @param {bool} [useTimeStamp=true]
 * @param {number} [spacing=0] Spacing between list elements.
 * @param {number} [childInset=0.9] Amount content is inset.
 * @param {number} [index=0] Index of the list element.
 * 
 * @returns {object} Data object for configuring List Items.
 */
export function listItemConfig( scene, boxProps, textProps,  animProps, infoProps, useTimeStamp=true, spacing=0, childInset=0.9, index=0){
  return {
    'type': 'LIST_CONFIG',
    'scene': scene,
    'boxProps': boxProps,
    'textProps': textProps,
    'animProps': animProps,
    'infoProps': infoProps,
    'useTimeStamp': useTimeStamp,
    'spacing': spacing,
    'childInset': childInset,
    'index': index
  }
}

/**
 * Creates a list item box container for the object that has a list item config.
 *
 * @param {object} ListItemConfig.
 */
export class ListItemBox extends BaseBox {
  constructor(listConfig) {

    super(listConfig.boxProps);
    this.is = 'LIST_ITEM_BOX';
    this.box.userData.properties = listConfig;
    this.textProps = listConfig.textProps;
    this.listTextMaterial = getMaterial(listConfig.textProps.matProps);
    this.childInset = listConfig.childInset;
    this.spacing = listConfig.spacing;
    this.index = listConfig.index;
    this.BaseText = new BaseText(this.textProps);
    this.BaseText.SetParent(this);
    this.BaseText.SetMaterial(this.listTextMaterial);

    let textMeshOffset = 1;
    this.textZPos = (this.depth*2)+this.textProps.size*2;


    if(this.isPortal){
      this.SetStencilRef(getStencilRef());
      this.ConvertBoxMaterialToPortalMaterial();
      setupStencilChildMaterial(this.listTextMaterial, this.box.material.stencilRef);

      textMeshOffset = -1;
    }  

    let infoProps = listConfig.infoProps;
    let date = this.NewDate();

    if(infoProps.title.length>0){
      this.titleText = this.BaseText.NewSingleTextMesh('titleText', infoProps.title);
      this.BaseText.CenterTopTextPos('titleText');
      this.box.userData.title = this.titleText;
    }

    if(infoProps.author.length>0){
      this.authorText = this.BaseText.NewSingleTextMesh('authorText', infoProps.author);
      this.BaseText.LeftBottomCornerTextPos('authorText');
      this.box.userData.author = this.authorText;
    }

    this.dateText = this.BaseText.NewSingleTextMesh('dateText', date, 0.5);
    this.BaseText.LeftBottomCornerTextPos('dateText');
    this.box.userData.date = this.dateText;

    if( this.authorText != undefined){
      this.authorText.translateY(this.dateText.userData.size.height+this.BaseText.padding);
    }

    this.box.translateY(-(this.size.height+this.padding)*this.index);

  }
  SetContent(content){
    this.listTextMaterial.depthWrite = true;
    if(this.titleText!=undefined && content.widgetText!=undefined){
      content.box.parent.remove(content.widgetText);
    }
    this.box.add(content.box);
    
    if(content.box.userData.properties.boxProps.isPortal && !this.isPortal){
      this.box.material.stencilWrite = false;
      this.box.material.depthWrite = false;
    }
    if(this.isPortal){
      if(content.gltf!=undefined){
        this.box.add(content.gltf.scene)
        if(content.isPortal){
          content.MakeModelPortalChild(this.box.material.stencilRef);
          content.MakeBoxMaterialInvisible();
          content.box.material.depthWrite = false;
          // if(content.hasOwnProperty('hvymPanels') && content.hvymPanels.length>0){
          //   content.hvymPanels[0].MakePortalChild(this.box.material.stencilRef)
          // }
        }
        
      }
      if(content.textMesh!=undefined){
        let zPos = content.textMeshSize.depth*2;
        this.box.material.depthWrite = false;
        this.box.add(content.textMesh);
        content.NewTextMeshStencilMaterial(this.box.material.stencilRef);
        content.textMesh.translateZ(zPos);
        content.textMesh.material.depthWrite = true;
        content.MakeBoxMaterialInvisible();
      }
      if(content.imageMaterial!=undefined){
        content.NewImageBoxStencilMaterial(this.box.material.stencilRef);
      }
      content.AlignCenter();
      content.box.scale.set(content.box.scale.x*this.childInset, content.box.scale.y*this.childInset, content.box.scale.z*this.childInset);
      
      this.box.material.stencilWrite = true;
      this.box.material.depthWrite = false;
      this.box.material.stencilFunc = THREE.AlwaysStencilFunc;
      this.box.material.stencilZPass = THREE.ReplaceStencilOp;
    }
  }
  CreateListTextGeometry(text, sizeMult=1){
    return BaseText.CreateTextGeometry(text, this.textProps.font, this.textProps.size*sizeMult, this.textProps.height, this.textProps.meshProps.curveSegments, this.textProps.meshProps.bevelEnabled, this.textProps.meshProps.bevelThickness, this.textProps.meshProps.bevelSize, this.textProps.meshProps.bevelOffset, this.textProps.meshProps.bevelSegments);
  }
  NewTextMeshStencilMaterial(stencilRef){
    this.listTextMaterial = getMaterial(this.box.userData.properties.textProps.matProps, stencilRef);
  }
  ListText(text, sizeMult=1){
    const geometry = this.CreateListTextGeometry(text, sizeMult);
    geometry.center();
    let mesh = new THREE.Mesh(geometry, this.listTextMaterial);
    mesh.userData.size = getGeometrySize(geometry);
    return  mesh
  }
  UpdateTitleText(text){
    this.titleText.geometry.dispose();
    this.titleText.geometry = this.CreateListTextGeometry(text);
  }
  UpdateAuthorText(text){
    this.authorText.geometry.dispose();
    this.authorText.geometry = this.CreateListTextGeometry(text);
  }
  UpdateDateText(){
    this.titleText.geometry.dispose();
    this.titleText.geometry = this.CreateListTextGeometry(this.NewDate());
  }
  NewDate(){
    let timestamp = Number(new Date());
    return new Date(timestamp).toString();
  }
  static SetListConfigFont(listConfig, font){
    if(listConfig!=undefined){
      listConfig.textProps.font = font;
    }
  }

};

/**
 * This function creates a list of text elements.
 * @param {object} textBoxProps (textBoxProperties) Properties used for text list.
 * @param {object} contentArr array of text blocks to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createStaticTextList( textBoxProps, contentArr ) {
  let listConfig = textBoxProps.listConfig;
  if(listConfig.boxProps.parent.isScene)
    return;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((text, index) =>{
    let props = {...textBoxProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.text = text;
    props.listConfig = lConfig;
    createStaticTextBox(props);
  });

};

/**
 *  This function creates a list of text element portals(inset inside of parent, 
 * rendered using stencil ref) based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) Properties used for text list.
 * @param {object} contentArr array of text blocks to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createStaticTextPortalList( textBoxProps, contentArr ) {
  let listConfig = textBoxProps.listConfig;
  if(listConfig.boxProps.parent.isScene)
    return;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((text, index) =>{
    let props = {...textBoxProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.text = text;
    props.listConfig = lConfig;
    createStaticTextPortal(props);
  });

};

/**
 * This function creates a scrollable list of text elements.
 * @param {object} textBoxProps (textBoxProperties) Properties used for text list.
 * @param {object} contentArr array of text blocks to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createStaticScrollableTextList( textBoxProps, contentArr ) {
  if(listConfig.boxProps.parent.isScene)
    return;
  let listConfig = textBoxProps.listConfig;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((text, index) =>{
    let props = {...textBoxProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.text = text;
    props.listConfig = lConfig;
    createStaticScrollableTextBox(props);
  });

};

/**
 *  This function creates a scrollable list of text element portals(inset inside of parent, 
 * rendered using stencil ref) based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) Properties used for text list.
 * @param {object} contentArr array of text blocks to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createStaticScrollableTextPortalList( textBoxProps, contentArr ) {
  let listConfig = textBoxProps.listConfig;
  if(listConfig.boxProps.parent.isScene)
    return;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((text, index) =>{
    let props = {...textBoxProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.text = text;
    props.listConfig = lConfig;
    createStaticScrollableTextPortal(props);
  });

};

/**
 * This function creates a list of multi-mesh text elements.
 * @param {object} textBoxProps (textBoxProperties) Properties used for text list.
 * @param {object} contentArr array of text blocks to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createMultiTextList( textBoxProps, contentArr  ) {
  if(listConfig.boxProps.parent.isScene)
    return;
  let listConfig = textBoxProps.listConfig;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((text, index) =>{
    let props = {...textBoxProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.text = text;
    props.listConfig = lConfig;
    createMultiTextBox(props);
  });

};


/**
 *  This function creates a list of multi-mesh text element portals(inset inside of parent, 
 * rendered using stencil ref) based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) Properties used for text list.
 * @param {object} contentArr array of text blocks to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createMultiTextPortalList( textBoxProps, contentArr  ) {
  let listConfig = textBoxProps.listConfig;
  if(listConfig.boxProps.parent.isScene)
    return;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((text, index) =>{
    let props = {...textBoxProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.text = text;
    props.listConfig = lConfig;
    createMultiTextPortal(props);
  });

};

/**
 * This function creates a scrollable list of multi-mesh text elements.
 * @param {object} textBoxProps (textBoxProperties) Properties used for text list.
 * @param {object} contentArr array of text blocks to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createMultiScrollableTextList( textBoxProps, contentArr ) {
  if(listConfig.boxProps.parent.isScene)
    return;
  let listConfig = textBoxProps.listConfig;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((text, index) =>{
    let props = {...textBoxProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.text = text;
    props.listConfig = lConfig;
    createMultiScrollableTextBox(props);
  });

};

/**
 *  This function creates a scrollable list of multi-mesh text element portals(inset inside of parent, 
 * rendered using stencil ref) based on passed property set.
 * @param {object} textBoxProps (textBoxProperties) Properties used for text list.
 * @param {object} contentArr array of text blocks to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createMultiScrollableTextPortalList(textBoxProps, contentArr) {
  let listConfig = textBoxProps.listConfig;
  if(listConfig.boxProps.parent.isScene)
    return;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((text, index) =>{
    let props = {...textBoxProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.text = text;
    props.listConfig = lConfig;
    createMultiScrollableTextPortal(props);
  });

};

/**
 * This function creates a list of image elements.
 * @param {object} imageProps (imageProperties) Properties used for image list.
 * @param {object} contentArr array of images to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createImageContentList( imageProps, contentArr ) {
  if(listConfig.boxProps.parent.isScene)
    return;
  let listConfig = imageProps.listConfig;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((imgUrl, index) =>{
    let props = {...imageProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.listConfig = lConfig;
    createImageBox(props);
  });

};

/**
 * This function creates a list of gltf model elements.
 * @param {object} gltfProps (gltfProperties) Properties used for model list.
 * @param {object} contentArr array of models to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createGLTFContentList(gltfProps, contentArr) {
  let listConfig = gltfProps.listConfig;
  if(listConfig.boxProps.parent.isScene)
    return;
  listConfig.boxProps.parent.userData.listElements = [];
  gltfProps.listConfig.boxProps.isPortal = false;
  gltfProps.boxProps.isPortal = false;

  contentArr.forEach((gltfUrl, index) =>{
    let props = {...gltfProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.listConfig = lConfig;
    createGLTFModel(props);
  });

};

/**
 * This function creates a list of gltf model portal elements.
 * @param {object} gltfProps (gltfProperties) Properties used for model list.
 * @param {object} contentArr array of models to be rendered.
 * 
 * @returns {null} no return value.
 */
export function createGLTFContentPortalList(gltfProps, contentArr) {
  let listConfig = gltfProps.listConfig;
  if(listConfig.boxProps.parent.isScene)
    return;
  listConfig.boxProps.parent.userData.listElements = [];

  contentArr.forEach((gltfUrl, index) =>{
    let props = {...gltfProps};
    let lConfig = listItemConfig(listConfig.boxProps, listConfig.textProps, listConfig.animProps, listConfig.infoProps, listConfig.useTimeStamp, listConfig.spacing, listConfig.childInset, index);
    props.listConfig = lConfig;
    createGLTFModelPortal(props);
  });

};

/**
 * This function creates a translation controller to passed element.
 * @param {object} elem target Object3D, that gizmo will be attached to.
 * @param {object} camera camera currently used in scene.
 * @param {object} renderer used in scene.
 * 
 * @returns {null} no return value.
 */
export function addTranslationControl(elem, camera, renderer){
  control = new TransformControls( camera, renderer.domElement );
  control.addEventListener( 'change', render );
  control.attach( elem );
};
