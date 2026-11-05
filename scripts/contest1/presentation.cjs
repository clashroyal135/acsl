// Presentation only: canonical worksheet text, samples and grading data stay untouched.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const katex = require('katex');
const root = path.resolve(__dirname, '../..');
const originals = require('./originals.json');
const catalog = require('../../src/lib/contest1/catalog.json');
const layouts = {};
const prose = markdown => ({type:'prose', markdown});
const table = (caption, columns, rows, widths) => ({type:'table', caption, columns, rows:rows.map(row=>row.map(String)),...(widths?{widths}:{})});
const math = (tex, label) => ({type:'math', tex, label, html:katex.renderToString(tex,{output:'mathml',displayMode:true,throwOnError:true,trust:false,strict:'error'})});
const sentences = new Intl.Segmenter('en', {granularity:'sentence'});
function reflow(text) {
  // Source line breaks are not paragraph boundaries. Keep rules and short text intact.
  if (/^(?:[-*]|\d+\.)\s/.test(text) || text.length < 420) return text;
  const groups=[]; let group='';
  for(const {segment} of sentences.segment(text)) {
    if(group.length>230 && group.length+segment.length>420){groups.push(group.trim());group='';}
    group+=segment;
  }
  if(group)groups.push(group.trim());
  return groups.join('\n\n');
}
function blocks(text, original) {
  return text.trim().split(/\n\n+/).filter(Boolean).map(part=>{
    const img=part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if(img){
      const f=original.figures.find(f=>f.src===img[2]);
      if(!f)throw Error('Unknown figure '+img[2]);
      const buffer=fs.readFileSync(path.join(root,'public',f.src));
      return {type:'figure',src:f.src,alt:f.alt,width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20),displayWidth:Math.round((f.bbox[2]-f.bbox[0])*4/3)};
    }
    return prose(reflow(part));
  });
}
function replaceFigure(list, n, replacement) {
  const i=list.findIndex(b=>b.type==='figure'&&b.src.endsWith('-'+n+'.png'));
  if(i<0)throw Error('Missing figure '+n);
  list.splice(i,1,...replacement);
}
function replaceProse(list, predicate, replacement) {
  const i=list.findIndex(b=>b.type==='prose'&&predicate(b.markdown));
  if(i<0)throw Error('Missing paragraph: '+predicate);
  list.splice(i,1,...replacement);
}
function tileBoard(rows, discard=[]) {return {type:'tiles',rows,discard};}
for(const [slug, original] of Object.entries(originals)) {
  const junior=slug.endsWith('junior'), senior=slug.endsWith('senior');
  let text=original.statement
    .replace(/```text\n([\s\S]*?)\n```/g,(_,body)=>body.replace(/ {2,}/g,' '))
    .replace(/\bquaranteed\b/g,'guaranteed').replace(/\boccuring\b/g,'occurring')
    .replace(/\btossess\b/g,'tosses').replace(/P\s*\n\n?th/g,'Pth').replace(/P th/g,'Pth')
    .replace(/(?<=[\d)])\s*\*\s*(?=[\d(])/g,' × ')
    .replace(/(\d)x(\d)/g,'$1 × $2')
    .replace('“RCMGB’','“RCMGB”')
    .replace('(See https://basbrun.com/2015/05/04/fibonacci-clock/.)','(See [Fibonacci Clock](https://basbrun.com/2015/05/04/fibonacci-clock/).)')
    .replace(/if the\n\nnumber/g,'if the number')
    .replace(/between it\n\nand/g,'between it and').replace(/not a\n\nprime/g,'not a prime');
  // Rejoin extraction-induced bullet continuations, without joining genuine paragraphs.
  text=text.replace(/for having been tossed from a long distance We will/g,'for having been tossed from a long distance.\n\nWe will')
    .replace(/extra points\n\nfor having/g,'extra points for having');
  if(slug.startsWith('digit-reassembly'))text=text.replace(/less than 1050/g,'less than 10⁵⁰');
  if(slug==='acsl-ninety-nine-2017-junior')text=text.replace(/ \* A /g,'\n\n* A ');
  if(slug.startsWith('number-transformation')) {
    text=text.replace(/ Example 2:/g,'\n\n**Example 2:**').replace(/Example 1:/g,'**Example 1:**')
      .replace(/\*\*Example 1:\*\* \. The 2nd N = 7145032, P = 2, D = 8 digit from the right is 3;/,'**Example 1:** N = 7145032, P = 2, D = 8. The 2nd digit from the right is 3;')
      .replace(/Example 2: \. The 3rd N = 1540670, P = 3, D = 54 digit from the right is 6;/,'Example 2: N = 1540670, P = 3, D = 54. The 3rd digit from the right is 6;');
  }
  let list=blocks(text, original);
  if(slug.startsWith('time-sheets')) {
    replaceProse(list,s=>s.startsWith('9:00'),[table('Time codes',['Time','Code'],Array.from({length:17},(_,i)=>{
      const minutes=9*60+i*30,hour=Math.floor(minutes/60);return [`${(hour%12)||12}:${minutes%60?'30':'00'} ${hour<12?'AM':'PM'}`,(i+1).toString(18).toUpperCase()];
    }))]);
  }
  if(slug.startsWith('navigating-acsl')) {
    const distances=senior?[450,140,125,365,250,160,380,235,320]:[450,140,120,320,250,80];
    const cities=senior?'ABCDEFGHJK':'ABCDEFG';
    replaceProse(list,s=>s.startsWith('A to B'),[table('Distances between adjacent cities',['Route','Miles'],distances.map((d,i)=>[`${cities[i]} to ${cities[i+1]}`,d]))]);
    if(!junior&&!senior)replaceProse(list,s=>s.startsWith('Compact'),[
      table('Kinds of cars',['Vehicle (code)','Miles per gallon'],[['Compact (C)',28],['Mid-size (M)',25],['Full-size (F)',22],['Van/SUV (V)',20]]),
      table('Types of roads',['Road (code)','Miles per hour'],[['Interstate (I)',65],['Highway (H)',60],['Main roads (M)',55],['Side roads (S)',45]])
    ]);
  }
  if(slug.startsWith('draft-picks')) {
    const years=[5,6,6,6,5,5,5,5,5,5],values=[57.5,56.5,72,60,51,50,49,33.4,23,18.9],guarantees=[30,29,34,26,23,21,19,17.177,15.6,13.8];
    const first=list.findIndex(b=>b.type==='prose'&&/^1\. /.test(b.markdown));
    let count=0;while(list[first]?.type==='prose'&&/^\d+\. /.test(list[first].markdown)){list.splice(first,1);count++;}
    if(count!==(junior?5:10))throw Error('Draft rows '+slug+' '+count);
    list.splice(first,0,table('First-round draft picks, 2008',senior?['Pick','Years','Value ($ millions)','Guarantee ($ millions)']:['Pick','Years','Value ($ millions)'],years.slice(0,count).map((y,i)=>senior?[i+1,y,values[i],guarantees[i]]:[i+1,y,values[i]]),senior?[15,17,34,34]:[20,25,55]));
    if(senior){
      replaceProse(list,s=>s.startsWith('E='),[math('E=(1-Lp)V+LpG','Expected value'),prose('Here, **L** is the contract length in years, **p** is the chance of injury each year, **V** is the contract value, and **G** is the guaranteed money. Values are in millions of dollars.')]);
      replaceProse(list,s=>s.startsWith('E ='),[
        math('\\begin{aligned}E_{16}&=(0.85)(57.5)\\\\&\\quad+(0.15)(30)\\end{aligned}','16-game seasons'),math('E_{16}=53.375'),prose('That is **$53,375,000** for 16-game seasons.'),
        math('\\begin{aligned}E_{18}&=(0.83125)(57.5)\\\\&\\quad+(0.16875)(30)\\end{aligned}','18-game seasons'),math('E_{18}=52.859375'),prose('That is **$52,859,375** for 18-game seasons.')
      ]);
    }
  }
  if(slug.startsWith('acsl-prints')) {
    const intro=list.filter(b=>b.type==='prose').slice(0,2);
    const henry=[[10,1],[9,1],[8,2],[7,2],[6,4],[1,16],[2,16],[3,8],[4,8],[5,4]];
    list=[...intro,table('Henry Classification System',['Finger','Whorl number'],henry),
      prose('A value called the Primary Group Ratio is calculated as follows:'),
      math('R=\\frac{1+W_{\\mathrm{even}}}{1+W_{\\mathrm{odd}}}'),
      prose('**W_even** is the sum of the Whorl numbers for whorled even-numbered fingers. **W_odd** is the corresponding sum for whorled odd-numbered fingers.'),
      prose('If a whorl is detected on fingers 8, 7 and 2 the calculation would give:'),math('\\frac{1+2+16}{1+2}=\\frac{19}{3}')];
    if(!junior&&!senior)list.push(
      prose('A later system called the Automated Fingerprint Classification System (AFCS) was developed to adapt to computer searches. In this system the right thumb to the right pinky are numbered 1 to 5. The left thumb to left pinky are numbered 6 to 10.'),
      table('Automated Fingerprint Classification System',['Finger','Whorl number'],[16,8,4,2,1,16,8,4,2,1].map((w,i)=>[i+1,w])),
      prose('The Primary Group Ratio is now calculated as follows:'),math('R=\\frac{1+W_{\\mathrm{right}}}{1+W_{\\mathrm{left}}}'),
      prose('**W_right** is the sum of the Whorl numbers for whorled right-hand fingers. **W_left** is the corresponding sum for whorled left-hand fingers.'),
      prose('If a whorl is detected on fingers 8, 7 and 2 the calculation would give:'),math('\\frac{1+8}{1+8+4}=\\frac{9}{13}')
    );
  }
  if(slug.startsWith('acsl-bridge')) {
    replaceFigure(list,1,[table('Points',['Suit','Points'],[
      ['No Trump','40 for the first trick; 30 for each additional trick'],['Hearts or Spades','30 for each trick'],['Clubs or Diamonds','20 for each trick'],
      ...(!junior?[['Vulnerable','100 for each undertrick'],['Not vulnerable','50 for each undertrick']]:[])
    ])]);
    list=list.map(b=>b.type==='prose'&&b.markdown.startsWith('No Trump ')?prose(b.markdown.replace(/^No Trump [\s\S]*?(?=Although|If a player)/,'')):b);
    // The Senior worksheet calls each hand a game in its examples. The match rule
    // (100 below-line points, documented in Input/Output) determines actual resets.
    if(senior)list=list.map(b=>b.type==='prose'?prose(b.markdown.replace(/his team wins a game of that match and gets/g,'his team gets').replace(/the team loses that game of the match and is penalized/g,'the team is penalized')):b);
  }
  if(slug.startsWith('acsl-golf')) {
    if(junior){replaceFigure(list,1,[table('Golf scoring',['Term','Score relative to par'],[['Par','Equal to par'],['Birdie','1 below par'],['Eagle','2 below par'],['Bogey','1 above par'],['Double bogey','2 above par']])]);list=list.filter(b=>!(b.type==='prose'&&b.markdown.startsWith('par a score')));}
    if(senior){
      const i=list.findIndex(b=>b.type==='prose'&&/3,?\s+4,?\s+5,?\s+4/.test(b.markdown));
      if(i>=0)list.splice(i,1,table('Par for each hole',['Hole','Par'],[3,4,5,4,4,4,5,3,4].map((p,i)=>[i+1,p])));
    }
  }
  if(slug.startsWith('acsl-scrabble')) {
    replaceFigure(list,1,[{type:'grid',caption:'4 × 10 game board',rows:Array.from({length:4},(_,r)=>Array.from({length:10},(_,c)=>String(r*10+c+1)))}]);
    list=list.filter(b=>!(b.type==='prose'&&b.markdown.startsWith('1 2 3 4 5')));
    replaceProse(list,s=>s.startsWith('A, E'),[table('Letter values',['Letters','Points'],[['A, E',1],['D, R',2],['B, M',3],['V, Y',4],['J, X',8]])]);
  }
  if(slug.startsWith('acsl-chmod')) {
    const paragraph=list.find(b=>b.type==='prose'&&b.markdown.startsWith('Putting all')).markdown;
    const further=paragraph.indexOf('Further,');
    replaceProse(list,s=>s.startsWith('Putting all'),[prose('Putting all of the above together, **CHMOD 526** gives:'),table('CHMOD 526',['Class','Octal','Binary','Access'],[['Owner',5,'101','r-x'],['Group',2,'010','-w-'],['Others',6,'110','rw-']]),...(further>=0?[prose(reflow(paragraph.slice(further)))]:[])]);
  }
  if(slug.startsWith('numeral-triangles')) {
    const base=senior?16:!junior?8:10;
    const examples=senior?[[10,9,5],[0xabc,15,4]]:[[2,3,5],[221,2,4]];
    // The worksheet's second octal example starts with octal 221, not decimal 221.
    if(!junior&&!senior)examples[1][0]=parseInt('221',8);
    const cards=examples.map(([s,d,r])=>{
      let n=s;const rows=[];
      for(let row=1;row<=r;row++){const values=[];for(let j=0;j<row;j++){let v=n;if(junior)while(v>9)v=String(v).split('').reduce((a,c)=>a+Number(c),0);values.push(v.toString(base).toUpperCase());n+=d;}rows.push(values);}
      return {type:'triangle',caption:`start=${s.toString(base).toUpperCase()}, delta=${d.toString(base).toUpperCase()}, rows=${r}`,rows};
    });
    replaceFigure(list,1,cards);list=list.filter(b=>!(b.type==='prose'&&b.markdown.startsWith('start=')));
  }
  if(slug.startsWith('fibonacci-clock')) {
    replaceFigure(list,senior?3:2,[
      {type:'clock',colors:'RWGBG',time:senior?'01:35:15':'04:50'},
      {type:'clock',colors:senior?'RCMGB':'WBBGR',time:senior?'03:20:40':'08:30'}
    ]);
    if(senior){
      list.find(b=>b.type==='figure'&&b.src.endsWith('-2.png')).displayWidth=300;
      replaceProse(list,s=>s.startsWith('yellow represents'),[table('Overlapping colors',['Color','Represents'],[['Yellow','Hours and minutes'],['Magenta','Hours and seconds'],['Cyan','Minutes and seconds'],['White','Ignored']])]);
    }
  }
  if(slug.startsWith('triangles-2007'))list.find(b=>b.type==='figure').displayWidth=senior?440:400;
  if(slug.startsWith('rings-2024'))list.find(b=>b.type==='figure').displayWidth=240;
  // Some essential rules live in the worksheet's INPUT/OUTPUT sections. Keep
  // those instructions alongside the original prose, while retaining site I/O adapters.
  if(slug.startsWith('triangles-2007'))list.push(prose(junior?
    'For each data line print the largest number of pairs of equal sides that exists when all pairings of the sides are considered. Each side can be paired only once.':
    'The first 3 input numbers are the lengths for the first triangle (△ ABC) in the order **AB, BC, AC**. The last 3 numbers are the lengths for the second triangle (△ DEF) in the order **DE, EF, DF**. A name such as EFD means A corresponds to E, B to F, and C to D.'));
  if(slug==='acsl-bridge-2008-senior')list.push(prose('Both teams start at zero and are not vulnerable. A team becomes vulnerable when it first reaches 100 below-the-line points and stays vulnerable for the remaining hands. Print the totals after each deal, before resetting both below-the-line scores; over-the-line scores are never reset.'));
  if(slug==='acsl-golf-2009-senior')list.push(prose('To find the median of all 36 scores, sort them and average the 18th and 19th values.'));
  if(slug.startsWith('draft-picks'))list.push(prose('The annual salary is the total contract value divided by the length of the contract. Salary per game is the annual salary divided by the number of games in a season. Use unrounded values in these calculations. Round final dollar amounts to the nearest whole dollar, with exact halves rounded up, and do not include thousands separators.'));
  if(slug.startsWith('time-sheets'))list.push(prose('Print pay as dollars and cents, with a dollar sign and exactly two decimal places. Round the complete requested pay to the nearest cent, with exact half cents rounded up.'));
  if(slug.startsWith('navigating-acslland'))list.push(prose(senior?
    'For each input line, find the elapsed time from the **first traveler’s departure** until the meeting. Use the smallest difference between the given clock times. For example, 11 PM followed by 2 AM means the second traveler starts 3 hours later. Round the total elapsed minutes to the nearest minute before formatting.':
    'Round the total travel time to the nearest minute before splitting it into hours and minutes. Round the gasoline cost to the nearest cent. Exact halves round up.'));
  if(slug.startsWith('acsl-agram')){
    if(junior)replaceProse(list,s=>s==='No other cases will be tested in this program.',[prose('If the dealer has no card of the lead suit, print **NONE**, as shown in the sample.')]);
    else list.push(prose('Cards use 2-character strings in value-suit order. **AH** represents the ace of hearts. **T, J, Q, K** represent 10, jack, queen and king. The ace has the **lowest rank** in this game: A, 2, 3, 4, 5, 6, 7, 8, 9, T, J, Q, K.'));
  }
  if(slug==='acsl-ninety-nine-2017-senior')list.push(prose('Choose the median card by face value, before applying any special effect. Count each crossed border using the totals immediately before and after the card’s effect; the extra 5-point bonuses do not cause further border bonuses.'));
  if(slug==='digit-reassembly-2018-junior')list.push(prose('For each line of input, answer the corresponding question below:\n\n1. For Input Line #1, how many digits are in the number?\n2. For Input Line #2, what is the sum of all of the digits in the number?\n3. For Input Line #3, what is the sum of the digits at the odd locations (the leftmost digit is Location #1)?\n4. For Input Line #4, how many times does the digit 4 appear?\n5. For Input Line #5, what is the middle digit? If the length N is even, use position N/2, counting from the left starting at 1 (the left of the two middle digits).'));
  if(slug==='numeral-triangles-2020-senior')list.push(
    prose('For each line of data, print the sum of all of the numbers on the rth row of the Numeral Hex Triangle, transformed into a single hexadecimal digit. To transform the sum, add its digits in base 16. If that sum is more than one hex digit, continue this process until a single hex digit is reached.'),
    prose('For the example with start A, delta 9 and 5 rows, the full numbers in the last row sum to 24E in base 16:'),
    math('2+4+E_{16}=14_{16}'),math('1+4=5')
  );
  if(slug==='next-base-2022-senior')list.push(prose('For bases above 10, the digits A, B, C, D, E and F have values 10, 11, 12, 13, 14 and 15 respectively.'));
  if(slug.startsWith('rings')) {
    // The extracted image and flattened text duplicate one example. Keep searchable text.
    list=list.filter(b=>!(b.type==='figure'&&b.src.endsWith('-2.png')));
    const example=junior?['BRAG\nBOB','15 11']:senior?['3\nA R AO+\nB+ GR OA B\nG OB+','2-24 3-15 1-9']:['GR A B\nOB BG AO O\nR G','28 12 4'];
    replaceProse(list,s=>s.startsWith('Input '),[
      {type:'example',input:example[0],output:example[1]},
      prose(list.find(b=>b.type==='prose'&&b.markdown.startsWith('Input ')).markdown.split('Explanation ')[1])
    ]);
  }
  if(slug.startsWith('acsl-tiles')) {
    const stages=[[[5],[9],[2],[3]],[[5,'56'],[9,'99'],[2,'27'],[3,'37']],senior?[[5,'56','64'],[9,'99','92','23','34','45','57'],[2,'27','71','18'],[3,'37']]:[[5,'56','64'],[9,'99','91','18'],[2,'27','75'],[3,'37']]];
    if(senior)stages.push([[5,'56','64'],[9,'99','92','23','34','45','57'],[2,'27','71','18','82','22'],[3,'37']]);
    for(let i=0;i<stages.length;i++)replaceFigure(list,i+1,[tileBoard(stages[i].map(row=>row.map(String)),!senior&&i>0?(i===1?['34']:['34','45','32']):[])]);
    // Source examples contain worksheet fields on one line; give each field its own box.
    const inputIndex=list.findIndex(b=>b.type==='prose'&&/^\d/.test(b.markdown)&&b.markdown.includes('Output:'));
    if(inputIndex>=0){
      const sample=catalog.find(p=>p.slug===slug).samples[0];
      list.splice(inputIndex,1,{type:'example',input:sample.input.trim(),output:sample.output.trim()});
      if(list[inputIndex+1]?.type==='prose'&&/^\d+ Explanation:/.test(list[inputIndex+1].markdown))list.splice(inputIndex+1,1);
      if(list[inputIndex-1]?.markdown==='Input:')list.splice(inputIndex-1,1);
    }
  }
  if(slug.startsWith('number-transformation')&&!junior) {
    const examples=senior?[
      ['N = 102438, P = 3. There are 4 different prime factors of N (2, 3, 7, 271).',[[1,'1 + 4',5],[0,'0 + 4',4],[2,'2 + 4',6],[4,'4 distinct prime factors',4],[3,'|3 − 4|',1],[8,'|8 − 4|',4]],'546414'],
      ['N = 4329, P = 1. There are 3 different prime factors of N (3, 13, 37).',[[4,'4 + 9',13],[3,'3 + 9',12],[2,'2 + 9',11],[9,'3 distinct prime factors',3]],'1312113']
    ]:[
      ['N = 102439, P = 3.',[[1,'1 + 4',5],[0,'0 + 4',4],[2,'2 + 4',6],[4,'Unchanged',4],[3,'|3 − 4|',1],[9,'|9 − 4|',5]],'546415'],
      ['N = 4329, P = 1.',[[4,'4 + 9 = 13; use units digit',3],[3,'3 + 9 = 12; use units digit',2],[2,'2 + 9 = 11; use units digit',1],[9,'Unchanged',9]],'3219']
    ];
    for(let i=0;i<2;i++){const [parameters,rows,answer]=examples[i];replaceProse(list,s=>s.startsWith(`**Example ${i+1}:**`),[
      prose(`**Example ${i+1}**\n\n${parameters}`),table('Transform each digit from left to right',['Digit','Operation','Result'],rows),prose(`The transformed value is **${answer}**.`)
    ]);}
  }
  // Keep example parameters and calculations distinct from their explanation.
  list=list.map(b=>b.type!=='prose'?b:prose(b.markdown
    .replace(/\bEXAMPLE: /g,'**Example**\n\n')
    .replace(/Example 2: /g,'**Example 2:** ')
    .replace(/The sum is (\d+)\./g,'The sum is **$1**.')
    .replace(/(numbers generated are |numbers formed are )([\d, A-F]+)(\.)/g,'$1\n\n`$2`$3\n\n')
  ));
  layouts[slug]={sourceHash:createHash('sha256').update(original.statement).digest('hex'),blocks:list};
}
fs.writeFileSync(path.join(root,'src/lib/contest1/presentation.json'),JSON.stringify(layouts,null,2)+'\n');
console.log(`Prepared ${Object.keys(layouts).length} statement layouts.`);
