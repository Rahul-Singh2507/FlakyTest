import { chromium } from "playwright";
import { ApiError } from "../../utils/apiError.js";
import { captureSnapshot } from "../execution/pageSnapshot.js";
import { newTestPage, openPage, performSteps, settlePage } from "../execution/testRunner.js";

const PREVIEW_LINK_LIMIT = 12;
const AUTHENTICATED_PAGE_LIMIT = 5;
const PREVIEW_JPEG_QUALITY = 70;
const LOGIN_WAIT_MS = 10000;
const USERNAME_INPUT_TYPES = new Set(["", "text", "email"]);

const pagePathOf = (url) => `${url.pathname}${url.search}`;

function siteFromUrl(siteUrl, pages, credentials) {
  const url = new URL(siteUrl);
  return {
    name: url.host,
    description: url.host,
    baseUrl: url.origin,
    pages: [...new Set([pagePathOf(url), ...pages])],
    authenticatedPages: [],
    login: [],
    credentials: credentials ?? null,
  };
}

const collectSameOriginLinks = (page) =>
  page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll("a[href]")]
        .map((anchor) => new URL(anchor.href, location.href))
        .filter((url) => url.origin === location.origin)
        .filter((url) => !/log-?out|sign-?out/i.test(url.pathname))
        .filter((url) => !/\.(pdf|zip|png|jpe?g|gif|svg|mp4|xml|json)$/i.test(url.pathname))
        .map((url) => `${url.pathname}${url.search}`)
    ),
  ]);

const hasPasswordField = async (page) => (await page.locator("input[type=password]:visible").count()) > 0;

const withBrowserPage = async (work) => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page } = await newTestPage(browser);
    return await work(page);
  } finally {
    await browser.close();
  }
};

const previewSite = (siteUrl) =>
  withBrowserPage(async (page) => {
    const response = await page
      .goto(siteUrl, { waitUntil: "load" })
      .catch((error) => Promise.reject(new ApiError(422, `Could not open ${siteUrl}: ${error.message.split("\n")[0]}`)));
    await settlePage(page);
    const finalUrl = new URL(page.url());
    const screenshot = await page.screenshot({ type: "jpeg", quality: PREVIEW_JPEG_QUALITY });
    return {
      url: finalUrl.href,
      origin: finalUrl.origin,
      path: pagePathOf(finalUrl),
      title: (await page.title()) || finalUrl.host,
      httpStatus: response?.status() ?? null,
      hasLoginForm: await hasPasswordField(page),
      links: (await collectSameOriginLinks(page)).filter((link) => link !== pagePathOf(finalUrl)).slice(0, PREVIEW_LINK_LIMIT),
      screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    };
  });

function findLoginForm(elements) {
  const passwordIndex = elements.findIndex((element) => element.tag === "input" && element.type === "password");
  if (passwordIndex === -1) {
    return null;
  }
  const password = elements[passwordIndex];
  const username = elements
    .slice(0, passwordIndex)
    .findLast((element) => element.tag === "input" && USERNAME_INPUT_TYPES.has(element.type));
  const submit = elements.slice(passwordIndex + 1).find((element) => element.role === "button");
  return username?.name && password.name && submit?.name ? { username, password, submit } : null;
}

const roleTarget = (element) => ({ strategy: "role", role: element.role, name: element.name, ...(element.id && { idHint: element.id }) });

const loginStepsFor = (loginPath, form) => [
  { action: "goto", path: loginPath },
  { action: "fill", target: roleTarget(form.username), value: "$TEST_USERNAME" },
  { action: "fill", target: roleTarget(form.password), value: "$TEST_PASSWORD" },
  { action: "click", target: roleTarget(form.submit) },
];

async function visitPages(page, site, pagePaths) {
  const visits = [];
  for (const pagePath of pagePaths) {
    await openPage(page, pagePath, site);
    visits.push({
      pagePath,
      landedOn: pagePathOf(new URL(page.url())),
      title: await page.title(),
      elements: await captureSnapshot(page),
    });
  }
  return visits;
}

const toSnapshotMap = (visits) => Object.fromEntries(visits.map((visit) => [visit.pagePath, visit.elements]));

const exploreSite = (site) =>
  withBrowserPage(async (page) => {
    const publicVisits = await visitPages(page, site, site.pages);
    const description = publicVisits[0]?.title || site.name;
    const loginVisit = site.credentials && publicVisits.find((visit) => findLoginForm(visit.elements));
    if (!loginVisit) {
      return { site: { ...site, description }, snapshots: { publicPages: toSnapshotMap(publicVisits), authenticatedPages: {} } };
    }

    const login = loginStepsFor(loginVisit.pagePath, findLoginForm(loginVisit.elements));
    await performSteps(page, login, site);
    const loggedIn = await page
      .locator("input[type=password]")
      .first()
      .waitFor({ state: "hidden", timeout: LOGIN_WAIT_MS })
      .then(() => true, () => false);
    if (!loggedIn) {
      throw new Error(`Logging in on ${loginVisit.pagePath} with the test account failed: the login form is still shown. Check the username and password`);
    }
    await settlePage(page);

    const redirectedPaths = new Set(publicVisits.filter((visit) => visit.landedOn !== visit.pagePath).map((visit) => visit.pagePath));
    const publicPaths = site.pages.filter((pagePath) => !redirectedPaths.has(pagePath));
    const landingPath = pagePathOf(new URL(page.url()));
    const authenticatedPages = [...new Set([landingPath, ...redirectedPaths, ...(await collectSameOriginLinks(page))])]
      .filter((pagePath) => !publicPaths.includes(pagePath))
      .slice(0, AUTHENTICATED_PAGE_LIMIT);
    const authenticatedVisits = await visitPages(page, site, authenticatedPages);

    return {
      site: { ...site, description, pages: publicPaths, authenticatedPages, login },
      snapshots: {
        publicPages: toSnapshotMap(publicVisits.filter((visit) => publicPaths.includes(visit.pagePath))),
        authenticatedPages: toSnapshotMap(authenticatedVisits),
      },
    };
  });

export { pagePathOf, siteFromUrl, previewSite, findLoginForm, exploreSite };
