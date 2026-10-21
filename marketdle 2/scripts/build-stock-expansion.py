"""Normalize cached, sourced records. Unavailable facts stay null/N/A; no generated prices."""
from pathlib import Path
import datetime, hashlib, html, importlib.util, json, os, re
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'data/stock-expansion';RAW=DATA/'raw'
spec=importlib.util.spec_from_file_location('stock_import',ROOT/'scripts/import-stock-expansion.py');imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)
num=imp.number
SECTORS={'Consumer Discretionary':'Consumer Cyclical','Consumer Staples':'Consumer Defensive','Finance':'Financial Services','Health Care':'Healthcare','Telecommunications':'Communication Services'}
EXCHANGES={'Q':'NASDAQ','N':'NYSE','A':'NYSE American','P':'NYSE Arca','Z':'Cboe'}

def read(ticker,kind):
    path=RAW/f'{ticker}-{kind}.json'
    try:return json.loads(path.read_text()).get('data') or {}
    except (FileNotFoundError,ValueError):return {}

def value(data,key):return (data.get(key) or {}).get('value')

def clean(text):return html.unescape(re.sub('<[^>]+>','',text or '')).strip()

def financials(ticker):
    table=read(ticker,'quarterly').get('incomeStatementTable') or {}
    headers=table.get('headers') or {}; rows=table.get('rows') or []
    periods=[]
    for key in ['value2','value3','value4','value5']:
        try:periods.append(datetime.datetime.strptime(headers[key],'%m/%d/%Y').date())
        except (KeyError,ValueError):return None,None,None
    # Sum only four real consecutive quarters; never annualize an incomplete listing.
    if any(not 60 <= (a-b).days <= 120 for a,b in zip(periods,periods[1:])):return None,None,None
    if periods[0].isoformat() > '2026-10-20':return None,None,None
    def total(label):
        row=next((r for r in rows if r.get('value1')==label),None)
        if not row:return None
        numbers=[num(row.get(k)) for k in ['value2','value3','value4','value5']]
        # Nasdaq financial tables explicitly use USD thousands; app totals use USD billions.
        return sum(numbers)/1_000_000 if all(v is not None for v in numbers) else None
    return total('Total Revenue'),total('Net Income'),periods[0].isoformat()

def prices(ticker):
    data=read(ticker,'history');table=data.get('tradesTable') or {};rows=table.get('rows') or []
    result={}
    for r in rows:
        try:date=datetime.datetime.strptime(r['date'],'%m/%d/%Y').date().isoformat()
        except (ValueError,KeyError):continue
        close=num(r.get('close'))
        if '2020-07-01' <= date <= '2026-10-20' and close is not None and close>0:result[date]=close
    return [[d,v] for d,v in sorted(result.items())]

def company_name(row,profile):
    name=clean(value(profile,'CompanyName'))
    name=name or row['name']
    name=re.sub(r'\s+(?:Class\s+[A-Z0-9-]+\s+)?(?:Common Stock|Common Shares|Ordinary Shares|American Depositary.*|American Depository.*|ADS.*|Capital Stock|Subordinate Voting Shares|Voting Shares).*','',name,flags=re.I)
    return clean(name)

def anonymize(description, name, ticker):
    core=re.sub(r'\b(?:incorporated|inc|corporation|corp|limited|ltd|plc|holdings?|group|company|co|s\.?a|n\.?v)\b[.,]?', '',name,flags=re.I)
    core=re.sub(r'\s+',' ',core).strip(' ,.-')
    for phrase in [name,core,ticker]:
        if len(phrase)>=2:description=re.sub(r'(?<!\w)'+re.escape(phrase)+r'(?!\w)', 'The company',description,flags=re.I)
    generic={'american','international','united','national','global','general','western','eastern','energy','financial','technology','technologies','bank','capital','partners','holding','holdings','group','insurance','industries','resources','systems','services'}
    words=[word for word in re.findall(r'[A-Za-z]+',core) if len(word)>=4 and word.lower() not in generic]
    # Suppress the distinctive brand token when the provider uses a shorter trade name.
    if words:
        token=max(words,key=len)
        description=re.sub(r'\b'+re.escape(token)+r'\b','the company',description,flags=re.I)
    return description

