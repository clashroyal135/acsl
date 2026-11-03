"""Source-derived fixtures, kept independent of the reference implementation."""
import json,re
from pathlib import Path
FIXTURES=[]
def add(y,d,i,o,kind='sample'):
    FIXTURES.append(dict(year=y,division=d,input=i.strip()+'\n',output=o.strip()+'\n',kind=kind))
J,I,S='Junior','Intermediate','Senior'
add(2007,J,'2 3 4 4 3 2\n3 4 5 5 2 3\n2 3 4 2 3 4.5\n2 2 3 3.5 2 2\n2 2 2 1 2 2.5','3\n2\n2\n2\n1')
add(2007,I,'2 3 4 2 3 4\n2 3 4 4 3 2\n2 3 4 3 2 4\n2 3 4 2 3 5\n2 3.5 4 2 4 3.5','DEF\nDFE\nFED\nNONE\nEDF')
add(2007,S,'2 3 4 8 6 4\n2 3 4 4 6 8\n2 3 4 8 4 6\n2 3 4 8 4 5\n2 3 1 9 3 6','DFE\nDEF\nEFD\nNONE\nNOT VALID')
add(2008,J,'2 8 H\n3 10 S\n4 11 D\n3 10 N\n5 13 C','60 0\n90 30\n80 20\n100 30\n100 40')
add(2008,I,'2 8 H V\n2 9 C N\n4 11 T V\n2 6 H V\n5 13 C N','60 0\n40 20\n130 30\n0 200\n100 40')
add(2008,S,'1 2 8 C\n1 1 9 H\n2 4 10 H\n2 2 11 T\n2 3 6 S','40 0 0 0\n70 60 0 0\n70 60 120 0\n0 60 70 90\n0 360 70 90')
add(2009,J,'5 4\n3 5\n4 5\n3 2','birdie\ndouble bogey\nbogey\nbirdie\n1 over par')
# Sample tables below were read from the rendered source PDFs, not their incomplete text exports.
add(2009,I,'3 2 3\n4 5 5\n5 6 6\n4 3 4\n4 3 4\n4 4 5\n5 5 6\n3 3 3\n4 4 5','35 41\n1 under par\n5 over par\n6\n12')
add(2009,S,'3 2 3 3\n4 5 5 6\n5 6 6 4\n4 3 4 4\n4 3 4 4\n4 4 5 4\n5 5 6 6\n3 3 3 4\n4 4 5 5','1 under par\npar\n3\nB A D C\n4')
add(2010,J,'8 7 2 0\n0','19/3\n1/1')
add(2010,I,'H 2 7 8 0\nA 2 7 8 0\nA 0','19/3\n9/13\n1/1')
add(2010,S,'19 3\n1 1','2 7 8\nNone')
DRAFT5='5 57.5\n6 56.5\n6 72\n6 60\n5 51'
DRAFT10=DRAFT5+'\n5 50\n5 49\n5 33.4\n5 23\n5 18.9'
add(2011,J,DRAFT5,'3\n10623333\n588542\n666667\n73773')
add(2011,I,DRAFT10,'8797667\n12000000 3\n513750\n438333\n61095')
add(2011,S,'5 57.5 30\n6 56.5 29\n6 72 34\n6 60 26\n5 51 23\n5 50 21\n5 49 19\n5 33.4 17.177\n5 23 15.6\n5 18.9 13.8','513750\n438333\n65160000 3\n42698237\n9900000')
add(2012,J,'5 9 H\n11 1 7\n19 3 F\n25 2 B','$40.00\n$24.00\n$56.00\n$60.00\n$180.00')
add(2012,I,'125 2 1 7 125 3 5 H\n214 4 1 H 314 5 5 H\n318 1 1 H 319 3 3 D\n423 1 1 7 500 2 5 H\n529 6 1 G 100 4 2 G','$95.00\n$133.00\n$126.50\n$88.50\n$146.00')
add(2012,S,'125 1 7 5 H 3 G 4 E 2 F 1 B 4 A\n214 1 H 5 H 3 G 4 E 2 F 1 B 4 G\n318 1 H 3 D A G 9 E 3 3 1 B 4 A\n423 1 7 5 H 3 G 4 E 2 F 1 B 4 A\n529 1 G 5 H 2 G 4 E 2 F 1 B 2 A','$375.00\n$345.00\n$253.25\n$276.75\n$340.00')
add(2013,J,'J A V A\n1\n2\n4\n12\n21','18\n17\n32\n30\n66')
add(2013,I,'J A V A\n1 V\n2 H\n6 V\n12 H\n21 H','18\n17\n42\n30\n66')
add(2013,S,'J A V A\n1 H 11 H 21 H\n1 V 2 V 3 V\n2 H 12 H 22 H\n3 V 4 V 5 V\n7 H 6 V 17 H','66\n42\n48\n84\n120')
add(2014,J,'25 3.79 50\nA C\nE F\nC G\nB E\nA G','590 11:48 $89.44\n250 05:00 $37.90\n770 15:24 $116.73\n580 11:36 $87.93\n1360 27:12 $206.18')
add(2014,I,'A C M H 3.79\nE F C S 3.69\nB E F M 3.59\nF G V H 3.89\nA G C I 3.63','590 09:50 $89.44\n250 05:33 $32.95\n580 10:33 $94.65\n80 01:20 $15.56\n1360 20:55 $176.31')
add(2014,S,'A C 1 PM 2 PM 50 60\nA D 9 AM 1 PM 50 60\nB E 5 PM 3 PM 50 60\nC F 11 PM 2 AM 50 60\nE K 10 AM 12 PM 65 55','5:55\n8:41\n4:38\n8:22\n12:08')
add(2015,J,'5 2 6\n7 3 0\n4 1 5\n2 3 4\n5 6 7','101 010 110 and r-x -w- rw-\n111 011 000 and rwx -wx ---\n100 001 101 and r-- --x r-x\n010 011 100 and -w- -wx r--\n101 110 111 and r-x rw- rwx')
add(2015,I,'5 2 6\n7 3 0\n100 001 101\n010 011 100\nr-x rw- rwx','101 010 110 and r-x -w- rw-\n111 011 000 and rwx -wx ---\n415 and r-- --x r-x\n234 and -w- -wx r--\n567 and 101 110 111')
add(2015,S,'0 5 2 6\n1 7 3 0\n2 4 1 5\n4 2 3 4\n4 5 6 7','101 010 110 and r-x -w- rw-\n111 011 000 and rws -wx ---\n100 001 101 and r-- --s r-x\n010 011 100 and -w- -wx r--\n101 110 111 and r-x rw- rwt')
add(2016,J,'5 D 2 D 6 H 9 D 9 S 6 H\n4 C 1 C 6 C 7 H 5 S 4 D\n3 D 4 H 5 C 6 S 2 D 1 D\n9 S 8 H 7 C 7 D 9 H 3 H\n1 C 1 D 9 H 8 S 9 S 7 C','9 D\n6 C\n1 D\nNONE\n7 C')
add(2016,I,'5D 2D 6H 9D TD 6S\nTC AC KC QH JS TD\n3D 4H 5C 6S 2D 7H\nKS TH QC 7H 9H 3H\nAC AD KH JS KS QS','9D\nKC\n2D\n3H\nAD')
add(2016,S,'5D 2D 6H 9D TD 6H\nTC AC KC QH JS TD\n3D 4H 5C 6S 2D 7H\nKS TH QC 3D 9H 3H\nAC AD KH AS KS QS','9D\nKC\n2D\n3D\nAD')
add(2017,J,'87 5 8 9 7 4 6 3 9 0 2\n78 2 4 8 3 8 5 0 6 9 8\n85 7 9 7 6 5 9 4 5 0 1\n84 8 4 2 7 9 0 1 9 8 3\n95 9 0 9 0 1 0 1 0 2 5','101 dealer\n100 dealer\n101 dealer\n100 dealer\n100 player')
add(2017,I,'75 7 3 8 8 7 T 5 9 A 6\n80 9 T 7 8 K A 3 5 Q T\n94 4 2 2 7 T 3 A 5 J K\n80 6 6 4 T 9 8 6 5 Q K\n90 T 8 5 9 9 Q K A J 8','103 player\n107 dealer\n110 player\n102 player\n105 dealer')
add(2017,S,'8 9 Q 6 7 K A 5 9 8\n75 J 7 Q T A 6 2 3 4 5\n50 7 K T 8 3 Q 9 7 2 3\n63 3 6 8 T 7 7 T 3 5 8\n79 A 9 7 T A 9 T A 6 4\n50 A T Q A T K J T A 7','107 Player #2\n109 Player #1\n103 Player #1\n100 Player #2\n102 Player #2')

