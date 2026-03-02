import { formatClock } from '../core';
import { bumpPlayerStat, computeLeaders, initializeBoxScore, sumTeamTotals, validateConsistency } from '../boxScore';
import type { KeyStat, MlsGameState, SimulatorPlugin } from '../types';

const HALF_SECONDS = 45 * 60;
const home = ['L. Messi', 'L. Suarez', 'S. Busquets', 'J. Alba', 'D. Callender'];
const away = ['R. Ruidiaz', 'J. Morris', 'A. Rusnak', 'Y. Gomez', 'S. Frei'];
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));

const buildKeyStats=(g:MlsGameState):KeyStat[]=>{const h=g.boxScore?.teamTotals.home??{}; const a=g.boxScore?.teamTotals.away??{}; const homePass=(h.passAtt??0)>0?((h.passComp??0)/(h.passAtt??1))*100:0;
return [
{label:'Half',value:g.periodLabel},{label:'Clock',value:formatClock(g.matchClock)},{label:'Possession',value:`${g.possessionPctHome.toFixed(0)}% ${g.homeTeam}`},{label:'Shots',value:`${g.shotsHome}-${g.shotsAway}`},{label:'SoT',value:`${g.shotsOnTargetHome}-${g.shotsOnTargetAway}`},{label:'xG',value:`${g.xGHome.toFixed(2)}-${g.xGAway.toFixed(2)}`},{label:'Corners',value:`${g.cornersHome}-${g.cornersAway}`},{label:'Cards',value:`${g.yellowCardsHome+g.redCardsHome}-${g.yellowCardsAway+g.redCardsAway}`},{label:'Pass%',value:`${homePass.toFixed(1)}%`},{label:'Saves',value:`${g.goalkeeperSavesHome}-${g.goalkeeperSavesAway}`}
];};

