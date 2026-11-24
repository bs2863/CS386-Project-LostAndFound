
// Tests for the lost and found matching system

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { findPotentialMatch } = require('../matching');

// Test that two similar items receive a high match score
test('Similar lost and found items should be flagged for staff review', () => {
    const lostItem = {
        type: 'lost',
        status: 'open',
        categoryId: 'C001',
        name: 'Velcro Wallet',
        color: 'black',
        brand: 'Nike',
        description: 'small blue logo',
        locationId: 'LOC001',
        date: '2026-11-20'
    };

    const foundItem = {
        type: 'found',
        status: 'unclaimed',
        categoryId: 'C001',
        name: 'Black Wallet',
        color: 'black',
        brand: 'Nike',
        description: 'small blue logo',
        locationId: 'LOC001',
        date: '2026-11-21'
    };

    const result = findPotentialMatch(lostItem, foundItem);

    // Check that the items are considered a match
    assert.notEqual(result, null);

    // Check the score and staff review flag
    assert.equal(result.score, 100);
    assert.equal(result.requiresStaffReview, true);
});

// Test that unrelated items are not considered a match
test('Different items should not be returned as potential matches', () => {
    const lostItem = {
        type: 'lost',
        status: 'open',
        categoryId: 'C001',
        name: 'Velcro Wallet',
        color: 'black',
        brand: 'Nike',
        description: 'small blue logo',
        locationId: 'LOC001',
        date: '2026-11-10'
    };

    const foundItem = {
        type: 'found',
        status: 'unclaimed',
        categoryId: 'C001',
        name: 'Travel Backpack',
        color: 'red',
        brand: 'Adidas',
        description: 'large green backpack',
        locationId: 'LOC002',
        date: '2026-11-25'
    };

    const result = findPotentialMatch(lostItem, foundItem);

    // Check that no potential match is returned
    assert.equal(result, null);
});
