const { Pool } = require('pg');

const pgPool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_TKH2vGo9YUqg@ep-tiny-dust-antvq8qu-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false }
});

async function directTest() {
    try {
        console.log("Direct connection test to Neon...");
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS participants (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                contact TEXT NOT NULL,
                image TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        const res = await pgPool.query(
            "INSERT INTO participants (name, contact, image) VALUES ($1, $2, $3) RETURNING id",
            ["Direct Test Winner", "0123456789", "test_image_data"]
        );
        
        console.log("✅ Success! Data inserted with ID:", res.rows[0].id);
    } catch (err) {
        console.error("❌ Direct Test Failed:", err.message);
    } finally {
        await pgPool.end();
    }
}

directTest();
