/// <reference path="core.js" />
/// <reference path="notifications.js" />

$(async () => {
  const {result} = await callAPI('/api/util/publishers');

  const publisherRowTemplate = $('#publisher-row');

  for (const pid in result) {
    const publisherSubscriptions = result[pid];

    publisherRowTemplate
      .clone()
      .appendTo(publisherRowTemplate.parent())
      .removeClass('template')
      .attr('id', '')
      .children('td')
      .text(`Publisher Id: ${pid}`);

    for (const sid in publisherSubscriptions) {
      addRow(publisherSubscriptions[sid].subscription, pid);
    }
  }
});

$(document).on('subscription-update', async (e, sid, pid) => {
        
    const {result} = await callAPI(`/api/util/publishers/${pid}/subscriptions/${sid}`);

    const row = addRow(result);

    row.addClass("animate-fade");

});

function addRow(subscription) {
  const subscriptionRowTemplate = $('#subscription-row');
  const row = subscriptionRowTemplate.clone().removeClass('template').attr({ id: '', 'data-sid': subscription.id });

  const replace = subscriptionRowTemplate.parent().children(`tr[data-sid='${subscription.id}']`);

  if (replace.length !== 0) {
    row.insertAfter(replace);
    replace.remove();
  } else {
    row.appendTo(subscriptionRowTemplate.parent());
  }

  row.addClass(subscription.saasSubscriptionStatus.toLowerCase());

  const cells = row.children('td');
  const status = subscription.saasSubscriptionStatus;

  const id = subscription.id;

  $(cells[0]).text(id.substring(0, 4) + ' ... ' + id.substring(id.length - 4, id.length));
  $(cells[0]).attr('title', id);
  $(cells[1]).text(subscription.name);
  $(cells[2]).text(subscription.offerId);
  $(cells[3]).text(subscription.planId);
  $(cells[4]).text(subscription.quantity || 0);
  if (status === 'PendingFulfillmentStart') {
    $(cells[5]).text('Pending');
  } else {
    $(cells[5]).text(status);
  }

  $(cells[6])
    .children('button')
    .each((i, e) => {
      const button = $(e);
      const requiredStatus = button.attr('data-requiredStatus');
      let enabled = false;

      if (requiredStatus.startsWith('!') && status != 'Unsubscribed') {
        enabled = requiredStatus.substring(1) != status;
      } else {
        enabled = requiredStatus == status;
      }

      button.attr('disabled', !enabled).data({
        subscriptionId: subscription.id,
        planID: subscription.planId,
        publisherId: subscription.publisherId
      });
      if (enabled === false) {
        button.hide();
      }
    });

  return row;
}

async function activate_click(e) {
  const subscription = $(e.target).data('subscriptionId');
  const planId = { planId: $(e.target).data('planID') };
  const publisherId = $(e.target).data('publisherId');
  await doFetch(
    '/activate',
    `api/saas/subscriptions/${subscription}/activate?publisherId=${publisherId}&api-version=2018-08-31`,
    JSON.stringify(planId)
  );
  $(e.target).attr('enabled', false);
}

async function delete_click(e) {

    if (!await showYesNo("Deleting a subscription cannot be undone<br /> <br />Are you sure you want to continue?", "Delete Subscription")) {
        return;
    }

    const subscriptionId = $(e.target).data('subscriptionId');
    const publisherId = $(e.target).data('publisherId');

    const {status} = await callAPI(`/api/util/publishers/${publisherId}/subscriptions/${subscriptionId}`, 'delete');

    if (status === 204) {
        $(`tr[data-sid='${subscriptionId}']`).remove();
    }
}

async function changeQuantity_click(e) {
  const quantity = await showDialog($('#change-quantity-dialog'), "Change Quantity", {
    'Ok': (button, body) => {
        const $input = body.find('input');
        const val = $input.val();
        if (val.trim() === '') {
            $input.attr('title', 'Value is required').addClass('invalid');
            return;
        }
        if (isNaN(val) || val <= 0 || val > 1000000) {
            $input.attr('title', 'Invalid value').addClass('invalid');
            return;
        }
        return parseInt(val);
    }
    });

    if (typeof quantity === 'number' && !isNaN(quantity)) {
        await callWebhook('Change quantity', $(e.target).data('subscriptionId'), '', { quantity });
    }
}

async function getPlans(sub, pub) {
  const {result} = await callAPI(`/api/saas/subscriptions/${sub}/listAvailablePlans/?publisherId=${pub}&api-version=2018-08-31`);
  return result;
}

async function changePlan_click(e) {
  const subscription = $(e.target).data('subscriptionId');
  const publisherId = $(e.target).data('publisherId');
  const existingPlan = $(e.target).data('planID');

  const plansData = await getPlans(subscription, publisherId);

  const plansList = plansData.plans;

    if (plansList.length <= 1) {
        await showAlert('There are no other plans defined on this offer', 'Change Plan');
        return;
    }

  const $dialog = $('#change-plan-dialog');
  const $select = $dialog.find('select').empty();

  $select.append(...plansList.map(x => $(`<option value='${x.planId}'>${x.displayName}</option>`)));

  const planId = await showDialog($dialog, "Change Plan", {
    'Ok': (button, body) => {
        return body.find('select').val();
    }
  });

  if (typeof planId !== 'string' || planId === existingPlan) {
    return;
  }

  await callWebhook('Change plan', $(e.target).data('subscriptionId'), '', { planId });
}

async function suspend_click(e) {
  await callWebhook('Suspend', $(e.target).data('subscriptionId'), 'suspend');
}

async function reinstate_click(e) {
  await callWebhook('Reinstate', $(e.target).data('subscriptionId'), 'reinstate');
}

async function unsubscribe_click(e) {
  await callWebhook('Unsubscribe', $(e.target).data('subscriptionId'), 'unsubscribe');
}

async function renew_click(e) {
  await callWebhook('Renew', $(e.target).data('subscriptionId'), 'renew');
}

async function callWebhook(name, sid, endpoint, body) {
  await doFetch(
    '<b>[Webhook]</b> ' + name,
    `/api/webhook/subscription/${sid}/${endpoint}`,
    body ? JSON.stringify(body) : undefined,
    body ? 'PATCH' : 'POST'
  );
}
