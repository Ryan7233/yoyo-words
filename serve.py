#!/usr/bin/env python3
"""Yoyo & Kiwi 的英语王国 —— 安全边界更明确的不缓存开发服务器。

默认只监听本机；需要让 iPhone 访问时，显式传入 ``--host 0.0.0.0``。
隐藏文件、隐藏目录和目录列表不会被提供。
"""

import argparse
import functools
import http.server
import ipaddress
from http import HTTPStatus
from pathlib import Path
import urllib.parse


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8377
ROOT = Path(__file__).resolve().parent


def decoded_path_segments(raw_path):
    """Return fully decoded URL path segments, including encoded separators."""
    path = urllib.parse.urlsplit(raw_path).path
    # Decode more than once so `%252egit` cannot bypass the hidden-path check.
    for _ in range(4):
        decoded = urllib.parse.unquote(path, errors="replace")
        if decoded == path:
            break
        path = decoded
    return path.replace("\\", "/").split("/")


def has_hidden_path(raw_path):
    """Whether a URL names a dotfile/dot-directory in any path segment."""
    return any(segment.startswith(".") for segment in decoded_path_segments(raw_path) if segment)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        if has_hidden_path(self.path):
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(HTTPStatus.NOT_FOUND, "Directory listing is disabled")
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # 安静点，不刷屏


def parse_args():
    parser = argparse.ArgumentParser(description="启动英语王国本地开发服务器")
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"监听地址（默认 {DEFAULT_HOST}；iPhone 访问使用 0.0.0.0）",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"监听端口（默认 {DEFAULT_PORT}；0 表示自动选择空闲端口）",
    )
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("--port 必须在 0 到 65535 之间")
    return args


def is_loopback_host(host):
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def main():
    args = parse_args()
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    http.server.ThreadingHTTPServer.allow_reuse_address = True

    with http.server.ThreadingHTTPServer((args.host, args.port), handler) as httpd:
        port = httpd.server_address[1]
        local_host = "localhost" if args.host in {"0.0.0.0", "::"} else args.host
        print("✅ 英语王国已启动（不缓存、隐藏文件保护模式）", flush=True)
        print(f"   电脑打开：http://{local_host}:{port}", flush=True)
        if not is_loopback_host(args.host):
            print(f"   iPhone：http://<Mac的局域网IP>:{port}", flush=True)
            print("   ⚠️  当前允许局域网访问，只应在可信 Wi-Fi 上使用。", flush=True)
            print("   ⚠️  局域网 HTTP 不支持离线 PWA 和麦克风语音识别。", flush=True)
        print("   停止：按 Ctrl+C", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止。")


if __name__ == "__main__":
    main()
