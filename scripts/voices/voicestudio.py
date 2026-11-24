"""VoiceStudio (local, 127.0.0.1:3900/mcp/) as a small Python client: the same MCP tools the agent
uses, called over streamable HTTP so that clip audio goes to disk and never through a chat.

    from voicestudio import call, speak
    wav = speak('Salom!', language='uz', profile_id='816e9802')   # WAV bytes
"""
from __future__ import annotations

import base64
import http.client
import json
import os
import time
import urllib.error
import urllib.request

URL = os.environ.get('VOICESTUDIO_MCP', 'http://127.0.0.1:3900/mcp/')
_session: dict[str, str | int | None] = {'id': None, 'n': 0}


def _post(body: dict) -> dict | None:
    headers = {'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'}
    if _session['id']:
        headers['Mcp-Session-Id'] = str(_session['id'])
    req = urllib.request.Request(URL, json.dumps(body).encode(), headers, method='POST')
    # CPU synthesis of a long sentence can take minutes
    with urllib.request.urlopen(req, timeout=900) as res:
        _session['id'] = res.headers.get('Mcp-Session-Id') or _session['id']
        text = res.read().decode('utf-8')
    if 'id' not in body:
        return None
    if not text.lstrip().startswith('{'):
        text = [line[5:] for line in text.splitlines() if line.startswith('data:')][-1]
    msg = json.loads(text)
    if 'error' in msg:
        raise RuntimeError(f"VoiceStudio: {str(msg['error'])[:300]}")
    return msg['result']


def _rpc(method: str, params: dict) -> dict:
    _session['n'] = int(_session['n'] or 0) + 1
    return _post({'jsonrpc': '2.0', 'id': _session['n'], 'method': method, 'params': params})  # type: ignore[return-value]


def _retry(fn, tries: int = 6):
    """The local server restarts now and then: wait, open a new session, try again."""
    for attempt in range(tries):
        try:
            return fn()
        except (OSError, http.client.HTTPException, urllib.error.HTTPError):
            if attempt == tries - 1:
                raise
            _session['id'] = None
            time.sleep(20)
            _rpc('initialize', {'protocolVersion': '2025-03-26', 'capabilities': {},
                                'clientInfo': {'name': 'kiddo-voices', 'version': '1'}})
            _post({'jsonrpc': '2.0', 'method': 'notifications/initialized', 'params': {}})


def call(tool: str, **arguments) -> dict:
    """One MCP tool call; returns the tool's JSON answer."""
    if not _session['id']:
        _rpc('initialize', {'protocolVersion': '2025-03-26', 'capabilities': {},
                            'clientInfo': {'name': 'kiddo-voices', 'version': '1'}})
        _post({'jsonrpc': '2.0', 'method': 'notifications/initialized', 'params': {}})
    result = _retry(lambda: _rpc('tools/call', {'name': tool, 'arguments': arguments}))
    text = ''.join(c.get('text', '') for c in result.get('content', []) if c.get('type') == 'text')
    if result.get('isError'):
        raise RuntimeError(f'VoiceStudio {tool}: {text[:300]}')
    data = json.loads(text)
    if isinstance(data, dict) and isinstance(data.get('result'), str):
        return json.loads(data['result'])
    return data


def speak(text: str, *, language: str, profile_id: str, speed: float = 0.85, steps: int = 16,
          instruct: str | None = None) -> bytes:
    args = {'text': text, 'language': language, 'profile_id': profile_id, 'speed': speed, 'steps': steps}
    if instruct:
        args['instruct'] = instruct
    return base64.b64decode(call('generate_speech', **args)['wav_base64'])


def transcribe(audio: bytes, language: str | None = None) -> str:
    args = {'audio_base64': base64.b64encode(audio).decode()}
    if language:
        args['language'] = language
    return call('transcribe', **args).get('text', '').strip()
