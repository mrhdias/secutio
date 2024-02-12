#!/usr/bin/python
#
# https://flask.palletsprojects.com/en/3.0.x/installation/
#

from flask import Flask, request

app = Flask(__name__,
            static_url_path='',
            static_folder='public',)


@app.route("/make-test", methods=["GET"])
def xpto():
    return '<span>Hello World!</span>'

@app.route('/')
def root():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True)