from dataiku.customwebapp import *

import dataiku
from dataiku.core import schema_handling
from flask import request
from base64 import b64encode
import pandas as pd
import numpy as np

if "input_dataset" not in get_webapp_config():
    raise ValueError("Input dataset not specified. Go to settings tab.")
if "labeled_dataset" not in get_webapp_config():
    raise ValueError("Output dataset not specified. Go to settings tab.")
if "output_labels" not in get_webapp_config():
    raise ValueError("No labels to output. Go to settings tab.")
if "input_information" not in get_webapp_config():
    raise ValueError("No columns to display. Go to settings tab.")

dataset_name = get_webapp_config()["input_dataset"]
labeled_dataset_name = get_webapp_config()["labeled_dataset"]
labeled_column_list = get_webapp_config()["output_labels"]
input_columns = get_webapp_config()["input_information"]

# Get a df for input data
dataset = dataiku.Dataset(dataset_name)
input_dataset_columns =  [schema_object["name"] for schema_object in dataset.read_schema()]
current_df = dataset.get_dataframe()

# The output dataset contains both input data and additional columns for the labels
labeled_dataset = dataiku.Dataset(labeled_dataset_name)
labeled_dataset.write_schema([{"name": column, "type": "string"} for column in input_dataset_columns]+[{"name": column, "type": "string"} for column in labeled_column_list])

# Create a set, used to iterate through rows. It relies on the metric "Cont of records"!
labeled = set()
try:
    all_records = set(range(int(dataset.get_last_metric_values().get_metric_by_id("records:COUNT_RECORDS")['lastValues'][0]['value'])))
except:
    raise ValueError("Please compute input dataset metrics.")

remaining = all_records - labeled # Reminder, these are sets so this behaves like a reference.

@app.route('/get-input-values')
def get_values():
    global current_df
    current_row = request.args.get('row')
    data = current_df.iloc[int(current_row)][input_columns].tolist()
    return json.dumps({"data": data})

@app.route('/next')
def next():
    global all_records, labeled, remaining
    if len(remaining) > 0:
        next_row = remaining.pop()
    else:
        next_row = len(all_records)
    total_count = len(all_records)
    skipped_count = len(all_records) - len(labeled) - len(remaining) - 1 # -1 because the current is not counted
    labeled_count = len(labeled)
    return json.dumps({"nextRow": next_row, "labeled": labeled_count, "total": total_count, "skipped": skipped_count})

@app.route('/label')
def label():
    global labeled, labeled_column_list, current_df
    row = request.args.get('row')
    labels = request.args.getlist('labels[]')
    for data in zip(labeled_column_list, labels):
        current_df.loc[current_df.index[int(row)], data[0]] = data[1]
    labeled.add(row)
    return next()

@app.route('/terminate')
def terminate():
    global labeled_dataset, current_df
    # Write once when labeling is complete
    labeled_dataset.write_from_dataframe(current_df)
    return next()
