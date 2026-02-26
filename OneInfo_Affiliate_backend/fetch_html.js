async function fetchHtml() {
  const url = "https://www.lifestylestores.com/in/en/SHOP-Lifestyle-Melange-MELANGE-Women-Floral-Print-Straight-Kurta/p/1000014285994";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });
    const html = await res.text();
    const fs = require('fs');
    fs.writeFileSync('lifestyle_test.html', html);
    console.log("Saved HTML to lifestyle_test.html. Length:", html.length);
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}
fetchHtml();
