#!/usr/bin/env python3
"""Mock Xendit Invoice API untuk pengembangan lokal (tanpa akun Xendit).

Endpoint yang ditiru:
  POST /v2/invoices            -> buat invoice (status PENDING)
  GET  /v2/invoices/{id}       -> status invoice saat ini
Kontrol simulasi (hanya untuk dev):
  POST /_mock/paid/{id}        -> ubah status PAID lalu kirim webhook ke backend
  POST /_mock/expire/{id}      -> ubah status EXPIRED lalu kirim webhook ke backend

Jalankan:  python3 tools/mock_xendit.py  (port 3999)
Backend:   XENDIT_BASE_URL=http://127.0.0.1:3999 XENDIT_SECRET_KEY=xnd_dev_mock
           XENDIT_CALLBACK_TOKEN=mock_callback_token
"""
import json, os, uuid, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("MOCK_PORT", "3999"))
BACKEND = os.environ.get("BACKEND_URL", "http://127.0.0.1:8080")
CALLBACK_TOKEN = os.environ.get("XENDIT_CALLBACK_TOKEN", "mock_callback_token")
INVOICES = {}


def send_webhook(inv):
    body = json.dumps({"id": inv["id"], "external_id": inv["external_id"], "status": inv["status"]}).encode()
    req = urllib.request.Request(
        f"{BACKEND}/api/webhooks/xendit", data=body, method="POST",
        headers={"content-type": "application/json", "x-callback-token": CALLBACK_TOKEN},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, payload):
        data = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _body(self):
        n = int(self.headers.get("content-length", 0))
        return json.loads(self.rfile.read(n) or b"{}")

    def do_POST(self):
        if self.path == "/v2/invoices":
            if not self.headers.get("authorization", "").startswith("Basic "):
                return self._json(401, {"error_code": "UNAUTHORIZED"})
            b = self._body()
            inv_id = "inv_" + uuid.uuid4().hex[:24]
            inv = {
                "id": inv_id, "external_id": b["external_id"], "status": "PENDING",
                "amount": b["amount"], "currency": b.get("currency", "IDR"),
                "invoice_url": f"http://127.0.0.1:{PORT}/pay/{inv_id}",
                "payer_email": b.get("payer_email"), "items": b.get("items", []),
                "description": b.get("description"),
                "payment_channel": None,
            }
            INVOICES[inv_id] = inv
            print(f"[mock] invoice dibuat {b['external_id']} amount={b['amount']} items={len(b.get('items', []))}", flush=True)
            return self._json(200, inv)
        if self.path.startswith("/_mock/paid/") or self.path.startswith("/_mock/expire/"):
            inv_id = self.path.rsplit("/", 1)[1]
            inv = INVOICES.get(inv_id)
            if not inv:
                return self._json(404, {"error_code": "NOT_FOUND"})
            inv["status"] = "PAID" if "/paid/" in self.path else "EXPIRED"
            if inv["status"] == "PAID":
                inv["payment_channel"] = "BCA"
            code = send_webhook(inv)
            print(f"[mock] {inv['status']} {inv['external_id']} -> webhook HTTP {code}", flush=True)
            return self._json(200, {"status": inv["status"], "webhook_http": code})
        self._json(404, {"error_code": "NOT_FOUND"})

    def do_GET(self):
        if self.path.startswith("/v2/invoices/"):
            inv = INVOICES.get(self.path.rsplit("/", 1)[1])
            if not inv:
                return self._json(404, {"error_code": "INVOICE_NOT_FOUND_ERROR"})
            return self._json(200, inv)
        self._json(404, {"error_code": "NOT_FOUND"})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"mock xendit di http://127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
