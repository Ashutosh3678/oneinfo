const { ApolloServer } = require("apollo-server-express");
const typeDefs = require("./schema");
const resolvers = require("./resolvers");

module.exports = async (app) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({
      creatorId: req.creatorId,
    }),
  });
  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });
  console.log("🚀 GraphQL ready at /graphql");
};
