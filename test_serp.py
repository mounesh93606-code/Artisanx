import httpx, asyncio, os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def test():
    async with httpx.AsyncClient(verify=False, timeout=10.0) as c:
        try:
            r = await c.get('https://serpapi.com/search', params={
                'engine': 'google',
                'q': 'terracotta lamp',
                'tbm': 'shop',
                'gl': 'in',
                'hl': 'en',
                'api_key': os.getenv('SERPAPI_KEY')
            })
            print(f"Status: {r.status_code}")
            print(f"Response: {r.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")
        
asyncio.run(test())
