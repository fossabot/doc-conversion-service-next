const fs = require("fs");
const fsp = require("fs").promises;
const Fastify = require("fastify");
const isHtml = require("is-html");
const plugin = require(".");
const getConfig = require("../../config");

describe("PDF-to-HTML conversion plugin", () => {
	let config;
	let server;

	beforeAll(async () => {
		config = await getConfig();
	});

	beforeEach(() => {
		server = Fastify();

		server.post("/", (req, res) => {
			res.send(req.pdfToHtmlResults);
		});
	});

	afterEach(async () => {
		fs.rmdir("./src/temp/", { recursive: true }, () => {});
		fs.rmdir(config.poppler.tempDirectory, { recursive: true }, () => {});
	});

	afterEach(() => {
		server.close();
	});

	test("Should convert PDF file to HTML and place in specified directory", async () => {
		server.register(plugin, config);

		let res = await server.inject({
			method: "POST",
			url: "/",
			body: await fsp.readFile(
				"./test_resources/test_files/pdf_1.3_NHS_Constitution.pdf"
			),
			headers: {
				"content-type": "application/pdf",
			},
		});

		res = JSON.parse(res.body);

		expect(typeof res.body).toBe("string");
		expect(isHtml(res.body)).toBe(true);
		expect(typeof res.docLocation).toBe("object");
		expect(fs.existsSync(res.docLocation.html)).toBe(true);
		expect(fs.existsSync(config.poppler.tempDirectory)).toBe(true);
	});

	test("Should remove invalid query string params and convert PDF file to HTML", async () => {
		server.register(plugin, config);

		let res = await server.inject({
			method: "POST",
			url: "/",
			query: {
				test: "test",
				ignoreImages: true,
				firstPageToConvert: 1,
			},
			body: await fsp.readFile(
				"./test_resources/test_files/pdf_1.3_NHS_Constitution.pdf"
			),
			headers: {
				"content-type": "application/pdf",
			},
		});

		res = JSON.parse(res.body);

		expect(typeof res.body).toBe("string");
		expect(isHtml(res.body)).toBe(true);
		expect(typeof res.docLocation).toBe("object");
		expect(fs.existsSync(res.docLocation.html)).toBe(true);
		expect(fs.existsSync(config.poppler.tempDirectory)).toBe(true);
	});

	test("Should return HTTP 400 error if PDF file missing", async () => {
		server.register(plugin, config);

		const res = await server.inject({
			method: "POST",
			url: "/",
			headers: {
				"content-type": "application/pdf",
			},
		});

		const body = JSON.parse(res.body);

		expect(res.statusCode).toBe(400);
		expect(res.statusMessage).toBe("Bad Request");
		expect(body.statusCode).toBe(400);
		expect(body.error).toBe("Bad Request");
	});
});
