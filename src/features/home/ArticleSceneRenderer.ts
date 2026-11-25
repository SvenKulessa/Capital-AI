import { Scene } from 'three/src/scenes/Scene.js';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js';
import { Group } from 'three/src/objects/Group.js';
import { Mesh } from 'three/src/objects/Mesh.js';
import { BoxGeometry } from 'three/src/geometries/BoxGeometry.js';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry.js';
import { CylinderGeometry } from 'three/src/geometries/CylinderGeometry.js';
import { TorusGeometry } from 'three/src/geometries/TorusGeometry.js';
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial.js';
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial.js';
import { HemisphereLight } from 'three/src/lights/HemisphereLight.js';
import { DirectionalLight } from 'three/src/lights/DirectionalLight.js';
import { Vector3 } from 'three/src/math/Vector3.js';
import { SRGBColorSpace } from 'three/src/constants.js';
import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import type { ArticleScene } from './articleSceneModel';

/** Procedural first-party UI geometry; no textures, fonts, third-party assets or remote data. */
export function createArticleSceneRenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({canvas, alpha: false, antialias:true,powerPreference:'low-power'});
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x071126);
  const scene = new Scene();
  const camera = new PerspectiveCamera(42,1,.1,50);
  const root = new Group();
  const floor = new Group();
  scene.add(root,floor);
  scene.add(new HemisphereLight(0xdcecff,0x17102c,2));
  const light = new DirectionalLight(0xffffff,3);
  light.position.set(3,6,4);
  scene.add(light);
  const palette = Object.values(BRAND_COLORS);
  const permanent: {dispose:()=>void}[] = [];
  let dynamic: {dispose:()=>void}[] = [];
  const own = <T extends {dispose:()=>void}>(resource:T, list=dynamic) => {list.push(resource);return resource;};
  const floorMesh = new Mesh(own(new CylinderGeometry(4,4,.12,48),permanent),own(new MeshPhongMaterial({color:0x14233b}),permanent));
  floorMesh.position.y=-.08;floor.add(floorMesh);
  // Seven canonical Universe colours are decorative rings, never status indicators.
  palette.forEach((color,index)=>{
    const ring=new Mesh(own(new TorusGeometry(3.18+index*.105,.014,6,64),permanent),own(new MeshBasicMaterial({color,transparent:true,opacity:.8}),permanent));
    ring.rotation.x=-Math.PI/2;ring.position.y=.006;floor.add(ring);
  });
  let last: ArticleScene | undefined;
  let angle=30, zoom=1;
  const render=()=>{
    const rad=angle*Math.PI/180;
    camera.position.set(Math.sin(rad)*9/zoom,5.4/zoom,Math.cos(rad)*9/zoom);
    camera.lookAt(0,.8,0);renderer.render(scene,camera);
  };
  const update=(model:ArticleScene)=>{
    if (model === last) return;
    last=model;root.clear();dynamic.forEach(item=>item.dispose());dynamic=[];
    const count=model.nodes.length;
    const positions: Vector3[]=[];
    model.nodes.forEach((node,index)=>{
      const color=palette[index%palette.length];
      const height=Math.max(.04,Math.min(3,node.height));
      let x=node.x ?? (index-(count-1)/2)*Math.min(1.7,5.2/Math.max(1,count-1)), z=0;
      if(model.kind==='network'){x=index===0?0:2*Math.cos((index-1)*Math.PI*2/(count-1));z=index===0?0:2*Math.sin((index-1)*Math.PI*2/(count-1));}
      const pos=new Vector3(x,height/2,z);positions.push(pos);
      const material=own(new MeshPhongMaterial({color,emissive:color,emissiveIntensity:.12,shininess:75}));
      const mesh=new Mesh(model.kind==='network'||model.kind==='timeline'?own(new SphereGeometry(.4,20,14)):own(new BoxGeometry(.9,height,.9)),material);
      mesh.position.copy(pos);root.add(mesh);
      const plinth=new Mesh(own(new CylinderGeometry(.6,.7,.12,24)),own(new MeshPhongMaterial({color:0x253653})));
      plinth.position.set(x,.06,z);root.add(plinth);
    });
    if(['network','flow','timeline'].includes(model.kind)) {
      for(let i=1;i<positions.length;i++){
        const from=positions[model.kind==='network'?0:i-1],to=positions[i];
        const delta=to.clone().sub(from);
        if(delta.lengthSq()<1e-8)continue;
        const link=new Mesh(own(new CylinderGeometry(.025,.025,delta.length(),8)),own(new MeshBasicMaterial({color:BRAND_COLORS.cyan})));
        link.position.copy(from.clone().add(to).multiplyScalar(.5));link.quaternion.setFromUnitVectors(new Vector3(0,1,0),delta.normalize());root.add(link);
      }
    }
  };
  return {draw(model:ArticleScene, nextAngle:number,nextZoom:number){update(model);angle=nextAngle;zoom=nextZoom;render();},
    resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);if(last)render();},
    dispose(){dynamic.forEach(item=>item.dispose());permanent.forEach(item=>item.dispose());renderer.dispose();}
  };
}
