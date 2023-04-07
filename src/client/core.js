async function callAPI(path, method, body) {
    const response = await fetch(path, {
        method: method || "GET",
        body: body ? JSON.stringify(body) : undefined
    });

    if (response.ok) {
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