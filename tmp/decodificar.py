"""Lee comprobantes WEB3G (GZIP + Base64URL) y códigos WEB2 anteriores."""
import base64
import gzip
import hashlib
import io
import json
import re
import sys
from pathlib import Path


def read_report(code):
    code = code.strip()
    if len(code) > 2_000_000:
        raise ValueError("Código demasiado largo")
    if code.startswith("WEB3G."):
        payload = code[6:]
        if not re.fullmatch(r"[A-Za-z0-9_-]+", payload):
            raise ValueError("Base64URL no válido")
        packed = base64.b64decode(payload + "=" * (-len(payload) % 4), altchars=b"-_", validate=True)
        with gzip.GzipFile(fileobj=io.BytesIO(packed)) as stream:
            raw = stream.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Informe descomprimido demasiado largo")
        decoded = raw.decode("utf-8")
        marker = "\nCódigo de comprobación: WEB3-"
    else:
        decoded = base64.b64decode(code, validate=True).decode("utf-8")
        marker = "\nCódigo de comprobación: WEB2-"
    body, expected = decoded.rsplit(marker, 1)
    if hashlib.sha256(body.encode("utf-8")).hexdigest() != expected:
        raise ValueError("El checksum no coincide")
    return json.loads(body)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python decodificar.py comprobante.txt")
    try:
        report = read_report(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
        print("Checksum correcto. El archivo acredita el contenido generado, no su envío a Google Forms.")
        print(json.dumps(report, ensure_ascii=False, indent=2))
    except (OSError, ValueError, UnicodeError, EOFError) as exc:
        raise SystemExit(f"No se pudo leer la entrega: {exc}") from exc
