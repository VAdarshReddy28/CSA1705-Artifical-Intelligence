/* India EMS Navigator — Chennai academic prototype
   A* and Greedy Best-First Search run in this browser on an OSM road graph.
   Traffic multiplier is a demonstration input, not a live traffic feed. */
const CHENNAI = [13.0827, 80.2707];
const map = L.map('map').setView(CHENNAI, 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const $ = id => document.getElementById(id);
let start = null, end = null, pickMode = null, startMarker = null, endMarker = null;
let routeLayers = [], lastBounds = null;

function setPoint(which, lat, lon, label) {
  const point = {lat: Number(lat), lon: Number(lon), label: label || `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`};
  if (which === 'start') {
    start = point;
    if (startMarker) map.removeLayer(startMarker);
    startMarker = L.marker([point.lat, point.lon], {icon: markerIcon('#f35d72')}).addTo(map).bindPopup('事故 / Accident location');
    $('startSelected').textContent = '● ' + point.label;
  } else {
    end = point;
    if (endMarker) map.removeLayer(endMarker);
    endMarker = L.marker([point.lat, point.lon], {icon: markerIcon('#22bd8d')}).addTo(map).bindPopup('Hospital destination');
    $('endSelected').textContent = '● ' + point.label;
  }
  clearRoutes();
}
function markerIcon(color) {
  return L.divIcon({className:'custom-marker', html:`<div style="width:18px;height:18px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px #0008"></div>`, iconSize:[18,18], iconAnchor:[9,9]});
}
map.on('click', e => {
  if (!pickMode) return;
  setPoint(pickMode, e.latlng.lat, e.latlng.lng, `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)} (map selection)`);
  pickMode = null;
  $('mapHint').textContent = 'Location selected';
  $('pickStart').classList.remove('active'); $('pickEnd').classList.remove('active');
});
$('pickStart').onclick = () => {pickMode='start'; $('mapHint').textContent='Click the map to place accident location';};
$('pickEnd').onclick = () => {pickMode='end'; $('mapHint').textContent='Click the map to place hospital';};

async function searchPlace(inputId, resultsId, which) {
  const query = $(inputId).value.trim();
  if (!query) return;
  const box = $(resultsId); box.innerHTML = '<div class="result-item">Searching Chennai…</div>';
  try {
    const q = which === 'end' && !/hospital|clinic|medical/i.test(query) ? `${query} hospital, Chennai, India` : `${query}, Chennai, India`;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {headers:{'Accept-Language':'en'}});
    if (!res.ok) throw new Error('Search service unavailable');
    const data = await res.json();
    box.innerHTML = '';
    if (!data.length) {box.textContent='No results. Try a nearby landmark or a more specific name.';return;}
    data.forEach(place => {
      const btn = document.createElement('button'); btn.className='result-item'; btn.textContent=place.display_name;
      btn.onclick=()=>{setPoint(which, place.lat, place.lon, place.display_name);map.setView([place.lat,place.lon],15);box.innerHTML='';};
      box.appendChild(btn);
    });
  } catch(err) {box.textContent = `${err.message}. Try map selection.`;}
}
$('searchStart').onclick=()=>searchPlace('startSearch','startResults','start');
$('searchEnd').onclick=()=>searchPlace('endSearch','endResults','end');
$('startSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchPlace('startSearch','startResults','start')});
$('endSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchPlace('endSearch','endResults','end')});

function haversine(a,b) {
  const R=6371000, rad=x=>x*Math.PI/180;
  const dLat=rad(b.lat-a.lat), dLon=rad(b.lon-a.lon);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function roadSpeed(tags) {
  const highway=tags.highway||'residential';
  const speeds={motorway:80,trunk:65,primary:45,secondary:35,tertiary:30,unclassified:25,residential:25,living_street:15,service:15};
  return (Number.parseFloat(tags.maxspeed)||speeds[highway]||20)/3.6;
}
async function loadRoadGraph(a,b) {
  const south=Math.min(a.lat,b.lat)-0.025, north=Math.max(a.lat,b.lat)+0.025;
  const west=Math.min(a.lon,b.lon)-0.025, east=Math.max(a.lon,b.lon)+0.025;
  const query=`[out:json][timeout:35];(way["highway"]["area"!="yes"](${south},${west},${north},${east}););out body;>;out skel qt;`;
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let data=null, lastError=null;
  for (const endpoint of endpoints) {
    try {
      const response=await fetch(endpoint,{method:'POST',body:query,headers:{'Content-Type':'text/plain;charset=UTF-8'}});
      if(!response.ok) throw new Error(`Road data server returned ${response.status}`);
      data=await response.json(); break;
    } catch(e) {lastError=e;}
  }
  if(!data) throw new Error(`Could not download Chennai road data. ${lastError?.message||''} Please retry in a moment.`);
  const nodes=new Map(), ways=[];
  data.elements.forEach(el=>{if(el.type==='node')nodes.set(el.id,{id:el.id,lat:el.lat,lon:el.lon});else if(el.type==='way'&&el.nodes?.length>1)ways.push(el);});
  const graph=new Map();
  const add=(id,edge)=>{if(!graph.has(id))graph.set(id,[]);graph.get(id).push(edge);};
  for(const way of ways) {
    const tags=way.tags||{};
    if(['no','private'].includes(tags.access)) continue;
    const speed=roadSpeed(tags), oneway=['yes','1','true'].includes(tags.oneway);
    for(let i=0;i<way.nodes.length-1;i++){
      const u=nodes.get(way.nodes[i]),v=nodes.get(way.nodes[i+1]); if(!u||!v)continue;
      const distance=haversine(u,v); if(distance>2500)continue;
      const edge={to:v.id,distance,speed,road:tags.highway||'road'};
      add(u.id,edge);
      if(!oneway)add(v.id,{...edge,to:u.id});
    }
  }
  if(graph.size<20)throw new Error('Not enough road-network data was returned for this area. Try points closer to central Chennai.');
  return {nodes,graph};
}
function nearestNode(point,nodes) {
  let best=null,bestD=Infinity;
  for(const node of nodes.values()) {const d=haversine(point,node);if(d<bestD){bestD=d;best=node;}}
  if(!best||bestD>1800)throw new Error('Selected point is too far from mapped roads. Select a point closer to a road.');
  return best;
}
class MinHeap {
  constructor(){this.a=[]}
  push(item){this.a.push(item);let i=this.a.length-1;while(i>0){let p=(i-1)>>1;if(this.a[p].priority<=item.priority)break;this.a[i]=this.a[p];i=p;}this.a[i]=item;}
  pop(){if(!this.a.length)return null;const root=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(true){let l=i*2+1,r=l+1,s=i;if(l<this.a.length&&this.a[l].priority< (s===i?last.priority:this.a[s].priority))s=l;if(r<this.a.length&&this.a[r].priority<(s===i?last.priority:this.a[s].priority))s=r;if(s===i)break;this.a[i]=this.a[s];i=s;}this.a[i]=last;}return root;}
  get size(){return this.a.length;}
}
function searchGraph(graph,nodes,startNode,endNode,algorithm,traffic) {
  const dist=new Map([[startNode.id,0]]), came=new Map(), closed=new Set(), heap=new MinHeap();
  const goal={lat:endNode.lat,lon:endNode.lon};
  const heuristic=id=>haversine(nodes.get(id),goal);
  heap.push({id:startNode.id,priority:algorithm==='astar'?heuristic(startNode.id)/22:heuristic(startNode.id)});
  let found=false, expanded=0;
  while(heap.size&&expanded<250000) {
    const current=heap.pop(); if(closed.has(current.id))continue;
    if(current.id===endNode.id){found=true;break;}
    closed.add(current.id);expanded++;
    for(const edge of graph.get(current.id)||[]) {
      if(closed.has(edge.to))continue;
      // Estimated travel-time cost; congestion is a user-selected demonstration multiplier.
      const cost=(edge.distance/edge.speed)*traffic;
      const candidate=(dist.get(current.id)||0)+cost;
      if(candidate<(dist.get(edge.to)??Infinity)) {
        dist.set(edge.to,candidate);came.set(edge.to,current.id);
        const priority=algorithm==='astar'?candidate+heuristic(edge.to)/22:heuristic(edge.to);
        heap.push({id:edge.to,priority});
      }
    }
  }
  if(!found)return null;
  const ids=[endNode.id];let cursor=endNode.id;
  while(cursor!==startNode.id){cursor=came.get(cursor);if(cursor===undefined)return null;ids.push(cursor);}
  ids.reverse();
  let distance=0;
  for(let i=1;i<ids.length;i++){const prev=ids[i-1],cur=ids[i];const edge=(graph.get(prev)||[]).find(e=>e.to===cur);if(edge)distance+=edge.distance;}
  return {ids,coords:ids.map(id=>[nodes.get(id).lat,nodes.get(id).lon]),distance,time:dist.get(endNode.id),expanded};
}
function clearRoutes(){routeLayers.forEach(l=>map.removeLayer(l));routeLayers=[];$('routeCards').hidden=true;$('emptyState').hidden=false;$('resultStatus').textContent='AWAITING LOCATIONS';}
function formatDistance(m){return m>=1000?`${(m/1000).toFixed(2)} km`:`${Math.round(m)} m`;}
function formatTime(seconds){const mins=Math.max(1,Math.round(seconds/60));return mins>=60?`${Math.floor(mins/60)} h ${mins%60} min`:`${mins} min`;}
function drawRoute(result,color,name,weight){if(!result)return null;const layer=L.polyline(result.coords,{color,weight,opacity:.9,lineCap:'round',lineJoin:'round'}).addTo(map);layer.bindPopup(`${name} · ${formatDistance(result.distance)} · ${formatTime(result.time)}`);routeLayers.push(layer);return layer;}
$('calculate').onclick=async()=>{
  if(!start||!end){alert('Please select both an accident location and a destination hospital.');return;}
  if(haversine(start,end)<30){alert('Choose two different locations.');return;}
  $('loading').hidden=false;$('calculate').disabled=true;$('loadingText').textContent='Downloading road network from OpenStreetMap…';
  try {
    const {nodes,graph}=await loadRoadGraph(start,end);
    $('loadingText').textContent='Running A* and Greedy Best-First Search…';
    const s=nearestNode(start,nodes),t=nearestNode(end,nodes),traffic=Number($('traffic').value);
    const a=searchGraph(graph,nodes,s,t,'astar',traffic);
    const g=searchGraph(graph,nodes,s,t,'greedy',traffic);
    if(!a&&!g)throw new Error('No connected road route found. Try selecting locations closer to central Chennai roads.');
    clearRoutes();
    const al=drawRoute(a,'#168ee4','A* route',6),gl=drawRoute(g,'#9a6de1','Greedy route',4);
    if(a){$('aDistance').textContent=formatDistance(a.distance);$('aTime').textContent=formatTime(a.time);}
    if(g){$('gDistance').textContent=formatDistance(g.distance);$('gTime').textContent=formatTime(g.time);}
    $('routeCards').hidden=false;$('emptyState').hidden=true;$('resultStatus').textContent='ANALYSIS COMPLETE';
    const note=a&&g?`A* expanded ${a.expanded.toLocaleString()} nodes; Greedy expanded ${g.expanded.toLocaleString()} nodes. A* uses accumulated travel cost plus a distance heuristic. Greedy prioritizes only estimated distance to the destination. These are estimated times using road-class speed assumptions and your selected traffic multiplier.`:'Only one algorithm found a connected route in the downloaded road graph.';
    $('analysisNote').textContent=note;
    const layers=[al,gl].filter(Boolean);if(layers.length){const group=L.featureGroup(layers);map.fitBounds(group.getBounds().pad(.15));lastBounds=group.getBounds();}
    $('mapHint').textContent='Routes calculated on downloaded OpenStreetMap road graph';
  } catch(err){alert(err.message||'Route calculation failed. Please try again.');}
  finally{$('loading').hidden=true;$('calculate').disabled=false;}
};
$('fitRoutes').onclick=()=>{if(routeLayers.length)map.fitBounds(L.featureGroup(routeLayers).getBounds().pad(.15));};
$('reset').onclick=()=>{
  start=end=null;pickMode=null;
  if(startMarker)map.removeLayer(startMarker);if(endMarker)map.removeLayer(endMarker);
  startMarker=endMarker=null;$('startSelected').textContent='● Accident location not selected';
  $('endSelected').textContent='● Destination hospital not selected';
  $('startSearch').value='';$('endSearch').value='';$('startResults').innerHTML='';$('endResults').innerHTML='';
  clearRoutes();map.setView(CHENNAI,12);$('mapHint').textContent='Choose two points to begin';
};
