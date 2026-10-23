from playwright.sync_api import sync_playwright
import json, sys
report=[]; errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':800})
    pg.on('pageerror', lambda e: errs.append(('pageerror', str(e)[:160])))
    pg.on('console', lambda m: errs.append(('console', m.text[:160])) if m.type=='error' and 'fonts' not in m.text and 'ERR_NAME' not in m.text else None)
    pg.goto('http://localhost:4173/'); pg.wait_for_timeout(1500)
    pg.get_by_role('button', name='Start').click()
    def painted():
        return pg.evaluate("""() => { const c=document.getElementById('scene-canvas'); const x=c.getContext('2d'); const d=x.getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4*97){ if(d[i]>0) n++ } return n }""")
    seen=set()
    for i in range(60):
        title=pg.locator('h1').inner_text()
        if title in seen: break
        seen.add(title)
        before=len(errs)
        # play + scrub
        pg.get_by_role('button', name='Play', exact=True).click(); pg.wait_for_timeout(500)
        sl=pg.locator('.scrub').first; sl.focus(); pg.keyboard.press('Home'); pg.keyboard.press('End'); pg.wait_for_timeout(150)
        # drag from the first halo-able handle: try dragging near the probe default (2,1.5) in world -> compute screen via a few candidate points
        box=pg.locator('#scene-canvas').bounding_box()
        cx,cy=box['x']+box['width']/2, box['y']+box['height']/2
        unit=min(box['width'],box['height'])/(2*5.2)
        for (wx,wy) in [(2,1.5),(1,0),(0.5,1.2),(-1,2),(1,2)]:
            sx,sy=cx+wx*unit, cy-wy*unit
            pg.mouse.move(sx,sy); pg.wait_for_timeout(30)
            if pg.evaluate("document.getElementById('scene-canvas').classList.contains('grab')"):
                pg.mouse.down(); pg.mouse.move(sx+40,sy-30,steps=6); pg.mouse.up(); break
        # background drag (pan / orbit / draw)
        pg.mouse.move(cx-250,cy+200); pg.mouse.down(); pg.mouse.move(cx-150,cy+150,steps=6); pg.mouse.up()
        pg.mouse.move(cx,cy); pg.mouse.wheel(0,-300); pg.mouse.wheel(0,300)
        # click every chip/toggle button inside the panel sections (not folds), limited
        btns=pg.locator('aside section button, aside .toggles button')
        n=min(btns.count(),10)
        for k in range(n):
            try:
                bt=btns.nth(k)
                if bt.is_visible() and bt.is_enabled(): bt.click(timeout=800); pg.wait_for_timeout(80)
            except Exception as ex: errs.append(('click', f'{title}: {str(ex)[:80]}'))
        # open all folds once
        for f in pg.locator('.fold summary').all():
            try: f.click(timeout=500)
            except Exception: pass
        pg.wait_for_timeout(300)
        px=painted()
        report.append((title, px, len(errs)-before))
        # reset view and go next
        pg.keyboard.press('0')
        nxt=pg.locator('.pager button').last
        if '→' not in nxt.inner_text(): break
        nxt.click(); pg.wait_for_timeout(350)
    # export png click should not throw
    pg.get_by_role('button', name='PNG').click(); pg.wait_for_timeout(300)
    # share
    pg.get_by_role('button', name='Share').click(); pg.wait_for_timeout(300)
    h=pg.evaluate('location.hash'); pg.goto('http://localhost:4173/'+h); pg.wait_for_timeout(1200)
    report.append(('reload from share link', painted(), 0))
    b.close()
for r in report: print(f"{r[0]:40s} painted={r[1]:5d} newErrors={r[2]}")
print('lenses visited:', len(report)-1)
print('errors:', json.dumps(errs, indent=1)[:2000])
