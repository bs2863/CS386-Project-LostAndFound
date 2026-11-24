const { keywordMatch } = require('./keywordMatch');
const { attributeMatch } = require('./attributeMatch');

//calculate the total score between lost and found
function matchingScorer(lostItem, foundItem) {
    let score = 0;

    //add points from matching item names
    score += keywordMatch(lostItem, foundItem);

    //add points from matching colors and brands
    score += attributeMatch(lostItem, foundItem);

    //add points if the descriptions contain similar information
    if (lostItem.description && foundItem.description &&
        lostItem.description.toLowerCase().includes(foundItem.description.toLowerCase())) {
        score += 15;
    }

    //add points if both items were reported at same location
    if (lostItem.locationId && foundItem.locationId &&
        lostItem.locationId === foundItem.locationId) {
        score += 20;
    }

    //add points if reports were submitted within 7 days
    if (lostItem.date && foundItem.date) {
        const lostDate = new Date(lostItem.date);
        const foundDate = new Date(foundItem.date);

        //make sure both dates are valid before comparing them
        if (!isNaN(lostDate.getTime()) && !isNaN(foundDate.getTime())) {
            const differenceInTime = Math.abs(lostDate - foundDate);
            const differenceInDays = differenceInTime / (1000 * 60 * 60 * 24);

            if (differenceInDays <= 7) {
                score += 5;
            }
        }
    }

    return score;
}

module.exports = { matchingScorer };
