/* ============================================================
   Unfinished, After Hours — page-resets.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!requireAuth()) return;
  var resets = [
    {id:1,featured:true,category:'guilt',label:'Guilt disruptor',time:'3',title:'You Don\'t Need to Earn Rest',desc:'For when you feel like you haven\'t done enough to deserve a break.',timerMsg:'You are allowed to stop. Right now. No earning required.',steps:['Put down whatever you\'re trying to finish.','Say out loud or in your head: "I don\'t need to earn this."','Breathe slowly for 3 minutes. That\'s the whole thing.']},
    {id:2,category:'body',label:'Body reset',time:'2',title:'Unclench Your Jaw',desc:'You\'ve been holding tension there for hours. Let\'s notice it.',timerMsg:'Let your teeth part. Let your tongue drop. That\'s it.',steps:['Notice your jaw right now. Are your teeth touching?','Gently open your mouth, then let it close without pressing.','Place your tongue loosely at the bottom of your mouth.','Hold for 2 minutes. Breathe through your nose.']},
    {id:3,category:'mind',label:'Mind reset',time:'4',title:'Stare at Something Green',desc:'Your brain needs a different input. This is it.',timerMsg:'No analyzing. Just looking.',steps:['Find something green — a plant, outside, an image.','Look at it without trying to think about anything.','If thoughts come, let them pass like clouds.','Just keep looking at the green for 4 minutes.']},
    {id:4,category:'guilt',label:'Guilt disruptor',time:'5',title:'You Don\'t Need to Optimize This Moment',desc:'For the part of you that turns every rest into a task.',timerMsg:'This moment doesn\'t need to produce anything.',steps:['Notice the urge to make this break "useful."','Resist it. Deliberately.','Sit, lie down, or look out a window with zero agenda.','If productivity guilt shows up — just notice it. Don\'t fight it.']},
    {id:5,category:'body',label:'Body reset',time:'3',title:'Drop Your Shoulders',desc:'Check in with where you\'re carrying everything.',timerMsg:'Your shoulders don\'t need to hold all of this.',steps:['Inhale and raise your shoulders toward your ears.','Hold for 3 seconds.','Exhale and let them fall completely.','Repeat 5 times, slower each time.']},
    {id:6,category:'mind',label:'Mind reset',time:'2',title:'Name Five Things',desc:'A simple grounding technique for when everything feels overwhelming.',timerMsg:'You are here. Right now. That\'s enough.',steps:['5 things you can see.','4 things you can physically feel.','3 things you can hear.','2 things you can smell.','1 thing you can taste.']},
    {id:7,category:'exercise',label:'Movement',time:'4',title:'Shake It Out',desc:'Your nervous system stores tension. This is a gentle way to release it.',timerMsg:'Let your body do something your mind isn\'t controlling.',steps:['Stand up if you can, or sit with space around you.','Start shaking your hands loosely.','Let the shaking move up your arms, then your shoulders.','Add a gentle bounce in your knees if standing.','Shake everything for 3–4 minutes.']},
    {id:8,category:'exercise',label:'Movement',time:'3',title:'Three Long Breaths and a Walk',desc:'Even 3 minutes of slow movement resets your nervous system.',timerMsg:'One foot. Then the other. That\'s the whole task.',steps:['Take three very slow, deliberate breaths before you stand.','Get up and walk — outside if possible, around the room if not.','Walk slowly. No destination, no podcast, no phone.','Return when the timer ends, or stay a little longer.']},
    {id:9,category:'exercise',label:'Movement',time:'5',title:'Slow Stretch Without a Goal',desc:'Just noticing where your body is holding things.',timerMsg:'Move toward whatever feels tight. No forcing.',steps:['Sit or stand — whichever feels easier.','Slowly roll your neck side to side. Pause where it\'s tight.','Bring one arm across your chest, hold gently for 20 seconds.','Reach both arms overhead and let your spine lengthen.','Let your body lead. No performance. Just moving through it.']}
  ];

  var currentReset = null, timerInterval = null, secondsLeft = 0;

  window.filterResets = function(cat, btn) {
    document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
    btn.classList.add('active'); renderResets(cat);
  };

  function renderResets(cat) {
    cat = cat||'all';
    var grid = document.getElementById('resetsGrid');
    var filtered = cat==='all' ? resets : resets.filter(function(r){ return r.category===cat; });
    grid.innerHTML = filtered.map(function(r){
      return '<div class="reset-card'+(r.featured?' featured':'')+'" data-id="'+r.id+'">'+
        '<div class="rc-top"><span class="rc-category '+r.category+'">'+r.label+'</span><span class="rc-time">'+r.time+' min</span></div>'+
        '<h3 class="rc-title">'+r.title+'</h3>'+
        '<p class="rc-desc">'+r.desc+'</p>'+
        '<button class="rc-btn">Begin → </button></div>';
    }).join('');
    grid.querySelectorAll('.reset-card').forEach(function(card){
      card.addEventListener('click', function(){ openReset(parseInt(card.dataset.id)); });
    });
  }

  function openReset(id) {
    // Free tier: 3 resets per day (session)
    if (!checkFreeLimit('resets', 3, 'resets-paywall')) return;
    currentReset = resets.find(function(r){ return r.id===id; });
    document.getElementById('m-badge').textContent = currentReset.label+' · '+currentReset.time+' min';
    document.getElementById('m-title').textContent = currentReset.title;
    document.getElementById('m-desc').textContent  = currentReset.desc;
    document.getElementById('m-steps').innerHTML   = currentReset.steps.map(function(s,i){
      return '<div class="step-item"><div class="step-num">'+(i+1)+'</div><p class="step-text">'+s+'</p></div>';
    }).join('');
    document.getElementById('introView').style.display = 'block';
    document.getElementById('timerView').classList.remove('active');
    document.getElementById('modal').classList.add('open');
  }

  window.startTimer = function() {
    secondsLeft = parseInt(currentReset.time)*60;
    document.getElementById('t-title').textContent = currentReset.title;
    document.getElementById('t-msg').textContent   = currentReset.timerMsg;
    document.getElementById('introView').style.display = 'none';
    document.getElementById('timerView').classList.add('active');
    updateTimerDisplay();
    timerInterval = setInterval(function(){ secondsLeft--; updateTimerDisplay(); if(secondsLeft<=0){ clearInterval(timerInterval); endReset(); } }, 1000);
  };

  function updateTimerDisplay() {
    var m=Math.floor(secondsLeft/60), s=secondsLeft%60;
    document.getElementById('timerDisplay').textContent = m+':'+(s<10?'0':'')+s;
  }

  window.endReset   = function(){ clearInterval(timerInterval); closeModal(); };
  window.closeModal = function(e) {
    if (e && e.target!==document.getElementById('modal')) return;
    clearInterval(timerInterval);
    document.getElementById('modal').classList.remove('open');
    document.getElementById('timerView').classList.remove('active');
    document.getElementById('introView').style.display = 'block';
  };

  renderResets('all');
});
