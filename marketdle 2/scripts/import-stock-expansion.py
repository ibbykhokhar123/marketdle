"""Reproducible, opt-in Nasdaq snapshot import. No credentials, fake defaults, or runtime fetches."""
from pathlib import Path
import concurrent.futures as cf
import csv, datetime, hashlib, json, re, sys, time, urllib.request
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data/stock-expansion'
RAW=DATA/'raw'
RAW.mkdir(parents=True,exist_ok=True)
AS_OF='2026-10-20'
HEADERS={'User-Agent':'Mozilla/5.0','Accept':'application/json'}

def number(value):
    if value is None or str(value).strip() in ('','N/A','N/A%','--','-','n/a'): return None
    text=str(value).strip().replace('$','').replace(',','').replace('%','')
    if text.startswith('(') and text.endswith(')'): text='-'+text[1:-1]
    try:return float(text)
    except ValueError:return None

def fetch(url,path):
    if path.exists():
        try:return json.loads(path.read_text())
        except ValueError:pass
    for attempt in range(2):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=22) as response:
                result=json.load(response)
            path.write_text(json.dumps(result,separators=(',',':'))+'\n')
            return result
        except Exception as error:
            if attempt==1:return {'data':None,'importError':str(error),'sourceUrl':url}
            time.sleep(.5)

def select():
    base=json.loads((DATA/'baseline.json').read_text())
    rows=json.loads((DATA/'nasdaq-screener.json').read_text())['data']['rows']
    listed={r['Symbol']:r for r in csv.DictReader((DATA/'nasdaqtraded.txt').read_text().splitlines(),delimiter='|') if r.get('Symbol')}
    excluded=[];eligible=[]
    for r in rows:
        symbol=r['symbol'].replace('/','.'); listing=listed.get(symbol);cap=number(r.get('marketCap')) or 0
        reason=None
        if not listing:reason='Not found in official security directory'
        elif listing['ETF']!='N' or listing['Test Issue']!='N':reason='ETF or test issue'
        elif listing['Listing Exchange'] not in ['N','Q','A','P','Z']:reason='Unsupported listing venue'
        elif symbol != 'ITUB' and re.search(r'preferred|notes?\b|debenture|warrant|rights\b|ZONES|\bETN\b',listing['Security Name'],re.I):reason='Preferred/debt/derivative security, not an operating-company common listing'
        elif re.search(r'\bFund\b|\bETF\b|Acquisition Corp|Acquisition Corporation|Portfolio|Shares Trust',listing['Security Name'],re.I):reason='Fund or acquisition vehicle'
        if reason:
            if cap>1e11:excluded.append({'ticker':symbol,'name':r['name'],'marketCapUsd':cap,'reason':reason})
            continue
        eligible.append({**r,'symbol':symbol,'listingExchange':listing['Listing Exchange'],'securityName':listing['Security Name']})
    aliases={'GOOG':'GOOGL','BRK.A':'BRK.B','HEI.A':'HEI','CWEN.A':'CWEN','LBRDK':'LBRDA','LBTYK':'LBTYA','FOX':'FOXA','NWS':'NWSA','UHAL.B':'UHAL','BF.A':'BF.B','Z':'ZG','LEN.B':'LEN'}
    eligible.sort(key=lambda r:number(r.get('marketCap')) or 0,reverse=True)
    canonical=[r for r in eligible if r['symbol'] not in aliases and (number(r.get('marketCap')) or 0)>0]
    selection={r['symbol']:r for r in canonical[:450]}
    # Deliberately add real mid-caps across every source sector, not only mega-caps.
    sectors=sorted({r['sector'] for r in canonical if r.get('sector')})
    for sector in sectors:
        mid=[r for r in canonical if r['sector']==sector and 2e9 <= number(r['marketCap']) < 10e9]
        for r in mid[:10]:selection[r['symbol']]=r
    for ticker in base['originalTickers']:
        r=next((r for r in canonical if r['symbol']==ticker),None)
        if r:selection[ticker]=r
    result={'retrievedDate':AS_OF,'screenerRows':len(rows),'eligibleCompanyRows':len(canonical),'candidates':list(selection.values()),'over100B':[r['symbol'] for r in canonical if number(r['marketCap'])>1e11],'excludedOver100B':excluded,'aliases':aliases}
    (DATA/'selection.json').write_text(json.dumps(result,indent=2)+'\n')
    return result

def download(company):
    ticker=company['symbol'];symbol=urllib.parse.quote(ticker,safe='')
    urls={
        'profile':f'https://api.nasdaq.com/api/company/{symbol}/company-profile',
        'quarterly':f'https://api.nasdaq.com/api/company/{symbol}/financials?frequency=2',
        'history':f'https://api.nasdaq.com/api/quote/{symbol}/historical?assetclass=stocks&fromdate=2020-07-01&todate=2026-10-20&limit=9999',
        'summary':f'https://api.nasdaq.com/api/quote/{symbol}/summary?assetclass=stocks',
    }
    errors=[]
    for kind,url in urls.items():
        result=fetch(url,RAW/f'{ticker}-{kind}.json')
        if not result.get('data'):errors.append(kind)
    return ticker,errors

if __name__=='__main__':
    result=select()
    originals=set(json.loads((DATA/'baseline.json').read_text())['originalTickers'])
    additions=[c for c in result['candidates'] if c['symbol'] not in originals]
    print(json.dumps({'original':len(originals),'selected':len(result['candidates']),'additionsToVerify':len(additions),'over100B':len(result['over100B']),'excludedOver100B':result['excludedOver100B']}),flush=True)
    if '--select-only' not in sys.argv:
        failures=[]
        with cf.ThreadPoolExecutor(max_workers=10) as pool:
            for count,(ticker,errors) in enumerate(pool.map(download,additions),1):
                if errors:failures.append({'ticker':ticker,'unavailable':errors})
                if count%25==0 or count==len(additions):print(json.dumps({'checked':count,'of':len(additions),'withUnavailableSources':len(failures)}),flush=True)
        (DATA/'source-failures.json').write_text(json.dumps(failures,indent=2)+'\n')
