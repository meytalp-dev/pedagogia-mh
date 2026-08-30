# -*- coding: utf-8 -*-
"""
מחולל עמוד חדש לאתר — לוקח את המעטפת (head, drawer, nav, footer, scripts)
מעמוד קיים ומזריק לתוכה כותרת ותוכן. כך אין צורך לכתוב מחדש את התפריט.

    python tools/new-page.py OUT.html --title "כותרת" --lead "תקציר" \
        --kicker "נהלים" --back "procedures.html|נהלים" --body body.html \
        [--source docs/x.pdf --source-label "המסמך המקורי"] [--links links.html]

--links  קובץ עם <a href=...> אחד לשורה — הופך לרשימת pn-links
         (כרטיסיות ניווט שפותחות עמוד נפרד במקום לקפוץ בתוך העמוד).
"""
import argparse, io, os, re, sys

SHELL = 'bikur-sadir.html'   # עמוד נהלים תקין — מקור המעטפת


def slice_shell(path):
    s = io.open(path, encoding='utf-8').read()
    head_end = s.index('<link rel="stylesheet" href="style.css">')
    head = s[:head_end]
    # התפריט והפוטר מנוהלים מ-templates/ (ראו tools/build-nav.mjs) — לוקחים
    # את הבלוק כולל סימוני nav:start/foot:start, כדי שהעמוד החדש יתחדש גם הוא
    nav_start = s.index('<!-- nav:start')
    nav_end = s.index('<!-- nav:end -->') + len('<!-- nav:end -->')
    nav = s[nav_start:nav_end]
    tail_start = s.index('<!-- foot:start')
    tail = s[tail_start:]
    return head, nav, tail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--title', required=True)
    ap.add_argument('--lead', default='')
    ap.add_argument('--kicker', default='נהלים')
    ap.add_argument('--back', default='')
    ap.add_argument('--body', required=True)
    ap.add_argument('--source', default='')
    ap.add_argument('--source-label', default='המסמך המקורי')
    ap.add_argument('--links', default='')
    ap.add_argument('--desc', default='')
    ap.add_argument('--shell', default=SHELL)
    ap.add_argument('--section', default='procedures',
                    help='הפריט בתפריט שיסומן active (procedures / space / chanichut / tafkidim / chevrati / menahalim ...)')
    ap.add_argument('--tagline', default='', help='טקסט צד ימין בפוטר (ברירת מחדל: שם האתר)')
    a = ap.parse_args()

    head, nav, tail = slice_shell(a.shell)
    # הסימונים קובעים מה build-nav.mjs ירנדר — הבלוק עצמו יתחדש מהתבנית בבנייה
    nav = re.sub(r'<!-- nav:start[^>]*-->',
                 '<!-- nav:start section="%s" -->' % a.section if a.section else '<!-- nav:start -->',
                 nav, count=1)
    tail = re.sub(r'<!-- foot:start[^>]*-->',
                  '<!-- foot:start tagline="%s" -->' % a.tagline if a.tagline else '<!-- foot:start -->',
                  tail, count=1)

    head = re.sub(r'<title>.*?</title>',
                  '<title>%s · הבית של המנהיגות הפדגוגית היוצרת</title>' % a.title,
                  head, count=1, flags=re.S)
    head = re.sub(r'<meta name="description" content=".*?">',
                  '<meta name="description" content="%s">' % (a.desc or a.lead),
                  head, count=1, flags=re.S)
    # כתובת קנונית ותגיות שיתוף — של העמוד החדש, לא של עמוד המעטפת
    fname = os.path.basename(a.out)
    head = re.sub(r'<link rel="canonical" href="[^"]*">',
                  lambda m: '<link rel="canonical" href="https://pedagogiamh.co.il/%s">' % fname, head, count=1)
    head = re.sub(r'<meta property="og:url" content="[^"]*">',
                  lambda m: '<meta property="og:url" content="https://pedagogiamh.co.il/%s">' % fname, head, count=1)
    head = re.sub(r'<meta property="og:title" content="[^"]*">',
                  lambda m: '<meta property="og:title" content="%s">' % a.title.replace('"', '״'), head, count=1)
    head = re.sub(r'<meta property="og:description" content="[^"]*">',
                  lambda m: '<meta property="og:description" content="%s">' % (a.desc or a.lead).replace('"', '״'), head, count=1)

    body = io.open(a.body, encoding='utf-8').read()

    links = ''
    if a.links:
        raw = io.open(a.links, encoding='utf-8').read().strip()
        links = '\n<nav data-pn-links hidden aria-hidden="true">\n%s\n</nav>\n' % raw

    src_meta = src_box = ''
    if a.source:
        src_meta = ('\n    <div class="meta-row"><span class="src">המקור: '
                    '<a class="lk" href="%s" target="_blank" rel="noopener">%s</a></span></div>'
                    % (a.source, a.source_label))
        src_box = ('\n    <div class="source-box rv">\n'
                   '      <div class="t">המסמך המקורי<small>העמוד הזה הוא מהדורה דיגיטלית נוחה לקריאה — '
                   'הנוסח המחייב הוא המסמך המקורי.</small></div>\n'
                   '      <a class="btn" href="%s" target="_blank" rel="noopener">פתיחת המסמך המקורי ⬇</a>\n'
                   '    </div>\n' % a.source)

    body_attr = ' data-back="%s"' % a.back if a.back else ''

    page = (head
        + '<link rel="stylesheet" href="style.css">\n'
          '<link rel="stylesheet" href="article.css">\n'
          '<link rel="stylesheet" href="/pagenav.css">\n'
          '<link rel="stylesheet" href="/toolbelt.css">\n'
          '</head>\n<body%s>\n\n' % body_attr
        + nav + links
        + '\n\n<section class="hero">\n  <div class="article hero-stagger">\n'
          '    <span class="kicker">%s</span>\n    <h1>%s</h1>\n' % (a.kicker, a.title)
        + ('    <p class="lead">%s</p>\n' % a.lead if a.lead else '')
        + src_meta
        + '\n  </div>\n</section>\n\n<article class="body-sec">\n  <div class="article">\n\n'
        + body + '\n' + src_box
        + '\n  </div>\n</article>\n\n'
        + tail)

    io.open(a.out, 'w', encoding='utf-8').write(page)
    sys.stdout.write('wrote %s (%d bytes)\n' % (a.out, len(page)))

    # מרנדר מיד את התפריט/הפוטר לפי section ו-tagline (אחרת זה קורה רק באקשן)
    import subprocess
    build = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build-nav.mjs')
    try:
        subprocess.call(['node', build])
    except OSError:
        sys.stdout.write('node לא נמצא — להריץ ידנית: node tools/build-nav.mjs\n')


if __name__ == '__main__':
    main()
