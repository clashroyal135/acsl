"""Restore source wording and export worksheet figures from cached, user-supplied PDFs.

Only the PROBLEM section and figures preceding INPUT/TEST DATA are included.
Input/output adapters, public samples, and grading cases are left unchanged.
"""
import argparse, hashlib, json, re
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
HEADER = re.compile(r'20\d\d[-–]20\d\d\s*[●•]?\s*Contest\s*1:.*?Division', re.I)

def normalize(text):
    return ''.join(c.lower() for c in text if c.isalnum())

def markdown(text):
    text = HEADER.sub('', text).replace('\u200b', '').replace('\ufeff', '')
    paragraphs, pending, table = [], [], []
    def flush():
        if pending: paragraphs.append(' '.join(pending)); pending.clear()
    def flush_table():
        if table: paragraphs.append('```text\n' + '\n'.join(table) + '\n```'); table.clear()
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line in [',', '●']:
            flush(); flush_table(); continue
        if re.search(r'\S {3,}\S', raw):
            flush(); table.append(line); continue
        flush_table()
        if re.match(r'^[●•]|^\d+\.\s', line):
            flush(); paragraphs.append(re.sub(r'^[●•]\s*', '- ', line)); continue
        if line.upper() in ['EXAMPLE:', 'EXAMPLES:']:
            flush(); paragraphs.append('**' + line.rstrip(':').title() + '**'); continue
        pending.append(line)
        if re.search(r'[.!?:]$', line): flush()
    flush(); flush_table()
    return '\n\n'.join(paragraphs)

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--source-dir', default='/private/tmp/acsl-pdfs'); args = parser.parse_args()
    originals = {}; assets = ROOT/'public/problems/figures'; assets.mkdir(parents=True, exist_ok=True)
    sources = json.loads((HERE/'sources.json').read_text())
    for source in sources:
        slug = re.sub(r'[^a-z0-9]+', '-', source['title'].lower()).strip('-') + '-' + source['season'][:4] + '-' + source['division'].lower()
        text = source['text'].replace('\r\n', '\n')
        start = re.search(r'PROBLEM\s*:', text, re.I); assert start, slug
        stop = re.search(r'(?m)^\s*INPUT\s*:', text[start.end():]); assert stop, slug
        narrative = text[start.end():start.end()+stop.start()].strip()
        body = markdown(narrative)
        source_path = Path(args.source_dir)/(source['id']+'.pdf')
        figures = []
        for old in assets.glob(slug+'-*.png'): old.unlink()
        with pdfplumber.open(source_path) as pdf:
            for page_index, page in enumerate(pdf.pages):
                stops = page.search(r'\b(?:INPUT|TEST\s+DATA|TEST\s+INPUT|SAMPLE\s+INPUT)\s*:') or []
                cutoff = min((hit['top'] for hit in stops), default=page.height-25)
                candidates = []
                for image in page.images:
                    box = (image['x0'], image['top'], image['x1'], image['bottom'])
                    if box[1] < 100 or box[3] > cutoff+2 or image['width'] < 8 or image['height'] < 8: continue
                    if box[1] < 180 and image['height'] < 60: continue  # worksheet branding
                    candidates.append((box, 'diagram'))
                for table in page.find_tables():
                    data = table.extract()
                    if table.bbox[1] >= 120 and table.bbox[3] < cutoff and len(data) >= 2 and max(map(len, data), default=0) >= 2:
                        candidates.append((table.bbox, 'table'))
                candidates = [(box,kind) for box,kind in candidates if kind != 'diagram' or not any(other_kind == 'table' and other[0] <= box[0] and other[1] <= box[1] and other[2] >= box[2] and other[3] >= box[3] for other,other_kind in candidates)]
                seen = set()
                for box, kind in sorted(candidates, key=lambda item:(item[0][1],item[0][0])):
                    key = tuple(round(value) for value in box)
                    if key in seen: continue
                    seen.add(key)
                    n = len(figures)+1; filename = f'{slug}-{n}.png'
                    crop = (max(0,box[0]-3), max(0,box[1]-3), min(page.width,box[2]+3), min(page.height,box[3]+3))
                    page.crop(crop).to_image(resolution=180, antialias=True).save(assets/filename)
                    above = [line['text'] for line in page.extract_text_lines() if line['bottom'] < box[1] and line['top'] > 110 and len(normalize(line['text'])) >= 12]
                    anchor = above[-1] if above else ''
                    figures.append(dict(anchor=anchor, src='/problems/figures/'+filename, alt=f'{source["title"]}, {source["division"]}: original {kind} {n}', page=page_index+1, bbox=list(box), kind=kind))
                if stops: break
        # Place figures after their preceding source paragraph where it can be
        # matched, and before the prose when the original drawing precedes PROBLEM.
        positions = {}
        normalized_body = normalize(body)
        indices = [i for i,c in enumerate(body) if c.isalnum()]
        for figure in figures:
            anchor = normalize(figure['anchor'])
            location = normalized_body.find(anchor) if anchor else -1
            position = 0
            if location >= 0:
                end_index = indices[location+len(anchor)-1]+1
                paragraph_end = body.find('\n\n', end_index)
                position = paragraph_end if paragraph_end >= 0 else len(body)
            positions.setdefault(position, []).append(f'![{figure["alt"]}]({figure["src"]})')
        statement = body
        for position, images in sorted(positions.items(), reverse=True):
            statement = statement[:position] + '\n\n' + '\n\n'.join(images) + '\n\n' + statement[position:]
        statement = re.sub(r'\n{3,}', '\n\n', statement).strip()
        # A word-for-word check ignores only layout/Markdown and repeated page headers.
        prose = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', statement).replace('```text', '').replace('```', '')
        assert normalize(prose) == normalize(HEADER.sub('', narrative)), slug
        originals[slug] = dict(statement=statement, source=source['url'], sourceId=source['id'], sourceSha256=hashlib.sha256(source_path.read_bytes()).hexdigest(), figures=figures)
    (HERE/'originals.json').write_text(json.dumps(originals, ensure_ascii=False, indent=2)+'\n')
    print(f'Restored {len(originals)} source statements with {sum(len(row["figures"]) for row in originals.values())} original figures/tables.')

if __name__ == '__main__': main()
