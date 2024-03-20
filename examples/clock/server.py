#!/usr/bin/python
#
# https://flask.palletsprojects.com/en/3.0.x/installation/
# pip install Flask
# pip install requests
# pip install flask-sock
#

from flask import Flask, request
from flask_sock import Sock
import time
from datetime import datetime
import requests
import json

app = Flask(__name__,
            static_url_path='',
            static_folder='public')

sock = Sock(app)

api_endpoint = "https://api.publicapis.org/random"

@sock.route("/echo")
def echoflow(ws):
    while True:
        data = ws.receive()
        if (len(data) > 0):
            print("Data from client:", data)

        ws.send(data)
        time.sleep(5)

@sock.route("/clock")
def timeflow(ws):
    while True:

        new_time = '<div id="clock"><p>Current date and time: {}</p></div>'.format(
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        ws.send(new_time)
        time.sleep(5)

@sock.route("/api")
def apiflow(ws):
    while True:
        new_api = requests.get(api_endpoint)
        api_dict = json.loads(new_api.text).get("entries")[0]
        new_text = """<div id="api">
                <p>API name: {0}</p>
                <p>Description: {1}</p>
                <p>link: <a href={2} target="_blank">{2}</a></p>
            </div>""".format(
            api_dict.get("API"), api_dict.get("Description"), api_dict.get("Link")
        )
        ws.send(new_text)
        time.sleep(10)

@app.route('/')
def root():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True)