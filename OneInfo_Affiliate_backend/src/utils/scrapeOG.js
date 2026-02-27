/**
 * Scrape Open Graph metadata (image + title) from a product URL.
 * Handles: standard OG tags, Lifestyle Stores CDN, Myntra, Amazon, Flipkart, Meesho.
 */
async function scrapeOG(url) {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000); // increased to 8s

		const res = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br",
				"Cache-Control": "no-cache",
				Pragma: "no-cache",
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "none",
				"Sec-Fetch-User": "?1",
				"Upgrade-Insecure-Requests": "1",
			},
			signal: controller.signal,
			redirect: "follow",
		});
		clearTimeout(timeout);

		const html = await res.text();

		// ─── Check for Cloudflare block ───
		if (html.includes("Attention Required") && html.includes("Cloudflare")) {
			console.warn("Cloudflare blocked request to", url);
			return { productImage: "", productTitle: "" };
		}

		// ─── Extract Image ───
		let productImage = "";

		// 1. Standard og:image (property before content OR content before property)
		const ogImageMatch =
			html.match(
				/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
			) ||
			html.match(
				/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
			);
		if (ogImageMatch) productImage = ogImageMatch[1];

		// 2. og:image:secure_url fallback
		if (!productImage) {
			const secureMatch =
				html.match(
					/<meta[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
				) ||
				html.match(
					/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image:secure_url["']/i,
				);
			if (secureMatch) productImage = secureMatch[1];
		}

		// 3. Twitter card image
		if (!productImage) {
			const twitterMatch =
				html.match(
					/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
				) ||
				html.match(
					/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
				);
			if (twitterMatch) productImage = twitterMatch[1];
		}

		// 4. Lifestyle Stores / Landmark CDN  (media.landmarkshops.in)
		if (!productImage) {
			const cdnMatch = html.match(
				/(https?:\/\/media\.landmarkshops\.in\/cdn-cgi\/image\/[^"'\s]+\.(jpg|jpeg|png|webp)[^"'\s]*)/i,
			);
			if (cdnMatch) {
				productImage = cdnMatch[1]
					.replace(/\/h=\d+/, "/h=400")
					.replace(/\/w=\d+/, "/w=400");
			}
		}

		// 5. Lifestyle Stores — alternate CDN path patterns
		if (!productImage) {
			const lifestyleMatch = html.match(
				/(https?:\/\/[^"'\s]*lifestylestores[^"'\s]*\.(jpg|jpeg|png|webp))/i,
			);
			if (lifestyleMatch) productImage = lifestyleMatch[1];
		}

		// 6. Myntra CDN  (assets.myntassets.com)
		if (!productImage) {
			const myntraMatch = html.match(
				/(https?:\/\/assets\.myntassets\.com\/[^"'\s]+\.(jpg|jpeg|png|webp))/i,
			);
			if (myntraMatch) productImage = myntraMatch[1];
		}

		// 7. Amazon product image (images-na.ssl-images-amazon.com / m.media-amazon.com)
		if (!productImage) {
			const amazonMatch = html.match(
				/(https?:\/\/(?:images-na\.ssl-images-amazon\.com|m\.media-amazon\.com)\/images\/[^"'\s]+\.(jpg|jpeg|png|webp))/i,
			);
			if (amazonMatch) productImage = amazonMatch[1];
		}

		// 8. Flipkart CDN (rukminim*.flixcart.com)
		if (!productImage) {
			const flipkartMatch = html.match(
				/(https?:\/\/rukminim\d*\.flixcart\.com\/[^"'\s]+\.(jpg|jpeg|png|webp))/i,
			);
			if (flipkartMatch) productImage = flipkartMatch[1];
		}

		// 9. Generic CDN fallback
		if (!productImage) {
			const genericCdn = html.match(
				/(https?:\/\/[^"'\s]*cdn[^"'\s]*\.(jpg|jpeg|png|webp))/i,
			);
			if (genericCdn) productImage = genericCdn[1];
		}

		// ─── Extract Title ───
		let productTitle = "";
		const titleMatch =
			html.match(
				/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
			) ||
			html.match(
				/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
			) ||
			html.match(
				/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
			) ||
			html.match(/<title[^>]*>([^<]+)<\/title>/i);
		if (titleMatch) productTitle = titleMatch[1].trim();

		// ─── Clean scraped URL (strip HTML entities, trailing junk) ───
		function cleanUrl(u) {
			if (!u) return "";
			return u
				.replace(/&amp;/g, "&")
				.replace(/&quot;/g, "")
				.replace(/%26quot%3B/gi, "")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/["',;\s]+$/g, "") // trailing quotes, commas, whitespace
				.trim();
		}

		productImage = cleanUrl(productImage);

		console.log(
			`scrapeOG [${url.slice(0, 60)}] => image: ${productImage ? "✅" : "❌"}, title: ${productTitle ? "✅" : "❌"}`,
		);
		return { productImage, productTitle };
	} catch (err) {
		console.warn("OG scrape failed for", url, "-", err.message);
		return { productImage: "", productTitle: "" };
	}
}

module.exports = scrapeOG;
