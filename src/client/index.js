/// <reference path="core.js" />

let config;

$(async () => {
    // Configure purchase form

    const {result} = await callAPI("/api/util/config");
    config = result;

    const defaultPurchaser = {
        email: "user@forthcoffee.com",
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
        $("section.purchase .seat-count input").val('');
        $("section.purchase .seat-count").css({visibility: offer.plans[$planSelect.val()].isPricePerSeat ? 'visible' : 'hidden'});
    });

    // Configure buttons

    $("#viewJsonButton").on("click", showJson);
    $("#viewTokenButton").on("click", showToken);
    $("#purchaseButton").on("click", postToLanding);

    // Retrieve offers

    const offerCount = await renderOffers($('section.offers'), 'Get it now', (e, offer) => {
        $("section.purchase > div").removeClass("hidden");
        $("section.purchase > div.placeholder").addClass("hidden");
        selectOffer(offer);
        return false;
    });

    if (offerCount === 0) {
        $('article .samples').hide();
        $('section.purchase').hide();
        $('section.offers .no-offers').show();
    }

});

function selectOffer(offer) {
    
    $("#subscriptionId").val(guid());

    $("section.purchase .offer > span:first-child").text(offer.displayName);
    $("section.purchase .offer > span:last-child").text(offer.publisher);

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
        "quantity": parseInt($('#quantity').val()),
        "autoRenew": false,
        "isTest": false,
        "isFreeTrial": false
    }

    const json = JSON.stringify(sub, null, 2);
    const base64 = window.btoa(json);

    return {json, base64};
}

async function showJson() {
    const {json} = generateToken();
    await showDialog(`<pre>${highlightJson(json)}</pre>`, "Subscription JSON", {
        "Copy": ($btn) => {
            $btn.text("Copied");
            navigator.clipboard.writeText(json);
            window.setTimeout(() => $btn.text("Copy"), 2000);
        }
    });
}

async function showToken() {
    const {base64} = generateToken();
    await showDialog(`<pre>${base64}</pre>`, "Marketplace Token", {
        "Copy": ($btn) => {
            $btn.text("Copied");
            navigator.clipboard.writeText(base64);
            window.setTimeout(() => $btn.text("Copy"), 2000);
        }
    });
}

// post the token to the given landing page URL
async function postToLanding() {
    const {base64} = generateToken();

    if (config === undefined) {
      await showAlert("Something went wrong trying to get config from the emulator", "Error");
      return;
    }

    const landingPage = config.landingPageUrl;

    if (!landingPage) {
        await showAlert("No landing page URL set in config", "Landing Page");
        return;
    }

    if (checkLandingPageUrl(landingPage)) {
        const ok = await showYesNo('The landing page is set to localhost but the emulator appears to be running on a remote host. Please confirm the landing page URL is correct. Visit the Config page to check.<br /><br />Would you like to continue?', "Landing Page");
        if (!ok) {
            return;
        }
    }

    const target = landingPage + '?token=' + base64;

    if (config.landingPageUrl.toLowerCase().startsWith(window.location.origin.toLowerCase())) {
        window.location.href = target;
    }
    else {
        window.open(target, '_blank');
    }
  }

  // Check if we're running on a remote host but the landing page has been left as default (localhost)
  function checkLandingPageUrl(landingPageUrl) {
    return landingPageUrl.startsWith('http://localhost') && $(location).attr('hostname') !== 'localhost';
  }