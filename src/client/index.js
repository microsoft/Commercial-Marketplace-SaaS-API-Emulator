/// <reference path="core.js" />

$(async () => {

    // Configure purchase form

    const defaultPurchaser = {
        email: "user@fourthcoffee.com",
        oid: guid(),
        tid: guid()
    }

    $("#beneficiaryEmail,#purchaserEmail").val(defaultPurchaser.email);
    $("#beneficiaryOid,#purchaserOid").val(defaultPurchaser.oid);
    $("#beneficiaryTid,#purchaserTid").val(defaultPurchaser.tid);

    const $purchaserInputs = $("#purchaserEmail,#purchaserOid,#purchaserTid");
    const $purchaserToggle = $("#purchaserIsBeneficiary");
    const $toggleOptionalFields = $("section.purchase .toggle-optional a");
    const $planSelect = $("section.purchase select");

    $purchaserToggle.on("change", () => {
        $purchaserInputs.attr("disabled", !$purchaserToggle.is(":checked")).parent().toggleClass("hidden", !$purchaserToggle.is(":checked"));
    });

    let displayOptionalFields = false;
    $toggleOptionalFields.on("click", () => {
            $("section.purchase div.optional").toggleClass("hidden", displayOptionalFields);
            $purchaserToggle.trigger("change");
            displayOptionalFields = !displayOptionalFields;
            $toggleOptionalFields.text(!displayOptionalFields ? "Show optional fields" : "Hide optional fields");
            return false;
        });

    $planSelect.on("change", () => {
        const offer = $planSelect.data("offer");
        $("section.purchase .seat-count").toggleClass("hidden", !offer.plans[$planSelect.val()].isPricePerSeat);
    });

    // Configure buttons

    $("#viewJsonButton").on("click", showJson);
    $("#viewTokenButton").on("click", showToken);

    // Retrieve offers

    const offers = await callAPI('/api/util/offers');

    const offerTemplate = $("section.marketplace .template");

    for (const offerId in offers) {

        if (!Object.prototype.hasOwnProperty.call(offers, offerId)) {
            continue;
        }

        const offer = offers[offerId];

        const $offer = offerTemplate.clone()
            .removeClass("template")
            .appendTo(offerTemplate.parent());

        $offer.children(".name").html(offer.displayName);

        $offer.find(".get-it-now a").on('click', () => {
            $("section.purchase > div").removeClass("hidden");
            $("section.purchase > div.placeholder").addClass("hidden");
            selectOffer(offer);
            return false;
        });
    }

});

function selectOffer(offer) {
    
    $("#subscriptionId").val(guid());

    $("section.purchase .offer > span:first-child").text(offer.displayName);

    const $plans = $("section.purchase select").empty();

    for (const planId in offer.plans) {
        if (!Object.prototype.hasOwnProperty.call(offer.plans, planId)) {
            continue;
        }

        const plan = offer.plans[planId];

        $plans.data("offer", offer).append($("<option></option>")
            .html(planId + " - " + plan.displayName)
            .val(planId));
    }

    $plans.trigger("change");
}

function generateToken() {

    const beneficiaryAsPurchaser = !$("#purchaserIsBeneficiary").is(":checked");
    const $plans = $("section.purchase select");

    const sub = { 
        "id": $('#subscriptionId').val(),
        "name": $('#subscriptionName').val(),
        "offerId": $plans.data("offer").offerId,
        "planId": $plans.val(),
        "beneficiary": {
            "emailId": $('#beneficiaryEmail').val(),
            "objectId": $('#beneficiaryOid').val(),
            "tenantId": $('#beneficiaryTid').val()
        },
        "purchaser": {
            "emailId": beneficiaryAsPurchaser ? $("#beneficiaryEmail").val() : $("#purchaserEmail").val(),
            "objectId": beneficiaryAsPurchaser ? $('#beneficiaryOid').val() : $("#purchaserOid").val(),
            "tenantId": beneficiaryAsPurchaser ? $('#beneficiaryTid').val() : $("#purchaserTid").val()
        },
        "autoRenew": false,
        "isTest": false,
        "isFreeTrial": false
    }

    const json = JSON.stringify(sub, null, 2);
    const base64 = window.btoa(json);

    return {json, base64};
}

function showJson() {
    const {json} = generateToken();
    showDialog(`<pre>${json}</pre>`, "Subscription JSON", {
        "Copy": ($btn) => {
            $btn.text("Copied");
            navigator.clipboard.writeText(json);
            window.setTimeout(() => $btn.text("Copy"), 2000);
        }
    });
}

function showToken() {
    const {base64} = generateToken();
    showDialog(`<pre>${base64}</pre>`, "Marketplace Token", {
        "Copy": ($btn) => {
            $btn.text("Copied");
            navigator.clipboard.writeText(base64);
            window.setTimeout(() => $btn.text("Copy"), 2000);
        }
    });
}