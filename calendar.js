// ============================================================
// КАЛЕНДАРЬ КОМПАНИИ — GITHUB PAGES + БИТРИКС iFRAME
// Автоопределение режима работы
// ============================================================

var MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
              'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

var curDate = new Date();
var appEvents = [];
var bitrixMode = false;

/* === УТИЛИТЫ === */
function pad(n){return n<10?'0':''+n}
function formatDate(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function fmtNice(ds){var p=ds.split('-');return parseInt(p[2])+' '+MONTHS[(parseInt(p[1]))-1].toLowerCase()}
function overlaps(a,b){return a.start<=b.end && a.end>=b.start}

/* === ОПРЕДЕЛЕНИЕ РЕЖИМА === */
function init(){
  if(typeof BX24 !== 'undefined'){
    bitrixMode = true;
    setStatus('integrated');
    
    BX24.init(function(){
      loadFromBitrix().then(renderCalendar);
    });
  } else {
    bitrixMode = false;
    setStatus('standalone');
    loadMockEvents().then(renderCalendar);
  }
  
  // Ресайз при изменении размера окна
  window.addEventListener('resize', function(){
    if(bitrixMode) setTimeout(function(){BX24.fitWindow()},100);
  });
}

function setStatus(mode){
  var chip = document.getElementById('statusChip');
  if(!chip) return;
  if(mode==='integrated'){
    chip.className='status-chip integrated';
    chip.textContent='● Битрикс';
  } else {
    chip.className='status-chip standalone';
    chip.textContent='○ Демо режим';
  }
}

/* === ЗАГРУЗКА ИЗ БИТРИКСА === */
function bxCall(method, params){
  return new Promise(function(resolve, reject){
    BX24.callMethod(method, params, function(result){
      if(result.error()) reject(new Error(result.error()));
      else resolve(result);
    });
  });
}

async function loadFromBitrix(){
  try{
    appEvents=[];
    var today=new Date(); today.setHours(0,0,0,0);
    var from=formatDate(today);
    var toStr=formatDate(new Date(today.getTime()+90*86400000));
    
    console.log('[Календарь] Загрузка из Битрикса');
    console.log('[Календарий] caller_id:', BX24.options?.caller_id);
    
    var calRes = await bxCall('calendars.group.get', {});
    var calendars = calRes.data() || [];
    console.log('[Календарий] Групповых календарей:', calendars.length);
    
    for(var i=0;i<calendars.length;i++){
      var cal=calendars[i];
      if(cal.TYPE!=='group') continue;
      
      try{
        var evRes = await bxCall('calendars.event.get',{
          calendarId:cal.ID, from:from, to:toStr
        });
        var events=evRes.data()||[];
        console.log('[Календарий] "'+cal.NAME+'":'+events.length+' событий');
        for(var j=0;j<events.length;j++) appEvents.push(mapEvent(events[j]));
      } catch(e){console.warn('[Календарий] Ошибка',cal.ID+':',e.message)}
    }
    
    console.log('[Календарий] Итого:',appEvents.length,'событий');
  } catch(e){
    console.error('[Календарий] Критическая ошибка:',e);
    loadMockEvents().then(function(){renderCalendar()});
  }
}

/* === MAP BITRIX EVENT === */
function mapEvent(ev){
  var tp='meet';
  var t=(ev.TYPE||'').toUpperCase();
  if(t.indexOf('MEET')>=0) tp='meet';
  else if(t.indexOf('TASK')>=0||t==='WORK') tp='task';
  else if(t.indexOf('DEAD')>=0) tp='dead';
  else if(t==='ABSENT'||t==='HOLIDAY') tp='hol';
  
  var desc=(ev.DESCRIPTION||'').replace(/<[^>]*>/g,'\n').replace(/\s+/g,' ').trim();
  
  return {
    id:ev.ID,
    title:ev.NAME||'Без названия',
    desc:desc.substring(0,500),
    start:ev.DATE_FROM?ev.DATE_FROM.split(' ')[0]:'',
    end:ev.DATE_TO?ev.DATE_TO.split(' ')[0]:'',
    sTime:ev.DATE_FROM?(ev.DATE_FROM.split(' ')[1]||null):null,
    eTime:ev.DATE_TO?(ev.DATE_TO.split(' ')[1]||null):null,
    type:tp
  };
}

/* === MOCK ДАННЫЕ === */
async function loadMockEvents(){
  try{
    var res=await fetch('assets/events.json');
    var d=await res.json();
    appEvents=d.events||[];
    return;
  }catch(x){console.warn('Не удалось загрузить events.json')}
  
  appEvents=[
    {id:1,title:"Совещание команды",desc:"Еженедельное совещание по статусу проекта",start:"2026-10-06",end:"2026-10-06",sTime:"10:00",eTime:"11:00",type:"meet"},
    {id:2,title:"Дедлайн дизайн",desc:"Сдать макеты главной страницы",start:"2026-10-08",end:"2026-10-08",type:"dead"},
    {id:3,title:"Отпуск Иванова",desc:"Основной отпуск, 14 дней",start:"2026-10-10",end:"2026-10-23",type:"hol"},
    {id:4,title:"Ревью кода",desc:"Проверить pull request #42",start:"2026-10-12",end:"2026-10-12",sTime:"14:00",eTime:"15:00",type:"task"},
    {id:5,title:"Презентация клиенту",desc:"Показать промежуточные результаты",start:"2026-10-15",end:"2026-10-15",sTime:"16:00",eTime:"17:00",type:"meet"},
    {id:6,title:"Хакатон",desc:"Корпоративный хакатон, 24 часа",start:"2026-10-20",end:"2026-10-21",type:"task"},
    {id:7,title:"Дедлайн бэкенд",desc:"Завершить REST API v2",start:"2026-10-25",end:"2026-10-25",type:"dead"},
    {id:8,title:"День рождения Петрова",desc:"Поздравить коллегу!",start:"2026-10-18",end:"2026-10-18",type:"hol"},
    {id:9,title:"Планирование спринта",desc:"Чт-Сб планирование задач",start:"2026-10-08",end:"2026-10-10",sTime:"09:00",eTime:"18:00",type:"task"},
    {id:10,title:"Техническая конференция",desc:"Выступление на конференции",start:"2026-10-27",end:"2026-10-29",type:"meet"}
  ];
}

/* === РЕНДЕР === */
function renderCalendar(){
  var year=curDate.getFullYear(), month=curDate.getMonth();
  document.getElementById('ttl').textContent=MONTHS[month]+', '+year;
  
  var firstDOW=new Date(year,month,1).getDay()-1;
  if(firstDOW<0)firstDOW=6;
  var lastDate=new Date(year,month+1,0).getDate();
  var todayStr=formatDate(new Date());
  
  var fm=year+'-'+pad(month+1)+'-01';
  var lm=year+'-'+pad(month+1)+'-'+lastDate;
  var monthEvts=[];
  for(var i=0;i<appEvents.length;i++){
    var e=appEvents[i];
    if(e.start<=lm&&e.end>=fm)monthEvts.push(e);
  }
  
  var multi=[],singleByDay={};
  for(var i=0;i<monthEvts.length;i++){
    var sd=parseInt(monthEvts[i].start.split('-')[2]);
    if(monthEvts[i].start!==monthEvts[i].end&&sd<=lastDate){multi.push(monthEvts[i])}
    else if(sd>=1&&sd<=lastDate){if(!singleByDay[sd])singleByDay[sd]=[];singleByDay[sd].push(monthEvts[i])}
  }
  
  var numStripRows=assignRows(multi);
  
  // STRIPS
  var sh='<div style="position:relative;height:'+(numStripRows*24)+'px">';
  for(var r=0;r<numStripRows;r++){
    sh+='<div class="strip-row" style="position:absolute;top:'+(r*24)+'px;left:0;right:0;display:grid;grid-template-columns:repeat(7,1fr);height:22px">';
    for(var mi=0;mi<multi.length;mi++){
      var em=multi[mi];if(em._row!==r)continue;
      var sd2=parseInt(em.start.split('-')[2]),ed=parseInt(em.end.split('-')[2]);
      var cs=Math.max(0,sd2-1-firstDOW);
      var vs=Math.max(1,sd2),ve=Math.min(lastDate,ed),sp=Math.max(0,ve-vs+1);
      if(sp>0&&cs>=0&&cs<7){
        sh+='<div class="event-bar eb-'+em.type+'" style="grid-column:'+(cs+1)+' / span '+sp+'" onclick="showEvent('+em.id+')">'+em.title+'</div>';
      }
    }
    sh+='</div>';
  }
  sh+='</div>';
  document.getElementById('stripsArea').innerHTML=sh;
  
  // DAYS GRID
  var dh='';
  for(var p=0;p<firstDOW;p++){
    var prevD=new Date(year,month,-p);
    dh+='<div class="day-cell other"><span class="day-number">'+prevD.getDate()+'</span></div>';
  }
  for(var d=1;d<=lastDate;d++){
    var ds=year+'-'+pad(month+1)+'-'+pad(d);
    var isToday=todayStr===ds?' today':'';
    dh+='<div class="day-cell'+isToday+'"><span class="day-number">'+d+'</span>';
    if(singleByDay[d]){for(var si=0;si<singleByDay[d].length;si++){
      var se=singleByDay[d][si];
      dh+='<div class="single-ev se-'+se.type+'" onclick="showEvent('+se.id+')">'+(se.sTime||'')+se.title+'</div>'}}
    for(var ti=0;ti<multi.length;ti++){
      var ms2=parseInt(multi[ti].start.split('-')[2]),me=parseInt(multi[ti].end.split('-')[2]);
      if(d>=ms2&&d<=me)dh+='<div class="multi-dot md-'+multi[ti].type+'" onclick="showEvent('+multi[ti].id+')" title="'+multi[ti].title+'"></div>'}
    dh+='</div>';
  }
  var tc=firstDOW+lastDate,rem=(7-(tc%7))%7;
  for(var np=1;np<=rem;np++)dh+='<div class="day-cell other"><span class="day-number">'+np+'</span></div>';
  document.getElementById('daysGrid').innerHTML=dh;
}

function assignRows(items){
  var sorted=items.slice().sort(function(a,b){return a.start.localeCompare(b.start)});
  var lastInRow=[];
  for(var i=0;i<sorted.length;i++){
    var placed=-1;
    for(var r=0;r<lastInRow.length;r++){if(!overlaps(sorted[i],lastInRow[r])){placed=r;break}}
    if(placed>=0){lastInRow[placed]=sorted[i]}else{lastInRow.push(sorted[i])}
    sorted[i]._row=lastInRow.indexOf(sorted[i]);
  }
  return lastInRow.length;
}

/* === МОДАЛКА === */
function showEvent(id){
  var ev=null;for(var i=0;i<appEvents.length;i++)if(appEvents[i].id===id){ev=appEvents[i];break}
  if(!ev)return;
  
  document.getElementById('mT').textContent=ev.title;
  var range=ev.start===ev.end?fmtNice(ev.start):fmtNice(ev.start)+' - '+fmtNice(ev.end);
  var time=ev.sTime?' \u2022 '+ev.sTime+' - '+(ev.eTime||''):'';
  document.getElementById('mD').textContent=range+time;
  document.getElementById('mS').textContent=ev.desc||'Без описания';
  
  var btn=document.getElementById('bxOpenBtn');
  if(bitrixMode&&ev.id){btn.style.display='block';btn.onclick=function(){openInBitrix(ev.id)}}
  else{btn.style.display='none'}
  
  document.getElementById('ov').className='overlay show';
}

function openInBitrix(eventId){
  if(!bitrixMode)return;
  if(eventId&&BX24.openPath){
    BX24.openPath('/company/personal/user/'+BX24.options.caller_id+'/calendar/event/'+eventId+'/');
  }
  rm(document.getElementById('ov'));
}

function rm(el){el.className='overlay'}

/* === НАВИГАЦИЯ === */
function chg(delta){curDate.setMonth(curDate.getMonth()+delta);renderCalendar()}
function goToday(){curDate=new Date();renderCalendar();fitWindow()}

function fitWindow(){
  if(!bitrixMode)return;
  setTimeout(function(){if(typeof BX24!=='undefined')BX24.fitWindow()},100);
}

/* PUBLIC API */
window.getBxEvents=function(){return appEvents};
window.isBitrix=function(){return bitrixMode};

/* ЗАПУСК */
init();
