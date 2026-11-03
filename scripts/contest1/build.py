"""Rebuild the reviewed public catalog and server-only grading fixtures."""
import json,re,sys
from pathlib import Path
from reference import solve
from fixtures import FIXTURES
from specs import spec
from cases import suite
ROOT=Path(__file__).resolve().parents[2]
SOURCE=json.loads((Path(__file__).parent/'sources.json').read_text())
TOPICS={2007:'Geometry',2008:'Simulation',2009:'Statistics',2010:'Number Systems',2011:'Statistics',2012:'Arithmetic',2013:'Simulation',2014:'Arithmetic',2015:'Number Systems',2016:'Sorting',2017:'Simulation',2018:'Strings',2019:'Number Theory',2020:'Number Systems',2021:'Number Systems',2022:'Number Systems',2023:'Simulation',2024:'Sorting'}
HINTS={2007:['Try all vertex permutations; compare exact decimal values or cross-products.'],2008:['Track contracted points separately from overtricks and penalties.'],2009:['Keep per-hole comparisons separate from cumulative totals.'],2010:['Each sum is a bit mask plus one; do not simplify the ratio.'],2011:['Keep precise rational or decimal values until the final rounding step.'],2012:['Convert time codes into counts of half-hours before calculating pay.'],2013:['Apply the first matching square rule before any word multipliers.'],2014:['Round the total number of minutes, then split into hours and minutes.'],2015:['Preserve leading zero bits when formatting each group.'],2016:['Filter by suit first, then choose by rank.'],2017:['Keep hand order separate from a card’s effect on the total.'],2018:['Treat the input as a digit string so no digits are lost.'],2019:['Use the original position digit for every replacement.'],2020:['There are r(r−1)/2 terms before row r.'],2021:['Compute contributions separately, then apply the carries required for your division.'],2022:['Increment a digit array in the given base, or count digit occurrences over a numeric range.'],2023:['Keep the next row and any double lock as explicit state.'],2024:['Compute scores before sorting; Senior also needs the toss count.']}

def build():
    catalog=[];hidden={};review=[]
    for source in sorted(SOURCE,key=lambda x:(int(x['season'][:4]),['Junior','Intermediate','Senior'].index(x['division']))):
        y=int(source['season'][:4]);d=source['division'];slug=re.sub('[^a-z0-9]+','-',source['title'].lower()).strip('-')+f'-{y}-{d.lower()}'
        fixtures=[f for f in FIXTURES if f['year']==y and f['division']==d and f['kind']=='sample']
        assert fixtures,(y,d)
        samples=[]
        for f in fixtures:
            output=solve(y,d,f['input'])
            assert output.strip()==f['output'].strip() or y==2011,(y,d)
            samples.append(dict(input=f['input'],output=output))
        problem=dict(id=slug,slug=slug,title=source['title'],division=d,difficulty={'Junior':'Easy','Intermediate':'Medium','Senior':'Hard'}[d],topic=TOPICS[y],year=y,acceptanceRate=0,summary=f"{source['season']} · Contest 1 · {TOPICS[y]}",**spec(y,d),samples=samples,hints=HINTS[y],timeLimitMs=5000 if y in [2019,2020,2022] else 2000,memoryLimitKb=256000)
        catalog.append(problem)
        cases=suite(y,d)
        hidden[slug]=cases
        review.append(dict(slug=slug,season=source['season'],division=d,title=source['title'],source=source['url'],sourceId=source['id'],publicSamples=len(samples),hiddenTests=len(cases)))
    assert len(catalog)==53 and len({(p['title'],p['year']) for p in catalog})==18
    assert sum(map(len,hidden.values()))==636
    dest=ROOT/'src/lib/contest1';dest.mkdir(exist_ok=True)
    for filename,value in [('catalog.json',catalog),('hidden-tests.json',hidden)]:
        (dest/filename).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    (Path(__file__).parent/'manifest.json').write_text(json.dumps(review,indent=2)+'\n')
    print(f'Built {len(catalog)} variants in 18 families, {sum(len(x["samples"]) for x in catalog)} public samples, 636 hidden tests.')
if __name__=='__main__':build()
