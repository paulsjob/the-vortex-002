import { formatClock } from '../core';
import { bumpPlayerStat, computeLeaders, initializeBoxScore, sumTeamTotals, validateConsistency } from '../boxScore';
import type { KeyStat, NhlGameState, SimulatorPlugin } from '../types';

const PERIOD_SECONDS = 20 * 60;
const homeSkaters = ['A. Panarin', 'C. Kreider', 'M. Zibanejad'];
const awaySkaters = ['A. Matthews', 'M. Marner', 'W. Nylander'];
const goalies = { home: 'I. Shesterkin', away: 'J. Woll' };
const clamp = (n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));

const buildKeyStats=(g:NhlGameState):KeyStat[]=>{
  const h=g.boxScore?.teamTotals.home??{}; const a=g.boxScore?.teamTotals.away??{};
  const homeSv=(h.goalieShotsAgainst??0)>0?(h.goalieSaves??0)/(h.goalieShotsAgainst??1):1;
  return [
    {label:'Period',value:g.periodLabel},{label:'Strength',value:g.strengthState},{label:'PP',value:g.ppTimeRemaining>0?formatClock(g.ppTimeRemaining):'--:--'},
    {label:'Goals',value:`${g.scoreHome}-${g.scoreAway}`},{label:'SOG',value:`${g.sogHome}-${g.sogAway}`},{label:'Takeaways',value:`${g.takeawaysHome}-${g.takeawaysAway}`},
    {label:'Blocks',value:`${h.blocks??0}-${a.blocks??0}`},{label:'Goalie SV%',value:homeSv.toFixed(3)},{label:'xG',value:`${g.xGHome.toFixed(2)}-${g.xGAway.toFixed(2)}`},
    {label:'Penalties',value:`${h.penalties??0}-${a.penalties??0}`},
  ];
};

