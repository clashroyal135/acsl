"""Independent source checks, input-domain validation, and numeric cross-checks."""
import json,re,sys
from pathlib import Path
from fractions import Fraction as F
from collections import Counter
from reference import solve,rows,tokens
from fixtures import FIXTURES
from old_fixtures import old_fixtures
ROOT=Path(__file__).resolve().parents[2]

def validate(y,d,s):
    r=rows(s)
    if y==2007:
        assert len(r)==5 and all(len(x)==6 and all(0<F(v)<=1000000 for v in x) for x in r)
    elif y==2008:
        assert len(r)==5
        for x in r:
            bid,won=map(int,x[1:3] if d=='Senior' else x[:2]);assert 1<=bid<=7 and 0<=won<=13
            if d=='Junior':assert won>=bid+6
    elif y==2009:
        assert len(r)==(4 if d=='Junior' else 9)
        assert all(len(x)==({'Junior':2,'Intermediate':3,'Senior':4}[d]) for x in r)
        assert all(int(v)>0 for x in r for v in x)
        if d=='Junior':assert all(int(x[0]) in [3,4,5] and abs(int(x[0])-int(x[1]))<=2 for x in r)
        else:
            totals=[sum(int(x[i]) for x in r) for i in ([1,2] if d=='Intermediate' else range(4))];assert len(set(totals))==len(totals)
    elif y==2010:
        for x in r:
            if d=='Senior':assert len(x)==2 and all(1<=int(v)<=32 for v in x)
            else:
                fingers=list(map(int,x[1:] if d=='Intermediate' else x));assert fingers[-1]==0 and all(1<=v<=10 for v in fingers[:-1]) and len(fingers[:-1])==len(set(fingers[:-1]))
    elif y==2011:
        assert len(r)==(5 if d=='Junior' else 10)
        for x in r:
            assert 1<=int(x[0])<=10 and 0<F(x[1])<=1000
            if d=='Senior':assert 0<=F(x[2])<=F(x[1])
    elif y==2012:
        assert len(r)==(4 if d=='Junior' else 5)
        for x in r:
            if d=='Junior':assert 1<=int(x[0])<=29;pairs=[x[1:3]]
            elif d=='Intermediate':assert all(100<=int(x[i])<=599 for i in [0,4]) and all(1<=int(x[i])<=7 for i in [1,5]);pairs=[x[2:4],x[6:8]]
            else:assert 100<=int(x[0])<=599 and len(x)==15;pairs=[x[i:i+2] for i in range(1,15,2)]
            assert all(1<=int(a,18)<=int(b,18)<=17 for a,b in pairs)
    elif y==2013:
        assert len(r)==6 and len(r[0])==4 and all(c in 'AEDRBMVYJX' for c in r[0])
        for x in r[1:]:
            placements=[(int(x[0]),'H')] if d=='Junior' else [(int(x[i]),x[i+1]) for i in range(0,len(x),2)]
            for start,direction in placements:
                assert 1<=start<=40 and direction in ['H','V']
                assert ((start-1)%10<=6) if direction=='H' else start<=10
                squares=[start+i*(10 if direction=='V' else 1) for i in range(4)]
                if d!='Senior':assert sum(v%6!=3 and v%5!=0 and (v%7==0 or v%8==0) for v in squares)<=1
    elif y==2014:
        assert len(r)==(6 if d=='Junior' else 5)
        for x in r[1:] if d=='Junior' else r:
            cities='ABCDEFG' if d!='Senior' else 'ABCDEFGHJK';assert x[0] in cities and x[1] in cities and cities.index(x[0])<cities.index(x[1])
        if d=='Junior':assert all(F(v)>0 for v in r[0])
    elif y==2015:
        assert len(r)==5
        for i,x in enumerate(r):
            if d=='Intermediate' and i in [2,3]:assert all(re.fullmatch('[01]{3}',v) for v in x)
            elif d=='Intermediate' and i==4:assert all(re.fullmatch('[r-][w-][x-]',v) for v in x)
            else:assert all(v in '01234567' for v in x)
            if d=='Senior':assert int(x[0]) in [0,1,2,4]
    elif y==2016:
        assert len(r)==5
        for x in r:
            cards=[''.join(x[i:i+2]) for i in range(0,12,2)] if d=='Junior' else x
            assert len(cards)==6 and all(len(c)==2 and c[1] in 'CDHS' and c[0] in ('123456789' if d=='Junior' else 'A23456789TJQK') for c in cards)
            if d=='Intermediate' and not any(c[1]==cards[0][1] for c in cards[1:]):assert Counter(c[0] for c in cards[1:])[min(cards[1:],key=lambda c:'A23456789TJQK'.index(c[0]))[0]]==1
    elif y==2017:
        assert len(r)==(6 if d=='Senior' else 5)
        hands=r[0] if d=='Senior' else []
        for x in r[1:] if d=='Senior' else r:
            assert len(x)==11 and 0<=int(x[0])<=99
            assert all(c in ('0123456789' if d=='Junior' else '23456789TJQKA') for c in x[1:])
            assert max(Counter(hands+x[1:]).values())<=4
    elif y==2018:
        assert len(r)==5
        for x in r:
            assert re.fullmatch('[1-9][0-9]{0,49}',x[0])
            if d!='Junior':assert 1<=int(x[1])<=(len(x[0]) if d=='Intermediate' else 50)
    elif y==2019:
        assert len(r)==5
        for x in r:assert 0<int(x[0])<10**15 and 1<=int(x[1])<=len(x[0])
        if d=='Junior':assert all(0<int(x[2])<=10**9 for x in r)
        if d!='Senior':assert all(not x.startswith('0') for x in solve(y,d,s).splitlines())
    elif y==2020:
        limit={'Junior':100000,'Intermediate':262144,'Senior':16777216}[d];base={'Junior':10,'Intermediate':8,'Senior':16}[d]
        assert len(r)==5 and all(0<int(a,base)<limit and 0<int(b,base)<limit and 0<int(c)<limit for a,b,c in r)
    elif y==2021:
        assert len(r)==5 and all(len(''.join(x))==5 and set(''.join(x))<=set('RGBCMYW' if d=='Senior' else 'RGBW') for x in r)
        if d=='Junior':
            for x in r:assert sum(w for c,w in zip(''.join(x),[1,1,2,3,5]) if c in 'RB')<12 and sum(w for c,w in zip(''.join(x),[1,1,2,3,5]) if c in 'GB')<12
    elif y==2022:
        for n,b,start in r:assert 1<=int(n)<=100000 and 2<=int(b)<=(16 if d=='Senior' else 9) and 1<=len(start)<=16 and int(start,int(b))>0
    elif y==2023:
        lines=s.splitlines();assert len(lines)==(2 if d=='Intermediate' else 3)
        assert 0<=int(lines[0])<=9999
        if d=='Intermediate':assert len(lines[0])==4 and '0' not in lines[0]
        for index,line in enumerate(lines[1:]):
            vals=line.split();assert (1 if index==0 else 0)<=len(vals)<=50
            for v in vals:assert 0<=int(v)<=99 and (d=='Senior' or len(v)==2 and '0' not in v)
    elif y==2024:
        lines=s.splitlines()
        if d=='Junior':assert len(lines)==2 and all(1<=len(line)<=100 and set(line)<=set('AROGB') for line in lines)
        else:
            allowed=set('A R O G B AO OB BG GR'.split())
            if d=='Senior':assert 1<=int(lines[0])<=100 and len(lines)==int(lines[0])+1;allowed|={'OA','BO','GB','RG'};lines=lines[1:]
            else:assert len(lines)==3 and all(len(line)<=100 for line in lines)
            for line in lines:assert 1<=len(line.split())<=100 and all(v.rstrip('+') in allowed and (not v.endswith('+') or d=='Senior') for v in line.split())

