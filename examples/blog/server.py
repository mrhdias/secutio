#!/usr/bin/env python
#
# https://flask.palletsprojects.com/en/3.0.x/installation/
#

from flask import Flask

app = Flask(__name__,
            static_url_path='',
            static_folder='public',)

@app.route('/')
def root():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True)