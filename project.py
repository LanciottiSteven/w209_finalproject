import streamlit as st
import altair as alt
import pandas as pd
from numpy.random import default_rng as rng
import numpy as np
import json, urllib.request
import time

st.title("W209 Final Project - Mid Term Presentation")
st.header(
    "Dog Movements Across the United States",
    divider="gray"
)
st.markdown("We will visualize the movement of dogs via adoption. Our datasets will be from Kaggle and from Shelter Animals Count. We will use a map of the United States to show (1) where dogs are being adopted from and adopted to at a state-to-state level, and (2) which states tend to have more dogs leave them via adoption vs. enter them via adoption.")




