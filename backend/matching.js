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
    let score = 0;

    // Add points if the item names are the same or one contains the other
const lostName = lostItem.name.toLowerCase().trim();
const foundName = foundItem.name.toLowerCase().trim();
//allpws for slight variations
if (lostName.includes(foundName) || foundName.includes(lostName)) 
    {
    score += 25;
}

    // Add points if the colors match
    if (lostItem.color && foundItem.color &&
        lostItem.color.toLowerCase() === foundItem.color.toLowerCase()) {
        score += 20;
    }

    // Add points if the brands match
    if (lostItem.brand && foundItem.brand &&
        lostItem.brand.toLowerCase() === foundItem.brand.toLowerCase()) {
        score += 15;
    }

    // Add points if the descriptions contain similar information
    if (lostItem.description && foundItem.description &&
        lostItem.description.toLowerCase().includes(foundItem.description.toLowerCase())) {
        score += 15;
    }

    // Add points if both items were reported at the same location
    if (lostItem.locationId === foundItem.locationId) {
        score += 20;
    }

    // Add points if the reports were submitted within 7 days of each other
    if (lostItem.date && foundItem.date) {
        const lostDate = new Date(lostItem.date);
        const foundDate = new Date(foundItem.date);

        // Find the number of days between the two dates
        const differenceInTime = Math.abs(lostDate - foundDate);
        const differenceInDays = differenceInTime / (1000 * 60 * 60 * 24);

        if (differenceInDays <= 7) {
            score += 5;
        }
    }

    return score;
}



// Check whether two items should be considered a potential match
function findPotentialMatch(lostItem, foundItem) {

    // First, make sure these items are eligible to be compared
    if (!canCompareItems(lostItem, foundItem)) {
        return null;
    }

    // Calculate how many points the two items receive
    const score = calculateMatchScore(lostItem, foundItem);

    // Only keep matches that receive at least 50 points
    if (score < 50) {
        return null;
    }

    // Return the items together with their match score
    return {
        lostItem: lostItem,
        foundItem: foundItem,
        score: score
    };
}


// Group lost items with their possible found item matches
function groupMatchingItems(items) {

    // Separate lost and found reports
    const lostItems = items.filter(item => item.type === 'lost');
    const foundItems = items.filter(item => item.type === 'found');

    // This will hold all groups of potential matches
    const matchingGroups = [];

    // Check each lost item against the found items
    for (const lostItem of lostItems) {

        // Store possible matches for this lost item
        const possibleMatches = [];

        for (const foundItem of foundItems) {

            // Check if the two reports could be a match
            const match = findPotentialMatch(lostItem, foundItem);

            // Add the match if it passed the checks
            if (match !== null) {
                possibleMatches.push(match);
            }
        }

        // Only create a group if at least one match was found
        if (possibleMatches.length > 0) {
            matchingGroups.push({
                lostItem: lostItem,
                possibleMatches: possibleMatches
            });
        }
    }

    // Return all groups of potential matches
    return matchingGroups;
}

// Make these functions available to other backend files
module.exports = {
    canCompareItems,
    calculateMatchScore,
    findPotentialMatch,
    groupMatchingItems
};