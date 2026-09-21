import sys
import os
import httpx
from dotenv import load_dotenv

_orig_client_init = httpx.Client.__init__
def _new_client_init(self, *args, **kwargs):
    kwargs['http2'] = False
    kwargs['verify'] = False
    if 'timeout' not in kwargs or kwargs['timeout'] is httpx.USE_CLIENT_DEFAULT:
        kwargs['timeout'] = httpx.Timeout(30.0)
    _orig_client_init(self, *args, **kwargs)
httpx.Client.__init__ = _new_client_init

_orig_async_client_init = httpx.AsyncClient.__init__
def _new_async_client_init(self, *args, **kwargs):
    kwargs['http2'] = False
    kwargs['verify'] = False
    if 'timeout' not in kwargs or kwargs['timeout'] is httpx.USE_CLIENT_DEFAULT:
        kwargs['timeout'] = httpx.Timeout(30.0)
    _orig_async_client_init(self, *args, **kwargs)
httpx.AsyncClient.__init__ = _new_async_client_init

load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from ai.gemini_client import generate_content

try:
    response = generate_content("Say hello in JSON format with key message", mime_type="application/json")
    print("Success:", response)
except Exception as e:
    print("Error:", e)
