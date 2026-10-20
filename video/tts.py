"""One narration clip with edge-tts: python3 tts.py VOICE TEXT OUT.mp3 [RATE]

Uses HTTPS_PROXY when set, and SSL_CERT_FILE (or the system store) for TLS,
so it also works behind a TLS-inspecting proxy.
"""
import asyncio
import os
import ssl
import sys

import edge_tts
import edge_tts.communicate as communicate

CA = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
if CA:
    ctx = ssl.create_default_context(cafile=CA)
    for name in dir(communicate):
        if isinstance(getattr(communicate, name), ssl.SSLContext):
            setattr(communicate, name, ctx)


async def main(voice, text, out, rate="+0%"):
    com = edge_tts.Communicate(text, voice, rate=rate, proxy=os.environ.get("HTTPS_PROXY"))
    with open(out + ".part", "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
    os.replace(out + ".part", out)


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:5]))
