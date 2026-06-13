/**
 * @fileoverview utility functions for document-level stats calculation
 */


export function wordCount(text) {
    const words = text.trim().split(/\s+/);
    return words.filter(word => word.length > 0).length;   
}

export function arrSum(arr) {
    return arr.reduce((sum, val) => sum + val, 0);
}

export function getSegFromPos(textSeg, pos) {
    let segStart = 0;
    let segEnd = 0;
    let segIdx = 0;
    for (let i = 0; i < textSeg.length; i++) {
        segStart = segEnd;
        segEnd += textSeg[i].text.length;
        if (segStart <= pos && pos < segEnd) {
            segIdx = i;
            break;
        }
    } 
    const segPos = pos - segStart;
    return [segIdx, segPos];
}

export function sumTextSegLen(textSeg) {
    let sum = 0;
    for (let seg of textSeg) {
        sum += seg.text.length;
    }
    return sum;
}

export function editTextSeg(textSeg, pos, ins, delLen, type="recorded") {
    // Delete
    let [segIdx, segPos] = getSegFromPos(textSeg, pos);
    let toDelete = delLen;
    while (toDelete > 0 && segIdx < textSeg.length) {
        let text = textSeg[segIdx].text;
        if (toDelete < text.length - segPos) {
            textSeg[segIdx].text = text.slice(0, segPos) + text.slice(segPos + toDelete);
            break;
        }
        if (segPos === 0) {     // delete entire text seg
            textSeg.splice(segIdx, 1);
            toDelete -= text.length;
        } else if (segPos > 0){     // conserve seg the left side, del right part
            textSeg[segIdx].text = text.slice(0, segPos);
            toDelete -= text.length - segPos;
            segIdx++;
        }
        segPos = 0;
    }

    // Insert
    if (ins.length > 0) {
        if (sumTextSegLen(textSeg) === pos) {     // append to the end
            textSeg.push({
                text: ins,
                type: type
            });
        } else {
             // split current text segment
            [segIdx, segPos] = getSegFromPos(textSeg, pos);
            
            // on the left of seg
            if (segPos == 0) {
                textSeg.splice(segIdx, 0, {
                    text: ins,
                    type: type
                });
            } else if (segPos === textSeg[segIdx].text.length) {    // on the right of seg
                textSeg.splice(segIdx + 1, 0, {
                    text: ins,
                    type: type
                });
            } else {    // in the middle of seg
                const leftText = textSeg[segIdx].text.slice(0, segPos);
                const rightText = textSeg[segIdx].text.slice(segPos);
                textSeg[segIdx].text = leftText;
                textSeg.splice(segIdx + 1, 0, {
                    text: ins,
                    type: type
                });
                textSeg.splice(segIdx + 2, 0, {
                    text: rightText,
                    type: textSeg[segIdx].type
                });
            }
        }
    }
}