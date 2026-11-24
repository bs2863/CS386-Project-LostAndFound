// Compare item names using individual words
function keywordMatch(lostItem, foundItem) {
    let score = 0;

    // Make both names lowercase and split them into words
    const lostName = lostItem.name.toLowerCase().trim().split(/\s+/);
    const foundName = foundItem.name.toLowerCase().trim().split(/\s+/);

    // Ignore common words that don't tell us much about the item
    const ignoredWords = ['the', 'and', 'for', 'with', 'small', 'large'];

    // Find words that appear in both item names
    const sharedWords = lostName.filter(word =>
        word.length > 2 &&
        !ignoredWords.includes(word) &&
        foundName.includes(word)
    );

    // Give points if the names share a useful word
    if (sharedWords.length > 0) {
        score += 25;
    }

    return score;
}

module.exports = { keywordMatch };
