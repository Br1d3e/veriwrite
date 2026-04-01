import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json


FILE1 = "test IR 5 first draft.json"
FILE2 = "fast typing english.json"
FILE3 = "long copy.json"
FILE4 = "small copy.json"
with open(f"/Users/br1d3e/Google Drive/My Drive/veriwrite-flightrecorder/sessions/{FILE3}", "r", encoding="utf-8") as f:
    record = dict(json.load(f))


sessions = record["sessions"]

def session_paste_info(SID): 
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



def session_linearity(SID):
    session = sessions[SID]

    id = session["id"]
    print(f"id: {id}")

    ev = session["ev"]
    ev = np.array(ev, dtype=object)

    dt = np.array(ev[:, 0], dtype=np.int32)
    ins = ev[:, 3]
    ins_lens = np.array([len(s) for s in ins], dtype=np.int32)
    del_lens = ev[:, 2]

    # Y-axis: total insertion chars
    total_ins_lens = np.zeros_like(ins_lens, dtype=np.int32)
    total_len = 0
    for i in range(len(total_ins_lens)):
        total_len += ins_lens[i]
        # total_len -= del_lens[i]
        total_ins_lens[i] = total_len

    # X-axis: continuous time
    continuous_time = np.zeros_like(dt, dtype=np.float32)
    total_time = 0      # in seconds
    for i in range(len(dt)):
        total_time += dt[i] / 1000
        continuous_time[i] = total_time

    # Normalization [0, 1]
    x, y = continuous_time, total_ins_lens

    x_norm = (x - x.min()) / (x.max() - x.min())
    y_norm = (y - y.min()) / (y.max() - y.min())

    # Smoothness score
    # 1. mean absolute deviation
    var = np.sum(np.abs(x_norm - y_norm))
    md = var / len(x_norm)
    print(f"mean absolute deviation: {round(md, 3)}")
    # 2. RMSE
    rmse = np.sqrt(np.sum(np.pow((x_norm - y_norm), 2)) / len(x_norm))
    print(f"RMSE: {round(rmse, 3)}")
    # 3. max absolute deviation
    max_deviation = np.max(np.abs(x_norm - y_norm))
    print(f"max_deviation: {round(max_deviation, 3)}")
    # 4. coefficient of variation of rate
    # rate = np.diff(y_norm) / np.diff(x_norm)
    # CV = np.std(rate) / np.mean(rate)
    # print(f"CV: {round(CV, 3)}")

    # 5. Derivatives
    # bin x, y
    SAMPLE_SIZE = 0.002
    x_bin = np.arange(0, 1 + SAMPLE_SIZE, SAMPLE_SIZE)
    y_bin = np.interp(x_bin, x_norm, y_norm)
    diff_1st = np.diff(y_bin) / np.diff(x_bin)
    mad_1st = np.mean(np.abs(diff_1st - 1))    # 1 is ideal rate
    print(f"1st derivative mean absolute deviation: {np.round(mad_1st, 3)}")

    # Second derivative smoothness (rate of change of writing speed)
    diff_2nd = np.diff(diff_1st)
    mse_2nd = np.mean(diff_2nd ** 2)
    print(f"2nd derivative mse: {np.round(mse_2nd, 3)}")

    # 6. low-growth ratio
    # alpha = 0.1
    # rate = np.diff(y) / np.diff(x)
    # rate = rate[rate > 0]
    # avg_rate = np.mean(rate)
    # growth_thres = np.percentile(rate, 8)     # below threshold = low growth
    # print(growth_thres)
    # total_dt = np.sum(dt)
    # low_growth_dt = 0
    # for i in range(len(ev)):
    #     ev_rate = ins_lens[i] / dt[i] * 1000
    #     if ev_rate < growth_thres:
    #         low_growth_dt += dt[i]
    # low_growth_ratio = low_growth_dt / total_dt
    # print(f"low growth ratio: {np.round(low_growth_ratio, 3)}")

    # robust z-score of log_dt
    log_dt = np.log(dt)
    log_dt_med = np.median(log_dt)
    log_dt_mad = np.median(np.abs(log_dt - log_dt_med))
    z_log_dt = (log_dt - log_dt_med) / log_dt_mad

    score = np.log(dt / np.median(dt))
    print(np.median(dt))

    print(f"1x ratio: {np.mean(score > 1)}")
    print(f"2x ratio: {np.mean(score > 2)}")
    print(f"4x ratio: {np.mean(score > 4)}")
    print(f"p95 score: {np.percentile(score, 95)}")
    
    # test core distribution
    # plt.title(f"Distribution of log(dt / dtMed): {id}")
    # plt.xlabel("Score")
    # plt.ylabel("Count")
    # plt.hist(score, bins=50)
    # plt.show()

    # k, b = np.polyfit(x_norm, y_norm, 1)

    plt.plot(x_norm, y_norm)
    plt.title(f"Temporal linearity for session {id}")
    plt.xlabel("Time / s")
    plt.ylabel("Total Characters")
    # plt.plot(x_norm, k * x_norm + b, color='red', linestyle=":")
    plt.plot(x_norm, x_norm, color='red', linestyle=":")    # y = x
    plt.show()    

    

if __name__ == "__main__":
    for sid in range(0, len(sessions)):
        # session_paste_info(sid + 1)
        session_linearity(sid)
        # pass
    # session_linearity(2)