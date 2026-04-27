// LOGIN ONLY
async function loginOnly(page) {
  await page.goto('https://www.saucedemo.com/');
  await page.fill('#user-name', 'standard_user');
  await page.fill('#password', 'secret_sauce');
  await page.click('#login-button');
  await page.waitForSelector('.inventory_list');
}

// LOGIN + BROWSE
async function browseProducts(page) {
  await loginOnly(page);
  await page.click('.inventory_item:first-child');
  await page.waitForSelector('.inventory_details');
}

// LOGIN + ADD TO CART
async function addToCart(page) {
  await loginOnly(page);
  await page.click('button:has-text("Add to cart")');
  await page.click('.shopping_cart_link');
  await page.waitForSelector('.cart_list');
}

// LOGIN + CHECKOUT
async function checkoutFlow(page) {
  await addToCart(page);
  await page.click('button:has-text("Checkout")');
  await page.fill('#first-name', 'Test');
  await page.fill('#last-name', 'User');
  await page.fill('#postal-code', '12345');
  await page.click('#continue');
}

module.exports = {
  loginOnly,
  browseProducts,
  addToCart,
  checkoutFlow
};