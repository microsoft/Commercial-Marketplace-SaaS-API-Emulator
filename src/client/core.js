async function callAPI(path, method, body) {

    method = method || "GET";

    const response = await fetch(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    let result;

    if (response.ok) {
        try {
            result = await response.json();
        }
        catch {}
    }

    return {result, status: response.status};
}

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function showAlert(content, title) {
    return _showModal(content, title, {"Ok": true}, "alert");
}

function showYesNo(content, title) {
    return _showModal(content, title, {"Yes": true, "No": false}, "alert");
}

function showDialog(content, title, buttons) {
    return _showModal(content, title, { ...buttons, "Close": true });
}

async function showDialogWithResult(content, title, buttons, resultCallback) {
    await _showModal(content, title, { ...buttons, "Cancel": true });
    return resultCallback();
}

function _showModal(content, title, buttons, contentClass) {
    
    return new Promise((resolve, reject) => {
        let $modal = $("#modal");
        if ($modal.length === 0) {
            $modal = $("<div id='modal'><div><header></header><div></div><footer></footer></div></div>")
                .addClass("modal")
                .appendTo("body");
        }
        const $body = $modal.children("div");

        $body.children("header").html(title);
        const $content = $body.children("div").html(typeof content === 'string' ? content : content.html());
        if (contentClass !== undefined) {
            $content.addClass(contentClass);
        }
        const $footer = $body.children("footer").empty();

        if (buttons !== undefined) {
            for (const buttonText in buttons) {
                const button = buttons[buttonText];
                const $button = $("<button></button>")
                    .addClass("button secondary")
                    .text(buttonText)
                    .on("click", () => {
                        if (typeof button === 'function') {
                            const buttonResult = button($button, $body);
                            if (buttonResult !== undefined) {
                                $modal.hide();
                                resolve(buttonResult);
                            }
                        }
                        else {
                            $modal.hide();
                            resolve(button);
                        }
                    })
                    .appendTo($footer);
            }
        }

        $modal.show();
    });
}


const notifications = {};
let notificationsContainer;
let notificationContainerTemplate;
let serviceNotificationTemplate;

$(() => {

    notificationsContainer = $("<div class='notifications'></div>").appendTo("body");
    notificationContainerTemplate = $("<div><button class='close'>x</button><div><span class='request'></span> - <span class='response'></span></div><div class='service'></div></div>");
    serviceNotificationTemplate = $("<div></div>");

    let protocol = "ws";

    if (window.location.protocol.endsWith("s:")) {
        protocol += "s";
    }

    // eslint-disable-next-line no-undef
    const socket = new WebSocket(`${protocol}://${window.location.host}`);

    socket.addEventListener('message', e => {

        const n = JSON.parse(e.data);

        if (n.type === "update") {
            $(document).trigger('subscription-update', [n.subscriptionId, n.publisherId]);
        }

        if (Object.prototype.hasOwnProperty.call(notifications, n.id)) {
            const el = notifications[n.id];

            const message = n.type === "update" ? "Subscription updated" : n.message;

            serviceNotificationTemplate.clone().appendTo(el.find('.service')).html(message).addClass(n.type);
        }
    });

    
});

function addNotificationRequest(m, id) {
    const el = notificationContainerTemplate.clone().appendTo(notificationsContainer);

    el.find('.request').html(m);

    el.find(".close").click(e => {
        $(e.target).parent().remove();
    });

    notifications[id] = el;
}

function addNotificationResponse(r, id) {
    if (Object.prototype.hasOwnProperty.call(notifications, id)) {
        const el = notifications[id];

        el.find('.response').html(r.status).addClass(r.status >= 200 && r.status < 300 ? 'success' : 'error');
    }
}

async function doFetch(name, url, body, method, headers) {
    const id = guid();
    const contentTypeHeader = {};

    if (body) {
        contentTypeHeader["Content-Type"] = "application/json";
    }

    window.addNotificationRequest(name, id);

    const response = await fetch(url, {
        method: method || (body ? "POST" : "GET"),
        headers: {
            ...headers,
            ...contentTypeHeader,
            "x-ms-requestid": id
        },
        body
    });
    window.addNotificationResponse(response, id);
    return response;
}

const offerTemplate = $(`
    <div>
        <div class="icon"></div>
        <div class="name"></div>
        <div class="publisher"></div>
        <div class="starts-from">Plans start at</div>
        <div class="price"></div>
        <div class="action">
            <a href="#"></a>
        </div>
    </div>
`);

function removeOffer($offerContainer, offerId) {
    $offerContainer.find(`[data-offer-id='${offerId}']`).remove();
}

function renderOffer($offerContainer, offer, actionText, action, className) {
    
    const isPerUser = Object.values(offer.plans || {}).find((_, i) => i === 0)?.isPricePerSeat === true;

    let $offer = $offerContainer.find(`[data-offer-id='${offer.offerId}']`);

    if ($offer.length === 0) {
        $offer = offerTemplate.clone()
            .attr('data-offer-id', offer.offerId)
            .data('offer', offer)
            .appendTo($offerContainer);
    }

    if (className) {
        $offer.addClass(className);
    }

    $offer.find('.action a')
        .data('offer', offer)
        .text(actionText)
        .on('click', (e) => {
            action(e, offer);
            return false;
        });

    $offer.children(".name").html(offer.displayName);
    $offer.children(".publisher").html(offer.publisher);
    $offer.children(".price").html(getMinPriceAndTerm(offer));
}

async function renderOffers($offerContainer, actionText, action) {
    const {result} = await callAPI('/api/util/offers');


    for (const offerId in result) {

        if (!Object.prototype.hasOwnProperty.call(result, offerId)) {
            continue;
        }

        const offer = result[offerId];
        renderOffer($offerContainer, offer, actionText, action, offer.builtIn ? 'built-in' : undefined);
    }
}

function getMinPriceAndTerm(offer) {
    if (!offer || !offer.plans) {
        return 'Free';
    }

    const plans = Object.values(offer.plans);

    if (plans.length === 0) {
        return 'Free';
    }

    const billingTerms = plans.flatMap(x => x.planComponents.recurrentBillingTerms);
    const perMonthMinPrice = Math.min(...billingTerms.filter(x => x.termUnit === 'P1M').map(x => x.price));
    const perYearMinPrice = Math.min(...billingTerms.filter(x => x.termUnit === 'P1Y').map(x => x.price));
    
    const type = (plans[0].isPricePerSeat) ? 'user/' : '';

    if (!isNaN(perMonthMinPrice) && isFinite(perMonthMinPrice)) {
        return `$ ${perMonthMinPrice}/${type}month`;
    }

    if (!isNaN(perYearMinPrice) && isFinite(perYearMinPrice)) {
        return `$ ${perYearMinPrice}/${type}year`;
    }

    return 'Unknown price';
}