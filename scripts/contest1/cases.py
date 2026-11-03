"""Deterministic, valid hidden-input suites with named boundary coverage."""
import random
from collections import Counter
from itertools import permutations
from reference import solve,base_digits,LETTER_VALUES
J,I,S='Junior','Intermediate','Senior'
DIGITS='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
def show(n,b):return ''.join(DIGITS[x] for x in base_digits(n,b))
def data(lines):return '\n'.join(' '.join(map(str,r)) if isinstance(r,(list,tuple)) else str(r) for r in lines)+'\n'
def randword(rng,n,alphabet):return ''.join(rng.choice(alphabet) for _ in range(n))

def make(y,d,k,rng):
    if y==2007:
        lines=[]
        seeds=[[2,3,4],[2,2,3],[1,1,1],[1,2,3],[1.25,2.5,3.25],[3,4,5],[300000,400000,500000],[0.1,0.2,0.2999]]
        for j in range(5):
            a=list(map(str,seeds[(k+j)%len(seeds)]));b=a.copy();rng.shuffle(b)
            if d==S:
                factor=rng.choice([0.5,1] if max(map(float,a))>100000 else [0.5,2,3,10]);b=[str(float(x)*factor) for x in b]
            if (k+j)%4==2:b[0]=str(float(b[0])+0.75)
            lines.append(a+b)
        return data(lines)
    if y==2008:
        suits='CDHS'+('N' if d==J else 'T');lines=[]
        if d==S:
            seeds=[[1,1,7,'H'],[1,3,9,'H'],[1,1,0,'S'],[2,7,13,'T'],[2,7,0,'D']]
            if k in [7,8,11]:return data(seeds if k==7 else list(reversed(seeds)) if k==8 else [[2,4,10,'H'],[1,1,6,'T'],[2,1,6,'T'],[1,7,13,'D'],[1,7,0,'H']])
        for j in range(5):
            bid=1 if k==0 else 7 if k==1 else rng.randint(1,7);won=rng.randint(bid+6,13) if d==J else rng.choice([0,6,7,13,bid+6,max(0,bid+5)]);suit=suits[j%5]
            r=[bid,won,suit]
            if d==I:r+=['V' if (k+j)%2 else 'N']
            if d==S:r=[1+(k+j)%2]+r
            lines.append(r)
        return data(lines)
    if y==2009:
        if d==J:
            diffs=[-2,-1,0,1,2];return data([[p:=rng.choice([3,4,5]),p+diffs[(k+j)%5]] for j in range(4)])
        while True:
            a=[[rng.randint(3,5),rng.randint(1,10),rng.randint(1,10)] for _ in range(9)] if d==I else [[rng.randint(1,10) for _ in range(4)] for _ in range(9)]
            if k==3:a[0]=[4,4,4] if d==I else [4]*4
            totals=[sum(row[i] for row in a) for i in ([1,2] if d==I else range(4))]
            if len(set(totals))==len(totals):return data(a)
    if y==2010:
        sets=[[],list(range(1,11)),[2,4,6,8,10],[1,3,5,7,9],[1],[10],[1,2],[2,7,8],rng.sample(range(1,11),rng.randint(0,10)),[2,4,6,8,10],[1,3,5,7,9],rng.sample(range(1,11),5)]
        if d==S:
            pairs=[(1,1),(32,32),(32,1),(1,32),(1,17),(2,1),(17,17),(19,3),(25,21),(32,13),(9,32),(10,27)]
            return data([pairs[(k+j)%12] for j in range(5)])
        return data([(['H' if (k+j)%2 else 'A'] if d==I else [])+sets[(k+j)%12]+[0] for j in range(5)])
    if y==2011:
        lines=[]
        for j in range(5 if d==J else 10):
            years=1 if k==3 else 10 if k==4 else rng.randint(1,10)
            value='1000' if k==8 else str(years*10) if k==1 and j%2 else f'{rng.randint(1,999)}.{rng.randint(0,999):03d}'
            r=[years,value]
            if d==S:r+=['0' if k==6 else value if k==7 else str(round(float(value)*rng.random(),3))]
            lines.append(r)
        return data(lines)
    if y==2012:
        def shift():
            start=rng.randint(1,17);end=rng.randint(start,17)
            if k==0:end=start
            elif k==1:start=1;end=2
            elif k==2:start=1;end=17
            elif k in [3,4]:start=1;end=[9,10][k-3]
            return [DIGITS[start],DIGITS[end]]
        if d==J:return data([[rng.choice([1,9,10,19,20,29])]+shift() for _ in range(4)])
        if d==I:return data([[100+((k+j)%5)*100,rng.randint(1,7)]+shift()+[199+((k+j+1)%5)*100,rng.randint(1,7)]+shift() for j in range(5)])
        return data([[100+((k+j)%5)*100]+sum([shift() for _ in range(7)],[]) for j in range(5)])
    if y==2013:
        word='AAAA' if k==0 else 'XXXX' if k==1 else randword(rng,4,list(LETTER_VALUES));positions=[]
        for direction in ['H','V']:
            for start in range(1,41):
                if direction=='H' and (start-1)%10>6:continue
                if direction=='V' and start>10:continue
                squares=[start+i*(10 if direction=='V' else 1) for i in range(4)]
                multipliers=sum(x%6!=3 and x%5!=0 and (x%7==0 or x%8==0) for x in squares)
                if d==S or multipliers<=1:positions.append([start,direction])
        if d==J:positions=[p for p in positions if p[1]=='H']
        chosen=[rng.choice(positions) for _ in range(15 if d==S else 5)]
        return data([list(word)]+([sum(chosen[j:j+3],[]) for j in range(0,15,3)] if d==S else [[p[0]] if d==J else p for p in chosen]))
    if y==2014:
        if d==J:
            mpg=20+k;price=f'{1+k%6}.{rng.randint(0,99):02d}';speed=37+k
            return data([[mpg,price,speed]]+[sorted(rng.sample(list('ABCDEFG'),2)) for _ in range(5)])
        if d==I:return data([sorted(rng.sample(list('ABCDEFG'),2))+[rng.choice('CMFV'),rng.choice('IHMS'),f'{1+k%6}.{rng.randint(0,99):02d}'] for _ in range(5)])
        lines=[]
        for j in range(5):
            c1,c2=rng.choice([('A','K'),('B','J'),('C','H'),('A','G'),('E','K')]);hour1=rng.choice([0,11,12,23]);delta=[0,1,-1,2,-2][(k+j)%5];hour2=(hour1+delta)%24
            clock=lambda h:[h%12 or 12,'PM' if h>=12 else 'AM']
            lines.append([c1,c2]+clock(hour1)+clock(hour2)+[rng.choice([45,50,55,60,65]),rng.choice([45,50,55,60,65])])
        return data(lines)
    if y==2015:
        values=[[0,0,0],[7,7,7],[1,1,1],[4,4,4],[2,2,2],[0,1,2],[3,5,6],[2,4,6],[7,0,1],[1,7,0],[0,1,7],[rng.randrange(8) for _ in range(3)]]
        lines=[]
        for j in range(5):
            v=values[(k+j)%12]
            if d==S:v=[rng.choice([0,1,2,4])]+v
            if d==I and j in [2,3]:v=[f'{x:03b}' for x in v]
            if d==I and j==4:v=[''.join(c if x&b else '-' for c,b in zip('rwx',[4,2,1])) for x in v]
            lines.append(v)
        return data(lines)
    if y==2016:
        ranks='123456789' if d==J else 'A23456789TJQK';deck=[v+c for v in ranks for c in 'CDHS'];lines=[]
        for j in range(5):
            while True:
                cards=rng.sample(deck,6);lead,hand=cards[0],cards[1:]
                if d==I and not any(c[1]==lead[1] for c in hand) and sum(c[0]==min(hand,key=lambda c:ranks.index(c[0]))[0] for c in hand)>1:continue
                break
            if d==J:cards=[ch for card in cards for ch in card]
            lines.append(cards)
        return data(lines)
    if y==2017:
        alphabet='0123456789' if d==J else '23456789TJQKA'
        deck=list(alphabet*4)
        if d==S:
            for attempt in range(10000):
                hands=rng.sample(deck,10);games=[]
                for j in range(5):
                    for _ in range(10000):
                        total=[99,98,90,33,55,77,78,56,34,65,80,95][(k+j)%12];remaining=deck.copy()
                        for card in hands:remaining.remove(card)
                        draw=rng.sample(remaining,10);candidate=data([hands,[total]+draw])
                        # Repeat the initial hands for an independent single-game validity check.
                        try:solve(y,d,candidate)
                        except (StopIteration,IndexError):continue
                        games.append([total]+draw);break
                    else:break
                if len(games)==5:return data([hands]+games)
            raise ValueError('could not generate senior card game')
        games=[]
        for j in range(5):
            for _ in range(10000):
                total=[99,98,89,90,94,80,77,78,85,95,88,70][(k+j)%12];cards=rng.sample(deck,10);r=[total]+cards
                try:solve(y,d,data([r]))
                except (StopIteration,ValueError):continue
                games.append(r);break
            else:raise ValueError('no terminating card game')
        return data(games)
    if y==2018:
        vals=['1','9'*50,'44444444444444444444444444444444444444444444444444','10000000000000000000000000000000000000000000000001','135792468','4444','987654321','123456','99999999999999999999999999999999999999999999999999','102030405060708090','12345','10000000000000000000000000000000000000000000000000']
        if d==J:return data([vals[(k+j)%12] for j in range(5)])
        lines=[]
        for j in range(5):
            n=vals[(k+j)%12];length=1 if k==8 else len(n) if k==9 else 50 if d==S and k==10 else rng.randint(1,len(n));lines.append([n,length])
        return data(lines)
    if y==2019:
        nums=[1,9,999999999999989,100000000000001,444444444444444,555555555555555,210,999999999999999,2**46,2*3*5*7*11*13*17,999983,314159265358979];lines=[]
        for j in range(5):
            n=nums[(k+j)%12];p=1 if k%3==1 else len(str(n)) if k%3==2 else rng.randint(1,len(str(n)))
            for attempt in range(1000):
                row=[n,p]+([rng.choice([1,4,5,9,10,54,523,10**9])] if d==J else [])
                answer=solve(y,d,data([row])).strip()
                if d==S or answer[0]!='0':break
                p=1;n=987654321 if d==J else 111111111
            lines.append(row)
        return data(lines)
    if y==2020:
        b={J:10,I:8,S:16}[d];limit={J:99999,I:262143,S:16777215}[d];lines=[]
        for j in range(5):
            start=rng.randint(1,limit);delta=rng.randint(1,limit);r=rng.randint(1,300)
            if k==0:r=1
            if k==1:r=2
            if k==2:start=9 if d==J else b-1;delta=1
            if k==4:start=limit
            if k==5:delta=limit
            if k==10 and j==0:r=limit
            if k==9 and j==0:r=10000
            lines.append([show(start,b),show(delta,b),r])
        return data(lines)
    if y==2021:
        alphabet='RWGB' if d!=S else 'RGBCMYW';edge=['WWWWW','RWWWW','WRWWW','WWWWB','BBBBB','GGGGG','CCCCC','RRRRR','MMMMM','YYYYY','WBBBB','RCMGB'];lines=[]
        for j in range(5):
            value=edge[(k+j)%12]
            if any(c not in alphabet for c in value):value=randword(rng,5,alphabet)
            while d==J:
                try:solve(y,d,value+'\n');break
                except AssertionError:value=randword(rng,5,alphabet)
            lines.append(value if d==S else ' '.join(value))
        return data(lines)
    if y==2022:
        b=2 if k==1 else 16 if d==S and k==2 else 9 if k==2 else rng.randint(2,16 if d==S else 9);n=1 if k==0 else 100000 if k==11 else 10000 if k==9 else rng.randint(2,200);start=b**16-1 if k in [3,4,11] else b**rng.randint(1,8)-1 if k in [1,10] else rng.randint(1,b**5)
        return data([[n,b,show(start,b)]])
    if y==2023:
        if d==I:
            edges=[('1234','12'),('1111','99'),('1234','11 23 34 15'),('1111','11 22 33 12'),('1234','21 32 43 14'),('1234','49 98 87 76'),('1111','12 12 12 12'),('1111','12 23 34 45')]
            if k<len(edges):return data(list(edges[k]))
            return data([randword(rng,4,'123456789'),' '.join(randword(rng,2,'123456789') for _ in range(50 if k==8 else 5+k))])
        edges=[['1234','12','99'],['1111','99',''],['1234','11 23 34 15','12'],['1111','11 22 33','99 98 12'],['1234','21 32 43 14',''],['1234','49 98 87 76',''],['1111','12 12 12 12',''],['0','0','99'],['9999',' '.join(str(rng.randrange(100)) for _ in range(50)),' '.join(str(rng.randrange(100)) for _ in range(50))],['100','99 88 77','66 55 44'],['0','1 2 3 4','0 5 6'],['5923','56 27 73 34 99 45 32 17 64 57 18 11','36 92 22 50 82']]
        return data(edges[k])
    if y==2024:
        if d==J:
            if k==0:return data(['A','R'])
            if k==1:return data(['BG','OB'])
            if k==2:return data(['B'*100,'A'*100])
            if k==3:return data(['AR'*50,'RA'*50])
            if k==4:return data(['B'*99,'B'*100])
            return data([randword(rng,rng.randint(1,100),'AROGB') for _ in range(2)])
        if d==I:
            alphabet=['A','R','O','G','B','AO','OB','BG','GR'];return data([' '.join(rng.choice(alphabet) for _ in range(1 if k==0 else 33 if k==2 else 1+k*2)) for _ in range(3)])
        if k==8:return data([3,'B','O O','A R A R A R'])
        if k==0:return data([1,'A'])
        for _ in range(10000):
            n=100 if k==10 else 1+k%8;alphabet=['A','R','O','G','B','AO','OB','BG','GR','OA','BO','GB','RG'];lines=[str(n)]
            for j in range(n):lines.append(' '.join(rng.choice(alphabet)+('+' if rng.random()<0.4 else '') for _ in range(1+rng.randrange(100 if k==11 else 20))))
            candidate=data(lines)
            try:solve(y,d,candidate);return candidate
            except AssertionError:continue
        raise ValueError('unresolved ring tie')
    raise ValueError(y)

def suite(y,d):
    tests=[];seen=set()
    for k in range(12):
        for attempt in range(100):
            rng=random.Random(y*100000+{'Junior':1,'Intermediate':2,'Senior':3}[d]*10000+k*100+attempt)
            inp=make(y,d,k,rng)
            if inp in seen:continue
            output=solve(y,d,inp);seen.add(inp);tests.append(dict(input=inp,expectedOutput=output,hidden=True));break
        else:raise ValueError(('duplicate case',y,d,k))
    return tests
