import { expect, test } from '@playwright/test';
import {
  NiCommercialFinalPolicyDetailsPage,
  NiCommercialLoginPage,
  NiCommercialOrderDialog,
  NiCommercialPolicyIssuedPage,
  NiCommercialProductSelectionPage,
  NiCommercialQuoteManagerPage,
  NiCommercialQuotesPage,
  NiCommercialStatementsOfFactPage,
  NiCommercialSummaryPage,
} from '../../src/pages/mlis-portal-ni-commercial';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { TCReg050RelatedNavigationPage } from '../../src/pages/tc-reg-050-related-navigation';
import { TCRegNiCommercialIntermediaryPage, updatedIntermediaryLegalEntity } from '../../src/pages/tc-reg-ni-commercial-intermediary';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | NI Commercial | NB | MTA | Cancellation From Inception', () => {
  test(
    'DT-MLIS-DF25.5.0 | CR-237340 | TC_34_S6_Verify Cancellation premiums are applied to the appropriate intermediary when user change the Intermediary Legal Entity on MTA _NB>MTA>Cancel the Policy from Inception_NI commercial_Broker portal',
    async ({ page }) => {
      test.setTimeout(900000);
      test.slow();

      const caseRef = `E2E-NI-COMM-NB-MTA-CAN-INF-${Date.now()}`;

      const brokerLogin = new NiCommercialLoginPage(page);
      const quoteManager = new NiCommercialQuoteManagerPage(page);
      const productSelection = new NiCommercialProductSelectionPage(page);
      const statements = new NiCommercialStatementsOfFactPage(page);
      const quotes = new NiCommercialQuotesPage(page);
      const finalDetails = new NiCommercialFinalPolicyDetailsPage(page);
      const summary = new NiCommercialSummaryPage(page);
      const orderDialog = new NiCommercialOrderDialog(page);
      const policyIssued = new NiCommercialPolicyIssuedPage(page);

      const brokerPortal = new BrokerPortalPage(page);
      const salesforce = new SalesforcePortalPage(page);
      const regNiIntermediary = new TCRegNiCommercialIntermediaryPage(page);
      const reg050 = new TCReg050RelatedNavigationPage(page);

      // NB: Create a fresh NI Commercial policy in Broker Portal.
      await brokerLogin.goto();
      const brokerCreds = getBrokerCredentials();
      await brokerLogin.login(brokerCreds.username, brokerCreds.password);
      await quoteManager.expectLoaded();

      await quoteManager.startCommercialNorthernIrelandQuote();
      await productSelection.expectLoaded();
      await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
      await productSelection.selectProductsByIndex([1]);
      await productSelection.proceed();

      await statements.expectLoaded();
      await statements.confirmAllStatements();
      await statements.proceed();

      await quotes.expectLoaded();
      await quotes.selectFirstQuote();

      await finalDetails.expectLoaded();
      await finalDetails.fillRequiredDetails();
      await finalDetails.proceed();

      await summary.expectLoaded();
      await summary.expectSummaryData(caseRef);
      await summary.proceedToOrder();
      await orderDialog.selectTodayAndOrder();

      await policyIssued.expectPolicyIssued();
      const policyLabel = page.locator('strong', { hasText: 'Policy number' });
      await expect(policyLabel).toBeVisible({ timeout: 60000 });
      const policyNumber = (await policyLabel.locator('xpath=following::p[1]').first().innerText()).trim();
      await policyIssued.backToQuoteManager();

      // Verify policy is live before MTA/cancellation.
      await brokerPortal.expectQuoteManagerLoaded();
      await brokerPortal.searchPolicy(policyNumber);
      await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

      // Login to Salesforce and open policy record.
      await salesforce.goto();
      const sfCreds = getSalesforceCredentials();
      await salesforce.login(sfCreds.username, sfCreds.password);

      await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
      await salesforce.openRelatedTab();
      await salesforce.openInsurancePolicyFromRelated(policyNumber);

      // Create MTA on policy.
      await salesforce.openCreateMTADialog();
      await salesforce.fillMTAReasonAndSave(
        'Exposure/Limit Changes',
        `MTA Description - Intermediary Legal Entity change for ${policyNumber}`,
      );
      await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
      await regNiIntermediary.updateSubmissionSourceIntermediaryFields(updatedIntermediaryLegalEntity);
      await salesforce.editMTAPremium('100');
      await salesforce.bindMTA();

      // Cancel policy from inception after MTA.
      await salesforce.openCancelPolicyWizard();
      await salesforce.completeCancelFromInceptionStep1(
        `Cancellation from inception after NB->MTA flow (${policyNumber})`,
      );
      await salesforce.completePremiumStepWithTaxCalculation();
      await salesforce.submitCancellation();
      await salesforce.expectPolicyStatusCancelled();

      // Post-cancellation navigation sequence:
      // Tax Jurisdiction (View All) -> Back -> BDX (View All) -> Back -> SFI to FFA Transactions (View All)
      await salesforce.openRelatedTab();

      // 1) Tax Jurisdiction -> View All -> Back
      await reg050.openViewAllFromRelatedCard(/Tax\s*Jurisdiction/i);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await salesforce.openRelatedTab();
      await reg050.resetLightningScrollToTop();

      // 2) BDX -> View All -> Back
      await reg050.openViewAllFromRelatedCard(/\bBDX\b/i);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await salesforce.openRelatedTab();
      await reg050.resetLightningScrollToTop();

      // 3) SFI to FFA Transactions -> View All
      await reg050.openViewAllFromRelatedCard(/SFI\s*to\s*FFA\s*Transactions/i);

      // Final assertion: return to BDX -> View All -> open one BDX line
      // -> CR0090 Intermediary 1 - Name should match updated MTA value.
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await salesforce.openRelatedTab();
      await reg050.resetLightningScrollToTop();

      const bdxTable = await reg050.openViewAllFromRelatedCard(/\bBDX\b/i);
      const bdxRowLink = bdxTable
        .locator('tbody tr th[scope="row"] a:visible, tbody tr td a:visible')
        .first();
      await expect(bdxRowLink).toBeVisible({ timeout: 120000 });
      await bdxRowLink.click();
      await reg050.assertCr0090IntermediaryName(updatedIntermediaryLegalEntity);
    },
  );
});
