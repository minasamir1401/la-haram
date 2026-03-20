const { Pool } = require('pg');
const fs = require('fs');

const oldPgPool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_BEYFkPRgV5h8@ep-cold-bird-adjc4zdj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false }
});

async function extractData() {
    try {
        console.log("Connecting to old database to extract data...");
        const result = await oldPgPool.query("SELECT * FROM participants ORDER BY id ASC");
        const data = result.rows;
        fs.writeFileSync("old_data_backup.json", JSON.stringify(data, null, 2));
        console.log(`Successfully extracted ${data.length} records and saved to old_data_backup.json`);
    } catch (err) {
        console.error("Error extracting data:", err);
    } finally {
        oldPgPool.end();
    }
}

extractData();
