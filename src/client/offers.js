/// <reference path="core.js" />

$(async () => {

    const $offersContainer = $('section.offers');

    await renderOffer($offersContainer, {
        displayName: 'Create New Offer',
        publisher: 'You'
    }, 'Create', () => {
        selectOffer();
    }, 'new');

    await renderOffers($offersContainer, 'View', (e) => {
        selectOffer($(e.target).data('offer'));
    });

    $('section.offers .action a').each((i, e) => {
        const $e = $(e);
        const offer = $e.data('offer');

        if (offer && offer.plans && !offer.builtIn) {
            $e.text("Edit");
        }
    });

    $('section.detail input, section.detail select').removeClass('.invalid');
});

function deleteRow_click(e) {
    $(e.target).closest('tr').remove();

    checkDeleteRow();
}

function addRow_click(e) {
    addRow($(e.target).closest('tr'));
}

function clone_click(e) {
    const offer = $('section.detail').data('selected-offer');

    offer.offerId = '';
    offer.builtIn = false;

    if (offer.plans) {
        for (const plan of Object.values(offer.plans)) {
            plan.planId = '';
        }
    }

    selectOffer(offer, true);
}

function selectOffer(offer, cloned) {    
    $('section.detail > div').show();

    $('tbody tr').not('.template').remove();

    $('section.detail input.invalid').removeClass('invalid').attr('title', '');

    $('section.detail').data('selected-offer', offer);
    
    const $buttons = $('section.detail tfoot button').attr('disabled', false).show();
    const $header = $('section.detail header');

    if (!offer || cloned) {
        $buttons.not('.new').attr('disabled', true).hide();
        $header.text('New Offer');
    }
    else if (offer.builtIn) {
        $buttons.not('.built-in').attr('disabled', true).hide();
        $header.text('View Offer');
    }
    else {
        $buttons.not('.custom').attr('disabled', true).hide();
        $header.text('Edit Offer');
    }

    if (offer) {

        $('#offer-name').val(offer.displayName).attr('disabled', offer.builtIn);

        $('#offer-id').val(offer.offerId);
        $('#offer-id').attr('disabled', offer.offerId.length > 0);

        const plans = Object.values(offer.plans);

        if (plans.length > 0) {
            $('#per-seat').val(plans[0].isPricePerSeat.toString());

            $('#per-seat').val(plans[0].isPricePerSeat.toString()).attr('disabled', !cloned);

            for (const plan of plans) {
                addRow(undefined, plan, offer.builtIn);
            }
        }
    }
    else {
        $('#offer-name').val('');
        $('#offer-id').val('').attr('disabled', false);
        $('#per-seat').val('true').attr('disabled', false);
        addRow();
    }

    checkDeleteRow();
}

function cancel_click() {
    $('section.detail > div').hide();
}

function validateDetail() {
    let valid = true;

    $('section.detail input.invalid').removeClass('invalid').attr('title', '');

    $('section.detail input').each((i, e) => {
        const $e = $(e);
        if ($e.closest('tr').hasClass('template')) {
            return;
        }
        const val = $e.val();
        if (val.trim() === '') {
            $e.addClass('invalid').attr('title', 'Value is required');
            valid = false;
        }
    });

    // Check for unique offer id
    const offerIdToCheck = $('#offer-id').val();

    if ($(`[data-offer-id='${offerIdToCheck}']`).length > 0) {
        if ($('#offer-id').not(':disabled').length > 0) {
            $('#offer-id').addClass('invalid').attr('title', 'Offer Id already exists');
            valid = false;
        }
    }

    // Get list of plan Ids
    const planIds = {};

    $('section.offers > div').each((i, e) => {
        const offer = $(e).data('offer');
        for (const plan in offer.plans) {
            if (!Object.prototype.hasOwnProperty.call(offer.plans, plan)) {
                continue;
            }
            planIds[plan] = true;
        }
    });

    // Check for unique plan ids
    $('section.detail tr').not('.template').find('.plan-id input').not(':disabled').each((i, e) => {
        const $e = $(e);
        const planIdToCheck = $e.val();
        
        if (Object.prototype.hasOwnProperty.call(planIds, planIdToCheck)) {
            
            $e.addClass('invalid').attr('title', 'Plan Id already exists');
            valid = false;
        }
    });

    return valid;
}

function getOffer() {
    const offer = {
        displayName: $('#offer-name').val().trim(),
        offerId: $('#offer-id').val().trim(),
        plans: {}
    };

    const perSeat = $('#per-seat').val() === 'true';

    $('table tbody tr').not('.template').each((i, e) => {
        const $e = $(e);
        offer.plans[$e.find('.plan-id input').val().trim()] = {
            displayName: $e.find('.plan-name input').val().trim(),
            planId: $e.find('.plan-id input').val().trim(),
            isPricePerSeat: perSeat,
            planComponents: {
                recurrentBillingTerms: [
                    {
                        currency: "USD",
                        price: $e.find('.price input').val().trim(),
                        termUnit: $e.find('.billing-term select').val().trim()
                    }
                ]
            }
        }
    });

    return offer;
}

async function saveOffer_click() {
    if (!validateDetail()) {
        return;
    }

    const offer = getOffer();

    const {result} = await callAPI('/api/util/offers', 'POST', offer);

    if (!result) {
        return;
    }

    renderOffer($('section.offers'), result, 'Edit', (e) => {
        selectOffer(result);
    });

    selectOffer(result);
}

async function deleteOffer_click() {

    if (!await showYesNo('Deleting an offer cannot be undone<br /><br />Are you sure you want to continue?', 'Delete Offer')) {
        return;
    }

    const offer = $('section.detail').data('selected-offer');

    const {status} = await callAPI(`/api/util/offers/${offer.offerId}`, 'DELETE');

    if (status === 204) {
        removeOffer($('section.offers'), offer.offerId);
        cancel_click();
    }
    else {
        await showAlert('Unable to delete offer, it might be associated with a subscription', 'Delete Offer');
    }
}

function addRow(after, plan, builtIn) {
    const newRow = $('tbody tr.template').clone().removeClass('template');

    if (after) {
        newRow.insertAfter(after);
    }
    else {
        newRow.appendTo($('tbody'));
    }

    if (plan) {
        newRow.find('td.plan-name input').val(plan.displayName);
        newRow.find('td.plan-id input').val(plan.planId);
        newRow.find('td.billing-term select').val(plan.planComponents.recurrentBillingTerms[0].termUnit);
        newRow.find('td.price input').val(plan.planComponents.recurrentBillingTerms[0].price);

        newRow.find('td input, td select').attr('disabled', builtIn);
        newRow.find('td.plan-id input').attr('disabled', builtIn || plan.planId.length > 0);
    }

    checkDeleteRow();
}

function checkDeleteRow() {
    const deleteButtons = $('tbody tr').not('.template').find('button.danger').not(':disabled');

    if (deleteButtons.length === 1) {
        deleteButtons.hide();
    }
    else {
        deleteButtons.show();
    }
}