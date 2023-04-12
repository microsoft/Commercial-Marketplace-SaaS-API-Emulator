/// <reference path="core.js" />

$(async () => {
    const config = await callAPI('/api/util/config');

    for (const i in config) {
        if (!Object.prototype.hasOwnProperty.call(config, i)) {
            continue;
        }

        const $input = $(`input[data-json-path='${i}'],select[data-json-path='${i}']`);

        $input.val(config[i].toString());
    }

    $('button').not('.danger').on('click', async (e) => {
        const $button = $(e.target);
        const $input = $button.siblings('input,select');
        const jsonPath = $input.data("json-path");

        let val;

        if (typeof config[jsonPath] === 'boolean') {
            val = $input.val() === 'true';
        }
        else {
            val = $input.val();
        }
        
        if ($input.attr('type') === 'number') {
            val = parseInt(val);
        }

        config[jsonPath] = val;

        await callAPI('/api/util/config', 'PATCH', config);
    });
});