export const mlsSimulator: SimulatorPlugin={key:'mls',label:'MLS',
createInitialGame:()=>{const boxScore=initializeBoxScore('mls',home,away,['goals','assists','shots','shotsOnTarget','bigChancesMissed','keyPasses','passAtt','passComp','distanceCovered','tackles','interceptions','crosses','saves','highClaims','corners','yellowCards','redCards','xg']);
const g:MlsGameState={sport:'mls',homeTeam:'MIA',awayTeam:'SEA',scoreHome:0,scoreAway:0,period:1,periodLabel:'1H',clockSeconds:HALF_SECONDS,possession:null,lastEvent:'Kickoff from the center circle.',keyStats:[],lastPlay:{type:'kickoff',description:'Kickoff from the center circle.'},matchClock:0,stoppageTime:0,possessionPctHome:50,shotsHome:0,shotsAway:0,shotsOnTargetHome:0,shotsOnTargetAway:0,xGHome:0,xGAway:0,cornersHome:0,cornersAway:0,passesCompletedPctHome:86,passesCompletedPctAway:85,foulsHome:0,foulsAway:0,yellowCardsHome:0,yellowCardsAway:0,redCardsHome:0,redCardsAway:0,bigChancesHome:0,bigChancesAway:0,goalkeeperSavesHome:0,goalkeeperSavesAway:0,boxScore,consistencyIssues:[]};
const l=computeLeaders(boxScore,['goals','assists','shotsOnTarget']); g.teamLeaders=l.teamLeaders; g.gameLeaders=l.gameLeaders; g.keyStats=buildKeyStats(g); return g;},
step:(previous,ctx)=>{const g=structuredClone(previous) as MlsGameState; const tick=ctx.randomInt(12,34); g.clockSeconds=Math.max(0,g.clockSeconds-tick); g.matchClock+=tick; const atkHome=ctx.random()<0.5; const team=atkHome?'home':'away'; const players=atkHome?home:away; const fwd=players[ctx.randomInt(0,1)], mid=players[2], def=players[3], gk=players[4];
players.forEach((p)=>bumpPlayerStat(g.boxScore!,team,p,'distanceCovered',0.12)); bumpPlayerStat(g.boxScore!,team,mid,'passAtt',2); bumpPlayerStat(g.boxScore!,team,mid,'passComp',ctx.random()<0.88?2:1);
let summary=''; let type='sequence'; const r=ctx.random();
if(r<0.1){type='offside'; summary='Offside flag goes up.';}
else if(r<0.18){type='substitution'; summary='Substitution made in midfield.';}
else if(r<0.22){type='injury-time'; g.stoppageTime=Math.min(10,g.stoppageTime+1); summary='Stoppage time extended after injury treatment.';}
else if(r<0.3){type='tackle'; const other=atkHome?'away':'home'; const d=(other==='home'?home:away)[3]; bumpPlayerStat(g.boxScore!,other,d,'tackles',1); summary=`${d} wins a tackle.`;}
else if(r<0.25){type='interception'; const other=atkHome?'away':'home'; const d=(other==='home'?home:away)[3]; bumpPlayerStat(g.boxScore!,other,d,'interceptions',1); summary=`Interception by ${d}.`;}
else if(r<0.35){type='corner'; atkHome?g.cornersHome++:g.cornersAway++; bumpPlayerStat(g.boxScore!,team,mid,'corners',1); summary=`Corner for ${atkHome?g.homeTeam:g.awayTeam}.`;}
else if(r<0.43){type='card'; const other=atkHome?'away':'home'; if(ctx.random()<0.85){other==='home'?g.yellowCardsHome++:g.yellowCardsAway++; bumpPlayerStat(g.boxScore!,other,(other==='home'?home:away)[3],'yellowCards',1);} else {other==='home'?g.redCardsHome++:g.redCardsAway++; bumpPlayerStat(g.boxScore!,other,(other==='home'?home:away)[3],'redCards',1);} summary='Card shown.';}
else { bumpPlayerStat(g.boxScore!,team,fwd,'shots',1); atkHome?g.shotsHome++:g.shotsAway++; bumpPlayerStat(g.boxScore!,team,mid,'keyPasses',1);
if(ctx.random()<0.58){ bumpPlayerStat(g.boxScore!,team,fwd,'shotsOnTarget',1); atkHome?g.shotsOnTargetHome++:g.shotsOnTargetAway++; if(ctx.random()<0.34){type='goal'; bumpPlayerStat(g.boxScore!,team,fwd,'goals',1); bumpPlayerStat(g.boxScore!,team,mid,'assists',1); atkHome?g.scoreHome++:g.scoreAway++; atkHome?g.bigChancesHome++:g.bigChancesAway++; summary=`GOAL by ${fwd}, assisted by ${mid}.`; } else {type='save'; const other=atkHome?'away':'home'; bumpPlayerStat(g.boxScore!,other,(other==='home'?home:away)[4],'saves',1); atkHome?g.goalkeeperSavesAway++:g.goalkeeperSavesHome++; summary=`Save by ${other==='home'?g.homeTeam:g.awayTeam} keeper.`;}}
else {type='shot-miss'; bumpPlayerStat(g.boxScore!,team,fwd,'bigChancesMissed',1); summary=`${fwd} misses the target.`;}
const xg=Number((0.05+ctx.random()*0.35).toFixed(2)); bumpPlayerStat(g.boxScore!,team,fwd,'xg',xg); atkHome?g.xGHome=Number((g.xGHome+xg).toFixed(2)):g.xGAway=Number((g.xGAway+xg).toFixed(2)); }

sumTeamTotals(g.boxScore!); g.boxScore!.teamTotals.home.possPct=g.possessionPctHome; g.boxScore!.teamTotals.away.possPct=100-g.possessionPctHome; g.boxScore!.teamTotals.home.finalThirdEntries=(g.boxScore!.teamTotals.home.keyPasses??0)+(g.boxScore!.teamTotals.home.shots??0); g.boxScore!.teamTotals.away.finalThirdEntries=(g.boxScore!.teamTotals.away.keyPasses??0)+(g.boxScore!.teamTotals.away.shots??0); g.boxScore!.teamTotals.home.bigCreated=g.bigChancesHome; g.boxScore!.teamTotals.away.bigCreated=g.bigChancesAway; g.possessionPctHome=clamp(50+((g.boxScore!.teamTotals.home.passComp??0)-(g.boxScore!.teamTotals.away.passComp??0))*2,30,70);
g.passesCompletedPctHome=((g.boxScore!.teamTotals.home.passAtt??0)>0?((g.boxScore!.teamTotals.home.passComp??0)/(g.boxScore!.teamTotals.home.passAtt??1))*100:0);
g.passesCompletedPctAway=((g.boxScore!.teamTotals.away.passAtt??0)>0?((g.boxScore!.teamTotals.away.passComp??0)/(g.boxScore!.teamTotals.away.passAtt??1))*100:0);
const l=computeLeaders(g.boxScore!,['goals','assists','shotsOnTarget']); g.teamLeaders=l.teamLeaders; g.gameLeaders=l.gameLeaders;
const c=validateConsistency('mls',g.boxScore!,g.scoreHome,g.scoreAway); g.consistencyIssues=c.issues;
if(g.clockSeconds<=0&&g.period<2){g.period=2;g.periodLabel='2H';g.clockSeconds=HALF_SECONDS;summary='Second half begins.';type='half-start';}
g.lastEvent=summary; g.lastPlay={type,description:summary,player:fwd,assister:mid,xg:atkHome?g.xGHome:g.xGAway,isGoal:type==='goal'}; g.keyStats=buildKeyStats(g);
return {game:g,event:{id:ctx.nextId(),summary,periodLabel:g.periodLabel,clockLabel:formatClock(g.clockSeconds),scoreHome:g.scoreHome,scoreAway:g.scoreAway}};
}
};
