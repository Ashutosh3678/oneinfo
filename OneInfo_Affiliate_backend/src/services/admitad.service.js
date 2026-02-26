const _fetch = typeof fetch !== "undefined" ? fetch : require("node-fetch");
require("dotenv").config();

class AdmitadService {
  constructor() {
    this.clientId = process.env.ADMITAD_CLIENT_ID;
    this.base64Header = process.env.ADMITAD_BASE64_HEADER;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // ===============================
  // GET ACCESS TOKEN
  // ===============================
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const response = await _fetch("https://api.admitad.com/token/", {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.base64Header}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        scope: "deeplink_generator public_data websites advcampaigns"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Admitad Auth Error:", data);
      throw new Error("Admitad authentication failed");
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  // ===============================
  // GET WEBSITE ID
  // ===============================
  async getWebsiteId(token) {
    if (process.env.ADMITAD_WEBSITE_ID) return process.env.ADMITAD_WEBSITE_ID;

    const res = await _fetch("https://api.admitad.com/websites/", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.results || !data.results.length) {
      throw new Error("No Admitad website (ad space) found for this account.");
    }

    return data.results[0].id;
  }

  // ===============================
  // GENERATE BASE LINK (Production-safe, no API call)
  // Uses ADMITAD_BASE_LINK from .env — clicks tracked by Admitad server on redirect.
  // Format: {BASE_LINK}?ulp={encodedProductUrl}&subid={shortCode}
  // ===============================
  generateBaseLink(originalUrl, shortCode) {
    const baseLink = process.env.ADMITAD_BASE_LINK;

    if (!baseLink) {
      throw new Error("ADMITAD_BASE_LINK is not configured in .env");
    }
    if (!originalUrl) {
      throw new Error("originalUrl is required to generate base link");
    }
    if (!shortCode) {
      throw new Error("shortCode is required to generate base link");
    }

    const url = new URL(baseLink);
    url.searchParams.set("ulp", originalUrl);
    url.searchParams.set("subid", shortCode);

    const finalUrl = url.toString();

    // Strict validation — must contain the tracking domain
    if (!finalUrl.includes("tjzuh.com")) {
      throw new Error("Generated BASE_LINK does not contain expected tracking domain");
    }

    return finalUrl;
  }

  // ===============================
  // GENERATE DEEPLINK (legacy — kept for backwards compat)
  // ===============================
  async generateDeeplink(productUrl, subId) {
    const token = await this.getAccessToken();
    const websiteId = await this.getWebsiteId(token);

    let campaignId;

    if (productUrl.includes("lifestylestores.com")) {
      campaignId = process.env.ADMITAD_LIFESTYLE_CAMPAIGN_ID;
    } else if (productUrl.includes("myntra.com")) {
      campaignId = process.env.ADMITAD_MYNTRA_CAMPAIGN_ID;
    } else {
      throw new Error("Unsupported Admitad domain");
    }

    if (!campaignId) {
      throw new Error("Campaign ID not configured in .env");
    }

    const deeplinkUrl = new URL(
      `https://api.admitad.com/deeplink/${websiteId}/advcampaign/${campaignId}/`
    );

    deeplinkUrl.searchParams.append("ulp", productUrl);
    deeplinkUrl.searchParams.append("subid", subId);

    console.log("Generating Deeplink:", deeplinkUrl.toString());

    const response = await _fetch(deeplinkUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Admitad Deeplink API Error:", {
        status: response.status,
        websiteId,
        campaignId,
        data
      });
      throw new Error(`Admitad API 404: Campaign ID ${campaignId} might be incorrect or not linked to Website ID ${websiteId}`);
    }

    let finalLink;

    if (Array.isArray(data)) {
      finalLink = data[0];
    } else if (typeof data === "string") {
      finalLink = data;
    } else if (data.deeplink) {
      finalLink = data.deeplink;
    }

    if (!finalLink || !finalLink.includes("ad.admitad.com")) {
      throw new Error("Invalid Admitad tracking URL generated");
    }

    return finalLink;
  }

  // ===============================
  // FETCH SALES
  // ===============================
  async fetchActions(dateStart) {
    const token = await this.getAccessToken();

    const url = new URL("https://api.admitad.com/statistics/actions/");
    url.searchParams.append("date_start", dateStart);

    const response = await _fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });


    const data = await response.json();
    return data.results || [];
  }
   
  // ===============================
  // GET JOINED CAMPAIGNS (Discovery)
  // ===============================
  async getCampaigns() {
    const token = await this.getAccessToken();
    const url = new URL("https://api.admitad.com/advcampaigns/");
    url.searchParams.append("connection_status", "active");

    const response = await _fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.results || [];
  }
}

module.exports = new AdmitadService();
