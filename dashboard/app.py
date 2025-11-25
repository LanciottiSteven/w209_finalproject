from flask import Flask, render_template, jsonify
import pandas as pd
import altair as alt
app = Flask(__name__)

all_travel = pd.read_csv("data/all_travel.csv")
instate_travel = pd.read_csv("data/instate_travel.csv")
outstate_travel = pd.read_csv("data/outstate_travel.csv")

all_travel_records = all_travel.to_dict(orient="records")
instate_travel_records = instate_travel.to_dict(orient="records")
outstate_travel_records = outstate_travel.to_dict(orient="records")

@app.route('/')
def home():

    return render_template('index.html',
                           all_travel=all_travel_records,
                           instate_travel=instate_travel_records,
                           outstate_travel = outstate_travel_records,
                           active_page="home"
                           )

@app.route("/state-dashboard")
def state_dashboard():
    return render_template("state_dashboard.html",
                           all_travel=all_travel_records,
                           instate_travel=instate_travel_records,
                           outstate_travel = outstate_travel_records,
                           active_page="state")

@app.route("/shelter-dashboard")
def shelter_dashboard():
    return render_template("shelter_dashboard.html",
                           all_travel=all_travel_records,
                           instate_travel=instate_travel_records,
                           outstate_travel = outstate_travel_records,
                           active_page="shelter")

@app.route("/data")
def data():
    # Convert DataFrame to list of dicts for JSON
    records = all_travel.to_dict(orient="records")
    return jsonify(records)

if __name__ == "__main__":
    app.run(debug=True)