import streamlit as st
import altair as alt
import pandas as pd
from numpy.random import default_rng as rng
import numpy as np
import json, urllib.request
import time
import os
from vega_datasets import data
import pydeck as pdk



st.title("W209 Final Project - Mid Term Presentation")
st.header(
    "Dog Movements Across the United States",
    divider="gray"
)
st.markdown("We will visualize the movement of dogs via adoption. Our datasets will be from Kaggle and from Shelter Animals Count. We will use a map of the United States to show (1) where dogs are being adopted from and adopted to at a state-to-state level, and (2) which states tend to have more dogs leave them via adoption vs. enter them via adoption.")


# DATA_PATH1 = os.path.join("Data", "allDogDescriptions.csv")
# DATA_PATH2 = os.path.join("Data", "dogTravel.xlsx")

DATA_PATH1 = "Data/allDogDescriptions.csv"
DATA_PATH2 = "Data/dogTravel_clean.csv"

k_dog_desc = pd.read_csv(DATA_PATH1) 
k_dog_travel = pd.read_csv(DATA_PATH2)

# st.dataframe(k_dog_travel)


dog_travel_df = k_dog_travel.dropna(subset=['FoundState'])

# State centroids (approx) — lon, lat ***Less PR... lat/long doesnt looks good in current graph
STATE_LL = {
    "AL": (-86.6807, 32.6010), "AK": (-152.4044, 64.2008), "AZ": (-111.9340, 34.3071),
    "AR": (-92.3731, 34.7487), "CA": (-119.4179, 36.7783), "CO": (-105.7821, 39.5501),
    "CT": (-72.6970, 41.6032), "DE": (-75.5277, 38.9108), "FL": (-81.5158, 27.6648),
    "GA": (-82.9001, 32.1656), "HI": (-155.5828, 19.8968), "ID": (-114.7420, 44.0682),
    "IL": (-89.3985, 40.6331), "IN": (-86.1349, 40.2672), "IA": (-93.0977, 42.0329),
    "KS": (-98.4842, 39.0119), "KY": (-84.2700, 37.8393), "LA": (-91.9623, 30.9843),
    "ME": (-69.4455, 45.2538), "MD": (-76.6413, 39.0458), "MA": (-71.3824, 42.4072),
    "MI": (-85.6024, 44.3148), "MN": (-94.6859, 46.7296), "MS": (-89.3985, 32.3547),
    "MO": (-91.8318, 37.9643), "MT": (-110.3626, 46.8797), "NE": (-99.9018, 41.4925),
    "NV": (-116.4194, 38.8026), "NH": (-71.5724, 43.1939), "NJ": (-74.4057, 40.0583),
    "NM": (-105.8701, 34.5199), "NY": (-75.7890, 42.9543), "NC": (-79.0193, 35.7596),
    "ND": (-100.4448, 47.5515), "OH": (-82.9071, 40.4173), "OK": (-97.5164, 35.4676),
    "OR": (-120.5542, 43.8041), "PA": (-77.1945, 41.2033), "RI": (-71.5065, 41.5801),
    "SC": (-81.1637, 33.8361), "SD": (-99.9018, 43.9695), "TN": (-86.5804, 35.5175),
    "TX": (-99.9018, 31.9686), "UT": (-111.0937, 39.3210), "VT": (-72.5778, 44.5588),
    "VA": (-78.6569, 37.4316), "WA": (-120.7401, 47.7511), "WV": (-80.4549, 38.5976),
    "WI": (-89.6165, 43.7844), "WY": (-107.2903, 43.0759), "DC": (-77.0369, 38.9072)
}

# ***Less PR... lat/long doesnt looks good in current graph
ABBR_STATE = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
    "DC": "District of Columbia"
}

# Full state name -> USPS abbreviation ***Less PR... lat/long doesnt looks good in current graph
STATE_ABBR = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    'Illinios': "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY",
    "Washington DC": "DC"
}


