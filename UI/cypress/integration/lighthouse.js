it("should verify the lighthouse scores ONLY for performance and first contentful paint", function () {
  cy.visit("/");

  cy.lighthouse({
    performance: 15,
    "first-contentful-paint": 10000,
  },
  {
  	"emulated-form-factor": "none",
  	"throttlingMethod":"provided"
  }
  );
});