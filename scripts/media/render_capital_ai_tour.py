#!/usr/bin/env python3
"""Offline tour using the shipped logo, shared lessons and first-party JaJa GLB.

No provider, voice, remote artwork or publishing. Buddy animation transforms
its existing right-arm pivot, then rasterizes that model into video frames.
"""
import argparse
import json
import math
import struct
import shutil
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from capital_ai_media import (REPOSITORY_ROOT, _font, _wrap, load_brand_palette,
    render_brand_card, render_scene_frame, render_short_video, validate_scenes,
    sha256_file, write_asset_manifest)

ROOT = REPOSITORY_ROOT
LOGO = ROOT / 'public/branding/asset-pack/vendor/vendor-app-icon-512x512.png'
MODEL = ROOT / 'public/assets/jaja-figure.glb'


def read_model():
    data = MODEL.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    document = json.loads(data[20:20+length])
    binary = data[28+length:]
    def accessor(index):
        a = document['accessors'][index]
        view = document['bufferViews'][a['bufferView']]
        dtype = {5126:'<f4',5123:'<u2'}[a['componentType']]
        count = a['count'] * (3 if a['type']=='VEC3' else 1)
        return np.frombuffer(binary,dtype=dtype,count=count,offset=view.get('byteOffset',0)+a.get('byteOffset',0)).reshape((-1,3) if a['type']=='VEC3' else (-1,))
    primitives = []
    for mesh in document['meshes']:
        primitive = mesh['primitives'][0]
        color = document['materials'][primitive['material']]['pbrMetallicRoughness']['baseColorFactor'][:3]
        primitives.append((accessor(primitive['attributes']['POSITION']), accessor(primitive['indices']).reshape(-1,3), np.array(color)))
    return document, primitives


def rotation_z(angle):
    c,s=math.cos(angle),math.sin(angle)
    return np.array([[c,-s,0,0],[s,c,0,0],[0,0,1,0],[0,0,0,1]])


def draw_buddy(image, document, primitives, time):
    polygons, depths, colors = [], [], []
    # Slight yaw preserves the same front-facing long-nose model as the website.
    yaw=-.22
    cy,sy=math.cos(yaw),math.sin(yaw)
    view=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])
    light=np.array([-.35,.55,1.0]);light/=np.linalg.norm(light)
    def visit(index,parent):
        node=document['nodes'][index]
        transform=np.eye(4)
        transform[:3,3]=node.get('translation',[0,0,0])
        q=node.get('rotation',[0,0,0,1])
        angle=2*math.atan2(q[2],q[3])
        if node['name']=='JaJaArmRightPivot': angle=2.5+math.sin(time*math.pi*2)*.27
        transform=transform @ rotation_z(angle)
        scale=np.eye(4);scale[:3,:3]=np.diag(node.get('scale',[1,1,1]))
        world=parent @ transform @ scale
        if 'mesh' in node:
            vertices,indices,color=primitives[node['mesh']]
            points=(np.c_[vertices,np.ones(len(vertices))] @ world.T)[:,:3] @ view.T
            triangles=points[indices]
            normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
            lengths=np.linalg.norm(normals,axis=1)
            visible=(normals[:,2]>0)&(lengths>1e-9)
            triangles=triangles[visible];normals=normals[visible]/lengths[visible,None]
            shade=.50+.50*np.maximum(0,normals @ light)
            # Orthographic rendering in a fixed model viewport, below the copy.
            screen=np.stack([540+triangles[:,:,0]*178,1540-triangles[:,:,1]*178],axis=-1)
            polygons.extend(screen);depths.extend(triangles[:,:,2].mean(axis=1));colors.extend(np.clip(color[None,:]*shade[:,None]*255,0,255).astype(np.uint8))
        for child in node.get('children',[]): visit(child,world)
    visit(document['scenes'][0]['nodes'][0],np.eye(4))
    draw=ImageDraw.Draw(image)
    for i in np.argsort(depths):
        draw.polygon([tuple(v) for v in polygons[i]],fill=tuple(int(c) for c in colors[i]))


