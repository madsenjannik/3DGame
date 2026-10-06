// @ts-nocheck
import { Game } from './core/Game.js?build=HUD-E-DESKTOP-R96-20261006A';
import { characterCatalog } from './data/assetCatalog.js';

async function start() {
  // R78.2: the HTML shell can be browser-cached while main.js is already fresh (it carries a per-run query).
  // Refresh the stylesheet URL from JS so Test HUD D never runs with an older cached styles.css.
  const css=document.querySelector('link[rel="stylesheet"][href*="styles.css"]');
  if(css){const u=new URL(css.getAttribute('href'),location.href);u.searchParams.set('v','HUD-E-DESKTOP-R96-20261006A');css.href=u.pathname.split('/').pop()+u.search;}
  const params=new URLSearchParams(location.search);
  const selectedCharacter=params.get('char');
  if(!selectedCharacter||!characterCatalog[selectedCharacter]){ location.replace('./'); return; }
  document.getElementById('character-selector')?.remove();

  const devMode=params.get('dev')==='1';
  if(devMode){
    const badge=document.getElementById('dev-badge');
    if(badge){document.getElementById('dev-badge-version').textContent='v'+(window.TGW_VERSION?.version||'?')+' · '+(window.TGW_VERSION?.build||'');badge.hidden=false;}
  }
  const game=new Game();
  await game.init({characterId:selectedCharacter,devMode});

  // Developer routing is intentionally invisible in-game. START-PC opens dev-hub.html,
  // which may request a direct spawn. Normal game entry never activates this branch.
  if(devMode){
    const teleport=(x,z,heading=Math.PI)=>{
      game.character.position.set(x,game.world.groundHeight(x,z),z);
      game.character.root.position.copy(game.character.position);
      game.character.heading=heading;game.character.root.rotation.y=heading;
      game.character.velocity.set(0,0,0);game.character.currentSpeed=0;
      game.character.reverseCameraLatched=false;game.character.reverseIntentActive=false;
      game.state.player.position={x:game.character.position.x,y:game.character.position.y,z:game.character.position.z};
      game.followCamera.snap();
    };

    const spawn=params.get('devSpawn');
    if(spawn==='home'){const p=game.homePortal.worldSpawn();teleport(p.x,p.z,p.heading);}
    else if(spawn==='privateGarden'){
      game.world.setSpace('garden');game.wildlife?.setActive?.(false);const p=game.homePortal.gardenSpawn();teleport(p.x,p.z,p.heading);
    }
    else if(spawn==='orangery'){
      const p=game.orangery.devSpawn();teleport(p.x,p.z,p.heading);
    }else if(spawn==='stable'){
      game.stable?.devPrepare?.(false);const p=game.stable.devSpawn(false);teleport(p.x,p.z,p.heading);
    }else if(spawn==='stableResults'){
      game.stable?.devPrepare?.(true);
      const disc=params.get('devResult')==='lap_horse'?'lap_horse':'jump';
      game.stable?.devShowResult?.(disc);
    }else if(spawn){
      const p=game.world.worldLandmarks?.[spawn];if(p)teleport(p.x,p.z,p.heading);
    }

    // Cabin developer entry gets temporary in-memory gear/boat access only.
    // Nothing is written to persistence and no test control is rendered in-game.
    if(params.get('devFishing')==='1'){
      game.fishing.starter=true;game.fishing.own.rodBamboo=1;game.fishing.own.worms=1;game.fishing.renderAll?.();
    }
    if(params.get('devBoat')==='1')game.fishing.setBoatAccess({rented:true});
    if(params.get('devWildlife')==='1')game.wildlife?.enableDevMode?.();
    // Core loop QA: throwaway materials (dev profile is never saved) + console handle.
    if(params.get('devWilds')==='1')for(const id of ['wood','stone','clay','fiber','amber','shell','golden_seed','wild_seed'])game.state.addItem(id,id==='golden_seed'?4:40);
    window.__tgw=game;
  }
}

start().catch(error=>{
  console.error(error);
  const loading=document.getElementById('loading');
  if(loading)loading.innerHTML='<span>Could not start the 3D core. Check the browser console.</span>';
});
