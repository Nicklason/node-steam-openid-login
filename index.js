const request = require('@nicklason/request-retry');
const cheerio = require('cheerio');

/**
 * Signs in to a website through Steam
 * @param {String} url The URL you would go to, to sign in through Steam
 * @param {Array<String>|Object} cookies An array of cookies as strings or a cookie jar that contains cookies from a session which is logged in to steamcommunity.com
 * @param {Function} callback
 */
module.exports = function (url, cookies, callback) {
    // TODO: Custom request options (proxy, headers...)

    let jar;

    if (Array.isArray(cookies)) {
        jar = request.jar();

        cookies.forEach(function (cookieStr) {
            jar.setCookie(request.cookie(cookieStr), 'https://steamcommunity.com');
        });
    } else {
        jar = cookies;
    }

    // Go to path for signing in through Steam and follow redirects

    request({
        method: 'GET',
        url: url,
        jar: jar,
        followAllRedirects: true
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        }

        if (response.request.uri.host !== 'steamcommunity.com') {
            return callback(new Error('Was not redirected to steam, make sure the url is correct'));
        }

        const $ = cheerio.load(body);

        // If we are given a login form, then we are not signed in to steam
        if ($('#loginForm').length !== 0) {
            return callback(new Error('You are not signed in to Steam'));
        }

        const form = $('#openidForm');

        if (form.length !== 1) {
            return callback(new Error('Could not find OpenID login form'));
        }

        const inputs = form.find('input');

        const formData = {};

        // Get form data
        inputs.each(function (index, element) {
            const attribs = element.attribs;
            if (attribs.name) {
                formData[attribs.name] = attribs.value;
            }
        });

        // Send form to steam and follow redirects back to the website we are signing in to

        request({
            method: 'POST',
            url: 'https://steamcommunity.com/openid/login',
            form: formData,
            jar: jar,
            followAllRedirects: true
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            }

            // Return cookie jar

            callback(null, jar);
        });
    });
};