def lesson_card(image, palette, title, lines):
    draw=ImageDraw.Draw(image)
    box=(72,900,1008,1525)
    draw.rounded_rectangle(box,radius=28,fill=palette.surface_light,outline=palette.gold,width=3)
    y=940
    for text,size,bold,color in [(title,44,True,palette.gold_light)]+[(line,34,False,palette.foreground) for line in lines]:
        font=_font(size,bold=bold)
        for line in _wrap(draw,text,font,840):
            draw.text((108,y),line,font=font,fill=color);y+=size+18
        y+=15
    if y>1510: raise ValueError('Demo copy exceeds scene card')


def sentiment_gauge(image, palette, value):
    """Educational dial only; deterministic 0..100 mapping of synthetic inputs."""
    draw=ImageDraw.Draw(image)
    draw.rounded_rectangle((72,880,1008,1585),radius=28,fill=palette.surface_light,outline=palette.gold,width=3)
    draw.text((540,936),'Sentiment · DEMO',font=_font(46,bold=True),fill=palette.foreground,anchor='mm')
    cx,cy,radius=540,1320,300
    arc=(cx-radius,cy-radius,cx+radius,cy+radius)
    for score in range(100):
        color='#fb7185' if score<25 else '#fbbf24' if score<45 else '#fde68a' if score<55 else '#6ee7b7' if score<75 else '#34d399'
        draw.arc(arc,180+score*1.8,180+(score+1)*1.8,fill=color,width=42)
    for score in range(0,101,10):
        angle=math.pi+score/100*math.pi
        points=[(cx+math.cos(angle)*r,cy+math.sin(angle)*r) for r in (242,258)]
        draw.line(points,fill=palette.foreground,width=3)
    angle=math.pi+value/100*math.pi
    end=(cx+math.cos(angle)*228,cy+math.sin(angle)*228)
    side=(-math.sin(angle)*11,math.cos(angle)*11)
    draw.polygon([end,(cx+side[0],cy+side[1]),(cx-side[0],cy-side[1])],fill=palette.gold)
    draw.ellipse((cx-22,cy-22,cx+22,cy+22),fill=palette.gold)
    draw.text((220,1375),'Fear',font=_font(32,bold=True),fill='#fb7185',anchor='mm')
    draw.text((540,1130),'Neutral',font=_font(28),fill=palette.text_secondary,anchor='mm')
    draw.text((858,1375),'Greed',font=_font(32,bold=True),fill='#6ee7b7',anchor='mm')
    display=f'{value:g}'.replace('.',',')
    draw.text((540,1445),display+' / 100 · Greed',font=_font(52,bold=True),fill='#6ee7b7',anchor='mm')
    draw.text((540,1535),'Synthetische Beispielwerte',font=_font(30),fill=palette.text_secondary,anchor='mm')


