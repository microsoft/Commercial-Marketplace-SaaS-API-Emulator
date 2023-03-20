$(() => {

    const notificationsContainer = $("<div class='notifications'></div>").appendTo("body");
    const notificationContainerTemplate = $("<div><button class='close'>x</button><div><span class='request'></span> - <span class='response'></span></div><div class='service'></div></div>");
    const serviceNotificationTemplate = $("<div></div>");

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

    const notifications = {};

    window.addNotificationRequest = (m, id) => {
        const el = notificationContainerTemplate.clone().appendTo(notificationsContainer);

        el.find('.request').html(m);

        el.find(".close").click(e => {
            $(e.target).parent().remove();
        });

        notifications[id] = el;
    }

    window.addNotificationResponse = (r, id) => {
        if (Object.prototype.hasOwnProperty.call(notifications, id)) {
            const el = notifications[id];

            el.find('.response').html(r.status).addClass(r.status >= 200 && r.status < 300 ? 'success' : 'error');
        }
    }

    const guid = () => {
        let result, i, j;
        result = '';
        for(j = 0; j < 32; j++) {
            if(j === 8 || j === 12 || j === 16 || j === 20) {
                result = result + '-';
            }
            i = Math.floor(Math.random() * 16).toString(16).toUpperCase();
            result = result + i;
        }
        return result;
    }

    window.doFetch = async (name, url, body, method, headers) => {
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

});