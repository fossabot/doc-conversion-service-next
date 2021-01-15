const createError = require("http-errors");
const fp = require("fastify-plugin");
const fs = require("fs");
const fsp = require("fs").promises;
const glob = require("glob");
const { JSDOM } = require("jsdom");
const path = require("path");
const { Poppler } = require("node-poppler");
const { v4 } = require("uuid");
const raw = require("raw-body");
/**
 * @author Frazer Smith
 * @description Pre-handler plugin that uses Poppler to convert PDF file in `req.body`
 * to HTML and places both files in a temporary directory.
 * `req` object is decorated with `pdfToHtmlResults` object detailing document
 * location, contents etc.
 * @param {Function} server - Fastify instance.
 * @param {object} options - Fastify config values.
 * @param {string} options.poppler.binPath - Obfuscation values.
 * @param {string} options.poppler.encoding - Sets the encoding to use for text output.
 * @param {object=} options.poppler.pdfToHtmlOptions - Refer to
 * https://github.com/Fdawgs/node-poppler/blob/master/API.md#Poppler+pdfToHtml
 * for options.
 * @param {string} options.poppler.tempDirectory - directory for temporarily storing
 * files during conversion.
 */
async function plugin(server, options) {
	server.addContentTypeParser("application/pdf", async (req, payload) => {
		const res = await raw(payload);
		return res;
	});

	server.addHook("onRequest", async (req) => {
		req.pdfToHtmlResults = { body: undefined, docLocation: {} };
	});

	// server.addHook("onResponse", async (req, res) => {
	// 	console.log(
	// 		`${req.pdfToHtmlResults.doclocation.directory}/${req.pdfToHtmlResults.doclocation.id}*`
	// 	);

	// 	const files = glob.sync(
	// 		`${req.pdfToHtmlResults.doclocation.directory}/${req.pdfToHtmlResults.doclocation.id}*`
	// 	);
	// 	files.forEach((file) => {
	// 		fs.unlinkSync(file);
	// 	});
	// });

	server.addHook("preHandler", async (req, res) => {
		try {
			// Define any default settings the middleware should have to get up and running
			const defaultConfig = {
				binPath: undefined,
				encoding: "UTF-8",
				pdfToHtmlOptions: {
					complexOutput: true,
					singlePage: true,
				},
				tempDirectory: `${path.resolve(__dirname, "..")}/temp/`,
			};
			this.config = Object.assign(defaultConfig, options.poppler);
			/**
			 * Remove params used by tidy-css and embed-html-images middleware
			 * to avoid pdfToHtml function throwing error due to invalid params passed to it,
			 * as well as pdfToHtml params that will break the route.
			 */
			const query = { ...req.query };
			const pdfToHtmlAcceptedParams = [
				"exchangePdfLinks",
				"extractHidden",
				"firstPageToConvert",
				"ignoreImages",
				"imageFormat",
				"lastPageToConvert",
				"noDrm",
				"noMergeParagraph",
				"outputEncoding",
				"ownerPassword",
				"userPassword",
				"wordBreakThreshold",
				"zoom",
			];

			// fml
			Object.keys(query).forEach((value) => {
				if (query[value] === "true") {
					query[value] = true;
				}

				if (query[value] === "false") {
					query[value] = true;
				}

				if (parseFloat(query[value]) !== "NaN") {
					query[value] = parseFloat(query[value]);
				}
			});

			Object.keys(query).forEach((value) => {
				if (!pdfToHtmlAcceptedParams.includes(value)) {
					delete query[value];
				}
			});

			this.config.pdftoHtmlOptions = Object.assign(
				this.config.pdfToHtmlOptions,
				query
			);
			try {
				await fsp.access(this.config.tempDirectory);
			} catch (err) {
				await fsp.mkdir(this.config.tempDirectory);
			}
			// Build temporary files for Poppler and following middleware to read from
			const id = v4();
			const tempPdfFile = `${this.config.tempDirectory}${id}.pdf`;
			const tempHtmlFile = `${this.config.tempDirectory}${id}-html.html`;
			await fsp.writeFile(tempPdfFile, req.body);
			const poppler = new Poppler(this.config.binPath);
			await poppler.pdfToHtml(tempPdfFile, this.config.pdfToHtmlOptions);
			const dom = new JSDOM(
				await fsp.readFile(tempHtmlFile, {
					encoding: this.config.encoding,
				})
			);
			// Remove excess title and meta tags left behind by Poppler
			const titles = dom.window.document.querySelectorAll("title");
			for (let index = 1; index < titles.length; index += 1) {
				titles[index].parentNode.removeChild(titles[index]);
			}
			const metas = dom.window.document.querySelectorAll("meta");
			for (let index = 1; index < metas.length; index += 1) {
				metas[index].parentNode.removeChild(metas[index]);
			}
			req.pdfToHtmlResults.body =
				dom.window.document.documentElement.outerHTML;
			req.pdfToHtmlResults.docLocation = {
				directory: this.config.tempDirectory,
				html: tempHtmlFile,
				id,
				pdf: tempPdfFile,
			};
		} catch (err) {
			server.log.error(err);
			res.send(createError(400, err));
		}
	});
}

module.exports = fp(plugin);
