

const { MongoClient } = require("mongodb");
const axios = require("axios");
const cron = require("node-cron");

const uri = "mongodb://localhost:27017/eosdb"; 
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

async function connectToMongo() {
	await client.connect();
	console.log("Connected to MongoDB");
	return client.db().collection("actions");
}

async function fetchAndStoreData(collection) {
	try {
		const response = await axios.post(
			"https://eos.greymass.com/v1/history/get_actions",
			{
				account_name: "eosio",
				pos: -1,
				offset: -100,
			}
		);

		const actions = response.data.actions;
		for (const action of actions) {
			const { trx_id, block_time, block_num } = action.action_trace;
			const existingAction = await collection.findOne({ trx_id });

			if (!existingAction) {
				await collection.insertOne({ trx_id, block_time, block_num });
				console.log(`Inserted action with trx_id: ${trx_id}`);
			}
		}
	} catch (error) {
		console.error("Error fetching data:", error);
	}
}

async function main() {
	const collection = await connectToMongo();

	// Здесь я запускал задачу cron каждую минуту 
	cron.schedule("* * * * *", async () => {
		console.log("Fetching data...");
		await fetchAndStoreData(collection);
	});
}

main().catch(console.error);
