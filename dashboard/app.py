from flask import Flask, render_template, jsonify, request
import pandas as pd
# import altair as alt
import numpy as np


import joblib
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

all_travel = pd.read_csv("data/all_travel.csv")
instate_travel = pd.read_csv("data/instate_travel.csv")
outstate_travel = pd.read_csv("data/outstate_travel.csv")
shelter_data = pd.read_csv('data/shelter_data.csv')

all_travel_records = all_travel.to_dict(orient="records")
instate_travel_records = instate_travel.to_dict(orient="records")
outstate_travel_records = outstate_travel.to_dict(orient="records")
shelter_records = shelter_data.to_dict(orient="records")

# Load KMeans recommender artifacts
# -----------------------------
assets = joblib.load("models/kmeans_assets.joblib")
kmeans = assets["kmeans"]
ohe = assets["ohe"]
cat_cols = assets["cat_cols"]

full_vectors = np.load("models/dog_full_vectors.npy")
dogs_k = pd.read_parquet("models/dogs_with_clusters.parquet")

def build_user_vector_from_payload(payload: dict) -> np.ndarray:
    """
    Build a (1, D) one-hot vector for the user, aligned with X_ohe used in K-Means:
    - We create a 1-row DataFrame with the same cat_cols
    - Fill with 'Unknown' by default, override with user choices
    - Run through the fitted OneHotEncoder
    """
    # Start with Unknown for everything
    row = {col: "Unknown" for col in cat_cols}

    # Fill in provided values (cast to string to match training)
    for col in cat_cols:
        if col in payload and payload[col] is not None:
            row[col] = str(payload[col])

    # One-row DataFrame with same columns/order
    X_user_cat = pd.DataFrame([row], columns=cat_cols)

    # Transform with the SAME encoder used offline
    X_user_ohe = ohe.transform(X_user_cat)  # shape (1, D)
    return X_user_ohe

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
                           shelter_data=shelter_records,
                           active_page="shelter")

@app.route("/data")
def data():
    # Convert DataFrame to list of dicts for JSON
    records = all_travel.to_dict(orient="records")
    return jsonify(records)

# Recommendation API (KMeans + cosine sim)
# -----------------------------
@app.route("/api/recommend_dogs", methods=["POST"])
def api_recommend_dogs():
    """
    Expects JSON like:
    {
      "age": "Young",
      "size": "Medium",
      "sex": "Female",
      "coat": "Short",
      "env_children": "1",
      "env_dogs": "1",
      "env_cats": null,
      "house_trained": "1",
      "special_needs": "0",
      "breed_mixed": "1",
      "top_n": 10,
      "shelter_name": "Some Shelter"   # optional; null or "ALL" = no shelter filter
    }
    Only the keys present in cat_cols matter for the vector; shelter_name is used to
    filter candidate dogs after clustering.
    """
    payload = request.get_json(force=True) or {}

    # 0) Optional shelter filter from payload
    shelter_name = payload.get("shelter_name")
    if shelter_name:
        shelter_name = str(shelter_name).strip()

    # 1) Build user vector (1 x D)
    user_vec = build_user_vector_from_payload(payload)

    # 2) Assign user to nearest KMeans cluster
    user_cluster = int(kmeans.predict(user_vec)[0])

    # 3) Filter dogs to that cluster (and shelter, if provided)
    base_mask = dogs_k["kmeans_cluster"] == user_cluster

    if shelter_name and shelter_name.upper() != "ALL":
        # Make comparison robust to whitespace / type
        mask = base_mask & (
            dogs_k["shelter_name"].astype(str).str.strip() == shelter_name
        )
    else:
        mask = base_mask

    if not mask.any():
        return jsonify({"matches": []})

    cluster_indices = np.where(mask)[0]
    candidate_vectors = full_vectors[cluster_indices]
    candidate_dogs = dogs_k.iloc[cluster_indices].copy()

    # 4) Similarity within the candidate set
    sims = cosine_similarity(user_vec, candidate_vectors)[0]
    candidate_dogs["similarity"] = sims

    # 5) Take top N (now actually using top_n)
    # top_n = int(payload.get("top_n", 10))
    top_matches = (
        candidate_dogs.sort_values("similarity", ascending=False)
        # .head(top_n)
    )

    # 6) Choose columns to send back
    cols_to_send = [
        "name",
        "image",
        "shelter_name",
        "shelter_address",
        "breed_primary",
        "age",
        "size",
        "sex",
        "env_children",
        "env_dogs",
        "env_cats",
        "house_trained",
        "special_needs",
        "kmeans_cluster",
        "similarity",
    ]
    cols_to_send = [c for c in cols_to_send if c in top_matches.columns]

    matches = top_matches[cols_to_send].to_dict(orient="records")
    return jsonify({"matches": matches})


if __name__ == "__main__":
    app.run(debug=True)
