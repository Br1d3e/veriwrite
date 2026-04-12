import matplotlib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import json
from datetime import datetime


FILE1 = "test IR 5 first draft.json"
with open(f"/Users/br1d3e/Google Drive/My Drive/veriwrite-flightrecorder/sessions/{FILE1}", "r", encoding="utf-8") as f:
    record = dict(json.load(f))

sessions = record["sessions"]

def session_dedupe(sessions):
    deduped_sessions = []
    seen_ids = set()
    for session in sessions:
        if session["id"] not in seen_ids:
            deduped_sessions.append(session)
            seen_ids.add(session["id"])
    return deduped_sessions

sessions = session_dedupe(sessions)

doc_start_timestamp = sessions[0]["t0"]
doc_end_timestamp = sessions[-1]["tn"]
doc_start = datetime.fromtimestamp(doc_start_timestamp / 1000)
doc_end = datetime.fromtimestamp(doc_end_timestamp / 1000)
# duration
duration_ts = 0
for i, session in enumerate(sessions):
    session_start_timestamp = session["t0"]
    session_end_timestamp = session["tn"]
    duration_ts += session_end_timestamp - session_start_timestamp

duration = datetime.fromtimestamp(duration_ts / 1000) - datetime(1970, 1, 1)

active_days = []
active_writing_time = 0
for session in sessions:
    session_start_timestamp = session["t0"]
    session_start = datetime.fromtimestamp(session_start_timestamp / 1000)
    if len(session["ev"]) > 0:
        active_days.append(f"{session_start.year}-{session_start.month}-{session_start.day}")
active_days = np.unique(active_days)

session_count = len(sessions)


print(f"Document start: {doc_start}")
print(f"Document end: {doc_end}")
print(f"Active writing time: {duration}")
print(f"Active writing days: {len(active_days)} ({', '.join(active_days)})")
print(f"Session count: {session_count}")

def word_count(text):
    return len(text.split())


# Gap detection
prev_end_text = sessions[0]["init"]
if (len(sessions[0]["ev"]) > 0):
    for ev in sessions[0]["ev"]:
        pos = ev[1]
        ins = ev[3]
        del_len = ev[2]
        prev_end_text = prev_end_text[:pos] + ins + prev_end_text[pos + del_len:]

offline_ins = []    # unrecorded text insertions during gaps

for i in range(1, len(sessions)):
    ev = np.array(sessions[i]["ev"], dtype=object)

    prev_end_ts = sessions[i-1]["tn"]
    current_start_ts = sessions[i]["t0"]
    current_init = sessions[i]["init"]
    gap_ts = current_start_ts - prev_end_ts

    if current_init != prev_end_text:
        print(f"\nGap detected between session {i} and session {i+1}:")
        # print(f"  Previous session end text: '{prev_end_text if len(prev_end_text) < 100 else prev_end_text[:100] + '...'}'")
        # print(f"  Current session init text: '{current_init if len(current_init) < 100 else current_init[:100] + '...'}'")
        print(f"  Gap duration: {datetime.fromtimestamp(gap_ts / 1000) - datetime(1970, 1, 1)} seconds")

        # Find difference using common prefix and suffix
        p = 0
        while p < min(len(prev_end_text), len(current_init)) and prev_end_text[p] == current_init[p]:
            p += 1
        s = 0
        while s < min([len(prev_end_text), len(current_init), p]) and prev_end_text[-(s+1)] == current_init[-(s+1)]:
            s += 1
        common_prefix = prev_end_text[:p]
        common_suffix = prev_end_text[len(prev_end_text)-s:] if s > 0 else ""

        diff = current_init[p:len(current_init)-s] if s > 0 else current_init[p:]
        offline_ins.append(diff)

        print(f" Difference: {diff if len(diff) < 60 else f"{diff[:60]}..."}\n")
        print(f"{len(diff)} chars differ between sessions")
        print(f"{word_count(diff)} words differ between sessions")

    prev_end_text = current_init
    for j in range(len(ev)):
        pos = ev[j][1]
        ins = ev[j][3]
        del_len = ev[j][2]
        prev_end_text = prev_end_text[:pos] + ins + prev_end_text[pos + del_len:]


# Edit metrics
doc_final_text = prev_end_text

doc_ins_chars = 0
doc_del_chars = 0
doc_net_chars = 0
doc_words = word_count(doc_final_text)

for session in sessions:
    ev = np.array(session["ev"], dtype=object)
    for j in range(len(ev)):
        ins = ev[j][3]
        del_len = ev[j][2]
        doc_ins_chars += len(ins)
        doc_del_chars += del_len


doc_net_chars = doc_ins_chars - doc_del_chars

print("\nDocument-level Edit Metrics:")
print(f"Total inserted characters: {doc_ins_chars}")
print(f"Total deleted characters: {doc_del_chars}")
print(f"Net characters: {doc_net_chars}")
print(f"Word Count: {doc_words}")


