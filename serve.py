#!/usr/bin/env python3
"""Yoyo & Kiwi 的英语王国 —— 不缓存的本地服务器。

普通的 `python3 -m http.server` 会让浏览器缓存 js/css，改了代码刷新也看不到新功能。
这个服务器给每个文件都加上 no-cache 头，浏览器每次都拿最新的，彻底解决"更新加载不出来"。

用法：
    cd ~/PycharmProjects/yoyo-words
    python3 serve.py
然后电脑打开 http://localhost:8377
iPhone（同一 Wi-Fi）打开 http://<Mac的IP>:8377
"""
import http.server
import socketserver
import os

PORT = 8377
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # 安静点，不刷屏


socketserver.TCPServer.allow_reuse_address = True

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        print("✅ 英语王国已启动（不缓存模式）")
        print(f"   电脑打开：  http://localhost:{PORT}")
        print(f"   iPhone打开：http://<Mac的局域网IP>:{PORT}")
        print("   停止：按 Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止。")
