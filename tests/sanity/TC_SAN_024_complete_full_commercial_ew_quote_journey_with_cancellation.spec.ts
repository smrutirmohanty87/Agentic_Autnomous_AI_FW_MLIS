// spec: docs/test-plans/sf-quote-journey.plan.md
// seed: tests/seed.spec.ts

import { test } from '@playwright/test';
import { getSalesforceCredentials } from '../../src/config/env';
import { SalesforceQuoteJourneyCommercialEWPage } from '../../src/pages/salesforce-quote-journey-commercial-ew';

test.describe('@sanity | E2E | Salesforce Quote Journey | Commercial E&W | Cancellation', () => {
  test('TC_SAN_024 | Complete full commercial England & Wales quote journey and perform cancellation', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `SF-QJ-COM-E2E-CAN-${Date.now()}`;
    const sfCreds = getSalesforceCredentials();
    const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);

    await quoteJourney.loginAndOpenQuoteJourney(sfCreds.username, sfCreds.password);
    await quoteJourney.completeCommercialQuoteJourney(caseRef);
    await quoteJourney.returnToSubmission();
    await quoteJourney.performCancellationAfterReturn(caseRef);
  });
});