# Paste origin ratio (in chars)
paste_ins = []
for session in sessions:
    ev = np.array(session["ev"], dtype=object)
    # current_text = session["init"]
    for j in range(len(ev)):
        ins = ev[j][3]
        if len(ins) > 15 and ins not in paste_ins: # Heuristic: if inserted text is longer than 15 chars, consider it a paste
            paste_ins.append(ins)
        # current_text = current_text[:ev[j][1]] + ins + current_text[ev[j][1] + ev[j][2]:]    
        
paste_ins_chars = sum([len(p) for p in paste_ins])
paste_origin_ratio = paste_ins_chars / len(doc_final_text) if len(doc_final_text) > 0 else 0

print(f"\nPaste origin ratio (in chars): {paste_origin_ratio:.2%} ({paste_ins_chars} pasted chars out of {len(doc_final_text)} total chars)")


# Offline text %
offline_ins_chars = sum([len(oi) for oi in offline_ins])
offline_text_ratio = offline_ins_chars / len(doc_final_text) if len(doc_final_text) > 0 else 0

print(f"\nOffline text ratio (in chars): {offline_text_ratio:.2%} ({offline_ins_chars} offline chars out of {len(doc_final_text)} total chars)")


# Graphs
sid = []
total_ins_chars = []

session_times = []

doc_continuous_time = []
doc_ins_lens = []
total_len = 0
total_time_ts = 0

for session in sessions:
    ev = np.array(session["ev"], dtype=object)
    sid.append(session["id"])
    if len(ev) == 0:
        total_ins_chars.append(0)
        session_times.append(pd.to_datetime(0, unit='s'))
        doc_continuous_time.append(pd.to_datetime(0, unit='s'))
        doc_ins_lens.append(0)
        continue
    ins = np.array(ev[:, 3], dtype=object)
    dt = np.array(ev[:, 0], dtype=np.int32)
    ins_lens = np.array([len(i) for i in ins], dtype=np.int32)
    total_ins_chars.append(np.sum(ins_lens))

    session_duration = pd.to_datetime((session["tn"] - session["t0"]) / 1000, unit='s')
    session_times.append(session_duration)

    # Doc-level linearity
    # Y-axis: total insertion chars
    for i in range(len(dt)):
        total_len += ins_lens[i]
        total_time_ts += int(dt[i])

    total_time = pd.to_datetime(int(total_time_ts) / 1000, unit='s')

    doc_continuous_time.append(total_time)
    doc_ins_lens.append(total_len)  




# Product process similarity
# Word bigram
def word_bigram(text: str) -> set[str]:
    # preprocess text
    punc = set("\n\r,.?!@#$%^&*;:()[]{}\"'/-+~\\<>") 
    text = text.lower()
    for i in range(len(text)):
        if text[i] in punc:
            text = text[:i] + " " + text[i + 1 : ] if i < len(text) else text[:i] + " "

    text_list = text.split()
    n = len(text_list)
    bigram = []
    for j in range(0, n - 1):
        bigram.append(text_list[j] + " " + text_list[j + 1])
    return set(bigram)

def jaccard_sim(text1: str, text2: str) -> float:
    a = word_bigram(text1)
    b = word_bigram(text2)
    sim = len(a.intersection(b)) / len(a.union(b)) 
    return sim

def find_session_end_text(session):
    ev = np.array(session["ev"], dtype=object)
    text = session["init"]
    if len(ev) > 0:
        for e in ev:
            pos = e[1]
            del_len = e[2]
            ins = e[3]
            text = text[:pos] + ins + text[pos + del_len: ]

    return text

session_final_sims = []
for session in sessions:
    session_text = find_session_end_text(session)
    session_final_sims.append(jaccard_sim(session_text, doc_final_text))


# fig, ax = plt.subplots(2, 2)

# # Session insert chars graph
# ax[0, 0].bar(sid, total_ins_chars)
# ax[0, 0].set_xlabel("Session ID")
# ax[0, 0].set_ylabel("Total Inserted Characters")
# ax[0, 0].set_title("Total Inserted Characters per Session")
# # ax[0, 0].set_xticklabels(sid, rotation=45)

# # Session durations graph
# ax[0, 1].bar(sid, session_times)
# ax[0, 1].set_xlabel("Session ID")
# ax[0, 1].set_ylabel("Session Duration (hours)")
# ax[0, 1].set_title("Session Duration")
# ax[0, 1].yaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
# fig.autofmt_xdate() # Rotates labels if they overlap

# # Linearity graph
# doc_continuous_time = np.array(doc_continuous_time)
# doc_ins_lens = np.array(doc_ins_lens)

# ax[1, 0].xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
# ax[1, 0].plot(doc_continuous_time, doc_ins_lens, marker='o')
# ax[1, 0].set_xlabel("Continuous Time")
# ax[1, 0].set_ylabel("Total Inserted Characters")
# ax[1, 0].set_title("Document-level Linearity")


