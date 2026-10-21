function dayAfter(day,delta=1){return new Date(Date.parse(day+"T00:00:00Z")+delta*86400000).toISOString().slice(0,10);}
function streaks(activity,today){
  const keys=[...new Set(activity.filter(day=>Number(day.submissions)>0).map(day=>day.day))].sort();
  let longest=0,run=0,previous=null;
  for(const day of keys){run=previous&&dayAfter(previous)===day?run+1:1;longest=Math.max(longest,run);previous=day;}
  const set=new Set(keys);let current=0;
  let cursor=set.has(today)?today:dayAfter(today,-1);
  while(set.has(cursor)){current++;cursor=dayAfter(cursor,-1);}
  return {current,longest,active_days:keys.length};
}
async function contestStandings(db,contestId){
  const [users]=await db.execute(`SELECT DISTINCT u.id,u.name FROM contest_registrations cr INNER JOIN users u ON u.id=cr.user_id WHERE cr.contest_id=?`,[contestId]);
  const [submissions]=await db.execute(`SELECT s.id,s.user_id,s.problem_id,s.verdict,s.submitted_at,TIMESTAMPDIFF(SECOND,c.start_time,s.submitted_at) elapsed_seconds
    FROM submissions s INNER JOIN contests c ON c.id=s.contest_id
    WHERE s.contest_id=? AND s.submitted_at>=c.start_time AND s.submitted_at<COALESCE(c.ended_at,c.end_time)
    AND EXISTS(SELECT 1 FROM contest_problems cp WHERE cp.contest_id=s.contest_id AND cp.problem_id=s.problem_id AND cp.withdrawn_at IS NULL)
    ORDER BY s.submitted_at ASC,s.id ASC`,[contestId]);
  const rows=new Map(users.map(u=>[Number(u.id),{user_id:Number(u.id),solved:0,total_score:0,total_time_minutes:0,total_penalty_minutes:0,last_solve_seconds:null,problems:new Map()}]));
  for(const s of submissions){
    const row=rows.get(Number(s.user_id));if(!row)continue;
    const key=Number(s.problem_id),problem=row.problems.get(key)||{solved:false,wrong:0};row.problems.set(key,problem);
    if(problem.solved)continue;
    if(s.verdict==="Accepted"){
      problem.solved=true;row.solved++;row.total_score+=100;
      row.total_penalty_minutes+=problem.wrong*20;row.total_time_minutes+=Math.floor(Number(s.elapsed_seconds)/60)+problem.wrong*20;
      row.last_solve_seconds=Number(s.elapsed_seconds);
    }else if(["Wrong Answer","Time Limit Exceeded","Runtime Error"].includes(s.verdict))problem.wrong++;
  }
  const result=[...rows.values()].sort((a,b)=>b.solved-a.solved||a.total_time_minutes-b.total_time_minutes||((a.last_solve_seconds??Infinity)===(b.last_solve_seconds??Infinity)?a.user_id-b.user_id:(a.last_solve_seconds??Infinity)<(b.last_solve_seconds??Infinity)?-1:1));
  let rank=0,previous=null;
  return result.map((row,index)=>{if(!previous||row.solved!==previous.solved||row.total_time_minutes!==previous.total_time_minutes||row.last_solve_seconds!==previous.last_solve_seconds)rank=index+1;previous=row;const {problems,...safe}=row;return {...safe,rank};});
}
module.exports={streaks,contestStandings};