# Newer source PDFs use consistent separate input/output sections or paired lines.
def clean(s):
    s=re.sub(r'20\d\d-20\d\d ●[^\r\n]*','',s)
    s=re.sub(r'^\s*\d+\.\s*','',s,flags=re.M)
    return s.strip()
def modern(source,kind='sample'):
    text=source['text'].replace('\r\n','\n');y=int(source['season'][:4]);d=source['division']
    marker='SAMPLE INPUT' if kind=='sample' else 'TEST INPUT'
    if marker not in text:return
    part=text.split(marker,1)[1]
    # Strip URLs and labels on the marker's line, then preserve data.
    first,*rest=part.split('\n');part='\n'.join(rest)
    part=part.split('TEST DATA',1)[0] if kind=='sample' else part.split('PROBLEM STATEMENT',1)[0]
    part=re.sub(r'20\d\d-20\d\d ●[^\n]*','',part)
    label='SAMPLE OUTPUT' if kind=='sample' else 'TEST OUTPUT'
    inputs=[];outputs=[]
    if label in part:
        ins,outs=part.split(label,1);ins=clean(ins);outs=clean(outs.lstrip(':'))
        outs=re.split(r'20\d\d-20\d\d',outs,maxsplit=1)[0].strip()
        # Ignore content following the numbered output section.
        outlines=[]
        for line in outs.splitlines():
            if not line.strip():continue
            if re.match(r'^(?:PROBLEM|TASK|CONSTRAINTS|DATA PROVIDED|P$)',line):break
            outlines.append(line.strip())
        outs='\n'.join(outlines)
        if y>=2022:
            chunks=re.split(r'(?m)^\s*\d+\.\s*',part.split(label,1)[0].strip())
            inputs=[x.strip() for x in chunks if x.strip()]
            outputs=outs.splitlines()
        else:inputs=[ins];outputs=[outs]
    else:
        # SAMPLE INPUT: SAMPLE OUTPUT: shares a header line; numbered outputs sit to the right.
        ins=[];outs=[]
        for line in part.splitlines():
            match=re.match(r'^(.*?)\s+\d+\.\s+(\S.*?)\s*$',line)
            if match:ins.append(clean(match[1]));outs.append(match[2].strip())
        inputs=['\n'.join(ins)];outputs=['\n'.join(outs)]
    assert len(inputs)==len(outputs) and inputs and all(outputs),(y,d,kind,inputs,outputs)
    for inp,out in zip(inputs,outputs):add(y,d,inp,out,kind)

for source in json.loads((Path(__file__).parent/'sources.json').read_text()):
    if int(source['season'][:4])>=2018:
        modern(source)
        modern(source,'source-test')

if __name__=='__main__':
    from reference import solve
    errors=[];rounding=[]
    for f in FIXTURES:
        try:actual=solve(f['year'],f['division'],f['input'])
        except Exception as e:errors.append((f['year'],f['division'],f['kind'],f['input'],str(e)));continue
        if actual.strip()!=f['output'].strip():
            # The source salary contest explicitly accepts +/- 1 dollar.
            if f['year']==2011 and all(abs(int(a)-int(b))<=1 for a,b in zip(actual.split(),f['output'].split())):rounding.append((f['division'],actual,f['output']))
            else:errors.append((f['year'],f['division'],f['kind'],f['input'],f['output'],actual))
    print('Fixtures:',len(FIXTURES),'salary rounding differences:',len(rounding),'errors:',len(errors))
    for e in errors:print(e)
    assert not errors
