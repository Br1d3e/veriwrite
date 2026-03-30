import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json


with open("/Users/br1d3e/Desktop/test IR 5 first draft.json", "r", encoding="utf-8") as f:
    record = dict(json.load(f))


sessions = record["sessions"]

def session_ins_info(SID): 
    session = dict(sessions[SID])

    id = session["id"]
    print(f"id: {id}")

    ev = session["ev"]
    ev = np.array(ev, dtype="object")
    # print(ev)

    dt = ev[:, 0]
    ins = ev[:, 3]
    ins_lens = np.array([len(s) for s in ins], dtype=np.int32)
    remaining = ins_lens > 0
    dt = dt[remaining]
    ins = ins[remaining]
    ins_lens = ins_lens[remaining]


    ins_med = np.median(ins_lens)
    print(f"med: {ins_med}")
    ins_p90 = np.percentile(ins_lens, 90)
    print(f"p90: {ins_p90}")
    ins_p95 = np.percentile(ins_lens, 95)
    print(f"p95: {ins_p95}")
    ins_p99 = np.percentile(ins_lens, 99)
    print(f"p99: {ins_p99}")


    LARGE_THRESHOLD = round(len(ins_lens) * 0.01)
    LARGE_THRESHOLD_2 = round(len(dt) * 0.02)
    LEN_THRESHOLD = 12      # text length threshold

    # Extremely long & short dt
    # dt_sorted = np.sort(dt, 0)
    # large_dt = dt_sorted[-1 * LARGE_THRESHOLD_2:]
    # small_dt = dt_sorted[:LARGE_THRESHOLD_2]
    # print(f"large dt: {large_dt}")
    # print(f"small dt: {small_dt}")
    # small_dt_idx = np.isin(dt, small_dt)
    # small_dt_texts = ins[small_dt_idx]

    # for i in range(LARGE_THRESHOLD_2):
    #     len_text = len(small_dt_texts[i])
    #     dt_text = small_dt[i]
    #     rate = np.round(len_text / dt_text * 1000, 2) 
    #     text = small_dt_texts[i]
    #     print(f"dt: {dt_text}\nlen: {len_text}\nrate: {rate} kps\ntext: {text}\n")

    # large_dt_idx = np.isin(dt, large_dt)
    # large_dt_texts = ins[large_dt_idx]

    # for i in range(LARGE_THRESHOLD_2):
    #     len_text = len(large_dt_texts[i])
    #     dt_text = large_dt[i]
    #     rate = np.round(len_text / dt_text * 1000, 2) 
    #     text = large_dt_texts[i]
    #     print(f"dt: {dt_text}\nlen: {len_text}\nrate: {rate} kps\ntext: {text}\n")


    # Large texts
    # ins_lens_sorted = np.sort(ins_lens)
    # large_ins_lens = ins_lens_sorted[-1 * LARGE_THRESHOLD:]
    large_ins_lens = ins_lens[ins_lens > LEN_THRESHOLD]
    print(f"large insert counts: {large_ins_lens}")
    large_text_idx = np.isin(ins_lens, large_ins_lens)
    large_texts = ins[large_text_idx]
    large_texts_dt = dt[large_text_idx]

    for i in range(len(large_texts)):
        len_text = len(large_texts[i])
        dt_text = large_texts_dt[i]
        rate = np.round(len_text / dt_text * 1000, 2)
        text = large_texts[i]
        print(f"len: {len_text}\ndt: {dt_text}\nrate: {rate} kps\ntext: {text}\n")


    # Both large texts and long dt
    # inter_idx = np.where((large_dt_idx == 1) & (large_text_idx == 1))[0]
    # inter_dt = dt[inter_idx]
    # inter_ins = ins[inter_idx]

    # print("\n=====Both large texts and long dt=====\n")
    # for i in range(len(inter_dt)):
    #     len_text = len(inter_ins[i])
    #     dt_text = inter_dt[i]
    #     rate = np.round(len_text / dt_text * 1000, 2)
    #     text = inter_ins[i]
    #     print(f"len: {len_text}\ndt: {dt_text}\nrate: {rate} kps\ntext: {text}\n")


    # vals, counts = np.unique(ins_lens, return_counts=True)
    # plt.bar(vals, counts)
    # plt.title(f"Insert Distribution for Session {id}")
    # plt.xlabel("Insert Lengths")
    # plt.ylabel("Length Count")
    # plt.show()


if __name__ == "__main__":
    for sid in range(len(sessions) - 1):
        session_ins_info(sid + 1)
    # session_ins_info(2)