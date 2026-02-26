const AffiliateLink = require("../links/affiliateLink.model");
const LinkStats = require("../models/linkStats.model");
const CreatorStats = require("../models/creatorStats.model");
const Creator = require("../creators/creator.model");
const Order = require("../orders/order.model");

module.exports = {
  Query: {
    /**
     * me: returns { name, stats, links(limit) }
     * Matches Dashboard.jsx GraphQL query exactly
     */
    me: async (_, args, { creatorId }) => {
      if (!creatorId) throw new Error("Unauthorized");

      // Fetch creator name
      const creator = await Creator.findById(creatorId).lean();
      const name = creator ? creator.name : "Creator";

      // Fetch pre-aggregated stats (O(1))
      const statsDoc = await CreatorStats.findOne({ creatorId }).lean();

      const stats = {
        totalClicks:         statsDoc?.totalClicks          || 0,
        lifetimeCommission:  statsDoc?.lifetimeCommission   || 0,
        pendingCommission:   statsDoc?.pendingCommission     || 0,
        approvedCommission:  statsDoc?.approvedCommission    || 0,
        paidCommission:      statsDoc?.paidCommission        || 0,
        totalOrders:         statsDoc?.lifetimeOrders        || 0,
      };

      // Fetch links with click counts
      const limit = args?.limit || 10;
      const links = await AffiliateLink.find({ creatorId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const linkStats = await LinkStats.find({
        shortCode: { $in: links.map((l) => l.shortCode) },
      }).lean();

      const clickMap = {};
      linkStats.forEach((ls) => (clickMap[ls.shortCode] = ls.totalClicks));

      const baseUrl = process.env.BASE_URL || "http://localhost:4000";

      const linksWithClicks = links.map((link) => ({
        shortCode:    link.shortCode,
        originalUrl:  link.originalUrl,
        // Use stored publicUrl if available; fallback builds /share/ URL for old records
        publicUrl:    link.publicUrl || `${baseUrl}/share/${link.shortCode}`,
        platform:     link.platform,
        productTitle: link.productTitle || "",
        productImage: link.productImage || "",
        clicks:       clickMap[link.shortCode] || 0,
        createdAt:    link.createdAt ? link.createdAt.toISOString() : null,
      }));

      return { name, stats, links: linksWithClicks };
    },

    /**
     * me.links resolver handles limit arg
     */

    /**
     * myOrders: paginated orders for creator
     */
    myOrders: async (_, { page, limit }, { creatorId }) => {
      if (!creatorId) throw new Error("Unauthorized");

      const validPage  = Math.max(1, page);
      const validLimit = Math.min(Math.max(1, limit), 100);
      const skip = (validPage - 1) * validLimit;

      const [orders, totalCount] = await Promise.all([
        Order.find({ creatorId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(validLimit)
          .lean(),
        Order.countDocuments({ creatorId }),
      ]);

      return {
        orders: orders.map((o) => ({
          orderId:                  o.orderId,
          productName:              o.productName,
          orderValue:               o.orderValue,
          creatorCommissionAmount:  o.creatorCommissionAmount,
          status:                   o.status,
          platform:                 o.platform,
          createdAt:                o.createdAt ? o.createdAt.toISOString() : null,
        })),
        totalCount,
        hasMore: skip + orders.length < totalCount,
      };
    },
  },

  Creator: {
    // Allow `links(limit: N)` arg to filter at field level too
    links: async ({ links }, { limit }) => {
      if (limit && links) return links.slice(0, limit);
      return links || [];
    },
  },
};
