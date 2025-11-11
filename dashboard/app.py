from flask import Flask, render_template
import pandas as pd
import altair as alt
app = Flask(__name__)




@app.route('/')
def project():
    all_travel = pd.read_csv("Data/all_travel.csv")
    instate_travel = pd.read_csv("Data/instate_travel.csv")
    outstate_travel = pd.read_csv("Data/outstate_travel.csv")

    return render_template('index.html',
                           all_travel=all_travel,
                           instate_travel=instate_travel,
                           outstate_travel = outstate_travel
                           )