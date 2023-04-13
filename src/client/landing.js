/// <reference path="core.js" />

const apiVersion = '2018-08-31';
      let subscriptionId = '';

      $(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            $('section.main').children().not('.no-token, header').hide();
          $('.no-token').show();
          return;
        }

        const {result} = await callAPI('/api/util/config');
        const publisherId = result['publisherId'];

        const response = await doFetch(
            "/resolve", 
            `/api/saas/subscriptions/resolve?publisherId=${publisherId}&api-version=${apiVersion}`,
            null,
            "POST",
            {
              'x-ms-marketplace-token': token
            });

        if (!response.ok) {
          return;
        }

        const resolveResult = await response.json();

        subscriptionId = resolveResult['subscription']['id'];

        if(!resolveResult['quantity']) {
          $('.quantity').parent().hide();
        };

        console.log(resolveResult);

        $('.offer-id').text(resolveResult['offerId']);
        $('.plan-id').text(resolveResult['planId']);
        $('.quantity').text(resolveResult['subscription']['quantity']);
        $('.subscription-name').text(resolveResult['subscription']['name']);
        $('.publisher-id').text(resolveResult['subscription']['publisherId']);
        $('.beneficiary-email').text(resolveResult['subscription']['beneficiary']['emailId']);

        $('button.activate').on('click', async (e) => {
            $(e.target).prop('disabled', true);
            const response = await doFetch("/activate",
            `/api/saas/subscriptions/${subscriptionId}/activate?publisherId=${publisherId}&api-version=${apiVersion}`,
            JSON.stringify({ planId: resolveResult['planId'] })
          );

          if (response.ok) {
            $(e.target).text('Subscription Activated');
          }
        });

      });

      async function activateSubscription() {
        $('#activate-button').prop('disabled', true);
        const publisherId = $('#publisherId').text();

        const response = await doFetch("/activate",
          `/api/saas/subscriptions/${subscriptionId}/activate?publisherId=${publisherId}&api-version=${apiVersion}`,
          JSON.stringify({ planId: $('#planId').text() })
        );

        if (response.ok) {
          $('#activate-button').text('Subscription Activated');
        }
      }