# This counts a whole numeric interval by positional cycles; the authoring solver
# increments each individual number. It independently checks long starts and carries.
def histogram_to(n,b):
    if n<1:return [0]*b
    counts=[0]*b;p=1
    while p<=n:
        higher=n//(p*b);current=(n//p)%b;lower=n%p
        for digit in range(b):
            if digit==0:
                if higher:counts[0]+=(higher-1)*p+(p if current else lower+1)
            else:counts[digit]+=higher*p+(p if current>digit else lower+1 if current==digit else 0)
        p*=b
    return counts

def independent(y,d,s):
    if y==2022:
        answers=[]
        for nn,bb,ss in rows(s):
            n=int(nn);b=int(bb);start=int(ss,b);hi=histogram_to(start+n-1,b);lo=histogram_to(start-1,b);counts=[a-z for a,z in zip(hi,lo)]
            answers.append(str(sum(i*c for i,c in enumerate(counts)) if d=='Junior' else counts[-1] if d=='Intermediate' else max(counts)))
        return '\n'.join(answers)+'\n'
    if y==2024:
        points={'A':1,'R':1,'O':3,'G':3,'B':6,'AO':5,'OA':5,'OB':10,'BO':10,'BG':10,'GB':10,'GR':5,'RG':5}
        lines=s.splitlines()
        if d=='Junior':scores=[sum(points[c] for c in line) for line in lines];return ' '.join(map(str,sorted(scores,reverse=True)))+'\n'
        if d=='Intermediate':return ' '.join(map(str,sorted([sum(points[c] for c in line.split()) for line in lines],reverse=True)))+'\n'
        entries=[]
        for i,line in enumerate(lines[1:],1):
            ts=line.split();score=sum(points[t.replace('+','')]+(2 if '+' in t else 0) for t in ts);entries.append((-score,len(ts),i))
        return ' '.join(f'{i}-{-score}' for score,tosses,i in sorted(entries))+'\n'
    if y==2021:
        table={'W':(0,0,0),'R':(1,0,0),'G':(0,1,0),'B':(0,0,1),'C':(0,1,1),'M':(1,0,1),'Y':(1,1,0)}
        answers=[]
        for r in rows(s):
            raw=[0,0,0]
            for c,w in zip(''.join(r),[1,1,2,3,5]):
                v=table[c] if d=='Senior' else ((1,1,0) if c=='B' else table[c])
                for i in range(3):raw[i]+=v[i]*w*(1 if i==0 else 5)
            raw[1]+=raw[2]//60;raw[2]%=60;raw[0]+=raw[1]//60;raw[1]%=60;raw[0]%=12
            answers.append(':'.join(f'{x:02d}' for x in raw[:3 if d=='Senior' else 2]))
        return '\n'.join(answers)+'\n'
    if y==2020:
        answers=[]
        for a,b,rr in rows(s):
            base={'Junior':10,'Intermediate':8,'Senior':16}[d];start=int(a,base);delta=int(b,base);r=int(rr);before=r*(r-1)//2
            if d=='Junior':
                # Digital roots along an arithmetic progression repeat every 9 terms.
                values=[]
                for i in range(9):
                    v=start+(before+i)*delta
                    while v>9:v=sum(map(int,str(v)))
                    values.append(v)
                result=(r//9)*sum(values)+sum(values[:r%9])
            elif d=='Intermediate':result=sum(sum(map(int,format(start+(before+i)*delta,'o'))) for i in range(r))
            else:
                # Sum the global sequence prefix differences, then reduce hex digits.
                end=before+r
                result=end*start+delta*end*(end-1)//2-(before*start+delta*before*(before-1)//2)
                while result>15:result=sum(int(c,16) for c in format(result,'X'))
                result=format(result,'X')
            answers.append(str(result))
        return '\n'.join(answers)+'\n'
    if y==2018:
        answer=[]
        for index,line in enumerate(s.splitlines()):
            row=line.split();number=row[0]
            if d=='Junior':value=[lambda:len(number),lambda:sum(map(int,number)),lambda:sum(int(number[i]) for i in range(0,len(number),2)),lambda:sum(ch=='4' for ch in number),lambda:int(number[(len(number)+1)//2-1])][index]()
            else:
                n=int(row[1]);value=0
                if d=='Intermediate':
                    window=int(number[:n]);value=window
                    for char in number[n:]:window=(window%10**(n-1))*10+int(char);value+=window
                else:
                    padded=number+'0'*((-len(number))%n)
                    for i in range(0,len(padded),n):value+=int(padded[i:i+n])
            answer.append(str(value))
        return '\n'.join(answer)+'\n'
    return None

def main():
    catalog=json.loads((ROOT/'src/lib/contest1/catalog.json').read_text());hidden=json.loads((ROOT/'src/lib/contest1/hidden-tests.json').read_text());manifest=json.loads((Path(__file__).parent/'manifest.json').read_text());lookup={f['slug']:f for f in manifest}
    source_cases=FIXTURES+old_fixtures()
    for fixture in source_cases:
        actual=solve(fixture['year'],fixture['division'],fixture['input'])
        assert actual.strip()==fixture['output'].strip(),('source mismatch',fixture,actual)
    checked=0;independent_checks=0
    for problem in catalog:
        y=problem['year'];d=problem['division'];slug=problem['slug'];cases=hidden[slug]
        assert len(cases)==12 and len({c['input'] for c in cases})==12
        for case in cases:
            try:validate(y,d,case['input'])
            except Exception as e:raise AssertionError(('invalid hidden input',slug,case['input'])) from e
            assert solve(y,d,case['input'])==case['expectedOutput'],slug
            other=independent(y,d,case['input'])
            if other is not None:assert other==case['expectedOutput'],('independent mismatch',slug,case,other);independent_checks+=1
            assert case['hidden'] is True
            checked+=1
        for sample in problem['samples']:assert solve(y,d,sample['input'])==sample['output']
    assert len(catalog)==53 and checked==636 and len({(p['title'],p['year']) for p in catalog})==18
    assert all(len([f for f in source_cases if f['year']==p['year'] and f['division']==p['division']])>=1 for p in catalog)
    report=dict(problemGroups=18,divisionVersions=53,sourceFixtures=len(source_cases),publicSamples=sum(len(p['samples']) for p in catalog),hiddenCases=checked,independentNumericChecks=independent_checks,invalidInputs=0,outputMismatches=0)
    (Path(__file__).parent/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
