"""Additional independent official test sets extracted from the older worksheets."""
import re,json
from pathlib import Path
from reference import solve
EXPECTED_ROWS={2007:(5,5,5),2008:(5,5,5),2009:(4,9,9),2010:(5,5,5),2011:(5,10,10),2012:(4,5,5),2013:(6,6,6),2014:(6,5,5),2015:(5,5,5),2016:(5,5,5),2017:(5,5,6)}

def canonical(y,d,s):
    s=s.strip()
    if y==2011:return ' '.join(re.sub(r'[^\d ]','',s.replace(',','').replace('by','# ').replace('#',' ')).split())
    if y==2010 and d!='Senior':return re.sub(r'\s*/\s*','/',s)
    s=s.replace(',',' ')
    if y==2015:s=s.replace('-- x','--x')
    if y==2017:s=re.sub(r'^(\d+)\.\s*',r'\1 ',s)
    return ' '.join(s.split())

def old_fixtures():
    result=[]
    for source in json.loads((Path(__file__).parent/'sources.json').read_text()):
        y=int(source['season'][:4]);d=source['division']
        if y>=2018:continue
        tail=source['text'].replace('\r\n','\n').split('TEST INPUT',1)[-1]
        if tail==source['text']:continue
        lines=tail.splitlines()[1:];n=EXPECTED_ROWS[y][['Junior','Intermediate','Senior'].index(d)];ins={};outs={}
        for line in lines:
            m=re.match(r'^\s*(\d+)(?:\.|(?=\s))\s*(.*?)(?:\s{4,}(\d+)[.,]\s*(.*))?$',line)
            if not m:continue
            index=int(m[1]);value=m[2]
            # The original Intermediate Ninety-Nine worksheet mislabels its third input as 5.
            if y==2017 and d=='Intermediate' and m[3]=='3':index=3
            if m[3]:ins[index]=value;outs[int(m[3])]=m[4]
            elif index<=n:ins[index]=value
            else:outs[index]=value
            if len(ins)==n and len(outs)==5:break
        if len(ins)!=n or len(outs)!=5:raise ValueError(('incomplete extraction',y,d,ins,outs))
        inp='\n'.join(re.sub(r'[,\s]+',' ',ins[i]).strip() for i in range(1,n+1))+'\n'
        # Rare original worksheets omit a separator between a rank and suit, or a clock's 10 PM.
        if y==2013:inp=re.sub(r'(\d)([HV])',r'\1 \2',inp)
        out='\n'.join(canonical(y,d,outs[i]) for i in range(1,6))+'\n'
        # The source expressly gives two rounded answers for this minute boundary.
        if y==2014 and d=='Senior':out=out.replace('6:43 or 6:42','6:43')
        result.append(dict(year=y,division=d,input=inp,output=out,kind='source-test'))
    return result
if __name__=='__main__':
    errors=[]
    for f in old_fixtures():
        try:actual=solve(f['year'],f['division'],f['input'])
        except Exception as e:errors.append((f['year'],f['division'],repr(e),f['input']));continue
        if actual.strip()!=f['output'].strip():errors.append((f['year'],f['division'],f['input'],f['output'],actual))
    print('Old source-test sets:',len(old_fixtures()),'errors:',len(errors))
    for e in errors:print(e)
    assert not errors
