async function checkDuplicates(lostItem) {
    const response = await fetch('/api/v1/items/check-duplicate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: lostItem.name,
            categoryId: lostItem.categoryId,
            locationId: lostItem.locationId
        })
    });

    if (!response.ok) {
        throw new Error('Failed to check duplicates');
    }

    const result = await response.json();

    // Return an array if a duplicate exists
    if (result.duplicate) {
        return [result.message];
    }

    // No duplicates
    return [];
}