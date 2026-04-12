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