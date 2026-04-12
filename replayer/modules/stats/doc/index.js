
import { calEditStats } from "./edit";
import { calTimeline } from "./timeline";
import { calContinuity } from "./continuity";



export function calDocStats(record) {
    const timeline = calTimeline(record);
    return {
        timeline: timeline,
        edit: calEditStats(record, timeline),
        continuity: calContinuity(record)
    }
}