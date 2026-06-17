/* global cy, describe, expect, it */
describe("Quench tests", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.disableIntercepts();
    cy.get("body").should("exist", { timeout: 10000 });
    cy.get('select[name="userid"] option').should("be.visible");
    cy.loginAsGM();

    cy.url().then((url) => {
      if (url.includes("/auth")) {
        cy.log("need to login");
        cy.get(".password").should("be.visible");
        cy.get(".password").type(Cypress.env("ADMIN_PASSWORD"));

        cy.get("body")
          .contains("Log In")
          .should("be.visible")
          .click({ force: true });
        cy.wait(300);
        cy.visit("/setup");
      }
    });

    cy.url().then((url) => {
      if (url.includes("/setup")) {
        cy.log("need to open a world");
        cy.get("body")
          .contains("simple_requests")
          .should("be.visible")
          .rightclick({ force: true });
        cy.get("body")
          .contains("Launch")
          .should("be.visible")
          .click({ force: true });
        cy.visit("/game");
      }
    });
    // cy.get(".join").should("be.visible");
  });

  it("run quench tests", () => {
    cy.get("[data-tooltip='QUENCH.Title']", { timeout: 10000 }).should("be.visible").click();
    cy.get("[data-select='all']").should("exist").click({force: true});
    cy.get("#quench-run").should("be.visible").click();
    cy.get("#quench-run").should("be.visible").click();
    // cy.turnOffWarningsIfTheyExist();

    // class="stats" contains test run count
    cy.get(".stats", { timeout: 10000 }).should("be.visible");
    cy.get(".stats").then((stats) => {
      // ex: Ran 39 tests in 740ms. 1 failed | 38 passed(39)
      cy.log("Test report: ",
        stats.text());
    });

    cy.wait(1000);
    // for the sake of headless runs, find and log the failed tests
    // expand all carets
    // class="expander fas fa-caret-right"
    cy.get(".error").then((summary) => {
      cy.log("errors: ", summary.text());
    });
    // class="error-message"
    //  class="diff"
    // fail the test if there are errors
    cy.get(".stats").then(($stats) => {
      const summary = $stats.text();
      if (!summary.includes("failed")) return;
    
      const errors = Cypress.$(".error-message")
        .map((_, el) => Cypress.$(el).text().trim())
        .get();
      const diffs = Cypress.$(".diff")
        .map((_, el) => Cypress.$(el).text().trim())
        .get();
    
      expect(
        summary,
        `Quench failures:\n${JSON.stringify({ summary, errors, diffs }, null, 2)}`
      ).to.not.include("failed");
    });
  });
});