export const nhlSimulator: SimulatorPlugin={
  key:'nhl',label:'NHL',
  createInitialGame:()=>{const boxScore=initializeBoxScore('nhl',[...homeSkaters,goalies.home],[...awaySkaters,goalies.away],['goals','assists','sog','plusMinus','blocks','takeaways','toi','goalieSaves','goalieShotsAgainst','goalieGoalsAgainst','penalties','hits','giveaways','ppGoals','ppOpps','pkKills','pkOpps','foPct','hdc','corsiPct']);
    const g:NhlGameState={sport:'nhl',homeTeam:'NYR',awayTeam:'TOR',scoreHome:0,scoreAway:0,period:1,periodLabel:'P1',clockSeconds:PERIOD_SECONDS,possession:null,lastEvent:'Puck drop at center ice.',keyStats:[],lastPlay:{type:'faceoff',description:'Puck drop at center ice.',playId:0,strength:'EV',xg:0,sog:false,faceoffWinPctHome:50,toiLeader:'A. Panarin'},strengthState:'EV',ppTimeRemaining:0,shotsHome:0,shotsAway:0,sogHome:0,sogAway:0,hitsHome:0,hitsAway:0,faceoffWinPctHome:50,giveawaysHome:0,giveawaysAway:0,takeawaysHome:0,takeawaysAway:0,goalieSavesHome:0,goalieSavesAway:0,pulledGoalie:false,xGHome:0,xGAway:0,scoringChancesHome:0,scoringChancesAway:0,boxScore,consistencyIssues:[]};
    const l=computeLeaders(boxScore,['goals','assists','sog']); g.teamLeaders=l.teamLeaders; g.gameLeaders=l.gameLeaders; g.keyStats=buildKeyStats(g); return g;},
  forceActions:['goal','power-play'],
  forcePlay:(game,ctx,history,action)=>{
    if(action==='goal') return nhlSimulator.step(game,{...ctx,random:()=>0.9,randomInt:(a,b)=>b},history);
    if(action==='power-play') return nhlSimulator.step(game,{...ctx,random:()=>0.25,randomInt:(a,b)=>a},history);
    return nhlSimulator.step(game,ctx,history);
  },
step:(previous,ctx)=>{const g=structuredClone(previous) as NhlGameState; g.clockSeconds=Math.max(0,g.clockSeconds-ctx.randomInt(8,30)); if(g.ppTimeRemaining>0){g.ppTimeRemaining=Math.max(0,g.ppTimeRemaining-ctx.randomInt(8,20)); if(g.ppTimeRemaining===0){ g.strengthState='EV'; g.lastEvent='Power play ends.'; }}
    const attackHome=ctx.random()<0.5; const atk=attackHome?'home':'away'; const shooter=(attackHome?homeSkaters:awaySkaters)[ctx.randomInt(0,2)]; let summary=''; let type='sequence';
    homeSkaters.forEach((p)=>bumpPlayerStat(g.boxScore!,'home',p,'toi',0.3)); awaySkaters.forEach((p)=>bumpPlayerStat(g.boxScore!,'away',p,'toi',0.3));
    const r=ctx.random();
    if(r<0.12){ type='hit'; summary=`Big hit delivered by ${shooter}.`; attackHome?g.hitsHome++:g.hitsAway++; bumpPlayerStat(g.boxScore!,atk,shooter,'hits',1);}
    else if(r<0.2){ type='giveaway'; summary=`Giveaway by ${shooter}.`; attackHome?g.giveawaysHome++:g.giveawaysAway++; bumpPlayerStat(g.boxScore!,atk,shooter,'giveaways',1);}
    else if(r<0.3){ type='penalty'; summary=`Minor penalty on ${attackHome?g.homeTeam:g.awayTeam}.`; bumpPlayerStat(g.boxScore!,atk,shooter,'penalties',1); g.strengthState=attackHome?'PK':'PP'; g.ppTimeRemaining=120; }
    else if(r<0.52){ type='shot-save'; summary=`Shot by ${shooter}, save made.`; if(attackHome){g.shotsHome++;g.sogHome++; bumpPlayerStat(g.boxScore!,'home',shooter,'sog',1); bumpPlayerStat(g.boxScore!,'away',goalies.away,'goalieSaves',1); bumpPlayerStat(g.boxScore!,'away',goalies.away,'goalieShotsAgainst',1); g.goalieSavesAway++; g.xGHome=Number((g.xGHome+0.08+ctx.random()*0.1).toFixed(2));}
      else {g.shotsAway++;g.sogAway++; bumpPlayerStat(g.boxScore!,'away',shooter,'sog',1); bumpPlayerStat(g.boxScore!,'home',goalies.home,'goalieSaves',1); bumpPlayerStat(g.boxScore!,'home',goalies.home,'goalieShotsAgainst',1); g.goalieSavesHome++; g.xGAway=Number((g.xGAway+0.08+ctx.random()*0.1).toFixed(2));} }
    else if(r<0.68){ type='missed-shot'; summary=`${shooter} misses wide.`; if(attackHome)g.shotsHome++; else g.shotsAway++; }
    else if(r<0.84){ type='block'; const blocker=(attackHome?awaySkaters:homeSkaters)[ctx.randomInt(0,2)]; bumpPlayerStat(g.boxScore!,attackHome?'away':'home',blocker,'blocks',1); summary=`${blocker} blocks the attempt.`; if(attackHome)g.shotsHome++; else g.shotsAway++; }
    else { type='goal'; const assister=(attackHome?homeSkaters:awaySkaters)[ctx.randomInt(0,2)]; summary=`GOAL ${attackHome?g.homeTeam:g.awayTeam}! ${shooter} scores.`; if(attackHome){g.scoreHome++;g.shotsHome++;g.sogHome++;g.scoringChancesHome++;g.xGHome=Number((g.xGHome+0.2+ctx.random()*0.2).toFixed(2)); bumpPlayerStat(g.boxScore!,'home',shooter,'goals',1); bumpPlayerStat(g.boxScore!,'home',shooter,'sog',1); if(assister!==shooter) bumpPlayerStat(g.boxScore!,'home',assister,'assists',1); bumpPlayerStat(g.boxScore!,'away',goalies.away,'goalieShotsAgainst',1); bumpPlayerStat(g.boxScore!,'away',goalies.away,'goalieGoalsAgainst',1);} else {g.scoreAway++;g.shotsAway++;g.sogAway++;g.scoringChancesAway++;g.xGAway=Number((g.xGAway+0.2+ctx.random()*0.2).toFixed(2)); bumpPlayerStat(g.boxScore!,'away',shooter,'goals',1); bumpPlayerStat(g.boxScore!,'away',shooter,'sog',1); if(assister!==shooter) bumpPlayerStat(g.boxScore!,'away',assister,'assists',1); bumpPlayerStat(g.boxScore!,'home',goalies.home,'goalieShotsAgainst',1); bumpPlayerStat(g.boxScore!,'home',goalies.home,'goalieGoalsAgainst',1);} }
    if(ctx.random()<0.3){ const p=(attackHome?homeSkaters:awaySkaters)[ctx.randomInt(0,2)]; bumpPlayerStat(g.boxScore!,atk,p,'takeaways',1); attackHome?g.takeawaysHome++:g.takeawaysAway++;}
    g.faceoffWinPctHome=clamp(g.faceoffWinPctHome+(ctx.random()*4-2),35,65);
    sumTeamTotals(g.boxScore!); g.boxScore!.teamTotals.home.foPct=g.faceoffWinPctHome; g.boxScore!.teamTotals.away.foPct=100-g.faceoffWinPctHome; g.boxScore!.teamTotals.home.hdc=g.scoringChancesHome; g.boxScore!.teamTotals.away.hdc=g.scoringChancesAway; g.boxScore!.teamTotals.home.corsiPct=((g.shotsHome+g.scoringChancesHome)/Math.max((g.shotsHome+g.shotsAway+g.scoringChancesHome+g.scoringChancesAway),1))*100; g.boxScore!.teamTotals.away.corsiPct=100-(g.boxScore!.teamTotals.home.corsiPct??50);
    g.pulledGoalie=g.period===3&&g.clockSeconds<120&&Math.abs(g.scoreHome-g.scoreAway)===1;
    const svHome=(g.boxScore!.homePlayers[goalies.home].goalieShotsAgainst??0)>0?(g.boxScore!.homePlayers[goalies.home].goalieSaves??0)/(g.boxScore!.homePlayers[goalies.home].goalieShotsAgainst??1):1;
    if(g.clockSeconds<=0&&g.period<3){g.period++;g.periodLabel=`P${g.period}`;g.clockSeconds=PERIOD_SECONDS;summary=`${g.periodLabel} begins.`;}
    const leaders=computeLeaders(g.boxScore!,['goals','assists','sog']); g.teamLeaders=leaders.teamLeaders; g.gameLeaders=leaders.gameLeaders;
    const c=validateConsistency('nhl',g.boxScore!,g.scoreHome,g.scoreAway,{svHome}); g.consistencyIssues=c.issues;
    g.lastEvent=summary; g.lastPlay={type,description:summary,playId:ctx.nextId(),shooter:(attackHome?homeSkaters:awaySkaters)[ctx.randomInt(0,2)],assister:ctx.random()<0.5?[(attackHome?homeSkaters:awaySkaters)[ctx.randomInt(0,2)]]:undefined,strength:g.strengthState,xg:Number((0.03+ctx.random()*0.4).toFixed(2)),sog:type==='shot-save'||type==='goal',goalieSave:type==='shot-save'?(attackHome?goalies.away:goalies.home):undefined,faceoffWinPctHome:g.faceoffWinPctHome,toiLeader:homeSkaters[0],isGoal:type==='goal'}; g.keyStats=buildKeyStats(g);
    return {game:g,event:{id:ctx.nextId(),summary,periodLabel:g.periodLabel,clockLabel:formatClock(g.clockSeconds),scoreHome:g.scoreHome,scoreAway:g.scoreAway}};
  }
};
