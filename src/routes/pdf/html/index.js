const createError = require("http-errors");

const { htmlPutSchema } = require("./schema");

/**
 * @author Frazer Smith
 * @description Sets routing options for server.
 * @param {Function} server - Fastify instance.
 * @param {object} options - Object containing route config objects.
 */
async function route(server, options) {
	server.route({
		method: "PUT",
		url: "/",
		schema: htmlPutSchema,
		async handler(req, res) {},
	});
}

module.exports = route;