def atomic_write(path, text):
    temporary=path.with_suffix(path.suffix+'.next')
    try:
        temporary.write_text(text)
        os.replace(temporary,path)
    finally:
        if temporary.exists():temporary.unlink()

def main():
    if not (DATA/'source-failures.json').exists() or not (DATA/'legacy-refresh-sources.json').exists():raise SystemExit('Wait for all source retrieval attempts to finish before normalizing.')
    selected=json.loads((DATA/'selection.json').read_text());old=json.loads((DATA/'legacy-puzzles.json').read_text())['originalCompanies'];originals={c['ticker']:c for c in old}
    aliases={**selected['aliases'],'BBDO':'BBD'}
    candidates=[r for r in selected['candidates'] if r['symbol'] not in aliases]
    facts=json.loads((DATA/'verified-facts.json').read_text())
    histories={};additions=[];overlays={};audit=[];names={}
    for row in candidates:
        ticker=row['symbol'];profile=read(ticker,'profile');name=company_name(row,profile)
        identifier=re.sub(r'[^a-z0-9]','',name.lower())
        if identifier in names and ticker not in originals:
            if ticker not in ['SOMN','NOVTU']:aliases[ticker]=names[identifier]
            continue
        names[identifier]=ticker
        history=prices(ticker);histories[ticker]=history
        revenue,net_income,period=financials(ticker)
        cap=num(row['marketCap'])/1e9;price=num(row['lastsale'])
        summary=read(ticker,'summary').get('summaryData') or {}
        pe=num(value(summary,'PERatio'))
        # A disclosed arithmetic derivation from sourced inputs, never a guessed multiple.
        pe_method='Nasdaq summary'
        if pe is None and net_income is not None and net_income>0:
            pe=cap/net_income;pe_method='market capitalization / verified TTM net income'
        if pe is not None and pe<=0:pe=None
        ipo=num(row.get('ipoyear'));ipo=int(ipo) if ipo is not None and 1700 <= ipo <= 2026 else 'N/A'
        extra=facts.get(ticker,{})
        ipo=extra.get('ipoYear',ipo)
        sector=extra.get('sector',SECTORS.get(row['sector'],row['sector']) or 'N/A');industry=extra.get('industry',row.get('industry') or 'N/A');exchange=EXCHANGES[row['listingExchange']]
        country=extra.get('country',row.get('country') or 'N/A')
        description=clean(value(profile,'CompanyDescription'))
        description=re.sub(re.escape(name), 'The company',description,flags=re.I)
        description=re.sub(r'\b'+re.escape(ticker)+r'\b','the company',description,flags=re.I)
        # Limit source prose to a short excerpt; otherwise use only verified classifications.
        if len(description)>300:description=description[:300].rsplit(' ',1)[0]+'…'
        if not description:description=f'Operates in the {industry} industry within the {sector} sector.'
        anonymous=anonymize(description,name,ticker)
        missing=[]
        for key,data in [('profile',profile),('quarterlyFinancials',revenue is not None and net_income is not None),('historicalPrices',len(history)>=22),('ipoYear',ipo!='N/A'),('country',country!='N/A'),('price',price is not None),('pe',pe is not None)]:
            if not data:missing.append(key)
        missing += ['employees','revenueGrowth']
        if 'founded' not in extra:missing.append('founded')
        date_label='Nasdaq retrieved Oct 20, 2026 (snapshot time not supplied)'
        note=f'Market cap and price: Nasdaq screener retrieved October 20, 2026; its snapshot timestamp is not supplied. '
        note+=f'Financial totals are verified four-quarter sums through {period}. ' if period and revenue is not None else 'Complete four-quarter financial totals are unavailable. '
        if pe is not None:note+=f'P/E source/method: {pe_method}. '
        note+='Missing fields are unavailable, not estimates. Nasdaq historical closes are used as supplied; no invented pre-IPO or gap prices. '
        if ticker in originals:note+='Employee and revenue-growth figures retain the original June 2025 demo values when no verified replacement exists. '
        source=f'https://www.nasdaq.com/market-activity/stocks/{ticker.lower()}'
        note+=f'Source: {source}'
        entry={'ticker':ticker,'name':name,'exchange':exchange,'sector':sector,'industry':industry,'country':country,'hq':extra.get('hq',clean(value(profile,'Address')) or 'N/A'),'ipoYear':ipo,'founded':extra.get('founded','N/A'),'marketCap':cap,'price':price,'pe':pe,'revenue':revenue,'netIncome':net_income,'revenueGrowth':None,'employees':None,'blurb':anonymous,'howItMakesMoney':description,'products':[],'fact':extra.get('fact','Additional independently verified company trivia is unavailable in this snapshot.'),'history':f'Listed on {exchange}. '+(f'Available price observations run from {history[0][0]} to {history[-1][0]}.' if history else 'Verified historical closes are unavailable for this listing.'),'anchors':[],'dataAsOf':date_label,'financialPeriod':period,'verifiedHistoryKey':ticker,'sourceNote':note}
        if ticker in originals:
            # Retain every original byte/value in LEGACY_COMPANIES. Only new puzzles read this overlay.
            overlay={k:entry[k] for k in ['name','exchange','sector','industry','marketCap','price','pe','revenue','netIncome','dataAsOf','financialPeriod','sourceNote']}
            if len(history)>=22:overlay['verifiedHistoryKey']=ticker
            overlays[ticker]=overlay
        else:additions.append(entry)
        audit.append({'ticker':ticker,'name':name,'exchange':exchange,'marketCapUsd':cap*1e9,'marketCapSource':'https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true','retrievedDate':'2026-10-20','sourceSnapshotTimestamp':None,'financialPeriod':period,'peMethod':pe_method if pe is not None else None,'priceObservationCount':len(history),'firstPriceDate':history[0][0] if history else None,'lastPriceDate':history[-1][0] if history else None,'unavailableFields':missing,'originalPreserved':ticker in originals,'sourceUrls':{'companyFacts':extra.get('sources',[]),'profile':f'https://api.nasdaq.com/api/company/{ticker}/company-profile','financials':f'https://api.nasdaq.com/api/company/{ticker}/financials?frequency=2','history':f'https://api.nasdaq.com/api/quote/{ticker}/historical?assetclass=stocks&fromdate=2020-07-01&todate=2026-10-20&limit=9999'}})
    available={*originals,*[c['ticker'] for c in additions]}
    aliases={k:v for k,v in aliases.items() if v in available and k not in available}
    missing_large=[t for t in selected['over100B'] if aliases.get(t,t) not in available]
    assert not missing_large,missing_large
    assert len(available)==len(old)+len(additions)
    atomic_write(DATA/'expanded-companies.json',json.dumps({'additions':additions,'currentLegacy':overlays,'aliases':aliases},ensure_ascii=False,separators=(',',':'))+'\n')
    atomic_write(DATA/'expanded-histories.json',json.dumps(histories,separators=(',',':'))+'\n')
    atomic_write(DATA/'company-verification.json',json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    summary={'originalCount':len(old),'newCount':len(available),'addedCount':len(additions),'over100BCount':len(selected['over100B']),'missingOver100B':missing_large,'aliases':aliases,'completeMetadataCount':sum(not a['unavailableFields'] for a in audit),'withHistoricalPrices':sum(a['priceObservationCount']>=22 for a in audit),'unavailableFields':{field:[a['ticker'] for a in audit if field in a['unavailableFields']] for field in sorted({f for a in audit for f in a['unavailableFields']})},'excludedSecurities':selected['excludedOver100B']}
    atomic_write(DATA/'coverage-summary.json',json.dumps(summary,indent=2)+'\n')
    print(json.dumps({k:summary[k] for k in ['originalCount','newCount','addedCount','over100BCount','missingOver100B','withHistoricalPrices']}))
if __name__=='__main__':main()
