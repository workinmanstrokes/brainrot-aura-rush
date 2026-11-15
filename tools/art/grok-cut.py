# Cuts Michael's Grok Imagine sheet (/workspace/ref/brainrot-mullet-ref.jpg) into background-removed sprites.
import numpy as np
from PIL import Image,ImageFilter
from scipy import ndimage
src=Image.open('/workspace/ref/brainrot-mullet-ref.jpg').convert('RGB')
CUTS={ # name: crop box (1024x576 sheet)
 'mullet_base':(80,28,230,246),
 'mullet_run1':(28,250,108,332),'mullet_run2':(108,250,192,332),
 "mullet_caped":(305,36,590,236),'caped_run1':(410,248,505,332),'caped_run2':(505,248,605,332),
 'mullet_armor':(675,10,990,246),'armor_run1':(648,248,732,332),'armor_run2':(732,248,812,332)}
K=src.width/1024
def cut(box):
    im=src.crop(tuple(int(v*K) for v in box));a=np.asarray(im).astype(int);r,g,b=a[...,0],a[...,1],a[...,2]
    lum=(r+g+b)/3
    navy=(r<45)&(b-r>14)&(b-g>6)&(lum<85)
    lab,_=ndimage.label(navy)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge))
    fg=~bg; fg=ndimage.binary_opening(fg,iterations=1); fg=ndimage.binary_fill_holes(fg)
    lab2,n=ndimage.label(fg)
    if n: sizes=ndimage.sum(fg,lab2,range(1,n+1)); keep=[i+1 for i,s in enumerate(sizes) if s>=max(30,sizes.max()*0.06)]; fg=np.isin(lab2,keep)
    m=Image.fromarray((fg*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    o=im.convert('RGBA');o.putalpha(m);return o.crop(o.getbbox())
out='www/assets/hero'
import os;os.makedirs(out,exist_ok=True)
for k,bx in CUTS.items(): cut(bx).save(f'{out}/{k}.png')
