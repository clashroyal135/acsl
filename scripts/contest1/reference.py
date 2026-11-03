"""Trusted authoring-time reference solvers. Never imported by application code."""
from collections import Counter, deque
from fractions import Fraction as F
from itertools import permutations
from math import gcd
import random, re


def tokens(s): return re.split(r'[,\s]+', s.strip()) if s.strip() else []
def rows(s): return [tokens(line) for line in s.strip().splitlines() if line.strip()]
def rounded(x):
    x=F(x)
    return (x.numerator*2+x.denominator)//(2*x.denominator) if x>=0 else -rounded(-x)
def money(x):
    cents=rounded(F(x)*100)
    return f'${cents//100}.{cents%100:02d}'
def par(x): return 'par' if x==0 else f'{abs(x)} {"under" if x<0 else "over"} par'
def clock_minutes(n,padded=True):
    n=rounded(n)
    return f'{n//60:02d}:{n%60:02d}' if padded else f'{n//60}:{n%60:02d}'
def base_digits(n,b):
    if n==0:return [0]
    out=[]
    while n: n,r=divmod(n,b);out.append(r)
    return out[::-1]


def triangles(d,s):
    out=[]
    for row in rows(s):
        a=list(map(F,row[:3]));b=list(map(F,row[3:]))
        if d=='Junior':out.append(str(sum((Counter(a)&Counter(b)).values())));continue
        if d=='Senior' and any(sum(t)<=2*max(t) for t in [a,b]):out.append('NOT VALID');continue
        edges={frozenset('DE'):b[0],frozenset('EF'):b[1],frozenset('DF'):b[2]}
        answer='NONE'
        for p in permutations('DEF'):
            mapped=[edges[frozenset(p[i]+p[j])] for i,j in [(0,1),(1,2),(0,2)]]
            match=mapped==a if d=='Intermediate' else len({mapped[i]/a[i] for i in range(3)})==1
            if match:answer=''.join(p);break
        out.append(answer)
    return out


def bridge(d,s):
    under=[0,0];over=[0,0];vulnerable=[False,False];out=[]
    for r in rows(s):
        if d=='Senior':team,bid,won=map(int,r[:3]);team-=1;suit=r[3];v=vulnerable[team]
        else:bid,won=map(int,r[:2]);suit=r[2];v=d=='Intermediate' and r[3]=='V';team=0
        if won>=bid+6:
            rate=20 if suit in 'CD' else 30
            low=bid*rate+(10 if suit in 'NT' else 0)
            high=(won-bid-6)*rate
            under[team]+=low;over[team]+=high
        else:
            low=0;high=(bid+6-won)*(100 if v else 50)
            over[1-team]+=high
        if d=='Senior':
            out.append(f'{under[0]} {over[0]} {under[1]} {over[1]}')
            if under[team]>=100:under=[0,0];vulnerable[team]=True
        else:out.append(f'{low} {high}')
    return out


def golf(d,s):
    a=[list(map(int,r)) for r in rows(s)]
    if d=='Junior':return [{-2:'eagle',-1:'birdie',0:'par',1:'bogey',2:'double bogey'}[score-p] for p,score in a]+[par(sum(v-p for p,v in a))]
    if d=='Intermediate':
        total=[sum(r[i] for r in a) for i in (1,2)];best=0 if total[0]<total[1] else 1;worst=1-best;p=sum(r[0] for r in a)
        return [f'{total[best]} {total[worst]}',par(total[best]-p),par(total[worst]-p),str(sum(r[best+1]<r[worst+1] for r in a)),str(max(sum(r[1:]) for r in a))]
    total=[sum(r[i] for r in a) for i in range(4)];order=sorted(range(4),key=lambda i:total[i]);best=order[0];vals=sorted(v for r in a for v in r)
    median=F(vals[17]+vals[18],2)
    return [par(total[1]-36),par(total[0]-36),str(sum(r[best]<min(r[:best]+r[best+1:]) for r in a)),' '.join('ABCD'[i] for i in order),str(median.numerator) if median.denominator==1 else str(float(median))]


