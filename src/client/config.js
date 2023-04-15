/// <reference path="core.js" />

$(async () => {
    const {result} = await callAPI('/api/util/config');

    for (const i in result) {
        if (!Object.prototype.hasOwnProperty.call(result, i)) {
            continue;
        }

        const $input = $(`input[data-json-path='${i}'],select[data-json-path='${i}']`);

        $input.val(result[i].toString());
    }

    $('button').not('.danger').on('click', async (e) => {
        const $button = $(e.target);
        const $input = $button.siblings('input,select');
        const jsonPath = $input.data("json-path");

        let val;

        if (typeof result[jsonPath] === 'boolean') {
            val = $input.val() === 'true';
        }
        else {
            val = $input.val();
        }
        
        if ($input.attr('type') === 'number') {
            val = parseInt(val);
        }

        result[jsonPath] = val;

        if (!await showYesNo(`<p>This change will occur but not be persisted and will be lost if the emulator is restarted, to start the emulator with this new value use the following environment variable:</p><pre>${$input.data('env')} = ${val}</pre><p>Do you want to continue?</p>`, 'Change Config')) {
            return;
        }

        await callAPI('/api/util/config', 'PATCH', result);
    });

    $('.buttons > button').on('click', async () => {
        const config = JSON.parse(JSON.stringify(result));
        config.webhook['clientSecret'] = "&lt;redacted&gt;";
        await showDialog('<pre>' + highlightJson(JSON.stringify(config, undefined, 2)) + '</pre>', 'Config');
    });
});

async function clear_click() {
    if (!await showYesNo("Clearing the data file will remove all custom offers and subscriptions and cannot be undone.<br /><br />Are you sure you want to continue?", "Clear Data")) {
        return;
    }

    await callAPI('/api/util/data-file', 'DELETE');
}