#!/usr/bin/python
#
# https://flask.palletsprojects.com/en/3.0.x/installation/
#

from flask import Flask, jsonify, request

contacts = [
    {
        "id":     "1",
        "name":   "Lorem Ipsum",
        "email":  "lorem.ipsum@example.com",
        "status": "Active"
    },
    {
        "id":     "2",
        "name":   "Mauris Quis",
        "email":  "mauris.quis@example.com",
        "status": "Active"
    },
    {
        "id":     "3",
        "name":   "Donec Purus",
        "email":  "donec.purus@example.com",
        "status": "Active"
    }
]

app = Flask(__name__,
            static_url_path='',
            static_folder='public',)

def transformationHeader(properties):
    list = []
    for k, v in properties.items():
        list.append("{0}:{1}".format(k, v))

    return ";".join(list)

@app.route("/statuscontact", methods=["PUT"])
def switchContactStatus():

    data = request.json

    for id in data['id']:
        for contact in contacts:
            if contact['id'] == id:
                contact['status'] = "Inactive"\
                    if data['switch-status'] == "deactivate" else "Active"

    return jsonify(contacts), {"Automata-Transformation": transformationHeader({
            "target":   "#contacts-list",
            "template": "@contacts-list"
        })}

@app.route("/listcontacts", methods=["GET"])
def listcontacts():
    return jsonify(contacts), {"Automata-Transformation": transformationHeader({
            "target":   "#contacts-list",
            "template": "#contacts-list-tpl",
            "swap":     "innerHTML"
        })}

@app.route('/')
def root():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True)