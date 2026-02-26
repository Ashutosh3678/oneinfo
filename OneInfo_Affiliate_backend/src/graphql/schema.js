const { gql } = require("graphql-tag");

module.exports = gql`

  type CreatorStats {
    totalClicks: Int
    lifetimeCommission: Float
    pendingCommission: Float
    approvedCommission: Float
    paidCommission: Float
    totalOrders: Int
  }

  type AffiliateLink {
    shortCode: String
    originalUrl: String
    publicUrl: String
    platform: String
    clicks: Int
    productTitle: String
    productImage: String
    createdAt: String
  }

  type Creator {
    name: String
    stats: CreatorStats
    links(limit: Int): [AffiliateLink]
  }

  type Order {
    orderId: String
    productName: String
    orderValue: Float
    creatorCommissionAmount: Float
    status: String
    platform: String
    createdAt: String
  }

  type OrdersResponse {
    orders: [Order]
    totalCount: Int
    hasMore: Boolean
  }

  type Query {
    me: Creator
    myOrders(page: Int!, limit: Int!): OrdersResponse
  }

`;
