/// <reference path="core.js" />

$(async () => {

    const $offersContainer = $('section.offers');

    await renderOffer($offersContainer, {
        displayName: 'Create New Offer',
        publisher: 'You'
    }, 'Create', () => {}, 'new');

    await renderOffers($offersContainer, 'View', () => {});
})