# ax[1, 1].plot(sid, session_final_sims)
# ax[1, 1].set_xlabel("Session ID")
# ax[1, 1].set_ylabel("Similarity (%)")
# ax[1, 1].set_title("Document-level product process similarity")


# Time heatmap
def heatmap(data, row_labels, col_labels, ax=None,
            cbar_kw=None, cbarlabel="", **kwargs):
    """
    Create a heatmap from a numpy array and two lists of labels.

    Parameters
    ----------
    data
        A 2D numpy array of shape (M, N).
    row_labels
        A list or array of length M with the labels for the rows.
    col_labels
        A list or array of length N with the labels for the columns.
    ax
        A `matplotlib.axes.Axes` instance to which the heatmap is plotted.  If
        not provided, use current Axes or create a new one.  Optional.
    cbar_kw
        A dictionary with arguments to `matplotlib.Figure.colorbar`.  Optional.
    cbarlabel
        The label for the colorbar.  Optional.
    **kwargs
        All other arguments are forwarded to `imshow`.
    """

    if ax is None:
        ax = plt.gca()

    if cbar_kw is None:
        cbar_kw = {}

    # Plot the heatmap
    im = ax.imshow(data, **kwargs)

    # Create colorbar
    cbar = ax.figure.colorbar(im, ax=ax, **cbar_kw)
    cbar.ax.set_ylabel(cbarlabel, rotation=-90, va="bottom")

    # Show all ticks and label them with the respective list entries.
    ax.set_xticks(range(data.shape[1]), labels=col_labels,
                  rotation=-30, ha="right", rotation_mode="anchor")
    ax.set_yticks(range(data.shape[0]), labels=row_labels)

    # Let the horizontal axes labeling appear on top.
    ax.tick_params(top=True, bottom=False,
                   labeltop=True, labelbottom=False)

    # Turn spines off and create white grid.
    ax.spines[:].set_visible(False)

    ax.set_xticks(np.arange(data.shape[1]+1)-.5, minor=True)
    ax.set_yticks(np.arange(data.shape[0]+1)-.5, minor=True)
    ax.grid(which="minor", color="w", linestyle='-', linewidth=3)
    ax.tick_params(which="minor", bottom=False, left=False)

    return im, cbar


def annotate_heatmap(im, data=None, valfmt="{x:.2f}",
                     textcolors=("black", "white"),
                     threshold=None, **textkw):
    """
    A function to annotate a heatmap.

    Parameters
    ----------
    im
        The AxesImage to be labeled.
    data
        Data used to annotate.  If None, the image's data is used.  Optional.
    valfmt
        The format of the annotations inside the heatmap.  This should either
        use the string format method, e.g. "$ {x:.2f}", or be a
        `matplotlib.ticker.Formatter`.  Optional.
    textcolors
        A pair of colors.  The first is used for values below a threshold,
        the second for those above.  Optional.
    threshold
        Value in data units according to which the colors from textcolors are
        applied.  If None (the default) uses the middle of the colormap as
        separation.  Optional.
    **kwargs
        All other arguments are forwarded to each call to `text` used to create
        the text labels.
    """

    if not isinstance(data, (list, np.ndarray)):
        data = im.get_array()

    # Normalize the threshold to the images color range.
    if threshold is not None:
        threshold = im.norm(threshold)
    else:
        threshold = im.norm(data.max())/2.

    # Set default alignment to center, but allow it to be
    # overwritten by textkw.
    kw = dict(horizontalalignment="center",
              verticalalignment="center")
    kw.update(textkw)

    # Get the formatter in case a string is supplied
    if isinstance(valfmt, str):
        valfmt = matplotlib.ticker.StrMethodFormatter(valfmt)

    # Loop over the data and create a `Text` for each "pixel".
    # Change the text's color depending on the data.
    texts = []
    for i in range(data.shape[0]):
        for j in range(data.shape[1]):
            kw.update(color=textcolors[int(im.norm(data[i, j]) > threshold)])
            text = im.axes.text(j, i, valfmt(data[i, j], None), **kw)
            texts.append(text)

    return texts


data = np.zeros((24, len(active_days)))
for session in sessions:
    session_start_timestamp = session["t0"]
    # session_start = datetime.fromtimestamp(session_start_timestamp / 1000)
    if len(session["ev"]) > 0:
        ts = session_start_timestamp
        for ev in session["ev"]:
        #     time += datetime.fromtimestamp(ev[0] / 1000)
            # hour = time.hour
            prev_ts = ts
            ts += ev[0]
            time = datetime.fromtimestamp(ts / 1000)
            day = f"{time.year}-{time.month}-{time.day}"
            if day in active_days:
                data[time.hour, np.where(active_days == day)[0][0]] += (ts - prev_ts) / 1000 / 60 # convert to mins

im, cbar = heatmap(data, [f"{h}:00" for h in range(24)], active_days, cmap="YlGn", cbarlabel="Active Writing Time (mins)")
texts = annotate_heatmap(im, valfmt="{x:.1f}")

plt.show()
    