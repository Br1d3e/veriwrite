
import { calEditStats } from "./edit";
import { calTimeline } from "./timeline";
import { calContinuity } from "./continuity";


export function calDocStats(record) {
    const timeline = calTimeline(record);
    const edit = calEditStats(record, timeline);
    const continuity = calContinuity(record);
    const docStats = {
        timeline: timeline,
        edit: edit,
        continuity: continuity
    }
    return docStats;
}
