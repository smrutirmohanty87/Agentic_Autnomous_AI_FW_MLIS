async function loginFlow(page) {

  await page.goto('https://www.saucedemo.com/');

  await page.fill('#user-name', 'standard_user');
  await page.fill('#password', 'secret_sauce');

  await page.click('#login-button');

  await page.waitForSelector('.inventory_list');
}

module.exports = { loginFlow };