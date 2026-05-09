// export_stl.js — fully fixed STL exporter with proper holes support

(function(){
  const CLIPPER_URL = "https://unpkg.com/clipper-lib@6.4.2/clipper.js";
  const EARCUT_URL  = "https://unpkg.com/earcut@2.2.4/dist/earcut.min.js";
  const SCALE = 1000;

  // -------------------------
  // Utility
  // -------------------------
  const v = (x,y,z)=>({x,y,z});
  const sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z);
  const cross=(a,b)=>v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const len=a=>Math.sqrt(dot(a,a));
  const norm=a=>{const L=len(a)||1;return v(a.x/L,a.y/L,a.z/L);};

  // -------------------------
  // 2D Shape Generators
  // -------------------------
  const polySquare=o=>{
    const s=(o.size||10)/2;
    return [
      {x:-s,y:-s},{x:s,y:-s},{x:s,y:s},{x:-s,y:s},{x:-s,y:-s}
    ];
  };

  const polyTriangle=o=>{
    const r=(o.size||10)/2;
    return [
      {x:0,y:-r},{x:r,y:r},{x:-r,y:r},{x:0,y:-r}
    ];
  };

  const polyCircle=o=>{
    const r=(o.size||10)/2;
    const steps=64;
    const pts=[];
    for(let i=0;i<steps;i++){
      const a=(i/steps)*Math.PI*2;
      pts.push({x:r*Math.cos(a),y:r*Math.sin(a)});
    }
    pts.push({...pts[0]});
    return pts;
  };

function applyRoundnessToPolygon(intPath, radius){
  if (!radius || radius <= 0) return intPath;

  const C = window.ClipperLib;
  if (!C || !C.ClipperOffset) return intPath;

  const co = new C.ClipperOffset(2, C.ClipperOffset.def_arc_tolerance);

  // ROUND joins, closed polygon — this matches OpenSCAD-style rounded offset
  co.AddPath(intPath, C.JoinType.jtRound, C.EndType.etClosedPolygon);

  const solution = new C.Paths();
  co.Execute(solution, (radius * 0.18) * SCALE);
 // SCALE is already defined at top

  return solution.length ? solution[0] : intPath;
}


  // -------------------------
  // Transform to Clipper
  // -------------------------
  function transformPolyToClipper(poly,o){
    const rad=(o.rot||0)*Math.PI/180;
    const cos=Math.cos(rad), sin=Math.sin(rad);
    const sx=o.scaleX||1, sy=o.scaleY||1;
    const tx=o.x||0, ty=o.y||0;

    return poly.map(p=>{
      let x=p.x*sx, y=p.y*sy;
      const rx=x*cos - y*sin;
      const ry=x*sin + y*cos;
      return { X:(rx+tx)*SCALE, Y:(ry+ty)*SCALE };
    });
  }

  function cleanIntPath(path){
    const out=[];
    for(let i=0;i<path.length;i++){
      const a=path[i], b=path[(i+1)%path.length];
      if(a.X===b.X && a.Y===b.Y) continue;
      out.push(a);
    }
    return out.length>=3?out:null;
  }

  function buildClipperPathForObject(o){
    let poly=null;
    if(o.type==="square") poly=polySquare(o);
    else if(o.type==="triangle") poly=polyTriangle(o);
    else if(o.type==="circle") poly=polyCircle(o);
    else return null;

  let intPath = transformPolyToClipper(poly, o);
  intPath = cleanIntPath(intPath);
  if (!intPath) return null;

  // 🔹 Apply OpenSCAD-style rounding using ClipperOffset (jtRound)
  intPath = applyRoundnessToPolygon(intPath, o.roundness || 0);
  if (!intPath || intPath.length < 3) return null;


    const C=window.ClipperLib;
    if(C && C.Clipper){
      const isCCW = C.Clipper.Orientation(intPath);
      if(o.op==="subtract"){
        // subtract shapes CW
        if(isCCW) intPath.reverse();
      }else{
        // union shapes CCW
        if(!isCCW) intPath.reverse();
      }
    }

    return intPath;
  }

  // -------------------------
  // Global Boolean: (Union of adds) - (Union of subtracts)
  // -------------------------
  function booleanUnionMinusSubtract(objects){
    const C=window.ClipperLib;
    if(!C) throw new Error("Clipper not loaded");

    const adds=[], subs=[];
    for(const o of objects){
      const p=buildClipperPathForObject(o);
      if(!p||p.length<3) continue;
      (o.op==="subtract"?subs:adds).push(p);
    }

    if(!adds.length) return [];

    const unionPaths=paths=>{
      const clip=new C.Clipper();
      clip.AddPaths(paths,C.PolyType.ptSubject,true);
      const sol=new C.Paths();
      clip.Execute(C.ClipType.ctUnion,sol,C.PolyFillType.pftNonZero,C.PolyFillType.pftNonZero);
      return sol.map(p=>p.map(pt=>({X:pt.X,Y:pt.Y})));
    };

    const addUnion=unionPaths(adds);
    if(!subs.length) return addUnion;

    const subUnion=unionPaths(subs);

    const clip=new C.Clipper();
    clip.AddPaths(addUnion,C.PolyType.ptSubject,true);
    clip.AddPaths(subUnion,C.PolyType.ptClip,true);
    const sol=new C.Paths();
    clip.Execute(C.ClipType.ctDifference,sol,C.PolyFillType.pftNonZero,C.PolyFillType.pftNonZero);

    return sol.map(p=>p.map(pt=>({X:pt.X,Y:pt.Y})));
  }

  // -------------------------
  // Regions (outer + holes) from Clipper paths
  // -------------------------
  function buildRegionsFromPaths(paths){
    const C = window.ClipperLib;
    const outers = [];
    const holes  = [];

    for(const p of paths){
      if(!p || p.length<3) continue;
      const isCCW = C && C.Clipper ? C.Clipper.Orientation(p) : true;
      if(isCCW) outers.push(p);
      else holes.push(p);
    }

    function pointInPoly(pt, poly){
      let inside=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const xi=poly[i].X, yi=poly[i].Y;
        const xj=poly[j].X, yj=poly[j].Y;
        const intersect = ((yi>pt.Y)!=(yj>pt.Y)) &&
          (pt.X < (xj - xi) * (pt.Y - yi) / ((yj - yi) || 1e-9) + xi);
        if(intersect) inside=!inside;
      }
      return inside;
    }

    const regions = outers.map(o=>({outer:o, holes:[]}));

    for(const h of holes){
      const testPt = h[0];
      for(const r of regions){
        if(pointInPoly(testPt, r.outer)){
          r.holes.push(h);
          break;
        }
      }
    }

    return regions;
  }

  // -------------------------
  // Triangulation + Extrusion with holes
  // -------------------------
  const clipperPathToFloat=path=>path.map(pt=>({x:pt.X/SCALE,y:pt.Y/SCALE}));

  function triangulateRegion(outerPath, holePaths){
    const outer = clipperPathToFloat(outerPath);
    const holes = (holePaths || []).map(clipperPathToFloat);

    const coords=[];
    const holesIdx=[];

    for(const p of outer) coords.push(p.x,p.y);

    for(const h of holes){
      holesIdx.push(coords.length/2);
      for(const p of h) coords.push(p.x,p.y);
    }

    const idx=(window.earcut && window.earcut(coords, holesIdx, 2)) || [];
    const tris=[];

    for(let i=0;i<idx.length;i+=3){
      const ia=idx[i]*2, ib=idx[i+1]*2, ic=idx[i+2]*2;
      tris.push([
        v(coords[ia],  coords[ia+1],  0),
        v(coords[ib],  coords[ib+1],  0),
        v(coords[ic],  coords[ic+1],  0)
      ]);
    }
    return tris;
  }

  function extrudeRegion(outerPath, holePaths, h){
    const tris=[];
    const base=triangulateRegion(outerPath, holePaths);

    // top & bottom
    for(const t of base){
      tris.push([v(t[0].x,t[0].y,h), v(t[1].x,t[1].y,h), v(t[2].x,t[2].y,h)]);
      tris.push([v(t[2].x,t[2].y,0), v(t[1].x,t[1].y,0), v(t[0].x,t[0].y,0)]);
    }

    // side walls for outer + holes
    const allRings = [outerPath].concat(holePaths || []);
    for(const ring of allRings){
      const poly = clipperPathToFloat(ring);
      for(let i=0;i<poly.length-1;i++){
        const a=poly[i], b=poly[i+1];
        const a0=v(a.x,a.y,0), b0=v(b.x,b.y,0);
        const a1=v(a.x,a.y,h), b1=v(b.x,b.y,h);
        tris.push([a0,b0,b1]);
        tris.push([a0,b1,a1]);
      }
    }

    return tris;
  }

  function sanitize(tris){
    return tris.filter(t=>{
      const n=cross(sub(t[1],t[0]),sub(t[2],t[0]));
      return len(n)>1e-9;
    });
  }

  // -------------------------
  // STL
  // -------------------------
  function buildSTL(tris){
    let s="solid scene\n";
    for(const t of tris){
      const n=norm(cross(sub(t[1],t[0]),sub(t[2],t[0])));
      s+=`facet normal ${n.x} ${n.y} ${n.z}\n  outer loop\n`;
      for(const p of t) s+=`    vertex ${p.x} ${p.y} ${p.z}\n`;
      s+=`  endloop\nendfacet\n`;
    }
    return s+"endsolid scene\n";
  }

  function getStlFilename(){
    let n=document.getElementById("saveName").value||"scene";
    return n.replace(/\.json$/i,"")+".stl";
  }

  function downloadSTL(text,name){
    const blob=new Blob([text],{type:"application/sla"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),50);
  }

  // -------------------------
  // Loader
  // -------------------------
  function ensureLib(url){
    return new Promise((res,rej)=>{
      if(document.querySelector(`script[src="${url}"]`)) return res();
      const s=document.createElement("script");
      s.src=url;
      s.onload=res;
      s.onerror=()=>rej(new Error("Failed to load "+url));
      document.head.appendChild(s);
    });
  }

  // -------------------------
  // Main Export
  // -------------------------
  async function exportSceneToSTL(){
    // use the same source your original code used
    const objs =
      (typeof window!=="undefined" && window.objects)
        ? window.objects
        : (typeof objects!=="undefined" ? objects : null);

    if(!objs || !objs.length){
      console.warn("No objects to export");
      return;
    }

    try{
      await ensureLib(CLIPPER_URL);
      await ensureLib(EARCUT_URL);

      const finalPaths = booleanUnionMinusSubtract(objs);
      if(!finalPaths.length){
        console.warn("Boolean produced no geometry");
        return;
      }

      const regions = buildRegionsFromPaths(finalPaths);

      let h=0;
      for(const o of objs){
        if(o.op==="subtract") continue;
        const t=Number(o.thickness||0);
        if(t>h) h=t;
      }
      if(h<=0) h=10;

      let tris=[];
      for(const r of regions){
        tris = tris.concat(extrudeRegion(r.outer, r.holes, h));
      }
      tris = sanitize(tris);
      if(!tris.length){
        console.warn("No triangles after sanitization");
        return;
      }

      const stl = buildSTL(tris);
      downloadSTL(stl, getStlFilename());
    }catch(err){
      console.error("Export failed:",err);
    }
  }

  // -------------------------
  // Hook up button
  // -------------------------
  document.addEventListener("DOMContentLoaded",()=>{
    const btn=document.getElementById("exportSTLBtn");
    if(!btn){
      console.error("exportSTLBtn not found in DOM");
      return;
    }
    btn.addEventListener("click",exportSceneToSTL);
  });

})();

