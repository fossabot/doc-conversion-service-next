const faker = require("faker/locale/en_GB");
const getConfig = require(".");

describe("configuration", () => {
	const currentEnv = { ...process.env };

	beforeAll(() => {
		jest.resetModules();
	});

	afterEach(() => {
		jest.resetModules();
		Object.assign(process.env, currentEnv);
	});

	test("Should return values according to environment variables - SSL enabled and CORS disabled", async () => {
		const SERVICE_HOST = faker.internet.ip();
		const SERVICE_PORT = faker.random.number();
		const HTTPS_SSL_CERT_PATH =
			"./test_resources/test_ssl_cert/server.cert";
		const HTTPS_SSL_KEY_PATH = "./test_resources/test_ssl_cert/server.key";
		const CORS_ORIGIN = false;
		const LOG_LEVEL = faker.random.arrayElement([
			"debug",
			"warn",
			"silent",
		]);
		const AUTH_BEARER_TOKEN_ARRAY =
			'[{"service": "test", "value": "testtoken"}]';
		const POPPLER_BINARY_PATH = "/usr/bin";
		const UNRTF_BINARY_PATH = "/usr/bin";

		Object.assign(process.env, {
			SERVICE_HOST,
			SERVICE_PORT,
			HTTPS_SSL_CERT_PATH,
			HTTPS_SSL_KEY_PATH,
			CORS_ORIGIN,
			LOG_LEVEL,
			AUTH_BEARER_TOKEN_ARRAY,
			POPPLER_BINARY_PATH,
			UNRTF_BINARY_PATH,
		});

		const config = await getConfig();

		expect(config.authKeys).toContain("testtoken");

		expect(config.fastify).toEqual({
			host: SERVICE_HOST,
			port: SERVICE_PORT,
		});

		expect(config.fastifyInit.logger).toEqual(
			expect.objectContaining({
				formatters: { level: expect.any(Function) },
				level: LOG_LEVEL,
				serializers: {
					req: expect.any(Function),
					res: expect.any(Function),
				},
				timestamp: expect.any(Function),
			})
		);

		expect(config.fastifyInit.https).toEqual({
			cert: expect.any(Buffer),
			key: expect.any(Buffer),
		});

		expect(config.cors).toEqual({
			origin: CORS_ORIGIN,
		});

		expect(config.poppler).toEqual(
			expect.objectContaining({
				encoding: "UTF-8",
				binPath: POPPLER_BINARY_PATH,
				tempDirectory: expect.any(String),
			})
		);

		expect(config.unrtf).toEqual(
			expect.objectContaining({
				binPath: UNRTF_BINARY_PATH,
				tempDirectory: expect.any(String),
			})
		);
	});

	test("Should return values according to environment variables - PFX enabled and CORS enabled", async () => {
		const SERVICE_HOST = faker.internet.ip();
		const SERVICE_PORT = faker.random.number();
		const HTTPS_PFX_FILE_PATH =
			"./test_resources/test_ssl_cert/server.cert"; // I know it's not an actual PFX file
		const HTTPS_PFX_PASSPHRASE = faker.lorem.word();
		const CORS_ORIGIN = true;
		const LOG_LEVEL = faker.random.arrayElement([
			"debug",
			"warn",
			"silent",
		]);

		Object.assign(process.env, {
			SERVICE_HOST,
			SERVICE_PORT,
			HTTPS_PFX_FILE_PATH,
			HTTPS_PFX_PASSPHRASE,
			CORS_ORIGIN,
			LOG_LEVEL,
		});

		const config = await getConfig();

		expect(config.fastify).toEqual({
			host: SERVICE_HOST,
			port: SERVICE_PORT,
		});

		expect(config.fastifyInit.https).toEqual({
			passphrase: HTTPS_PFX_PASSPHRASE,
			pfx: expect.any(Buffer),
		});

		expect(config.cors).toEqual({
			origin: CORS_ORIGIN,
		});
	});

	test("Should return values according to environment variables - HTTPS disabled and CORS set to value", async () => {
		const SERVICE_HOST = faker.internet.ip();
		const SERVICE_PORT = faker.random.number();
		const CORS_ORIGIN = "https://ydh.nhs.uk";
		const CORS_METHODS = "GET";
		const CORS_ALLOWED_HEADERS =
			"Accept, Authorization, Content-Type, Origin, X-Requested-With";
		const CORS_EXPOSED_HEADERS = "Location";
		const LOG_LEVEL = faker.random.arrayElement([
			"debug",
			"warn",
			"silent",
		]);

		Object.assign(process.env, {
			SERVICE_HOST,
			SERVICE_PORT,
			CORS_ORIGIN,
			CORS_METHODS,
			CORS_ALLOWED_HEADERS,
			CORS_EXPOSED_HEADERS,
			LOG_LEVEL,
		});

		const config = await getConfig();

		expect(config.fastify).toEqual({
			host: SERVICE_HOST,
			port: SERVICE_PORT,
		});

		expect(config.cors).toEqual({
			origin: CORS_ORIGIN,
			methods: CORS_METHODS,
			allowedHeaders: CORS_ALLOWED_HEADERS,
			exposedHeaders: CORS_EXPOSED_HEADERS,
		});
	});

	test("Should throw error if invalid PFX file path", async () => {
		const SERVICE_HOST = faker.internet.ip();
		const SERVICE_PORT = faker.random.number();
		const HTTPS_PFX_FILE_PATH = "./test_resources/test_ssl_cert/error.pfx";
		const HTTPS_PFX_PASSPHRASE = faker.lorem.word();
		const CORS_ORIGIN = true;
		const LOG_LEVEL = faker.random.arrayElement([
			"debug",
			"warn",
			"silent",
		]);

		Object.assign(process.env, {
			SERVICE_HOST,
			SERVICE_PORT,
			HTTPS_PFX_FILE_PATH,
			HTTPS_PFX_PASSPHRASE,
			CORS_ORIGIN,
			LOG_LEVEL,
		});

		await expect(getConfig()).rejects.toThrow();
	});

	test("Should throw error if invalid SSL cert file path", async () => {
		const SERVICE_HOST = faker.internet.ip();
		const SERVICE_PORT = faker.random.number();
		const HTTPS_SSL_CERT_PATH = "./test_resources/test_ssl_cert/error.cert";
		const HTTPS_SSL_KEY_PATH = "./test_resources/test_ssl_cert/error.key";
		const CORS_ORIGIN = true;
		const LOG_LEVEL = faker.random.arrayElement([
			"debug",
			"warn",
			"silent",
		]);

		Object.assign(process.env, {
			SERVICE_HOST,
			SERVICE_PORT,
			HTTPS_SSL_CERT_PATH,
			HTTPS_SSL_KEY_PATH,
			CORS_ORIGIN,
			LOG_LEVEL,
		});

		await expect(getConfig()).rejects.toThrow();
	});
});