STATE_NAME_LL = {place: STATE_LL.get(abbr, (np.nan, np.nan))
               for place, abbr in STATE_ABBR.items()}


dog_travel_df["foundStateAbb"] = dog_travel_df["FoundState"].map(lambda s: STATE_ABBR.get(s, np.nan))

dog_travel_df["origin_lon"] = dog_travel_df["foundStateAbb"].map(lambda s: STATE_LL.get(s, (np.nan, np.nan))[0])
dog_travel_df["origin_lat"] = dog_travel_df["foundStateAbb"].map(lambda s: STATE_LL.get(s, (np.nan, np.nan))[1])

dog_travel_df["dest_lon"] = dog_travel_df["contact_state"].map(lambda s: STATE_LL.get(s, (np.nan, np.nan))[0])
dog_travel_df["dest_lat"] = dog_travel_df["contact_state"].map(lambda s: STATE_LL.get(s, (np.nan, np.nan))[1])


clean_dog_travel_df = dog_travel_df.dropna(subset=['origin_lon', 'origin_lat','dest_lon','dest_lat'])


k_dog_desc_subset = k_dog_desc[['id','breed_primary','color_primary','age','sex','size','fixed']]


merged_df = pd.merge(clean_dog_travel_df,k_dog_desc_subset, on='id')

in_state_move = merged_df[merged_df['contact_state'] == merged_df['foundStateAbb']]
out_state_move = merged_df[merged_df['contact_state'] != merged_df['foundStateAbb']]


# Build the First Map***********************************
# --- Background map ---
states = alt.topo_feature(data.us_10m.url, feature="states")
background = (
    alt.Chart(states)
    .mark_geoshape(fill="lightgray", stroke="white")
    .properties(width=750, height=500)
    .project("albersUsa")
)

# --- Add state labels ---
# state_centroids = alt.topo_feature(data.us_10m.url, feature="state-capitals")

# state_labels = (
#     alt.Chart(state_centroids)
#     .mark_text(
#         fontSize=9,
#         fontWeight="bold",
#         color="dimgray"
#     )
#     .encode(
#         longitude="lon:Q",
#         latitude="lat:Q",
#         text="name:N"
#     )
# )

# --- Aggregate bubbles (one row per origin) ---
origins = (
    out_state_move.groupby("foundStateAbb", as_index=False)
      .agg(
          routes=("contact_state", "nunique"),   # unique destination states per origin
          origin_lon=("origin_lon", "mean"),
          origin_lat=("origin_lat", "mean"),
      )
)

# --- Click selection: single select on origin; double-click to clear ---
sel = alt.selection_point(
    name="origin_click",
    fields=["foundStateAbb"],
    on="click",
    clear="dblclick",
)

# --- Connections (filtered by the clicked origin when selection is active) ---
connections = (
    alt.Chart(out_state_move)
    .transform_filter(sel)   # shows all when nothing selected; focuses when clicked
    .mark_rule()
    .encode(
        latitude="origin_lat:Q",
        longitude="origin_lon:Q",
        latitude2="dest_lat:Q",
        longitude2="dest_lon:Q",
        opacity=alt.value(0.35),
        tooltip=[
            alt.Tooltip("foundStateAbb:N", title="Origin"),
            alt.Tooltip("contact_state:N", title="Destination"),
        ],
    )
)

# --- Points (click targets) ---
points = (
    alt.Chart(origins)
    .mark_circle()
    .encode(
        latitude="origin_lat:Q",
        longitude="origin_lon:Q",
        size=alt.Size("routes:Q", scale=alt.Scale(range=[0, 1000]), legend=None),
        order=alt.Order("routes:Q", sort="descending"),
        tooltip=[
            alt.Tooltip("foundStateAbb:N", title="Origin"),
            alt.Tooltip("routes:Q", title="Unique destinations"),
        ],
        # highlight selected origin
        opacity=alt.condition(sel, alt.value(1), alt.value(0.7)),
        stroke=alt.condition(sel, alt.value("black"), alt.value(None)),
        strokeWidth=alt.condition(sel, alt.value(2), alt.value(0)),
    )
    .add_params(sel)   # attach the selection ONCE (to the points layer)
)

