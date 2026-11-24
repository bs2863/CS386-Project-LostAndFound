//import new matching score calculator
const { matchingScorer } = require('./Matching/scores/matchingScorer');


//check if 2 items are even able to be compared
function canCompareItems(lostItem, foundItem) 
{

    //make sure 1 item is lost and the other is found
    if (lostItem.type !== 'lost' || foundItem.type !== 'found') 
    {
        return false;
    }

    //only compare lost reports if open
    if (lostItem.status !== 'open') 
    {
        return false;
    }

    //only compare found reports that have not been already claimed
    if (foundItem.status !== 'unclaimed') {
        return false;
    }

    //items must belong to same category
    if (lostItem.categoryId !== foundItem.categoryId) {
        return false;
    }

    //if all checks pass items can be compared
    return true;
}

//calculate how closely a lost item matches a found item  
function calculateMatchScore(lostItem, foundItem) {
    // Use the new scoring files to calculate the total score
    return matchingScorer(lostItem, foundItem);
}




//check if two items should be considered a potential match
function findPotentialMatch(lostItem, foundItem) {

    //make sure these items are able to be compared
    if (!canCompareItems(lostItem, foundItem)) {
        return null;
    }

    //calculate how many points items receive
    const score = calculateMatchScore(lostItem, foundItem);

    //only keep matches that receive at least 50 points
    if (score < 50) {
        return null;
    }

    //return the items together with their match score
    return {
        lostItem: lostItem,
        foundItem: foundItem,
        score: score,
    
        //flag matches so staff can review
        requiresStaffReview: score >= 75
    };
}


//group lost items with their possible found item matches
function groupMatchingItems(items) {

    //separate lost and found reports
    const lostItems = items.filter(item => item.type === 'lost');
    const foundItems = items.filter(item => item.type === 'found');

    //hold all groups of potential matches
    const matchingGroups = [];

    //check each lost item against found items
    for (const lostItem of lostItems) {

        //store possible matches 
        const possibleMatches = [];

        for (const foundItem of foundItems) {

            //check if reports could be a match
            const match = findPotentialMatch(lostItem, foundItem);

            //add the match if it passed the checks
            if (match !== null) {
                possibleMatches.push(match);
            }
        }

        //only create a group if at least one match was found
        if (possibleMatches.length > 0) {
            matchingGroups.push({
                lostItem: lostItem,
                possibleMatches: possibleMatches
            });
        }
    }

    //return all groups of potential matches
    return matchingGroups;
}

//make these functions available to other backend files
module.exports = {
    canCompareItems,
    calculateMatchScore,
    findPotentialMatch,
    groupMatchingItems
};