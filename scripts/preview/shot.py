import sys,asyncio,json
from playwright.async_api import async_playwright
# usage: shot.py out_prefix [js_after_load ...]
async def main():
    out=sys.argv[1]; steps=sys.argv[2:]
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        c=await b.new_context(viewport={"width":412,"height":915},device_scale_factor=2,is_mobile=True,has_touch=True,locale="zh-TW",timezone_id="Asia/Taipei",service_workers="block",geolocation={"latitude":22.63,"longitude":120.30},permissions=["geolocation"])
        pg=await c.new_page()
        errs=[]
        pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)[:300]))
        pg.on("console",lambda m:errs.append("CONSOLE "+m.text[:200]) if m.type=="error" else None)
        stub=open("scripts/preview/fb-stub.js").read()
        async def fb(route):
            await route.fulfill(body=stub if "app-compat" in route.request.url else "",content_type="application/javascript")
        await pg.route("**/vendor/firebase/**",fb)
        await pg.goto("http://localhost:8765/next.html",wait_until="load")
        await pg.wait_for_timeout(4500)
        await pg.screenshot(path=f"{out}-0.png")
        for i,s in enumerate(steps,1):
            try:
                r=await pg.evaluate(s)
                if r is not None: print("step",i,"=>",str(r)[:1500])
            except Exception as e: print("step",i,"ERR",str(e)[:300])
            await pg.wait_for_timeout(1800)
            await pg.screenshot(path=f"{out}-{i}.png")
        print("\n".join(errs[:12]))
        await b.close()
asyncio.run(main())