def prints(d,s):
    henry={i:2**(4-(i-1)//2) for i in range(1,11)}
    out=[]
    for r in rows(s):
        if d=='Senior':
            num,den=map(int,r);fingers=[i for i in range(1,11) if ((num-1) if i%2==0 else (den-1)) & henry[i]]
            out.append(' '.join(map(str,fingers)) if fingers else 'None');continue
        system=r.pop(0) if d=='Intermediate' else 'H';fingers=list(map(int,r));assert fingers[-1]==0;fingers=fingers[:-1]
        if system=='H':num=1+sum(henry[i] for i in fingers if i%2==0);den=1+sum(henry[i] for i in fingers if i%2)
        else:num=1+sum(2**(5-i) for i in fingers if i<=5);den=1+sum(2**(10-i) for i in fingers if i>5)
        out.append(f'{num}/{den}')
    return out


def draft(d,s):
    r=[list(map(F,x)) for x in rows(s)];annual=[x[1]*1000000/x[0] for x in r];avg=sum(annual)/len(annual)
    if d=='Junior':return list(map(str,[sum(x>10000000 for x in annual),rounded(avg),rounded(min(annual)/16),rounded(max(annual)/18),rounded(avg/16-avg/18)]))
    if d=='Intermediate':return [str(rounded(avg)),f'{rounded(max(annual))} {annual.index(max(annual))+1}',str(rounded((max(annual)-min(annual))/16)),str(rounded((max(annual)+min(annual))/36)),str(rounded(avg/16-avg/18))]
    e16=[((1-y*F('0.03'))*v+y*F('0.03')*g)*1000000 for y,v,g in r]
    e18=[((1-y*F('0.03375'))*v+y*F('0.03375')*g)*1000000 for y,v,g in r]
    order=sorted(annual)
    return [str(rounded((max(annual)-min(annual))/16)),str(rounded((max(annual)+min(annual))/36)),f'{rounded(max(e16))} {e16.index(max(e16))+1}',str(rounded(sum(e18)/len(e18))),str(rounded((order[4]+order[5])/2))]


def timesheets(d,s):
    def hours(a,b):return F(int(b,18)-int(a,18),2)
    def pay(loc,h,day=0):
        group=loc//100
        if group==1:return min(h,5)*10+max(0,h-5)*15
        if group==2:return min(h,6)*F('7.5')+max(0,h-6)*15
        if group==3:return min(h,4)*F('9.25')+max(0,h-4)*F('10.5')
        if group==4:return h*(F('13.5') if day in [1,7] else F('6.75'))
        return min(h,6)*8+max(0,h-6)*12
    out=[];total=0
    for r in rows(s):
        loc=int(r[0])
        if d=='Junior':
            h=hours(*r[1:3]);rate,extra=(10,10) if loc<10 else ((8,12) if loc<20 else (12,24));v=min(h,4)*rate+max(0,h-4)*extra;total+=v
        elif d=='Intermediate':v=pay(loc,hours(*r[2:4]),int(r[1]))+pay(int(r[4]),hours(*r[6:8]),int(r[5]))
        else:
            hs=[hours(*r[i:i+2]) for i in range(1,15,2)];h=sum(hs);group=loc//100
            if group==1:v=min(h,30)*10+max(0,h-30)*15
            elif group==2:v=min(h,40)*F('7.5')+max(0,h-40)*15
            elif group==3:v=min(h,20)*F('9.25')+max(0,h-20)*F('10.5')
            elif group==4:v=sum(pay(loc,h,day) for day,h in enumerate(hs,1))
            else:v=sum(pay(loc,h) for h in hs)
        out.append(money(v))
    if d=='Junior':out.append(money(total))
    return out


LETTER_VALUES=dict(zip('AEDRBMVYJX',[1,1,2,2,3,3,4,4,8,8]))
def scrabble(d,s):
    a=rows(s);word=''.join(a[0]);out=[]
    def score(start,direction):
        total=0;factor=1
        for i,letter in enumerate(word):
            square=start+i*(10 if direction=='V' else 1);assert 1<=square<=40
            value=LETTER_VALUES[letter]
            if square%6==3:value*=2
            elif square%5==0:value*=3
            elif square%7==0:factor*=2
            elif square%8==0:factor*=3
            total+=value
        return total*factor
    for r in a[1:]:
        if d=='Junior':out.append(str(score(int(r[0]),'H')))
        elif d=='Intermediate':out.append(str(score(int(r[0]),r[1])))
        else:out.append(str(max(score(int(r[i]),r[i+1]) for i in range(0,6,2))))
    return out


def maps(d,s):
    a=rows(s);out=[];cities='ABCDEFG' if d!='Senior' else 'ABCDEFGHJK';dist=[450,140,120,320,250,80] if d!='Senior' else [450,140,125,365,250,160,380,235,320]
    positions=[0]
    for x in dist:positions.append(positions[-1]+x)
    if d=='Junior':mpg,price,speed=map(F,a.pop(0))
    for r in a:
        distance=abs(positions[cities.index(r[1])]-positions[cities.index(r[0])])
        if d=='Senior':
            t1=int(r[2])%12+(12 if r[3]=='PM' else 0);t2=int(r[4])%12+(12 if r[5]=='PM' else 0);delta=(t2-t1+12)%24-12;v1,v2=map(F,r[6:8]);t=(distance+delta*v2)/(v1+v2);assert t>=0 and t-delta>=0
            out.append(clock_minutes(t*60,False))
        else:
            if d=='Intermediate':mpg=F({'C':28,'M':25,'F':22,'V':20}[r[2]]);speed=F({'I':65,'H':60,'M':55,'S':45}[r[3]]);price=F(r[4])
            out.append(f'{distance} {clock_minutes(F(distance)*60/speed)} {money(F(distance)*price/mpg)}')
    return out


def chmod(d,s):
    out=[]
    for index,r in enumerate(rows(s)):
        special=0
        if d=='Senior':special=int(r.pop(0))
        if d=='Intermediate' and index in [2,3]:digits=[int(v,2) for v in r]
        elif d=='Intermediate' and index==4:digits=[sum(bit for ch,bit in zip(v,[4,2,1]) if ch!='-') for v in r]
        else:digits=list(map(int,r))
        binary=' '.join(f'{v:03b}' for v in digits);perms=[]
        for i,v in enumerate(digits):
            p=''.join(ch if v&bit else '-' for ch,bit in zip('rwx',[4,2,1]))
            if special&(1<<i) and p[-1]=='x':p=p[:-1]+('t' if i==2 else 's')
            perms.append(p)
        octal=''.join(map(str,digits));perm=' '.join(perms)
        if d=='Intermediate' and index in [2,3]:out.append(f'{octal} and {perm}')
        elif d=='Intermediate' and index==4:out.append(f'{octal} and {binary}')
        else:out.append(f'{binary} and {perm}')
    return out


def agram(d,s):
    out=[];ranks='A23456789TJQK';suits='CDHS'
    for r in rows(s):
        if d=='Junior':r=[''.join(r[i:i+2]) for i in range(0,12,2)]
        rank=lambda card: int(card[0]) if d=='Junior' else ranks.index(card[0])+1
        lead,hand=r[0],r[1:];same=[c for c in hand if c[1]==lead[1]];winners=[c for c in same if rank(c)>rank(lead)]
        pool=winners or same or ([] if d=='Junior' else hand)
        card=min(pool,key=lambda c:(rank(c),suits.index(c[1]))) if pool else 'NONE'
        out.append(' '.join(card) if d=='Junior' and card!='NONE' else card)
    return out


FACE={**{str(i):i for i in range(10)},'T':10,'J':11,'Q':12,'K':13,'A':14}
def ninety(d,s):
    a=rows(s);out=[]
    def move(total,card):
        v=FACE[card];old=total
        if v==9:pass
        elif (d=='Junior' and v==4) or (d!='Junior' and v==10):total-=10
        elif d=='Junior' and v==0:total+=11 if total+11<=99 else 1
        elif d=='Intermediate' and v==14:total+=14 if total+14<=99 else 1
        elif d=='Senior' and v==7:total+=7 if total+7<=99 else 1
        else:total+=v
        if d=='Senior':total+=5*sum(min(old,total)<=b<max(old,total) for b in [33,55,77])
        return total
    if d=='Senior':
        hands0=[a[0][:5],a[0][5:]]
        for r in a[1:]:
            total=int(r[0]);hands=[h.copy() for h in hands0];pile=iter(r[1:]);turn=0
            while True:
                hand=hands[turn];card=sorted(hand,key=lambda c:FACE[c])[2];hand.remove(card);total=move(total,card)
                if total>99:out.append(f'{total} Player #{2-turn}');break
                hand.append(next(pile));turn=1-turn
    else:
        for r in a:
            total=int(r[0]);hand=r[1:4].copy();pile=iter(r[4:])
            while True:
                card=hand.pop(0) if d=='Junior' else max(hand,key=lambda c:FACE[c])
                if d!='Junior':hand.remove(card)
                total=move(total,card)
                if total>99:out.append(f'{total} dealer');break
                hand.append(next(pile));total=move(total,next(pile))
                if total>99:out.append(f'{total} player');break
    return out


def digits(d,s):
    a=rows(s)
    if d=='Junior':
        vals=[r[0] for r in a]
        return list(map(str,[len(vals[0]),sum(map(int,vals[1])),sum(map(int,vals[2][::2])),vals[3].count('4'),int(vals[4][(len(vals[4])-1)//2])]))
    out=[]
    for number,length in a:
        n=int(length)
        if d=='Intermediate':parts=[number[i:i+n] for i in range(len(number)-n+1)]
        else:parts=[number[i:i+n].ljust(n,'0') for i in range(0,len(number),n)]
        out.append(str(sum(map(int,parts))))
    return out


def is_prime(n):
    if n<2:return False
    for p in [2,3,5,7,11,13,17,19,23,29,31,37]:
        if n%p==0:return n==p
    k=n-1;s=0
    while k%2==0:k//=2;s+=1
    for a in [2,325,9375,28178,450775,9780504,1795265022]:
        if a%n==0:continue
        x=pow(a,k,n)
        if x in [1,n-1]:continue
        for _ in range(s-1):
            x=x*x%n
            if x==n-1:break
        else:return False
    return True

def prime_factors(n):
    if n==1:return set()
    if is_prime(n):return {n}
    if n%2==0:return {2}|prime_factors(n//2)
    c=1
    while True:
        x=y=2;g=1
        while g==1:x=(x*x+c)%n;y=(y*y+c)%n;y=(y*y+c)%n;g=gcd(abs(x-y),n)
        if g!=n:return prime_factors(g)|prime_factors(n//g)
        c+=1

def transform(d,s):
    out=[]
    for r in rows(s):
        n=r[0];index=len(n)-int(r[1]);digit=int(n[index])
        if d=='Junior':
            delta=int(r[2]);replacement=str((digit+delta)%10) if digit<5 else str(abs(digit-delta))[0];out.append(n[:index]+replacement+'0'*(len(n)-index-1))
        else:
            left=[str((int(v)+digit)%10 if d=='Intermediate' else int(v)+digit) for v in n[:index]];middle=n[index] if d=='Intermediate' else str(len(prime_factors(int(n))));right=[str(abs(int(v)-digit)) for v in n[index+1:]];out.append(''.join(left)+middle+''.join(right))
    return out


def numeral(d,s):
    out=[];b={'Junior':10,'Intermediate':8,'Senior':16}[d]
    for start,delta,row in rows(s):
        start=int(start,b);delta=int(delta,b);r=int(row);first=start+delta*r*(r-1)//2
        if d=='Junior':value=sum(1+(first+i*delta-1)%9 for i in range(r))
        elif d=='Intermediate':value=sum(sum(base_digits(first+i*delta,8)) for i in range(r))
        else:value=1+(r*(2*first+(r-1)*delta)//2-1)%15
        out.append('0123456789ABCDEF'[value] if d=='Senior' else str(value))
    return out


def fibonacci(d,s):
    out=[]
    for r in rows(s):
        colors=''.join(r);weights=[1,1,2,3,5]
        if d=='Senior':
            h=sum(w for c,w in zip(colors,weights) if c in 'RMY');m=sum(w*5 for c,w in zip(colors,weights) if c in 'GCY');sec=sum(w*5 for c,w in zip(colors,weights) if c in 'BMC');total=(h*3600+m*60+sec)%(12*3600);out.append(f'{total//3600:02d}:{total//60%60:02d}:{total%60:02d}')
        else:
            h=sum(w for c,w in zip(colors,weights) if c in 'RB');m=sum(w*5 for c,w in zip(colors,weights) if c in 'GB')
            if d=='Junior':assert h<12 and m<60
            out.append(f'{(h+m//60)%12:02d}:{m%60:02d}')
    return out


def nextbase(d,s):
    out=[]
    for count,base,start in rows(s):
        count=int(count);base=int(base);start=int(start,base);hist=Counter(v for n in range(start,start+count) for v in base_digits(n,base))
        answer=sum(v*c for v,c in hist.items()) if d=='Junior' else hist[base-1] if d=='Intermediate' else max(hist.values())
        out.append(str(answer))
    return out


def tiles(d,s):
    lines=s.splitlines();ends=list(map(int,lines[0].strip().zfill(4)));hand=[str(int(x)).zfill(2) for x in tokens(' '.join(lines[1:]) if d=='Intermediate' else lines[1])];pile=deque(str(int(x)).zfill(2) for x in tokens(lines[2])) if d=='Senior' else deque();nextrow=0;locked=None;discard=0
    def place(tile):
        nonlocal nextrow,locked
        for i in ([locked] if locked is not None else [(nextrow+k)%4 for k in range(4)]):
            a,b=map(int,tile)
            if ends[i] in [a,b]:
                ends[i]=b if ends[i]==a else a;locked=i if a==b else None;nextrow=(i+1)%4;return True
        return False
    if d=='Intermediate':
        for tile in hand:
            if not place(tile):discard+=sum(map(int,tile))
        return [str(discard)]
    while hand:
        for index,tile in enumerate(hand):
            if place(tile):hand.pop(index);break
        else:
            if not pile:break
            hand.append(pile.popleft())
    return [str(sum(int(ch) for tile in hand for ch in tile))]


RING={'A':1,'R':1,'O':3,'G':3,'B':6}
def rings(d,s):
    lines=s.splitlines()
    if d=='Junior':return [' '.join(map(str,sorted([sum(RING[ch] for ch in line) for line in lines],reverse=True)))]
    def score(line):return sum(sum(RING[ch] for ch in token if ch!='+')+(1 if len(token.rstrip('+'))==2 else 0)+(2 if token.endswith('+') else 0) for token in line.split())
    if d=='Intermediate':return [' '.join(map(str,sorted(map(score,lines),reverse=True)))]
    n=int(lines[0]);results=[(score(line),len(line.split()),i+1) for i,line in enumerate(lines[1:])];assert len(results)==n
    assert len({(x,y) for x,y,_ in results})==n,'unresolved tie'
    return [' '.join(f'{i}-{v}' for v,t,i in sorted(results,key=lambda row:(-row[0],row[1])))]

SOLVERS={2007:triangles,2008:bridge,2009:golf,2010:prints,2011:draft,2012:timesheets,2013:scrabble,2014:maps,2015:chmod,2016:agram,2017:ninety,2018:digits,2019:transform,2020:numeral,2021:fibonacci,2022:nextbase,2023:tiles,2024:rings}
def solve(year,division,data):return '\n'.join(SOLVERS[int(year)](division,data))+'\n'
