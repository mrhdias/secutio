#!/usr/bin/python
#
# https://flask.palletsprojects.com/en/3.0.x/installation/
#

from flask import Flask, jsonify, request

contacts = [
	{
		"id":        "1",
		"firstname": "Lorem",
		"lastname":  "Ipsum",
		"email":     "lorem.ipsum@example.com",
	},
	{
		"id":        "2",
		"firstname": "Mauris",
		"lastname":  "Quis",
		"email":     "mauris.quis@example.com",
	},
	{
		"id":        "3",
		"firstname": "Donec Purus",
		"lastname":  "Purus",
		"email":     "donec.purus@example.com",
	}
]

app = Flask(__name__,
            static_url_path='',
            static_folder='public',)

@app.route("/contact/<int:id>/save", methods=["PUT"])
def save_contact(id):
    data = request.json
    contacts[id - 1] = data
                
    return jsonify(contacts[id - 1])

@app.route("/contact/<int:id>", methods=["GET"])
@app.route("/contact/<int:id>/edit", methods=["GET"])
def get_contact(id):
    return jsonify(contacts[id - 1])

@app.route('/')
def root():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True)