export const DEV_BUILDS=[
  {id:'normal',label:'Normal Game Start',sub:'Full normal start flow. No DEV routing or test spawn.',href:'./index.html',kind:'normal'},
  {id:'home',label:'World Home',sub:'Own character shed + private-garden door entry.',href:'./game.html?char=succulent&dev=1&devSpawn=home'},
  {id:'privateGarden',label:'Private Garden',sub:'Direct spawn inside the private garden space.',href:'./game.html?char=succulent&dev=1&devSpawn=privateGarden'},
  {id:'cabin',label:'Cabin / Fishing / Boat',sub:'Cabin, Sigurd, fishing, boat and waterfall route.',href:'./game.html?char=succulent&dev=1&devSpawn=cabin&devFishing=1&devBoat=1'},
  {id:'orangery',label:'Orangery',sub:'Direct spawn at the Orangery.',href:'./game.html?char=succulent&dev=1&devSpawn=orangery'},
  {id:'stable',label:'Stable / Thora',sub:'North Stable outside · locked access · Thora interaction.',href:'./game.html?char=succulent&dev=1&devSpawn=stable'},
  {id:'stableResults',label:'Leaderboard / Result',sub:'Direct non-persistent Result + Standings QA · switch Jumping / Fastest lap without riding.',href:'./game.html?char=succulent&dev=1&devSpawn=stableResults&devResult=jump'},
  {id:'wildlife',label:'Wildlife / Habitat',sub:'Habitat spawning, reactions and animation test.',href:'./game.html?char=succulent&dev=1&devSpawn=meadow&devWildlife=1'},
  {id:'selector',label:'Character Selector',sub:'Open the character selector directly for roster/swipe testing.',href:'./selector.html'}
];