def render_tour(out, allow_gpl_ffmpeg):
    raw=json.loads((ROOT/'scripts/media/capital-ai-tour.json').read_text())
    lesson=json.loads((ROOT/'shared/video-learning-demo.json').read_text())
    sentiment=json.loads((ROOT/'shared/sentiment-learning-demo.json').read_text())
    palette=load_brand_palette();scenes=validate_scenes(raw['scenes'])
    assets=[]
    for suffix,w,h in [('thumbnail-1280x720',1280,720),('square-1080x1080',1080,1080),('vertical-1080x1920',1080,1920)]:
        assets.append(render_brand_card(output_path=out/f"capital-ai-tour-{suffix}.png",width=w,height=h,title=raw['title'],subtitle=raw['subtitle'],disclaimer=raw['disclaimer'],palette=palette,logo_path=LOGO))
    frames=[]
    document,primitives=read_model()
    with tempfile.TemporaryDirectory(prefix='capital-ai-buddy-') as directory:
        for i,scene in enumerate(scenes):
            path=out/f'capital-ai-tour-scene-{i+1:02d}.png'
            render_scene_frame(scene,output_path=path,palette=palette,scene_index=i+1,scene_count=len(scenes),logo_path=LOGO)
            with Image.open(path) as source:
                base=source.convert('RGB').copy()
            if i==0:
                lesson_card(base,palette,lesson['skillLevel']+' · '+lesson['term'],[lesson['definition'],lesson['takeaway']])
            elif i==1:
                total=sentiment['positive']+sentiment['neutral']+sentiment['negative']
                index=(sentiment['positive']-sentiment['negative'])/total*100
                sentiment_gauge(base,palette,(index+100)/2)
            elif i==2:
                lesson_card(base,palette,'Dein Wissen wächst.',['Backtesting · Spread · Volatilität','Begriffe sammeln und wiederholen.','In deinem eigenen Tempo lernen.'])
            if i==3:
                for frame in range(30):
                    image=base.copy();draw_buddy(image,document,primitives,frame/6)
                    frame_path=Path(directory)/f'buddy-{frame:03d}.png';image.save(frame_path)
                    frames.append((frame_path,5/30))
                    if frame==0: image.save(path.with_suffix('.tmp'),format='PNG');path.with_suffix('.tmp').replace(path)
            else:
                base.save(path.with_suffix('.tmp'),format='PNG');path.with_suffix('.tmp').replace(path);frames.append((path,scene.duration_seconds))
            assets.append({'path':path.name,'sha256':sha256_file(path),'mime_type':'image/png','width':1080,'height':1920,'kind':'short_video_frame'})
        video,ffmpeg=render_short_video(frames,output_path=out/'capital-ai-tour-short-1080x1920.mp4',allow_gpl_ffmpeg=allow_gpl_ffmpeg,video_codec='libx264')
        # Reuse AssetRecord type for representative scenes and exact output hashes.
        from capital_ai_media import AssetRecord
        assets=[AssetRecord(**a) if isinstance(a,dict) else a for a in assets]+[video]
        write_asset_manifest(output_path=out/'capital-ai-tour-asset-manifest.json',assets=assets,palette=palette,
          source={'type':'content-render-manifest','path':'capital-ai-tour.json','inputs':{str(path.relative_to(ROOT)):sha256_file(path) for path in [LOGO,MODEL,ROOT/'shared/video-learning-demo.json',ROOT/'shared/sentiment-learning-demo.json']}},
          renderer={'image':'Pillow + NumPy GLB rasterizer','video':{'version':ffmpeg.version,'profile':ffmpeg.profile,'enableGpl':ffmpeg.enable_gpl,'enableNonfree':ffmpeg.enable_nonfree,'buildconfSha256':ffmpeg.buildconf_sha256},'videoCodec':'h264 (libx264, high profile, yuv420p, faststart)','networkAccess':False,'brandTextMode':'deterministic','voiceover':None,'buddy':'JaJaArmRightPivot animation, 30 unique frames'})
    return video

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out-dir',type=Path,default=ROOT/'public/learning/videos')
    parser.add_argument('--allow-gpl-ffmpeg',action='store_true')
    args=parser.parse_args();out=args.out_dir;out.mkdir(parents=True,exist_ok=True)
    # Render and validate in fresh staging paths before replacing shipped assets.
    with tempfile.TemporaryDirectory(prefix='capital-ai-tour-') as directory:
        staging=Path(directory)
        video=render_tour(staging,args.allow_gpl_ffmpeg)
        for source in sorted(staging.iterdir(),key=lambda path:path.name.endswith('manifest.json')):
            destination=out/source.name
            temporary=destination.with_suffix(destination.suffix+'.tmp')
            shutil.copyfile(source,temporary);temporary.replace(destination)
    print(json.dumps({'video':str(out/video.path),'duration':video.duration_seconds,'sha256':video.sha256}))

if __name__=='__main__': main()
