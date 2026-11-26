import importlib.util
import socket
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_DIR = Path(__file__).parent.parent / "mantra-remote-script"
PACKAGE_NAME = "mantra_remote_script"
package = types.ModuleType(PACKAGE_NAME)
package.__path__ = [str(SCRIPT_DIR)]
sys.modules.setdefault(PACKAGE_NAME, package)

spec = importlib.util.spec_from_file_location(
    f"{PACKAGE_NAME}.ws_client", SCRIPT_DIR / "ws_client.py"
)
ws_client_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = ws_client_module
spec.loader.exec_module(ws_client_module)


class FakeSocket:
    def __init__(self):
        self.timeout = None
        self.handshake_pending = True
        self.frame = b"\x81\x0e{\"type\":\"ack\"}"
        self.sent = []

    def settimeout(self, timeout):
        self.timeout = timeout

    def connect(self, address):
        self.address = address

    def sendall(self, data):
        self.sent.append(data)

    def recv(self, size):
        if self.handshake_pending:
            self.handshake_pending = False
            return b"HTTP/1.1 101 Switching Protocols\r\n\r\n"
        if self.timeout is not None:
            raise socket.timeout()
        if self.frame:
            data, self.frame = self.frame[:size], self.frame[size:]
            return data
        return b""

    def close(self):
        pass


class WebSocketClientTests(unittest.TestCase):
    def test_idle_socket_stays_open_to_receive_server_messages(self):
        fake_socket = FakeSocket()
        messages = []
        statuses = []
        client = None

        def on_status(status):
            statuses.append(status)
            if status == "connected":
                client.send_json({"type": "register"})

        client = ws_client_module.WebSocketClient(
            "ws://localhost:1979/interpreter", messages.append, on_status
        )

        with patch.object(ws_client_module.socket, "socket", return_value=fake_socket):
            client._connect_and_listen()

        self.assertEqual(messages, [{"type": "ack"}])
        self.assertEqual(statuses, ["connected", "disconnected"])
        self.assertIsNone(fake_socket.timeout)
        self.assertEqual(len(fake_socket.sent), 2)


if __name__ == "__main__":
    unittest.main()
