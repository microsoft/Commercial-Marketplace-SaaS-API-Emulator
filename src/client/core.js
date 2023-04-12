async function callAPI(path, method, body) {

    console.log(body);

    method = method || "GET";

    const response = await fetch(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (response.ok && method === "GET") {
        return await response.json();
    }

    return undefined;
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

function _showModal(content, title, buttons, contentClass) {
    
    return new Promise((resolve, reject) => {
        let $modal = $("#modal");
        if ($modal.length === 0) {
            $modal = $("<div id='modal'><div><header></header><div></div><footer></footer></div></div>")
                .addClass("modal")
                .appendTo("body");
        }
        $body = $modal.children("div");

        $body.children("header").html(title);
        $content = $body.children("div").html(content);
        if (contentClass !== undefined) {
            $content.addClass(contentClass);
        }
        $footer = $body.children("footer").empty();

        if (buttons !== undefined) {
            for (const buttonText in buttons) {
                const button = buttons[buttonText];
                const $button = $("<button></button>")
                    .addClass("button secondary")
                    .text(buttonText)
                    .on("click", () => {
                        if (typeof button === 'function') {
                            button($button);
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
        <div class="starts-from"></div>
        <div class="price"></div>
        <div class="action">
            <a href="#"></a>
        </div>
    </div>
`);

function renderOffer($offerContainer, offer, actionText, action, className) {
    
    const isPerUser = Object.values(offer.plans || {}).find((_, i) => i === 0)?.isPricePerSeat === true;

    const $offer = offerTemplate.clone()
        .appendTo($offerContainer);

    if (className) {
        $offer.addClass(className);
    }

    $offer.children(".name").html(offer.displayName);
    $offer.children(".publisher").html(offer.publisher);
    $offer.children(".price").html(`$ XX/user/month`);
    $offer.find('.action a').text(actionText);

    $offer.find(".action a").on('click', (e) => action(e, offer));
}

async function renderOffers($offerContainer, actionText, action) {
    const offers = await callAPI('/api/util/offers');


    for (const offerId in offers) {

        if (!Object.prototype.hasOwnProperty.call(offers, offerId)) {
            continue;
        }

        const offer = offers[offerId];
        renderOffer($offerContainer, offer, actionText, action);
    }
}