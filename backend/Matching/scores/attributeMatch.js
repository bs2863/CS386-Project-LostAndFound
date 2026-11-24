//compare item colors and brands
function attributeMatch(lostItem, foundItem) {
    let score = 0;

    //check if both items have color listed
    if (lostItem.color && foundItem.color) {
        const lostColor = lostItem.color.toLowerCase().trim();
        const foundColor = foundItem.color.toLowerCase().trim();

        //add points if match
        if (lostColor === foundColor) {
            score += 20;
        }
    }

    //check if both items have a brand listed
    if (lostItem.brand && foundItem.brand) {
        const lostBrand = lostItem.brand.toLowerCase().trim();
        const foundBrand = foundItem.brand.toLowerCase().trim();

        //add points if match
        if (lostBrand === foundBrand) {
            score += 15;
        }
    }

    return score;
}

module.exports = { attributeMatch };