chart = alt.layer(background, connections, points).configure_view(stroke=None).properties(
        title={
            "text": "Out-of-State Dog Movement Across the U.S.",
            "anchor": "middle",   
            "fontSize": 20,
            "fontWeight": "bold"
        }
    )
st.altair_chart(chart, width='stretch')
# st.write("selected:",sel)


st.header(
    "Dog Movements Across the United States - Filters",
    divider="blue"
)

colA, colB, colC = st.columns([1, 1, 1])

option = colA.selectbox(
    "Dog Movement Direction",
    ("Within State", "Out of State", "Into State"),
    index=None,
    placeholder="Select direction...",
)
st.write("You selected:", option)

if option:
    st.write('something is selected')
else:
    st.write('something is not selected')
# -------------------------------------------------
# 1) Load / prepare your data
#    Replace this with however you load your DF
# -------------------------------------------------
# df = pd.read_csv("data/out_state_move.csv")  # example
# For this snippet, assume you already have `df`

# Keep rows with full coordinates
need = ["origin_lat", "origin_lon", "dest_lat", "dest_lon", "contact_state"]
df = in_state_move.dropna(subset=need).copy()

# HexagonLayer expects columns named "lat" and "lon".
# We'll show DESTINATIONS in the hex layer (switch to origin if you prefer)
dest_points = (
    df.rename(columns={"dest_lat": "lat", "dest_lon": "lon"})
      .assign(state=df["contact_state"])
)

counts = dest_points.groupby("state", as_index=False).size().rename(columns={"size": "count"})
dest_points = dest_points.merge(counts, on="state", how="left")

# -------------------------------------------------
# 2) Pick a reasonable initial view
# -------------------------------------------------
def view_from_df(d: pd.DataFrame) -> pdk.ViewState:
    lat = float(np.nanmean(d["lat"]))
    lon = float(np.nanmean(d["lon"]))
    return pdk.ViewState(latitude=lat, longitude=lon, zoom=4, pitch=40)

view_state = view_from_df(dest_points)

# -------------------------------------------------
# 3) Build layers (mirroring your example)
# -------------------------------------------------
hex_layer = pdk.Layer(
    "HexagonLayer",
    data=dest_points,
    get_position="[lon, lat]",   # IMPORTANT: [lon, lat] (notice order)
    radius=40000,                # ~40km hex
    elevation_scale=100,
    elevation_range=[0, 10000],
    extruded=True,
    pickable=True,
    coverage=1.0,
)

# scatter_layer = pdk.Layer(
#     "ScatterplotLayer",
#     data=dest_points,            # show both origin and destination points
#     get_position="[lon, lat]",
#     get_fill_color="[200, 30, 0, 160]",  # you can color by kind if you want
#     get_radius=20000,            # meters; adjust with zoom
#     pickable=True,
# )

# Optional: color origins and destinations differently
# scatter_layer = pdk.Layer(
#     "ScatterplotLayer",
#     data=points_both,
#     get_position="[lon, lat]",
#     get_fill_color="(kind === 'Origin') ? [30, 150, 80, 180] : [200, 80, 60, 160]",
#     get_radius=20000,
#     pickable=True,
# )


# 4) Tooltip (state + count)
# -------------------------------------------------
tooltip = {
    "html": """
    <div style="font-family:system-ui;">
      <b>State:</b> {contact_state}<br/>
      <b>Count:</b> {count}
    </div>
    """,
    "style": {"backgroundColor": "white", "color": "black"},
}

# -------------------------------------------------
# 4) Deck and render
# -------------------------------------------------
deck = pdk.Deck(
    map_style=None,                # Streamlit theme map
    initial_view_state=view_state,
    layers=[hex_layer],
    tooltip=tooltip,
)

st.pydeck_chart(deck, width='stretch')

# st.dataframe(dest_points)